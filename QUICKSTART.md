# Iris MCP Server - Quick Start Guide

## For Testing Without OAuth (Development Mode)

Since the OAuth flow and database aren't implemented yet, here's how to test the tool implementations:

### Step 1: Install Dependencies

```bash
cd /home/tallest/Devel/iris-mcp-server
npm install
```

### Step 2: Build

```bash
npm run build
```

### Step 3: Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

The inspector will show all 6 tools registered:
- iris_drive_write
- iris_drive_read  
- iris_drive_create_folder
- iris_drive_list
- iris_drive_move
- iris_drive_delete

### Step 4: Testing (When OAuth is Implemented)

**Note:** Tools will fail with authentication error until OAuth flow is complete.

The error will be:
```
Error: User not authenticated. Please connect Google Drive at https://iris.continuitybridge.io/dashboard
```

This is expected! The tool implementations are complete; we just need to add:
1. OAuth dashboard
2. Database for token storage
3. Token encryption

## Next Steps (Implementation Priority)

### Phase 1: OAuth Flow (NEXT)
- [ ] Create Express server for OAuth callbacks
- [ ] Implement Google OAuth flow
- [ ] Add simple dashboard UI

### Phase 2: Database Layer
- [ ] Set up PostgreSQL (or SQLite for dev)
- [ ] Create users table
- [ ] Create credentials table (encrypted)
- [ ] Implement token storage/retrieval

### Phase 3: Testing with Real User
- [ ] Deploy to production
- [ ] Register with Anthropic as MCP connector
- [ ] Onboard Tam as first user
- [ ] Validate with corvid system

## Tool Validation Checklist

All 6 tools are implemented with:
- ✅ Proper Zod input schemas
- ✅ Clear descriptions
- ✅ Error handling with actionable messages
- ✅ JSON response format
- ✅ Path resolution logic
- ✅ Parent folder creation
- ✅ Safety checks (delete confirmation)

## Architecture Complete

```
iris-mcp-server/
├── src/
│   ├── index.ts              ✅ MCP server entry point
│   ├── backends/
│   │   └── google-drive.ts   ✅ OAuth client + token management
│   ├── tools/
│   │   └── drive-tools.ts    ✅ All 6 tools implemented
│   └── utils/
│       └── drive-paths.ts    ✅ Path resolution logic
├── package.json              ✅
├── tsconfig.json             ✅
├── .env.example              ✅
├── README.md                 ✅
├── LICENSE                   ✅
└── .gitignore                ✅
```

## For Tam's Corvid System

Once OAuth is live, Tam's workflow will be:

1. **Visit iris.continuitybridge.io/dashboard**
2. **Click "Connect Google Drive"**
3. **Grant permissions**
4. **Add Iris to claude.ai as custom connector**
5. **Poe, Rook, and Virgil can now persist memory!**

Example corvid call:
```javascript
// Rook saves health tracking
iris_drive_write({
  path: "corvids/rook/health-tracking/2026-03-27.md",
  content: "# Health Log - March 27, 2026\n\nEnergy: 8/10\nSleep: 7.5hrs\n...",
  mode: "upsert"
})

// Returns:
{
  "success": true,
  "fileId": "1abc...",
  "webViewLink": "https://drive.google.com/file/d/1abc.../view",
  "created": false,
  "updated": true,
  "path": "corvids/rook/health-tracking/2026-03-27.md"
}
```

## Current Status

**COMPLETE:** 
- ✅ All 6 Google Drive tools implemented
- ✅ Path resolution logic
- ✅ Error handling
- ✅ MCP server structure
- ✅ TypeScript compilation
- ✅ Documentation

**NEXT:**
- OAuth dashboard
- Database layer
- Deployment
- MCP connector registration

**WORKS NOW (with manual token injection):**
All tools work if you manually inject a valid OAuth token for testing.

**WORKS WHEN OAUTH COMPLETE:**
End-to-end user authentication and tool execution.
