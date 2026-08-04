import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { CommonActions } from '@react-navigation/native'
import { colors, fontWeights } from '@/theme'
import { HomeIcon, SearchIcon, InvoiceIcon, WalletIcon, ProfileIcon } from '@/icons'
import { HomeStack } from './HomeStack'
import { ServicesStack } from './ServicesStack'
import { InvoicesStack } from './InvoicesStack'
import { WalletStack } from './WalletStack'
import { ProfileStack } from './ProfileStack'
import type { AppTabsParamList } from '@/navigation/types'

const Tab = createBottomTabNavigator<AppTabsParamList>()

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
            <HomeIcon size={24} color={color} active={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="ServicesTab"
        component={ServicesStack}
        options={{
          tabBarLabel: 'Services',
          tabBarIcon: ({ color, focused }) => (
            <SearchIcon size={24} color={color} active={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="InvoicesTab"
        component={InvoicesStack}
        options={{
          tabBarLabel: 'Invoices',
          tabBarIcon: ({ color, focused }) => (
            <InvoiceIcon size={24} color={color} active={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletStack}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <WalletIcon size={24} color={color} active={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        listeners={({ navigation }) => ({
          tabPress: e => {
            // Always land on the profile home when the Profile icon is tapped —
            // clears stale nested stack state (e.g. a leftover Security screen).
            e.preventDefault()
            navigation.navigate('ProfileTab', { screen: 'Profile' })
          },
        })}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <ProfileIcon size={24} color={color} active={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
