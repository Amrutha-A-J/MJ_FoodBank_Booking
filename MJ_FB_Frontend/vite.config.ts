import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

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
          manualChunks(id: string) {
            if (id.includes('@mui/icons-material/')) {
              const [, name] = id.split('@mui/icons-material/')
              const iconName = path.parse(name).name
              if (iconName === 'createSvgIcon') return 'mui'
              return `mui-${iconName}`
            }
            if (id.includes('/node_modules/@mui/material/')) return 'mui'
            if (id.includes('/node_modules/react-router-dom/')) return 'router'
            if (id.includes('/node_modules/recharts/')) return 'recharts'
            if (
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/react-dom/')
            )
              return 'react'
          },
        },
      },
    },
  }
})
