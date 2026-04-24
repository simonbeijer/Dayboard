import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  async function loadTodos() {
    const data = await window.api.getTodos();
    setTodos(data);
  }

  useEffect(() => {
    loadTodos();
    const cleanup = window.api.onTodosChanged(() => loadTodos());
    return cleanup;
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    await window.api.addTodo(text);
    await loadTodos();
    inputRef.current?.focus();
  }

  async function handleToggle(todo) {
    if (todo.done) {
      await window.api.markUndone(todo.id);
    } else {
      await window.api.markDone(todo.id);
    }
    await loadTodos();
  }

  async function handleDelete(todo) {
    await window.api.deleteTodo(todo.id);
    await loadTodos();
  }

  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <div className="app">
      <header className="titlebar-drag">
        <h1>dayboard</h1>
      </header>
      <main>
        <form className="add-form" onSubmit={handleAdd}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Lägg till en todo..."
            className="add-input"
          />
        </form>
        {todos.length === 0 && (
          <p className="empty">Inga todos än — lägg till något eller be Claude fylla din lista</p>
        )}
        <ul className="todo-list">
          {pending.map((t) => (
            <li key={t.id} className="todo-item">
              <input
                type="checkbox"
                checked={false}
                onChange={() => handleToggle(t)}
                className="todo-checkbox"
              />
              <span className="todo-text">{t.text}</span>
              <button className="todo-delete" onClick={() => handleDelete(t)}>×</button>
            </li>
          ))}
          {done.length > 0 && pending.length > 0 && <li className="separator" />}
          {done.map((t) => (
            <li key={t.id} className="todo-item done">
              <input
                type="checkbox"
                checked={true}
                onChange={() => handleToggle(t)}
                className="todo-checkbox"
              />
              <span className="todo-text">{t.text}</span>
              <button className="todo-delete" onClick={() => handleDelete(t)}>×</button>
            </li>
          ))}
        </ul>
      </main>
      {todos.length > 0 && (
        <footer className="footer">
          {pending.length} kvar &middot; {todos.length} totalt
        </footer>
      )}
    </div>
  );
}
