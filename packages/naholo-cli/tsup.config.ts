import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  noExternal: [/.*/],
  banner: {
    js: "import { createRequire as __naholoCreateRequire } from 'node:module'; const require = __naholoCreateRequire(import.meta.url);",
  },
  esbuildOptions(options) {
    options.loader = { ...options.loader, '.md': 'text' }
  },
})
