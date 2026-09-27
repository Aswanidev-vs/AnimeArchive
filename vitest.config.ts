import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

/*
 * Vitest config for Anime Archive.
 *  - `vue()` compiles the SFC components under test.
 *  - The default environment stays `node` (the existing storage-adapter tests
 *    rely on it); component tests opt into happy-dom per file with the
 *    `// @vitest-environment happy-dom` docblock.
 *  - No runtime `~` alias is needed: every cross-project import the tests hit
 *    at runtime is a package import or a relative path (type-only `~/…`
 *    imports are erased before resolution), and `nuxt typecheck` resolves
 *    `~/…` through .nuxt/tsconfig paths.
 */
export default defineConfig({
  plugins: [
    // Two vite copies exist on disk (Nuxt's rolldown-vite at the root and
    // Vitest's own nested classic vite), so @vitejs/plugin-vue's Plugin type
    // does not structurally match vitest/config's PluginOption even though
    // they are runtime-compatible. Verified green by `npx vitest run`.
    vue() as any,
  ],
  test: {
    environment: 'node',
    // Scope the run to this project's own tests: the repo also contains a
    // vendored `.mimocode/node_modules` tree whose bundled zod test-sources
    // must never be collected.
    include: [
      'services/**/*.test.ts',
      'composables/**/*.test.ts',
      'components/**/__tests__/**/*.test.ts',
      'pages/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '.nuxt/**', '.output/**', '.mimocode/**'],
  },
})