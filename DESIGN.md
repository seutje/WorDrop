# DESIGN.md

## 1. Document Purpose

This document is the master product and technical design specification for the wardrobe manager application.

It defines:

- the product vision
- intended users
- product goals
- explicit non-goals
- major user flows
- feature requirements
- data model
- recommendation behavior
- application architecture
- storage behavior
- Windows distribution expectations
- quality requirements
- future extension points

Implementation should remain consistent with this document. If the product direction changes, update this document deliberately.

---

## 2. Product Summary

The application is a Windows-first desktop wardrobe manager that lets a user create a visual catalog of clothing they own or are considering buying.

Each clothing item can contain:

- a photo
- a name
- a clothing category
- optional subtype
- optional free-form size (for example XS through XXXL or numeric sizes)
- one or more colors
- optional material
- optional pattern
- season tags
- occasion tags
- style tags
- ownership status
- notes

The application should then allow the user to:

1. browse and filter the wardrobe visually;
2. inspect and edit individual clothing items;
3. manually assemble outfits;
4. save outfits;
5. select one clothing item and receive suggestions for compatible items;
6. understand why suggested items match;
7. add wishlist items and see how well they would integrate with clothes already owned.

The application should be simple enough for a non-technical user to install from a GitHub Release and use without any development tools.

---

## 3. Product Vision

The product should feel like opening a personal digital wardrobe.

The application is not intended to be a fashion social network, shopping platform, or AI showcase. Its primary value is organization and practical outfit planning.

A successful version of the product should make these questions easy to answer:

- What clothes do I have?
- What goes well with this item?
- What outfit can I make from what I already own?
- Have I already saved an outfit using this item?
- If I buy this wishlist item, what could I wear it with?
- Which pieces in my wardrobe are difficult to combine?

The experience should be visual and approachable.

---

## 4. Primary User

The initial product is designed for a single user using a personal Windows computer.

Expected user characteristics:

- non-technical
- wants an easy visual interface
- is willing to manually enter some clothing metadata
- may have tens or hundreds of clothing items
- wants useful suggestions but does not need perfect fashion expertise
- expects the application to continue working without an internet connection

The initial design does not need to support multiple simultaneous users.

---

## 5. Product Goals

### 5.1 Easy wardrobe cataloging

Adding clothing should be straightforward.

The user should be able to:

1. choose a clothing photo;
2. enter a name;
3. choose a category;
4. enter or select useful metadata;
5. choose whether the item is owned or wishlist;
6. save it.

The form should not force the user to fill every optional field.

### 5.2 Visual wardrobe browsing

The primary wardrobe view should display large image cards rather than a spreadsheet-like table.

The user should be able to quickly filter by attributes such as:

- category
- color
- ownership
- season
- occasion
- style

Search by item name should be supported.

### 5.3 Manual outfit creation

The user should be able to combine clothing items visually.

An outfit may contain any useful combination of:

- top
- bottom
- dress
- outerwear
- shoes
- accessories

The application should not enforce overly rigid composition rules. A user may intentionally create incomplete or unusual outfits. By default, the builder allows one Bottom per outfit while still allowing multiple Tops and other categories. This rule can be disabled under Settings > Preferences. Existing saved outfits are never rewritten when the preference changes.

### 5.4 Useful outfit suggestions

Selecting a clothing item should produce a ranked list of compatible items.

Suggestions should initially be based on deterministic rules rather than generative AI.

The recommendation logic should be:

- understandable
- testable
- tunable
- stable
- fast
- local

### 5.5 Explainable recommendations

The user should not be presented with unexplained scores.

Suggested combinations should include concise reasons such as:

- neutral colors pair well;
- suitable for the same season;
- both are tagged casual;
- categories complement each other;
- the materials work well together.

### 5.6 Wishlist usefulness

Wishlist items should participate in recommendation calculations.

The user should be able to inspect a wishlist item and understand how well it integrates with currently owned clothing.

This makes the app useful before a purchase, not only after it.

