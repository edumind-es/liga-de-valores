import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import RepositorioJuegos from '@/pages/Resources/RepositorioJuegos'

const repositoryMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    get: repositoryMocks.get,
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

describe('RepositorioJuegos', () => {
  it('loads repository items and filters by search term', async () => {
    const user = userEvent.setup()

    repositoryMocks.get
      .mockResolvedValueOnce({
        data: [
          { id: 1, nombre: 'Baloncesto' },
          { id: 2, nombre: 'Ultimate' },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { id: 10, title: 'Rondo cooperativo', sport_name: 'Baloncesto', created_at: '2026-04-02T10:00:00Z' },
          { id: 11, title: 'Disco relevo', sport_name: 'Ultimate', created_at: '2026-04-01T10:00:00Z' },
        ],
      })

    render(
      <MemoryRouter>
        <RepositorioJuegos />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Rondo cooperativo')).toBeInTheDocument()
    expect(screen.getByText('Disco relevo')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Buscar juegos por nombre'), 'Rondo')

    expect(screen.getByText('Rondo cooperativo')).toBeInTheDocument()
    expect(screen.queryByText('Disco relevo')).not.toBeInTheDocument()
  })
})
