# AGENTS.md

## Purpose

This repository contains a Windows-first desktop wardrobe manager. The application lets a user catalog clothing items with photos and metadata, assemble and save outfits, and receive deterministic suggestions for clothing that pairs well with a selected item.

This file defines how coding agents should work in this repository. Read `DESIGN.md` before making architectural or product decisions. Read `PLAN.md` before starting implementation work, and keep it updated as tasks are completed.

## Project Priorities

In descending order:

1. The application must be pleasant and reliable for a single non-technical user.
2. Core functionality must work fully offline.
3. Data must remain local to the user's computer by default.
4. The UI should be visual, simple, and fast to understand.
5. The codebase should remain maintainable and understandable by a human developer.
6. Outfit suggestions should be deterministic, explainable, and tunable before any AI-based features are considered.
7. Releases should be easy to build and distribute through GitHub Releases as a Windows installer executable.

Do not sacrifice reliability or simplicity for novelty.

## Read These Files First

Before implementing a feature:

1. Read `DESIGN.md`.
2. Read the relevant phase in `PLAN.md`.
3. Inspect existing code before proposing new abstractions.
4. Reuse established patterns unless they are clearly harmful.
5. Check `design.png` for visual design guidance.

If implementation decisions conflict with `DESIGN.md`, update the design document deliberately rather than silently diverging from it, and inform the user.

## Target Platform and Stack

Primary platform:

- Windows 10 and Windows 11

Preferred stack:

- Tauri 2
- React
- TypeScript
- Vite
- SQLite
- Rust only where required by Tauri or where native functionality is materially better implemented in Rust
- CSS modules, plain CSS, or a lightweight styling approach chosen consistently for the project

Avoid introducing a backend server.

Avoid cloud dependencies for core functionality.

Avoid requiring an account.

## Product Constraints

The application is intended primarily for one user on one machine.

Core workflows must not require:

- Internet access
- User registration
- Cloud storage
- Paid APIs
- AI APIs
- External databases
- Browser extensions
- Mobile companion applications

Optional future features may use external services, but the MVP and standard daily workflow must remain fully functional without them.

## Architecture Principles

### Local-first

All wardrobe metadata and outfit data should be stored locally in SQLite.

Imported clothing images should be copied into an application-managed data directory. Do not rely on original source image paths remaining valid.

The database should reference the managed image location rather than arbitrary external file paths whenever practical.

### Clear separation of concerns

Keep these areas separated:

- UI components
- feature logic
- persistence/data access
- domain models
- suggestion/scoring logic
- image/file handling
- platform integration

The suggestion engine must not be tightly coupled to React components or SQLite.

### Deterministic suggestion engine

Initial outfit recommendations must use a rule-based scoring system.

The same data should produce the same ranking.

Every score should be explainable through component scores or human-readable reasons.

Do not introduce LLM calls, embeddings, vision models, or remote recommendation APIs unless a later design revision explicitly requires them.

### Prefer boring solutions

Use standard patterns and dependencies.

Do not introduce:

- unnecessary state-management frameworks
- microservices
- local web servers
- event buses for simple UI communication
- complex plugin architectures
- generic abstraction layers before multiple concrete use cases exist

## Domain Model Guidance

The canonical domain model is defined in `DESIGN.md`.

At minimum, clothing items need:

- stable ID
- display name
- category
- optional subtype
- one or more colors
- optional material
- optional pattern
- seasons
- occasions
- style tags
- owned/wishlist status
- image reference
- optional notes
- created timestamp
- updated timestamp

Saved outfits need:

- stable ID
- name
- selected clothing item IDs
- optional notes
- created timestamp
- updated timestamp

Do not encode UI-only concepts into the persistent domain model unless needed.

## Database Rules

Use migrations.

Never mutate an existing migration after it has plausibly been used by a released version. Add a new migration instead.

Database access should live behind a small, typed repository/data-access layer.

Prefer explicit SQL over a heavy ORM.

All destructive actions should be intentional and, where appropriate, confirmed in the UI.

Deleting a clothing item must account for saved outfits that reference it.

Choose and document one policy:

- block deletion while referenced,
- remove it from affected outfits,
- or delete affected outfits.

The preferred behavior is to remove the item from affected outfits while preserving the outfit itself, then surface the change to the user.

## Image Handling Rules

When a user imports a clothing photo:

1. Validate that the file is a supported image type.
2. Copy it into app-managed storage.
3. Generate a stable internal filename.
4. Preserve the original only if needed for metadata or future processing.
5. Store the managed path/reference in the database.
6. Generate thumbnails if performance requires it.

Never modify or delete the user's original source image.

When a wardrobe item is deleted, remove its managed image if no other record references it.

## UI and UX Principles

The interface should feel like a visual wardrobe, not an administrative database.

Prefer:

- large clothing thumbnails
- obvious category filters
- low-friction add/edit flows
- immediate visual feedback
- understandable labels
- keyboard accessibility where reasonable
- empty states that explain what to do next

