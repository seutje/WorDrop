# WorDrop

A local-first Windows desktop wardrobe manager built with Tauri 2, React, TypeScript, and Vite.

![WorDrop application](design.png)


## Prerequisites

- Node.js LTS and npm
- Rust with the MSVC toolchain
- Microsoft C++ Build Tools with “Desktop development with C++”
- Microsoft Edge WebView2 (included with current Windows 10/11 installations)

See the [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for setup details.

## Development

```powershell
npm install
npm run tauri dev
```

The `npm run tauri` wrapper locates Visual Studio Build Tools and initializes
the MSVC/Windows SDK environment before compiling native dependencies. This is
required even when `cl.exe` happens to be present on `PATH`; running Cargo from
an uninitialized terminal otherwise leaves the C/C++ include and library paths
unset.

On startup, the native layer creates or migrates `wardrobe.db` in the operating
system's application-data directory. Core workflows remain offline-first and
do not require an account.

## Quality checks

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

Use `npm run format` to apply formatting.
On Windows, `npm run test:native` runs the Rust suite inside the initialized
MSVC environment.

## Windows production build

```powershell
npm run tauri build
```

Tauri writes the application binary and configured installer bundles beneath `src-tauri/target/release`.

## Publishing a Windows release

GitHub Actions publishes an unsigned NSIS installer whenever a version tag is
pushed. Before tagging, update the same semantic version in:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Verify the versions and quality checks locally:

```powershell
npm run version:check
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:native
```

Commit the version change, then create and push the matching tag:

```powershell
git tag v0.2.0
git push origin v0.2.0
```

The tag must match the configured version exactly, including the leading `v`.
The workflow builds on `windows-latest`, creates a public GitHub Release, and
attaches a file named like `WorDrop_0.2.0_x64-setup.exe`. This is the file end
users should download. The release also contains Tauri's signed updater
artifact and `latest.json`; the same installer is retained as a workflow
artifact.

Windows may show an “unknown publisher” or SmartScreen warning because code
signing is intentionally out of scope. Tauri updater signing is separate from
Windows publisher signing: it verifies that automatic updates came from this
project, but it does not remove the Windows warning.

## Project structure

- `src/components`: reusable UI components and the application shell
- `src/pages`: route-level/page components
- `src/features`: feature-specific UI and logic
- `src/lib`: persistence, image handling, and matching modules
- `src/types`: shared domain types
- `src/styles`: shared styling
- `src-tauri`: native Tauri application and configuration