### 5.7 Offline-first operation

Core functionality must work with no internet connection.

The user should not need an account.

### 5.8 Simple distribution

A release should be downloadable from GitHub as a Windows installer executable.

The end user should not need:

- Node.js
- Rust
- Git
- a terminal
- a local database installation
- development tools

---

## 6. Explicit Non-Goals

The following are not goals for the initial product.

### 6.1 No social network

The application will not initially include:

- followers
- public profiles
- likes
- comments
- public outfit feeds
- messaging
- community discovery

### 6.2 No ecommerce platform

The application is not intended to become a store.

No initial requirement exists for:

- affiliate links
- retailer integrations
- automatic price tracking
- checkout
- stock monitoring
- product scraping

Wishlist support is local wardrobe planning, not shopping infrastructure.

### 6.3 No mandatory cloud

The application does not require:

- cloud storage
- cloud database
- user authentication
- online synchronization

These could be considered in the future but are not part of the base architecture.

### 6.4 No AI dependency

The core application must not depend on:

- large language models
- cloud image recognition
- embeddings
- generative image models
- remote recommendation services

Future optional AI-assisted metadata extraction may be explored, but it must not be required for normal use.

### 6.5 No virtual try-on

The project will not initially attempt:

- body modeling
- avatar creation
- photorealistic try-on
- garment warping
- body measurement estimation

### 6.6 No mobile app

The primary target is Windows desktop.

Responsive layout is useful, but a native iOS or Android application is outside initial scope.

### 6.7 No Windows code signing requirement

Windows installer signing is not required for the project.

Release tooling should not block on code-signing certificates or signing infrastructure.

---

## 7. Product Principles

### 7.1 Visual first

Photos are the primary representation of clothing.

Metadata supports the visual wardrobe rather than replacing it.

### 7.2 Low friction

The user should be able to add an item quickly and refine metadata later.

### 7.3 Local ownership

Wardrobe data belongs to the user and should live on the user's computer by default.

### 7.4 Explainability over magic

A simple recommendation system that the user understands is better than an opaque system that occasionally looks impressive.

### 7.5 Iteration from real use

The project should be tested regularly by the intended user.

Product direction should evolve based on actual friction and useful habits rather than speculative feature expansion.

---

## 8. Core Information Architecture

The main application areas should be:

### Closet

Browse all clothing items.

Functions:

- grid view
- filters
- search
- owned/wishlist toggle
- add item
- edit item
- delete item
- open item details

### Clothing Details

Show a larger item image and metadata.

Functions:

- edit item
- delete item
- ownership state
- matching suggestions
- saved outfits containing the item
- start outfit from this item

### Outfit Builder

Compose an outfit manually.

Implementation choice: the builder uses a flexible card board rather than
fixed category slots or drag-and-drop. Every selected item keeps its image and
category visible, and accessories participate in the same board so categories
guide selection without restricting unusual or incomplete outfits. An item
picker provides text and category filtering. The builder may start empty or be
seeded from clothing details and recommendations, and it warns before replacing
unsaved work. A compact saved-outfit rail supports reopening and editing here;
the full browsing and management experience remains Phase 10 scope.

Functions:

- add clothing items
- remove clothing items
- replace items
- inspect compatibility
- save outfit
- rename outfit
- optionally show suggestions for empty outfit slots

### Saved Outfits

Browse saved outfits.

Implementation choice: the Outfits destination opens to a responsive visual
library. Each card uses a collage of up to four clothing images, with the name,
item count, and optional notes for recognition. Opening a card reuses the
visual builder for editing. Rename and confirmed delete actions live on each
card; deleting an outfit never deletes its clothing. Clothing details list and
deep-link to every saved outfit containing the selected item.

Functions:

- open outfit
- edit outfit
- rename outfit
- duplicate outfit
- delete outfit
- search by outfit, notes, or contained clothing name
- filter by contained clothing metadata
- sort by newest, oldest, or name
- mark favorite outfits and sort favorites first

