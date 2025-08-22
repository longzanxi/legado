const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

// Import backend services
const BookService = require('./backend/services/book-service');
const SourceService = require('./backend/services/source-service');
const ConfigService = require('./backend/services/config-service');
const WebService = require('./backend/services/web-service');

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--version')) {
  const packageJson = require('./package.json');
  console.log(`Legado Windows v${packageJson.version}`);
  process.exit(0);
}

if (args.includes('-h') || args.includes('--help')) {
  const packageJson = require('./package.json');
  console.log(`Legado Windows v${packageJson.version}`);
  console.log('');
  console.log('Usage: legado [options]');
  console.log('');
  console.log('Options:');
  console.log('  --version    Show version number');
  console.log('  -h, --help   Show help');
  console.log('  --dev        Run in development mode');
  console.log('');
  console.log('Legado is an e-book reader for Windows.');
  process.exit(0);
}

class LegadoApp {
  constructor() {
    this.mainWindow = null;
    this.backendServer = null;
    this.isDev = process.argv.includes('--dev');
    this.port = 8080;
  }

  async initialize() {
    // Initialize app data directory
    this.initializeDataDirectory();
    
    // Start backend server
    await this.startBackendServer();
    
    // Create main window
    this.createMainWindow();
    
    // Setup menu
    this.setupMenu();
    
    // Setup IPC handlers
    this.setupIPC();
  }

