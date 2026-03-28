# Changelog

## [0.1.0] - 2026-03-28

### ✅ WORKING: Claude Desktop Integration

**Major Milestone:** Iris MCP server successfully integrated with Claude Desktop and fully operational!

### Added
- Complete Google Drive backend with 6 tools:
  - `iris_drive_write` - Create/update files with auto-folder creation
  - `iris_drive_read` - Read file contents (text or base64)
  - `iris_drive_create_folder` - Create nested folder structures
  - `iris_drive_list` - List files/folders (recursive option)
  - `iris_drive_move` - Move or rename files/folders  
  - `iris_drive_delete` - Delete with trash/permanent options
- OAuth 2.0 dashboard for Google Drive authentication
  - Token storage using SQLite
  - Web interface at http://localhost:3000
  - Secure token management per-user
- Full TypeScript implementation with type safety
- MCP SDK integration for Claude Desktop

### Documentation
- README.md - Project overview and quick start
- OAUTH_SETUP.md - OAuth credentials setup guide
- IMPLEMENTATION_STATUS.md - Current implementation state
- WHAT_THIS_UNLOCKS.md - Use cases and capabilities
- CONTRIBUTING.md - Contribution guidelines

### Fixed (2026-03-28 Debug Session)
- **NVM compatibility**: Use full node path for Claude Desktop
- **Config structure**: Fixed mcpServers nesting in config file

### Tested
✅ Successfully lists Google Drive folders
✅ All 6 tools registered and working
✅ OAuth token storage functional
✅ MCP protocol communication via stdio

### Known Limitations
- **Claude Desktop only** - Browser claude.ai cannot use local MCP servers
- **Single user** - Designed for local development
- **Manual OAuth** - Requires web dashboard authentication
- **No encryption** - Tokens in SQLite (local dev only)

### Dependencies
- Node.js ≥18
- @modelcontextprotocol/sdk ^1.0.0
- googleapis ^144.0.0
- better-sqlite3 ^11.10.0
- express ^4.19.2

---

**Status:** Production-ready for Claude Desktop  
**Tested by:** Uncle Tallest (Jerry Jackson)  
**Date:** March 28, 2026
