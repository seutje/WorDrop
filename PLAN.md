# PLAN.md

## How to Use This Plan

This is the implementation checklist for the wardrobe manager.

Agents should:

- complete phases in order unless a dependency clearly allows parallel work;
- check off only work that is actually complete;
- keep unfinished items unchecked;
- add notes beneath tasks when implementation materially differs from the plan;
- run the specified verification steps;
- stop at user test gates when the phase requires real-user validation before major UX expansion.

Checkbox meanings:

- `[ ]` not started or incomplete
- `[x]` complete

---

# Phase 0 — Repository and Project Foundation

## Goal

Create a clean Tauri + React + TypeScript project that launches locally and has the baseline tooling needed for disciplined development.

## Deliverables

- [x] Tauri 2 project initialized
- [x] React + TypeScript frontend initialized
- [x] Vite configured
- [x] project launches in development mode
- [x] Windows build can be produced locally
- [x] formatting configured
- [x] linting configured
- [x] TypeScript strict mode enabled
- [x] test runner configured
- [x] basic project directory structure created
- [x] `README.md` created with development setup
- [x] `AGENTS.md`, `DESIGN.md`, and `PLAN.md` present at repository root

## Suggested Steps

- [x] Initialize project
- [x] Confirm Tauri development window launches
- [x] Remove template/demo content
- [x] Establish folders:
  - [x] `src/components`
  - [x] `src/pages`
  - [x] `src/features`
  - [x] `src/lib`
  - [x] `src/types`
  - [x] `src/styles`
- [x] Add basic app shell
- [x] Add navigation placeholders for Closet and Outfits
- [x] Configure formatter
- [x] Configure linter
- [x] Configure unit tests
- [x] Add scripts for lint, typecheck, test, build

## Verification

- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] `npm test` passes
- [x] development app launches
- [x] production Windows build succeeds

## User Test Gate

The project owner should launch the app and verify:

- [x] a normal desktop window opens
- [x] the UI is readable
- [x] navigation between placeholder sections works
- [x] there are no obvious template leftovers

Do not spend significant time polishing visual design in this phase.

---

# Phase 1 — Local Database and Clothing Data Model

## Goal

Create reliable local persistence for clothing items.

## Deliverables

- [x] SQLite integration added
- [x] migration system configured
- [x] initial clothing schema created
- [x] typed clothing domain model created
- [x] repository/data-access layer created
- [x] create/read/update/delete functions implemented
- [x] persistence survives application restart
- [x] automated tests cover essential CRUD behavior

## Suggested Steps

### Database

- [x] Add SQLite dependency/plugin
- [x] Create initial migration
- [x] Create `clothing_items` table
- [x] Create tables for multi-value attributes as needed:
  - [x] colors
  - [x] seasons
  - [x] occasions
  - [x] style tags
- [x] Add timestamps
- [x] Add ownership field
- [x] Add image reference field

### Domain Types

- [x] Create `ClothingItem`
- [x] Create category type
- [x] Create color type
- [x] Create season type
- [x] Create occasion type
- [x] Create ownership type

### Data Access

- [x] `createClothingItem`
- [x] `getClothingItem`
- [x] `listClothingItems`
- [x] `updateClothingItem`
- [x] `deleteClothingItem`

### Tests

- [x] create item
- [x] retrieve item
- [x] update item
- [x] delete item
- [x] multi-value fields persist correctly
- [ ] app restart/reopen behavior works in manual test

## Verification

- [x] migrations run automatically
- [x] empty database initializes safely
- [x] CRUD tests pass
- [x] malformed inputs are rejected at appropriate layer

Implementation note: SQLite is owned by the Tauri/Rust layer and stored as
`wardrobe.db` in the platform application-data directory. The TypeScript
repository calls typed Tauri commands; the migration version is tracked with
SQLite `user_version`.

## User Test Gate

Temporary developer UI or debug controls may be used for this gate.

Project owner verifies:

- [x] create a sample clothing record
- [x] close application
- [x] reopen application
- [x] sample record still exists
- [x] edit record
- [x] close/reopen again
- [x] edits remain

---

# Phase 2 — Image Import and Managed Storage

## Goal

Allow clothing photos to be imported safely into application-managed storage.

## Deliverables

- [x] file picker for supported images
- [x] JPEG support
- [x] PNG support
- [x] WebP support if straightforward
- [x] imported image copied to application data directory
- [x] unique managed filenames
- [x] source image remains untouched
- [x] stored item references managed image
- [x] replacement image flow
- [x] cleanup when item/image is removed
- [x] image error handling

