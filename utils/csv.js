/**
 * utils/csv.js — CSV export & import for ListR
 *
 * Format:
 *   type,id,name,parentId,order,purchased,status,createdAt,archivedAt
 *
 * Types: frequent_list | frequent_item | weekly_list | weekly_item
 */

const CSV = (() => {
  const HEADERS = ['type', 'id', 'name', 'parentId', 'order', 'purchased', 'status', 'createdAt', 'archivedAt'];

  // ── Helpers ──────────────────────────────────────────────

  function escapeCsv(val) {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function rowToCsv(fields) {
    return HEADERS.map((h) => escapeCsv(fields[h] ?? '')).join(',');
  }

  function parseRow(values) {
    const obj = {};
    HEADERS.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  }

  /** Parse CSV text into an array of row objects, skipping the header */
  function parseCsvText(text) {
    const lines = [];
    let current = '';
    let inQuotes = false;

    // Simple char-by-char parser to handle quoted fields with commas/newlines
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (current.trim()) lines.push(current);
        current = '';
        if (ch === '\r' && text[i + 1] === '\n') i++; // CRLF
      } else {
        current += ch;
      }
    }
    if (current.trim()) lines.push(current);

    // Split each line by comma (simple; quoted commas already handled above)
    return lines.slice(1).map((line) => {
      const values = [];
      let field = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { field += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === ',' && !inQ) {
          values.push(field);
          field = '';
        } else {
          field += ch;
        }
      }
      values.push(field);
      return parseRow(values);
    });
  }

  // ── Export ────────────────────────────────────────────────

  async function exportAll() {
    const [frequentLists, frequentItems, weeklyLists, weeklyItems] = await Promise.all([
      DB.getAll('frequentLists'),
      DB.getAll('frequentItems'),
      DB.getAll('weeklyLists'),
      DB.getAll('weeklyItems'),
    ]);

    const rows = [HEADERS.join(',')];

    for (const fl of frequentLists.sort((a, b) => a.order - b.order)) {
      rows.push(rowToCsv({ type: 'frequent_list', id: fl.id, name: fl.name, order: fl.order, createdAt: fl.createdAt }));
    }
    for (const fi of frequentItems.sort((a, b) => a.order - b.order)) {
      rows.push(rowToCsv({ type: 'frequent_item', id: fi.id, name: fi.name, parentId: fi.listId, order: fi.order, createdAt: fi.createdAt || '' }));
    }
    for (const wl of weeklyLists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) {
      rows.push(rowToCsv({ type: 'weekly_list', id: wl.id, name: wl.name, order: wl.order || 0, status: wl.status, createdAt: wl.createdAt, archivedAt: wl.archivedAt || '' }));
    }
    for (const wi of weeklyItems.sort((a, b) => a.order - b.order)) {
      rows.push(rowToCsv({ type: 'weekly_item', id: wi.id, name: wi.name, parentId: wi.listId, order: wi.order, purchased: wi.purchased ? 'true' : 'false', createdAt: wi.createdAt || '' }));
    }

    const csvText = rows.join('\n');
    const today   = new Date().toISOString().slice(0, 10);
    const filename = `listr-backup-${today}.csv`;

    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    return filename;
  }

  // ── Import ────────────────────────────────────────────────

  /** Parse a CSV file and return a summary + structured data (does not write to DB) */
  function parseImport(text) {
    let rows;
    try {
      rows = parseCsvText(text);
    } catch (e) {
      throw new Error('Could not parse CSV: ' + e.message);
    }

    const frequentLists = [];
    const frequentItems = [];
    const weeklyLists   = [];
    const weeklyItems   = [];

    for (const row of rows) {
      const type = row.type.trim();
      if      (type === 'frequent_list') frequentLists.push(row);
      else if (type === 'frequent_item') frequentItems.push(row);
      else if (type === 'weekly_list')   weeklyLists.push(row);
      else if (type === 'weekly_item')   weeklyItems.push(row);
      // unknown rows silently skipped
    }

    return {
      frequentLists,
      frequentItems,
      weeklyLists,
      weeklyItems,
      summary: {
        frequentListCount: frequentLists.length,
        weeklyListCount:   weeklyLists.length,
      },
    };
  }

  /** Merge imported data into DB, skipping exact duplicates by id */
  async function mergeImport(parsed) {
    const { frequentLists, frequentItems, weeklyLists, weeklyItems } = parsed;

    // Load existing ids
    const [exFL, exFI, exWL, exWI] = await Promise.all([
      DB.getAll('frequentLists'),
      DB.getAll('frequentItems'),
      DB.getAll('weeklyLists'),
      DB.getAll('weeklyItems'),
    ]);

    const existingIds = {
      frequentLists: new Set(exFL.map((r) => r.id)),
      frequentItems: new Set(exFI.map((r) => r.id)),
      weeklyLists:   new Set(exWL.map((r) => r.id)),
      weeklyItems:   new Set(exWI.map((r) => r.id)),
    };

    const toInsert = (rows, store, idSet) =>
      rows
        .filter((r) => r.id && !idSet.has(r.id))
        .map((r) => normalise(r, store));

    await DB.putMany('frequentLists', toInsert(frequentLists, 'frequentLists', existingIds.frequentLists));
    await DB.putMany('frequentItems', toInsert(frequentItems, 'frequentItems', existingIds.frequentItems));
    await DB.putMany('weeklyLists',   toInsert(weeklyLists,   'weeklyLists',   existingIds.weeklyLists));
    await DB.putMany('weeklyItems',   toInsert(weeklyItems,   'weeklyItems',   existingIds.weeklyItems));
  }

  /** Replace all DB data with imported data */
  async function replaceImport(parsed) {
    const { frequentLists, frequentItems, weeklyLists, weeklyItems } = parsed;
    await DB.clearAll();
    await DB.putMany('frequentLists', frequentLists.filter((r) => r.id).map((r) => normalise(r, 'frequentLists')));
    await DB.putMany('frequentItems', frequentItems.filter((r) => r.id).map((r) => normalise(r, 'frequentItems')));
    await DB.putMany('weeklyLists',   weeklyLists.filter((r) => r.id).map((r)   => normalise(r, 'weeklyLists')));
    await DB.putMany('weeklyItems',   weeklyItems.filter((r) => r.id).map((r)   => normalise(r, 'weeklyItems')));
  }

  /** Convert a raw CSV row object into the DB schema shape */
  function normalise(row, store) {
    if (store === 'frequentLists') {
      return {
        id:        row.id,
        name:      row.name || 'Untitled',
        order:     parseInt(row.order, 10) || 0,
        createdAt: row.createdAt || new Date().toISOString(),
      };
    }
    if (store === 'frequentItems') {
      return {
        id:     row.id,
        listId: row.parentId,
        name:   row.name || '',
        order:  parseInt(row.order, 10) || 0,
      };
    }
    if (store === 'weeklyLists') {
      return {
        id:         row.id,
        name:       row.name || 'Untitled',
        status:     row.status === 'active' ? 'active' : 'archived',
        order:      parseInt(row.order, 10) || 0,
        createdAt:  row.createdAt || new Date().toISOString(),
        archivedAt: row.archivedAt || null,
      };
    }
    if (store === 'weeklyItems') {
      return {
        id:        row.id,
        listId:    row.parentId,
        name:      row.name || '',
        purchased: row.purchased === 'true',
        order:     parseInt(row.order, 10) || 0,
      };
    }
    return row;
  }

  return { exportAll, parseImport, mergeImport, replaceImport };
})();
