/** Backend links use `type`; the native CreditStatus screen uses `requestType`. */
export function normalizeCreditStatusPath(path: string) {
  const [pathname, query] = path.split('?')
  if (!/^\/?app\/credit\/status$/i.test(pathname) || !query) return path
  const params = new URLSearchParams(query)
  const type = params.get('type')
  if (type === 'increase' || type === 'application') {
    params.set('requestType', type)
    params.delete('type')
  }
  return `${pathname}?${params.toString()}`
}
