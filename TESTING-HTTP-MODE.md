# HTTP Server Testing Guide

**Date:** March 28, 2026  
**Purpose:** Step-by-step guide to test Iris HTTP mode

---

## Prerequisites Check

Run these commands to verify setup:

```bash
cd ~/Devel/UncleTallest/organizations/continuity-bridge/iris-mcp-server

# 1. Check dependencies installed
npm list cors
# Should show: cors@2.8.5 (or similar)

# 2. Check OAuth tokens exist
ls -la data/*.db
# Should show: iris.db with oauth tokens

# 3. Check build exists
ls -la dist/http-server.js
# Should show the compiled file
```

---

## Step 1: Configure Browser Session

**Run the setup wizard:**

```bash
npm run setup:browser
```

**You'll need:**

### A. Organization ID

1. Open claude.ai in Chrome
2. Press **F12** (DevTools)
3. Go to **Network** tab
4. Refresh page or click around
5. Look for requests to `/api/organizations/[UUID]/...`
6. Copy the UUID (looks like: `f336d0bc-b841-465b-8045-024475c079dd`)

### B. Session Cookie

1. Still in Network tab
2. Click on any `/api/` request
3. Go to **Headers** tab
4. Scroll to **Request Headers**
5. Find `cookie:` header
6. Copy the **ENTIRE** value (very long string starting with `sessionKey=sk-ant-sid...`)

### C. Your Email

Enter your Gmail address (the one with Drive access)

**Wizard will save to:** `~/.claude/config/iris-browser-session.json`

---

## Step 2: Build HTTP Server

```bash
npm run build:http
```

**Should see:**
- TypeScript compilation output
- No errors
- `dist/http-server.js` created

---

## Step 3: Start HTTP Server

```bash
npm run http
```

**Expected output:**
```
🌈 Iris HTTP Server (Browser Mode) running at:
   http://localhost:3001

Session configured: ✓
  Organization: f336d0bc...
  User: your-email@gmail.com

Endpoints:
  POST   /api/drive/write
  GET    /api/drive/read
  GET    /api/drive/list
  POST   /api/drive/create-folder
  POST   /api/drive/move
  DELETE /api/drive/delete
  GET    /health
```

**Leave this running in the terminal!**

---

## Step 4: Test Health Endpoint

Open a **new terminal** and run:

```bash
curl http://localhost:3001/health
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "iris-http",
  "mode": "browser",
  "session_configured": true
}
```

✅ **If this works, the server is running!**

---

## Step 5: Test Drive List (With Session Cookie)

**Option A: Using curl**

```bash
# Get your session cookie from browser
# Press F12 → Application tab → Cookies → claude.ai
# Copy the entire cookie string

curl -H "Cookie: sessionKey=sk-ant-sid..." \
  http://localhost:3001/api/drive/list?path=Feannog
```

**Option B: From Browser Console (Easier)**

1. Open claude.ai
2. Press **F12** → Console tab
3. Paste this code:

```javascript
fetch('http://localhost:3001/api/drive/list?path=Feannog', {
    headers: { Cookie: document.cookie }
})
.then(r => r.json())
.then(d => console.log(d))
.catch(e => console.error(e))
```

**Expected output:**
```json
{
  "path": "Feannog",
  "items": [
    {
      "name": "00-WELCOME.md",
      "type": "file",
      ...
    },
    ...
  ]
}
```

✅ **If you see your Feannog folder contents, Drive integration works!**

---

## Step 6: Test Drive Write

From browser console on claude.ai:

```javascript
fetch('http://localhost:3001/api/drive/write', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Cookie': document.cookie
    },
    body: JSON.stringify({
        path: 'test/http-mode-test.txt',
        content: 'Hello from HTTP mode! ' + new Date().toISOString()
    })
})
.then(r => r.json())
.then(d => {
    console.log('✅ Success!', d);
    console.log('View at:', d.webViewLink);
})
.catch(e => console.error('❌ Error:', e))
```

