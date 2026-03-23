# ListR

**ListR** is an offline-first Progressive Web App (PWA) for managing grocery shopping. All data is stored on-device using IndexedDB. The app works fully offline and online with no degradation in functionality. No account, no cloud, no tracking.

---

## Features

- **Weekly Shopping List** — Create an active shopping list, add items manually or import from your frequent-buy lists, check off purchased items, and archive when done.
- **Frequent-Buy Lists** — Build reusable named lists (e.g. "Weekly Staples", "Kids' Stuff") that you can selectively import into any new shopping list.
- **History** — All archived shopping lists are kept indefinitely. View a read-only snapshot of any past list or duplicate it into a new active list.
- **CSV Export & Import** — Back up all your data to a human-readable CSV file and restore it on any device (merge or replace).
- **Offline-first** — Service Worker pre-caches all assets. The app loads and runs with zero network connection.
- **Installable** — Install to your home screen on Android or iOS for a native-app feel.
- **Dark mode** — Light, Dark, or System theme toggle.
- **Gestures** — Swipe left to delete, drag to reorder, long-press for accessibility delete.
- **Search** — Inline search filters the active shopping list in real time.
- **Autocomplete** — The add-item field suggests items from your frequent-buy lists.

---

## Installing the App

### Android (Chrome / Edge / Samsung Internet)

1. Open the app URL in your browser.
2. Look for the **"Add to Home Screen"** banner that appears, or tap the browser menu (⋮) → **"Add to Home Screen"** / **"Install app"**.
3. Tap **Install**. ListR will appear on your home screen like a native app.

### iOS (Safari)

> Chrome and other browsers on iOS currently do not support PWA installation. Use **Safari**.

1. Open the app URL in **Safari**.
2. Tap the **Share** button (the box with an arrow pointing up, at the bottom of the screen).
3. Scroll down and tap **"Add to Home Screen"**.
4. Confirm by tapping **Add** in the top-right corner.
5. ListR will appear on your home screen.

*(A contextual reminder is shown inside the app on iOS.)*

---

## How to Use

### Shopping Tab 🛒

| Action | How |
|--------|-----|
| Create a new list | Tap **New List** → choose blank or import from frequent lists |
| Name your list | Tap the list name at the top to edit it inline |
| Add an item | Type in the bottom bar → tap **Add** or press Enter |
| Autocomplete | Start typing — suggestions from frequent lists appear instantly |
| Toggle purchased | Tap the item or its checkbox |
| Reorder items | Drag the ≡ handle on the left |
| Delete an item | Swipe left → tap **Delete**, or long-press → tap the trash icon |
| Clear purchased | Tap **Clear Purchased** → confirm |
| Finish shopping | Tap **Finish & Archive** → list moves to History |
| Search | Tap 🔍 in the top bar → type to filter |

### Frequent Tab ⭐

| Action | How |
|--------|-----|
| Create a list | Tap the **+** button (bottom-right) |
| Rename a list | Tap the list name to edit inline |
| Delete a list | Tap the 🗑️ icon on the list card → confirm |
| Expand/collapse | Tap the list header |
| Add an item | Expand a list → type in the bottom input → tap **Add** |
| Delete an item | Swipe left on an item |
| Reorder items | Drag the ≡ handle |
| Reorder lists | Drag the ≡ handle on a list card |

### History Tab 🕐

| Action | How |
|--------|-----|
| Browse past lists | Scroll the History tab (newest first) |
| View details | Tap a list entry |
| Duplicate to new list | Open a list → tap **Duplicate to New List** |
| Delete a history entry | Swipe left on a list, or open it → tap **Delete This List** |

### Settings Tab ⚙️

| Action | How |
|--------|-----|
| Change theme | Tap **Light**, **Dark**, or **System** |
| Export data | Tap **Export CSV** — downloads `listr-backup-YYYY-MM-DD.csv` |
| Import data | Tap **Import CSV** → select a file → choose Merge or Replace |
| About & help | Tap **View** next to "About & Instructions" |

---

## CSV Export & Import

### Export

Tap **Settings → Export CSV** to download a backup file named `listr-backup-YYYY-MM-DD.csv`.

The file uses a flat format with a `type` column to distinguish record types:

