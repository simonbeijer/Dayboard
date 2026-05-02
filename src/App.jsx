import React, { useState, useEffect, useRef, useMemo } from 'react';

const dateFormatter = new Intl.DateTimeFormat('sv-SE', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="todo-check-mark" aria-hidden="true">
      <path
        d="M3.5 8.5l3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={`todo-item${todo.done ? ' done' : ''}`}>
      <label className="todo-check">
        <input
          type="checkbox"
          checked={todo.done}
          onChange={() => onToggle(todo)}
          className="todo-check-input"
        />
        <span className="todo-check-box" aria-hidden="true">
          <CheckIcon />
        </span>
      </label>
      <span className="todo-text">{todo.text}</span>
      <button
        className="todo-delete"
        onClick={() => onDelete(todo)}
        aria-label="Radera"
        type="button"
      >
        ×
      </button>
    </li>
  );
}

export default function App() {
  const [todos, setTodos] = useState([]);
  const [endDayMessage, setEndDayMessage] = useState(null);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const today = useMemo(() => dateFormatter.format(new Date()), []);

  async function loadData() {
    const data = await window.api.getTodos();
    const message = await window.api.getEndDayMessage();
    setTodos(data);
    setEndDayMessage(message);
  }

  useEffect(() => {
    loadData();
    const cleanup = window.api.onTodosChanged(() => loadData());
    return cleanup;
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    await window.api.addTodo(text);
    await loadData();
    inputRef.current?.focus();
  }

  async function handleToggle(todo) {
    if (todo.done) {
      await window.api.markUndone(todo.id);
    } else {
      await window.api.markDone(todo.id);
    }
    await loadData();
  }

  async function handleDelete(todo) {
    await window.api.deleteTodo(todo.id);
    await loadData();
  }

  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const showCount = !endDayMessage && todos.length > 0 && pending.length > 0;
  const countLabel = pending.length === 1 ? 'uppgift kvar' : 'uppgifter kvar';

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true" />

      <header className="titlebar-drag titlebar">
        <div className="brand">
          <h1 className="brand-name">Dayboard</h1>
          <p className="brand-date">{today}</p>
        </div>
        {showCount && (
          <div className="count-block" aria-live="polite">
            <span className="count-num">{pending.length}</span>
            <span className="count-label">{countLabel}</span>
          </div>
        )}
      </header>

      <main className="main">
        <form className="add-form" onSubmit={handleAdd}>
          <span className="add-icon" aria-hidden="true">+</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Lägg till en uppgift..."
            className="add-input"
          />
        </form>

        {endDayMessage ? (
          <div className="end-day-view">
            <p className="end-day-message">{endDayMessage}</p>
            <p className="end-day-sub">Skriv något ovan för att börja en ny dag</p>
          </div>
        ) : todos.length === 0 ? (
          <div className="empty">
            <p className="empty-title">Inga uppgifter än.</p>
            <p className="empty-sub">
              Lägg till något eller be Claude fylla din lista
            </p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section className="list-section list-section-pending">
                <h2 className="section-label">
                  <span className="section-dot" aria-hidden="true" />
                  Att göra
                </h2>
                <ul className="todo-list">
                  {pending.map((t) => (
                    <TodoItem
                      key={t.id}
                      todo={t}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              </section>
            )}

            {done.length > 0 && (
              <section className="list-section list-section-done">
                <h2 className="section-label">
                  <span className="section-dot" aria-hidden="true" />
                  Klart
                </h2>
                <ul className="todo-list">
                  {done.map((t) => (
                    <TodoItem
                      key={t.id}
                      todo={t}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>

      {todos.length > 0 && (
        <footer className="footer">
          <span className="footer-num">{pending.length}</span>
          <span>kvar</span>
          <span className="footer-dot">·</span>
          <span className="footer-num">{todos.length}</span>
          <span>totalt</span>
        </footer>
      )}
    </div>
  );
}
