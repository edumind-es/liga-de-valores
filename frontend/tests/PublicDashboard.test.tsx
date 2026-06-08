import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import PublicDashboard from '@/pages/Public/PublicDashboard'

const dashboardMocks = vi.hoisted(() => ({
  getLiga: vi.fn(),
  getClasificacion: vi.fn(),
  getJornadas: vi.fn(),
  getStoredPublicToken: vi.fn(),
  clearStoredPublicToken: vi.fn(),
}))

vi.mock('@/api/public', () => ({
  publicApi: {
    getLiga: dashboardMocks.getLiga,
    getClasificacion: dashboardMocks.getClasificacion,
    getJornadas: dashboardMocks.getJornadas,
  },
}))

vi.mock('@/api/client', () => ({
  getStoredPublicToken: dashboardMocks.getStoredPublicToken,
  clearStoredPublicToken: dashboardMocks.clearStoredPublicToken,
}))

describe('PublicDashboard', () => {
  it('renders public league summary with classification data', async () => {
    dashboardMocks.getStoredPublicToken.mockReturnValue('public-token')
    dashboardMocks.getLiga.mockResolvedValue({
      id: 42,
      nombre: 'Liga Horizonte',
      descripcion: 'Competicion educativa de primavera.',
      temporada: '2026',
      modo_evaluacion: 'clasico',
    })
    dashboardMocks.getClasificacion.mockResolvedValue({
      clasificacion: [
        {
          equipo_id: 1,
          equipo_nombre: 'Equipo Norte',
          posicion: 1,
          partidos_jugados: 3,
          puntos_deportivos: 6,
          puntos_educativos_total: 3,
          puntos_totales: 9,
        },
        {
          equipo_id: 2,
          equipo_nombre: 'Equipo Sur',
          posicion: 2,
          partidos_jugados: 3,
          puntos_deportivos: 4,
          puntos_educativos_total: 2,
          puntos_totales: 6,
        },
      ],
    })
    dashboardMocks.getJornadas.mockResolvedValue([
      {
        id: 10,
        nombre: 'Jornada 1',
        fecha_inicio: '2026-04-10',
        partidos: [
          {
            id: 100,
            equipo_local_id: 1,
            equipo_visitante_id: 2,
            puntos_local: 3,
            puntos_visitante: 1,
            finalizado: true,
          },
        ],
      },
    ])

    render(
      <MemoryRouter initialEntries={['/public/42/dashboard']}>
        <Routes>
          <Route path="/public/:ligaId/dashboard" element={<PublicDashboard />} />
          <Route path="/public/:ligaId/login" element={<div>Login publico</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Liga Horizonte' })).toBeInTheDocument()
    expect(screen.getByText('Equipo Norte')).toBeInTheDocument()
    expect(screen.getByText('Tabla de clasificacion')).toBeInTheDocument()
    expect(dashboardMocks.getLiga).toHaveBeenCalledWith(42, 'public-token')
  })
})
