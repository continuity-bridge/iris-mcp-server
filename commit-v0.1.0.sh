#!/bin/bash
# Iris MCP Server - v0.1.0 Commit Script

cd "$(dirname "$0")"

echo "🌈 Committing Iris MCP Server v0.1.0..."
echo ""

# Add all files
git add .

# Create commit with detailed message
git commit -m "feat: Iris MCP server v0.1.0 - Claude Desktop integration working

✅ MAJOR MILESTONE: Full Claude Desktop integration operational

Added:
- 6 Google Drive tools (write, read, create_folder, list, move, delete)
- OAuth 2.0 dashboard with SQLite token storage
- Complete TypeScript implementation with MCP SDK
- Comprehensive documentation (README, OAUTH_SETUP, etc.)

Fixed:
- NVM compatibility (full node path in config)
- Config file structure (mcpServers at root level)

Tested and verified:
- Successfully lists Google Drive folders
- All tools registered and working in Claude Desktop
- OAuth flow functional via web dashboard

Known limitations:
- Claude Desktop only (browser not supported)
- Local dev single-user setup
- No token encryption yet

Status: Production-ready for Claude Desktop local development

Co-authored-by: Claude (Anthropic AI)
"

echo ""
echo "✅ Committed!"
echo ""
echo "📋 Commit summary:"
git log -1 --stat

echo ""
echo "💡 Next steps:"
echo "   1. git push origin main  (if you have a remote)"
echo "   2. Create GitHub repo if not done"
echo "   3. Consider tagging: git tag -a v0.1.0 -m 'First working release'"
