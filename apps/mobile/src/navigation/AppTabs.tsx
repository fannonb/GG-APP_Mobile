import React, { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { CommonActions } from '@react-navigation/native'
import { colors, fontWeights } from '@/theme'
import { HomeIcon, SearchIcon, InvoiceIcon, WalletIcon, ProfileIcon } from '@/icons'
import { hapticSelection } from '@/lib/haptics'
import { HomeStack } from './HomeStack'
import { ServicesStack } from './ServicesStack'
import { InvoicesStack } from './InvoicesStack'
import { WalletStack } from './WalletStack'
import { ProfileStack } from './ProfileStack'
import type { AppTabsParamList } from '@/navigation/types'

const Tab = createBottomTabNavigator<AppTabsParamList>()

function AnimatedTabIcon({
  focused,
  children,
}: {
  focused: boolean
  children: React.ReactNode
}) {
  const scale = useRef(new Animated.Value(focused ? 1.08 : 1)).current

  useEffect(() => {
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
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 66,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
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
      }}
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          hapticSelection()
          const state = navigation.getState()
          const currentRoute = state.routes.find((r: { key: string }) => r.key === route.key)
          if (currentRoute?.state && (currentRoute.state.index ?? 0) > 0) {
            e.preventDefault()
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: route.name }],
              })
            )
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
        listeners={({ navigation }) => ({
          tabPress: e => {
            hapticSelection()
            // Always show the full invoice list when the Invoices icon is tapped.
            // Nested navigates (banners, notifications) can leave InvoiceReview
            // as the tab's only/current screen, which looks like "one invoice".
            e.preventDefault()
            navigation.navigate('InvoicesTab', { screen: 'InvoiceList' })
          },
        })}
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
        listeners={({ navigation }) => ({
          tabPress: e => {
            hapticSelection()
            // Always land on the profile home when the Profile icon is tapped —
            // clears stale nested stack state (e.g. a leftover Security screen).
            e.preventDefault()
            navigation.navigate('ProfileTab', { screen: 'Profile' })
          },
        })}
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

