type CollectionWithComputedInsert<K, V> = {
  get(key: K): V | undefined
  has(key: K): boolean
  set(key: K, value: V): unknown
  getOrInsertComputed?: (key: K, callback: (key: K) => V) => V
}

declare global {
  interface Math {
    sumPrecise?: (values: Iterable<number>) => number
  }
}

if (typeof Math.sumPrecise !== 'function') {
  Object.defineProperty(Math, 'sumPrecise', {
    configurable: true,
    writable: true,
    value(values: Iterable<number>): number {
      let total = 0

      for (const value of values) {
        total += value
      }

      return total
    }
  })
}

function installGetOrInsertComputed<K, V>(
  prototype: CollectionWithComputedInsert<K, V>,
  canAcceptKey: (key: unknown) => boolean
): void {
  if (typeof prototype.getOrInsertComputed === 'function') {
    return
  }

  Object.defineProperty(prototype, 'getOrInsertComputed', {
    configurable: true,
    writable: true,
    value(this: CollectionWithComputedInsert<K, V>, key: K, callback: (key: K) => V): V {
      if (!canAcceptKey(key)) {
        throw new TypeError('Invalid collection key')
      }

      if (this.has(key)) {
        return this.get(key) as V
      }

      const value = callback(key)
      this.set(key, value)
      return value
    }
  })
}

installGetOrInsertComputed(Map.prototype, () => true)
installGetOrInsertComputed(WeakMap.prototype, (key) => (typeof key === 'object' && key !== null) || typeof key === 'symbol')

export {}
