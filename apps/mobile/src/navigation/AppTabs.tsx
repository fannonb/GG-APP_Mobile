import React, { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { CommonActions, getFocusedRouteNameFromRoute } from '@react-navigation/native'
import { colors, fontWeights } from '@/theme'
import { HomeIcon, SearchIcon, InvoiceIcon, WalletIcon, ProfileIcon } from '@/icons'
import { hapticSelection } from '@/lib/haptics'
import { prefersReducedMotion } from '@/lib/motion'
import { HomeStack } from './HomeStack'
import { ServicesStack } from './ServicesStack'
import { InvoicesStack } from './InvoicesStack'
import { WalletStack } from './WalletStack'
import { ProfileStack } from './ProfileStack'
import { TAB_ROOTS } from './tabRoots'
import type { AppTabsParamList } from '@/navigation/types'

const Tab = createBottomTabNavigator<AppTabsParamList>()

/**
 * Focused tasks (forms, payment, PIN entry) hide the tab bar so the screen's
 * pinned ActionBar is the only thing at the bottom and a stray tab tap can't
 * abandon a half-finished payment or booking.
 */
const TASK_ROUTES = new Set([
  'BookingForm',
  'BookingConfirm',
  'PrescriptionRequest',
  'PrescriptionConfirm',
  'RescheduleReview',
  'InvoiceReview',
  'PINAuth',
  'PaymentSuccess',
  'CreditDisclaimer',
  'CreditInitialApply',
  'CreditApply',
  'CreditIncrease',
  'SecurityPIN',
  'LedgerPinSetup',
])

const TAB_BAR_STYLE = {
  height: 66,
  paddingTop: 8,
  paddingBottom: 10,
  backgroundColor: colors.card,
  borderTopColor: colors.border,
  borderTopWidth: 1,
}

function AnimatedTabIcon({
  focused,
  children,
}: {
  focused: boolean
  children: React.ReactNode
}) {
  const scale = useRef(new Animated.Value(focused ? 1.08 : 1)).current

  useEffect(() => {
    if (prefersReducedMotion()) {
      scale.setValue(1)
      return
    }
    if (focused) {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1.06,
          speed: 22,
          bounciness: 6,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.timing(scale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }).start()
    }
  }, [focused, scale])

  return (
    <Animated.View style={{ transform: [{ scale }], alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </Animated.View>
  )
}

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: TASK_ROUTES.has(getFocusedRouteNameFromRoute(route) ?? '')
          ? { display: 'none' }
          : TAB_BAR_STYLE,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: {
          fontFamily: fontWeights.bold,
          fontSize: 10,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          hapticSelection()
          const root = TAB_ROOTS[route.name]
          const tabState = navigation.getState().routes.find((r: { key: string }) => r.key === route.key)?.state
          const atRoot =
            !tabState || (tabState.routes.length === 1 && tabState.routes[0]?.name === root)
          if (atRoot) return
          e.preventDefault()
          if (tabState.key) {
            // Reset only this tab's stack; the other tabs keep their place.
            navigation.dispatch({
              ...CommonActions.reset({ index: 0, routes: [{ name: root }] }),
              target: tabState.key,
            })
            navigation.dispatch(CommonActions.navigate(route.name))
          } else {
            navigation.dispatch(CommonActions.navigate(route.name, { screen: root }))
          }
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <HomeIcon size={24} color={color} active={focused} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="ServicesTab"
        component={ServicesStack}
        options={{
          tabBarLabel: 'Services',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <SearchIcon size={24} color={color} active={focused} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="InvoicesTab"
        component={InvoicesStack}
        options={{
          tabBarLabel: 'Invoices',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <InvoiceIcon size={24} color={color} active={focused} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletStack}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <WalletIcon size={24} color={color} active={focused} />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <ProfileIcon size={24} color={color} active={focused} />
            </AnimatedTabIcon>
          ),
        }}
      />
    </Tab.Navigator>
  )
}

