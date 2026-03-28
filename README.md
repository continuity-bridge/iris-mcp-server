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
git clone https://github.com/yourusername/iris-mcp-server.git
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
   - Authorized redirect URIs: `https://iris.continuitybridge.io/oauth/callback`
5. Copy Client ID and Client Secret to `.env`

### Environment Variables

See `.env.example` for all required configuration.

## Usage

### For Tam's Corvids (Example Use Case)

**Poe (Majordomo) saves coordination notes:**
```javascript
iris_drive_write({
  path: "corvids/poe/coordination-notes.md",
  content: "Rook is handling grocery planning, Virgil is tracking applications...",
  mode: "upsert"
})
```

**Rook (Life Coach) saves health tracking:**
```javascript
iris_drive_write({
  path: "corvids/rook/health-tracking/2026-03.md",
  content: "# March 2026 Health Log\n\n## Week 1\n- Energy: 7/10\n- Sleep: 8hrs avg\n...",
  mimeType: "text/markdown"
})
```

**Virgil (Job Hunt) saves application tracking:**
```javascript
iris_drive_write({
  path: "corvids/virgil/applications/applied-march.md",
  content: "| Company | Position | Applied | Status |\n|---------|----------|---------|--------|\n...",
  mode: "upsert"
})
```

### Tool Examples

**Create folder structure:**
```javascript
iris_drive_create_folder({
  path: "corvids/rook/health-tracking"
})
// Creates: corvids/ → corvids/rook/ → corvids/rook/health-tracking/
```

**List files:**
```javascript
iris_drive_list({
  path: "corvids/poe",
  recursive: false,
  type: "both"
})
```

**Read file:**
```javascript
iris_drive_read({
  path: "corvids/poe/memory.md",
  asText: true
})
```

**Move file:**
```javascript
iris_drive_move({
  sourcePath: "corvids/old-location/file.md",
  destinationPath: "corvids/new-location/file.md"
})
```

**Delete file (with confirmation):**
```javascript
iris_drive_delete({
  path: "corvids/temp/old-notes.md",
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
- [ ] OAuth dashboard for user authentication
- [ ] Token encryption and database storage
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
**For:** Tam's corvid system and the broader neurodivergent AI collaboration community

## Support

- Issues: https://github.com/yourusername/iris-mcp-server/issues
- Email: support@continuitybridge.io
- Documentation: https://iris.continuitybridge.io/docs
