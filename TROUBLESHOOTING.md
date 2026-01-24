# Troubleshooting

## `spawn EPERM` when running `npm run dev` or opening preview (Windows)

**Symptom:** `Error [TransformError]: spawn EPERM` when starting the dev server. The app uses **tsx** (which spawns **esbuild**) and **Vite**; Windows or your environment may block these child processes.

### Try these fixes (in order)

1. **Run dev from an external terminal (recommended)**
   - Open **Command Prompt** or **PowerShell** *outside* Cursor (e.g. Win+R → `cmd` → Enter, or Start menu).
   - `cd` to the project folder (e.g. `cd C:\Users\elwth\nexusinvest`).
   - Run **`npm run dev`** (server runs in that window) or **`npm run dev:external`** (opens a new CMD window and runs dev there).
   - Wait for **`serving on port 5000`** in the terminal.
   - Open **http://localhost:5000** in your browser, or run **`npm run preview`** (opens the default browser).
   - Running outside Cursor’s terminal usually fixes EPERM.

2. **Exclude the project from Windows Defender / antivirus**
   - Add the project directory (and optionally `node_modules`) to your antivirus exclusions.
   - Real-time scanning can block `esbuild` and other Node child processes.

3. **Reinstall dependencies**
   ```bash
   Remove-Item -Recurse -Force node_modules
   npm install
   npm run dev
   ```
   Ensures `esbuild` and other binaries aren’t corrupted or quarantined.

4. **Use a normal (non-admin) terminal**  
   - Run your terminal as a normal user. Avoid “Run as administrator” for `npm run dev` unless you’ve ruled out other causes.

### Vite config changes applied

The Vite config includes workarounds that can reduce EPERM during **client** dev (e.g. `realpath`-style resolution):

- `resolve.preserveSymlinks: true` — avoids extra `realpath`-style resolution.
- `server.fs.strict: false` — relaxes file-server checks.

These apply only after the **server** has started. If EPERM happens during **server** startup (tsx/esbuild), you must fix that first (e.g. external terminal or antivirus exclusion).
