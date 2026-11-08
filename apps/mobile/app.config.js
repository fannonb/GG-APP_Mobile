const fs = require('node:fs')
const path = require('node:path')

// EAS file variables resolve to a temporary absolute path. Local builds can
// instead put the Firebase Android app configuration beside app.json.
module.exports = ({ config }) => {
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || config.android?.googleServicesFile || './google-services.json'
  return {
    ...config,
    android: {
      ...config.android,
      ...(fs.existsSync(path.resolve(__dirname, googleServicesFile)) ? { googleServicesFile } : {}),
    },
  }
}
