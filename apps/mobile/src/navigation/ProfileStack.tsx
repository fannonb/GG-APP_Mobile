import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { ProfileScreen } from '@/screens/profile/ProfileScreen'
import { BeneficiariesScreen } from '@/screens/profile/BeneficiariesScreen'
import { SecurityPINScreen } from '@/screens/profile/SecurityPINScreen'
import { HealthLedgerScreen } from '@/screens/ledger/HealthLedgerScreen'
import { LedgerPinSetupScreen } from '@/screens/ledger/LedgerPinSetupScreen'
import { LedgerAccessScreen } from '@/screens/ledger/LedgerAccessScreen'
import { TermsScreen } from '@/screens/legal/TermsScreen'
import { PrivacyPolicyScreen } from '@/screens/legal/PrivacyPolicyScreen'
import { TASK_SCREEN, RESULT_SCREEN } from './transitions'
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
      <Stack.Screen name="SecurityPIN" component={SecurityPINScreen} options={TASK_SCREEN} />
      <Stack.Screen name="HealthLedger" component={HealthLedgerScreen} />
      <Stack.Screen name="LedgerPinSetup" component={LedgerPinSetupScreen} options={TASK_SCREEN} />
      <Stack.Screen name="LedgerAccess" component={LedgerAccessScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  )
}
