const { test } = require('node:test')
const assert = require('node:assert/strict')
const load = require('./load-ts.cjs')
const { prescriptionTotal, prescriptionInvoiceState, prescriptionProgress, creditDecision, ledgerSnapshot } = load('apps/mobile/src/lib/patient-parity.ts')
const { patientCacheIdentity, cacheIsCurrent, canCachePatientQuery, stripCachedFiles, CACHE_MAX_AGE } = load('apps/mobile/src/lib/patient-cache-policy.ts')
const { normalizeCreditStatusPath } = load('apps/mobile/src/lib/patient-links.ts')
const { openPatientNotification } = load('apps/mobile/src/lib/patient-notification-routing.ts', { '@/navigation/tabRoots': load('apps/mobile/src/navigation/tabRoots.ts') })
const { attentionSignature, isAttentionDismissed, sanitizeDismissedMap, visibleAttention, withAttentionDismissed, MAX_SAVED_DISMISSALS } = load('apps/mobile/src/lib/attention-dismissals.ts')
const { recentPaymentRows, lastSettledPayment } = load('apps/mobile/src/lib/recent-payments.ts')
const { buildRepaymentPreview, daysUntilDue, repaymentDueLabel } = load('apps/mobile/src/lib/repayment-preview.ts')
const homeAttention = load('apps/mobile/src/lib/home-attention.ts', {
  '@gg/shared-utils': {
    isCreditRunningLow: (available, countryCode) => available > 0 && available <= 5000,
    getLowCreditThreshold: () => 5000,
  },
})

/** Loads the real attention store with a fake SecureStore and session; each call is a fresh app session. */
function attentionStore(secureStore, session = null) {
  return load('apps/mobile/src/lib/useAttentionDismissals.ts', {
    'expo-secure-store': secureStore,
    '@gg/shared-api': { getApiBaseUrl: () => 'https://test.invalid/api', getTokenStorage: () => ({ getSession: () => session }) },
    '@gg/shared-stores': { useAuthStore: () => 'patient' },
    './attention-dismissals': load('apps/mobile/src/lib/attention-dismissals.ts'),
    './patient-cache-policy': load('apps/mobile/src/lib/patient-cache-policy.ts'),
    react: { useEffect() {}, useCallback: fn => fn },
    zustand: require('zustand'),
  })
}

test('delivered prescription quote matches the subtotal plus the invoiced delivery charge', () => {
  assert.equal(prescriptionTotal({ quotedAmount: 1000, deliveryFee: 100 }), 1100)
  assert.equal(prescriptionTotal({ quotedAmount: 99.1, deliveryFee: 0.2 }), 99.3)
  assert.equal(prescriptionTotal({ quotedAmount: 1000 }), 1000)
  assert.equal(prescriptionTotal({ quotedAmount: 0, deliveryFee: 0 }), 0)
})

test('paid/authorized and closed prescriptions never ask for another payment', () => {
  for (const invoiceStatus of ['paid', 'authorized']) {
    const state = prescriptionInvoiceState({ status: 'fulfilled', invoiceStatus })
    assert.equal(state.paid, true)
    assert.equal(state.canPay, false)
    assert.equal(state.action, 'View receipt')
  }
  for (const status of ['rejected', 'cancelled']) {
    assert.equal(prescriptionInvoiceState({ status, invoiceStatus: 'pending_auth' }).canPay, false)
  }
  assert.equal(prescriptionInvoiceState({ status: 'accepted', invoiceStatus: 'pending_auth' }).canPay, true)
  assert.equal(prescriptionInvoiceState({ status: 'fulfilled', invoiceStatus: 'rejected' }).action, 'View invoice')
})

test('rejected prescription progress stops at the pharmacy decision', () => {
  const steps = prescriptionProgress({ status: 'rejected', fulfillmentMode: 'delivery', submittedAt: '2026-10-01', declinedAt: '2026-10-02' })
  assert.deepEqual(steps.map(step => step.label), ['Sent', 'Declined by pharmacy'])
  assert.equal(steps.at(-1).at, '2026-10-02')
})

test('an existing approved account cannot overwrite a pending/rejected increase decision', () => {
  assert.equal(creditDecision({ type: 'increase', status: 'rejected' }, 'approved'), 'declined')
  assert.equal(creditDecision({ type: 'increase', status: 'submitted' }, 'approved'), 'under-review')
  assert.equal(creditDecision({ type: 'initial', status: 'rejected' }, 'rejected'), 'declined')
  assert.equal(creditDecision({ type: 'initial', status: 'approved' }, 'pending'), 'approved')
  assert.equal(creditDecision(null, 'approved'), 'approved')
  assert.equal(creditDecision(null, 'not_applied'), 'pending')
})