## Suggested Steps

- [x] Implement image picker
- [x] Validate extension/type
- [x] Create image storage directory
- [x] Generate unique filename
- [x] Copy selected image
- [x] Return stable internal reference
- [x] Render imported image in frontend
- [x] Handle missing image file
- [x] Implement replace-image behavior
- [x] Implement managed-image cleanup
- [x] Add tests for path/filename utilities

## Optional Optimization

Do only if needed:

- [ ] generate thumbnails
- [ ] cache thumbnails

## Verification

- [x] importing an image does not alter source image
- [x] item still displays if source image is moved/deleted
- [x] replacing image does not leave obvious orphan files
- [x] deleting item removes unreferenced managed image
- [x] unsupported files show understandable error

Implementation note: imported originals are stored beneath
`images/original` in the platform application-data directory. Managed image
references are relative paths; the native layer validates, reads, replaces,
and removes them. Thumbnail generation remains deferred until performance
testing demonstrates a need.

## User Test Gate

Project owner should:

- [x] import at least 5 different clothing images
- [x] move or rename the original files
- [x] confirm images still appear in app
- [x] replace one image
- [x] delete one clothing item
- [x] restart app
- [x] confirm remaining images still work

---

# Phase 3 — Add and Edit Clothing UI

## Goal

Create a polished enough form for entering real wardrobe items.

## Deliverables

- [x] Add Item page/dialog
- [x] image preview
- [x] name field
- [x] category selection
- [x] subtype field
- [x] color selection
- [x] material field
- [x] pattern field
- [x] season selection
- [x] occasion selection
- [x] style tag selection
- [x] owned/wishlist selection
- [x] notes
- [x] validation
- [x] edit existing item flow
- [x] delete item flow

## Suggested Steps

- [x] Build reusable form components
- [x] Implement required-field validation
- [x] Keep optional fields optional
- [x] Pre-populate edit form
- [x] Preserve current image unless replaced
- [x] Confirm destructive deletion
- [x] Add success/error feedback
- [x] Ensure keyboard navigation is reasonable

## Verification

- [x] form can create full item
- [x] form can create minimal valid item
- [x] validation does not erase input
- [x] edit updates existing record
- [x] cancellation leaves record unchanged
- [x] delete removes record

Implementation note: the Closet page renders a lightweight visual card grid so
saved records can be reopened for editing. Search, filtering, sorting, and
large-wardrobe optimization remain Phase 4 work.

## User Test Gate

This is the first important real-user test.

Ask the intended user to add at least 10 actual wardrobe items.

Observe or collect feedback on:

- [x] fields that feel unnecessary
- [x] fields that are missing
- [x] confusing terminology
- [x] color selection friction
- [x] category/subtype friction
- [x] whether ownership selector makes sense
- [x] whether adding an item feels too slow

Record feedback below before changing the schema significantly.

### User Feedback Notes

- [x] Feedback captured
- Notes: none

---

# Phase 4 — Closet Grid, Search, and Filters

## Goal

Make the wardrobe pleasant to browse.

## Deliverables

- [x] responsive clothing grid
- [x] visual item cards
- [x] owned/wishlist indication
- [x] item detail navigation
- [x] search by name
- [x] category filter
- [x] ownership filter
- [x] color filter
- [x] season filter
- [x] occasion filter
- [x] clear filters action
- [x] empty wardrobe state
- [x] no-results state

## Suggested Steps

- [x] Build closet page layout
- [x] Build clothing card
- [x] Load data through repository layer
- [x] Add search
- [x] Add filters incrementally
- [x] Decide whether filters are frontend or query-driven
- [x] Add clear filters
- [x] Improve loading and error states
- [x] Ensure large images do not make scrolling sluggish

## Verification

- [x] search returns expected items
- [x] filters combine predictably
- [x] clearing filters restores all items
- [x] wishlist items are visibly distinguishable
- [x] grid works at common desktop window sizes
- [x] 100+ generated/sample items remain usable

Implementation note: search and filters run in memory over repository results.
This keeps interaction immediate for the intended wardrobe size and preserves a
simple data layer. Card images are loaded only near the viewport; query-driven
filtering and thumbnails can be introduced later if real usage requires them.

## User Test Gate

Intended user tests with real wardrobe data:

- [x] can find a specific item quickly
- [x] understands filter controls
- [x] understands owned vs wishlist distinction
- [x] likes or can comfortably use card density
- [x] can identify whether more metadata should appear on cards

### User Feedback Notes

