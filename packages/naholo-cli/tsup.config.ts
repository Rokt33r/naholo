import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  noExternal: ['naholo-api'],
  esbuildOptions(options) {
    options.loader = { ...options.loader, '.md': 'text' }
  },
})
