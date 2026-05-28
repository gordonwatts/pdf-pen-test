import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { build as viteBuild } from 'vite'

const root = process.cwd()

await mkdir(resolve(root, 'out'), { recursive: true })

await new Promise((resolvePromise, rejectPromise) => {
  const tscPath = resolve(root, 'node_modules/typescript/bin/tsc')
  const child = spawn(process.execPath, [tscPath, '-p', 'tsconfig.runtime.json'], {
    cwd: root,
    stdio: 'inherit'
  })

  child.on('exit', (code) => {
    if (code === 0) {
      resolvePromise()
      return
    }

    rejectPromise(new Error(`TypeScript emit failed with exit code ${code ?? 'unknown'}`))
  })
})

await viteBuild({
  base: './',
  root: root,
  plugins: [react()],
  build: {
    outDir: resolve(root, 'out/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, 'index.html')
    }
  }
})

const htmlPath = resolve(root, 'out/renderer/index.html')
const html = await readFile(htmlPath, 'utf8')
await writeFile(
  htmlPath,
  html.replaceAll('src="/assets/', 'src="./assets/').replaceAll('href="/assets/', 'href="./assets/')
)
