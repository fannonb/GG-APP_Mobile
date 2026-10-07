import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { TASK_SCREEN, RESULT_SCREEN } from './transitions'
import type { ServicesStackParamList } from '@/navigation/types'
import { FindServiceScreen } from '@/screens/services/FindServiceScreen'
import { ProviderListScreen } from '@/screens/services/ProviderListScreen'
import { ProviderProfileScreen } from '@/screens/services/ProviderProfileScreen'
import { BookingFormScreen } from '@/screens/services/BookingFormScreen'
import { BookingConfirmScreen } from '@/screens/services/BookingConfirmScreen'
import { PrescriptionRequestScreen } from '@/screens/services/PrescriptionRequestScreen'
import { PrescriptionConfirmScreen } from '@/screens/services/PrescriptionConfirmScreen'
import { PrescriptionRequestsScreen } from '@/screens/services/PrescriptionRequestsScreen'
import { PrescriptionDetailScreen } from '@/screens/services/PrescriptionDetailScreen'

const Stack = createNativeStackNavigator<ServicesStackParamList>()

export function ServicesStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="FindService" component={FindServiceScreen} />
      <Stack.Screen name="ProviderList" component={ProviderListScreen} />
      <Stack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
      <Stack.Screen name="BookingForm" component={BookingFormScreen} options={TASK_SCREEN} />
      <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} options={RESULT_SCREEN} />
      <Stack.Screen name="PrescriptionRequest" component={PrescriptionRequestScreen} options={TASK_SCREEN} />
      <Stack.Screen name="PrescriptionConfirm" component={PrescriptionConfirmScreen} options={RESULT_SCREEN} />
      <Stack.Screen name="PrescriptionRequests" component={PrescriptionRequestsScreen} />
      <Stack.Screen name="PrescriptionDetail" component={PrescriptionDetailScreen} />
    </Stack.Navigator>
  )
}
