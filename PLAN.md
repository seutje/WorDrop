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

- [ ] file picker for supported images
- [ ] JPEG support
- [ ] PNG support
- [ ] WebP support if straightforward
- [ ] imported image copied to application data directory
- [ ] unique managed filenames
- [ ] source image remains untouched
- [ ] stored item references managed image
- [ ] replacement image flow
- [ ] cleanup when item/image is removed
- [ ] image error handling

## Suggested Steps

- [ ] Implement image picker
- [ ] Validate extension/type
- [ ] Create image storage directory
- [ ] Generate unique filename
- [ ] Copy selected image
- [ ] Return stable internal reference
- [ ] Render imported image in frontend
- [ ] Handle missing image file
- [ ] Implement replace-image behavior
- [ ] Implement managed-image cleanup
- [ ] Add tests for path/filename utilities

## Optional Optimization

Do only if needed:

- [ ] generate thumbnails
- [ ] cache thumbnails

## Verification

- [ ] importing an image does not alter source image
- [ ] item still displays if source image is moved/deleted
- [ ] replacing image does not leave obvious orphan files
- [ ] deleting item removes unreferenced managed image
- [ ] unsupported files show understandable error

## User Test Gate

Project owner should:

- [ ] import at least 5 different clothing images
- [ ] move or rename the original files
- [ ] confirm images still appear in app
- [ ] replace one image
- [ ] delete one clothing item
- [ ] restart app
- [ ] confirm remaining images still work

---

# Phase 3 — Add and Edit Clothing UI

## Goal

Create a polished enough form for entering real wardrobe items.

## Deliverables

- [ ] Add Item page/dialog
- [ ] image preview
- [ ] name field
- [ ] category selection
- [ ] subtype field
- [ ] color selection
- [ ] material field
- [ ] pattern field
- [ ] season selection
- [ ] occasion selection
- [ ] style tag selection
- [ ] owned/wishlist selection
- [ ] notes
- [ ] validation
- [ ] edit existing item flow
- [ ] delete item flow

## Suggested Steps

- [ ] Build reusable form components
- [ ] Implement required-field validation
- [ ] Keep optional fields optional
- [ ] Pre-populate edit form
- [ ] Preserve current image unless replaced
- [ ] Confirm destructive deletion
- [ ] Add success/error feedback
- [ ] Ensure keyboard navigation is reasonable

## Verification

- [ ] form can create full item
- [ ] form can create minimal valid item
- [ ] validation does not erase input
- [ ] edit updates existing record
- [ ] cancellation leaves record unchanged
- [ ] delete removes record

## User Test Gate

This is the first important real-user test.

Ask the intended user to add at least 10 actual wardrobe items.

Observe or collect feedback on:

- [ ] fields that feel unnecessary
- [ ] fields that are missing
- [ ] confusing terminology
- [ ] color selection friction
- [ ] category/subtype friction
- [ ] whether ownership selector makes sense
- [ ] whether adding an item feels too slow

Record feedback below before changing the schema significantly.

### User Feedback Notes

- [ ] Feedback captured
- Notes:

---

# Phase 4 — Closet Grid, Search, and Filters

## Goal

Make the wardrobe pleasant to browse.

## Deliverables

- [ ] responsive clothing grid
- [ ] visual item cards
- [ ] owned/wishlist indication
- [ ] item detail navigation
- [ ] search by name
- [ ] category filter
- [ ] ownership filter
- [ ] color filter
- [ ] season filter
- [ ] occasion filter
- [ ] clear filters action
- [ ] empty wardrobe state
- [ ] no-results state

## Suggested Steps

- [ ] Build closet page layout
- [ ] Build clothing card
- [ ] Load data through repository layer
- [ ] Add search
- [ ] Add filters incrementally
- [ ] Decide whether filters are frontend or query-driven
- [ ] Add clear filters
- [ ] Improve loading and error states
- [ ] Ensure large images do not make scrolling sluggish

## Verification

- [ ] search returns expected items
- [ ] filters combine predictably
- [ ] clearing filters restores all items
- [ ] wishlist items are visibly distinguishable
- [ ] grid works at common desktop window sizes
- [ ] 100+ generated/sample items remain usable

