import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins: PluginOption[] = [react()]
  if (mode === 'production') {
    try {
      const { visualizer } = await import('rollup-plugin-visualizer')
      plugins.push(
        visualizer({ filename: 'stats.html', open: false }) as PluginOption
      )
    } catch (err) {
      console.warn('rollup-plugin-visualizer is not installed', err)
    }
  }

  return {
    plugins,
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
      },
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      // manualChunks previously split vendor libraries into bespoke chunks.
      // This caused a circular dependency between the React and MUI chunks
      // that triggered "Cannot access 'Mn' before initialization" during
      // production builds. Removing the configuration lets Rollup determine
      // optimal chunks and avoids the runtime error.
    },
  }
})