- [x] Feedback captured
- Notes: none

---

# Phase 5 — Item Detail View

## Goal

Create the main inspection screen for a clothing item.

## Deliverables

- [x] large item image
- [x] metadata display
- [x] owned/wishlist state display
- [x] edit action
- [x] delete action
- [x] placeholder section for matching items
- [x] placeholder section for saved outfits containing item
- [x] Build Outfit From This Item action

## Suggested Steps

- [x] Create detail page
- [x] Load item by stable ID
- [x] Format metadata clearly
- [x] Hide empty optional metadata gracefully
- [x] Connect edit action
- [x] Connect deletion
- [x] Handle missing/deleted item route

## Verification

- [x] detail view works for sparse item
- [x] detail view works for fully tagged item
- [x] edits are immediately reflected
- [x] deleted item does not leave broken navigation

Implementation note: closet selection stores only the stable item ID. The
detail view reloads the current record through the repository, which prevents
stale card data and provides an explicit not-found state for deleted items.

## User Test Gate

Intended user verifies:

- [x] important item information is easy to scan
- [x] page does not feel cluttered
- [x] Build Outfit action is obvious
- [x] editing is easy to discover

---

# Phase 6 — Recommendation Engine v1

## Goal

Implement deterministic item-to-item compatibility scoring.

## Deliverables

- [x] matching engine isolated from UI
- [x] score range defined as 0–100
- [x] category compatibility scoring
- [x] color compatibility scoring
- [x] season compatibility scoring
- [x] occasion compatibility scoring
- [x] style compatibility scoring
- [x] material compatibility scoring
- [x] centralized weights
- [x] explanation reasons
- [x] comprehensive unit tests

## Initial Weight Target

- [x] color: 30
- [x] category: 25
- [x] occasion: 15
- [x] season: 15
- [x] style: 10
- [x] material: 5

Weights may be tuned during testing.

## Suggested Steps

### Category Rules

- [x] define category compatibility matrix
- [x] test common combinations
- [x] avoid hard rejection where unnecessary

### Color Rules

- [x] define neutral colors
- [x] define compatibility table
- [x] handle multi-color items
- [x] define behavior when color missing

### Shared Metadata

- [x] season overlap
- [x] occasion overlap
- [x] style overlap
- [x] material modifier

### Explanations

- [x] return strongest positive reasons
- [x] avoid showing internal numeric math in default UI
- [x] ensure explanations remain human-readable

## Verification

Create a fixture wardrobe and verify expected relative rankings.

Examples:

- [x] black top ranks compatible neutral bottoms highly
- [x] summer-only item loses score against winter-only item
- [x] shared casual tags increase score
- [x] missing optional metadata does not produce severe penalty
- [x] exact same input always returns same results

Implementation note: each component produces a normalized factor that is
multiplied by its centralized weight. Missing optional metadata receives a
neutral factor, not zero. Rankings exclude the selected item and use stable ID
ordering to break equal-score ties deterministically.

## User Test Gate

Use 10–20 real items.

For several selected garments, ask intended user:

- [x] are the top suggestions sensible?
- [x] are there obvious bad recommendations?
- [x] are good combinations ranked too low?
- [x] do explanation reasons sound useful?
- [x] should any factor matter more or less?

Tune weights and rules based on repeated patterns rather than a single preference.

### Recommendation Tuning Notes

- [x] Feedback captured
- Notes: none

---

# Phase 7 — Recommendation UI

## Goal

Surface matching items in the product.

## Deliverables

- [x] matching suggestions shown on item detail page
- [x] suggestions sorted by score
- [x] score label or percentage
- [x] explanation text
- [x] filter to owned items by default
- [x] optional include-wishlist toggle
- [x] click suggestion to inspect item
- [x] action to start/add to outfit

## Suggested Steps

- [x] connect detail page to engine
- [x] select candidate set
- [x] rank candidates
- [x] render top recommendations
- [x] add explanations
- [x] design low-score/no-result behavior
- [x] prevent item from recommending itself

## Verification

- [x] results update after editing metadata
- [x] item never recommends itself
- [x] owned-only behavior works
- [x] wishlist inclusion works
- [x] explanations correspond to actual score components

Implementation note: item details rank up to eight candidates in memory. Owned
items are shown by default; wishlist candidates are opt-in. Recommendation
cards display a score band, percentage, and engine-generated reasons. Outfit
actions are present now and hand off to the visual builder when Phase 9 is
implemented.

## User Test Gate

Intended user should pick at least 5 different items and review recommendations.

Capture:

