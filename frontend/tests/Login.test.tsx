import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import Login from '@/pages/Login'

const authMocks = vi.hoisted(() => ({
  login: vi.fn(),
  clearError: vi.fn(),
}))

const translations: Record<string, string> = {
  'nav.access': 'Acceso',
  'auth.loginTitle': 'Entrar en Liga EDUmind',
  'auth.loginSubtitle': 'Accede con tu usuario docente o institucional.',
  'auth.username': 'Codigo',
  'auth.usernamePlaceholder': 'Tu codigo',
  'auth.usernameHint': 'Introduce tu identificador habitual.',
  'auth.password': 'Contrasena',
  'auth.forgotPassword': 'He olvidado mi contrasena',
  'auth.loginButton': 'Entrar',
  'auth.loggingIn': 'Entrando...',
  'auth.loginProviderDivider': 'Acceso institucional',
  'auth.loginWithEdumind': 'Acceder con EDUmind',
  'auth.loginProviderHint': 'Usa tu cuenta institucional si la tienes activa.',
  'auth.loginWorkspaceTitle': 'Espacio de trabajo',
  'auth.loginWorkspaceDesc': 'Gestiona tus ligas y seguimiento.',
  'auth.loginBenefitSecure': 'Sesion segura',
  'auth.loginBenefitSync': 'Sincronizacion estable',
  'auth.loginBenefitContent': 'Recursos conectados',
  'auth.expressAccess': 'Acceso express',
  'auth.studentAccess': 'Acceso alumnado',
  'auth.proposeSportAccess': 'Proponer deporte',
  'auth.noAccount': 'No tienes cuenta?',
  'auth.registerHere': 'Registrate',
}

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    login: authMocks.login,
    isLoading: false,
    error: null,
    clearError: authMocks.clearError,
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key] ?? key,
  }),
}))

vi.mock('@/api/client', () => ({
  getOidcStartUrl: () => '/api/v1/auth/oidc/start?next=%2Fligas',
  isAuthentikEnabled: () => true,
}))

vi.mock('@/components/EDUmindFooter', () => ({
  default: () => <div data-testid="footer" />,
}))

vi.mock('@/components/accessibility/AccessibilityMenu', () => ({
  default: () => <div data-testid="a11y-menu" />,
}))

describe('Login', () => {
  it('renders and submits credentials', async () => {
    authMocks.login.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/ligas" element={<div>Destino ligas</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Entrar en Liga EDUmind' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Acceder con EDUmind' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Codigo'), 'docente01')
    await user.type(screen.getByLabelText('Contrasena'), 'Clave#123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(authMocks.clearError).toHaveBeenCalled()
    expect(authMocks.login).toHaveBeenCalledWith('docente01', 'Clave#123')
  })
})