### Suggestions

Suggestions are primarily contextual rather than a completely separate destination.

Examples:

- suggestions from a selected clothing item;
- alternatives inside the outfit builder;
- compatible owned items for a wishlist item.

---

## 9. Clothing Categories

Initial top-level categories:

- Top
- Bottom
- Dress
- Shoes
- Outerwear
- Accessory

Potential future categories:

- Activewear
- Swimwear
- Sleepwear
- Underwear
- Suit
- One-piece
- Other

The model should allow categories to expand without a destructive database redesign.

Subtypes should be flexible text or a controlled list with optional custom values.

Examples:

Top:
- T-shirt
- blouse
- shirt
- sweater
- hoodie
- tank top

Bottom:
- jeans
- trousers
- shorts
- skirt

Shoes:
- sneakers
- boots
- heels
- sandals

Outerwear:
- coat
- jacket
- blazer

Accessory:
- bag
- belt
- scarf
- hat
- jewelry

---

## 10. Clothing Item Data Model

Conceptual model:

```ts
type ClothingItem = {
  id: string;
  name: string;

  category: ClothingCategory;
  subtype?: string;
  size?: string;

  colors: ClothingColor[];
  material?: string;
  pattern?: string;

  seasons: Season[];
  occasions: Occasion[];
  styleTags: string[];

  ownership: "owned" | "wishlist";

  favorite: boolean;

  imagePath: string;

  notes?: string;

  createdAt: string;
  updatedAt: string;
};
```

### 10.1 IDs

Use UUIDs or another stable collision-resistant identifier.

IDs must not depend on database row order.

### 10.2 Name

Required.

Examples:

- Black oversized T-shirt
- Blue straight-leg jeans
- Beige trench coat

### 10.3 Colors

Support multiple colors because many garments are not single-color.

Initially, colors may come from a controlled palette.

Suggested initial palette:

- Black
- White
- Gray
- Beige
- Cream
- Brown
- Navy
- Blue
- Light Blue
- Green
- Olive
- Red
- Burgundy
- Pink
- Purple
- Yellow
- Orange
- Metallic
- Multicolor

Future versions may additionally store RGB/HSL values.

### 10.4 Material

Optional.

Examples:

- Cotton
- Denim
- Wool
- Linen
- Leather
- Suede
- Polyester
- Silk
- Knit
- Fleece
- Cashmere

Do not require perfect textile classification.

### 10.5 Pattern

Optional.

Examples:

- Solid
- Striped
- Checked
- Floral
- Graphic
- Polka dot
- Animal print
- Abstract

### 10.6 Seasons

Allow zero or more:

- Spring
- Summer
- Autumn
- Winter
- All-season

### 10.7 Occasions

Suggested values:

- Casual
- Work
- Formal
- Party
- Sport
- Travel
- Lounge
- Date
- Outdoor

### 10.8 Style tags

Style tags are intentionally flexible.

Examples:

- Minimalist
- Streetwear
- Classic
- Sporty
- Vintage
- Elegant
- Preppy
- Romantic
- Casual
- Business
- Edgy

### 10.9 Ownership

Two initial states:

- owned
- wishlist

Future states may include:

- archived
- donated
- sold

Do not implement those until needed.

---

## 11. Saved Outfit Model

Conceptual model:

```ts
type Outfit = {
  id: string;
  name: string;
  itemIds: string[];
  notes?: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};
```

Optional future fields:

- favorite
- occasion
- season
- rating
- worn date
- cover image

The initial model should remain simple.

Implementation choice: outfits are stored in an `outfits` table with ordered
clothing references in `outfit_items`. Deleting clothing cascades only its
relationship rows, preserving the outfit and every other referenced item.

---

## 12. User Flows

### 12.1 First launch

Expected flow:

1. Application launches.
2. Local database is initialized automatically.
3. User sees an empty closet state.
4. Empty state explains that clothing can be added with the Add Item action.
5. User adds the first garment.

No onboarding account flow should exist.