## User Test Gate

Intended user tests with real wardrobe data:

- [ ] can find a specific item quickly
- [ ] understands filter controls
- [ ] understands owned vs wishlist distinction
- [ ] likes or can comfortably use card density
- [ ] can identify whether more metadata should appear on cards

### User Feedback Notes

- [ ] Feedback captured
- Notes:

---

# Phase 5 — Item Detail View

## Goal

Create the main inspection screen for a clothing item.

## Deliverables

- [ ] large item image
- [ ] metadata display
- [ ] owned/wishlist state display
- [ ] edit action
- [ ] delete action
- [ ] placeholder section for matching items
- [ ] placeholder section for saved outfits containing item
- [ ] Build Outfit From This Item action

## Suggested Steps

- [ ] Create detail page
- [ ] Load item by stable ID
- [ ] Format metadata clearly
- [ ] Hide empty optional metadata gracefully
- [ ] Connect edit action
- [ ] Connect deletion
- [ ] Handle missing/deleted item route

## Verification

- [ ] detail view works for sparse item
- [ ] detail view works for fully tagged item
- [ ] edits are immediately reflected
- [ ] deleted item does not leave broken navigation

## User Test Gate

Intended user verifies:

- [ ] important item information is easy to scan
- [ ] page does not feel cluttered
- [ ] Build Outfit action is obvious
- [ ] editing is easy to discover

---

# Phase 6 — Recommendation Engine v1

## Goal

Implement deterministic item-to-item compatibility scoring.

## Deliverables

- [ ] matching engine isolated from UI
- [ ] score range defined as 0–100
- [ ] category compatibility scoring
- [ ] color compatibility scoring
- [ ] season compatibility scoring
- [ ] occasion compatibility scoring
- [ ] style compatibility scoring
- [ ] material compatibility scoring
- [ ] centralized weights
- [ ] explanation reasons
- [ ] comprehensive unit tests

## Initial Weight Target

- [ ] color: 30
- [ ] category: 25
- [ ] occasion: 15
- [ ] season: 15
- [ ] style: 10
- [ ] material: 5

Weights may be tuned during testing.

## Suggested Steps

### Category Rules

- [ ] define category compatibility matrix
- [ ] test common combinations
- [ ] avoid hard rejection where unnecessary

### Color Rules

- [ ] define neutral colors
- [ ] define compatibility table
- [ ] handle multi-color items
- [ ] define behavior when color missing

### Shared Metadata

- [ ] season overlap
- [ ] occasion overlap
- [ ] style overlap
- [ ] material modifier

### Explanations

- [ ] return strongest positive reasons
- [ ] avoid showing internal numeric math in default UI
- [ ] ensure explanations remain human-readable

## Verification

Create a fixture wardrobe and verify expected relative rankings.

Examples:

- [ ] black top ranks compatible neutral bottoms highly
- [ ] summer-only item loses score against winter-only item
- [ ] shared casual tags increase score
- [ ] missing optional metadata does not produce severe penalty
- [ ] exact same input always returns same results

## User Test Gate

Use 10–20 real items.

For several selected garments, ask intended user:

- [ ] are the top suggestions sensible?
- [ ] are there obvious bad recommendations?
- [ ] are good combinations ranked too low?
- [ ] do explanation reasons sound useful?
- [ ] should any factor matter more or less?

Tune weights and rules based on repeated patterns rather than a single preference.

### Recommendation Tuning Notes

- [ ] Feedback captured
- Notes:

---

# Phase 7 — Recommendation UI

## Goal

Surface matching items in the product.

## Deliverables

- [ ] matching suggestions shown on item detail page
- [ ] suggestions sorted by score
- [ ] score label or percentage
- [ ] explanation text
- [ ] filter to owned items by default
- [ ] optional include-wishlist toggle
- [ ] click suggestion to inspect item
- [ ] action to start/add to outfit

## Suggested Steps

- [ ] connect detail page to engine
- [ ] select candidate set
- [ ] rank candidates
- [ ] render top recommendations
- [ ] add explanations
- [ ] design low-score/no-result behavior
- [ ] prevent item from recommending itself

