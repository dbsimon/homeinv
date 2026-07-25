# Find My Item — 物件追蹤

A single-page home inventory tracking app. Register items by location or by stock quantity, scan barcodes, map container positions, and sync to Google Sheets. No frameworks, no build tools — open `index.html` and it works.

---

## Features

- **Multi-location stock tracking** — one stock item can exist across multiple containers with per-location quantities, purchase/warranty/expiry dates
- **Unique item registry** — assign individual assets to a single physical location
- **3-level spatial hierarchy** — Segments → Containers → Sub-Containers
- **Interactive spatial map** — drag markers to map container positions on a floor-plan image
- **4-tier category classification** — build a nested category tree for organizing items
- **Barcode generation & scanning** — Code39 labels via JsBarcode, QR scanning via html5-qrcode
- **To-Buy replenishment list** — auto-surfaces items where total stock is at or below minimum level
- **AI-powered search** — semantic item search via DeepSeek API (optional)
- **AI image analysis** — extract item metadata from uploaded photos (optional)
- **Google Sheets sync** — push/pull inventory to a GAS web app for cloud backup
- **Excel export/import** — flat spreadsheet format with non-destructive patching; import updates only provided fields and preserves existing data for matched items
- **Soft-delete (DROP)** — items are marked `deletedAt` rather than physically removed
- **Multi-user support** — household members with per-user inventory filtering
- **Bilingual UI** — English / 繁體中文 toggle
- **Mobile-first responsive** — works on desktop and phone

---

## Tech Stack

| Library | Use | CDN |
|---------|-----|-----|
| Tailwind CSS | Styling | `cdn.tailwindcss.com` |
| SheetJS (xlsx) | Excel export/import | `cdn.sheetjs.com` |
| JsBarcode | Barcode label generation | `cdn.jsdelivr.net` |
| html5-qrcode | QR/barcode scanning | `unpkg.com` |

Zero dependencies beyond these four CDN scripts. No npm, no bundler, no framework.

---

## Quick Start

1. Clone or download the repository.
2. Open `index.html` in any modern browser.
3. Enter the default system password: `1234`.
4. Start adding segments, containers, and items.

**GitHub Pages**: push the files to a repo and enable Pages from the root — the app is entirely static.

---

## Usage Guide

### Location Tab

- **Segment Configurator** (collapsible): add, rename, or delete Segments, Containers, and Sub-Containers.
- **Structural Index**: expandable tree showing the full 3-level hierarchy. Click a node to view assets at that location.
- **Location Map**: import a floor-plan or room layout image, then drag container markers onto the grid to record physical positions. Use the zoom/pan controls via right-side floating buttons.

### Register Tab

- **Item Type toggle**: switch between **Unique** (blue, single-location assets) and **Stock** (amber, multi-location inventory).
- **Unique items**: enter name, brand, category, segment/container/sub-container, purchase/warranty/expiry dates, owner, image, and remarks.
- **Stock items**:
  - **Global Stock Info** (amber-bordered): Unit of Measure and Minimum Stock Level — applied to the whole item.
  - **Stock Locations** section: add one or more location rows. Each row has segment/container/sub-container dropdowns (cascading), a per-location quantity, and optional purchase/warranty/expiry dates.
  - The **total quantity** badge updates live as you edit.
- **Save Asset** commits to the inventory. **Clear** resets the form. **Exit Edit** cancels modification mode.

### Browse Tab

- **Filter bar**: search by name/remarks, segment, container, category, or owner.
- **Item type filter**: toggle between All, Unique, or Stock views.
- **AI Deep Search** (expandable): describe items in natural language — AI matches across names, AI metadata, and remarks.
- **Desktop**: table layout with image, details, category badge, location, owner, remarks, and Edit/Copy buttons.
- **Mobile**: card layout with View/Edit actions.
- **Out-of-stock items** (total quantity = 0) are hidden from browse by default — they appear in the To-Buy tab.

### Categories Tab

- **4-tier maximum** classification tree: Clothing → Summer → Shirts → (leaf).
- **Classification Architect**: select a parent path visually from the directory tree, then add child branches.
- Adding beyond tier 4 is blocked. Delete any branch with confirmation.

### To-Buy Tab

- Lists all stock items where **total quantity ≤ minimum level**.
- Items with zero stock show an **OUT OF STOCK** badge; low-stock items show a **LOW** badge with the shortage amount.
- Quick actions per card: **View** (detail popup), **Edit** (open in register), **IN** (add stock via location picker).

### Scan Tab

- **Barcode Scanner**: uses device camera to scan QR codes. Detected codes fill the text box automatically.
- **Manual lookup**: enter a System ID or Barcode ID and press Look Up.
- **Scan result card**: shows item name, category, owner, stock breakdown (per-location with IN/OUT buttons), remarks, and action buttons.
- **Recent scans**: last 5 scanned items with timestamps.

### Detail Popup

