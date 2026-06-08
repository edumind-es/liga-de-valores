import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import PublicTeamPortal from '@/pages/Public/PublicTeamPortal'

const teamPortalMocks = vi.hoisted(() => ({
  getTeamByToken: vi.fn(),
}))

vi.mock('@/api/teamAccess', () => ({
  teamAccessApi: {
    getTeamByToken: teamPortalMocks.getTeamByToken,
    joinTeam: vi.fn(),
    submitLogoProposal: vi.fn(),
  },
}))

vi.mock('@/components/layout/PublicEditorialShell', () => ({
  default: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h1>{title}</h1>
      {children}
    </section>
  ),
}))

vi.mock('@/components/LogoDesigner', () => ({
  default: () => <div data-testid="logo-designer" />,
}))

describe('PublicTeamPortal', () => {
  it('loads public team information and renders contract flow', async () => {
    teamPortalMocks.getTeamByToken.mockResolvedValue({
      equipo_id: 7,
      equipo_nombre: 'Lobos del Norte',
      equipo_color: '#3B82F6',
      liga_id: 4,
      liga_nombre: 'Liga Valores 2026',
      roles: ['Capitana', 'Arbitra'],
      commitments: {
        Capitana: ['Animar al equipo', 'Respetar turnos'],
        Arbitra: ['Cuidar la imparcialidad'],
      },
      allow_logo_editing: true,
    })

    render(
      <MemoryRouter initialEntries={['/public/team/token-demo']}>
        <Routes>
          <Route path="/public/team/:token" element={<PublicTeamPortal />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Lobos del Norte' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Contrato' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Logo' })).toBeInTheDocument()
    expect(screen.getByText('Tu nombre')).toBeInTheDocument()
  })
})
