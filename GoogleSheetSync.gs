/**
 * Home Inventory & Posting Manager — Google Apps Script Backend
 * Deploy as a Web App (Execute as: Me, Access: Anyone).
 * Paste the deployment URL into the app's Cloud Engine tab.
 *
 * Actions:
 *   GET  ?token=X&action=SYNC_PULL        → returns full app state JSON
 *   POST token=X&action=SYNC_PUSH&payload=...  → stores full state snapshot
 *   POST token=X&action=overwrite&sheetName=...&data=... → writes to a specific sheet
 *   POST token=X&action=SEND_REMINDERS&payload=... → client-initiated reminder dispatch
 *
 * Writable sheets (overwrite action): Records, Colleagues, Posts
 * Reminder functions: checkAndRemind, setupTimeTrigger (time-driven, runs ~7 AM daily)
 *
 * Schema version: 2.1.0
 */

// ─── Configuration ──────────────────────────────────────────────────────────

var CONFIG = {
  schemaVersion: '2.1.0',
  // The shared secret must match the front-end localStorage key 'sys_api_pwd'.
  // Default on first run: 'secretToken123' — change this and update the front end.
  secretToken: 'secretToken123',

  // Main data sheet (monolithic JSON blob for SYNC_PULL / SYNC_PUSH).
  dataSheet: 'Data',

  // Cell content size limit to stay under Google Sheets 50K limit with safety margin.
  maxCellSize: 40000
};

// ─── Entry Points ───────────────────────────────────────────────────────────

