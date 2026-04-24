const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getTodos: () => ipcRenderer.invoke('get-todos'),
  addTodo: (text) => ipcRenderer.invoke('add-todo', text),
  markDone: (id) => ipcRenderer.invoke('mark-done', id),
  markUndone: (id) => ipcRenderer.invoke('mark-undone', id),
  deleteTodo: (id) => ipcRenderer.invoke('delete-todo', id),
  onTodosChanged: (callback) => {
    ipcRenderer.on('todos-changed', callback);
    return () => ipcRenderer.removeListener('todos-changed', callback);
  },
});
