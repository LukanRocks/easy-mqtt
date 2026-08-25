import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  // Bundle the workspace dynsec package into the output; keep node_modules deps
  // external so they resolve from the pruned production install at runtime.
  noExternal: [/@easy-mqtt\/dynsec/],
  splitting: false,
  sourcemap: true,
})
