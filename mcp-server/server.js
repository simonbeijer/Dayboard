const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const storage = require('../shared/storage.js');

const server = new McpServer({
  name: 'dayboard',
  version: '1.0.0',
});

server.tool(
  'add_todo',
  'Lägg till en ny todo',
  { text: z.string().describe('Texten för todon') },
  async ({ text }) => {
    const todo = storage.addTodo(text);
    return {
      content: [{ type: 'text', text: `Tillagd: "${todo.text}" (id: ${todo.id})` }],
    };
  }
);

server.tool(
  'list_todos',
  'Lista todos. Filter: all, pending, done',
  { filter: z.enum(['all', 'pending', 'done']).optional().describe('Filter (default: all)') },
  async ({ filter }) => {
    const todos = storage.listTodos(filter || 'all');
    if (todos.length === 0) {
      return { content: [{ type: 'text', text: 'Inga todos.' }] };
    }
    const lines = todos.map(
      (t) => `${t.done ? '✓' : '○'} ${t.text} [${t.id.slice(0, 8)}]`
    );
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

server.tool(
  'mark_done',
  'Markera en todo som klar',
  { id: z.string().min(8).describe('Todo-ID eller prefix (minst 8 tecken)') },
  async ({ id }) => {
    const todo = storage.markDone(id);
    if (!todo) return { content: [{ type: 'text', text: `Hittade ingen todo med id "${id}"` }] };
    return { content: [{ type: 'text', text: `Klar: "${todo.text}"` }] };
  }
);

server.tool(
  'mark_undone',
  'Återöppna en todo',
  { id: z.string().min(8).describe('Todo-ID eller prefix (minst 8 tecken)') },
  async ({ id }) => {
    const todo = storage.markUndone(id);
    if (!todo) return { content: [{ type: 'text', text: `Hittade ingen todo med id "${id}"` }] };
    return { content: [{ type: 'text', text: `Återöppnad: "${todo.text}"` }] };
  }
);

server.tool(
  'delete_todo',
  'Radera en todo permanent',
  { id: z.string().min(8).describe('Todo-ID eller prefix (minst 8 tecken)') },
  async ({ id }) => {
    const todo = storage.deleteTodo(id);
    if (!todo) return { content: [{ type: 'text', text: `Hittade ingen todo med id "${id}"` }] };
    return { content: [{ type: 'text', text: `Raderad: "${todo.text}"` }] };
  }
);

server.tool(
  'end_day',
  'Avsluta dagen. Rensar listan och visar ett meddelande.',
  { message: z.string().describe('Peppande avslutsmeddelande') },
  async ({ message }) => {
    storage.endDay(message);
    return {
      content: [{ type: 'text', text: `Dagen avslutad: "${message}"` }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
