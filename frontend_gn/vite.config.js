import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const CERT_DIR = path.resolve(__dirname, 'certs')
const CERT_FILE = path.join(CERT_DIR, 'localhost.pem')
const KEY_FILE = path.join(CERT_DIR, 'localhost-key.pem')
const hasHttpsCerts = fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_DEV_BACKEND_TARGET || 'http://127.0.0.1:8000'

  const serverConfig = {
    port: 3002,
    host: true,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        xfwd: true,
        headers: {
          'X-Forwarded-Proto': 'https',
        },
      },
      '/media': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        xfwd: true,
        headers: {
          'X-Forwarded-Proto': 'https',
        },
      },
    },
  }

  if (hasHttpsCerts) {
    serverConfig.https = {
      key: fs.readFileSync(KEY_FILE),
      cert: fs.readFileSync(CERT_FILE),
    }
    console.log('🔐 HTTPS activé pour Vite sur https://localhost:3002')
  } else {
    console.warn('⚠️  Certificats HTTPS introuvables. Lancez "npm run setup:https" pour les générer.')
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './components')
      }
    },
    css: {
      postcss: './postcss.config.cjs',
      devSourcemap: true
    },
    server: serverConfig,
  }
})
