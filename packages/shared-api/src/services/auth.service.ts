import { getIsMockApi } from '../config'
import { apiClient } from '../client'
import { mockDelay } from '../mock/delay'
import { getTokenStorage } from '../token-storage'
import type {
  AuthSession,
  ForgotPasswordResponse,
  GoogleAuthPayload,
  GoogleAuthResult,
  LoginPayload,
  RegisterPatientPayload,
  RegisterPatientResponse,
  RegisterSPPayload,
  RegisterSPResponse,
  ResetPasswordResponse,
  SPApplicationStatusResponse,
  VerifyEmailResponse,
  UserRole,
} from '@gg/shared-types'

function buildMockSession(role: UserRole): AuthSession {
  return {
    accessToken: `mock-access-${role}-${Date.now()}`,
    refreshToken: `mock-refresh-${role}-${Date.now()}`,
    role,
    expiresAt: Date.now() + 60 * 60 * 1000,
  }
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    if (getIsMockApi()) {
      await mockDelay(800)
      const session = buildMockSession(payload.role)
      getTokenStorage().setSession(session)
      return session
    }

    const { data } = await apiClient.post<AuthSession>('/auth/login', payload)
    getTokenStorage().setSession(data)
    return data
  },

  async loginWithGoogle(payload: GoogleAuthPayload): Promise<GoogleAuthResult> {
    if (getIsMockApi()) {
      await mockDelay(700)
      const session = buildMockSession('patient')
      getTokenStorage().setSession(session)
      return { ...session, needsRegistration: false }
    }

    const { data } = await apiClient.post<GoogleAuthResult>('/auth/google', payload)
    if (!data.needsRegistration) {
      getTokenStorage().setSession(data)
    }
    return data
  },

  async registerPatient(payload: RegisterPatientPayload): Promise<RegisterPatientResponse> {
    if (getIsMockApi()) {
      await mockDelay(900)
      // Registrations are auto-approved (no email verification in this build).
      const session = buildMockSession('patient')
      getTokenStorage().setSession(session)
      return { message: 'Registration successful.', session }
    }

    const { data } = await apiClient.post<RegisterPatientResponse>('/auth/register/patient', payload)
    if (data.session) {
      getTokenStorage().setSession(data.session)
    }
    return data
  },

  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    if (getIsMockApi()) {
      await mockDelay(500)
      return { message: 'Email verified successfully. You can now sign in.' }
    }

    const { data } = await apiClient.post<VerifyEmailResponse>('/auth/verify-email', { token })
    return data
  },

  async registerSP(payload: RegisterSPPayload): Promise<RegisterSPResponse> {
    if (getIsMockApi()) {
      await mockDelay(900)
      return {
        message: 'Application submitted. Awaiting admin approval.',
        applicationId: `mock-sp-app-${Date.now()}`,
        status: 'pending',
      }
    }

    const { data } = await apiClient.post<RegisterSPResponse>('/auth/register/sp', payload)
    return data
  },

  async getSPApplicationStatus(applicationId: string): Promise<SPApplicationStatusResponse> {
    if (getIsMockApi()) {
      await mockDelay(400)
      return {
        applicationId,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        decidedAt: null,
        note: null,
      }
    }

    const { data } = await apiClient.get<SPApplicationStatusResponse>(
      `/auth/register/sp/${applicationId}/status`,
    )
    return data
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    if (getIsMockApi()) {
      await mockDelay(700)
      return {
        message: 'If an account exists for that email, a reset link has been sent.',
        resetUrl: 'https://example.com/reset-password?token=mock-token',
      }
    }

    const { data } = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', { email })
    return data
  },

  async resetPassword(token: string, password: string): Promise<ResetPasswordResponse> {
    if (getIsMockApi()) {
      await mockDelay(700)
      return { message: 'Password reset successfully. You can now sign in.' }
    }

    const { data } = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', { token, password })
    return data
  },

  async logout(): Promise<void> {
    const refreshToken = getTokenStorage().getRefreshToken()
    getTokenStorage().clear()

    if (getIsMockApi() || !refreshToken) return

    try {
      await apiClient.post('/auth/logout', { refreshToken })
    } catch {
      // Session cleared locally regardless
    }
  },

  async refreshSession(): Promise<AuthSession | null> {
    const stored = getTokenStorage().getSession()
    if (!stored) return null

    if (getIsMockApi()) {
      if (stored.expiresAt > Date.now()) return stored
      const session = buildMockSession(stored.role)
      getTokenStorage().setSession(session)
      return session
    }

    const { data } = await apiClient.post<AuthSession>('/auth/refresh', {
      refreshToken: stored.refreshToken,
    })
    getTokenStorage().setSession(data)
    return data
  },

  getStoredSession(): AuthSession | null {
    return getTokenStorage().getSession()
  },
}
