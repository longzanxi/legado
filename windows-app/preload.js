const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  selectBookFile: () => ipcRenderer.invoke('select-book-file'),
  selectSourceFile: () => ipcRenderer.invoke('select-source-file'),
  
  // App operations
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  
  // Event listeners
  onBooksImported: (callback) => ipcRenderer.on('books-imported', callback),
  onSourcesImported: (callback) => ipcRenderer.on('sources-imported', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Expose a limited API for the renderer
contextBridge.exposeInMainWorld('legado', {
  platform: 'windows',
  isElectron: true,
  version: process.versions.electron
});