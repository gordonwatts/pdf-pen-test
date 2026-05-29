import { access } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const electronBinaryPath = join(
  root,
  'node_modules',
  'electron',
  'dist',
  process.platform === 'win32'
    ? 'electron.exe'
    : process.platform === 'darwin'
      ? join('Electron.app', 'Contents', 'MacOS', 'Electron')
      : 'electron'
)
const userDataDir = join(root, 'out', '.electron-user-data')

const fileExists = async (path) => {
  try {
    await access(path, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

if (!(await fileExists(electronBinaryPath))) {
  throw new Error('Electron is not installed. Run npm install before npm run dev.')
}

await import('./build.mjs')

const electronProcess = spawn(
  electronBinaryPath,
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
