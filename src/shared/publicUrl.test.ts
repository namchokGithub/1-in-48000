import { describe, expect, it } from 'vitest'
import { publicUrl } from './publicUrl'

describe('publicUrl', () => {
  it('keeps site paths under the base and full URLs as they are', () => {
    expect(import.meta.env.BASE_URL).toBe('/')
    expect(publicUrl('/assets/scene/a.png')).toBe('/assets/scene/a.png')
    expect(publicUrl('content-v2/config.json')).toBe('/content-v2/config.json')
    expect(publicUrl('https://example.com/a.png')).toBe(
      'https://example.com/a.png',
    )
    expect(publicUrl('data:image/png;base64,AA')).toBe(
      'data:image/png;base64,AA',
    )
  })
})
