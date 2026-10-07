/**
 * The screen each tab opens on. Tapping a tab always lands here, and links
 * into a deeper screen of another tab pass `initial: false` so this screen
 * stays underneath it and Back returns to it.
 */
export const TAB_ROOTS: Record<string, string> = {
  HomeTab: 'Dashboard',
  ServicesTab: 'FindService',
  InvoicesTab: 'InvoiceList',
  WalletTab: 'CreditWallet',
  ProfileTab: 'Profile',
}