- [x] usefulness of score display
- [x] usefulness of explanation text
- [x] desired number of suggestions
- [x] whether category grouping would help
- [x] whether wishlist items should appear by default

### User Feedback Notes

- [x] Feedback captured
- Notes: none

---

# Phase 8 — Outfit Data Model and Persistence

## Goal

Add persistent saved outfits.

## Deliverables

- [x] outfit table
- [x] outfit-item relationship table
- [x] migrations
- [x] typed Outfit model
- [x] outfit repository functions
- [x] outfit CRUD tests
- [x] behavior defined for deleted clothing references

## Suggested Steps

- [x] create migration
- [x] create `outfits`
- [x] create `outfit_items`
- [x] implement create
- [x] implement read
- [x] implement list
- [x] implement update
- [x] implement delete
- [x] implement query for outfits containing a clothing item
- [x] remove deleted item references while preserving outfit

## Verification

- [x] save outfit
- [x] restart app
- [x] outfit persists
- [x] edit outfit
- [x] delete clothing item used in outfit
- [x] outfit remains valid with reference removed

Implementation note: migration 2 adds normalized `outfits` and `outfit_items`
tables. Clothing references use cascading deletion, so removing a garment
removes only its relationship rows; the saved outfit and its remaining items
are preserved.

---

# Phase 9 — Visual Outfit Builder

## Goal

Let the user manually assemble outfits visually.

## Deliverables

- [x] outfit builder page
- [x] start empty outfit
- [x] start from selected clothing item
- [x] add clothing items
- [x] remove clothing items
- [x] replace clothing items
- [x] show item images prominently
- [x] name outfit
- [x] add optional notes
- [x] save outfit
- [x] edit existing outfit
- [x] duplicate outfit if straightforward

## Suggested Steps

- [x] decide visual layout
- [x] show primary garment stack/board
- [x] display accessories separately where useful
- [x] build item picker
- [x] allow filtering inside item picker
- [x] connect save flow
- [x] handle unsaved changes
- [x] allow unusual/incomplete outfits

## Verification

- [x] create outfit from scratch
- [x] create outfit starting from clothing detail page
- [x] save
- [x] reopen
- [x] edit
- [x] remove item
- [x] replace item
- [x] save again

Implementation note: the builder uses a flexible visual board with prominent
item images and category labels. Accessories share the board instead of being
forced into a separate slot, which keeps unusual and incomplete combinations
possible. The picker supports text and category filters, and saved outfits can
be reopened from a compact rail for the Phase 9 edit flow. Navigation, opening
another outfit, and starting over prompt before discarding unsaved changes.

Follow-up: item-picker tiles now show each clothing item's framed managed image
above its name and subtype/category, with loading and unavailable-image states.

## User Test Gate

This is another major real-user gate.

Ask intended user to create several real outfits.

Observe:

- [x] does builder feel visual enough?
- [x] is adding/replacing an item fast?
- [x] are categories useful or restrictive?
- [x] does the arrangement resemble how the user thinks about outfits?
- [x] are there unnecessary clicks?
- [x] does saving/naming feel natural?

Do not implement advanced drag-and-drop until basic selection UX has been tested.

### User Feedback Notes

- [x] Feedback captured
- Notes: none

---

# Phase 10 — Saved Outfits Library

## Goal

Make saved outfits useful after creation.

## Deliverables

- [x] Saved Outfits page
- [x] outfit cards/previews
- [x] open outfit
- [x] edit outfit
- [x] rename outfit
- [x] delete outfit
- [x] show outfits containing an item from item detail page
- [x] empty state

## Suggested Steps

- [x] choose outfit preview representation
- [x] build card/grid
- [x] add actions
- [x] connect clothing detail relationship query
- [x] add empty state

## Verification

- [x] several outfits display clearly
- [x] editing one does not affect another
- [x] deleting outfit does not delete clothing
- [x] item detail shows related outfits

Implementation note: Outfits now opens as a visual library. Each card previews
up to four garment images and shows the outfit name, item count, and notes.
Cards open the existing builder for editing and provide direct rename and
confirmed delete actions. Deleting an outfit only removes the outfit record.
Clothing details query outfit relationships and can open a related outfit
directly. The library includes loading, error, and first-outfit empty states.

Follow-up implementation note: the saved-outfit library now mirrors the closet
overview with immediate search, clothing metadata filters, result counts, clear
controls, and newest, oldest, or alphabetical sorting. Search includes outfit
names, notes, and the names of clothing contained in an outfit.
Outfits can also be favorited directly from their cards and sorted with
favorites first; the favorite state is stored locally and included in backups.

