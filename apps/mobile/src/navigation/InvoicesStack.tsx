import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { InvoiceListScreen } from '@/screens/payments/InvoiceListScreen'
import { InvoiceReviewScreen } from '@/screens/payments/InvoiceReviewScreen'
import { PINAuthScreen } from '@/screens/payments/PINAuthScreen'
import { PaymentSuccessScreen } from '@/screens/payments/PaymentSuccessScreen'
import { TASK_SCREEN, RESULT_SCREEN } from './transitions'
import type { InvoicesStackParamList } from '@/navigation/types'

const Stack = createNativeStackNavigator<InvoicesStackParamList>()

export function InvoicesStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="InvoiceList" component={InvoiceListScreen} />
      <Stack.Screen name="InvoiceReview" component={InvoiceReviewScreen} />
      <Stack.Screen name="PINAuth" component={PINAuthScreen} options={TASK_SCREEN} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={RESULT_SCREEN} />
    </Stack.Navigator>
  )
}
