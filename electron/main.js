const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const storage = require(require('path').resolve(__dirname, '..', '..', 'shared', 'storage.js'));

let mainWindow;
let watcher;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 720,
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function watchTodos() {
  const dir = path.dirname(storage.DATA_FILE);
  fs.mkdirSync(dir, { recursive: true });

  // Ensure file exists for watcher
  if (!fs.existsSync(storage.DATA_FILE)) {
    fs.writeFileSync(storage.DATA_FILE, JSON.stringify({ todos: [] }, null, 2) + '\n');
  }

  let debounceTimer;
  watcher = fs.watch(storage.DATA_FILE, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('todos-changed');
      }
    }, 75);
  });
}

app.whenReady().then(() => {
  createWindow();
  watchTodos();

  ipcMain.handle('get-todos', () => storage.readTodos());
  ipcMain.handle('get-end-day-message', () => storage.getEndDayMessage());
  ipcMain.handle('add-todo', (_event, text) => storage.addTodo(text));
  ipcMain.handle('mark-done', (_event, id) => storage.markDone(id));
  ipcMain.handle('mark-undone', (_event, id) => storage.markUndone(id));
  ipcMain.handle('delete-todo', (_event, id) => storage.deleteTodo(id));
});

app.on('window-all-closed', () => {
  if (watcher) watcher.close();
  app.quit();
});