### 12.2 Add clothing item

1. User clicks Add Item.
2. User selects an image.
3. Preview appears.
4. User enters a name.
5. User chooses category.
6. User optionally enters subtype, colors, material, pattern, seasons, occasions, style tags, notes.
7. User chooses Owned or Wishlist.
8. User saves.
9. Image is copied into application-managed storage.
10. Database record is created.
11. User returns to wardrobe or sees the saved item.

Validation should be friendly.

Minimum required fields:

- image
- name
- category
- ownership

Colors are strongly recommended but should not block item creation unless later testing shows this improves the experience.

### 12.3 Browse wardrobe

User sees a photo grid.

Each card should show:

- image
- name
- category or subtype
- wishlist indicator when relevant
- a heart control for toggling the item's favorite status

The interface should support:

- search
- sorting by newest, oldest, alphabetical, or favorite
- category filter
- ownership filter
- color filter
- season filter
- occasion filter

Filtering should feel immediate.

### 12.4 View item details

User clicks a card.

Details display:

- image
- name
- metadata
- ownership
- notes
- recommendations
- outfits containing the item

Actions:

- Edit
- Delete
- Build outfit from this item

### 12.5 Build an outfit manually

1. User opens Outfit Builder.
2. User adds items from wardrobe.
3. Items are displayed visually.
4. User can remove or replace pieces.
5. Application may display overall compatibility feedback.
6. User enters an outfit name.
7. User saves.

The builder should not prevent unusual combinations.

Compatibility should advise, not enforce.

### 12.6 Generate matching suggestions

1. User selects a clothing item.
2. Application loads candidate items.
3. Candidates may be limited to owned items by default.
4. Recommendation engine scores each candidate.
5. Results are sorted by score.
6. User sees top suggestions with explanations.
7. User may add a suggested item to an outfit.

Potential filter:

- Owned only
- Include wishlist

### 12.7 Evaluate a wishlist item

1. User opens a wishlist item.
2. Application scores it against owned wardrobe items.
3. Application displays compatible items grouped by category.
4. Application summarizes integration potential.

Example:

> Works well with 14 items you own.

Possible supporting metrics:

- compatible tops
- compatible bottoms
- compatible shoes
- compatible outerwear
- estimated number of combinations

These numbers should remain clearly heuristic.

Implementation choice: wishlist integration uses the existing deterministic
pair scorer against owned clothing only. A score of 70 or above is counted as
an estimated strong match; scores of 55 or above may appear as compatible
examples grouped by category, with up to four displayed per group. The summary
always includes the number of owned items evaluated and labels the result as a
rule-based estimate. No potential-outfit total is extrapolated because pair
counts do not reliably describe complete outfits.

---

## 13. Recommendation System

### 13.1 General approach

The initial engine is rule-based.

Implementation choice: matching is a pure TypeScript module with no React or
database dependency. Each scoring component returns a normalized factor and an
optional explanation; centralized weights produce a clamped 0-100 result.
Missing optional metadata is treated neutrally, and equal scores are ordered by
stable item ID so repeated inputs always produce the same ranking.

Whole-outfit feedback reuses these pair scores but includes only category pairs
that meaningfully interact, such as top-bottom, garment-shoes, and
garment-outerwear; accessories may pair with any non-accessory category. The
displayed outfit score is the rounded average of those relevant pairs. Repeated
high-contribution pair reasons are consolidated into at most three overall
explanations. The application withholds a numeric result for fewer than two
items, no useful category pair, or fewer than two jointly populated metadata
dimensions per relevant pair. Compatibility is always advisory and never
blocks saving an unusual or incomplete outfit.

A candidate clothing item receives component scores.

Recommended initial weighting:

| Component | Maximum |
|---|---:|
| Color compatibility | 30 |
| Category compatibility | 25 |
| Occasion compatibility | 15 |
| Season compatibility | 15 |
| Style compatibility | 10 |
| Material compatibility | 5 |
| Total | 100 |

Weights should be centralized in configuration.