function doGet(e)  { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Wraps an object as a JSON HTTP response.
 * Supports optional JSONP callback for cross-origin environments.
 */
function jsonResponse(data, jsonpCallback) {
  var body = JSON.stringify(data);
  if (jsonpCallback) {
    return ContentService.createTextOutput(jsonpCallback + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Validates the shared secret token.
 * Returns { valid: boolean, errorMessage: string }.
 */
function validatePassword(token) {
  if (!token) {
    return { valid: false, errorMessage: 'Missing authentication token.' };
  }
  if (token !== CONFIG.secretToken) {
    return { valid: false, errorMessage: 'Invalid authentication token.' };
  }
  return { valid: true, errorMessage: '' };
}

/**
 * Ensures the required sheet exists, creating it if needed.
 */
function ensureSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  return sheet;
}

/**
 * Ensures an Ops sheet exists (append-only audit log).
 */
function ensureOpsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Ops');
  if (!sheet) {
    sheet = ss.insertSheet('Ops');
    sheet.getRange(1, 1, 1, 8).setValues([['seq', 'opId', 'deviceId', 'type', 'timestamp', 'applied', 'conflictType', 'json']]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }
  return sheet;
}

/**
 * Returns all existing server opIds from the Ops sheet for dedup.
 */
function getExistingServerOpIds() {
  var opsSheet = ensureOpsSheet();
  var lastRow = Math.max(opsSheet.getLastRow(), 1);
  if (lastRow < 2) return [];
  var col = opsSheet.getRange(2, 2, lastRow - 1, 1).getValues();
  return col.map(function(r) { return String(r[0] || ''); }).filter(Boolean);
}

/**
 * Returns dedup keys (opId|entityType|entityId|baseRevision) from Ops sheet.
 */
function getExistingServerOpDetails() {
  var opsSheet = ensureOpsSheet();
  var lastRow = Math.max(opsSheet.getLastRow(), 1);
  if (lastRow < 2) return [];
  var data = opsSheet.getRange(2, 1, lastRow - 1, 8).getValues();
  return data.map(function(r) {
    var op = {};
    try { op = JSON.parse(r[7] || '{}'); } catch (ex) {}
    return (r[1] || '') + '|' + (r[3] || '') + '|' + (op.entityId || '') + '|' + (op.baseRevision || 0);
  }).filter(Boolean);
}

/**
 * Returns all Ops from the Ops sheet.
 */
function getAllServerOps() {
  var opsSheet = ensureOpsSheet();
  var lastRow = Math.max(opsSheet.getLastRow(), 1);
  if (lastRow < 2) return [];
  var data = opsSheet.getRange(2, 1, lastRow - 1, 8).getValues();
  return data.map(function(r) {
    var op = {};
    try { op = JSON.parse(r[7] || '{}'); } catch (ex) {}
    return {
      serverSeq: parseInt(r[0] || 0),
      opId: String(r[1] || ''),
      deviceId: String(r[2] || ''),
      type: String(r[3] || ''),
      timestamp: String(r[4] || ''),
      applied: String(r[5] || ''),
      conflictType: String(r[6] || ''),
      payload: op.payload || {}
    };
  });
}

/**
 * Appends an operation to the Ops sheet.
 */
function appendServerOp(op, seq, applied, conflictType) {
  var opsSheet = ensureOpsSheet();
  var lastRow = Math.max(opsSheet.getLastRow(), 1);
  var row = lastRow + 1;
  opsSheet.getRange(row, 1, 1, 8).setValues([[
    seq,
    op.opId || '',
    op.deviceId || '',
    op.type || op.entityType || '',
    op.timestamp || new Date().toISOString(),
    applied || 'applied',
    conflictType || '',
    JSON.stringify({ payload: op.payload || {}, entityId: op.entityId || '', baseRevision: op.baseRevision || 0 })
  ]]);
}

/**
 * Writes a sync session audit row to the SyncAudit sheet.
 */
function writeSyncAudit(sessionStart, deviceId, baseRevision, newRevision, opsCount, success, durationMs) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('SyncAudit');
  if (!sheet) {
    sheet = ss.insertSheet('SyncAudit');
    sheet.getRange(1, 1, 1, 7).setValues([['Timestamp', 'DeviceId', 'BaseRevision', 'NewRevision', 'OpsCount', 'Success', 'DurationMs']]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  var lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.getRange(lastRow + 1, 1, 1, 7).setValues([[
    sessionStart.toISOString(),
    deviceId,
    baseRevision,
    newRevision,
    opsCount,
    success ? 'true' : 'false',
    durationMs || 0
  ]]);
}

/**
 * Writes a dead-lettered operation to the DeadLetters sheet.
 */
function writeDeadLetter(op, reason) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('DeadLetters');
  if (!sheet) {
    sheet = ss.insertSheet('DeadLetters');
    sheet.getRange(1, 1, 1, 6).setValues([['Timestamp', 'OpId', 'DeviceId', 'Type', 'RawJson', 'ErrorReason']]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }
  var lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.getRange(lastRow + 1, 1, 1, 6).setValues([[
    new Date().toISOString(),
    (op && op.opId) || '',
    (op && op.deviceId) || '',
    (op && op.type) || (op && op.entityType) || '',
    JSON.stringify(op || {}),
    reason || ''
  ]]);
}

function getStockOpDelta(type, amount) {
  var n = Number(amount || 0);
  if (!isFinite(n)) return 0;
  var abs = Math.abs(n);
  return type === 'STOCK_OUT' ? -abs : abs;
}

function recomputeItemStockQuantity(item) {
  if (!item || !item.stockEntries || !Array.isArray(item.stockEntries)) return 0;
  return item.stockEntries.reduce(function(sum, entry) {
    if (entry && !entry.hiddenAt) {
      sum += Number(entry.quantity || 0);
    }
    return sum;
  }, 0);
}

/**
 * Applies a single operation to the server state.
 * Implements domain-specific merge rules:
 *  - segments/categories/coordinates: operation replay
 *  - inventory items: field-level merge by updatedAt
 *  - stockEntries: merge by id
 *  - soft deletes: tombstoning
 */
function applyServerOperationstate(state, op) {
  if (!state || !op) return {};
  var payload = op.payload || {};
  var type = op.type || op.entityType || '';

  switch (type) {
    case 'ADD_SEGMENT':
      if (payload.segment && payload.name) {
        state.segments = state.segments || {};
        state.segments[payload.name || payload.segment] = state.segments[payload.name || payload.segment] || {};
      }
      break;
    case 'DELETE_SEGMENT':
      if (payload.name) delete (state.segments || {})[payload.name];
      break;
    case 'ADD_CONTAINER':
      if (payload.segment && payload.container) {
        state.segments = state.segments || {};
        state.segments[payload.segment] = state.segments[payload.segment] || {};
        state.segments[payload.segment][payload.container] = state.segments[payload.segment][payload.container] || [];
      }
      break;
    case 'ADD_SUB_CONTAINER':
      if (payload.segment && payload.container && payload.subContainer) {
        state.segments = state.segments || {};
        state.segments[payload.segment] = state.segments[payload.segment] || {};
        state.segments[payload.segment][payload.container] = state.segments[payload.segment][payload.container] || [];
        if (state.segments[payload.segment][payload.container].indexOf(payload.subContainer) === -1) {
          state.segments[payload.segment][payload.container].push(payload.subContainer);
        }
      }
      break;
    case 'UPDATE_INVENTORY':
    case 'ADD_INVENTORY':
      if (payload.itemId || (payload.item && payload.item.id)) {
        state.inventory = state.inventory || [];
        var itemId = payload.itemId || payload.item.id;
        var remoteItem = payload.item || { id: itemId };
        var idx = state.inventory.reduce(function(acc, it, i) { return it.id === itemId ? i : acc; }, -1);
        if (idx >= 0) {
          // Field-level merge: remote only overwrites if newer
          var local = state.inventory[idx];
          var rTime = remoteItem.updatedAt ? new Date(remoteItem.updatedAt).getTime() : 0;
          var lTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
          if (rTime >= lTime) {
            state.inventory[idx] = mergeInventoryFields(local, remoteItem);
          }
          // Conflict if both modified different fields
          if (rTime > 0 && lTime > 0 && Math.abs(rTime - lTime) < 1000 && op.deviceId !== local.lastModifiedBy) {
            return { conflictType: 'simultaneous_edit', message: 'Both devices edited item simultaneously' };
          }
        } else {
          state.inventory.push(remoteItem);
        }
      }
      break;
    case 'DELETE_INVENTORY':
      if (payload.itemId) {
        state.inventory = state.inventory || [];
        var ditem = state.inventory.find(function(i) { return i.id === payload.itemId; });
        if (ditem) ditem.deletedAt = payload.deletedAt || new Date().toISOString();
      }
      break;
    case 'STOCK_IN':
    case 'STOCK_OUT':
      if (payload.itemId && payload.entryId) {
        var sitem = (state.inventory || []).find(function(i) { return i.id === payload.itemId; });
        if (sitem && sitem.stockEntries) {
          var sentry = sitem.stockEntries.find(function(e) { return e.id === payload.entryId; });
          if (sentry) {
            var delta = getStockOpDelta(type, payload.amount);
            sentry.quantity = Math.max(0, Number(sentry.quantity || 0) + delta);
            sentry.updatedAt = payload.timestamp || new Date().toISOString();
          }
          sitem.quantity = recomputeItemStockQuantity(sitem);
          sitem.updatedAt = payload.timestamp || new Date().toISOString();
        }
      }
      break;
    case 'ADD_USER':
    case 'SWITCH_USER':
    case 'SAVE_LAYOUT':
    case 'SAVE_CLASSIFICATION':
    case 'SET_REMINDER':
      // No conflict — apply trivially via payload replay
      break;
    default:
      break;
  }
  return {};
}

function mergeInventoryFields(local, remote) {
  var fields = ['name', 'brand', 'category', 'segment', 'container', 'subContainer',
    'owner', 'remarks', 'aiMetadata', 'barcodeId', 'uom', 'minQuantity',
    'purchaseDate', 'warrantyDate', 'expiryDate', 'itemType',
    'updatedAt', 'version', 'lastModifiedBy', 'imageUrl', 'imageThumbUrl',
    'imageSourceType', 'imageThumbKey', 'imageFullKey', 'imageMeta'];
  fields.forEach(function(f) {
    if (remote[f] !== undefined && remote[f] !== '') local[f] = remote[f];
  });
  // Merge stockEntries by id
  if (remote.stockEntries && Array.isArray(remote.stockEntries)) {
    if (!local.stockEntries) local.stockEntries = [];
    var localMap = {};
    local.stockEntries.forEach(function(e) { localMap[e.id] = e; });
    remote.stockEntries.forEach(function(re) {
      if (!localMap[re.id]) local.stockEntries.push(re);
      else {
        var le = localMap[re.id];
        var reTime = re.updatedAt ? new Date(re.updatedAt).getTime() : 0;
        var leTime = le.updatedAt ? new Date(le.updatedAt).getTime() : 0;
        if (reTime >= leTime) local.stockEntries = local.stockEntries.map(function(e) { return e.id === re.id ? re : e; });
      }
    });
  }
  return local;
}

// ─── Action Handlers ────────────────────────────────────────────────────────

/**
 * SYNC_PULL — returns the full application state JSON stored in the Data sheet.
 */
function handleSyncPull(sheet, params) {
  var startTs = new Date();
  var chunkCount = parseInt(sheet.getRange('B2').getValue(), 10) || 1;
  var fullData = '';
  for (var i = 0; i < chunkCount; i++) {
    fullData += (sheet.getRange('A' + (i + 1)).getValue() || '');
  }
  var currentRev = parseInt(sheet.getRange('B3').getValue()) || 0;
  var respData = fullData ? JSON.parse(fullData) : {};
  respData.meta = respData.meta || {};
  respData.meta.lastServerRevision = currentRev;
  respData.meta.checksum = '';
  respData.meta.schemaVersion = CONFIG.schemaVersion;
  if (!respData.segments) respData.segments = {};
  if (!respData.inventory) respData.inventory = [];
  if (!respData.coordinates) respData.coordinates = {};
  if (!respData.categories) respData.categories = {};

  var endTs = new Date();
  writeSyncAudit(startTs, params.token ? 'pull_' + params.token.toString().substr(0, 8) : 'pull', currentRev, currentRev, 0, true, endTs - startTs);

  return jsonResponse(respData, params.jsonp);
}

/**
 * SYNC_PUSH — processes an array of operations against the server state.
 * Dedupes by opId + entityType + entityId + baseRevision combination.
 * Appends audit rows to SyncAudit sheet. Dead-letter invalid ops.
 * Returns ackedOpIds, remoteOps since lastPulledServerSeq, and conflicts[].
 */
function handleSyncPush(sheet, params) {
  var startTs = new Date();
  var operations = params.operations || [];
  var currentRev = parseInt(sheet.getRange('B3').getValue()) || 0;
  var deviceId = params.deviceId || 'unknown';
  var success = true;
  var opsCount = operations.length;

  // ── Load current server state ─────────────────────────────────────────────
  var chunkCount = parseInt(sheet.getRange('B2').getValue()) || 1;
  var fullData = '';
  for (var i = 0; i < chunkCount; i++) {
    fullData += (sheet.getRange('A' + (i + 1)).getValue() || '');
  }
  var state = {};
  try { state = fullData ? JSON.parse(fullData) : {}; } catch (ex) {}

  // ── Idempotency check: opId + entityType + entityId + baseRevision ────────
  var existingOps = getExistingServerOpIds();
  var existingOpDetail = getExistingServerOpDetails();
  var appliedOpIds = [];
  var conflictResults = [];
  var seq = currentRev;

  for (var o = 0; o < operations.length; o++) {
    var op = operations[o] || {};
    var dedupKey = (op.opId || '') + '|' + (op.type || op.entityType || '') + '|' + (op.entityId || '') + '|' + (op.baseRevision || 0);

    if (existingOpDetail.indexOf(dedupKey) !== -1) {
      appliedOpIds.push(op.opId || '');
      continue;
    }

    // Validate schema
    if (!op.opId || !op.type && !op.entityType) {
      writeDeadLetter(op, 'Missing opId or type');
      continue;
    }

    try {
      var applyResult = applyServerOperationstate(state, op);
      if (applyResult && applyResult.conflictType) {
        conflictResults.push({
          opId: op.opId,
          serverSeq: currentRev + 1,
          type: op.type || op.entityType || '',
          deviceId: op.deviceId || '',
          conflictType: applyResult.conflictType,
          message: applyResult.message || '',
          payload: op.payload || {},
          timestamp: new Date().toISOString()
        });
      } else {
        appliedOpIds.push(op.opId || '');
      }
      // Write to Ops sheet
      seq += 1;
      appendServerOp(op, seq, applyResult && applyResult.conflictType ? 'conflict' : 'applied', applyResult ? applyResult.conflictType || '' : '');
    } catch (ex) {
      writeDeadLetter(op, 'Apply error: ' + ex.toString());
    }
  }

  // ── Write updated state back ──────────────────────────────────────────────
  var payloadStr = JSON.stringify(state);
  var totalChunks = Math.ceil(payloadStr.length / CONFIG.maxCellSize);
  sheet.getRange('A:A').clearContent();
  for (var j = 0; j < totalChunks; j++) {
    sheet.getRange('A' + (j + 1)).setValue(
      payloadStr.substring(j * CONFIG.maxCellSize, (j + 1) * CONFIG.maxCellSize)
    );
  }
  var ts = new Date().toISOString();
  var newRev = seq;
  sheet.getRange('B1').setValue(ts);
  sheet.getRange('B2').setValue(totalChunks);
  sheet.getRange('B3').setValue(newRev);
  SpreadsheetApp.flush();

  // ── Remote ops since lastPulledServerSeq ──────────────────────────────────
  var lastSeq = parseInt(params.lastPulledServerSeq || 0);
  var allOps = getAllServerOps();
  var remoteOps = allOps.filter(function(op) { return (op.serverSeq || 0) > lastSeq; });

  // ── Sync audit ────────────────────────────────────────────────────────────
  var endTs = new Date();
  writeSyncAudit(startTs, deviceId, currentRev, newRev, opsCount, success, endTs - startTs);

  return jsonResponse({
    success: true,
    revision: newRev,
    savedAt: ts,
    ackedOpIds: appliedOpIds,
    receivedOpIds: appliedOpIds,
    remoteOps: remoteOps,
    conflicts: conflictResults,
    latestServerSeq: newRev,
    chunks: totalChunks,
    schemaVersion: CONFIG.schemaVersion
  });
}

// ─── Request Parser ──────────────────────────────────────────────────────────

function parseRequestParams(e) {
  e = e || {};
  var p = e.parameter || {};
  var result = {
    token:       (p.token || '').trim(),
    action:      (p.action || '').trim(),
    payload:     (p.payload || '').trim(),
    operations:  [],
    clientRevision: (p.clientRevision || '').trim(),
    baseRevision:  (p.baseRevision || '').trim(),
    data:        (p.data || '').trim(),
    fileName:    (p.fileName || '').trim(),
    schemaVersion: (p.schemaVersion || '').trim(),
    jsonp:       (p.jsonp || '').trim()
  };

  if (p.operations) {
    try { result.operations = JSON.parse(p.operations); } catch (ex) {}
  }

  if (!result.token && !result.action && e.postData && e.postData.contents) {
    var body = e.postData.contents;
    try {
      var jsonBody = JSON.parse(body);
      result.token       = jsonBody.token       || result.token;
      result.action      = jsonBody.action      || result.action;
      result.payload     = jsonBody.payload     || result.payload;
      result.operations  = jsonBody.operations  || result.operations;
      result.clientRevision = jsonBody.clientRevision || result.clientRevision;
      result.baseRevision  = jsonBody.baseRevision  || result.baseRevision;
      result.data        = jsonBody.data        || result.data;
      result.fileName    = jsonBody.fileName    || result.fileName;
      result.schemaVersion = jsonBody.schemaVersion || result.schemaVersion;
      if (result.payload && typeof result.payload === 'object') {
        result.payload = JSON.stringify(result.payload);
      }
    } catch (ex) {
      var match;
      match = body.match(/token=([^&]*)/);
      if (match) result.token = decodeURIComponent(match[1]);
      match = body.match(/action=([^&]*)/);
      if (match) result.action = decodeURIComponent(match[1]);
      match = body.match(/payload=([\s\S]*)/);
      if (match) {
        var rawPayload = decodeURIComponent(match[1]);
        var ampIdx = rawPayload.lastIndexOf('&operations=');
        if (ampIdx === -1) ampIdx = rawPayload.lastIndexOf('&clientRevision=');
        if (ampIdx === -1) ampIdx = rawPayload.lastIndexOf('&data=');
        if (ampIdx !== -1) rawPayload = rawPayload.substring(0, ampIdx);
        result.payload = rawPayload;
      }
      match = body.match(/data=([\s\S]*)/);
      if (match) {
        var rawData = decodeURIComponent(match[1]);
        var dAmpIdx = rawData.lastIndexOf('&fileName=');
        if (dAmpIdx === -1) dAmpIdx = rawData.lastIndexOf('&schemaVersion=');
        if (dAmpIdx !== -1) rawData = rawData.substring(0, dAmpIdx);
        result.data = rawData;
      }
      match = body.match(/fileName=([^&]*)/);
      if (match) result.fileName = decodeURIComponent(match[1]);
      match = body.match(/schemaVersion=([^&]*)/);
      if (match) result.schemaVersion = decodeURIComponent(match[1]);
    }
  }

  return result;
}

// ─── Main Request Router ────────────────────────────────────────────────────

function handleRequest(e) {
  e = e || {};

  try {
    var params = parseRequestParams(e);

    // 1. Validate password on every request.
    var auth = validatePassword(params.token);
    if (!auth.valid) {
      return jsonResponse({ success: false, error: auth.errorMessage }, params.jsonp);
    }

    // 2. Route to the appropriate action.
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = params.action;

    if (action === 'SYNC_PULL') {
      var dataSheet = ensureSheet(CONFIG.dataSheet);
      return handleSyncPull(dataSheet, params);
    }

    if (action === 'SYNC_PUSH') {
      var pushSheet = ensureSheet(CONFIG.dataSheet);
      return handleSyncPush(pushSheet, params);
    }

    if (action === 'IMAGE_UPLOAD') {
      return handleImageUpload(params);
    }

    if (action === 'SEND_REMINDERS') {
      return handleSendReminders(params);
    }

    return jsonResponse({
      success: false,
      error: 'Unknown action: ' + action,
      schemaVersion: CONFIG.schemaVersion
    }, params.jsonp);

  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString(),
      schemaVersion: CONFIG.schemaVersion
    });
  }
}

// ─── Image Upload ───────────────────────────────────────────────────────────

/**
 * IMAGE_UPLOAD — stores a base64-encoded image in Google Drive (ItemPhotos folder),
 * makes it publicly viewable, and returns a direct image URL.
 *
 * Expects: params.data (base64 string), params.fileName (optional)
 * Returns: { success: true, url: "...", fileId: "..." }
 */
function handleImageUpload(params) {
  var data = (params.data || '').trim();
  if (!data) {
    return jsonResponse({ success: false, error: 'Missing image data.' });
  }

  try {
    var folder = getOrCreateItemPhotosFolder();
    var decoded = Utilities.base64Decode(data);
    var blob = Utilities.newBlob(decoded, 'image/jpeg', params.fileName || 'photo.jpg');
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var url = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1280';

    return jsonResponse({
      success: true,
      url: url,
      fileId: file.getId(),
      fileName: file.getName(),
      mimeType: file.getMimeType(),
      sizeBytes: file.getSize()
    });
  } catch (err) {
    return jsonResponse({ success: false, error: 'Image upload failed: ' + err.toString() });
  }
}

function getOrCreateItemPhotosFolder() {
  var folders = DriveApp.getFoldersByName('ItemPhotos');
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder('ItemPhotos');
}

// ─── Reminder Engine ─────────────────────────────────────────────────────────

/**
 * Handles client-initiated SEND_REMINDERS requests from the frontend
 * manual "Send Reminder Test" button.
 *
 * Expects params.payload = JSON array of recipient groups (structured by frontend).
 * Each group: { email, owner, items: [...], dedupeKeys: [...] }
 */
function handleSendReminders(params) {
  var rawPayload = (params.payload || '').trim();
  if (!rawPayload) {
    return jsonResponse({ success: false, error: 'Missing payload.' });
  }

  var groups;
  try {
    groups = JSON.parse(rawPayload);
  } catch (err) {
    return jsonResponse({ success: false, error: 'Invalid payload JSON: ' + err.message });
  }

  if (!Array.isArray(groups) || groups.length === 0) {
    return jsonResponse({ success: true, sent: 0, recipients: 0 });
  }

  var tz = Session.getScriptTimeZone();
  var todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

  var sentCount = 0;
  var recipientCount = 0;
  var errors = [];

  groups.forEach(function(group) {
    var email = group.email;
    var nOwner = group.owner || '';
    var items = group.items || [];

    if (!email || items.length === 0) return;

    try {
      var htmlBody = buildReminderEmailHtml(nOwner, items, todayStr);
      MailApp.sendEmail({
        to: email,
        subject: 'Inventory Reminder: Expiry / Low Stock Alerts',
        htmlBody: htmlBody
      });
      sentCount++;
      recipientCount++;
    } catch (err) {
      errors.push('Failed for ' + email + ': ' + err.message);
    }
  });

  return jsonResponse({
    success: true,
    sent: sentCount,
    recipients: recipientCount,
    errors: errors.length > 0 ? errors : undefined
  });
}

/**
 * Builds an HTML email body from the structured reminder groups.
 */
function buildReminderEmailHtml(ownerName, items, todayStr) {
  var expiringItems = [];
  var lowStockItems = [];

  items.forEach(function(item) {
    var reminderTypes = item.reminderTypes || [];

    if (reminderTypes.indexOf('expiry') !== -1) {
      (item.expiryDetails || []).forEach(function(ed) {
        expiringItems.push({
          name: item.name || '',
          itemId: item.itemId || '',
          category: item.category || '',
          location: ed.locationLabel || '—',
          expiryDate: ed.expiryDate || '',
          daysLeft: ed.daysLeft,
          remarks: item.remarks || ''
        });
      });
    }

    if (reminderTypes.indexOf('low_stock') !== -1) {
      lowStockItems.push({
        name: item.name || '',
        itemId: item.itemId || '',
        category: item.category || '',
        quantity: item.quantity || 0,
        minQuantity: item.minQuantity || 0,
        uom: item.uom || 'pcs',
        remarks: item.remarks || ''
      });
    }
  });

  var totalAlerts = expiringItems.length + lowStockItems.length;

  var html = '<html><body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px">';
  html += '<div style="background:#2563eb;color:white;padding:16px 20px;border-radius:8px 8px 0 0">';
  html += '<h2 style="margin:0;font-size:18px">Inventory Reminder</h2>';
  html += '<p style="margin:4px 0 0;font-size:12px;opacity:0.9">' + todayStr + '</p>';
  html += '</div>';
  html += '<div style="border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 8px 8px">';

  html += '<p style="font-size:14px">Hello ' + escapeHtml(ownerName) + ',</p>';
  html += '<p style="font-size:14px">You have <b>' + totalAlerts + '</b> alert(s) in your Home Inventory:</p>';

  if (expiringItems.length > 0) {
    html += '<h3 style="color:#dc2626;font-size:14px;margin-top:16px">Expiring Items</h3>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    html += '<tr style="background:#fef2f2"><th style="text-align:left;padding:6px;border:1px solid #fecaca">Item</th><th style="text-align:left;padding:6px;border:1px solid #fecaca">Location</th><th style="text-align:left;padding:6px;border:1px solid #fecaca">Expiry</th><th style="text-align:left;padding:6px;border:1px solid #fecaca">Days</th></tr>';
    expiringItems.forEach(function(ei) {
      html += '<tr>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0"><b>' + escapeHtml(ei.name) + '</b><br><span style="color:#64748b;font-size:10px">' + escapeHtml(ei.category) + '</span></td>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0">' + escapeHtml(ei.location) + '</td>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0">' + ei.expiryDate + '</td>';
      var daysColor = (ei.daysLeft <= 0) ? '#dc2626' : '#d97706';
      html += '<td style="padding:6px;border:1px solid #e2e8f0;color:' + daysColor + ';font-weight:bold">' + ei.daysLeft + 'd</td>';
      html += '</tr>';
    });
    html += '</table>';
  }

  if (lowStockItems.length > 0) {
    html += '<h3 style="color:#d97706;font-size:14px;margin-top:16px">Low Stock</h3>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    html += '<tr style="background:#fffbeb"><th style="text-align:left;padding:6px;border:1px solid #fde68a">Item</th><th style="text-align:left;padding:6px;border:1px solid #fde68a">Current</th><th style="text-align:left;padding:6px;border:1px solid #fde68a">Min</th><th style="text-align:left;padding:6px;border:1px solid #fde68a">Shortage</th></tr>';
    lowStockItems.forEach(function(lsi) {
      var shortage = Math.max(0, lsi.minQuantity - lsi.quantity);
      html += '<tr>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0"><b>' + escapeHtml(lsi.name) + '</b><br><span style="color:#64748b;font-size:10px">' + escapeHtml(lsi.category) + '</span></td>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0">' + lsi.quantity + ' ' + escapeHtml(lsi.uom) + '</td>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0">' + lsi.minQuantity + '</td>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0;color:#dc2626;font-weight:bold">-' + shortage + ' ' + escapeHtml(lsi.uom) + '</td>';
      html += '</tr>';
    });
    html += '</table>';
  }

  html += '<p style="font-size:11px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px">Sent by Find My Item — ' + new Date().toLocaleString() + '</p>';
  html += '</div></body></html>';

  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Time-driven trigger entry point. Reads stored data from the Data sheet
 * and sends expiry / low-stock reminder emails.
 */
function checkAndRemind() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.dataSheet);
  if (!sheet) {
    console.log('No Data sheet found.');
    return;
  }

  var chunkCount = parseInt(sheet.getRange('B2').getValue(), 10) || 1;
  var fullData = '';

  for (var i = 0; i < chunkCount; i++) {
    fullData += sheet.getRange(i + 1, 1).getValue();
  }

  if (!fullData) {
    console.log('No data stored in sheet.');
    return;
  }

  var data;
  try {
    data = JSON.parse(fullData);
  } catch (ex) {
    console.log('Failed to parse stored data: ' + ex);
    return;
  }

  var inventory = data.inventory || [];
  var reminderDays = data.reminderDays || 30;
  var userEmails = data.userEmails || {};

  sendExpiryReminders(inventory, reminderDays, userEmails);
  sendLowStockReminders(inventory, userEmails);
}

/**
 * Installs a daily time trigger to run checkAndRemind automatically.
 * Run once from the Apps Script editor to activate.
 */
function setupTimeTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'checkAndRemind') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('checkAndRemind')
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .create();

  console.log('Daily expiry / low-stock reminder trigger installed. Runs ~7 AM daily.');
}