Avoid:

- dense data tables for the primary wardrobe experience
- exposing database terminology
- excessive settings
- excessive modal dialogs
- hidden critical actions
- unexplained numeric compatibility scores

Every recommendation score shown to the user should be accompanied by short explanation text.

Example:

> Great match: neutral colors, compatible seasons, and similar casual style.

## Suggestion Engine Rules

Keep suggestion scoring in a dedicated module.

The first scoring model should consider:

- category compatibility
- color compatibility
- season overlap
- occasion overlap
- style-tag overlap
- material compatibility
- optional pattern compatibility

Scores should be normalized to a documented range, preferably 0â€“100.

Component weights should be centralized and easy to tune.

The engine should also return explanation data, not only a number.

Example result shape:

```ts
type MatchResult = {
  itemId: string;
  score: number;
  reasons: string[];
  breakdown: {
    color: number;
    category: number;
    season: number;
    occasion: number;
    style: number;
    material: number;
  };
};
```

Do not hard-code recommendation prose throughout the UI. Generate it in the suggestion layer or a dedicated presenter/helper.

## Testing Expectations

Add tests where logic is important or easy to regress.

Prioritize tests for:

- scoring logic
- color compatibility
- filtering
- data validation
- repository/database behavior
- migration behavior
- image path handling
- saved outfit behavior

UI tests should focus on critical user flows rather than implementation details.

Do not pursue 100% test coverage as a goal.

## Development Workflow

Before coding:

1. Identify the relevant task in `PLAN.md`.
2. Confirm dependencies on earlier tasks are complete.
3. Inspect existing implementation patterns.
4. Make the smallest coherent change that completes the task.

During coding:

- keep TypeScript strict
- avoid `any` unless justified
- keep functions focused
- use descriptive names
- handle expected errors explicitly
- keep user-facing error messages understandable
- avoid logging private wardrobe information unnecessarily

After coding:

1. Run formatting.
2. Run linting.
3. Run type checks.
4. Run relevant tests.
5. Run the application if practical.
6. Update `PLAN.md` checkboxes only for work actually completed.
7. Note important architectural changes in `DESIGN.md`.

## Git and Commit Guidance

Keep commits focused.

Good examples:

- `feat: add clothing item creation flow`
- `feat: add SQLite wardrobe repository`
- `feat: score color compatibility`
- `fix: preserve outfit after deleting item`
- `chore: add Windows release workflow`

Avoid combining unrelated refactors with feature work.

Do not rewrite user-authored project history unless explicitly asked.

## Dependency Policy

Before adding a dependency, ask:

1. Can this be done reasonably with the standard library or existing dependencies?
2. Is the package actively maintained?
3. Is it materially reducing complexity?
4. Does it work reliably in Tauri on Windows?
5. Does it add runtime network requirements?

Prefer small, stable dependencies.

Document any important new dependency in `DESIGN.md`.

## Error Handling

User-facing errors should explain:

- what failed
- whether data was preserved
- what the user can do next

Example:

Bad:

> SQLITE_ERROR

Better:

> The item could not be saved. Your photo was not deleted. Try saving again.

Unexpected errors may be logged locally for debugging, but do not transmit logs externally without an explicit future design decision.

## Release Requirements

The expected release flow is:

1. A version/tag is created.
2. GitHub Actions builds the Windows application.
3. A Windows installer executable is attached to a GitHub Release.
4. The user downloads and installs it.

Windows code signing is explicitly out of scope for this project unless the project owner later changes that requirement.

Do not block release work on signing.

## Scope Discipline

Before implementing a feature not described in `DESIGN.md`, determine whether it belongs in the current phase.

Features that should normally be deferred unless explicitly promoted into scope include:

- accounts
- synchronization
- social features
- public sharing
- marketplaces
- shopping affiliate links
- cloud AI
- automatic fashion trend analysis
- body scanning
- virtual try-on
- mobile applications
- multi-user household support

Record good ideas without derailing the current implementation phase.

## Definition of Done for a Feature

A feature is complete when:

- the intended user flow works
- edge cases are handled reasonably
- persistence works where required
- the UI has appropriate empty/loading/error states
- relevant tests pass
- no obvious debug UI remains
- `PLAN.md` is updated
- `DESIGN.md` is updated if behavior or architecture changed

Do not mark tasks complete merely because code was generated.

## When Requirements Are Ambiguous

Use the following priority:

1. Existing explicit requirements in `DESIGN.md`
2. Existing behavior already relied upon by the user
3. Simplicity
4. Offline-first behavior
5. Reversibility
6. Conventional desktop UX

If ambiguity would materially affect user data, choose the safer and less destructive option.

## Final Agent Reminder

This project should remain enjoyable to maintain.

Prefer clear code over clever code.

Prefer a finished, polished wardrobe manager over an ambitious platform.

Build the smallest useful version first, validate it with the real user, and expand from actual usage.
