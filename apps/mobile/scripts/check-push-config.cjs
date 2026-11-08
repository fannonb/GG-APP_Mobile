const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const config = require('../app.config.js')({ config: require('../app.json').expo })
const file = config.android?.googleServicesFile

function fail(message) {
  console.error(`[push] ${message}\nSee docs/push-notifications.md for Firebase and EAS setup.`)
  process.exitCode = 1
}

if (!config.extra?.eas?.projectId) {
  fail('The EAS projectId is missing.')
} else if (!file || !fs.existsSync(path.resolve(root, file))) {
  fail('Missing Firebase Android app configuration. Add google-services.json or set the GOOGLE_SERVICES_JSON file variable.')
} else {
  try {
    const firebase = JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8'))
    const client = firebase.client?.find(item => item.client_info?.android_client_info?.package_name === config.android.package)
    if (!firebase.project_info?.project_id || !client?.client_info?.mobilesdk_app_id || !client.api_key?.length) {
      fail(`Firebase configuration must contain an Android client for ${config.android.package}. Download the app's google-services.json, not a service account key.`)
    } else {
      console.log(`[push] Firebase Android configuration found for ${config.android.package}.`)
      console.log('[push] Also verify the FCM V1 service account in EAS Credentials; it cannot be checked from this file.')
    }
  } catch {
    fail('Firebase Android configuration is not valid JSON.')
  }
}
