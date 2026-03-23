# ListR — Product Specification

## Overview

**ListR** is a Progressive Web App (PWA) for managing grocery shopping. All data is stored on-device. The app works fully offline and online with no degradation in functionality. Users can export and import data via CSV to transfer between devices.

---

## Branding

- **App name**: ListR
- **Short name** (manifest): ListR
- **Icon**: Provided file `listr.png` — a rounded-square icon featuring a large white "L" with a checklist embedded inside it, a checkmark integrated into the "R", on a blue-to-green gradient background. Claude Code should resize this source file to generate both required icon sizes (192×192 and 512×512) and place them in the `icons/` directory.
- **Theme color** (manifest + browser chrome): `#3b82f6` (blue, sampled from icon gradient)
- **Color palette**: The app's accent/primary color should be drawn from the icon's blue-to-green gradient (`#3b82f6` → `#22c55e`) for visual consistency.

---

- **HTML5 + CSS3 + Vanilla JavaScript** (no framework dependency)
- **Service Worker** with Cache API for full offline support (pre-caches all assets on install)
- **IndexedDB** (via a thin wrapper) for structured on-device data storage
- **Web App Manifest** for installability (home screen icon, splash screen, standalone mode)
- **CSS custom properties** for theming (light/dark mode)
- All styles in a dedicated **`styles.css`** file — no inline styles in JS

---

## App Structure / Navigation

The app uses a bottom navigation bar (mobile-first) with the following top-level sections:

| Tab | Icon | Description |
|---|---|---|
| **Shopping** | 🛒 | The active weekly list |
| **Frequent** | ⭐ | Manage frequent-buy lists |
| **History** | 🕐 | Archive of past weekly lists |
| **Settings** | ⚙️ | Theme, CSV import/export, app info |

---

## Feature Specifications

---

### 1. Weekly / Active Shopping List

#### 1.1 Creating a New List
- A **"New List"** button is prominently available on the Shopping tab.
- When tapped, a modal/sheet appears with two options:
  - **Start blank** — creates an empty list with today's date as the default name (editable)
  - **Import from frequent-buy lists** — opens the frequent-buy picker (see §1.2)
- The list name is editable at any time by tapping it inline.
- Only **one list is "active"** (current) at a time. Creating a new list archives the current one to History automatically.

#### 1.2 Importing from Frequent-Buy Lists
- A modal displays all frequent-buy lists as expandable sections.
- Each list section shows all its items with a checkbox next to each.
- **Select All / Deselect All** toggle per list section.
- A global **"Select All" / "Deselect All"** at the top of the modal.
- A **"Add Selected Items"** button (shows count, e.g. "Add 7 Items") confirms the import.
- Items are **copied** into the weekly list — fully independent of the source frequent-buy list. Checking off an item on the weekly list has no effect on the frequent-buy list.
- Duplicate detection: if an item already exists on the active list, it is skipped (with a non-intrusive toast notification indicating how many were skipped).

#### 1.3 Adding Items Manually
- A sticky input bar at the bottom of the Shopping tab: text field + "Add" button.
- **Autocomplete**: as the user types, suggestions appear from all frequent-buy list items. Tapping a suggestion adds it instantly.
- Pressing Enter / tapping "Add" adds the item.

#### 1.4 Item Interaction
- **Tap item** → toggles purchased state:
  - Purchased: item text has a strikethrough style, reduced opacity
  - Tapping again restores it to unpurchased
- **Drag handle** (visible on the left of each item) → drag-and-drop to reorder items within the list
- **Swipe left** on an item → reveals a red "Delete" button; tapping it removes the item
- Long-press alternative to swipe (for accessibility / non-touch): a trash icon appears on long-press

#### 1.5 Search & Filter
- A search icon in the top bar expands an inline search field.
- Filters the visible list in real time as the user types.
- Clears on close; does not affect the list data.

#### 1.6 List Completion
- A **"Clear Purchased"** button removes all checked-off items from the active list (with a confirmation prompt).
- A **"Finish & Archive"** button moves the current list to History and resets the Shopping tab to a "no active list" state.

---

### 2. Frequent-Buy Lists

