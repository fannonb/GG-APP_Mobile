import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ProfileScreen } from '@/screens/profile/ProfileScreen'
import { BeneficiariesScreen } from '@/screens/profile/BeneficiariesScreen'
import { NotificationsScreen } from '@/screens/profile/NotificationsScreen'
import { SecurityPINScreen } from '@/screens/profile/SecurityPINScreen'
import { HealthLedgerScreen } from '@/screens/ledger/HealthLedgerScreen'
import { LedgerPinSetupScreen } from '@/screens/ledger/LedgerPinSetupScreen'
import { LedgerAccessScreen } from '@/screens/ledger/LedgerAccessScreen'
import type { ProfileStackParamList } from '@/navigation/types'

const Stack = createNativeStackNavigator<ProfileStackParamList>()

export function ProfileStack() {
  return (
    <Stack.Navigator
      initialRouteName="Profile"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Beneficiaries" component={BeneficiariesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="SecurityPIN" component={SecurityPINScreen} />
      <Stack.Screen name="HealthLedger" component={HealthLedgerScreen} />
      <Stack.Screen name="LedgerPinSetup" component={LedgerPinSetupScreen} />
      <Stack.Screen name="LedgerAccess" component={LedgerAccessScreen} />
    </Stack.Navigator>
  )
}
