const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),

  // ── AI ──────────────────────────────────────────────────────
  ai: {
    categorize: (transactions) => ipcRenderer.invoke('ai:categorize', transactions),
  },

  // ── Database ──────────────────────────────────────────────────
  db: {
    transactions: {
      list: (filters) => ipcRenderer.invoke('db:transactions:list', filters),
      insert: (rows) => ipcRenderer.invoke('db:transactions:insert', rows),
      update: (id, data) => ipcRenderer.invoke('db:transactions:update', id, data),
      delete: (id) => ipcRenderer.invoke('db:transactions:delete', id),
      deleteByMonth: (accountId, yearMonth) => ipcRenderer.invoke('db:transactions:deleteByMonth', accountId, yearMonth),
    },
    accounts: {
      list: () => ipcRenderer.invoke('db:accounts:list'),
      insert: (account) => ipcRenderer.invoke('db:accounts:insert', account),
      update: (id, data) => ipcRenderer.invoke('db:accounts:update', id, data),
      delete: (id) => ipcRenderer.invoke('db:accounts:delete', id),
    },
    creditCards: {
      list: () => ipcRenderer.invoke('db:creditCards:list'),
      insert: (card) => ipcRenderer.invoke('db:creditCards:insert', card),
      update: (id, data) => ipcRenderer.invoke('db:creditCards:update', id, data),
      delete: (id) => ipcRenderer.invoke('db:creditCards:delete', id),
      deleteByMonth: (creditCardId, monthYear) => ipcRenderer.invoke('db:creditCards:deleteByMonth', creditCardId, monthYear),
    },
  },
});