### 13.2 Category compatibility

Category compatibility should reward combinations that commonly form outfits.

Examples:

- Top + Bottom: strong
- Top + Shoes: strong
- Bottom + Shoes: strong
- Dress + Shoes: strong
- Dress + Bottom: usually weak
- Outerwear + Top: strong
- Accessory + most categories: moderate or strong

This is not a fashion law.

The engine should remain permissive.

### 13.3 Color compatibility

Initial color logic should use a curated compatibility table plus neutral-color rules.

Neutral colors may include:

- black
- white
- gray
- beige
- cream
- navy
- brown

Rules can include:

- neutrals work with many colors;
- identical or closely related colors can work;
- certain established pairs receive positive scores;
- strongly conflicting combinations receive lower scores, not hard rejection.

Future versions may calculate relationships using HSL.

### 13.4 Season compatibility

If two items share one or more seasonal tags, award compatibility.

All-season should overlap with all seasons.

Missing season data should be neutral rather than heavily penalized.

### 13.5 Occasion compatibility

Shared occasions increase compatibility.

Missing occasion data should not destroy a score.

### 13.6 Style compatibility

Shared style tags increase compatibility.

Some related styles may receive partial compatibility later.

Initial implementation can use exact tag overlap.

### 13.7 Material compatibility

Material should be a low-weight factor.

Examples of potential positive combinations:

- denim + cotton
- wool + leather
- linen + cotton

The engine should not overstate material certainty.

### 13.8 Pattern compatibility

Pattern may initially be omitted from scoring or treated as a small modifier.

If implemented:

- solid + patterned: often easy
- solid + solid: safe
- patterned + patterned: context-dependent

Avoid overly prescriptive rules.

### 13.9 Explanation generation

The engine should return the main reasons contributing to a score.

Examples:

- Neutral colors pair easily.
- Both work well for summer.
- Both are tagged casual.
- These categories commonly work together.
- The styles overlap.

Do not expose technical weights unless the UI includes a deliberate advanced detail view.

### 13.10 Score interpretation

Possible user-facing bands:

- 85–100: Great match
- 70–84: Good match
- 55–69: Worth trying
- below 55: Lower-confidence match

These labels are product heuristics, not objective fashion judgments.

The user should still be able to combine any items manually.

---

## 14. Outfit Compatibility

A multi-item outfit score should not simply average every pair blindly if that produces misleading results.

Initial acceptable approach:

1. score relevant pairs;
2. prioritize structural pairs such as top-bottom, garment-shoes, outerwear-base;
3. average normalized pair scores;
4. generate a small set of overall reasons.

The exact algorithm can evolve after user testing.

Avoid blocking outfit saving based on score.

---

## 15. Application Architecture

Preferred technology:

- Tauri 2
- React
- TypeScript
- Vite
- SQLite

Suggested source layout:

```text
src/
├── app/
├── components/
├── pages/
├── features/
│   ├── wardrobe/
│   ├── outfits/
│   └── suggestions/
├── lib/
│   ├── database/
│   ├── images/
│   └── matching/
├── hooks/
├── types/
└── styles/

src-tauri/
├── src/
├── migrations/
└── tauri.conf.json
```

The precise structure may evolve, but feature boundaries should remain clear.

---

## 16. State Management

Start with React state and lightweight shared context where needed.

Do not add Redux or another large state framework by default.

Introduce a dedicated state library only if application complexity demonstrates a real need.

Persistent state should live in SQLite, not solely in global frontend state.

---

## 17. Persistence

### 17.1 SQLite

Use SQLite for:

- clothing metadata
- outfit metadata
- outfit-item relationships
- application metadata if needed

Implementation choice: the Tauri/Rust layer owns the SQLite connection and
runs versioned migrations during application startup. Frontend features use a
typed TypeScript repository that calls narrow Tauri commands rather than
issuing SQL directly. The database file is named `wardrobe.db` and lives in the
platform-managed application data directory.

Use migrations from the beginning.