## Verification

- [ ] results update after editing metadata
- [ ] item never recommends itself
- [ ] owned-only behavior works
- [ ] wishlist inclusion works
- [ ] explanations correspond to actual score components

## User Test Gate

Intended user should pick at least 5 different items and review recommendations.

Capture:

- [ ] usefulness of score display
- [ ] usefulness of explanation text
- [ ] desired number of suggestions
- [ ] whether category grouping would help
- [ ] whether wishlist items should appear by default

### User Feedback Notes

- [ ] Feedback captured
- Notes:

---

# Phase 8 — Outfit Data Model and Persistence

## Goal

Add persistent saved outfits.

## Deliverables

- [ ] outfit table
- [ ] outfit-item relationship table
- [ ] migrations
- [ ] typed Outfit model
- [ ] outfit repository functions
- [ ] outfit CRUD tests
- [ ] behavior defined for deleted clothing references

## Suggested Steps

- [ ] create migration
- [ ] create `outfits`
- [ ] create `outfit_items`
- [ ] implement create
- [ ] implement read
- [ ] implement list
- [ ] implement update
- [ ] implement delete
- [ ] implement query for outfits containing a clothing item
- [ ] remove deleted item references while preserving outfit

## Verification

- [ ] save outfit
- [ ] restart app
- [ ] outfit persists
- [ ] edit outfit
- [ ] delete clothing item used in outfit
- [ ] outfit remains valid with reference removed

---

# Phase 9 — Visual Outfit Builder

## Goal

Let the user manually assemble outfits visually.

## Deliverables

- [ ] outfit builder page
- [ ] start empty outfit
- [ ] start from selected clothing item
- [ ] add clothing items
- [ ] remove clothing items
- [ ] replace clothing items
- [ ] show item images prominently
- [ ] name outfit
- [ ] add optional notes
- [ ] save outfit
- [ ] edit existing outfit
- [ ] duplicate outfit if straightforward

## Suggested Steps

- [ ] decide visual layout
- [ ] show primary garment stack/board
- [ ] display accessories separately where useful
- [ ] build item picker
- [ ] allow filtering inside item picker
- [ ] connect save flow
- [ ] handle unsaved changes
- [ ] allow unusual/incomplete outfits

## Verification

- [ ] create outfit from scratch
- [ ] create outfit starting from clothing detail page
- [ ] save
- [ ] reopen
- [ ] edit
- [ ] remove item
- [ ] replace item
- [ ] save again

## User Test Gate

This is another major real-user gate.

Ask intended user to create several real outfits.

Observe:

- [ ] does builder feel visual enough?
- [ ] is adding/replacing an item fast?
- [ ] are categories useful or restrictive?
- [ ] does the arrangement resemble how the user thinks about outfits?
- [ ] are there unnecessary clicks?
- [ ] does saving/naming feel natural?

Do not implement advanced drag-and-drop until basic selection UX has been tested.

### User Feedback Notes

- [ ] Feedback captured
- Notes:

---

# Phase 10 — Saved Outfits Library

## Goal

Make saved outfits useful after creation.

## Deliverables

- [ ] Saved Outfits page
- [ ] outfit cards/previews
- [ ] open outfit
- [ ] edit outfit
- [ ] rename outfit
- [ ] delete outfit
- [ ] show outfits containing an item from item detail page
- [ ] empty state

## Suggested Steps

- [ ] choose outfit preview representation
- [ ] build card/grid
- [ ] add actions
- [ ] connect clothing detail relationship query
- [ ] add empty state

## Verification

- [ ] several outfits display clearly
- [ ] editing one does not affect another
- [ ] deleting outfit does not delete clothing
- [ ] item detail shows related outfits

## User Test Gate

Intended user verifies:

- [ ] saved outfits are recognizable
- [ ] naming conventions feel adequate
- [ ] outfit cards contain enough information
- [ ] it is easy to reopen and modify a look

---

# Phase 11 — Outfit Compatibility Feedback

## Goal

