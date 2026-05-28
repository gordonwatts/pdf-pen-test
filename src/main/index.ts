import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'

console.log('main process starting')

const isDev = !app.isPackaged
const __dirname = dirname(fileURLToPath(import.meta.url))
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    title: 'Indico Pen Spike',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL ?? process.env.ELECTRON_RENDERER_URL

  if (isDev && devUrl) {
    void mainWindow.loadURL(devUrl)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('did-fail-load', errorCode, errorDescription, validatedURL)
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('renderer loaded')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  console.log('app ready')
  ipcMain.handle('dialog:openPdf', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open PDF',
      properties: ['openFile'],
      filters: [{ name: 'PDF files', extensions: ['pdf'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('pdf:readFile', async (_event, filePath: string) => {
    const file = await readFile(filePath)
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  console.log('window-all-closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