#### 2.1 Managing Lists
- Users can create **multiple named frequent-buy lists** (e.g. "Weekly Staples", "Biweekly", "Kids' Stuff", "John's Items").
- Each list is shown as a card/section on the Frequent tab.
- **Create new list**: tap a "+" button → enter list name → confirm.
- **Rename list**: tap the list name inline to edit.
- **Delete list**: a trash icon on the list card, with a confirmation prompt. Deleting a list does not affect any weekly lists that previously imported from it.
- Lists themselves can be **drag-and-drop reordered** on the Frequent tab.

#### 2.2 Managing Items Within a List
- Tap a frequent-buy list card to expand/open it (or navigate to a detail view).
- **Add item**: text input + "Add" button at the bottom of the list.
- **Reorder**: drag handle on each item for drag-and-drop reordering.
- **Swipe left** on an item → delete with confirmation.
- Items on frequent-buy lists have **no checked/purchased state** — they are a standing inventory only.

---

### 3. History

- All archived weekly lists are shown in reverse-chronological order (newest first).
- Each entry shows: **list name**, **date created**, **date archived**, **item count**.
- **Tap a history entry** → read-only view of the list (all items, with their final purchased/unpurchased state visible but not editable).
- **Delete a history entry**: swipe left → red "Delete" button, or a trash icon with confirmation.
- **Reuse a list**: a "Duplicate to New List" button in the detail view copies all items (as unpurchased) into a new active list.
- Lists are kept **indefinitely** until manually deleted — no automatic pruning.

---

### 4. Settings

#### 4.1 Theme
- A **Light / Dark / System** toggle (three-way).
- "System" follows the device's `prefers-color-scheme` media query.
- Theme preference is persisted in localStorage.
- Transition between themes is animated (smooth CSS transition on color properties).

#### 4.2 CSV Export
- **"Export All Data"** button → generates and downloads a single CSV file containing:
  - All frequent-buy lists and their items
  - All weekly lists (active + history) and their items (including purchased state)
- CSV format is human-readable and documented (column headers included).
- Filename: `listr-backup-YYYY-MM-DD.csv`

#### 4.3 CSV Import
- **"Import from CSV"** button → file picker → user selects a previously exported CSV.
- A preview summary is shown before confirming: "Found X frequent-buy lists, Y weekly lists."
- **Merge vs Replace** option:
  - **Merge**: imports lists/items, skipping exact duplicates
  - **Replace**: clears all existing data and replaces with the CSV contents (requires an explicit confirmation warning)
- Import errors (malformed CSV) are surfaced with a clear error message.

#### 4.4 App Info
- App version number
- "About" blurb
- Link to README / instructions (opens within the app as a modal)

---

### 5. Progressive Web App (PWA) Requirements

#### 5.1 Offline-First
- **Service Worker** intercepts all network requests.
- All app shell assets (HTML, CSS, JS, icons, fonts) are **pre-cached** during the Service Worker `install` event.
- App loads and runs fully with **zero network connection** — no feature is gated on connectivity.
- Data operations (read/write) use IndexedDB exclusively — no network calls for data.

#### 5.2 Install Prompt
- On first visit (or after a delay), a friendly **"Add to Home Screen"** banner appears with a one-tap install button.
- The banner can be dismissed and will not re-appear for 7 days if dismissed.
- On iOS (where the native install prompt is unavailable), a contextual instruction is shown: "Tap the Share button, then 'Add to Home Screen'."

#### 5.3 Web App Manifest
- `manifest.json` includes: `name: "ListR"`, `short_name: "ListR"`, icons (192×192 and 512×512 from provided `listr.png`), `theme_color: "#3b82f6"`, background color, `display: standalone`, `start_url`.

#### 5.4 Offline Status Indicator
- A small **status pill** in the top bar shows:
  - ✅ Online (green, auto-hides after 3 seconds of reconnecting)
  - 📴 Offline (amber/yellow, persists while offline)
- Transitions smoothly; does not disrupt the layout.

---

### 6. UI / UX Design Guidelines

#### 6.1 Mobile-First
- Designed primarily for phone screens (360px–430px wide).
- Touch targets minimum 44×44px.
- Bottom navigation bar for primary navigation (thumb-friendly).
- Modals slide up from the bottom (bottom sheets) rather than appearing as center dialogs.