### 17.2 Recommended relational structure

Potential tables:

```text
clothing_items
clothing_item_colors
clothing_item_seasons
clothing_item_occasions
clothing_item_style_tags

outfits
outfit_items
```

Small controlled vocabularies may be stored as strings initially.

Normalized tables are useful for multi-value fields.

A JSON column may be acceptable for limited cases, but avoid hiding all relational data inside JSON blobs.

### 17.3 Application storage

Use the OS-appropriate Tauri application data directory.

Suggested conceptual structure:

```text
app-data/
├── wardrobe.db
├── images/
│   ├── original/
│   └── display/
└── exports/
```

The exact path is platform-managed.

---

## 18. Image Storage

Imported images should be copied into app-managed storage.

Implementation choice: the Tauri/Rust layer validates JPEG, PNG, and WebP
content, copies imports to `images/original` beneath the application-data
directory, and returns a relative managed reference for persistence. Image
bytes are exposed to the frontend as data URLs so arbitrary filesystem access
does not need to be granted to the webview. Replaced and deleted images are
removed only when no clothing record still references them.

Each item also has one 800 x 1000 JPEG display image in `images/display`.
Add/Edit loads the unchanged original into a 4:5 framing editor with drag,
zoom, fit, and reset controls. Saving regenerates the display image and stores
normalized framing metadata. Closet cards, details, recommendations, and outfit
views use only the display image, with an original-image fallback for legacy
records until they are edited.

Requirements:

- never modify the source file;
- generate a unique internal filename;
- preserve a usable extension or normalized format;
- avoid filename collisions;
- clean up managed images when appropriate;
- support standard formats such as JPEG, PNG, and WebP.

Optional future image features:

- rotate
- background removal
- dominant color extraction

Background removal is not part of the first MVP.

---

## 19. Data Safety and Backup

Because the application is local-first, export/import is important.

A later MVP-polish phase should provide a simple backup format.

Preferred approach:

- export database plus managed images into a single archive;
- import that archive into the application.

Archive structure:

```text
wordrop-backup-YYYY-MM-DD.wordrop
├── wardrobe.db
├── images/
└── manifest.json
```

The implemented backup is a ZIP-compatible file using the `.wordrop` extension:

```text
wordrop-backup-YYYY-MM-DD.wordrop
├── manifest.json
├── wardrobe.db
└── images/original/*
```

`manifest.json` records `formatVersion` (currently `1`), the application
version, and a Unix creation timestamp. `wardrobe.db` is a consistent SQLite
snapshot that includes clothing metadata and saved outfits. The `zip` Rust
crate provides local Deflate archive handling and adds no runtime network
requirement.

Restore stages the archive before changing live data. It rejects unexpected,
duplicate, or unsafe paths; excessive file counts or expanded size; unsupported
manifest versions; newer or damaged databases; missing referenced images; and
unsupported image contents. After validation, the app retains temporary
rollback copies of the current database and image directory until both have
been replaced successfully. The restore UI requires explicit confirmation and
states that all current wardrobe data will be replaced.

Import must not silently overwrite existing data without confirmation.

---

## 20. UI Design Direction

### 20.1 Overall aesthetic

The application should feel:

- clean
- warm
- visual
- modern
- calm
- personal

Avoid a highly technical or enterprise appearance.

### 20.2 Closet view

Primary content:

- responsive grid of garment cards
- image-forward cards
- filter controls
- search
- add item action

### 20.3 Item cards

A card should not contain excessive metadata.

Recommended:

- photo
- name
- subtype/category
- small wishlist indicator if relevant

### 20.4 Detail view

Use a larger photo with metadata beside or below it.

Recommendations should appear prominently enough to invite exploration.

### 20.5 Outfit builder

The builder should feel more like arranging items on a board than filling a form.

Potential layout:

```text
Outerwear
   ↓
Top / Dress
   ↓
Bottom
   ↓
Shoes

Accessories displayed beside the main stack
```

The UI should allow flexible combinations.