// ─── Reminder Helpers ───────────────────────────────────────────────────────

function sumStockQuantity(item) {
  if (!item || item.itemType !== 'stock') return item.quantity || 0;
  var entries = (item.stockEntries && Array.isArray(item.stockEntries) ? item.stockEntries : []);
  var total = 0;
  for (var i = 0; i < entries.length; i++) {
    if (!entries[i].hiddenAt) total += entries[i].quantity || 0;
  }
  return total;
}

function getStockLocationLabel(entry) {
  if (!entry) return '';
  var parts = [entry.segment, entry.container, entry.subContainer].filter(function(p) { return !!p; });
  return parts.join(' > ') || '—';
}

function getItemExpiryDates(item) {
  var results = [];
  if (!item || item.deletedAt) return results;
  if (item.itemType !== 'stock' && item.expiryDate) {
    results.push({ locationLabel: null, expiryDate: item.expiryDate });
  }
  if (item.itemType === 'stock' && item.stockEntries && Array.isArray(item.stockEntries)) {
    for (var i = 0; i < item.stockEntries.length; i++) {
      var e = item.stockEntries[i];
      if (!e.hiddenAt && e.expiryDate) {
        results.push({ locationLabel: getStockLocationLabel(e), expiryDate: e.expiryDate });
      }
    }
  }
  return results;
}