```
type,id,name,parentId,order,purchased,status,createdAt,archivedAt
frequent_list,<uuid>,Weekly Staples,,0,,,2025-01-01,
frequent_item,<uuid>,Milk,<list-uuid>,0,,,2025-01-01,
weekly_list,<uuid>,Week of Jan 6,,0,,active,2025-01-06,
weekly_item,<uuid>,Eggs,<list-uuid>,0,false,,2025-01-06,
```

The file is human-readable and can be opened and edited in Excel, Numbers, or any spreadsheet app.

### Import

Tap **Settings → Import CSV** and select a CSV file previously exported by ListR.

A preview shows: *"Found X frequent-buy lists, Y weekly lists."*

Choose an import mode:

| Mode | Effect |
|------|--------|
| **Merge** | Adds imported lists/items to existing data; skips exact ID duplicates |
| **Replace** | ⚠️ Erases all existing data and replaces with CSV contents — requires confirmation |

---

## Self-Hosting / Deployment

ListR is a fully static app. No server-side code required. Any web server can host it.

### Option 1 — `npx serve` (local development)

```bash
cd /path/to/listr
npx serve .
```

Then open `http://localhost:3000` in your browser.

### Option 2 — Python HTTP server

```bash
cd /path/to/listr
python -m http.server 8080
```

Open `http://localhost:8080`.

### Option 3 — Deploy to a static host

Upload the entire folder to any of these (all have free tiers):

- [Netlify](https://netlify.com) — drag-and-drop deploy
- [Vercel](https://vercel.com) — `vercel deploy`
- [GitHub Pages](https://pages.github.com)
- [Cloudflare Pages](https://pages.cloudflare.com)

> **HTTPS required for PWA features.** The Service Worker and `beforeinstallprompt` event only work on `https://` or `localhost`. All the static hosts above provide HTTPS automatically.

---

## Local Development

```bash
# Clone / download the project
cd listr

# Serve locally (HTTPS not required for localhost)
npx serve .
# or
python -m http.server 8080

# Open in browser
open http://localhost:3000
```

No build step, no bundler, no dependencies to install. All code is vanilla HTML, CSS, and JavaScript.

To regenerate the icons from `listr.png` (requires Python + Pillow):

```bash
pip install Pillow
python - <<'EOF'
from PIL import Image
img = Image.open('listr.png')
img.resize((192, 192), Image.LANCZOS).save('icons/icon-192.png')
img.resize((512, 512), Image.LANCZOS).save('icons/icon-512.png')
print('Icons generated.')
EOF
```

---

## Browser Compatibility

| Browser | Shopping | PWA Install | Offline |
|---------|----------|-------------|---------|
| Chrome 90+ (Android/Desktop) | ✅ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ |
| Safari 16+ (iOS/macOS) | ✅ | ✅ via Share sheet | ✅ |
| Firefox 90+ | ✅ | ❌ (no install prompt) | ✅ |
| Samsung Internet | ✅ | ✅ | ✅ |

**IndexedDB**, **Service Workers**, and **CSS Custom Properties** are required. All modern browsers support these.

---

## File Structure

```
listr/
├── index.html              # App shell & HTML structure
├── manifest.json           # PWA manifest (name, icons, theme)
├── service-worker.js       # Offline-first cache strategy
├── styles.css              # All styles (CSS custom properties for theming)
├── app.js                  # Bootstrap, routing, SW registration, install prompt
├── db.js                   # Thin IndexedDB wrapper
├── components/
│   ├── shopping.js         # Shopping tab — active weekly list
│   ├── frequent.js         # Frequent tab — reusable lists
│   ├── history.js          # History tab — archived lists
│   ├── settings.js         # Settings tab — theme, CSV, about
│   ├── picker-modal.js     # Frequent-buy import picker modal
│   └── toast.js            # Toast notification utility
├── utils/
│   ├── csv.js              # CSV export & import
│   ├── drag-drop.js        # Drag-and-drop (mouse + touch)
│   ├── swipe.js            # Swipe-to-delete
│   └── theme.js            # Theme management
└── icons/
    ├── icon-192.png        # App icon (192×192)
    └── icon-512.png        # App icon (512×512)
```

---

## Out of Scope (v1)

- Cloud sync / account system
- Shared lists between users
- Price / budget tracking
- Barcode scanning
- Recipe integration
- Push notifications / reminders
- Item quantity fields

---

## License

MIT — do whatever you like with it.
