const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(
  process.env.HOME,
  'Library',
  'Application Support',
  'dayboard'
);
const DATA_FILE = path.join(DATA_DIR, 'todos.json');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readTodos() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw).todos;
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function writeTodos(todos) {
  ensureDataDir();
  const tmp = DATA_FILE + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify({ todos }, null, 2) + '\n');
  fs.renameSync(tmp, DATA_FILE);
}

function addTodo(text) {
  const todos = readTodos();
  const todo = {
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  todos.push(todo);
  writeTodos(todos);
  return todo;
}

function listTodos(filter = 'all') {
  const todos = readTodos();
  if (filter === 'pending') return todos.filter((t) => !t.done);
  if (filter === 'done') return todos.filter((t) => t.done);
  return todos;
}

function findById(todos, id) {
  if (id.length < 8) return null;
  return todos.find((t) => t.id === id || t.id.startsWith(id)) || null;
}

function markDone(id) {
  const todos = readTodos();
  const todo = findById(todos, id);
  if (!todo) return null;
  todo.done = true;
  todo.completedAt = new Date().toISOString();
  writeTodos(todos);
  return todo;
}

function markUndone(id) {
  const todos = readTodos();
  const todo = findById(todos, id);
  if (!todo) return null;
  todo.done = false;
  todo.completedAt = null;
  writeTodos(todos);
  return todo;
}

function deleteTodo(id) {
  const todos = readTodos();
  const todo = findById(todos, id);
  if (!todo) return null;
  const filtered = todos.filter((t) => t.id !== todo.id);
  writeTodos(filtered);
  return todo;
}

module.exports = {
  DATA_FILE,
  readTodos,
  writeTodos,
  addTodo,
  listTodos,
  markDone,
  markUndone,
  deleteTodo,
};
