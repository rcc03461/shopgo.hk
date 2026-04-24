// @ts-ignore Bun test types are not configured in this repository yet.
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const moduleDir = fileURLToPath(new URL('.', import.meta.url))

function readComponent(filename: string) {
  return readFileSync(new URL(filename, `file://${moduleDir}`), 'utf8')
}

describe('homepage slider autoplay SSR safety', () => {
  test.each(['HomepageImageSlider1.vue', 'HomepageProductSlider1.vue'])(
    '%s only starts autoplay after client mount',
    (filename) => {
      const source = readComponent(filename)

      expect(source).toContain('onMounted(() =>')
      expect(source).toContain('startAutoplay()')
      expect(source).not.toContain('() => startAutoplay(),\n  { immediate: true },')
    },
  )
})
