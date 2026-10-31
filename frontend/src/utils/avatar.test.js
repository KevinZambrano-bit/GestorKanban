import { describe, expect, it } from 'vitest'
import { getAvatarUrl } from './avatar'

describe('URL de avatar', () => {
  it('usa el estilo initials por defecto', () => {
    expect(getAvatarUrl('Ana Ruiz')).toBe(
      'https://api.dicebear.com/9.x/initials/svg?seed=Ana%20Ruiz'
    )
  })

  it('acepta un estilo personalizado', () => {
    expect(getAvatarUrl('Ana', 'bottts')).toBe(
      'https://api.dicebear.com/9.x/bottts/svg?seed=Ana'
    )
  })

  it('usa la semilla default cuando está vacía o no está definida', () => {
    expect(getAvatarUrl('')).toContain('seed=default')
    expect(getAvatarUrl(null)).toContain('seed=default')
    expect(getAvatarUrl(undefined)).toContain('seed=default')
  })

  it('codifica espacios, tildes y símbolos de la semilla', () => {
    expect(getAvatarUrl('Luís & Ana')).toBe(
      'https://api.dicebear.com/9.x/initials/svg?seed=Lu%C3%ADs%20%26%20Ana'
    )
  })
})
