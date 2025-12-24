# GitHub Releases Auto-Update Setup Guide

This guide will help you set up auto-updates for your HRMS Desktop app using GitHub Releases. This is a **free** solution that doesn't require a separate server.

## Prerequisites

1. A GitHub account
2. A GitHub repository (public or private)
3. A GitHub Personal Access Token (PAT) with appropriate permissions

## Step 1: Create GitHub Repository

If you don't have a repository yet:

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Name it (e.g., `hrms-desktop`)
4. Choose **Public** or **Private** (both work for releases)
5. Click **"Create repository"**

## Step 2: Create GitHub Personal Access Token

You need a token to publish releases:

1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `HRMS Desktop Releases`
4. Select expiration (recommend: **90 days** or **No expiration**)
5. Check these permissions:
   - ✅ **`repo`** (Full control of private repositories)
     - This includes: `repo:status`, `repo_deployment`, `public_repo`, `repo:invite`, `security_events`
6. Click **"Generate token"**
7. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 3: Configure package.json

Edit `desktop-app/package.json` and update the `publish` section:

```json
"publish": {
  "provider": "github",
  "owner": "your-github-username",
  "repo": "your-repository-name"
}
```

**Replace:**
- `your-github-username` → Your actual GitHub username
- `your-repository-name` → Your repository name (e.g., `hrms-desktop`)

**Example:**
```json
"publish": {
  "provider": "github",
  "owner": "johndoe",
  "repo": "hrms-desktop"
}
```

## Step 4: Set GitHub Token as Environment Variable

### Windows (PowerShell)

```powershell
# Set token for current session
$env:GH_TOKEN="ghp_your_token_here"

# Or set permanently (requires admin)
[System.Environment]::SetEnvironmentVariable('GH_TOKEN', 'ghp_your_token_here', 'User')
```

### Windows (Command Prompt)

```cmd
set GH_TOKEN=ghp_your_token_here
```

### macOS/Linux

```bash
# Set token for current session
export GH_TOKEN="ghp_your_token_here"

# Or add to ~/.bashrc or ~/.zshrc for permanent
echo 'export GH_TOKEN="ghp_your_token_here"' >> ~/.bashrc
source ~/.bashrc
```

### Alternative: Use .env file (Recommended)

Create a `.env` file in the `desktop-app` directory:

```env
GH_TOKEN=ghp_your_token_here
```

Then install `dotenv-cli`:
```bash
npm install --save-dev dotenv-cli
```

Update your publish scripts in `package.json`:
```json
"publish:win": "npm run build && cross-env CSC_IDENTITY_AUTO_DISCOVERY=false dotenv -e .env -- electron-builder --win --publish always"
```

## Step 5: Build and Publish Your First Release

### Initial Release (Version 1.0.0)

1. **Make sure version is set** in `package.json`:
   ```json
   "version": "1.0.0"
   ```

2. **Build and publish**:
   ```bash
   cd desktop-app
   npm run publish:win
   ```

   This will:
   - Build the app
   - Create a GitHub Release
   - Upload the installer to the release
   - Create `latest.yml` automatically

3. **Verify on GitHub**:
   - Go to your repository
   - Click **"Releases"** in the right sidebar
   - You should see version `1.0.0` with the installer attached

## Step 6: How Auto-Updates Work

Once users install version 1.0.0:

1. **App checks GitHub** for new releases
2. **If new version found** → User gets a dialog
3. **User downloads** → Update downloads automatically
4. **User restarts** → App updates to new version

## Step 7: Releasing Updates

When you want to release a new version:

1. **Update version** in `package.json`:
   ```json
   "version": "1.0.1"
   ```

2. **Make your code changes**

3. **Build and publish**:
   ```bash
   npm run publish:win
   ```

4. **That's it!** All installed apps will detect the update.

## Workflow Example

```bash
# 1. Make changes to your code
# ... edit files ...

# 2. Update version
# Edit package.json: "version": "1.0.2"

# 3. Build and publish
npm run publish:win

# 4. GitHub Release is created automatically
# Users will get update notifications
```

## Testing Updates

1. **Install version 1.0.0** on a test machine
2. **Build and publish version 1.0.1**:
   ```bash
   # Update version in package.json to 1.0.1
   npm run publish:win
   ```
3. **Launch the 1.0.0 app**
4. **Wait 5 seconds** → Update dialog should appear
5. **Test the update flow**

## Troubleshooting

### Error: "GitHub Personal Access Token is not set"

**Solution:** Set the `GH_TOKEN` environment variable:
```bash
export GH_TOKEN="ghp_your_token_here"
npm run publish:win
```

### Error: "Repository not found" or "Bad credentials"

**Solutions:**
1. Check your GitHub username and repository name in `package.json`
2. Verify your token has `repo` permissions
3. Make sure the token hasn't expired
4. For private repos, ensure the token has access

### Error: "Release already exists"

**Solution:** Either:
- Increment the version number in `package.json`
- Or delete the existing release on GitHub

### Updates not detected?

1. **Check GitHub Releases**:
   - Go to your repo → Releases
   - Verify the latest release exists
   - Check that `latest.yml` is attached

2. **Verify version number**:
   - New version must be **higher** than current
   - Use semantic versioning: `1.0.0` → `1.0.1` → `1.0.2`

3. **Check app logs** (in dev mode):
   - Look for auto-updater messages
   - Check for connection errors

4. **Test manually**:
   - Visit: `https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/releases/latest`
   - Should return JSON with release info

## Security Best Practices

1. **Don't commit tokens**:
   - Add `.env` to `.gitignore`
   - Never commit `GH_TOKEN` to Git

2. **Use token with minimal permissions**:
   - Only grant `repo` scope
   - Set expiration date

3. **Rotate tokens regularly**:
   - Generate new tokens periodically
   - Revoke old tokens

4. **For CI/CD**:
   - Use GitHub Secrets (Actions)
   - Never hardcode tokens

## Advanced: Using GitHub Actions

You can automate releases with GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: electron-userland/electron-builder-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          args: --win --publish always
```

## Summary

✅ **Setup Complete When:**
- GitHub repository created
- Personal Access Token generated
- `package.json` configured with owner/repo
- `GH_TOKEN` environment variable set
- First release published successfully

✅ **To Release Updates:**
1. Update version in `package.json`
2. Run `npm run publish:win`
3. Done!

---

**Need Help?** Check the [electron-updater documentation](https://www.electron.build/auto-update) or GitHub Issues.

