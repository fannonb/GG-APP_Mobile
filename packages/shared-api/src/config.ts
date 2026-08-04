let _apiBaseUrl = 'http://localhost:3000/api/v1'
let _isMockApi = true
let _googleClientId = ''

export function configure(opts: {
  baseUrl?: string
  mockApi?: boolean
  googleClientId?: string
}) {
  if (opts.baseUrl !== undefined) _apiBaseUrl = opts.baseUrl
  if (opts.mockApi !== undefined) _isMockApi = opts.mockApi
  if (opts.googleClientId !== undefined) _googleClientId = opts.googleClientId
}

export function getApiBaseUrl() { return _apiBaseUrl }
export function getIsMockApi() { return _isMockApi }
export function getGoogleClientId() { return _googleClientId }
