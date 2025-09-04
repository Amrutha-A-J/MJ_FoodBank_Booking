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
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
            router: ['react-router-dom'],
            recharts: ['recharts'],
          },
        },
      },
    },
  }
})
