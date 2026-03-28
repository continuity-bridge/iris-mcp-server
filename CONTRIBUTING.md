# Contributing to Iris MCP Server

Thanks for your interest in contributing! This project provides multi-backend MCP integration for free-tier Claude.ai users.

---

## How to Contribute

### Reporting Issues

**Before creating an issue:**
- Check existing issues to avoid duplicates
- Include clear reproduction steps
- Specify your environment (Node version, OS, OAuth provider)

**Good issue titles:**
- ❌ "It doesn't work"
- ✅ "OAuth callback fails with 'invalid redirect URI' on port 3000"

### Submitting Pull Requests

**For bug fixes:**
- Submit a PR with the fix
- Include steps to reproduce the bug

**For new features:**
- Open an issue first to discuss
- Avoids wasted work if feature doesn't fit roadmap
- Ensures you're not duplicating ongoing work

**For major architectural changes:**
- Open a Discussion in the Design Decisions category
- These affect everything, need broader input

---

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/iris-mcp-server.git
cd iris-mcp-server

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your OAuth credentials

# Build
npm run build

# Run OAuth dashboard
npm run dev:oauth

# Test MCP server
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## Project Structure

```
iris-mcp-server/
├── src/
│   ├── index.ts              # Main MCP server
│   ├── tools/
│   │   └── drive-tools.ts    # Google Drive tools
│   ├── backends/
│   │   └── google-drive.ts   # OAuth + API client
│   ├── utils/
│   │   └── drive-paths.ts    # Path utilities
│   └── oauth/
│       ├── token-store.ts    # SQLite storage
│       ├── routes.ts         # OAuth endpoints
│       ├── dashboard.ts      # Dashboard UI
│       └── oauth-server.ts   # Express server
├── dist/                     # Compiled JS (gitignored)
├── data/                     # SQLite tokens (gitignored)
└── tests/                    # Test files
```

---

## Code Style

We follow the continuity-bridge code style guide.

**Core principle:** Code should be readable at a glance, self-documenting, and minimally complex.

Key conventions:

**TypeScript:**
- camelCase functions and variables
- PascalCase classes
- SCREAMING_SNAKE_CASE constants
- Type annotations encouraged
- Avoid `any` when possible

**Comments:**
- Explain WHY, not HOW (code shows how)
- Keep concise but informative

**Error Handling:**
- Use specific error types
- Always handle errors gracefully
- Provide clear error messages with context

**Paths:**
- Use path module for cross-platform compatibility
- Never hardcode absolute paths

**Attribution:**
- `// Author: Claude` for AI-generated code
- `// Author: Jerry Jackson (Uncle Tallest)` for human-written code
- `// Collaborative: Claude + Jerry` for significant contributions from both

**Quick example:**
```typescript
/**
 * Resolve a Drive path to a file ID.
 * 
 * @param path - Path like "corvids/poe/memory.md"
 * @param drive - Authenticated Drive client
 * @returns File ID or null if not found
 */
export async function resolvePath(
  path: string,
  drive: drive_v3.Drive
): Promise<string | null> {
  const parts = path.split("/").filter(Boolean);
  let parentId = "root";
  
  for (const part of parts) {
    // Check if this path segment exists as a child of current parent
    const file = await findFileByName(part, parentId, drive);
    
    if (!file) {
      return null;  // Path doesn't exist
    }
    
    parentId = file.id!;
  }
  
  return parentId;
}
```

