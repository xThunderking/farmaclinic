import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const normalizeBasePath = (basePath) => {
  if (!basePath || basePath.trim() === '' || basePath.trim() === '/') return '/'

  let normalized = basePath.trim()
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  if (!normalized.endsWith('/')) normalized = `${normalized}/`
  return normalized
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: normalizeBasePath(env.VITE_BASE_PATH),
    plugins: [react()],
    build: {
      // ExcelJS se carga bajo demanda al importar o exportar diluciones.
      chunkSizeWarningLimit: 1000,
    },
  }
})
