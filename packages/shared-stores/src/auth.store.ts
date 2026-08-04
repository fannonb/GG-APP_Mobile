import { create } from 'zustand'
import type { UserRole } from '@gg/shared-types'

export type UserMode = 'existing' | 'new'

export const ONBOARDING_STEP_COUNT = 5
export const DEFAULT_ONBOARDING_DONE = [1, 2]

export type OnboardingStepStatus = 'done' | 'action' | 'next' | 'pending'

export function isOnboardingComplete(completedSteps: number[]): boolean {
  return completedSteps.length >= ONBOARDING_STEP_COUNT
}

export function deriveOnboardingStepStatus(
  stepN: number,
  completedSteps: number[],
): OnboardingStepStatus {
  if (completedSteps.includes(stepN)) return 'done'
  const firstIncomplete = Array.from(
    { length: ONBOARDING_STEP_COUNT },
    (_, i) => i + 1,
  ).find(n => !completedSteps.includes(n))
  if (stepN === firstIncomplete) return stepN === 3 ? 'action' : 'next'
  if (firstIncomplete !== undefined && stepN === firstIncomplete + 1) return 'next'
  return 'pending'
}

interface AuthStore {
  loggedIn: boolean
  userRole: UserRole | null
  userMode: UserMode
  onboardingCompletedSteps: number[]
  login: (role: UserRole) => void
  setSession: (role: UserRole) => void
  logout: () => void
  setUserMode: (mode: UserMode) => void
  completeOnboardingStep: (step: number) => void
  resetOnboarding: () => void
}

export const useAuthStore = create<AuthStore>(set => ({
  loggedIn: false,
  userRole: null,
  userMode: 'existing',
  onboardingCompletedSteps: [...DEFAULT_ONBOARDING_DONE],
  login: role => set({ loggedIn: true, userRole: role }),
  setSession: role => set({ loggedIn: true, userRole: role }),
  logout: () => set({ loggedIn: false, userRole: null }),
  setUserMode: mode =>
    set({
      userMode: mode,
      ...(mode === 'new' ? { onboardingCompletedSteps: [...DEFAULT_ONBOARDING_DONE] } : {}),
    }),
  completeOnboardingStep: step =>
    set(state => {
      if (state.onboardingCompletedSteps.includes(step)) return state
      return { onboardingCompletedSteps: [...state.onboardingCompletedSteps, step].sort((a, b) => a - b) }
    }),
  resetOnboarding: () => set({ onboardingCompletedSteps: [...DEFAULT_ONBOARDING_DONE] }),
}))
