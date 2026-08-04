import { registerRootComponent } from 'expo';

declare const require: (moduleName: string) => { default: unknown }

const errorUtils = (globalThis as typeof globalThis & {
  ErrorUtils?: {
    getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void
    setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void
  }
}).ErrorUtils

const previousHandler = errorUtils?.getGlobalHandler?.()

errorUtils?.setGlobalHandler?.((error, isFatal) => {
  const stack = error instanceof Error ? error.stack : String(error)
  console.error('[GG Mobile fatal]', stack)
  previousHandler?.(error, isFatal)
})

const App = require('./App').default;

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App as never);