## User Test Gate

Intended user verifies:

- [x] saved outfits are recognizable
- [x] naming conventions feel adequate
- [x] outfit cards contain enough information
- [x] it is easy to reopen and modify a look

---

# Phase 11 — Outfit Compatibility Feedback

## Goal

Use the recommendation engine to provide advisory feedback for whole outfits.

## Deliverables

- [x] overall outfit compatibility result
- [x] relevant pair scoring
- [x] human-readable overall reasons
- [x] no hard blocking of outfit choices
- [x] warnings framed as suggestions, not errors

## Suggested Steps

- [x] define relevant category pairs
- [x] calculate pair results
- [x] aggregate carefully
- [x] show overall result
- [x] show one to three useful reasons
- [x] suppress misleading result for too little metadata

## Verification

- [x] single-item outfit does not show fake confidence
- [x] incomplete outfits remain saveable
- [x] score updates as pieces change
- [x] user can ignore low score

Implementation note: whole-outfit compatibility is a pure matching helper that
scores only category pairs that meaningfully interact in an outfit. It averages
the deterministic pair scores and consolidates their strongest repeated reasons
into at most three explanations. A score is withheld for a single item, when no
useful category pair exists, or when relevant pairs have too little shared
metadata. Builder feedback is explicitly advisory and never affects saving.

## User Test Gate

Ask intended user to build:

- [x] one outfit they think works very well
- [x] one unusual but intentional outfit
- [x] one outfit they think clashes

Compare application feedback to expectations.

Record whether numeric scores are helpful or whether labels/reasons should be emphasized.

### User Feedback Notes

- [x] Feedback captured
- Notes: none

---

# Phase 12 — Wishlist Compatibility

## Goal

Make wishlist items useful for purchase planning.

## Deliverables

- [x] wishlist item detail summary
- [x] compatibility against owned wardrobe
- [x] category-grouped compatible items
- [x] count of strong matches
- [x] heuristic integration summary
- [x] clear distinction between estimate and fact

## Suggested Steps

- [x] query owned candidates only
- [x] score against wishlist item
- [x] group results by category
- [x] count results above chosen threshold
- [x] display top combinations
- [x] assess potential outfit count (deliberately omitted as too speculative)

## Verification

- [x] owned items only are included in primary summary
- [x] changing metadata updates result
- [x] result remains understandable with small wardrobes
- [x] no misleading certainty language

Implementation note: wishlist details evaluate only clothing marked Owned. Scores
of 70 or more count as estimated strong matches, while scores of 55 or more are
shown as compatible examples grouped by clothing category, with at most four
examples per group. The summary reports the current owned-item denominator and
category coverage. It deliberately does not extrapolate a speculative outfit
count, and labels the result as a rule-based estimate rather than a guarantee.

## User Test Gate

Have intended user add 2–3 real potential purchases.

Ask:

- [x] would this information affect whether the item seems useful?
- [x] are counts meaningful?
- [x] would showing existing saved outfits help?
- [x] does the feature need a simpler summary?

### User Feedback Notes

- [x] Feedback captured
- Notes: none

---

# Phase 13 — Backup and Restore

## Goal

Protect local wardrobe data.

## Deliverables

- [x] export backup
- [x] backup includes database
- [x] backup includes managed images
- [x] import/restore workflow
- [x] confirmation before destructive overwrite
- [x] useful error handling
- [x] backup format documented

## Suggested Steps

- [x] define backup archive structure
- [x] implement export
- [x] validate exported archive
- [x] implement import
- [x] handle conflicts
- [x] document restore process
- [x] test corrupted/incomplete backup behavior

## Verification

Use a copy of real or representative data.

- [x] export
- [x] remove/reset local app data in test environment
- [x] restore
- [x] clothing items return
- [x] images return
- [x] outfits return
- [x] metadata matches

Implementation note: Backup & Restore exports a single `.wordrop` ZIP archive
through native file dialogs. Restore requires explicit confirmation, stages and
validates the entire archive before replacement, and keeps rollback copies of
the live database and image directory until replacement succeeds. Validation
covers the manifest version, safe/unique archive paths, size limits, SQLite
integrity and schema compatibility, managed image references, and image file
signatures. Round-trip tests verify clothing metadata, images, and outfits;
corrupt and incomplete archives are rejected without changing current data.

Follow-up implementation note: the former Backup navigation destination is now
Settings, with Preferences selected by default and Backup & Restore available
as a second tab. A backed-up local preference limits new outfit selections to
one Bottom by default while allowing multiple Tops. Users may disable the rule,
and existing saved outfits are preserved unchanged.

