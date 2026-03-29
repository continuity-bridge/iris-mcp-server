# Iris HTTP Mode - Browser Integration Guide

**Version:** 0.2.0-prototype  
**Status:** Proof of concept  
**Date:** March 28, 2026

---

## Overview

Iris HTTP Mode enables browser-based claude.ai to access Google Drive using the same session cookie authentication pattern as [headroom](../../headroom).

**Two modes of operation:**
1. **Stdio Mode** (v0.1.0) - For Claude Desktop ✅ Production
2. **HTTP Mode** (v0.2.0) - For browser claude.ai 🧪 Prototype

---

## Architecture

```
Browser claude.ai
    ↓
[Bookmarklet/Extension]
    ↓ HTTP
Iris HTTP Server (localhost:3001)
    ↓
Google Drive API
```

**Session Cookie Flow:**
1. User logs into claude.ai in browser
2. User extracts session cookie via DevTools
3. User runs `iris-setup-browser` to store cookie locally
4. Iris HTTP Server validates cookie on each request
5. If valid, executes Drive operation and returns result

---

## Setup

### 1. Install Dependencies

```bash
cd ~/Devel/UncleTallest/organizations/continuity-bridge/iris-mcp-server
npm install cors @types/cors
```

### 2. Configure Browser Session

```bash
# Run the setup wizard
npm run setup:browser
```

**You'll need:**
1. **Organization ID** - From DevTools Network tab:
   - Open claude.ai
   - Press F12 → Network tab
   - Look for `/api/organizations/[THIS-IS-YOUR-ORG-ID]/...`
   - Copy the UUID

2. **Session Cookie** - From DevTools Network tab:
   - Click any `/api/` request
   - Headers tab → Request Headers
   - Find `cookie:` header
   - Copy the ENTIRE value (very long string)

3. **Your Email** - The Gmail address for Drive access

**Saves to:** `~/.claude/config/iris-browser-session.json`

### 3. Build and Start HTTP Server

```bash
# Build
npm run build:http

# Start server
npm run http
```

**Server runs at:** `http://localhost:3001`

### 4. Test the Server

```bash
# Health check
curl http://localhost:3001/health

# List Drive files (requires session cookie)
curl -H "Cookie: sessionKey=sk-ant-sid..." \\
  http://localhost:3001/api/drive/list?path=Feannog
```

---

## API Endpoints

### Base URL: `http://localhost:3001`

### `POST /api/drive/write`

Create or update a file.

**Request:**
```json
{
  "path": "test-folder/hello.txt",
  "content": "Hello from browser!",
  "mimeType": "text/plain",
  "mode": "upsert"
}
```

**Response:**
```json
{
  "created": true,
  "path": "test-folder/hello.txt",
  "fileId": "1abc...",
  "webViewLink": "https://drive.google.com/file/d/..."
}
```

### `GET /api/drive/read?path=...`

Read a file's contents.

**Request:**
```
GET /api/drive/read?path=test-folder/hello.txt&asText=true
```

**Response:**
```json
{
  "path": "test-folder/hello.txt",
  "content": "Hello from browser!",
  "mimeType": "text/plain"
}
```

### `GET /api/drive/list?path=...`

List files and folders.

**Request:**
```
GET /api/drive/list?path=Feannog&recursive=false&type=both
```

**Response:**
```json
{
  "path": "Feannog",
  "files": [...],
  "folders": [...]
}
```

### `POST /api/drive/create-folder`

Create a new folder.

**Request:**
```json
{
  "path": "new-folder/sub-folder"
}
```

### `POST /api/drive/move`

Move or rename a file/folder.

**Request:**
```json
{
  "sourcePath": "old-name.txt",
  "destinationPath": "new-name.txt"
}
```

### `DELETE /api/drive/delete`

Delete a file or folder.

**Request:**
```json
{
  "path": "file-to-delete.txt",
  "confirm": true,
  "permanent": false
}
```

---

## Browser Integration

### Option A: Bookmarklet (Simplest)

```javascript
javascript:(function(){
  const path = prompt('Google Drive path:');
  const content = document.querySelector('.selected-text')?.textContent || '';
  
  fetch('http://localhost:3001/api/drive/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': document.cookie
    },
    body: JSON.stringify({
      path: path,
      content: content,
      mimeType: 'text/plain'
    })
  })
  .then(r => r.json())
  .then(d => alert('Saved: ' + d.webViewLink))
  .catch(e => alert('Error: ' + e));
})();
```

**To use:**
1. Create new bookmark in browser
2. Name it "Save to Drive"
3. Paste above code as URL
4. When on claude.ai, click bookmark
5. Enter Drive path
6. Selected text saves to Drive

### Option B: Browser Extension (More Robust)