test('health summary excludes beneficiary and future/old prescriptions and uses latest nonempty own vitals', () => {
  const now = Date.parse('2026-10-22T12:00:00Z')
  const visit = (id, date, beneficiaryName, vitals) => ({ kind: 'visit', id, date, beneficiaryName, vitals })
  const rx = (id, date, beneficiaryName, names) => ({ kind: 'prescription', id, date, beneficiaryName, items: names.map(name => ({ name })) })
  const snapshot = ledgerSnapshot([
    visit('child', '2026-10-22', 'Child (Son)', { weight: '20 kg' }),
    visit('empty', '2026-10-21', null, {}),
    visit('own', '2026-10-20', 'Me', { bp: '120/80' }),
    visit('old', '2026-10-01', null, { bp: '130/90' }),
    rx('latest', '2026-10-20', 'Self', ['A', 'B']), rx('duplicate', '2026-10-01', null, ['A']),
    rx('family', '2026-10-21', 'Child', ['Child medicine']),
    rx('old-rx', '2026-01-01', null, ['Old medicine']), rx('future', '2026-11-01', null, ['Future']),
  ], now)
  assert.equal(snapshot.vitals.id, 'own')
  assert.deepEqual(snapshot.medicines, ['A', 'B'])
})

test('saved patient reads are scoped to subject, role, backend and maximum age', () => {
  const session = sub => ({ accessToken: `header.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.sig`, role: 'patient' })
  const a = patientCacheIdentity(session('a'), 'https://one/api')
  assert.notEqual(a, patientCacheIdentity(session('b'), 'https://one/api'))
  assert.notEqual(a, patientCacheIdentity(session('a'), 'https://two/api'))
  assert.equal(patientCacheIdentity({ ...session('a'), role: 'admin' }, 'https://one/api'), null)
  assert.equal(patientCacheIdentity({ accessToken: 'malformed', role: 'patient' }, 'https://one/api'), null)
  assert.equal(cacheIsCurrent(a, a, 100, 101), true)
  assert.equal(cacheIsCurrent(a, 'different', 100, 101), false)
  assert.equal(cacheIsCurrent(a, a, 100, 101 + CACHE_MAX_AGE), false)
  assert.equal(cacheIsCurrent(a, a, 102, 101), false)
})

test('cache policy omits attachments, live grants, PIN status, credentials and device-local file data', () => {
  assert.equal(canCachePatientQuery(['patient', 'invoice', 'id', 'attachment']), false)
  assert.equal(canCachePatientQuery(['patient', 'ledger', 'status']), false)
  assert.equal(canCachePatientQuery(['patient', 'ledger', 'access']), false)
  assert.equal(canCachePatientQuery(['patient', 'ledger', 'all']), true)
  assert.equal(canCachePatientQuery(['patient', 'profile', 'existing']), true)
  assert.equal(canCachePatientQuery(['auth', 'session']), false)
  const safe = JSON.parse(JSON.stringify(stripCachedFiles({ pin: '1234', accessToken: 'secret', attachment: { name: 'file.pdf', dataUrl: 'data:application/pdf;base64,SECRET', url: 'content://private/file' }, nested: [{ password: 'secret', amount: 100 }] })))
  assert.deepEqual(safe, { attachment: { name: 'file.pdf' }, nested: [{ amount: 100 }] })
})

test('credit increase intent survives ordinary links and backend notification routing', () => {
  assert.equal(normalizeCreditStatusPath('app/credit/status?type=increase&source=push'), 'app/credit/status?source=push&requestType=increase')
  assert.equal(normalizeCreditStatusPath('app/appointments?type=increase'), 'app/appointments?type=increase')
  const calls = []
  openPatientNotification({ navigate: (...args) => calls.push(args) }, { type: 'credit', title: 'Request received', screen: '/app/credit/status?type=increase' })
  assert.deepEqual(calls, [['App', { screen: 'WalletTab', params: { initial: false, screen: 'CreditStatus', params: { requestType: 'increase' } } }]])
})

test('invoice receipt notifications target the receipt in one root App route', () => {
  const calls = []
  openPatientNotification({ navigate: (...args) => calls.push(args) }, { type: 'payment', title: 'Paid', screen: '/app/invoices/INV-1/success' })
  assert.equal(calls[0][0], 'App')
  assert.equal(calls[0][1].screen, 'InvoicesTab')
  assert.equal(calls[0][1].params.screen, 'PaymentSuccess')
  assert.equal(calls[0][1].params.params.invoiceId, 'INV-1')
})

