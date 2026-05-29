import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const root = process.cwd()
const require = createRequire(import.meta.url)
const electronPath = require('electron').trim()
const userDataDir = join(root, 'out', '.electron-user-data')

await import('./build.mjs')

const electronProcess = spawn(
  electronPath,
  ['--user-data-dir=' + userDataDir, '--disable-gpu', '--disable-gpu-compositing', '--disable-software-rasterizer', '--in-process-gpu', root],
  {
  cwd: root,
  env: {
    ...process.env
  },
  stdio: 'inherit'
  }
)

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
