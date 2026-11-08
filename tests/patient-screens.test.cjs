const { test } = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const load = require('./load-ts.cjs')

const Box = ({ children }) => React.createElement('div', null, children)
const Text = ({ children }) => React.createElement('span', null, children)
const Button = ({ children }) => React.createElement('button', null, children)
const components = {
  Screen: Box, ScrollArea: Box, MCard: Box, MBtn: Button, GGPill: Text,
  PageTitle: ({ title, children }) => React.createElement(Text, null, title, children),
  LoadError: ({ title }) => React.createElement(Text, null, title),
}
const theme = { ...load('apps/mobile/src/theme/tokens.ts'), fontWeights: {} }
const format = { formatCurrency: amount => String(amount), formatDate: date => date }
const base = {
  'react-native': { View: Box, Text, TextInput: Box, Image: Box, Modal: () => null, ActivityIndicator: () => null, StyleSheet: { create: s => s } },
  '@/components': components,
  '@/theme': theme,
  '@gg/shared-utils': format,
  '@/lib/patient-parity': load('apps/mobile/src/lib/patient-parity.ts'),
  '@react-navigation/native': { useNavigation: () => ({ navigate() {} }) },
}

test('credit screen renders a declined increase, the reason, and the named partner on an approved account', () => {
  const { CreditStatusScreen } = load('apps/mobile/src/screens/credit/CreditStatusScreen.tsx', {
    ...base,
    'react-native-svg': { __esModule: true, default: Box, Path: () => null },
    '@gg/shared-stores': { useUserStore: select => select({ user: { countryCode: 'KE', creditStatus: 'approved', creditLimit: 10000 } }) },
    '@gg/shared-config': { ...load('packages/shared-config/src/credit.ts'), getCountryByCode: () => ({ currencySymbol: 'Ksh.' }) },
    '@gg/shared-hooks': { useCreditStatus: () => ({ data: { creditStatus: 'approved', creditLimit: 10000, application: { type: 'increase', status: 'rejected', reference: 'CR-1', financePartnerId: 'equity', requestedAmount: 5000, declineReason: 'Income documents required', submittedAt: '2026-10-01', reviewedAt: '2026-10-02' } } }) },
    './EmptyCreditStatusScreen': { EmptyCreditStatusScreen: () => null },
  })
  const html = renderToStaticMarkup(React.createElement(CreditStatusScreen, { route: { params: { requestType: 'increase' } } }))
  assert.match(html, /Declined/)
  assert.match(html, /Income documents required/)
  assert.match(html, /Equity Bank/)
  assert.match(html, /existing allocation limit remains unchanged/)
  assert.doesNotMatch(html, /Your limit increase has been approved/)
})

function prescriptionScreen(request, Screen = Box) {
  const { PrescriptionDetailScreen } = load('apps/mobile/src/screens/services/PrescriptionDetailScreen.tsx', {
    ...base,
    '@/components': { ...components, Screen },
    '@/components/Pressable': Box,
    '@/lib/useCurrency': { useCurrency: () => 'Ksh.' },
    '@/lib/open-attachment': {},
    '@gg/shared-hooks': {
      usePatientPrescriptionRequests: () => ({ data: [request] }),
      useMarkPrescriptionQuoteReviewedMutation: () => ({ mutate() {} }),
      useAcceptPrescriptionQuoteMutation: () => ({}),
      useDeclinePrescriptionQuoteMutation: () => ({}),
      useSelectPrescriptionOfferMutation: () => ({}),
      useDeclinePrescriptionOfferMutation: () => ({}),
    },
  })
  return renderToStaticMarkup(React.createElement(PrescriptionDetailScreen, { navigation: { navigate() {} }, route: { params: { prescriptionId: request.id } } }))
}

test('delivered paid prescription renders the fee-inclusive total and receipt action', () => {
  const html = prescriptionScreen({ id: 'RX-1', status: 'fulfilled', fulfillmentMode: 'delivery', quotedAmount: 1000, deliveryFee: 100, attachment: {}, invoiceId: 'INV-1', invoiceStatus: 'paid', submittedAt: '2026-10-01', quotedItems: [] })
  assert.match(html, /Delivery fee/)
  assert.match(html, /1100/)
  assert.match(html, /Payment complete/)
  assert.match(html, /View receipt/)
  assert.doesNotMatch(html, /Review &amp; Pay/)
  assert.doesNotMatch(html, /Pay the invoice below/)
})

