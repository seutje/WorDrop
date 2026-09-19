# WorDrop

A local-first Windows desktop wardrobe manager built with Tauri 2, React, TypeScript, and Vite.

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

The desktop window opens with Phase 0 placeholder navigation for Closet and Outfits. Core workflows remain offline-first and do not require an account.

## Quality checks

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Use `npm run format` to apply formatting.

## Windows production build

```powershell
npm run tauri build
```

Tauri writes the application binary and configured installer bundles beneath `src-tauri/target/release`.

## Project structure

- `src/components`: reusable UI components and the application shell
- `src/pages`: route-level/page components
- `src/features`: feature-specific UI and logic
- `src/lib`: persistence, image handling, and matching modules
- `src/types`: shared domain types
- `src/styles`: shared styling
- `src-tauri`: native Tauri application and configuration
