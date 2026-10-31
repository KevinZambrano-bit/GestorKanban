import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from '../context/ThemeProvider'
import ThemeToggle from './ThemeToggle'

afterEach(() => {
  delete document.documentElement.dataset.theme
})

describe('Selector de tema', () => {
  it('aplica la preferencia guardada y alterna el tema al pulsar', async () => {
    const user = userEvent.setup()
    localStorage.setItem('theme', 'dark')

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )

    const button = screen.getByRole('button', { name: 'Usar tema claro' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.theme).toBe('dark')

    await user.click(button)

    expect(screen.getByRole('button', { name: 'Usar tema oscuro' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