**Coming in v0.3.0** - Full Chrome/Firefox extension with:
- "Save to Drive" button in chat interface
- Auto-detection of code blocks
- Folder picker UI
- Session cookie auto-extraction

---

## Known Issues

### Google Drive Markdown Limitation

**Problem:** Markdown files created via Drive API contain invisible link metadata that prevents proper rendering until manually edited.

**Symptoms:**
- `.md` files appear in Drive
- Content is correct
- But links/formatting don't work properly
- Must open each file individually in Drive
- Delete original linkage manually

**Workaround:**
1. Open `.md` file in Google Drive
2. Click "Open with" → Google Docs
3. Delete any phantom links
4. Save
5. Now file renders correctly

**Potential Solution:**
- Tam shared app scripts that might automate this
- Located in: [path to Tam's scripts]
- Needs investigation and adaptation

**Root Cause:** Google Drive's handling of markdown MIME type includes metadata that conflicts with plain text content.

---

## Security

### Session Cookie Storage

**Stored at:** `~/.claude/config/iris-browser-session.json`  
**Permissions:** `0600` (read/write owner only)

**Contains:**
```json
{
  "organization_id": "f336d0bc-...",
  "cookie_string": "sessionKey=sk-ant-sid...; ...",
  "user_email": "you@gmail.com",
  "saved_at": "2026-03-28T21:00:00Z"
}
```

### Cookie Expiry

**Session cookies expire:**
- Typically 24-48 hours after login
- When you log out
- When Anthropic rotates sessions

**When cookie expires:**
1. HTTP server returns 401 Unauthorized
2. Re-run `npm run setup:browser`
3. Extract fresh cookie from browser
4. Restart HTTP server

### Best Practices

✅ **DO:**
- Use only for personal/local development
- Keep cookie file secure (already 0600)
- Refresh cookie periodically
- Monitor server logs for unauthorized access

❌ **DON'T:**
- Share your cookie with others
- Commit cookie file to git (already in .gitignore)
- Use for production services
- Expose HTTP server to public internet

---

## Comparison: Stdio vs HTTP

| Feature | Stdio Mode | HTTP Mode |
|---------|-----------|-----------|
| **Client** | Claude Desktop | Browser claude.ai |
| **Transport** | stdio | HTTP/REST |
| **Auth** | OAuth (one-time) | Session cookie (periodic refresh) |
| **Setup** | OAuth dashboard | Extract cookie manually |
| **Stability** | High | Medium (cookie expiry) |
| **User Experience** | Seamless | Requires bookmarklet/extension |
| **Security** | High (local only) | Medium (network exposed) |
| **Status** | Production ✅ | Prototype 🧪 |

---

## Development Roadmap

### v0.2.0 (Current - Prototype)
- [x] HTTP server with session cookie auth
- [x] All 6 Drive endpoints working
- [x] CORS configuration for claude.ai
- [x] Setup wizard (`iris-setup-browser`)
- [x] Documentation
- [ ] Testing with actual browser
- [ ] Bookmarklet proof of concept

### v0.3.0 (Planned)
- [ ] Browser extension (Chrome/Firefox)
- [ ] Auto cookie extraction
- [ ] UI for folder picker
- [ ] Error handling improvements
- [ ] Rate limiting
- [ ] Session refresh mechanism

### v0.4.0 (Future)
- [ ] Hosted mode (cloud deployment)
- [ ] Multi-user support
- [ ] Token encryption at rest
- [ ] Analytics/usage tracking
- [ ] Notion backend integration

---

## Troubleshooting

### Server won't start

**Error:** `No browser session configured`

**Solution:**
```bash
npm run setup:browser
```

### 401 Unauthorized

**Cause:** Cookie expired or invalid

**Solution:**
1. Log into claude.ai in browser
2. Extract fresh cookie
3. Run `npm run setup:browser` again
4. Restart HTTP server

### CORS errors in browser

**Cause:** Browser blocking cross-origin requests

**Solution:**
- Ensure claude.ai is in CORS allowed origins
- Check browser console for specific error
- Try from same domain (localhost:3001)

### Drive operations fail

**Cause:** OAuth token expired

**Solution:**
1. Check `~/.claude/config/google-oauth-token.json`
2. Re-run OAuth dashboard if needed
3. Verify `DEFAULT_USER_EMAIL` in `.env`

---

## References

- [SESSION-COOKIE-PATTERN-ANALYSIS.md](./SESSION-COOKIE-PATTERN-ANALYSIS.md) - Deep dive into why/how this works
- [BROWSER-INTEGRATION-STRATEGY.md](./BROWSER-INTEGRATION-STRATEGY.md) - Original design document
- [headroom project](../../headroom) - Inspiration for session cookie approach

---

**Status:** Prototype - functional but needs real-world testing  
**Next Step:** Test with actual browser and create bookmarklet POC  
**Feedback:** Report issues to Uncle Tallest
