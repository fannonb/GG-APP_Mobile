export const FINANCE_PARTNER_SUMMARIES = [
  {
    id: 'moneymart',
    name: 'Moneymart Finance',
    shortName: 'Moneymart',
    tagline: 'Fast, flexible credit built around your healthcare needs.',
    processingTime: '24–48 hrs',
    accent: '#2e3191',
    accentBg: 'rgba(46,49,145,0.08)',
    accentBorder: 'rgba(46,49,145,0.2)',
  },
  {
    id: 'equity',
    name: 'Equity Bank',
    shortName: 'Equity',
    tagline: 'Trusted healthcare financing from a leading African institution.',
    processingTime: '24 hrs',
    accent: '#A93226',
    accentBg: 'rgba(169,50,38,0.08)',
    accentBorder: 'rgba(169,50,38,0.2)',
  },
] as const

export type FinancePartnerId = (typeof FINANCE_PARTNER_SUMMARIES)[number]['id']

export function getFinancePartnerSummary(id: string) {
  return FINANCE_PARTNER_SUMMARIES.find(p => p.id === id)
}