#### 6.2 Drag and Drop
- Applies to: items within a weekly list, items within a frequent-buy list, and frequent-buy list cards on the Frequent tab.
- Uses the HTML5 Drag and Drop API with touch event polyfill for mobile (touch-based drag via `touchstart`/`touchmove`/`touchend`).
- Visual feedback: the dragged item appears slightly lifted (shadow + opacity change); a drop indicator line shows where it will land.

#### 6.3 Swipe to Delete
- Implemented via touch events (no library dependency).
- Swipe left ≥ 80px reveals the delete action.
- Swipe back (right) cancels.

#### 6.4 Toasts / Notifications
- Non-blocking toast messages for: item added, item skipped (duplicate), import success, export success, errors.
- Appear at the bottom of the screen (above the nav bar), auto-dismiss after 3 seconds.

#### 6.5 Theming
- All colors defined as CSS custom properties on `:root` (light) and `[data-theme="dark"]` (dark).
- No hardcoded color values outside `styles.css`.

#### 6.6 Typography & Style
- Clean, modern, high-contrast typeface consistent with the ListR brand.
- Color accents drawn from the icon's blue-to-green gradient (`#3b82f6` → `#22c55e`).
- Grocery-context aesthetic: fresh, utilitarian, easy to scan while walking through a store.
- Generous line height and item padding for easy touch targeting.

---

## File Structure

```
/
├── index.html
├── manifest.json
├── service-worker.js
├── styles.css
├── app.js                  # App bootstrap / router
├── db.js                   # IndexedDB wrapper
├── components/
│   ├── shopping.js         # Shopping tab logic
│   ├── frequent.js         # Frequent-buy lists logic
│   ├── history.js          # History tab logic
│   ├── settings.js         # Settings tab logic
│   ├── picker-modal.js     # Frequent-buy import picker modal
│   └── toast.js            # Toast notification utility
├── utils/
│   ├── csv.js              # CSV export & import logic
│   ├── drag-drop.js        # Drag-and-drop + touch polyfill
│   ├── swipe.js            # Swipe-to-delete utility
│   └── theme.js            # Theme management
└── icons/
    ├── icon-192.png        # Resized from listr.png (provided)
    └── icon-512.png        # Resized from listr.png (provided)
```

---

## Data Model (IndexedDB)

### Store: `frequentLists`
| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Primary key |
| `name` | string | List name |
| `order` | number | Display order |
| `createdAt` | ISO date string | Creation timestamp |

### Store: `frequentItems`
| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Primary key |
| `listId` | string | Foreign key → frequentLists.id |
| `name` | string | Item name |
| `order` | number | Display order within list |

### Store: `weeklyLists`
| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Primary key |
| `name` | string | List name (editable) |
| `status` | `"active"` \| `"archived"` | Only one `active` at a time |
| `createdAt` | ISO date string | |
| `archivedAt` | ISO date string \| null | Set when archived |

### Store: `weeklyItems`
| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Primary key |
| `listId` | string | Foreign key → weeklyLists.id |
| `name` | string | Item name |
| `purchased` | boolean | Checked-off state |
| `order` | number | Display order |

---

## CSV Format

The export CSV uses a flat format with a `type` column to distinguish record types:

```
type,id,name,parentId,order,purchased,status,createdAt,archivedAt
frequent_list,<uuid>,Weekly Staples,,0,,,2025-01-01,
frequent_item,<uuid>,Milk,<list-uuid>,0,,,2025-01-01,
weekly_list,<uuid>,Week of Jan 6,,0,,active,2025-01-06,
weekly_item,<uuid>,Eggs,<list-uuid>,0,false,,2025-01-06,
```

---

## Accessibility

- All interactive elements have visible focus styles.
- ARIA labels on icon-only buttons.
- Sufficient color contrast in both light and dark themes (WCAG AA minimum).
- Swipe-to-delete has a long-press alternative.
- Modals trap focus and are dismissible via Escape key.

---

## README (to be generated by Claude Code at end of build)

The README should include:
- App overview and feature list
- How to install (both Android and iOS instructions with screenshots placeholder)
- How to use each section
- How CSV export/import works
- How to self-host / serve the files (it's static — any web server works)
- Browser compatibility notes
- Local development instructions (`npx serve .` or similar)

---

## Out of Scope for v1

- Cloud sync / account system
- Shared lists between users
- Price / budget tracking
- Barcode scanning
- Recipe integration
- Notifications / reminders
- Item quantity fields