- Accessible from Browse, Scan, or To-Buy tabs.
- Shows full item info, barcode (Code39), and a **Download Label (PNG)** button.
- **Stock items**: total quantity with OUT/LOW badge, per-location breakdown with individual IN/OUT buttons.
- **DROP**: soft-deletes the item (sets `deletedAt`). Works for both unique and stock items.

---

## Stock Management Model

### Data Structure

Each stock item carries a `stockEntries` array:

```json
{
  "id": "itm_abc123",
  "itemType": "stock",
  "uom": "pcs",
  "minQuantity": 5,
  "stockEntries": [
    {
      "id": "se_xyz789",
      "segment": "Kitchen",
      "container": "Cabinet A",
      "subContainer": "Top Shelf",
      "quantity": 3,
      "purchaseDate": "2025-01-15",
      "warrantyDate": "",
      "expiryDate": "2026-06-01",
      "hiddenAt": null
    }
  ]
}
```

### Sync Status States

| State | Meaning |
|-------|---------|
| `Synced` | No pending operations, no conflicts, last sync succeeded |
| `Changes waiting` | Outbox has pending operations not yet uploaded |
| `Syncing` | Active sync request in progress |
| `Conflicts need attention` | Operations returned VERSION_CONFLICT — user must resolve |
| `Offline` | Network error or retryable failure (will auto-retry) |
| `Update required` | Protocol version mismatch — update the app |
| `Cloud not initialized` | Server has no data — upload from Settings |

### Key Rules

| Concept | Behavior |
|---------|----------|
| **Total quantity** | Sum of all active `stockEntries[].quantity` |
| **Low stock** | `totalQuantity ≤ minQuantity` (and `minQuantity > 0`) |
| **Out of stock** | `totalQuantity === 0` |
| **Hidden from browse** | Out-of-stock items are excluded from normal browse results |
| **To-Buy visibility** | Items at or below minimum level appear in To-Buy regardless of quantity |
| **Zero-qty entries** | Entries at zero qty remain in data; are not auto-deleted |
| **DROP** | User-triggered action that sets `item.deletedAt` |

### Legacy Migration

Old stock items with single-location fields (`segment`, `container`, `subContainer`, `quantity`, etc.) are automatically migrated on load: a single `stockEntry` is created from those fields and the item-level location fields are cleared.

---

## Data Model Reference

### Inventory Item

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique system ID (`itm_...`) |
| `barcodeId` | string | 6-char alphanumeric barcode label |
| `name` | string | Item reference designation |
| `brand` | string | Brand name |
| `category` | string | Full classification path (`" > "` delimited) |
| `itemType` | `"unique"` or `"stock"` | Item type |
| `segment` | string | Home segment (unique items only) |
| `container` | string | Container (unique items only) |
| `subContainer` | string | Sub-container (unique items only) |
| `owner` | string | Household member |
| `uom` | string | Unit of measure (stock only) |
| `quantity` | number | **Derived** — total of active stock entries. Do not set directly. |
| `minQuantity` | number | Minimum stock level (stock only) |
| `stockEntries` | array | Location-level entries (stock only, see above) |
| `purchaseDate` | string | Purchase date (unique items only; for stock, per-entry) |
| `warrantyDate` | string | Warranty date |
| `expiryDate` | string | Expiry date |
| `imageUrl` | string | Asset image (data URI or URL) |
| `aiMetadata` | string | AI-generated visual description |
| `remarks` | string | Annotations |
| `deletedAt` | string | ISO timestamp if soft-deleted, else `null` |
| `createdAt` | string | ISO creation timestamp |
| `updatedAt` | string | ISO last-update timestamp (server-owned) |
| `version` | number | Entity version for optimistic concurrency control |
| `createdAt` | string | Server-assigned ISO creation timestamp |
| `deletedAt` | string | Server-assigned ISO tombstone timestamp if soft-deleted |

### Segment Hierarchy

```json
{
  "Bedroom": {
    "Wardrobe A": ["Top Drawer", "Bottom Shelf"],
    "Nightstand": []
  },
  "Kitchen": {
    "Cabinet B": ["Spice Rack"],
    "Pantry": []
  }
}
```

### Category Tree

```json
{
  "Clothing": {
    "Summer": { "Shirts": {}, "Skirts": {} },
    "Winter": {}
  },
  "Electronic Devices": {},
  "Foods": {}
}
```

---

## Google Sheets Sync Setup (Protocol v3)

The app uses an explicit protocol-v3 synchronization protocol with Google Apps Script.

### Deploy the Backend

1. Create a new Google Apps Script project.
2. Copy the contents of `GoogleSheetSync.gs` into the editor.
3. Set up **Script Properties**:
   - Go to **File > Project Properties > Script Properties**
   - Add property `SYNC_SECRET_TOKEN` with a strong random value (e.g. 256-bit hex).
   - **Do NOT use the default `secretToken123`** — the server falls back to this only for migration.
4. Deploy as a Web App: **Publish > Deploy as web app**
   - Execute as: **Me**
   - Access: **Anyone** (authentication is token-based, not Google account)
