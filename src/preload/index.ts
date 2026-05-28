import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronApi', {
  openPdf: () => ipcRenderer.invoke('dialog:openPdf') as Promise<string | null>,
  readPdf: (filePath: string) => ipcRenderer.invoke('pdf:readFile', filePath) as Promise<ArrayBuffer>
})