test('a dismissed attention notice stays hidden until its visible text changes', () => {
  const invoice = { id: 'pending-invoice-INV-1', title: 'Approve KSh 1,200 invoice', detail: 'Nairobi Clinic is waiting for payment approval.' }
  const dismissed = withAttentionDismissed({}, invoice)
  assert.deepEqual(visibleAttention([invoice], dismissed), [])
  assert.equal(isAttentionDismissed(dismissed, invoice), true)
  const newAmount = { ...invoice, title: 'Approve KSh 3,500 invoice' }
  assert.deepEqual(visibleAttention([newAmount], dismissed), [newAmount])
  const other = { id: 'ledger-access-none', title: 'Ledger access', detail: 'Access ends 24 hours after unlock.' }
  assert.deepEqual(visibleAttention([other], dismissed), [other])
  assert.notEqual(attentionSignature(invoice), attentionSignature(newAmount))
})

test('saved attention dismissals are capped and keep the newest entries', () => {
  let map = {}
  for (let i = 0; i < MAX_SAVED_DISMISSALS + 5; i++) map = withAttentionDismissed(map, { id: `n-${i}`, title: 'Notice', detail: String(i) })
  assert.equal(Object.keys(map).length, MAX_SAVED_DISMISSALS)
  assert.ok(`n-${MAX_SAVED_DISMISSALS + 4}` in map)
  assert.equal('n-0' in map, false)
})

test('stored attention dismissals keep only well-formed entries', () => {
  assert.deepEqual(sanitizeDismissedMap(null), {})
  assert.deepEqual(sanitizeDismissedMap(['abc']), {})
  assert.deepEqual(sanitizeDismissedMap({ a: 'abc', b: 3, c: '', d: 'x'.repeat(40) }), { a: 'abc' })
})

test('the attention scope is the patient id from the session, otherwise the role', () => {
  const store = { getItemAsync: async () => null, setItemAsync: async () => {} }
  const tokenFor = sub => `h.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.s`
  const session = sub => ({ accessToken: tokenFor(sub), refreshToken: 'r', role: 'patient', expiresAt: 0 })
  const scopeA = attentionStore(store, session('patient-a')).attentionScope('patient')
  assert.match(scopeA, /^id-[a-z0-9]+$/)
  assert.equal(attentionStore(store, session('patient-a')).attentionScope('patient'), scopeA)
  assert.notEqual(attentionStore(store, session('patient-b')).attentionScope('patient'), scopeA)
  assert.equal(attentionStore(store, null).attentionScope('patient'), 'patient')
  assert.equal(attentionStore(store, null).attentionScope(null), 'guest')
})

test('attention dismissals persist per account and keep working in memory when storage fails', async () => {
  const saved = new Map()
  let failing = false
  const secureStore = {
    getItemAsync: async key => { if (failing) throw new Error('keychain locked'); return saved.get(key) ?? null },
    setItemAsync: async (key, value) => { if (failing) throw new Error('keychain locked'); saved.set(key, value) },
  }
  const item = { id: 'rx-RX-9', title: 'Quote Ready', detail: 'Pharmacy sent pricing for prescription RX-9.' }
  const first = attentionStore(secureStore).useAttentionDismissalsStore
  await first.getState().load('id-patient')
  assert.deepEqual(first.getState().map, {})
  first.getState().dismiss('id-patient', item)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(saved.size, 1)

  // A new app session reads the same saved value back.
  const reopened = attentionStore(secureStore).useAttentionDismissalsStore
  await reopened.getState().load('id-patient')
  assert.equal(isAttentionDismissed(reopened.getState().map, item), true)

  // Another account on this device does not inherit the dismissal.
  const other = attentionStore(secureStore).useAttentionDismissalsStore
  await other.getState().load('id-someone-else')
  assert.equal(isAttentionDismissed(other.getState().map, item), false)

  // Storage down: the read starts empty, and the dismissal still hides the notice for this session.
  failing = true
  const offline = attentionStore(secureStore).useAttentionDismissalsStore
  await offline.getState().load('id-patient')
  assert.deepEqual(offline.getState().map, {})
  offline.getState().dismiss('id-patient', item)
  assert.equal(isAttentionDismissed(offline.getState().map, item), true)
})