See [docs/code-style.md](https://github.com/continuity-bridge/native-claude-client/blob/main/docs/code-style.md) for complete guidelines (continuity-bridge standard).

---

## Adding a New Backend

To add a new backend (Notion, Slack, etc.):

1. **Create backend client** in `src/backends/`:
   ```typescript
   // src/backends/notion.ts
   export async function getAuthenticatedNotionClient(userId: string) {
     // OAuth token retrieval from token store
     // Return authenticated client
   }
   ```

2. **Create tool definitions** in `src/tools/`:
   ```typescript
   // src/tools/notion-tools.ts
   export const notionTools = [
     {
       name: "iris_notion_create_page",
       description: "Create a page in Notion",
       inputSchema: { /* ... */ }
     }
   ];
   
   export async function handleNotionToolCall(name: string, args: any) {
     // Tool implementation
   }
   ```

3. **Register in main server** (`src/index.ts`):
   ```typescript
   import { notionTools, handleNotionToolCall } from "./tools/notion-tools.js";
   
   // Add to tools array and tool handler
   ```

4. **Add OAuth flow** (if needed) in `src/oauth/`

5. **Update documentation**

---

## Testing Guidelines

- Write tests for new backends
- Test OAuth flows end-to-end
- Test error handling (expired tokens, network failures, etc.)
- Test with MCP Inspector: `npx @modelcontextprotocol/inspector node dist/index.js`

---

## Pull Request Process

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test locally
5. Commit with clear messages (see Commit Messages below)
6. Push to your fork
7. Open a Pull Request

**PR guidelines:**
- Clear title describing the change
- Description explaining *why* (not just *what*)
- Link to related issue/discussion if applicable
- One logical change per PR (not 5 unrelated fixes)

**Review process:**
- Maintainer will review within a few days
- May request changes or clarification
- PRs that don't fit project goals will be closed with explanation
- All PRs require maintainer approval to merge

---

## Commit Messages

**Format:**
```
type: Short description (50 chars max)

Longer explanation if needed (wrap at 72 chars).
Explain WHY this change was made, not HOW.

Fixes #123
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style (formatting, no logic change)
- `refactor:` - Code restructure (no behavior change)
- `test:` - Adding or updating tests
- `chore:` - Maintenance (dependencies, build config)

**Examples:**
```
feat: Add Notion backend support

Implements Notion API integration with OAuth 2.0.
Includes tools for creating pages, updating content,
and querying databases.
```

```
fix: Handle expired OAuth tokens

Auto-refresh tokens when they expire instead of
returning 401 errors to MCP server.

Fixes #42
```

---

## What We're Looking For

**Contributions that align with project principles:**
1. **Multi-backend** - Solves the free-tier connector limit
2. **OAuth-first** - Secure, persistent authentication
3. **Developer-focused** - Clean APIs, good error messages
4. **Maintainable** - Simple over clever

**Contributions we'll likely decline:**
- Features that only work on specific platforms
- Hardcoded credentials or insecure auth patterns
- Telemetry or tracking of any kind
- Complexity without clear user benefit
- Features that conflict with roadmap priorities

This isn't personal - it's about keeping the project focused.

---

## Documentation

When adding features, update:
- `README.md` - User-facing documentation
- `OAUTH_SETUP.md` - OAuth configuration
- Code comments - Explain complex logic
- This file - If changing contribution process

---

## Testing Checklist

Before committing:

- [ ] Code follows naming conventions
- [ ] Attribution is correct
- [ ] Comments explain WHY not HOW
- [ ] Error handling for likely failures
- [ ] Type annotations where they add clarity
- [ ] Docstrings for public functions
- [ ] No hardcoded paths or credentials
- [ ] Tested with MCP Inspector

---

## Licensing

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Code of Conduct

**Be respectful, be constructive, be honest.**

- Assume good faith
- Critique ideas, not people
- Welcome newcomers
- No harassment, discrimination, or trolling
- Maintainer decisions are final

Violations will result in removal from the project.

---

## Questions?

- **Issues**: https://github.com/continuity-bridge/iris-mcp-server/issues
- **Discussions**: Start a conversation in GitHub Discussions

---

## Thank You

Building multi-backend MCP integration takes time and effort. Your contributions - whether code, feedback, or testing - help make this real.

**Current maintainer:** Jerry Jackson ([@UncleTallest](https://github.com/UncleTallest))

Let's build something great together.
