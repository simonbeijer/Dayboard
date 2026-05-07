const fs = require('fs');
const path = require('path');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const storage = require('../shared/storage.js');

const RESOURCE_URI = 'dayboard://todos';

const server = new McpServer({
  name: 'dayboard',
  version: '1.0.0',
});

server.tool(
  'add_todo',
  'Lägg till en uppgift i användarens dagslista. Anropas när användaren ber om att skapa, planera eller lägga till något att göra idag. Returnerar todons fulla id, som kan användas av mark_done, mark_undone eller delete_todo. För flera uppgifter: anropa en gång per uppgift — skicka inte flera i en kommaseparerad sträng.',
  { text: z.string().min(1).describe('Texten för en enskild uppgift, fri text på svenska') },
  async ({ text }) => {
    const todo = storage.addTodo(text);
    return {
      content: [
        {
          type: 'text',
          text: `Tillagd: "${todo.text}" (id: ${todo.id})`,
        },
      ],
    };
  }
);

server.tool(
  'list_todos',
  'Hämta användarens aktuella todos. Använd för att se status på todo samt tidpunk, hitta id:n innan mark_done/mark_undone/delete_todo, eller svara på frågor som "vad har jag kvar?". Returnerar en kompakt rad per uppgift: [ ] eller [x], 8-teckens id-prefix, och text. Filter "pending" = öppna, "done" = klara, "all" = båda (default).',
  {
    filter: z
      .enum(['all', 'pending', 'done'])
      .optional()
      .describe('Vilka todos att lista. Default: all'),
  },
  async ({ filter }) => {
    const todos = storage.listTodos(filter || 'all');
    const now = new Date().toLocaleString('sv-SE');
    const header = `Current time: ${now}\n---\n`;
    if (todos.length === 0) {
      const empty =
        filter === 'pending'
          ? 'Inga öppna uppgifter.'
          : filter === 'done'
            ? 'Inga klara uppgifter.'
            : 'Inga uppgifter alls.';
      return { content: [{ type: 'text', text: empty }] };
    }
    const lines = todos.map(
      (t) => `${t.done ? '[x]' : '[ ]'} ${t.id.slice(0, 8)}  ${t.text}`
    );
    return { content: [{ type: 'text', text: header + (todos.length === 0 ? empty : lines.join('\n')) }] };
  }
);

server.tool(
  'mark_done',
  'Markera en uppgift som klar. Den hamnar i "Klart"-sektionen i appen. Hämta id från list_todos eller från svaret på add_todo. Använd full id eller minst 8 teckens prefix.',
  { id: z.string().min(8).describe('Todo-id (full eller minst 8 tecken). Hämta via list_todos.') },
  async ({ id }) => {
    const todo = storage.markDone(id);
    if (!todo) {
      return {
        content: [
          {
            type: 'text',
            text: `Ingen uppgift hittades med id "${id}". Anropa list_todos för att se aktuella id:n.`,
          },
        ],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: `Klar: "${todo.text}" (id: ${todo.id})` }] };
  }
);

server.tool(
  'mark_undone',
  'Återöppna en uppgift som tidigare markerats klar. Flyttar den från "Klart" tillbaka till "Att göra". Hämta id från list_todos.',
  { id: z.string().min(8).describe('Todo-id (full eller minst 8 tecken). Hämta via list_todos.') },
  async ({ id }) => {
    const todo = storage.markUndone(id);
    if (!todo) {
      return {
        content: [
          {
            type: 'text',
            text: `Ingen uppgift hittades med id "${id}". Anropa list_todos för att se aktuella id:n.`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: `Återöppnad: "${todo.text}" (id: ${todo.id})` }],
    };
  }
);

server.tool(
  'delete_todo',
  'RADERAR en uppgift permanent. Det går inte att ångra. Använd endast när användaren explicit ber om att ta bort något. Vid tvekan, anropa list_todos och fråga användaren först. Hämta id via list_todos eller från add_todo.',
  { id: z.string().min(8).describe('Todo-id (full eller minst 8 tecken). Hämta via list_todos.') },
  async ({ id }) => {
    const todo = storage.deleteTodo(id);
    if (!todo) {
      return {
        content: [
          {
            type: 'text',
            text: `Ingen uppgift hittades med id "${id}". Anropa list_todos för att se aktuella id:n.`,
          },
        ],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: `Raderad: "${todo.text}" (id: ${todo.id})` }] };
  }
);

server.tool(
  'end_day',
  'Avslutar dagen: RADERAR alla todos permanent och visar ett avslutsmeddelande i appen tills användaren skriver något nytt. Använd endast när användaren explicit säger att dagen är slut (t.ex. "stäng av dagen", "avsluta dagen", "jag är klar för idag"). Be om bekräftelse innan du anropar om det är minsta tvivel — alla uppgifter, både klara och öppna, försvinner.',
  {
    message: z
      .string()
      .min(1)
      .describe('Kort, peppande avslutsmeddelande som visas i appen, t.ex. "Bra jobbat idag!"'),
  },
  async ({ message }) => {
    storage.endDay(message);
    return {
      content: [
        {
          type: 'text',
          text: `Dagen avslutad. Alla uppgifter raderade. Meddelande som visas i appen: "${message}"`,
        },
      ],
    };
  }
);

server.resource(
  'todos',
  RESOURCE_URI,
  {
    description:
      'Aktuell todo-lista (live). Innehåller alla todos och eventuellt slutmeddelande för dagen.',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            todos: storage.readTodos(),
            endDayMessage: storage.getEndDayMessage(),
          },
          null,
          2
        ),
      },
    ],
  })
);

function watchAndNotify() {
  const dir = path.dirname(storage.DATA_FILE);
  const fileName = path.basename(storage.DATA_FILE);
  fs.mkdirSync(dir, { recursive: true });

  let watcher;
  let debounceTimer;

  const fire = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        server.server.sendResourceUpdated({ uri: RESOURCE_URI });
        server.server.sendResourceListChanged();
      } catch (_) { }
    }, 75);
  };

  const attach = () => {
    if (watcher) {
      try { watcher.close(); } catch (_) { }
      watcher = null;
    }
    try {
      watcher = fs.watch(dir, (_eventType, changed) => {
        if (!changed || changed === fileName) fire();
      });
      watcher.on('error', () => setTimeout(attach, 200));
    } catch (_) {
      setTimeout(attach, 500);
    }
  };

  attach();
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  watchAndNotify();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