function getItemOwnerEmail(owner, userEmails) {
  if (!owner || owner === 'Default') return '';
  return (userEmails && userEmails[owner]) || '';
}

function sendExpiryReminders(inventory, reminderDays, userEmails) {
  if (!inventory || !inventory.length) return;
  reminderDays = reminderDays || 30;
  userEmails = userEmails || {};

  var tz = Session.getScriptTimeZone();
  var now = new Date();
  var todayStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var cutoff = new Date(now.getTime() + reminderDays * 86400000);
  var cutoffStr = Utilities.formatDate(cutoff, tz, 'yyyy-MM-dd');

  // Collect all expiring items with per-entry granularity for stock items.
  var expiring = [];
  inventory.forEach(function(item) {
    if (item.deletedAt) return;
    var expiryDates = getItemExpiryDates(item);
    expiryDates.forEach(function(ed) {
      if (ed.expiryDate >= todayStr && ed.expiryDate <= cutoffStr) {
        expiring.push({
          item: item,
          expiryDate: ed.expiryDate,
          locationLabel: ed.locationLabel
        });
      }
    });
  });

  if (!expiring.length) { console.log('No items expiring within ' + reminderDays + ' days.'); return; }

  var reminded = getRemindedRecords('expiry');
  expiring = expiring.filter(function(rec) {
    var key = rec.item.id + '|' + rec.expiryDate;
    if (rec.locationLabel) key += '|' + rec.locationLabel;
    return reminded.indexOf(key) === -1;
  });

  if (!expiring.length) { console.log('All expiring items already reminded.'); return; }

  var byOwner = {};
  expiring.forEach(function(rec) {
    var owner = rec.item.owner || 'Default';
    var email = getItemOwnerEmail(owner, userEmails);
    if (!email) {
      // Default owner routes to all configured emails.
      var allEmails = Object.values(userEmails).filter(function(e) { return e && e.indexOf('@') > 0; });
      if (!allEmails.length) {
        console.log('No email for owner ' + owner + ', skipping: ' + rec.item.name);
        return;
      }
      allEmails.forEach(function(e) {
        if (!byOwner[e]) byOwner[e] = [];
        byOwner[e].push(rec);
      });
    } else {
      if (!byOwner[email]) byOwner[email] = [];
      byOwner[email].push(rec);
    }
  });

  var tz2 = Session.getScriptTimeZone();
  var todayStr2 = Utilities.formatDate(new Date(), tz2, 'yyyy-MM-dd');
  var newReminders = [];

  Object.keys(byOwner).forEach(function(toEmail) {
    var recs = byOwner[toEmail];
    var itemsList = recs.map(function(rec) {
      var it = rec.item;
      var key = it.id + '|' + rec.expiryDate;
      if (rec.locationLabel) key += '|' + rec.locationLabel;
      newReminders.push([key, 'expiry', todayStr2, it.name || '']);
      var row = '- ' + (it.name || '') + ' | expiry: ' + rec.expiryDate;
      if (rec.locationLabel) row += ' | location: ' + rec.locationLabel;
      else row += ' | location: ' + [it.segment, it.container, it.subContainer].filter(function(p) { return !!p; }).join(' / ');
      row += ' | category: ' + (it.category || '');
      return row;
    }).join('\n');

    var subject = 'Expiry Reminder: ' + recs.length + ' item(s) expiring within ' + reminderDays + ' days';
    var body = 'The following items are expiring soon:\n\n' + itemsList + '\n\n-- Sent by Find My Item';

    try {
      MailApp.sendEmail(toEmail, subject, body);
      console.log('Expiry email sent to ' + toEmail + ' (' + recs.length + ' items)');
    } catch (ex) { console.log('Expiry email send error to ' + toEmail + ': ' + ex); }
  });

  if (newReminders.length) saveRemindedRecords(newReminders);
}