### 20.6 Dark mode

Dark mode is desirable but not required for the first functional MVP.

It belongs in the polish phase unless trivial to support from the start.

Phase 14 implementation choice: retain the warm light theme as the single
fully supported theme rather than ship a partial dark mode. Interactive
controls share a visible sage focus treatment and consistent hover/disabled
states, dialogs can be dismissed with Escape when no operation is active, and
reduced-motion preferences suppress decorative animation. Image cards use
viewport-based managed-image loading with skeleton placeholders; generated
1,000-item rendering and filtering tests provide the MVP performance guard.
The Windows application icon is a dark rounded WorDrop “W” monogram with a
sage hanger detail, matching the in-app brand mark and visual direction.

---

## 21. Filtering and Search

Initial filters:

- category
- ownership
- color
- season
- occasion

Search should match:

- name
- subtype
- possibly notes and style tags later

Multiple filters should combine predictably.

A visible Clear Filters action should be available when filters are active.

---

## 22. Editing and Deletion

Editing should preserve the existing managed image unless the user explicitly replaces it.

Deletion should:

1. ask for confirmation;
2. remove the clothing item;
3. remove references from saved outfits;
4. keep the saved outfit if other items remain;
5. clean up managed images if no longer referenced.

If deleting the final item from an outfit, the outfit may remain empty or be removed depending on later UX testing. Preferred initial behavior is to preserve it and show an empty outfit state.

---

## 23. Empty States

Important empty states:

### Empty wardrobe

Explain:

- what the app is for;
- how to add the first item.

### No search/filter results

Explain that no items match and provide Clear Filters.

### No saved outfits

Encourage creating an outfit.

### No recommendations

Explain likely reasons, such as insufficient metadata or too few wardrobe items.

Never show an unexplained blank area.

---

## 24. Validation

Required item fields:

- name
- category
- ownership
- image

Recommended but optional:

- color

Forms should show inline validation.

Do not clear user-entered values after a validation error.

---

## 25. Accessibility

Reasonable desktop accessibility requirements:

- keyboard-focusable controls
- visible focus indicators
- semantic buttons and form labels
- readable contrast
- useful alternative text where appropriate
- avoid relying on color alone for ownership or status

The project does not initially target formal certification, but accessibility should not be knowingly ignored.

---

## 26. Performance

Expected wardrobe size for initial design:

- 0–1,000 clothing items
- 0–500 saved outfits

The application should remain responsive at this scale.

Recommendations should normally compute locally within a fraction of a second for a typical wardrobe.

Use thumbnails if full-resolution images make scrolling sluggish.

---

## 27. Privacy

Core data should remain on the user's machine.

Do not add analytics, telemetry, or crash reporting without an explicit product decision.

Do not transmit clothing images anywhere by default.

If future AI integrations upload an image, the UI must clearly communicate that before doing so.

---

## 28. Logging

Local development logging is acceptable.

Production logging should avoid:

- full personal file paths where unnecessary
- excessive wardrobe metadata
- raw image data

No remote logging is required.

---

## 29. Windows Distribution

The primary release target is Windows.

Desired release experience:

1. project owner creates/pushes a release tag;
2. GitHub Actions builds the application;
3. a GitHub Release is created or updated;
4. a Windows installer executable is attached;
5. end user downloads installer;
6. end user installs and launches the application.

After the first updater-enabled version is installed, WorDrop checks the latest
GitHub Release once on every application start. A failed check is silent so an
offline user can continue immediately. When a newer semantic version is
available, the application shows its version and release notes and offers
`Download and install` or `Not now`; updates are never mandatory. Accepting the
update downloads a Tauri-signed NSIS artifact, verifies it, closes WorDrop, and
starts the installer. Choosing `Not now` dismisses only the current prompt, so
the application checks again on its next start.

No Windows code-signing work is required.

