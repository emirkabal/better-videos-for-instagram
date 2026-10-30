export class BoundedMap<K, V> extends Map<K, V> {
  constructor(private limit: number) {
    super()
  }
  override set(key: K, value: V): this {
    this.delete(key)
    super.set(key, value)
    while (this.size > this.limit) {
      const oldest = this.keys().next()
      if (oldest.done) break
      this.delete(oldest.value)
    }
    return this
  }
}
