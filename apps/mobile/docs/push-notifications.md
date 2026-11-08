# Mobile push notifications

## Configuration found on 8 November 2026

The native app includes `expo-notifications`, the config plugin, Android package `com.gatewayglobal.ggapp`, and EAS project `993ee4f3-5bba-47bc-bf7a-cfa0d08ea343` (owner `fannonb`). Registration, foreground presentation, and notification tap routing are wired into the patient app.

The supplied `google-services.json` has been validated for Firebase project `gateway-global-app` and package `com.gatewayglobal.ggapp`. It has been uploaded as the secret `GOOGLE_SERVICES_JSON` file variable in EAS development, preview and production environments. The matching Firebase service-account key has been uploaded and assigned to this Android application for FCM V1. A Google validation-only request authenticated successfully and rejected only the intentionally invalid test device token; no notification was sent by that check.

The production API has deployed migration `202611080004_push_delivery`, with database and Redis readiness verified. Native build `2f12c1c9-0adc-4888-8a99-e42ee89254b7` contains the Android notification configuration. Previously installed binaries still need to be replaced with the rebuilt app. Real-device notification delivery has not been exercised because no Android device was attached.

The build completed successfully. The verified APK is published at [Download GG'APP for Android](https://app.gatewayglobal.africa/downloads/ggapp.apk). Its signing certificate matches the previously published APK, and binary inspection confirmed the Firebase identifiers, notification permission, default channel and messaging service. The generated local Android project also has its Google Services integration configured.

The implementation creates the `ggapp-alerts` channel before requesting Android notification permission, registers authenticated devices with the API, refreshes registration on resume/reconnect and native token changes, and refreshes patient data on foreground notifications. Explicit logout attempts device unregistration before clearing authentication, with a three-second limit so network failures do not trap the user. Offline cleanup is best effort. Cold-start notification taps continue through the existing routing flow.

## Finish Android setup

1. In [Firebase Console](https://console.firebase.google.com/), select or create the Firebase project for this app. Add an Android app with the exact package name `com.gatewayglobal.ggapp`. Download its **google-services.json**.
2. Put that file in `apps/mobile/google-services.json`, or set `GOOGLE_SERVICES_JSON` to its path. `app.config.js` uses either source automatically. For EAS builds, create a **file** environment variable named `GOOGLE_SERVICES_JSON` containing the file in each build environment you use; the ignored local file is not uploaded with your source. Keep the client Firebase file available during prebuild; it is distinct from the private service account key in the next step.
3. Configure the matching Firebase project's FCM V1 service account key in the EAS project. From `apps/mobile`, run:

   ```powershell
   npx.cmd eas-cli credentials --platform android
   ```

   Select the build profile, then **Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1)**. Upload/select a key with Firebase Cloud Messaging permissions. Verify the project and app identifier in EAS. Never put this private service account key in the mobile bundle or an `EXPO_PUBLIC_*` variable.
4. Validate the client configuration locally:

   ```powershell
   npm.cmd run push:check
   ```

   The check fails clearly when the file is missing, malformed, or for a different Android package. EAS also runs it after dependency installation, before building. It cannot verify the remote FCM V1 service account; check EAS Credentials separately.
5. Build and install a **new native binary**:

   ```powershell
   npx.cmd eas-cli build --platform android --profile preview
   ```

   For store distribution, use `--profile production`. Preview and production profiles already target the production API with mock mode off. EAS will generate Android native files because `/android` is ignored. For a local Gradle build, regenerate the existing native project with `npx.cmd expo prebuild --platform android` after adding the Firebase file; preserve any manual native customizations first. A JavaScript-only update cannot add missing Firebase resources or manifest configuration.
6. Ensure the updated API and migration `202611080004_push_delivery` are deployed. If Expo enhanced push security is enabled, set `EXPO_ACCESS_TOKEN` on the API to a valid token for this Expo account/project.

Android push must be tested in a native development, preview or production build. Expo Go on Android cannot receive remote push notifications. Prefer a physical Android phone for the acceptance check.

## Acceptance check

1. Install the new binary and sign in. Allow notifications when prompted. If previously denied, enable GG'APP notifications in Android Settings and reopen the app.
2. Confirm the API registers an `EXPO` device in `PushDevice`; do not publish the token in logs or screenshots.
3. From another account, trigger an appointment, invoice, prescription or allocation event for this patient.
4. Verify delivery while foregrounded, backgrounded, and after normally closing the app. Tap the notification and confirm the expected screen, including a cold start. Android force-stop suppresses delivery until the app is opened again.
5. Sign out, trigger another event and verify the phone no longer receives that account's notifications. Sign in again and verify registration resumes.
6. Check API logs after fifteen minutes: delayed Expo receipts reveal `InvalidCredentials`/FCM errors that are not visible in initial push tickets.

No real-device delivery has been proven by the local automated checks alone. The Firebase client file and EAS service account must belong to the same Firebase project.

## iOS

The same Expo registration and tap flow is used for iOS, but an iOS native build also requires an Apple Push Notification key configured in EAS Credentials for bundle identifier `com.gatewayglobal.ggapp`, appropriate Apple signing, and notification permission. Rebuild after changing native notification capabilities. iOS provisional permission is accepted by the registration flow.

## Automated checks

From the monorepo root:

```powershell
npm.cmd run typecheck
npm.cmd run test:patient
```

References: [Expo SDK 56 notifications reference](https://docs.expo.dev/versions/v56.0.0/sdk/notifications/), [Expo FCM V1 setup](https://docs.expo.dev/push-notifications/fcm-credentials/), [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).
