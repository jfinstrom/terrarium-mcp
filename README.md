# Terrarium MCP

**A grounded development environment for AI-assisted FreePBX module work.**

Terrarium MCP is a [Model Context Protocol](https://modelcontextprotocol.io) server that provides the environment, context, and dependencies your coding assistant needs for FreePBX® module development.

It packages curated documentation, topic dependencies, and optional source repositories so module work can stay grounded in the actual framework.

It is a community reference tool. It is **not** official software or official documentation from Sangoma or the FreePBX project.

**Author:** [James Finstrom](https://github.com/jfinstrom)

## Donations

I do not accept donations, sponsorships, or direct payment for this project.

If you would like to support me indirectly, take a look at [Clearly IP](https://www.clearlyip.com/) or [14IP](https://www.14ip.com/). They do **not** endorse, sponsor, or support this project directly, but my paycheck from them pays my bills and supports my family. Their continued success benefits me personally.

---

## What this is (and is not)

| Terrarium MCP **is** | Terrarium MCP **is not** |
|-----------------|---------------------|
| A dev-assist MCP server you run locally | An official Sangoma or FreePBX product |
| Grounded context for module authors | A replacement for the wiki or forums |
| Free software under AGPL-3.0 | A proprietary knowledge base |
| Fair-use descriptive reference to a trademarked ecosystem | Endorsed or sponsored by Sangoma or the FreePBX project |

This repository is intended to be practical, unofficial reference material.

### Why "Terrarium"?

A terrarium holds the environment and dependencies needed to support a living system. Here, the name reflects the goal: provide the context, docs, and source references an AI assistant needs to work reliably on FreePBX modules.

We do not ship frogs. We ship habitat.

---

## Quick start

```bash
git clone https://github.com/jfinstrom/terrarium-mcp.git
cd terrarium-mcp
npm install
npm run build
```

### Connect to your MCP client (stdio)

```json
{
  "mcpServers": {
    "terrarium-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/terrarium-mcp/dist/index.js"]
    }
  }
}
```

- **VS Code / GitHub Copilot:** add the same server entry to your workspace or user MCP configuration so Copilot Chat can discover it.

```json
{
  "servers": {
    "terrarium-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/terrarium-mcp/dist/index.js"]
    }
  }
}
```

Save this in `.vscode/mcp.json` for the current workspace, or in your user MCP config if you want it available everywhere in VS Code.

- **Cursor:** Settings → MCP, or `~/.cursor/mcp.json`
- **Claude Desktop:** `%APPDATA%\Claude\claude_desktop_config.json` (Windows) / `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

See `examples/` for starter configs.

### Optional: clone upstream source repos

For `search_sources` and `read_source_file` tools:

```bash
./scripts/clone-sources.sh      # Linux/macOS
.\scripts\clone-sources.ps1     # Windows
```

Sources are large and gitignored by default. The 48 context documents work fine without them.

### Optional: HTTP mode

```bash
npm run dev:http
# http://localhost:3100/sse  (MCP)
# http://localhost:3100/health
```

---

## What you get

| Layer | Contents |
|-------|----------|
| **Context** | 48 markdown topics in `context/` covering bootstrap, BMO, hooks, dialplan, API, packaging, and more |
| **Manifest** | `manifest/topics.json` with tiers, dependencies, and the topic index |
| **MCP server** | Tools, resources, and prompts for AI clients |
| **Sources** (optional) | Shallow clones of public upstream repos for code search |

### MCP tools

| Tool | Purpose |
|------|---------|
| `list_topics` | Browse topics by tier or keyword |
| `get_topic` | Full markdown for a topic |
| `search_context` | Search all 48 documents |
| `suggest_learning_path` | Topic order for a task |
| `search_sources` | Search cloned `sources/` |
| `read_source_file` | Read a source file with line numbers |

### MCP prompts

- `new-freepbx-module` - scaffold workflow
- `debug-freepbx-module` - structured debugging workflow

---

## Topic tiers

| Tier | Focus |
|------|-------|
| 1 | Bootstrap, BMO architecture, module lifecycle |
| 2 | `module.xml`, BMO class, GUI, database |
| 3 | AJAX, hooks, dialplan, feature codes |
| 4 | `fwconsole`, reload, backup, signing |
| 5 | UCP, GraphQL, REST, FastAGI, testing |
| 6 | Naming, style, packaging, contribution |


---

## License

**GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**

This is the most restrictive widely-recognized *free* software license. In plain English:

- **Use it.** Learn from it and integrate it into your development workflow.
- **Share improvements.** If you distribute modified code or context, you must provide source under the same license.
- **Network use counts.** If you run a modified version as a network service users interact with, AGPL obligations apply.
- **Do not relicense it as proprietary software.** If you distribute or commercialize derivatives, you must comply with the AGPL.

The context documents and server code are both AGPL-3.0-or-later. Cloned third-party sources in `sources/` remain under their original licenses.

Full license text: [LICENSE](LICENSE)

---

## Trademarks

**FreePBX®** is a registered trademark of **Sangoma Technologies**.

All other trademarks, service marks, product names, and company names mentioned in this project are the property of their respective owners. References to FreePBX, Sangoma, Asterisk, or related marks are **descriptive and nominative fair use only**.

This project is **not affiliated with, endorsed by, sponsored by, or approved by** Sangoma Technologies or the FreePBX project in any official capacity.

---

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Sangoma Technologies. Any references to FreePBX, Sangoma, or related trademarks are for descriptive and fair use purposes only. No endorsement or support should be inferred.

**This project is also not supported, sponsored, or endorsed by my employer or any other organization I am or have been associated with.** It is a personal side project, not a corporate deliverable.

**USE AT YOUR OWN RISK.** Terrarium MCP is provided as-is. It may be wrong, incomplete, or outdated as upstream changes.

Verify behavior against upstream code and documentation before using it in production telephony systems.

---

## Repository layout

```
terrarium-mcp/
├── context/           # 48 grounded topic documents (AGPL-3.0)
├── manifest/          # Machine-readable topic catalog
├── src/               # MCP server source (AGPL-3.0)
├── dist/              # Compiled server (after npm run build)
├── scripts/           # Optional source clone helpers
├── examples/          # MCP client config snippets
├── SOURCE_AUDIT.md    # Verification log
└── LICENSE            # AGPL-3.0
```

---

## Development

```bash
npm run dev          # stdio via tsx
npm run dev:http     # HTTP/SSE on :3100
npm run build        # compile to dist/
npm test             # Integration tests (spawn real server, MCP protocol)
```

### Integration tests (not unit tests)

`npm test` does **not** import server code in-process. It:

1. **Builds** `dist/index.js`
2. **Spawns** the server as a separate OS process (`node dist/index.js`)
3. **Connects** a real MCP `Client` over the wire
4. **Calls** tools, reads resources, and resolves prompts against the live server

| Suite | Transport | Mirrors |
|-------|-----------|---------|
| `test/integration/stdio-server.test.ts` | stdio | Cursor, Claude Desktop |
| `test/integration/http-server.test.ts` | HTTP + SSE | Hosted / remote deployment |

Shared scenarios in `test/integration/scenarios.ts` run against both transports so behavior stays consistent.

Tests run in CI via `.github/workflows/test.yml` on push/PR to `main`.

---

## Contributing

1. Ground claims in public source where possible.
2. Update `SOURCE_AUDIT.md` when you verify or correct something.
3. Keep the unofficial posture and do not brand this as official anything.
4. `npm run build` before you push; stdio MCP servers must not chatter on stdout.

Pull requests welcome.