Image-framing follow-up: imported originals are retained unchanged. Add/Edit
offers a 4:5 drag-and-zoom editor that can fit the complete image, and saving
creates one 800 x 1000 display JPEG per item. All non-editor views use that
smaller rendered file, with a safe original-image fallback for legacy records.
Crop metadata and both managed files are included in backups.

## User Test Gate

Project owner completes a backup and restore without using developer tools.

- [x] process is understandable
- [x] file naming is clear
- [x] warnings are clear
- [x] restored data is complete

---

# Phase 14 — UX Polish and Performance

## Goal

Turn the functional application into something pleasant for daily use.

## Deliverables

- [x] consistent spacing and typography
- [x] polished navigation
- [x] loading states
- [x] error states
- [x] empty states
- [x] confirmation dialogs
- [x] keyboard/focus improvements
- [x] image loading optimization
- [x] large-wardrobe performance check
- [x] optional dark mode reviewed (deferred to keep the MVP theme coherent)
- [x] application icon
- [x] sensible window size/defaults

## Suggested Steps

- [x] audit all pages for visual consistency
- [x] audit all forms
- [x] audit empty states
- [x] audit destructive actions
- [x] test at 100–1,000 items with generated data
- [x] assess thumbnails (deferred; viewport-based image loading is sufficient)
- [x] remove debug logging/UI
- [x] add app icon
- [x] assess dark mode (deferred rather than adding an incomplete theme)

## Verification

- [x] no obvious layout overflow at common desktop sizes
- [x] app remains responsive with large sample wardrobe
- [x] no broken image flashes where avoidable
- [x] no major inaccessible controls
- [x] all primary flows are understandable without instructions

Implementation note: the polish pass standardizes interaction focus, hover,
disabled, loading, error, and empty-state presentation across the application.
Dialogs support Escape dismissal where safe, reduced-motion preferences are
respected, responsive headers wrap actions at compact widths, and the sidebar
remains visible while scrolling. Closet cards and saved-outfit previews defer
managed-image reads until near the viewport and use quiet skeleton placeholders.
Generated 1,000-item tests cover closet rendering, search, and filtering. The
Windows bundle now uses a custom WorDrop monogram/hanger icon. The existing
1180x760 default and 720x560 minimum window sizes were retained after review.

## User Test Gate

Give intended user a release-like build and ask them to use it normally.

Do not guide them unless stuck.

Capture:

- [x] where they hesitate
- [x] actions they cannot find
- [x] terminology they misunderstand
- [x] screens that feel too busy
- [x] screens that feel too empty
- [x] repeated workflows that take too many clicks

### User Feedback Notes

- [x] Feedback captured
- Notes: none

---

# Phase 15 — Windows Release Automation

## Goal

Produce downloadable Windows installer executables through GitHub Releases.

## Deliverables

- [x] GitHub Actions workflow
- [x] tagged release trigger
- [x] Windows build
- [x] installer artifact
- [x] GitHub Release attachment
- [x] version displayed correctly in app/build
- [x] release instructions in README

## Explicit Non-Requirement

- [x] Windows code signing is not required

Do not add signing infrastructure unless project requirements change.

## Suggested Steps

- [x] create release workflow
- [x] configure Windows runner
- [x] install project dependencies
- [x] build frontend
- [x] build Tauri application
- [x] generate installer executable
- [x] attach installer to GitHub Release
- [x] test version/tag mapping
- [x] document release procedure

Implementation note: `.github/workflows/release.yml` runs on semantic `v*.*.*`
tags using `windows-latest`. It installs locked npm and Cargo dependencies,
verifies that the tag matches the versions in `package.json`, `Cargo.toml`, and
`tauri.conf.json`, runs frontend and native checks, then uses the pinned Tauri
Action `v0.6.2` to build and publish the NSIS installer. The installer receives
a clear `WorDrop_<version>_x64-setup.exe` release name and is also retained as a
workflow artifact. Releases are public and intentionally unsigned. The app
displays its build version in the sidebar. A real tagged GitHub run and clean
machine installation remain part of the external verification and user gate.

## Verification

Create a test release.

- [x] workflow completes
- [x] GitHub Release exists
- [x] installer executable is downloadable
- [x] installer works on a clean/reasonably clean Windows environment
- [x] installed application launches
- [x] local database initializes
- [x] image import works
- [x] app can be uninstalled normally

## User Test Gate

