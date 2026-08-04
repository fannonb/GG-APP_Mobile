import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { CreditWalletScreen } from '@/screens/credit/CreditWalletScreen'
import { CreditDisclaimerScreen } from '@/screens/credit/CreditDisclaimerScreen'
import { CreditInitialApplyScreen } from '@/screens/credit/CreditInitialApplyScreen'
import { CreditApplyScreen } from '@/screens/credit/CreditApplyScreen'
import { CreditIncreaseScreen } from '@/screens/credit/CreditIncreaseScreen'
import { CreditStatusScreen } from '@/screens/credit/CreditStatusScreen'
import { TransactionHistoryScreen } from '@/screens/payments/TransactionHistoryScreen'
import type { WalletStackParamList } from '@/navigation/types'

const Stack = createNativeStackNavigator<WalletStackParamList>()

export function WalletStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="CreditWallet" component={CreditWalletScreen} />
      <Stack.Screen name="CreditDisclaimer" component={CreditDisclaimerScreen} />
      <Stack.Screen name="CreditInitialApply" component={CreditInitialApplyScreen} />
      <Stack.Screen name="CreditApply" component={CreditApplyScreen} />
      <Stack.Screen name="CreditIncrease" component={CreditIncreaseScreen} />
      <Stack.Screen name="CreditStatus" component={CreditStatusScreen} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
    </Stack.Navigator>
  )
}
