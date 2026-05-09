# Dayboard

En delad todo-lista mellan dig och din AI. Du jobbar i appen, din LLM jobbar via MCP — båda ser samma sanning, hela tiden.

Berätta vad dagen ska innehålla, låt AI:n strukturera och fylla listan, bocka av i din egen takt. När du frågar *"vad har jag kvar?"* så vet den.

## Funktioner

- **MCP-integration** — Claude Desktop (eller annan MCP-klient) läser och skriver todos direkt
- **Live-sync** — ändringar i båda riktningar syns inom ~100ms
- **Native macOS** — Electron med dark mode och hidden-inset titlebar
- **Lokal lagring** — JSON-fil, ingen molnsynk, ingen auth

## Kom igång

Krav: Node.js v18+, npm.

```bash
git clone <repository-url>
cd dayboard
npm install
npm run dev
```

## Bygga app

Standalone `.app` + `.dmg` för macOS:

```bash
npm run build:mac
```

Output i `dist/`.

### Installera

Öppna `dist/Dayboard-1.0.0-arm64.dmg`, dra appen till `Applications`. 


## Koppla till Claude Desktop

Lägg till i `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dayboard": {
      "command": "node",
      "args": ["/absolut/sökväg/till/dayboard/mcp-server/server.js"]
    }
  }
}
```

Starta om Claude Desktop (Cmd+Q). Om `node` inte hittas (nvm-användare): kör `which node` och använd full sökväg som `command`.

## Koppla till Claude Code

```bash
claude mcp add dayboard node /absolut/sökväg/till/dayboard/mcp-server/server.js
claude mcp list
```

## MCP-verktyg

- `add_todo(text)` — lägger till todo
- `list_todos(filter)` — listar (`all` / `pending` / `done`)
- `mark_done(id)` — bockar av (full id eller prefix ≥8 tecken)
- `mark_undone(id)` — återöppnar
- `delete_todo(id)` — raderar
- `end_day(message)` — rensar brädet, visar avslutande meddelande

## Stack

- **Frontend:** React + Vite
- **Shell:** Electron
- **MCP-server:** Node + `@modelcontextprotocol/sdk` + `zod`
- **Storage:** lokal JSON (`~/Library/Application Support/dayboard/todos.json`)

Se [PRD.md](PRD.md) för full spec.
