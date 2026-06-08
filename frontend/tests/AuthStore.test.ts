import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@/types/auth'

const authApiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  restoreCurrentUserSession: vi.fn(),
  clearStoredTokens: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  apiClient: {
    getCurrentUser: authApiMocks.getCurrentUser,
    login: authApiMocks.login,
    register: authApiMocks.register,
    logout: authApiMocks.logout,
  },
  restoreCurrentUserSession: authApiMocks.restoreCurrentUserSession,
  clearStoredTokens: authApiMocks.clearStoredTokens,
}))

vi.mock('@/lib/offline/offlineDB', () => ({
  clearOfflineData: vi.fn(),
}))

import { useAuthStore } from '@/store/authStore'

const sampleUser: User = {
  id: 7,
  codigo: 'docente01',
  email: 'docente01@edumind.es',
  is_active: true,
  is_superuser: false,
  plan_code: 'free',
  plan_leagues_limit: 3,
  grandfathered_unlimited: false,
  grandfathered_at: null,
  created_at: '2026-04-04T10:00:00.000Z',
}

describe('authStore session recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  })

  it('restores the user session before clearing auth state on a recoverable 401', async () => {
    authApiMocks.getCurrentUser.mockRejectedValue({ isAxiosError: true, response: { status: 401 } })
    authApiMocks.restoreCurrentUserSession.mockResolvedValue(sampleUser)

    await useAuthStore.getState().fetchCurrentUser()

    const state = useAuthStore.getState()
    expect(authApiMocks.restoreCurrentUserSession).toHaveBeenCalledTimes(1)
    expect(authApiMocks.clearStoredTokens).not.toHaveBeenCalled()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(sampleUser)
    expect(state.isLoading).toBe(false)
  })

  it('clears auth state when session recovery also fails', async () => {
    authApiMocks.getCurrentUser.mockRejectedValue({ isAxiosError: true, response: { status: 401 } })
    authApiMocks.restoreCurrentUserSession.mockResolvedValue(null)

    await useAuthStore.getState().fetchCurrentUser()

    const state = useAuthStore.getState()
    expect(authApiMocks.restoreCurrentUserSession).toHaveBeenCalledTimes(1)
    expect(authApiMocks.clearStoredTokens).toHaveBeenCalledTimes(1)
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.isLoading).toBe(false)
  })
})