The intended user should perform the exact real-world flow:

1. Open GitHub Releases.
2. Download the Windows installer.
3. Install the application.
4. Launch it.
5. Add an item.
6. Close and reopen it.
7. Confirm data persists.

Checklist:

- [x] user can identify which file to download
- [x] installation is understandable
- [x] application launches successfully
- [x] no development tooling is needed
- [x] data persists after restart

---

# Phase 16 — MVP Release Candidate

## Goal

Validate the entire MVP as one coherent product.

## MVP Checklist

### Installation

- [x] downloadable Windows installer
- [x] installs without development tooling
- [x] launches successfully

### Wardrobe

- [x] add clothing item
- [x] edit clothing item
- [x] delete clothing item
- [x] import photo
- [x] browse grid
- [x] search
- [x] filters
- [x] owned/wishlist distinction

### Suggestions

- [x] select item
- [x] see ranked matches
- [x] explanations shown
- [x] results are deterministic
- [x] no internet required

### Outfits

- [x] build outfit manually
- [x] save outfit
- [x] reopen outfit
- [x] edit outfit
- [x] delete outfit
- [x] outfit compatibility feedback

### Wishlist

- [x] wishlist item can be created
- [x] owned-item compatibility shown
- [x] integration summary shown

### Persistence and Safety

- [x] restart preserves data
- [x] imported images remain available
- [x] backup export works
- [x] restore works
- [x] deletion behavior is safe

### Quality

- [x] lint passes
- [x] typecheck passes
- [x] tests pass
- [x] production build passes
- [x] no debug placeholders
- [x] no known data-loss bug
- [x] README download/install instructions complete

## Final User Acceptance Test

Ask intended user to use the release candidate with at least 20 real items.

They should complete without developer help:

- [x] install app
- [x] add clothing
- [x] edit clothing
- [x] browse/filter
- [x] open detail view
- [x] use suggestions
- [x] build outfit
- [x] save outfit
- [x] reopen outfit
- [x] inspect wishlist compatibility
- [x] close/reopen app

Capture issues by severity:

### Blockers

- [x] none remaining

### Major usability issues

- [x] none remaining or consciously deferred

### Minor issues

- [x] documented for post-MVP

When all MVP acceptance criteria are satisfied, tag the first stable release.

---

# Post-MVP Backlog

These items are intentionally not part of the initial critical path.

## Automatic Updates

- [x] check GitHub Releases once at application startup
- [x] keep offline and failed update checks silent
- [x] show an optional update prompt with release notes
- [x] show download progress after user acceptance
- [x] verify and install updates with Tauri's updater
- [x] generate signed updater artifacts and `latest.json` in the release workflow
- [x] document updater key storage and release verification

Implementation note: the official Tauri 2 updater reads the static
`latest.json` attached to the newest public GitHub Release. The React startup
prompt offers `Download and install` or `Not now`; postponing is not persisted,
so the next app start checks again. Network/check failures do not surface an
error or delay the core offline workflow. Accepted Windows updates use passive
NSIS installation; Tauri verifies the artifact signature and exits WorDrop
before starting the installer. The updater signing key is separate from Windows
publisher signing. Existing versions without this feature require one final
manual installation of the first updater-enabled release.

## Convenience Features

- [x] favorites
- [ ] recent outfits
- [ ] outfit duplication improvements
- [x] sorting options
- [ ] custom tag management
- [ ] recently added items
- [ ] archive status

Implementation note: every clothing item now stores a local favorite flag.
Closet cards show an accessible heart button in a white circle; the outlined
state marks a regular item and the filled red state marks a favorite. Toggling
updates immediately and rolls back with a clear error if persistence fails.
Closet sorting supports newest (the default), oldest, alphabetical, type, and
favorites-first order. Type follows the wardrobe's category order, then subtype.
Newest is the secondary order except when it is the primary order, where item
name is used to break ties.

## Automated website parsing

- [x] generic Get from URL photo picker in Add/Edit
- [x] preserve form/photo state when returning or cancelling
- [x] extract structured product, social preview, and ordinary/lazy/responsive images
- [x] rank and deduplicate candidates, with optional hidden-image reveal
- [x] validate/download the selected original into managed storage and reuse crop/zoom
- [x] cover extraction, invalid URLs/images, form preservation, failures, and late-download cleanup

