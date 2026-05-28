/// <reference types="vite/client" />

interface Window {
  electronApi: {
    openPdf: () => Promise<string | null>
    readPdf: (filePath: string) => Promise<ArrayBuffer>
  }
}