test('pharmacy rejection renders its reason and an alternative pharmacy action', () => {
  const html = prescriptionScreen({ id: 'RX-2', status: 'rejected', fulfillmentMode: 'pickup', declineReason: 'Medicine out of stock', attachment: {}, submittedAt: '2026-10-01' })
  assert.match(html, /Medicine out of stock/)
  assert.match(html, /Find another pharmacy/)
  assert.match(html, /Declined by pharmacy/)
})

const Pressable = ({ children, accessibilityLabel }) => React.createElement('button', { 'aria-label': accessibilityLabel }, children)
const plainText = html => html.replace(/<!-- -->/g, '')

// The real Screen, AppHeader and BrandLogo, so the bar every screen renders is what the tests see.
const Img = ({ accessibilityLabel, accessibilityRole }) => React.createElement('img', { alt: accessibilityLabel, role: accessibilityRole })
const headerReactNative = { ...base['react-native'], Image: Img, ScrollView: Box, Dimensions: { get: () => ({ width: 360, height: 800 }) } }
const headerInsets = { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }
const realScreen = (() => {
  const brandLogo = load('apps/mobile/src/components/BrandLogo.tsx', {
    'react-native': headerReactNative,
    '../../assets/gg-wordmark.png': {},
    '../../assets/gg-wordmark-light.png': {},
  })
  const appHeader = load('apps/mobile/src/components/AppHeader.tsx', {
    'react-native': headerReactNative,
    'react-native-svg': { __esModule: true, default: Box, Path: () => null },
    'react-native-safe-area-context': headerInsets,
    '@react-navigation/native': { useNavigation: () => ({ navigate() {}, goBack() {}, canGoBack: () => true }) },
    '@/components/Pressable': Pressable,
    '@/theme': theme,
    './BrandLogo': brandLogo,
    './MarketFlag': { __esModule: true, default: () => null },
    './NotificationBell': { __esModule: true, default: () => null },
  })
  return load('apps/mobile/src/components/Screen.tsx', {
    'react-native': base['react-native'],
    'react-native-safe-area-context': headerInsets,
    '@/theme': theme,
    './OfflineBanner': { OfflineBanner: () => null },
    './AppHeader': appHeader,
  })
})()
const logoCount = html => (html.replace(/&#x27;/g, "'").match(/alt="GG'APP"/g) || []).length

test('every attention notice gets a labelled 44pt dismiss control, and the card is absent when none are visible', () => {
  const pressables = []
  const TrackedPressable = props => {
    pressables.push({ label: props.accessibilityLabel, style: props.style })
    return Pressable(props)
  }
  const { default: AttentionList } = load('apps/mobile/src/components/home/AttentionList.tsx', {
    'react-native': base['react-native'],
    '@/components/Pressable': TrackedPressable,
    '@/lib/motion': { animateNextLayout() {} },
    '@/theme': theme,
    '@/icons/ChevronRightIcon': () => null,
    './SectionHeader': () => null,
  })
  const icon = () => null
  const items = [
    { id: 'a', tone: 'action', Icon: icon, title: 'Approve KSh 1,200 invoice', detail: 'Nairobi Clinic is waiting.', onPress() {}, actionLabel: 'Review' },
    { id: 'b', tone: 'info', Icon: icon, title: 'Ledger access', detail: 'Access ends 24 hours after unlock.', onPress() {} },
  ]
  const html = renderToStaticMarkup(React.createElement(AttentionList, { items, expanded: true, onToggleExpanded() {}, onDismiss() {} }))
  assert.equal(html.match(/aria-label="Dismiss"/g).length, 2)
  const dismissStyles = pressables.filter(p => p.label === 'Dismiss').map(p => p.style)
  assert.ok(dismissStyles.length >= 2 && dismissStyles.every(style => style.width >= 44 && style.height >= 44))
  const withoutDismiss = renderToStaticMarkup(React.createElement(AttentionList, { items, expanded: true, onToggleExpanded() {} }))
  assert.equal(withoutDismiss.includes('aria-label="Dismiss"'), false)
  assert.equal(renderToStaticMarkup(React.createElement(AttentionList, { items: [], expanded: false, onToggleExpanded() {} })), '')
})

const payments = Array.from({ length: 12 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0')
  return { id: `T${n}`, provider: `Provider ${n}`, amount: 100 * (i + 1), date: `2026-10-${n}T09:00:00Z`, status: 'completed', service: 'Visit', invoiceId: `INV-${n}` }
})
payments[11] = { ...payments[11], status: 'failed' }
const walletInvoices = payments.map(payment => ({
  id: payment.invoiceId,
  status: 'paid',
  provider: { name: payment.provider },
  amount: payment.amount,
  isPrescription: payment.id === 'T12',
  serviceFor: payment.id === 'T11' ? { type: 'beneficiary', name: 'Emma', relation: 'Child' } : { type: 'self', name: 'Sarah' },
}))
const pendingInvoice = { id: 'INV-PENDING', status: 'pending_auth', provider: { name: 'Nairobi Clinic' }, amount: 1500, isPrescription: false, serviceFor: { type: 'self', name: 'Sarah' } }

function walletScreen({
  transactions = payments,
  invoices = [...walletInvoices, pendingInvoice],
  balance = 3000,
  hidden = [],
  mock = false,
  beneficiaries = [],
  beneficiariesEnabled = false,
  accountRef = null,
} = {}) {
  const hiddenNotices = new Set(hidden)
  const { CreditWalletScreen } = load('apps/mobile/src/screens/credit/CreditWalletScreen.tsx', {
    'react-native': base['react-native'],
    'react-native-svg': { __esModule: true, default: Box, Path: () => null, Circle: () => null, Line: () => null },
    '@/lib/usePullToRefresh': { usePullToRefresh: () => ({}) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@react-navigation/native': { useNavigation: () => ({ navigate() {} }) },
    '@/theme': theme,
    '@/components/Pressable': Pressable,
    '@/components/Skeleton': { SkeletonBalanceCard: () => null, SkeletonBlock: () => null, SkeletonGroup: Box, SkeletonList: () => null },
    '@/components': {
      Screen: realScreen.default, ScrollArea: Box, MCard: Box, MAvatar: () => null, StatTile: () => null, MoneyText: () => null,
      PageTitle: ({ title, children }) => React.createElement(Text, null, title, children),
      StatusPill: ({ label }) => React.createElement(Text, null, label),
      GGPill: Text,
      NotifBanner: ({ title, onDismiss }) => React.createElement(Text, null, title, onDismiss ? React.createElement('button', { 'aria-label': 'Dismiss' }) : null),
      Pager: load('apps/mobile/src/components/Pager.tsx', { 'react-native': base['react-native'], '@/components/Pressable': Pressable, '@/theme': theme, '@/lib/haptics': { hapticSelection() {} } }).default,
    },
    '@/components/credit/CreditBalanceCard': { CardAction: () => null, CreditBalanceCard: () => null },
    '@/components/credit/RepaymentCard': load('apps/mobile/src/components/credit/RepaymentCard.tsx', {
      'react-native': base['react-native'],
      '@/components/MCard': Box,
      '@/components/Pressable': Pressable,
      '@/theme': theme,
      '@gg/shared-utils': { formatCurrency: (amount, currency) => `${currency}${amount}` },
      '@/lib/repayment-preview': load('apps/mobile/src/lib/repayment-preview.ts'),
    }),
    '@/lib/repayment-preview': load('apps/mobile/src/lib/repayment-preview.ts'),
    '@gg/shared-api': { getIsMockApi: () => mock },
    '@/icons/InvoiceIcon': () => null,
    '@/icons/WalletIcon': () => null,
    '@gg/shared-hooks': {
      useCreditStatus: () => ({ data: { creditUsed: 0 }, isLoading: false, refetch() {} }),
      usePatientTransactions: () => ({ data: transactions, isLoading: false, refetch() {} }),
      usePatientInvoices: () => ({ data: invoices, refetch() {} }),
    },
    '@gg/shared-stores': {
      useUserStore: select => select({
        user: {
          name: 'Sarah Johnson', countryCode: 'KE', creditStatus: 'approved', creditLimit: 10000, creditAvailable: balance,
          creditUsed: 10000 - balance, financePartnerId: 'equity', beneficiariesEnabled, creditAccountRef: accountRef ?? undefined,
        },
        beneficiaries,
      }),
    },
    '@gg/shared-utils': {
      formatCurrency: (amount, currency) => `${currency}${amount}`,
      formatDate: value => String(value).slice(0, 10),
      getLowCreditThreshold: () => 5000,
      isCreditRunningLow: available => available > 0 && available <= 5000,
      isActionablePendingInvoice: invoice => invoice.status === 'pending_auth',
    },
    '@gg/shared-config': { getCountryByCode: () => ({ currencySymbol: 'KSh ', currencyCode: 'KES' }), getFinancePartnerIdForCountry: () => 'equity', getFinancePartnerSummary: () => ({ name: 'Equity Bank' }) },
    '@/lib/recent-payments': load('apps/mobile/src/lib/recent-payments.ts'),
    '@/lib/usePaged': load('apps/mobile/src/lib/usePaged.ts'),
    '@/lib/useAttentionDismissals': { useAttentionDismissals: () => ({ ready: true, filterVisible: items => items.filter(item => !hiddenNotices.has(item.id)), dismiss() {} }) },
    './EmptyWalletScreen': { EmptyWalletScreen: () => null },
  })
  return plainText(renderToStaticMarkup(React.createElement(CreditWalletScreen)))
}

test('allocation screen lists recent payments 10 per page with Type, family line, pager and last settled payment', () => {
  const text = walletScreen()
  assert.match(text, /Recent payments to providers/)
  assert.equal(new Set(text.match(/Provider \d\d/g)).size, 10)
  assert.match(text, /Provider 12/)
  assert.doesNotMatch(text, /Provider 02/)
  assert.match(text, /Showing 1 to 10 of 12/)
  assert.match(text, /aria-label="Next page"/)
  assert.match(text, /Prescription/)
  assert.match(text, /Appointment/)
  assert.match(text, /For Emma · Child/)
  assert.match(text, /Last payment[\s\S]*?KSh 1100/)
})

test('allocation screen shows no pager for ten or fewer payments', () => {
  const text = walletScreen({ transactions: payments.slice(0, 10) })
  assert.equal(new Set(text.match(/Provider \d\d/g)).size, 10)
  assert.doesNotMatch(text, /aria-label="Next page"/)
  assert.doesNotMatch(text, /of 10/)
})

test('allocation notices show the pending invoice and the low-balance notice until they are dismissed', () => {
  const visible = walletScreen()
  assert.match(visible, /An invoice needs your approval/)
  assert.match(visible, /Your allocation is running low/)
  const dismissed = walletScreen({ hidden: ['pending-invoice-INV-PENDING', 'credit-low'] })
  assert.doesNotMatch(dismissed, /An invoice needs your approval/)
  assert.doesNotMatch(dismissed, /Your allocation is running low/)
  assert.match(dismissed, /Recent payments to providers/)
})

test('allocation screen shows last payment, family cover and allocation cards', () => {
  const text = walletScreen({ accountRef: 'CR-0042', beneficiariesEnabled: true, beneficiaries: [{ id: 'B1', name: 'Emma', relation: 'Child' }] })
  assert.equal(text.match(/Last payment/g).length, 1)
  assert.match(text, /Last payment[\s\S]*?KSh 1100/)
  assert.match(text, /Family cover/)
  assert.match(text, /Emma · Child/)
  assert.match(text, /Can use this allocation at verified providers/)
  assert.match(text, /aria-label="Manage family cover"/)
  assert.match(text, /Equity Bank/)
  assert.match(text, /Ref CR-0042 · KES/)
})

test('allocation screen has no outstanding/this-month stats or authorized beneficiaries section, as on the PWA', () => {
  const text = walletScreen({ beneficiariesEnabled: true, beneficiaries: [{ id: 'B1', name: 'Emma', relation: 'Child' }] })
  assert.doesNotMatch(text, /Outstanding/)
  assert.doesNotMatch(text, /This month/)
  assert.doesNotMatch(text, /Authorized Beneficiaries/)
  assert.doesNotMatch(text, /Registered beneficiaries on this balance/)
  assert.doesNotMatch(text, /No beneficiaries added yet/)
  // The family cover card's "Manage" link is what reaches beneficiaries now.
  assert.match(text, /aria-label="Manage family cover"/)
})

test('family cover and allocation cards show their empty states', () => {
  const off = walletScreen({ beneficiariesEnabled: false, beneficiaries: [] })
  assert.match(off, /Not enabled/)
  assert.match(off, /Enable beneficiaries in Profile/)
  assert.doesNotMatch(off, /Ref [A-Z]/)
  assert.match(walletScreen({ beneficiariesEnabled: true, beneficiaries: [] }), /None added/)
})

test('repayment preview shows only against the mock API, as on the PWA', () => {
  const live = walletScreen({ mock: false })
  assert.doesNotMatch(live, /<span>Repayments<\/span>/)
  assert.doesNotMatch(live, /Sample data/)
  const mocked = walletScreen({ mock: true })
  assert.match(mocked, /<span>Repayments<\/span>/)
  assert.match(mocked, /Sample data/)
  assert.match(mocked, /View full schedule/)
  assert.match(mocked, /Still owed/)
})

test('the shared pager keeps its page wording by default and uses the web wording when asked', () => {
  const Pager = load('apps/mobile/src/components/Pager.tsx', {
    'react-native': base['react-native'],
    '@/components/Pressable': Pressable,
    '@/theme': theme,
    '@/lib/haptics': { hapticSelection() {} },
  }).default
  const pageText = plainText(renderToStaticMarkup(React.createElement(Pager, { page: 0, pageSize: 10, total: 12, onPage() {} })))
  assert.match(pageText, /1–10 of 12 · page 1 of 2/)
  const webText = plainText(renderToStaticMarkup(React.createElement(Pager, { page: 1, pageSize: 10, total: 12, onPage() {}, summary: 'showing' })))
  assert.match(webText, /Showing 11 to 12 of 12/)
  assert.equal(renderToStaticMarkup(React.createElement(Pager, { page: 0, pageSize: 10, total: 10, onPage() {} })), '')
})

test('patient copy follows the PWA wording on the allocation, invoice review, empty allocation and history screens', () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const read = relative => fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8')
  const wallet = read('apps/mobile/src/screens/credit/CreditWalletScreen.tsx')
  assert.match(wallet, /title="Healthcare allocation"/)
  assert.doesNotMatch(wallet, /Balance & Allocation/)
  assert.match(wallet, /label="Request increase"/)
  assert.doesNotMatch(wallet, /Request Increase/)
  assert.match(wallet, /usePaged\(paymentRows, null, PAGE_SIZE, 'first'\)/)
  assert.match(wallet, /pending:\s+\{ type: 'warning', label: 'Processing' \}/)
  assert.doesNotMatch(wallet, /label: 'Pending'/)
  const review = read('apps/mobile/src/screens/payments/InvoiceReviewScreen.tsx')
  assert.match(review, /Available to spend on care/)
  assert.doesNotMatch(review, /Available Balance/)
  assert.match(review, /Pay directly to provider/)
  assert.match(review, /directly to \$\{providerName\}/)
  assert.doesNotMatch(review, /off-app/)
  assert.match(read('apps/mobile/src/screens/credit/EmptyWalletScreen.tsx'), /title="Healthcare allocation"/)
  assert.match(read('apps/mobile/src/screens/payments/TransactionHistoryScreen.tsx'), /label: 'Processing'/)
})

test('a partner logo is labelled with the partner name and falls back to that name when there is no artwork', () => {
  const LabelledView = ({ children, accessibilityLabel }) => React.createElement('div', { 'aria-label': accessibilityLabel }, children)
  const { PartnerLogo } = load('apps/mobile/src/components/PartnerLogo.tsx', {
    'react-native': { View: LabelledView, Text, Image: Box, StyleSheet: { create: s => s, hairlineWidth: 1 } },
    'react-native-svg': { SvgXml: ({ width }) => React.createElement('svg', { width }) },
    '@/lib/finance-partner-logo': load('apps/mobile/src/lib/finance-partner-logo.ts', {
      '../../assets/partners/equity-bank-transparent.png': 1,
      './moneymart-logo-svg': load('apps/mobile/src/lib/moneymart-logo-svg.ts'),
    }),
    '@/theme': theme,
  })
  const equity = renderToStaticMarkup(React.createElement(PartnerLogo, { partnerId: 'equity', partnerName: 'Equity Bank', size: 'md' }))
  assert.match(equity, /aria-label="Equity Bank"/)
  assert.doesNotMatch(equity, /<span[^>]*>Equity Bank<\/span>/)
  const moneymart = renderToStaticMarkup(React.createElement(PartnerLogo, { partnerId: 'moneymart', partnerName: 'Moneymart Finance', variant: 'plain' }))
  assert.match(moneymart, /aria-label="Moneymart Finance"/)
  assert.match(moneymart, /<svg width="\d+"/)
  const unknown = renderToStaticMarkup(React.createElement(PartnerLogo, { partnerId: 'mpesa', partnerName: 'M-Pesa' }))
  assert.match(unknown, /<span[^>]*>M-Pesa<\/span>/)
  assert.doesNotMatch(unknown, /<svg/)
})

function forgotPasswordScreen() {
  const { ForgotPasswordScreen } = load('apps/mobile/src/screens/auth/ForgotPasswordScreen.tsx', {
    '@react-navigation/native': { useNavigation: () => ({ navigate() {} }) },
    '@/components': { Field: () => null },
    '@/components/AuthShell': load('apps/mobile/src/components/AuthShell.tsx', {
      'react-native': headerReactNative,
      'react-native-safe-area-context': headerInsets,
      '@/components/Pressable': Pressable,
      '@/theme': theme,
      './Screen': realScreen,
    }),
    '@gg/shared-api': { authService: { forgotPassword() {} } },
    '@/lib/validation': load('apps/mobile/src/lib/validation.ts'),
  })
  return renderToStaticMarkup(React.createElement(ForgotPasswordScreen))
}

function creditDisclaimerScreen() {
  const { CreditDisclaimerScreen } = load('apps/mobile/src/screens/credit/CreditDisclaimerScreen.tsx', {
    'react-native': base['react-native'],
    'react-native-svg': { __esModule: true, default: Box, Path: () => null },
    '@react-navigation/native': { useNavigation: () => ({ navigate() {}, goBack() {} }) },
    '@/components/Pressable': Pressable,
    '@/theme': theme,
    '@/icons': { BankIcon: () => null, CheckIcon: () => null, HospitalIcon: () => null, InvoiceIcon: () => null, WalletIcon: () => null },
    '@/components': { ...components, Screen: realScreen.default, ActionBar: () => null },
  })
  return renderToStaticMarkup(React.createElement(CreditDisclaimerScreen))
}

test('the shared app bar gives every variant the GG\'APP logo, once', () => {
  for (const header of ['tabRoot', 'detail', 'modal', 'auth']) {
    const html = renderToStaticMarkup(React.createElement(realScreen.default, { header }, React.createElement(Text, null, 'body')))
    assert.equal(logoCount(html), 1, header)
  }
})

test('a tab root, a detail screen, an auth screen and a task screen each open with the GG\'APP logo', () => {
  const request = { id: 'RX-2', status: 'rejected', fulfillmentMode: 'pickup', declineReason: 'Medicine out of stock', attachment: {}, submittedAt: '2026-10-01' }
  assert.equal(logoCount(walletScreen()), 1, 'tab root: CreditWalletScreen')
  assert.equal(logoCount(prescriptionScreen(request, realScreen.default)), 1, 'detail: PrescriptionDetailScreen')
  assert.equal(logoCount(forgotPasswordScreen()), 1, 'auth: ForgotPasswordScreen')
  assert.equal(logoCount(creditDisclaimerScreen()), 1, 'task: CreditDisclaimerScreen')
})
