import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { AuthStackParamList } from './types'
import { SplashScreen } from '@/screens/auth/SplashScreen'
import { LoginScreen } from '@/screens/auth/LoginScreen'
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen'
import { ResetPasswordScreen } from '@/screens/auth/ResetPasswordScreen'
import { RegisterScreen } from '@/screens/auth/RegisterScreen'
import { EmailVerifyScreen } from '@/screens/auth/EmailVerifyScreen'
import { OnboardingScreen } from '@/screens/auth/OnboardingScreen'
import { TermsScreen } from '@/screens/legal/TermsScreen'
import { PrivacyPolicyScreen } from '@/screens/legal/PrivacyPolicyScreen'

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="EmailVerify" component={EmailVerifyScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  )
}
