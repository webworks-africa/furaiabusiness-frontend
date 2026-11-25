# Upload to GitHub

Extract Furaia-GitHub-Complete-v0.10.1.zip. Open the furaia-frontend directory containing package.json.

## Using Git from Windows CMD

Create an empty GitHub repository first. Replace YOUR_ACCOUNT in the remote URL with your actual account or organization. Do not pre-create a README in the remote repository.

```cmd
git init
git branch -M main
git add .
git status --short
git diff --cached --stat
```

Review the file list. Private environment files, tokens, credentials, certificates, node_modules and dist must not be staged. The included environment examples contain public configuration only.

```cmd
git commit -m "Add Furaia Business Portal source"
git remote add origin https://github.com/YOUR_ACCOUNT/furaia-business-portal.git
git push -u origin main
```

GitHub authentication is handled by your Git client. Do not paste access tokens into the remote URL, source files or terminal transcripts.

## Using GitHub's file upload

Open the empty repository and choose its file upload option. Upload the contents of furaia-frontend so package.json is at the repository root. Ensure .gitignore and .gitattributes are included; Git is preferable when an interface hides configuration files.

The ZIP contains source, tests, documentation and the lockfile. Run npm ci --include=dev after cloning. The active portal is version 0.10.1. Document/supplier workflows are included in development mock mode. Live provider services and server-backed document processing require backend integration before use.
