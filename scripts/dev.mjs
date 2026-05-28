import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const root = process.cwd()
const require = createRequire(import.meta.url)
const electronPath = require('electron').trim()

await import('./build.mjs')

const electronProcess = spawn(electronPath, [root], {
  cwd: root,
  env: {
    ...process.env
  },
  stdio: 'inherit'
})

const shutdown = async () => {
  if (!electronProcess.killed) {
    electronProcess.kill()
  }
}

process.on('SIGINT', async () => {
  await shutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await shutdown()
  process.exit(0)
})
