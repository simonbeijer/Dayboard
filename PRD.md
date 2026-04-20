# PRD — dayboard

**Tagline:** A Claude-powered morning todo. Chat your day in, tick it off, let Claude see the progress.

En desktop-app (Electron + React) med MCP-server. Jag använder Claude Desktop som morgonplanerare: på morgonen chattar jag om dagen, Claude fyller min todo-lista via MCP, appen visar den, jag bockar av, Claude ser resultatet när jag frågar.

## Kärnflöde

1. Jag öppnar Claude Desktop på morgonen och berättar vad jag ska göra idag
2. Claude anropar `add_todo` flera gånger via MCP → todos skrivs till disk
3. Min Electron-app (öppen bredvid) uppdateras live och visar listan
4. Under dagen bockar jag av i appen
5. När jag frågar Claude "vad har jag kvar?" ser den korrekt status

## Princip

**Väldigt simpelt men stabilt.** Hellre fem saker som fungerar klockrent än femton som skakar.

## V1 — funktionalitet

### Electron-appen
- Lista alla todos. Icke-klara överst, avbockade undertill
- Checkbox för att bocka av / bocka ur (togglar)
- × för att radera
- Inputfält + Enter för att lägga till manuellt
- Live-uppdatering: när MCP-servern ändrar data uppdateras listan inom ~100ms utan att jag behöver klicka

### MCP-server
Fem verktyg exponerade till Claude Desktop:

- `add_todo(text)` — lägger till, returnerar id
- `list_todos(filter?)` — listar; filter kan vara `all` / `pending` / `done` (default `all`)
- `mark_done(id)` — bockar av; accepterar full id eller prefix (min 8 tecken)
- `mark_undone(id)` — återöppnar
- `delete_todo(id)` — raderar permanent

### Delad state
Båda processerna läser/skriver samma JSON-fil. När en skriver måste den andra märka det.

## Icke-mål (explicit UTE i v1)

Dessa kommer i senare iterationer:

- Deadlines / förfallodatum
- Taggar, kategorier eller flera listor
- Notifikationer
- Historik / dagsvy
- Redigera todo-text (endast add/delete)
- Konton, molnsynk, auth
- Packaging till `.app`
- TypeScript

**Designbeslut:** det finns inget "idag"-koncept i datan. Om Claude gör morgonlistan anropar den bara `add_todo` 5 gånger. Alla öppna todos syns i appen oavsett när de skapades.

## Teknik-stack

| Lager | Val | Varför |
|---|---|---|
| Desktop | Electron | Känd, bra på macOS |
| Renderer | React via Vite | Lätt att utöka senare |
| Språk | Vanilla JS/JSX | Minst boilerplate. TS kan läggas på senare |
| Storage | JSON-fil + atomic writes (tmp + rename) | Inga native modules. Enklast möjligt |
| Reaktivitet | `fs.watch` i main → IPC → React-state | Pålitligt för single-user |
| MCP SDK | `@modelcontextprotocol/sdk` (Node) | Officiell |
| Validering | `zod` | Krav från SDK |

## Datamodell

Fil: `~/Library/Application Support/dayboard/todos.json`

```json
{
  "todos": [
    {
      "id": "uuid",
      "text": "Handla mjölk",
      "done": false,
      "createdAt": "2026-04-20T08:00:00Z",
      "completedAt": null
    }
  ]
}
```

## Arkitektur

```
┌──────────────────┐    stdio     ┌──────────────────┐
│  Claude Desktop  │◀────────────▶│   MCP Server     │
└──────────────────┘              │   (node proc)    │
                                  └────────┬─────────┘
                                           │
                                      ┌────▼─────┐
                                      │todos.json│
                                      └────┬─────┘
                                           │
                                  ┌────────▼─────────┐
                                  │  Electron main   │
                                  │    (fs.watch)    │
                                  └────────┬─────────┘
                                           │ IPC
                                  ┌────────▼─────────┐
                                  │ React renderer   │
                                  └──────────────────┘
```

MCP-server och Electron main importerar **samma** `storage.js`-modul.

## Föreslagen filstruktur

```
dayboard/
├── package.json
├── vite.config.js
├── index.html                 ← Vite entry för renderer
├── electron/
│   ├── main.js
│   └── preload.js
├── src/                       ← React renderer
│   ├── main.jsx
│   ├── App.jsx
│   └── styles.css
├── shared/
│   └── storage.js             ← delad av både electron/ och mcp-server/
├── mcp-server/
│   └── server.js
├── PRD.md
└── README.md
```

## UI-spec

- macOS-känsla: `titleBarStyle: 'hiddenInset'`, systemfonter, stöd för light/dark
- Fönster: 520×720, resizable
- All text på svenska
- Tomt läge: "Inga todos än — lägg till något eller be Claude fylla din lista"
- Footer: "X kvar · Y totalt"

## Synkronisering — så ska det fungera

1. MCP-server skriver till `todos.json` (atomic: tmp + rename)
2. Electron main har `fs.watch` på filen
3. På ändring (debounce 75ms) skickar main `todos-changed` via IPC till renderer
4. React re-läser via preload-API och uppdaterar state

Samma i andra riktningen: när jag bockar av i appen skrivs till disk. MCP-serverns `list_todos` läser alltid från disk → alltid aktuellt.

## Setup

```bash
npm install
npm run dev         # Vite + Electron med HMR
```

**Claude Desktop-config:** `~/Library/Application Support/Claude/claude_desktop_config.json`

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

Starta om Claude Desktop helt (Cmd+Q) efter config-ändring.

**Om `node` inte hittas** (typiskt med nvm): kör `which node`, använd den fulla sökvägen som `command`.

## Acceptanskriterier — v1 är klar när…

- [ ] `npm run dev` startar appen, tom lista visas
- [ ] Kan lägga till todo via input → syns direkt
- [ ] Kan bocka av → hamnar under öppna
- [ ] Kan radera → försvinner
- [ ] Data finns kvar efter omstart
- [ ] Claude Desktop startar MCP-servern utan fel
- [ ] I Claude-chat: "lägg till tre todos: köpa kaffe, träning, maila Anna" → alla tre syns i Electron inom 1s
- [ ] Bocka av en i Electron, fråga Claude "vad har jag kvar?" → korrekt svar
- [ ] Säga till Claude "radera träning" → försvinner ur appen