test('payment rows are newest first, typed from their invoice, and name the family member they were for', () => {
  const invoices = [
    { id: 'INV-RX', isPrescription: true, serviceFor: { type: 'self', name: 'Sarah' } },
    { id: 'INV-KID', isPrescription: false, serviceFor: { type: 'beneficiary', name: 'Emma', relation: 'Child' } },
  ]
  const transactions = [
    { id: 'T1', provider: 'Old Clinic', amount: 100, date: '2026-09-01T10:00:00Z', status: 'completed', service: 'Checkup' },
    { id: 'T2', provider: 'Pharmacy', amount: 250, date: '2026-10-05T10:00:00Z', status: 'completed', service: 'Medicines', invoiceId: 'INV-RX' },
    { id: 'T3', provider: 'Kids Clinic', amount: 300, date: '2026-10-06T10:00:00Z', status: 'failed', service: 'Visit', invoiceId: 'INV-KID' },
    { id: 'T4', provider: 'Clinic', amount: 400, date: '2026-10-07T10:00:00Z', status: 'completed', service: 'Visit', invoiceId: 'INV-KID' },
  ]
  const rows = recentPaymentRows(transactions, invoices)
  assert.deepEqual(rows.map(row => row.tx.id), ['T4', 'T3', 'T2', 'T1'])
  assert.deepEqual(rows.map(row => row.paymentType), ['appointment', 'appointment', 'prescription', 'appointment'])
  assert.deepEqual(rows[0].forWhom, { name: 'Emma', relation: 'Child' })
  assert.equal(rows[2].forWhom, null)
  assert.equal(rows[3].forWhom, null)
  assert.equal(lastSettledPayment(rows).id, 'T4')
  assert.equal(lastSettledPayment(recentPaymentRows([transactions[2]], invoices)), undefined)
})

test('repayment preview matches the PWA placeholder schedule and due wording', () => {
  assert.equal(buildRepaymentPreview(0), null)
  const plan = buildRepaymentPreview(12000, new Date(2026, 9, 20))
  assert.equal(plan.installments.length, 12)
  assert.equal(plan.paidCount, 3)
  assert.equal(plan.next.n, 4)
  assert.equal(plan.next.total, 1300) // 1000 principal + 300 interest at 2.5%
  assert.equal(plan.outstanding, 11700) // nine unpaid installments
  assert.equal(plan.interestTotal, 3600)
  assert.equal(plan.installments[11].principal, 1000)
  assert.equal(plan.next.dueDate.getMonth(), 10) // next 15th after 20 October is 15 November
  const today = new Date(2026, 9, 20)
  assert.equal(repaymentDueLabel(new Date(2026, 9, 20), today), 'Due today')
  assert.equal(repaymentDueLabel(new Date(2026, 9, 21), today), 'Due tomorrow')
  assert.equal(repaymentDueLabel(new Date(2026, 9, 25), today), 'Due in 5 days')
  assert.equal(repaymentDueLabel(new Date(2026, 9, 19), today), '1 day overdue')
  assert.equal(repaymentDueLabel(new Date(2026, 9, 17), today), '3 days overdue')
  assert.equal(daysUntilDue(new Date(2026, 9, 27), today), 7)
})

