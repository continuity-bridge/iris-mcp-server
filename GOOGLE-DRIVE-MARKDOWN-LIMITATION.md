# Google Drive Markdown Link Issue

**Date:** March 28, 2026  
**Discovered by:** Poe (reading Feannog folder)  
**Status:** Known limitation, workaround exists

---

## The Problem

When creating `.md` (markdown) files in Google Drive via the API, the files contain **invisible link metadata** that prevents proper rendering.

### Symptoms

1. File appears in Google Drive correctly
2. Content is accurate
3. File size is correct
4. But when you open the file:
   - Links don't work properly
   - Formatting may be off
   - Original "linkage" needs to be manually removed

### Root Cause

Google Drive's handling of markdown MIME type (`text/markdown` or `text/plain` for .md files) includes metadata/linkage that conflicts with the plain text content uploaded via API.

**It's not Iris's fault** - this is a Google Drive API limitation.

---

## Current Workaround

**Manual fix per file:**

1. Open the `.md` file in Google Drive
2. Click "Open with" → Google Docs
3. You'll see phantom/invisible links
4. Delete the original linkage
5. Save the file
6. Now it renders correctly

**This must be done for each `.md` file individually.**

---

## Impact on Iris

### What Works ✅
- Creating .md files via `iris_drive_write`
- Writing correct content
- File appears in Drive
- Content is retrievable via `iris_drive_read`

### What's Broken ❌
- Proper rendering of markdown in Drive's preview
- Link functionality until manually fixed
- Automatic workflows (requires manual intervention)

### Workaround for Users

**Option 1: Use .txt instead**
```javascript
iris_drive_write({
  path: "my-notes/note.txt",  // Use .txt instead of .md
  content: markdown_content,
  mimeType: "text/plain"
})
```

**Option 2: Accept manual fix**
- Create .md files as normal
- Know you'll need to manually fix each one
- Good for small numbers of files

**Option 3: Wait for automation** (see below)

---

## Potential Automation Solution

### Tam's App Scripts

**Source:** Tam shared app scripts that might automate this process

**Location:** [Need to locate these scripts]

**Approach:**
1. Find Tam's scripts
2. Understand how they handle markdown
3. Adapt to run automatically after file creation
4. Either:
   - Run as post-creation hook in Iris
   - Or run as batch cleanup script

### Possible Solutions

#### Option A: Apps Script Trigger

Create a Google Apps Script that:
```javascript
// apps-script-markdown-fixer.js

function fixMarkdownLinks() {
  const folder = DriveApp.getFolderById('FOLDER_ID');
  const files = folder.getFilesByType(MimeType.PLAIN_TEXT);
  
  while (files.hasNext()) {
    const file = files.next();
    
    if (file.getName().endsWith('.md')) {
      // Open as Google Doc
      const doc = DocumentApp.openById(file.getId());
      
      // Remove phantom links
      const body = doc.getBody();
      const links = body.getLinks();
      
      for (let link of links) {
        // Clear link metadata
        link.setUrl(null);
      }
      
      // Save
      doc.saveAndClose();
    }
  }
}

// Run on trigger (e.g., every hour)
```

**Deployment:**
1. Add script to Google Apps Script project
2. Set up time-based trigger
3. Runs automatically to clean up new .md files

#### Option B: Drive API Post-Processing

Add to Iris after file creation:
```typescript
// In iris_drive_write after creating .md file

async function fixMarkdownLinks(fileId: string, drive: drive_v3.Drive) {
  // Option 1: Convert to Google Doc temporarily
  // Option 2: Use Drive API to clear metadata
  // Option 3: Delete and recreate with different approach
  
  // TODO: Research which Drive API calls can fix this
}
```

#### Option C: Different MIME Type Approach

Experiment with:
```typescript
// Try different MIME types to avoid issue
const alternatives = [
  'text/x-markdown',
  'text/plain',  // Current
  'application/octet-stream',
  'text/markdown'  // Current
];

// Test which doesn't create phantom links
```

---

## Research Needed

### Questions

1. **Where are Tam's scripts?**
   - Ask Tam for location
   - Review to understand approach

2. **What exactly is the "linkage"?**
   - Is it embedded in file metadata?
   - Is it in the content itself?
   - Is it a Drive-specific thing?

3. **Can Drive API fix it programmatically?**
   - Which API calls can modify file metadata?
   - Can we clear links without opening as Doc?

4. **Does file creation method matter?**
   - Does `media.upload()` have same issue?
   - Does `files.create()` behave differently?
   - Would multipart upload help?

### Testing Plan

1. **Create test .md file via Iris**
2. **Inspect in Drive** - observe the linkage issue
3. **Try different MIME types** - see if any avoid issue
4. **Test Drive API modifications** - can we fix without manual intervention?
5. **Review Tam's scripts** - what's their approach?

---

## Temporary Recommendation

**For now:**

1. **Use .txt extension** for markdown content
   - Avoids the issue entirely
   - Still readable
   - No special handling needed

2. **For .md files:**
   - Accept that manual fix is needed
   - Document this clearly for users
   - Provide clear instructions

3. **Monitor for API changes:**
   - Google may fix this
   - Or we may discover better approach

---

## Code Example: Current Best Practice

```typescript
// Writing markdown content - two approaches:

// Approach 1: Use .txt (recommended for now)
await iris_drive_write({
  path: "corvids/poe/memory.txt",
  content: "# Poe's Memory\n\n- Item 1\n- Item 2",
  mimeType: "text/plain"
});

// Approach 2: Use .md (requires manual fix)
await iris_drive_write({
  path: "corvids/poe/memory.md",
  content: "# Poe's Memory\n\n- Item 1\n- Item 2",
  mimeType: "text/markdown"
});
// ⚠️ User will need to manually fix links in Drive
```

---

## Action Items

- [ ] Locate Tam's app scripts
- [ ] Test different MIME types
- [ ] Research Drive API metadata modification
- [ ] Create automated fix if possible
- [ ] Document workaround clearly for users
- [ ] Add warning to Iris documentation
- [ ] Consider defaulting to .txt instead of .md

---

**Status:** Known issue with workaround  
**Priority:** Medium (annoying but not blocking)  
**Owner:** Need to collaborate with Tam  
**Next Step:** Find and review Tam's scripts
