const { app, BrowserWindow, shell, session, Menu, globalShortcut } = require('electron');
const path = require('path');

const APP_URL = 'https://reqviem.vercel.app/';

// 🟢 OTIMIZAÇÃO: Desabilita hardware acceleration se causar problemas
app.disableHardwareAcceleration();

// 🟢 OTIMIZAÇÃO: Limita cache em memória
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Réquiem RPG',
    icon: path.join(__dirname, '../public/logo.png'),
    autoHideMenuBar: false,
    show: false, // 🟢 Mostra só quando estiver pronto (abre mais rápido)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  // 🟢 Mostra quando carregar
  win.once('ready-to-show', () => {
    win.show();
  });

  // 🟢 Menu simplificado
  const menu = Menu.buildFromTemplate([
    {
      label: 'Arquivo',
      submenu: [
        { label: 'Atualizar (F5)', accelerator: 'F5', click: () => win.webContents.reloadIgnoringCache() },
        { label: 'Limpar Cache', click: () => {
          session.defaultSession.clearCache();
          session.defaultSession.clearStorageData();
          win.webContents.reloadIgnoringCache();
        }},
        { type: 'separator' },
        { label: 'Tela Cheia (F11)', accelerator: 'F11', click: () => win.setFullScreen(!win.isFullScreen()) },
        { type: 'separator' },
        { label: 'Sair', click: () => app.quit() },
      ],
    },
    {
      label: 'Zoom',
      submenu: [
        { label: 'Aumentar', accelerator: 'CmdOrCtrl+Plus', click: () => win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.1) },
        { label: 'Diminuir', accelerator: 'CmdOrCtrl+-', click: () => win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.1) },
        { label: 'Resetar', accelerator: 'CmdOrCtrl+0', click: () => win.webContents.setZoomLevel(0) },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);

  // 🟢 Carrega o site
  win.loadURL(APP_URL, {
    userAgent: 'RéquiemRPG/1.0',
  });

  // 🟢 Abre links externos no navegador
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 🟢 Atalhos F11 e F5
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    }
    if (input.type === 'keyDown' && input.key === 'F5') {
      event.preventDefault();
      win.webContents.reloadIgnoringCache();
    }
  });

  // 🟢 Quando o site carregar, limpa cache de imagens antigas
  win.webContents.on('did-finish-load', () => {
    win.webContents.session.clearCache();
  });
}

app.whenReady().then(() => {
  // 🟢 Limpa cache antes de abrir (garante imagens atualizadas)
  session.defaultSession.clearCache();
  session.defaultSession.clearStorageData({
    storages: ['cookies', 'localstorage', 'cachestorage', 'indexdb'],
  });
  session.defaultSession.clearCodeCaches();

  // 🟢 Atalho global para atualizar
  globalShortcut.register('F5', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.webContents.reloadIgnoringCache();
  });

  createWindow();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});