function sendLowStockReminders(inventory, userEmails) {
  if (!inventory || !inventory.length) return;
  userEmails = userEmails || {};

  var tz = Session.getScriptTimeZone();
  var todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

  var activeLowStockKeys = getActiveLowStockKeys();
  var lowStockItems = [];
  var recoveredKeys = [];

  inventory.forEach(function(item) {
    if (!item || item.deletedAt || item.itemType !== 'stock') return;
    var qty = sumStockQuantity(item);
    var minQty = Number(item.minQuantity || 0);
    var key = item.id + '|low';
    if (qty <= minQty && minQty > 0) {
      if (activeLowStockKeys.indexOf(key) === -1) lowStockItems.push(item);
    } else {
      if (activeLowStockKeys.indexOf(key) !== -1) recoveredKeys.push(key);
    }
  });

  if (recoveredKeys.length) {
    clearLowStockReminderKeys(recoveredKeys);
    console.log('Cleared recovered low-stock keys: ' + recoveredKeys.join(', '));
  }

  if (!lowStockItems.length) { console.log('No new low-stock items to alert.'); return; }

  var byOwner = {};
  lowStockItems.forEach(function(item) {
    var owner = item.owner || 'Default';
    var email = getItemOwnerEmail(owner, userEmails);
    if (!email) {
      var allEmails = Object.values(userEmails).filter(function(e) { return e && e.indexOf('@') > 0; });
      if (!allEmails.length) {
        console.log('No email for owner ' + owner + ', skipping low-stock: ' + item.name);
        return;
      }
      allEmails.forEach(function(e) {
        if (!byOwner[e]) byOwner[e] = [];
        byOwner[e].push(item);
      });
    } else {
      if (!byOwner[email]) byOwner[email] = [];
      byOwner[email].push(item);
    }
  });

  var newReminders = [];
  Object.keys(byOwner).forEach(function(toEmail) {
    var items = byOwner[toEmail];
    var itemsList = items.map(function(item) {
      var key = item.id + '|low';
      newReminders.push([key, 'stock', todayStr, item.name || '']);
      var qty = sumStockQuantity(item);
      // Build location from stock entries.
      var entries = (item.stockEntries && Array.isArray(item.stockEntries) ? item.stockEntries : []);
      var locs = [];
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].hiddenAt) locs.push(getStockLocationLabel(entries[i]));
      }
      return '- ' + (item.name || '') +
             ' | stock: ' + qty + ' ' + (item.uom || 'pcs') +
             ' | min: ' + (item.minQuantity || 0) +
             ' | category: ' + (item.category || '') +
             ' | location: ' + (locs.length ? locs.join('; ') : '—');
    }).join('\n');

    var subject = 'Low Stock Alert: ' + items.length + ' item(s) need reorder';
    var body = 'The following stock items are at or below minimum level:\n\n' + itemsList + '\n\nPlease reorder soon.\n\n-- Sent by Find My Item';

    try {
      MailApp.sendEmail(toEmail, subject, body);
      console.log('Low-stock email sent to ' + toEmail + ' (' + items.length + ' items)');
    } catch (ex) { console.log('Low-stock email error to ' + toEmail + ': ' + ex); }
  });

  if (newReminders.length) saveRemindedRecords(newReminders);
}