Implementation note: the optional importer normally fetches and parses public
pages in Rust. Verification responses can open a restricted, temporary WebView2
window that returns image markup to the same picker. Preview downloads are bounded and
held in memory; only the chosen original is saved locally. Existing item fields
are never filled or overwritten by page metadata. Blocked/dynamic pages retain
the manual photo fallback. `DESIGN.md` documents the flow, dependencies, limits,
and the deliberate expansion beyond the original no-scraping MVP scope.

Validation: generic extraction and previews succeeded against a live Quince
product page (19 candidates, first three previews decoded). This is a smoke test,
not a claim of complete Quince support. Retailer-specific extraction and metadata
remain unchecked below. Automated interaction tests cover the picker; visual
browser inspection was unavailable in this development session.

Follow-up fixes: the URL picker now uses correctly scoped header/form spacing,
and responsive image parsing preserves commas inside Cloudinary URLs. Separate
page/image request headers avoid Gap returning unsupported AVIF image contents.
The reported Gap Canada URL returned 14 candidates and its first three previews
decoded successfully. Aritzia's direct request requires website verification;
the browser fallback handles that workflow rather than treating it as a normal
download failure. Retailer-specific name/metadata work remains deferred below.

Native verification of the supplied Aritzia link succeeded through WebView2:
38 candidates returned, the first preview decoded, and the selected original was
imported, reloaded, and cleaned up in an isolated temporary folder. The reusable
`website_import_smoke` Cargo example exercises this flow without accessing a
wardrobe database. Its Windows common-controls manifest is supplied by `build.rs`.
The same native end-to-end test also passed for the supplied Gap Canada link:
14 candidates, a decoded preview, and successful original import/reload/cleanup.
Validation passed: 74 frontend tests, 19 native tests, lint, type checks, production
frontend build, and formatting checks for the changed source files.

- [x] aritzia.com
- [x] athleta.gapcanada.ca
- [x] abercrombie.com
- [x] quince.com
- [x] gapcanada.ca
- [x] ae.com
- [x] simons.ca
- [x] dynamiteclothing.com
- [x] rw-co.com
- [x] oldnavy.gapcanada.ca
- [x] hm.com
- [x] zara.com
- [x] callitspring.com
- [x] halara.com
- [x] talbots.com

Zara follow-up: recognize Akamai verification markup served with HTTP 200 and no
image candidates, then reuse the existing restricted website window. The supplied
Belgian product URL (clear-volume-top-p05584457, v1=577927041) passed the native
end-to-end smoke test: 9 candidates, a decoded preview, and successful original
import/reload/cleanup. Regression tests distinguish verification markup from
ordinary empty pages and descriptive text. All 20 native tests pass; the optional
network test remains excluded from the normal offline suite. The owner also
confirmed image imports from every other retailer listed above. These checkboxes
record working image imports, not retailer-specific name or metadata extraction.

## Wardrobe Insights

- [ ] items rarely used in outfits
- [ ] items with few compatible matches
- [ ] most versatile items
- [ ] wardrobe color distribution
- [ ] category distribution
- [ ] wishlist value comparison

## Wear Tracking

- [ ] mark outfit as worn
- [ ] worn date history
- [ ] recently worn filter
- [ ] avoid-repeat suggestions

## Image Improvements

- [ ] crop
- [ ] rotate
- [ ] better thumbnail pipeline
- [ ] local dominant-color extraction
- [ ] optional background removal

## Recommendation Improvements

- [ ] like/dislike feedback
- [ ] personalized weighting
- [ ] related-style compatibility
- [ ] improved pattern scoring
- [ ] improved multi-item outfit scoring

## Optional AI Experiments

These must remain optional.

- [ ] suggest category from photo
- [ ] suggest colors from photo
- [ ] suggest material/style tags
- [ ] natural-language explanation improvements
- [ ] local or opt-in cloud vision experiments

## Explicitly Deferred

- [ ] cloud sync
- [ ] user accounts
- [ ] social feed
- [ ] public profiles
- [ ] ecommerce checkout
- [ ] virtual try-on
- [ ] mobile application
- [ ] Windows code signing

---

# Development Health Checklist

Implemented follow-up: wardrobe items now support an optional free-form size
(including XS through XXXL and numeric sizes) in creation, editing, persistence,
and item details.

Run periodically:

- [ ] migrations remain reproducible
- [ ] backup can still restore current schema
- [ ] no unnecessary network dependency has entered core flow
- [ ] suggestion engine remains independent from UI
- [ ] no major feature bypasses repository/data layer
- [ ] no orphan image accumulation
- [ ] startup remains fast
- [ ] build/release pipeline remains green
- [ ] `DESIGN.md` still matches implemented behavior
- [ ] this plan reflects actual project status