test('home notices for low balance, credit review and a pending visit use the PWA ids, conditions and copy', () => {
  const format = amount => `KSh ${amount}`
  const low = homeAttention.lowBalanceNotice({ creditStatus: 'approved', available: 3000, countryCode: 'KE', format })
  assert.deepEqual(low, {
    id: 'credit-low',
    title: 'Your allocation is running low',
    detail: 'KSh 3000 left, below the KSh 5000 buffer we recommend.',
    actionLabel: 'Request increase',
  })
  assert.equal(homeAttention.lowBalanceNotice({ creditStatus: 'approved', available: 9000, countryCode: 'KE', format }), null)
  assert.equal(homeAttention.lowBalanceNotice({ creditStatus: 'pending', available: 3000, countryCode: 'KE', format }), null)
  assert.deepEqual(visibleAttention([low], withAttentionDismissed({}, low)), [])

  const increase = homeAttention.creditReviewNotice({ creditStatus: 'pending', applicationType: 'increase', partnerName: 'Equity Bank' })
  assert.equal(increase.id, 'credit-review')
  assert.equal(increase.title, 'Limit increase under review')
  assert.equal(increase.increase, true)
  assert.equal(increase.detail, "Equity Bank is reviewing your request. We'll notify you as soon as there's a decision.")
  const application = homeAttention.creditReviewNotice({ creditStatus: 'pending', applicationType: 'initial', partnerName: 'Equity Bank' })
  assert.equal(application.title, 'Allocation application under review')
  assert.equal(application.increase, false)
  assert.equal(homeAttention.creditReviewNotice({ creditStatus: 'approved', applicationType: null, partnerName: 'Equity Bank' }), null)

  const visits = [
    { id: 'A1', date: '2026-10-01T09:00:00', time: '09:00', provider: 'Done Clinic', service: 'Checkup', status: 'completed' },
    { id: 'A2', date: '2026-11-12T12:00:00', time: '14:30', provider: 'Nairobi Clinic', service: 'Lab', status: 'pending' },
    { id: 'A3', date: '2026-11-13T12:00:00', time: '10:00', provider: 'Other', service: 'Scan', status: 'pending', rescheduledAt: '2026-11-01' },
  ]
  const visit = homeAttention.findPendingVisit(visits, v => v.status)
  assert.equal(visit.id, 'A2')
  assert.equal(homeAttention.findPendingVisit([visits[0], visits[2]], v => v.status), undefined)
  assert.deepEqual(homeAttention.pendingAppointmentNotice(visit, time => `formatted ${time}`), {
    id: 'pending-A2',
    title: 'Waiting for the provider to confirm',
    detail: 'Nairobi Clinic · Nov 12 at formatted 14:30 · Lab',
    actionLabel: 'View',
  })
})

test('the home invoice and reschedule notices use web copy, and a dismissal saved under the old id still hides the invoice', () => {
  const format = amount => `KSh ${amount}`
  const invoice = homeAttention.pendingInvoiceNotice({ invoiceId: 'INV-1', count: 1, providerName: 'Nairobi Clinic', amount: 1500, format })
  assert.deepEqual(invoice, {
    id: 'invoice-INV-1',
    title: 'Invoice waiting for your approval',
    detail: 'Nairobi Clinic · KSh 1500',
    actionLabel: 'Review & approve',
    legacyIds: ['pending-invoice-INV-1'],
  })
  assert.equal(homeAttention.pendingInvoiceNotice({ invoiceId: 'INV-2', count: 3, providerName: 'Nairobi Clinic', amount: 1500, format }).title, '3 invoices waiting for your approval')
  assert.deepEqual(visibleAttention([invoice], {}), [invoice])
  assert.deepEqual(visibleAttention([invoice], { 'pending-invoice-INV-1': 'saved under the old copy' }), [])

  const visit = { id: 'R1', date: '2026-11-12T12:00:00', time: '14:30', provider: 'Nairobi Clinic', service: 'Lab', rescheduledAt: '2026-11-01' }
  assert.deepEqual(homeAttention.rescheduleNotice(visit, time => `formatted ${time}`), {
    id: 'reschedule-R1',
    title: 'New appointment time proposed',
    detail: 'Nairobi Clinic suggested Nov 12 at formatted 14:30 · Lab',
    actionLabel: 'Respond',
  })
})

test('the allocation pager returns to page 1 when its page is gone, and other lists keep showing the last page', () => {
  const { resolvePage, PAGE_SIZE } = load('apps/mobile/src/lib/usePaged.ts')
  assert.equal(PAGE_SIZE, 10)
  assert.deepEqual(resolvePage(0, 2, 'first'), { page: 0, reset: false })
  assert.deepEqual(resolvePage(1, 2, 'first'), { page: 1, reset: false })
  assert.deepEqual(resolvePage(2, 2, 'first'), { page: 0, reset: true })
  assert.deepEqual(resolvePage(2, 2), { page: 1, reset: false })
})


test('finance partner logos are the web artwork; a partner without artwork has none, so the screen shows its name', () => {
  const { getFinancePartnerLogo } = load('apps/mobile/src/lib/finance-partner-logo.ts', {
    '../../assets/partners/equity-bank-transparent.png': 1,
    './moneymart-logo-svg': load('apps/mobile/src/lib/moneymart-logo-svg.ts'),
  })
  assert.equal(getFinancePartnerLogo('equity').file.kind, 'png')
  assert.equal(getFinancePartnerLogo('moneymart').file.kind, 'svg')
  assert.match(getFinancePartnerLogo('moneymart').file.xml, /^<svg /)
  assert.equal(getFinancePartnerLogo('mpesa'), null)
  assert.equal(getFinancePartnerLogo('constructor'), null)
  assert.equal(getFinancePartnerLogo(''), null)
  assert.equal(getFinancePartnerLogo(undefined), null)
})
