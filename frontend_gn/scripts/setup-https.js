/**
 * Script de configuration HTTPS local avec mkcert
 *
 * - Installe le certificat racine (si nécessaire)
 * - Génère un certificat pour localhost, 127.0.0.1 et ::1
 *
 * Compatible Windows / macOS / Linux tant que mkcert est supporté.
 */

import { existsSync, mkdirSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')
const certsDir = join(projectRoot, 'certs')
const certFile = join(certsDir, 'localhost.pem')
const keyFile = join(certsDir, 'localhost-key.pem')

const run = (cmd, args, options = {}) => {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })

  if (result.status !== 0) {
    throw new Error(`La commande "${cmd} ${args.join(' ')}" a échoué.`)
  }
}

const ensureCertificates = () => {
  if (!existsSync(certsDir)) {
    mkdirSync(certsDir, { recursive: true })
  }

  const hasCert = existsSync(certFile) && existsSync(keyFile)
  if (hasCert) {
    console.log('✅ Certificats HTTPS déjà présents dans le dossier ./certs')
    return
  }

  console.log('🔐 Installation du certificat racine mkcert (une seule fois, peut demander la confirmation système)...')
  run('npx', ['--yes', 'mkcert', '-install'])

  console.log('📄 Génération des certificats pour localhost, 127.0.0.1 et ::1 ...')
  run('npx', [
    '--yes',
    'mkcert',
    '-cert-file',
    certFile,
    '-key-file',
    keyFile,
    'localhost',
    '127.0.0.1',
    '::1',
  ])

  console.log(`✅ Certificats générés :
  - Certificat : ${certFile}
  - Clé privée : ${keyFile}

Relancez maintenant votre serveur en exécutant "npm run dev" ou "npm run dev:https".`)
}

try {
  ensureCertificates()
} catch (error) {
  console.error('\n❌ Échec de la configuration HTTPS locale.')
  console.error(error.message)
  console.error('\nAstuce : installez mkcert manuellement depuis https://github.com/FiloSottile/mkcert puis relancez ce script.')
  process.exit(1)
}