  initializeDataDirectory() {
    const userDataPath = app.getPath('userData');
    const dataPath = path.join(userDataPath, 'legado-data');
    
    // Create necessary directories
    const dirs = [
      dataPath,
      path.join(dataPath, 'books'),
      path.join(dataPath, 'sources'),
      path.join(dataPath, 'cache'),
      path.join(dataPath, 'config'),
      path.join(dataPath, 'logs')
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Initialize services with data path
    this.dataPath = dataPath;
    this.bookService = new BookService(dataPath);
    this.sourceService = new SourceService(dataPath);
    this.configService = new ConfigService(dataPath);
    this.webService = new WebService(dataPath);
  }

  async startBackendServer() {
    const app = express();
    
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Static files for the frontend
    app.use(express.static(path.join(__dirname, 'renderer')));
    
    // API routes
    this.setupAPIRoutes(app);
    
    // Start server
    return new Promise((resolve) => {
      this.backendServer = app.listen(this.port, 'localhost', () => {
        console.log(`Backend server running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  setupAPIRoutes(app) {
    // Book management APIs
    app.get('/api/books', async (req, res) => {
      try {
        const books = await this.bookService.getAllBooks();
        res.json({ isSuccess: true, data: books });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    app.post('/api/saveBook', async (req, res) => {
      try {
        const book = await this.bookService.saveBook(req.body);
        res.json({ isSuccess: true, data: book });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    app.delete('/api/deleteBook/:bookUrl', async (req, res) => {
      try {
        await this.bookService.deleteBook(req.params.bookUrl);
        res.json({ isSuccess: true });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    // Source management APIs
    app.get('/api/getSources', async (req, res) => {
      try {
        const sources = await this.sourceService.getAllSources();
        res.json({ isSuccess: true, data: sources });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    app.post('/api/saveSource', async (req, res) => {
      try {
        const source = await this.sourceService.saveSource(req.body);
        res.json({ isSuccess: true, data: source });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    app.post('/api/saveSources', async (req, res) => {
      try {
        const sources = await this.sourceService.saveSources(req.body);
        res.json({ isSuccess: true, data: sources });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    app.delete('/api/deleteSource/:sourceUrl', async (req, res) => {
      try {
        await this.sourceService.deleteSource(req.params.sourceUrl);
        res.json({ isSuccess: true });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    // Book content APIs
    app.get('/api/getBookInfo', async (req, res) => {
      try {
        const bookInfo = await this.bookService.getBookInfo(req.query.url, req.query.sourceUrl);
        res.json({ isSuccess: true, data: bookInfo });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    app.get('/api/getChapterList', async (req, res) => {
      try {
        const chapters = await this.bookService.getChapterList(req.query.url, req.query.sourceUrl);
        res.json({ isSuccess: true, data: chapters });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    app.get('/api/getBookContent', async (req, res) => {
      try {
        const content = await this.bookService.getBookContent(req.query.url, req.query.sourceUrl);
        res.json({ isSuccess: true, data: content });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    // Search APIs
    app.post('/api/search', async (req, res) => {
      try {
        const results = await this.bookService.search(req.body.key, req.body.source);
        res.json({ isSuccess: true, data: results });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    // Config APIs
    app.get('/api/getReadConfig', async (req, res) => {
      try {
        const config = await this.configService.getReadConfig();
        res.json({ isSuccess: true, data: JSON.stringify(config) });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    app.post('/api/saveReadConfig', async (req, res) => {
      try {
        await this.configService.saveReadConfig(req.body);
        res.json({ isSuccess: true });
      } catch (error) {
        res.json({ isSuccess: false, errorMsg: error.message });
      }
    });

    // Default route - serve main app
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'renderer', 'index.html'));
    });
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        sandbox: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, 'assets', 'icon.png'),
      title: 'Legado - 阅读3.0',
      show: false
    });

    // Load the frontend
    this.mainWindow.loadURL(`http://localhost:${this.port}`);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Open external links in browser
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Development tools
    if (this.isDev) {
      this.mainWindow.webContents.openDevTools();
    }
  }

  setupMenu() {
    const template = [
      {
        label: '文件',
        submenu: [
          {
            label: '导入书籍',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.importBooks()
          },
          {
            label: '导入书源',
            click: () => this.importSources()
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: '查看',
        submenu: [
          { role: 'reload', label: '刷新' },
          { role: 'forceReload', label: '强制刷新' },
          { role: 'toggleDevTools', label: '开发者工具' },
          { type: 'separator' },
          { role: 'resetZoom', label: '重置缩放' },
          { role: 'zoomIn', label: '放大' },
          { role: 'zoomOut', label: '缩小' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: '全屏' }
        ]
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '关于',
            click: () => this.showAbout()
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIPC() {
    // Handle file operations
    ipcMain.handle('select-book-file', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: '电子书', extensions: ['epub', 'txt', 'pdf'] },
          { name: 'EPUB', extensions: ['epub'] },
          { name: 'TXT', extensions: ['txt'] },
          { name: 'PDF', extensions: ['pdf'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      return result;
    });

    ipcMain.handle('select-source-file', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile'],
        filters: [
          { name: 'JSON', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });
      return result;
    });

    // Handle app operations
    ipcMain.handle('get-app-version', () => app.getVersion());
    ipcMain.handle('get-data-path', () => this.dataPath);
  }

  async importBooks() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '电子书', extensions: ['epub', 'txt', 'pdf'] },
        { name: 'EPUB', extensions: ['epub'] },
        { name: 'TXT', extensions: ['txt'] },
        { name: 'PDF', extensions: ['pdf'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        for (const filePath of result.filePaths) {
          await this.bookService.importLocalBook(filePath);
        }
        this.mainWindow.webContents.send('books-imported', result.filePaths.length);
      } catch (error) {
        dialog.showErrorBox('导入失败', error.message);
      }
    }
  }

  async importSources() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'JSON', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const sources = await this.sourceService.importSources(result.filePaths[0]);
        this.mainWindow.webContents.send('sources-imported', sources.length);
      } catch (error) {
        dialog.showErrorBox('导入失败', error.message);
      }
    }
  }

  showAbout() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: '关于 Legado',
      message: 'Legado (阅读3.0) - Windows版',
      detail: `版本: ${app.getVersion()}\n\n开源的电子书阅读器，支持自定义书源。\n\n基于原Android版本移植到Windows平台。`,
      buttons: ['确定']
    });
  }

  async shutdown() {
    if (this.backendServer) {
      this.backendServer.close();
    }
  }
}

// App initialization
const legadoApp = new LegadoApp();

app.whenReady().then(() => {
  legadoApp.initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    legadoApp.createMainWindow();
  }
});

app.on('before-quit', async () => {
  await legadoApp.shutdown();
});

module.exports = LegadoApp;