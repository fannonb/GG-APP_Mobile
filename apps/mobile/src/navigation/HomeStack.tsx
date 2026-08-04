import { createNativeStackNavigator } from '@react-navigation/native-stack'
import DashboardScreen from '@/screens/home/DashboardScreen'
import { AppointmentsScreen } from '@/screens/payments/AppointmentsScreen'
import { RescheduleReviewScreen } from '@/screens/home/RescheduleReviewScreen'
import type { HomeStackParamList } from '@/navigation/types'

const Stack = createNativeStackNavigator<HomeStackParamList>()

export function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Appointments" component={AppointmentsScreen} />
      <Stack.Screen name="RescheduleReview" component={RescheduleReviewScreen} />
    </Stack.Navigator>
  )
}