// ─── Reminder Record Helpers ────────────────────────────────────────────────

function getRemindedRecords(type) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Reminders');
  if (!sheet) return [];

  var lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow < 2) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  var keys = [];
  data.forEach(function(row) {
    var key = String(row[0] || '');
    if (key && row[1] === type) keys.push(key);
  });
  return keys;
}

function getActiveLowStockKeys() {
  return getRemindedRecords('stock');
}

function clearLowStockReminderKeys(keysToRemove) {
  if (!keysToRemove || !keysToRemove.length) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Reminders');
  if (!sheet) return;

  var lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow < 2) return;

  var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  var rowsToKeep = [];
  data.forEach(function(row) {
    if (row[1] === 'stock' && keysToRemove.indexOf(String(row[0] || '')) !== -1) return;
    rowsToKeep.push(row);
  });

  sheet.getRange(2, 1, Math.max(lastRow - 1, 1), 4).clearContent();
  if (rowsToKeep.length) {
    sheet.getRange(2, 1, rowsToKeep.length, 4).setValues(rowsToKeep);
  }
}

function saveRemindedRecords(records) {
  if (!records || !records.length) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Reminders');
  if (!sheet) {
    sheet = ss.insertSheet('Reminders');
    sheet.getRange(1, 1, 1, 4).setValues([['Key', 'Type', 'Date', 'Name']]);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }
  var lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.getRange(lastRow + 1, 1, records.length, 4).setValues(records);
}
