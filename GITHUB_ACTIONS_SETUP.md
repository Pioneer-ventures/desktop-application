# GitHub Actions Setup - Build macOS Without a Mac

This guide shows you how to automatically build for macOS using GitHub Actions, even if you don't have a Mac.

## Option 1: Automatic Build on Tag Push (Recommended)

This workflow automatically builds for both Windows and macOS when you push a version tag.

### How It Works

1. **Build Windows locally** (or let GitHub Actions do it)
2. **Push a version tag** to GitHub
3. **GitHub Actions automatically:**
   - Builds for Windows (on Windows runner)
   - Builds for macOS (on macOS runner)
   - Creates a GitHub Release with both installers

### Setup Steps

1. **Update version in `package.json`:**
   ```json
   "version": "1.0.1"
   ```

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Release v1.0.1"
   git push
   ```

3. **Create and push a version tag:**
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

4. **GitHub Actions will automatically:**
   - Build for Windows
   - Build for macOS
   - Create a release with both installers

### Workflow File

The workflow is already set up at:
```
desktop-app/.github/workflows/build-and-publish.yml
```

## Option 2: Manual Trigger (Quick Windows Build)

If you just want to build Windows quickly:

1. Go to: https://github.com/Pioneer-ventures/desktop-application/actions
2. Click "Build Windows Only"
3. Click "Run workflow"
4. Enter your GitHub token
5. Click "Run workflow"

This will build and publish Windows only.

## Option 3: Build Windows Locally, macOS on GitHub

### Step 1: Build Windows Locally

```powershell
cd desktop-app
.\docs\publish.ps1 -platform win -token ghp_your_token_here
```

This publishes Windows to GitHub Releases.

### Step 2: Trigger macOS Build

1. Go to: https://github.com/Pioneer-ventures/desktop-application/actions
2. Click "Build and Publish"
3. Click "Run workflow"
4. Enter the version (e.g., `1.0.1`)
5. Click "Run workflow"

This will build macOS and add it to the existing release.

## Workflow Files

### `build-and-publish.yml`
- Builds both Windows and macOS
- Creates GitHub Release
- Triggered by version tags (v1.0.0, v1.0.1, etc.)

### `build-windows-only.yml`
- Builds Windows only
- Manual trigger
- Requires GitHub token input

## Using Version Tags

### Create a Release

1. **Update version:**
   ```json
   // package.json
   "version": "1.0.2"
   ```

2. **Commit:**
   ```bash
   git add package.json
   git commit -m "Bump version to 1.0.2"
   git push
   ```

3. **Create tag:**
   ```bash
   git tag v1.0.2
   git push origin v1.0.2
   ```

4. **GitHub Actions will automatically:**
   - Build Windows
   - Build macOS
   - Create release with both installers

## Benefits

✅ **No Mac required** - GitHub provides free macOS runners  
✅ **Automatic** - Just push a tag  
✅ **Both platforms** - Windows and macOS in one release  
✅ **Free** - GitHub Actions is free for public repos  
✅ **Consistent** - Same build environment every time  

## Troubleshooting

### Workflow Not Triggering

- Make sure tag starts with `v` (e.g., `v1.0.0`)
- Check workflow file is in `.github/workflows/` directory
- Verify workflow file syntax is correct

### Build Fails

- Check Actions tab for error logs
- Ensure `package.json` version is correct
- Verify repository secrets are set (if needed)

### Release Not Created

- Check if artifacts were uploaded
- Verify GitHub token has release permissions
- Check Actions logs for errors

## Manual Release Creation

If you prefer to create releases manually:

1. Build Windows locally: `.\docs\publish.ps1 -platform win -token ghp_xxx`
2. Go to: https://github.com/Pioneer-ventures/desktop-application/releases
3. Click "Draft a new release"
4. Tag: `v1.0.1`
5. Upload Windows EXE from `desktop-app/release/`
6. For macOS, trigger the workflow or wait for someone with a Mac

## Summary

**Easiest Workflow:**
1. Update version in `package.json`
2. Commit and push
3. Create and push tag: `git tag v1.0.1 && git push origin v1.0.1`
4. GitHub Actions builds both platforms automatically
5. Release is created with both installers

No Mac needed! 🎉

