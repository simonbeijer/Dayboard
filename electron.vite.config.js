const { defineConfig } = require('electron-vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

module.exports = defineConfig({
  main: {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'electron/main.js'),
      },
      rollupOptions: {
        external: ['electron'],
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'electron/preload.js'),
      },
      rollupOptions: {
        external: ['electron'],
      },
    },
  },
  renderer: {
    plugins: [react()],
    root: '.',
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
  },
});
