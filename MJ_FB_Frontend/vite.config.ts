import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const buildVersion =
    process.env.BUILD_VERSION ?? new Date().toISOString().replace(/[:.]/g, '-')
  const plugins: PluginOption[] = [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { runtimeCaching: [], navigateFallback: undefined },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ]
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
    define: {
      __BUILD_VERSION__: JSON.stringify(buildVersion),
    },
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