Use the recommendation engine to provide advisory feedback for whole outfits.

## Deliverables

- [ ] overall outfit compatibility result
- [ ] relevant pair scoring
- [ ] human-readable overall reasons
- [ ] no hard blocking of outfit choices
- [ ] warnings framed as suggestions, not errors

## Suggested Steps

- [ ] define relevant category pairs
- [ ] calculate pair results
- [ ] aggregate carefully
- [ ] show overall result
- [ ] show one to three useful reasons
- [ ] suppress misleading result for too little metadata

## Verification

- [ ] single-item outfit does not show fake confidence
- [ ] incomplete outfits remain saveable
- [ ] score updates as pieces change
- [ ] user can ignore low score

## User Test Gate

Ask intended user to build:

- [ ] one outfit they think works very well
- [ ] one unusual but intentional outfit
- [ ] one outfit they think clashes

Compare application feedback to expectations.

Record whether numeric scores are helpful or whether labels/reasons should be emphasized.

### User Feedback Notes

- [ ] Feedback captured
- Notes:

---

# Phase 12 — Wishlist Compatibility

## Goal

Make wishlist items useful for purchase planning.

## Deliverables

- [ ] wishlist item detail summary
- [ ] compatibility against owned wardrobe
- [ ] category-grouped compatible items
- [ ] count of strong matches
- [ ] heuristic integration summary
- [ ] clear distinction between estimate and fact

## Suggested Steps

- [ ] query owned candidates only
- [ ] score against wishlist item
- [ ] group results by category
- [ ] count results above chosen threshold
- [ ] display top combinations
- [ ] optionally estimate potential outfit count conservatively

## Verification

- [ ] owned items only are included in primary summary
- [ ] changing metadata updates result
- [ ] result remains understandable with small wardrobes
- [ ] no misleading certainty language

## User Test Gate

Have intended user add 2–3 real potential purchases.

Ask:

- [ ] would this information affect whether the item seems useful?
- [ ] are counts meaningful?
- [ ] would showing existing saved outfits help?
- [ ] does the feature need a simpler summary?

### User Feedback Notes

- [ ] Feedback captured
- Notes:

---

# Phase 13 — Backup and Restore

## Goal

Protect local wardrobe data.

## Deliverables

- [ ] export backup
- [ ] backup includes database
- [ ] backup includes managed images
- [ ] import/restore workflow
- [ ] confirmation before destructive overwrite
- [ ] useful error handling
- [ ] backup format documented

## Suggested Steps

- [ ] define backup archive structure
- [ ] implement export
- [ ] validate exported archive
- [ ] implement import
- [ ] handle conflicts
- [ ] document restore process
- [ ] test corrupted/incomplete backup behavior

## Verification

Use a copy of real or representative data.

- [ ] export
- [ ] remove/reset local app data in test environment
- [ ] restore
- [ ] clothing items return
- [ ] images return
- [ ] outfits return
- [ ] metadata matches

## User Test Gate

Project owner completes a backup and restore without using developer tools.

- [ ] process is understandable
- [ ] file naming is clear
- [ ] warnings are clear
- [ ] restored data is complete

---

# Phase 14 — UX Polish and Performance

## Goal

Turn the functional application into something pleasant for daily use.

## Deliverables

- [ ] consistent spacing and typography
- [ ] polished navigation
- [ ] loading states
- [ ] error states
- [ ] empty states
- [ ] confirmation dialogs
- [ ] keyboard/focus improvements
- [ ] image loading optimization
- [ ] large-wardrobe performance check
- [ ] optional dark mode
- [ ] application icon
- [ ] sensible window size/defaults

## Suggested Steps

- [ ] audit all pages for visual consistency
- [ ] audit all forms
- [ ] audit empty states
- [ ] audit destructive actions
- [ ] test at 100–1,000 items with generated data
- [ ] add thumbnails if required
- [ ] remove debug logging/UI
- [ ] add app icon
- [ ] add dark mode only if it can be supported cleanly

## Verification

- [ ] no obvious layout overflow at common desktop sizes
- [ ] app remains responsive with large sample wardrobe
- [ ] no broken image flashes where avoidable
- [ ] no major inaccessible controls
- [ ] all primary flows are understandable without instructions