**Expected output:**
```json
{
  "created": true,
  "path": "test/http-mode-test.txt",
  "fileId": "1abc...",
  "webViewLink": "https://drive.google.com/file/d/1abc..."
}
```

**Then check Google Drive:**
- Should see `test/` folder
- Should see `http-mode-test.txt` file
- Content should match

✅ **If file appears in Drive, write works!**

---

## Step 7: Test Bookmarklet

### A. Open the Bookmarklet Page

```bash
# Open in browser
firefox ~/Devel/UncleTallest/organizations/continuity-bridge/iris-mcp-server/bookmarklet.html
# or
google-chrome ~/Devel/UncleTallest/organizations/continuity-bridge/iris-mcp-server/bookmarklet.html
```

### B. Install Bookmarklet

1. Show bookmarks bar (Ctrl+Shift+B)
2. Drag the **"💾 Save to Drive"** button to bookmarks bar
3. You should see it appear in bookmarks

### C. Test on Claude.ai

1. Go to claude.ai
2. Select some text (a paragraph or code block)
3. Click the **"💾 Save to Drive"** bookmarklet
4. Enter a path like: `bookmarklet-tests/first-test.txt`
5. Watch for notification:
   - Should show "💾 Saving to Drive..."
   - Then "✅ Saved!" with link to Drive
6. Click "Open in Drive →" to verify

✅ **If you can save from claude.ai, bookmarklet works!**

---

## Troubleshooting

### Server won't start

**Error:** `Cannot find module 'cors'`
```bash
npm install
```

**Error:** `No browser session configured`
```bash
npm run setup:browser
```

### 401 Unauthorized

**Cause:** Session cookie expired or invalid

**Fix:**
```bash
# Log into claude.ai in browser
# Then re-run setup
npm run setup:browser

# Restart server
# Press Ctrl+C in server terminal, then:
npm run http
```

### CORS Error in Browser

**Error:** `Access to fetch... blocked by CORS policy`

**Check server logs** - should allow `https://claude.ai`

**Temporary workaround:**
Test from `localhost:3000` instead (also allowed in CORS config)

### Drive Operations Fail

**Error:** `OAuth token expired`

**Fix:**
1. Run OAuth dashboard: `npm run oauth`
2. Re-authenticate in browser
3. Restart HTTP server

### Bookmarklet Does Nothing

**Common causes:**
- Forgot to select text first (select something!)
- HTTP server not running (check terminal)
- Session cookie expired (re-run setup:browser)
- Wrong port (should be 3001)

**Debug:**
Open browser console (F12) and look for error messages

---

## Success Checklist

Test each of these in order:

- [ ] Health endpoint responds (curl test)
- [ ] List endpoint returns Feannog contents (browser console)
- [ ] Write endpoint creates file in Drive (browser console)
- [ ] File appears in Google Drive correctly
- [ ] Bookmarklet installs in browser
- [ ] Bookmarklet saves selected text
- [ ] Notification shows success
- [ ] "Open in Drive" link works

**If all checked, HTTP mode is fully functional! 🎉**

---

## Next Steps After Successful Test

1. **Save to Drive from Claude conversations:**
   - Select Claude's response
   - Click bookmarklet
   - Save as: `claude-responses/YYYY-MM-DD-topic.txt`

2. **Create organized structure:**
   - `notes/daily/` - Daily notes
   - `code-snippets/` - Code from Claude
   - `research/` - Research summaries
   - `ideas/` - Brainstorms and ideas

3. **Test edge cases:**
   - Very long text
   - Special characters
   - Nested folder paths
   - Existing file updates

4. **Consider browser extension (v0.3.0):**
   - More polished UI
   - Automatic cookie extraction
   - Folder picker
   - Better error handling

---

**Status:** Ready for testing!  
**Time:** ~15 minutes for complete test  
**Difficulty:** Easy (just follow steps)  

**Have fun! 🚀**