Implementation choice: pushing a semantic tag such as `v0.2.0` starts the
Windows-only release workflow. A preflight script requires the tag and the
versions in `package.json`, `src-tauri/Cargo.toml`, and
`src-tauri/tauri.conf.json` to agree. The workflow runs frontend and Rust tests,
builds the configured NSIS target, creates a public GitHub Release, uploads a
clearly named setup executable plus Tauri updater metadata and its cryptographic
signature, and retains the installer as a workflow artifact. The Tauri release
action is pinned to an explicit published version. Its private updater key is
held in GitHub Actions secrets and its public key is embedded in the app. This
updater signature verifies artifact integrity and is distinct from Windows
publisher/code signing, which remains out of scope. The full process and
clean-machine test checklist are documented in the repository README.

---

## 30. GitHub Repository Expectations

Recommended root files:

```text
AGENTS.md
DESIGN.md
PLAN.md
README.md
LICENSE
package.json
src/
src-tauri/
.github/
```

`README.md` should eventually focus on:

- screenshots
- application purpose
- downloading the latest release
- development setup
- building locally

Detailed product architecture belongs in this document rather than overloading the README.

---

## 31. Testing Strategy

### 31.1 Unit tests

High-value unit tests:

- scoring calculations
- category compatibility
- color rules
- season overlap
- style overlap
- explanation generation
- filter predicates
- validation

### 31.2 Data-layer tests

Test:

- migrations
- item creation
- item editing
- deletion
- outfit relationships
- database reload persistence

### 31.3 UI flow tests

Critical flows:

- add item
- edit item
- filter wardrobe
- build outfit
- save outfit
- receive suggestions
- delete item referenced by outfit

### 31.4 Manual user testing

Manual testing by the intended user is a core part of the project.

Each implementation phase in `PLAN.md` includes a user test gate.

---

## 32. MVP Definition

The MVP is complete when the intended user can:

- install the Windows application;
- launch it without development tooling;
- add at least 20 clothing items with photos;
- edit and delete clothing items;
- browse and filter the wardrobe;
- distinguish owned and wishlist items;
- select an item and see ranked compatible owned items;
- understand basic reasons for recommendations;
- manually build an outfit;
- save and reopen outfits;
- close and reopen the app without losing data.

The MVP does not require:

- automatic background removal
- AI metadata recognition
- cloud sync
- accounts
- mobile apps
- Windows signing
- virtual try-on

---

## 33. Post-MVP Opportunities

Potential future features, roughly ordered from low-risk to ambitious:

### Practical enhancements

- favorites
- recent outfits
- worn-history tracking
- outfit notes
- outfit duplicate
- wardrobe statistics
- better backup and restore
- image crop/rotate
- thumbnail optimization
- customizable tag lists

### Smarter local features

- dominant color extraction
- automatic color suggestions
- basic local image classification
- personalized recommendation weights
- like/dislike feedback

### Shopping support

- wishlist compatibility summary
- compare two potential purchases
- identify wardrobe gaps
- show items that have few matching combinations

### Optional AI

Only after core product quality is strong:

- suggest metadata from photo
- describe garment style
- generate natural-language outfit explanations
- optional photo background removal

AI should remain optional.

---

## 34. Success Criteria

The project is successful if the intended user chooses to use it without being prompted because it makes wardrobe decisions easier.

Useful signs include:

- adding new purchases to the app;
- checking the app while deciding what to wear;
- creating and revisiting saved outfits;
- using wishlist compatibility before buying;
- providing concrete feedback about what feels slow or missing.

The strongest measure is repeat use, not feature count.

---

## 35. Design Decision Summary

Current major decisions:

- Windows-first desktop application
- Tauri 2 + React + TypeScript
- SQLite
- local-first and offline-first
- image files copied into app-managed storage
- deterministic recommendation engine
- no mandatory AI
- no user accounts
- no cloud backend
- GitHub Releases for distribution
- Windows installer executable
- optional startup updates through signed GitHub Release artifacts
- Windows code signing out of scope
- user testing at the end of each implementation phase

These decisions should remain stable unless real usage provides a reason to change them.