## User Test Gate

Give intended user a release-like build and ask them to use it normally.

Do not guide them unless stuck.

Capture:

- [ ] where they hesitate
- [ ] actions they cannot find
- [ ] terminology they misunderstand
- [ ] screens that feel too busy
- [ ] screens that feel too empty
- [ ] repeated workflows that take too many clicks

### User Feedback Notes

- [ ] Feedback captured
- Notes:

---

# Phase 15 — Windows Release Automation

## Goal

Produce downloadable Windows installer executables through GitHub Releases.

## Deliverables

- [ ] GitHub Actions workflow
- [ ] tagged release trigger
- [ ] Windows build
- [ ] installer artifact
- [ ] GitHub Release attachment
- [ ] version displayed correctly in app/build
- [ ] release instructions in README

## Explicit Non-Requirement

- [x] Windows code signing is not required

Do not add signing infrastructure unless project requirements change.

## Suggested Steps

- [ ] create release workflow
- [ ] configure Windows runner
- [ ] install project dependencies
- [ ] build frontend
- [ ] build Tauri application
- [ ] generate installer executable
- [ ] attach installer to GitHub Release
- [ ] test version/tag mapping
- [ ] document release procedure

## Verification

Create a test release.

- [ ] workflow completes
- [ ] GitHub Release exists
- [ ] installer executable is downloadable
- [ ] installer works on a clean/reasonably clean Windows environment
- [ ] installed application launches
- [ ] local database initializes
- [ ] image import works
- [ ] app can be uninstalled normally

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

- [ ] user can identify which file to download
- [ ] installation is understandable
- [ ] application launches successfully
- [ ] no development tooling is needed
- [ ] data persists after restart

---

# Phase 16 — MVP Release Candidate

## Goal

Validate the entire MVP as one coherent product.

## MVP Checklist

### Installation

- [ ] downloadable Windows installer
- [ ] installs without development tooling
- [ ] launches successfully

### Wardrobe

- [ ] add clothing item
- [ ] edit clothing item
- [ ] delete clothing item
- [ ] import photo
- [ ] browse grid
- [ ] search
- [ ] filters
- [ ] owned/wishlist distinction

### Suggestions

- [ ] select item
- [ ] see ranked matches
- [ ] explanations shown
- [ ] results are deterministic
- [ ] no internet required

### Outfits

- [ ] build outfit manually
- [ ] save outfit
- [ ] reopen outfit
- [ ] edit outfit
- [ ] delete outfit
- [ ] outfit compatibility feedback

### Wishlist

- [ ] wishlist item can be created
- [ ] owned-item compatibility shown
- [ ] integration summary shown

### Persistence and Safety

- [ ] restart preserves data
- [ ] imported images remain available
- [ ] backup export works
- [ ] restore works
- [ ] deletion behavior is safe

### Quality

- [ ] lint passes
- [ ] typecheck passes
- [ ] tests pass
- [ ] production build passes
- [ ] no debug placeholders
- [ ] no known data-loss bug
- [ ] README download/install instructions complete

## Final User Acceptance Test

Ask intended user to use the release candidate with at least 20 real items.

They should complete without developer help:

- [ ] install app
- [ ] add clothing
- [ ] edit clothing
- [ ] browse/filter
- [ ] open detail view
- [ ] use suggestions
- [ ] build outfit
- [ ] save outfit
- [ ] reopen outfit
- [ ] inspect wishlist compatibility
- [ ] close/reopen app

Capture issues by severity:

### Blockers

- [ ] none remaining

### Major usability issues

- [ ] none remaining or consciously deferred

### Minor issues

- [ ] documented for post-MVP

When all MVP acceptance criteria are satisfied, tag the first stable release.

---

# Post-MVP Backlog

These items are intentionally not part of the initial critical path.

## Convenience Features

- [ ] favorites
- [ ] recent outfits
- [ ] outfit duplication improvements
- [ ] sorting options
- [ ] custom tag management
- [ ] recently added items
- [ ] archive status

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
