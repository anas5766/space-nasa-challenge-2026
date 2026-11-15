# Windows Setup Requirements

This guide installs the tools needed to run the Valmed web app and its local Ollama assistant.

## Requirements

- Windows 10 or later.
- PowerShell and Windows Package Manager (`winget`) for the commands below.
- An internet connection for installation, the local model download, and the 3D anatomy assets/CDN modules.
- Several gigabytes of free disk space for the Ollama model.

## 1. Install Node.js LTS

In PowerShell, install the Node.js LTS release:

```powershell
winget install --id OpenJS.NodeJS.LTS --exact
```

Close and reopen PowerShell, then confirm Node.js and npm are available:

```powershell
node --version
npm --version
```

If `winget` is unavailable, download the Windows LTS installer from [Node.js Downloads](https://nodejs.org/en/download/) and run the `.msi` installer.

## 2. Install Ollama

Run Ollama's official Windows installer from PowerShell:

```powershell
irm https://ollama.com/install.ps1 | iex
```

When installation finishes, open Ollama from the Windows Start menu. Its local API should be available at `http://127.0.0.1:11434`.

Confirm the CLI is installed:

```powershell
ollama --version
```

Official instructions: [Ollama for Windows](https://ollama.com/download/windows).

## 3. Download the assistant model

Download the local model used by this project:

```powershell
ollama pull qwen3:4b
```

Confirm it appears in the local model list:

```powershell
ollama list
```

The model is stored on this computer. Keep Ollama running while using the assistant. If Ollama is not running, open its desktop app; only run `ollama serve` in PowerShell if the desktop service has not already started.

Model page: [Qwen3 on Ollama](https://ollama.com/library/qwen3).

## 4. Start the web app

Open a **new PowerShell window** and move to the repository root. Replace the path if the repository is in a different folder:

```powershell
Set-Location "C:\Users\user\nasa-challenge-2026"
```

Check that PowerShell is in the correct folder:

```powershell
Get-Location
Test-Path .\package.json
```

`Test-Path` should return `True`. Then start the app:

```powershell
npm start
```

Install the project dependencies first (Playwright is used for browser QA):

```powershell
npm install
```

Open the site in a browser:

```text
http://localhost:4173
```

Keep the PowerShell window running while you use the site. Press `Ctrl+C` in that window to stop the web server.

## 5. Check the assistant connection

Open **Local AI Support** in the web app. The model selector should list `qwen3:4b`. If it does not:

1. Confirm the Ollama app is open.
2. In PowerShell, run `ollama list` and check that `qwen3:4b` is listed.
3. If it is missing, run `ollama pull qwen3:4b` again.
4. Return to the assistant page and press its refresh button.

The web server uses port `4173`; Ollama uses port `11434`. The 3D anatomy viewer loads its model and Three.js modules from public CDNs, so it also needs internet access.

## 6. Run project tests

The unit/API tests run with Node. Browser tests require Playwright's Chromium download (once per machine):

```powershell
npm test
npx playwright install chromium
npm run test:browser
```

Or run both test suites after installing Chromium with `npm run test:all`.

## Troubleshooting

### `ENOENT` or `package.json` cannot be found

PowerShell is not in the repository folder. Run `Set-Location` with the actual repository path, confirm `Test-Path .\package.json` returns `True`, and then run `npm start`.

### `ollama` is not recognized

Finish the Ollama installation, close and reopen PowerShell, then run `ollama --version` again.

### The assistant says Ollama is unavailable

Open the Ollama desktop app and verify the model with `ollama list`. The web app and Ollama must both be running at the same time.

### Port `4173` is already in use

Stop the other process using the port, or choose another port in PowerShell:

```powershell
$env:PORT = "4174"
npm start
```

Then open `http://localhost:4174`.

## Prototype notice

Valmed is an educational hackathon prototype, not a medical device. Missing data stays unknown; the app does not provide clinical thresholds or clearance. Follow mission-approved medical procedures and advice from the crew medical team.
