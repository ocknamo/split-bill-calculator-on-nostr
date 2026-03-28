import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// browser=false (default mock) — loadFromStorage returns fallback, $effect is no-op
describe('persistedState (browser=false)', () => {
  it('初期値を返す (browser=false)', async () => {
    const { persistedState } = await import('./persistence.svelte')
    const state = persistedState('test-key', 'default-value')
    expect(state.value).toBe('default-value')
  })

  it('配列の初期値を返す (browser=false)', async () => {
    const { persistedState } = await import('./persistence.svelte')
    const state = persistedState('arr-key', [] as string[])
    expect(state.value).toEqual([])
  })

  it('値の set/get が動作する (browser=false)', async () => {
    const { persistedState } = await import('./persistence.svelte')
    const state = persistedState('set-test', 0)
    state.value = 42
    expect(state.value).toBe(42)
  })
})

describe('clearPersistedData (browser=false)', () => {
  it('例外なく実行できる', async () => {
    const { clearPersistedData } = await import('./persistence.svelte')
    expect(() => clearPersistedData()).not.toThrow()
  })
})
