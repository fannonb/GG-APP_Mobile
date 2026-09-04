import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore } from '@gg/shared-stores'
import { AuthStack } from './AuthStack'
import { AppTabs } from './AppTabs'
import { NotificationsScreen } from '@/screens/profile/NotificationsScreen'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const loggedIn = useAuthStore(s => s.loggedIn)

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {loggedIn ? (
        <>
          <Stack.Screen name="App" component={AppTabs} options={{ animation: 'fade' }} />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} options={{ animation: 'fade' }} />
      )}
    </Stack.Navigator>
  )
}
