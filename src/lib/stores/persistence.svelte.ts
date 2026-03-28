import { browser } from '$app/environment'

const STORAGE_PREFIX = 'warikane:'

export function persistedState<T>(key: string, initial: T): { get value(): T; set value(v: T) } {
  const storageKey = STORAGE_PREFIX + key

  function loadFromStorage(): T {
    if (!browser) return initial
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw === null) return initial
      return JSON.parse(raw) as T
    } catch {
      return initial
    }
  }

  function saveToStorage(v: T): void {
    if (!browser) return
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(v))
    } catch {
      // ignore
    }
  }

  let _value = $state<T>(loadFromStorage())

  return {
    get value() {
      return _value
    },
    set value(v: T) {
      _value = v
      saveToStorage(v)
    },
  }
}

export function clearPersistedData(): void {
  if (!browser) return
  const keysToRemove: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i)
    if (k?.startsWith(STORAGE_PREFIX)) keysToRemove.push(k)
  }
  keysToRemove.forEach((k) => sessionStorage.removeItem(k))
}
