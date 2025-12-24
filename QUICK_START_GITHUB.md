# Quick Start: GitHub Releases Setup

## 5-Minute Setup

### 1. Create GitHub Repository
- Go to https://github.com/new
- Name it (e.g., `hrms-desktop`)
- Click "Create repository"

### 2. Get GitHub Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: `HRMS Desktop`
4. Check: ✅ **`repo`** (Full control)
5. Click "Generate token"
6. **Copy the token** (starts with `ghp_`)

### 3. Configure package.json

Edit `desktop-app/package.json`:

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_USERNAME",
  "repo": "YOUR_REPO_NAME"
}
```

Replace:
- `YOUR_GITHUB_USERNAME` → Your GitHub username
- `YOUR_REPO_NAME` → Your repository name

### 4. Set Token (Choose One)

**Option A: Environment Variable (Windows PowerShell)**
```powershell
$env:GH_TOKEN="ghp_your_token_here"
```

**Option B: .env File (Recommended)**
1. Create `desktop-app/.env`:
   ```
   GH_TOKEN=ghp_your_token_here
   ```
2. Install dotenv-cli:
   ```bash
   npm install --save-dev dotenv-cli
   ```

### 5. Publish First Release

```bash
cd desktop-app
npm run publish:win
```

✅ Done! Check your GitHub repository → Releases tab.

## Releasing Updates

1. Update version in `package.json`: `"version": "1.0.1"`
2. Run: `npm run publish:win`
3. Users get automatic update notifications!

## Full Guide

See `GITHUB_RELEASES_SETUP.md` for detailed instructions.