5. Copy the deployment URL.

### Migrate Legacy Data

If you have existing data in a legacy `Data` sheet, run `migrateLegacyDataToV3()` once from the Apps Script editor.
This preserves a backup in `Data_LEGACY_BACKUP`, normalizes entity versions, and creates the new `Meta`/`Data_A`/`Data_B` sheets.

### Configure the App

1. Open the app and navigate to the **Cloud Engine** tab (desktop: nav; mobile: More → Cloud).
2. Paste the deployment URL into **Google Apps Script Web App Deployment Endpoint URL**.
3. Set **Data Stream Transceiver Key** (must match `SYNC_SECRET_TOKEN` on the server).
4. Press **Commit Network Profile Changes**.

### Sync Protocol

- **Protocol version 3** replaces the legacy snapshot/operation protocol.
- Operations are versioned by entity (item, stock entry, locations document, categories document, settings).
- `LockService` serializes all server writes — concurrent pushes do not overwrite each other.
- Operations are deduplicated by immutable `opId` — safe to retry after network timeout.
- Stock quantities are changed only by explicit delta operations — stale metadata updates cannot overwrite stock levels.
- Conflicts use optimistic concurrency control (entity versions), not client timestamps.

### Sheets Layout

| Sheet | Purpose |
|-------|---------|
| `Meta` | Server state: activeSlot, serverSeq, checksum, versions |
| `Data_A` / `Data_B` | Double-buffered canonical snapshot (active slot alternates) |
| `Ops` | Append-only operation log with per-op status and content hash |
| `SyncAudit` | Per-request audit trail |
| `DeadLetters` | Malformed or rejected operations |
| `Reminders` | Server-owned reminder deduplication records |

> **Security note**: the GAS endpoint URL and API token are stored in `localStorage`. Never commit them to version control or share them publicly. Anyone with the deployment URL and token can access the inventory API. Store the token in **Script Properties**, not in source code.

---

## Excel Format

### Export Columns

`System ID` | `Barcode ID` | `Item Name` | `Brand` | `Item Type` | `Classification Route` | `Segment Zone` | `Container` | `Sub-Container` | `Owner` | `AI Metadata` | `Purchase Date` | `Warranty Date` | `Expiry Date` | `UOM` | `Quantity` | `Min Quantity` | `Stock Entries JSON` | `Image Link Asset` | `User Remarks Annotation` | `Last System Entry Update`

The **Stock Entries JSON** column contains the full `stockEntries` array as a JSON string for stock items, allowing round-trip export/import with multi-location data preserved.

A second sheet **Spatial Map** exports layout background images and coordinate markers.

### Import

Import reads the **Inventory Ledger** sheet. Items are matched to existing inventory by **System ID** first, then by **Barcode ID** as fallback.

**Non-destructive patching rules:**
- **Matched items**: only non-blank spreadsheet cells update the corresponding field. Blank cells leave the existing value unchanged. Image fields, sync metadata, timestamps, and AI metadata are preserved unless explicitly updated in the row.
- **New items**: created when no match is found, provided the row has a valid **Item Name**.
- **Validation**: invalid `Item Type`, malformed `Stock Entries JSON`, non-numeric quantity fields, and unparseable dates cause the row to be skipped with an error. Failed rows do not modify any existing records.
- **Error reporting**: after import, a summary shows updated/added/skipped counts. A modal lists each failed row number and the specific reason.
- **Stock Entries JSON**: if populated, stock entries are deserialized; otherwise existing entries are preserved for matched items.

New segments, containers, and users are created automatically from imported data.

---

## AI Features

Both features require a **DeepSeek API key** configured in the Cloud Engine tab.

- **AI Deep Search**: describe items in natural language (e.g., *"blue jacket in bedroom wardrobe"*). The AI matches across item names, categories, locations, owners, remarks, and AI metadata.
- **AI Image Analysis**: upload a photo of an item and click **AI Analyze**. The AI extracts: suggested name, brand, category path, and a visual description (stored as `aiMetadata`).

The vision analysis falls back to text-only if the image format is unsupported.

---

## Security

- A **system password** (default `1234`) gates the entire app on load. Change it in the Cloud Engine tab.
- The **Data Stream Transceiver Key** authenticates sync requests to the GAS endpoint.
- All secrets are stored in `localStorage` only. The app makes no external network requests beyond the GAS endpoint and (optionally) the DeepSeek API.
- There is no server-side component — all data lives in the browser until synced.

---

## Browser Support

- Chrome, Edge, Firefox, Safari (latest 2 versions)
- Mobile Safari and Chrome on iOS/Android
- Camera-based barcode scanning requires HTTPS or `localhost` (per browser security policy)

---

## License & Credits

Copyright © Westdoor Streetson 2026.

**Third-party libraries (loaded via CDN):**
- Tailwind CSS — MIT
- SheetJS (xlsx) — Apache 2.0
- JsBarcode — MIT
- html5-qrcode — Apache 2.0
