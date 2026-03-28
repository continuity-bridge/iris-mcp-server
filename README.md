# Iris MCP Server

**Multi-backend MCP gateway providing Google Drive write access, Notion, and more through a single MCP connector.**

## Overview

Iris solves the free-tier MCP connector limitation by acting as a gateway: users connect ONE custom connector (Iris) and get access to multiple backend services with full read/write capabilities.

### What Iris Provides

**Google Drive Backend:**
- ✅ `iris_drive_write` - Create or update files
- ✅ `iris_drive_read` - Read file contents
- ✅ `iris_drive_create_folder` - Create folder structures
- ✅ `iris_drive_list` - List files and folders
- ✅ `iris_drive_move` - Move or rename files
- ✅ `iris_drive_delete` - Delete files (with safety confirmation)

**Coming Soon:**
- Notion backend (read + write)
- Slack backend (send messages)
- Dropbox backend (read + write)

## Installation

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Project with Drive API enabled
- OAuth 2.0 credentials (Client ID and Secret)

### Setup

1. **Clone and install dependencies:**
```bash
git clone https://github.com/continuity-bridge/iris-mcp-server.git
cd iris-mcp-server
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Google OAuth credentials
```

3. **Build:**
```bash
npm run build
```

4. **Test locally:**
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://iris.uncletallest.productions/oauth/callback`
5. Copy Client ID and Client Secret to `.env`

### Environment Variables

See `.env.example` for all required configuration.

## Usage

### Multi-Instance System Integration (Example Use Case)

**Coordinating instance saves shared notes:**
```javascript
iris_drive_write({
  path: "coordination/shared-notes.md",
  content: "Instance A is handling task X, Instance B is tracking Y...",
  mode: "upsert"
})
```

**Health tracking instance saves wellness data:**
```javascript
iris_drive_write({
  path: "wellness/tracking/2026-03.md",
  content: "# March 2026 Health Log\n\n## Week 1\n- Energy: 7/10\n- Sleep: 8hrs avg\n...",
  mimeType: "text/markdown"
})
```

**Project tracking instance saves application data:**
```javascript
iris_drive_write({
  path: "projects/applications/applied-march.md",
  content: "| Company | Position | Applied | Status |\n|---------|----------|---------|--------|\n...",
  mode: "upsert"
})
```

### Tool Examples

**Create folder structure:**
```javascript
iris_drive_create_folder({
  path: "projects/active/project-alpha"
})
// Creates: projects/ → projects/active/ → projects/active/project-alpha/
```

**List files:**
```javascript
iris_drive_list({
  path: "coordination",
  recursive: false,
  type: "both"
})
```

**Read file:**
```javascript
iris_drive_read({
  path: "coordination/memory.md",
  asText: true
})
```

**Move file:**
```javascript
iris_drive_move({
  sourcePath: "old-location/file.md",
  destinationPath: "new-location/file.md"
})
```

**Delete file (with confirmation):**
```javascript
iris_drive_delete({
  path: "temp/old-notes.md",
  confirm: true,
  permanent: false  // Moves to trash, not permanent
})
```

## Architecture

```
Claude.ai User (Free Tier)
  ↓
  (1 Custom Connector Slot)
  ↓
Iris MCP Server
  ↓
  Google Drive API (via OAuth)
  Notion API (future)
  Slack API (future)
```

## Development

**Watch mode:**
```bash
npm run dev
```

**Build:**
```bash
npm run build
```

**Test with MCP Inspector:**
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Roadmap

- [x] Google Drive write backend
- [x] OAuth dashboard for user authentication
- [x] Token encryption and database storage
- [ ] Notion backend
- [ ] Slack backend
- [ ] Dropbox backend
- [ ] User management dashboard
- [ ] MCP server marketplace listing

## Contributing

Pull requests welcome! Please read CONTRIBUTING.md first.

## License

MIT License - see LICENSE file for details

## Credits

**Created by:** Jerry Jackson (Uncle Tallest)  
**For:** Multi-instance AI systems and neurodivergent-AI collaboration

## Support

- Issues: https://github.com/continuity-bridge/iris-mcp-server/issues
- Documentation: https://uncletallest.productions/iris-mcp-server/docs
