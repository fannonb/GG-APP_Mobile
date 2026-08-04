import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore } from '@gg/shared-stores'
import { AuthStack } from './AuthStack'
import { AppTabs } from './AppTabs'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const loggedIn = useAuthStore(s => s.loggedIn)

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {loggedIn ? (
        <Stack.Screen name="App" component={AppTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  )
}
