import { access, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const root = process.cwd()
const require = createRequire(import.meta.url)
const electronPackageDir = join(root, 'node_modules', 'electron')
const electronPackage = require(join(electronPackageDir, 'package.json'))
const electronInstallScript = join(electronPackageDir, 'install.js')
const electronPathFile = join(electronPackageDir, 'path.txt')
const electronDistDir = join(electronPackageDir, 'dist')
const electronExecutable = process.platform === 'win32'
  ? 'electron.exe'
  : process.platform === 'darwin'
    ? join('Electron.app', 'Contents', 'MacOS', 'Electron')
    : 'electron'
const electronBinaryPath = join(electronDistDir, electronExecutable)
const electronCacheRoot = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'electron', 'Cache') : null
const electronCacheZipName = `electron-v${electronPackage.version}-${process.platform}-${process.arch}.zip`
const userDataDir = join(root, 'out', '.electron-user-data')

const run = async (command, args) => {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: {
        ...process.env
      },
      stdio: 'inherit'
    })

    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}${signal ? ` signal ${signal}` : ''}`))
    })
  })
}

const fileExists = async (path) => {
  try {
    await access(path, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

const walkForFile = async (dir, fileName) => {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = join(dir, entry.name)

    if (entry.isFile() && entry.name === fileName) {
      return entryPath
    }

    if (entry.isDirectory()) {
      const nested = await walkForFile(entryPath, fileName)
      if (nested) {
        return nested
      }
    }
  }

  return null
}

const getElectronCacheZip = async () => {
  if (!electronCacheRoot) {
    return null
  }

  if (!(await fileExists(electronCacheRoot))) {
    return null
  }

  return walkForFile(electronCacheRoot, electronCacheZipName)
}

const repairElectronFromCache = async () => {
  const cachedZip = await getElectronCacheZip()
  if (!cachedZip) {
    return false
  }

  console.warn(`Rebuilding Electron from local cache: ${cachedZip}`)

  await rm(electronDistDir, { recursive: true, force: true })
  await mkdir(electronDistDir, { recursive: true })

  if (process.platform === 'win32') {
    await run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Expand-Archive -LiteralPath '${cachedZip.replaceAll("'", "''")}' -DestinationPath '${electronDistDir.replaceAll("'", "''")}' -Force`
    ])
  } else {
    const extractZip = require('extract-zip')
    await extractZip(cachedZip, { dir: electronDistDir })
  }

  await writeFile(electronPathFile, electronExecutable)

  return true
}

const ensureElectronBinary = async () => {
  if (await fileExists(electronBinaryPath)) {
    return electronBinaryPath
  }

  if (await repairElectronFromCache() && (await fileExists(electronBinaryPath))) {
    return electronBinaryPath
  }

  console.warn('Electron binary is missing. Running the Electron installer to repair node_modules/electron...')
  await run(process.execPath, [electronInstallScript])

  if (!(await fileExists(electronBinaryPath))) {
    throw new Error(
      `Electron is still missing after repair attempts. Expected ${electronBinaryPath}. ` +
      'Re-run npm install, or delete node_modules/electron and install again if the package cache is corrupted.'
    )
  }

  if (!(await fileExists(electronPathFile))) {
    await writeFile(electronPathFile, electronExecutable)
  }

  return electronBinaryPath
}

const main = async () => {
  const electronPath = await ensureElectronBinary()

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
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
