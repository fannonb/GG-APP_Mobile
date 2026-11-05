import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore } from '@gg/shared-stores'
import { AuthStack } from './AuthStack'
import { AppTabs } from './AppTabs'
import { NotificationsScreen } from '@/screens/profile/NotificationsScreen'
import type { RootStackParamList } from './types'
import { ActivityIndicator, View } from 'react-native'
import { useConnectionStore } from '@/lib/connection'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator() {
  const loggedIn = useAuthStore(s => s.loggedIn)
  const userRole = useAuthStore(s => s.userRole)
  const restoring = useConnectionStore(s => s.restoring)

  if (restoring) return <View style={{ flex: 1, backgroundColor: '#091C44', justifyContent: 'center' }}><ActivityIndicator color="#38B6FF" accessibilityLabel="Restoring your session" /></View>

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {loggedIn && userRole === 'patient' ? (
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
