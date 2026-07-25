/**
 * Home Inventory — Google Apps Script Backend (Protocol v3)
 * Deploy as a Web App (Execute as: Me, Access: Anyone).
 *
 * Actions:
 *   POST token=X&action=SYNC_PULL&protocolVersion=3&payload=...
 *   POST token=X&action=SYNC_PUSH&protocolVersion=3&payload=...
 *   POST token=X&action=SYNC_BOOTSTRAP&protocolVersion=3&payload=...
 *   POST token=X&action=IMAGE_UPLOAD&... (unchanged)
 *   POST token=X&action=SEND_REMINDERS&... (unchanged)
 *
 * Protocol version 3 replaces the legacy snapshot/operation protocol.
 * Uses double-buffered atomic snapshot writes, script lock, per-operation
 * results, operation-content hashing, and entity version concurrency control.
 */

// ─── Configuration ──────────────────────────────────────────────────────────

var CONFIG = {
  PROTOCOL_VERSION: 3,
  schemaVersion: '3.0.0',
  maxCellSize: 40000,
  maxOpsPerPush: 200,
  maxPayloadSize: 5000000,
  maxItemNameLen: 500,
  maxTextFieldLen: 10000,
  maxReminderDays: 365,
  lockTimeoutMs: 25000
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSecretToken() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('SYNC_SECRET_TOKEN');
  if (!token) {
    // Legacy fallback: try the old hardcoded default for migration
    // Remove this after migration — see README
    return 'secretToken123';
  }
  return token;
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(code, message, retryable) {
  return jsonResponse_({
    success: false,
    errorCode: code,
    message: message || code,
    retryable: !!retryable
  });
}

function validateToken_(token) {
  if (!token) return { valid: false, code: 'AUTH_FAILED', message: 'Missing authentication token.' };
  if (token !== getSecretToken()) return { valid: false, code: 'AUTH_FAILED', message: 'Invalid authentication token.' };
  return { valid: true };
}

function generateOpIdHash_(op) {
  // Simple deterministic hash of opId+type+payload for dedup validation
  var str = JSON.stringify({
    opId: op.opId || '',
    type: op.type || '',
    entityType: op.entityType || '',
    entityId: op.entityId || '',
    baseVersion: op.baseVersion || 0,
    payload: op.payload || {}
  });
  return computeSha256_(str);
}

function computeSha256_(str) {
  // Google Apps Script provides Utilities.computeDigest
  try {
    var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
    return raw.map(function(b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
  } catch(e) {
    // Fallback to simple hash if SHA-256 unavailable (shouldn't happen)
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'h' + Math.abs(hash).toString(36);
  }
}

// ─── Sheet Helpers ─────────────────────────────────────────────────────────

function ensureSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  }
  return sheet;
}

// ─── Snapshot Storage (double-buffered) ─────────────────────────────────────

function loadMeta_() {
  var sheet = ensureSheet_('Meta', ['key', 'value']);
  var data = sheet.getDataRange().getValues();
  var meta = {};
  for (var i = 0; i < data.length; i++) {
    meta[String(data[i][0] || '')] = String(data[i][1] || '');
  }
  return meta;
}

function saveMeta_(meta) {
  var sheet = ensureSheet_('Meta', ['key', 'value']);
  var rows = Object.keys(meta).map(function(k) { return [k, String(meta[k])]; });
  sheet.clearContents();
  if (rows.length > 0) sheet.getRange(1, 1, rows.length, 2).setValues(rows);
}

function readSlot_(slotName) {
  var sheet = ensureSheet_(slotName, []);
  var chunkCount = getSlotChunkCount_(slotName);
  if (chunkCount <= 0) return '';
  var full = '';
  for (var i = 0; i < chunkCount; i++) {
    full += (sheet.getRange('A' + (i + 1)).getValue() || '');
  }
  return full;
}

function getSlotChunkCount_(slotName) {
  var sheet = ensureSheet_(slotName, []);
  // Read chunk count from B1
  var val = sheet.getRange('B1').getValue();
  return parseInt(val, 10) || 0;
}

function setSlotChunkCount_(slotName, count) {
  var sheet = ensureSheet_(slotName, []);
  sheet.getRange('B1').setValue(count);
}

function writeSlot_(slotName, jsonStr) {
  var sheet = ensureSheet_(slotName, []);
  sheet.getRange('A:A').clearContent();
  var chunks = Math.ceil(jsonStr.length / CONFIG.maxCellSize);
  for (var i = 0; i < chunks; i++) {
    sheet.getRange('A' + (i + 1)).setValue(
      jsonStr.substring(i * CONFIG.maxCellSize, (i + 1) * CONFIG.maxCellSize)
    );
  }
  setSlotChunkCount_(slotName, chunks);
}

function verifySlotReadBack_(slotName, expectedChecksum) {
  var readBack = readSlot_(slotName);
  try { JSON.parse(readBack); } catch(e) { return false; }
  var actual = computeSha256_(readBack);
  return actual === expectedChecksum;
}

function loadCanonicalSnapshot_() {
  var meta = loadMeta_();
  var activeSlot = meta.activeSlot || 'Data_A';
  var full = readSlot_(activeSlot);
  if (!full) return null;
  try {
    var snap = JSON.parse(full);
    return snap;
  } catch(e) {
    // Try the other slot as fallback
    var otherSlot = activeSlot === 'Data_A' ? 'Data_B' : 'Data_A';
    var other = readSlot_(otherSlot);
    if (other) {
      try { return JSON.parse(other); } catch(e2) {}
    }
    return null;
  }
}

function saveCanonicalSnapshot_(snap) {
  var meta = loadMeta_();
  var oldActive = meta.activeSlot || 'Data_A';
  var newSlot = oldActive === 'Data_A' ? 'Data_B' : 'Data_A';
  var jsonStr = JSON.stringify(snap);
  var checksum = computeSha256_(jsonStr);

  // Write to inactive slot first
  writeSlot_(newSlot, jsonStr);

  // Verify
  if (!verifySlotReadBack_(newSlot, checksum)) {
    // Try rewriting once more
    writeSlot_(newSlot, jsonStr);
    if (!verifySlotReadBack_(newSlot, checksum)) {
      return { success: false, error: 'CHECKSUM_MISMATCH' };
    }
  }

  // Update meta atomically
  meta.activeSlot = newSlot;
  meta.activeChecksum = checksum;
  meta.activeChunkCount = String(Math.ceil(jsonStr.length / CONFIG.maxCellSize));
  meta.initialized = 'true';
  meta.serverSeq = String(snap.meta && snap.meta.serverSeq != null ? snap.meta.serverSeq : (parseInt(meta.serverSeq, 10) || 0));
  meta.updatedAt = (snap.meta && snap.meta.updatedAt) || new Date().toISOString();
  meta.schemaVersion = CONFIG.schemaVersion;
  meta.protocolVersion = String(CONFIG.PROTOCOL_VERSION);
  saveMeta_(meta);

  // Flush
  SpreadsheetApp.flush();

  // Clear old unused rows in the old active slot (best-effort)
  try {
    var oldSheet = ensureSheet_(oldActive, []);
    var newChunkCount = Math.ceil(jsonStr.length / CONFIG.maxCellSize);
    if (oldSheet.getLastRow() > newChunkCount) {
      oldSheet.getRange(newChunkCount + 1, 1, Math.max(oldSheet.getLastRow() - newChunkCount, 1)).clearContent();
    }
  } catch(e) {}

  return { success: true };
}

// ─── Operation Log (Ops sheet) ─────────────────────────────────────────────

var _opsCache = null;

function loadOpRecords_() {
  if (_opsCache) return _opsCache;
  var sheet = ensureSheet_('Ops', [
    'serverSeq', 'opId', 'operationHash', 'deviceId', 'type', 'entityType',
    'entityId', 'status', 'errorCode', 'entityVersion', 'timestamp', 'json'
  ]);
  var lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow < 2) { _opsCache = []; return _opsCache; }
  var data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  _opsCache = data.map(function(r, idx) {
    var payload = {};
    try { var parsed = JSON.parse(r[11] || '{}'); payload = parsed.payload || parsed; } catch(e) {}
    return {
      serverSeq: parseInt(r[0] || 0, 10),
      opId: String(r[1] || ''),
      operationHash: String(r[2] || ''),
      deviceId: String(r[3] || ''),
      type: String(r[4] || ''),
      entityType: String(r[5] || ''),
      entityId: String(r[6] || ''),
      status: String(r[7] || ''),
      errorCode: String(r[8] || ''),
      entityVersion: parseInt(r[9] || 0, 10),
      timestamp: String(r[10] || ''),
      payload: payload
    };
  });
  return _opsCache;
}

function findOpById_(opId) {
  var ops = loadOpRecords_();
  for (var i = 0; i < ops.length; i++) {
    if (ops[i].opId === opId) return ops[i];
  }
  return null;
}

function appendOpRecord_(record) {
  var sheet = ensureSheet_('Ops', [
    'serverSeq', 'opId', 'operationHash', 'deviceId', 'type', 'entityType',
    'entityId', 'status', 'errorCode', 'entityVersion', 'timestamp', 'json'
  ]);
  var lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.getRange(lastRow + 1, 1, 1, 12).setValues([[
    record.serverSeq || 0,
    record.opId || '',
    record.operationHash || '',
    record.deviceId || '',
    record.type || '',
    record.entityType || '',
    record.entityId || '',
    record.status || '',
    record.errorCode || '',
    record.entityVersion || 0,
    record.timestamp || new Date().toISOString(),
    JSON.stringify({ payload: record.payload || {} })
  ]]);
  // Invalidate cache
  _opsCache = null;
}

// ─── Sync Audit ─────────────────────────────────────────────────────────────

function writeSyncAudit_(sessionStart, deviceId, action, baseRev, newRev, opsCount, success, durationMs) {
  var sheet = ensureSheet_('SyncAudit', [
    'Timestamp', 'DeviceId', 'Action', 'BaseRevision', 'NewRevision',
    'OpsCount', 'Success', 'DurationMs'
  ]);
  var lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.getRange(lastRow + 1, 1, 1, 8).setValues([[
    sessionStart.toISOString(),
    deviceId || '',
    action || '',
    baseRev || 0,
    newRev || 0,
    opsCount || 0,
    success ? 'TRUE' : 'FALSE',
    durationMs || 0
  ]]);
}

// ─── Dead Letters ───────────────────────────────────────────────────────────

function writeDeadLetter_(op, reason) {
  var sheet = ensureSheet_('DeadLetters', [
    'Timestamp', 'OpId', 'DeviceId', 'Type', 'RawJson', 'ErrorReason'
  ]);
  var lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.getRange(lastRow + 1, 1, 1, 6).setValues([[
    new Date().toISOString(),
    (op && op.opId) || '',
    (op && op.deviceId) || '',
    (op && op.type) || '',
    JSON.stringify(op || {}),
    reason || ''
  ]]);
}

// ─── Request Parser ─────────────────────────────────────────────────────────

function parseRequest_(e) {
  e = e || {};
  var p = e.parameter || {};
  var result = {
    token:         (p.token || '').trim(),
    action:        (p.action || '').trim(),
    protocolVersion: parseInt(p.protocolVersion || '0', 10),
    payload:       (p.payload || '').trim(),
    jsonp:         (p.jsonp || '').trim(),
    data:          (p.data || '').trim(),
    fileName:      (p.fileName || '').trim(),
    schemaVersion: (p.schemaVersion || '').trim()
  };

  // Parse JSON body if present
  if (!result.token && !result.action && e.postData && e.postData.contents) {
    var body = e.postData.contents;
    try {
      var jsonBody = JSON.parse(body);
      result.token = jsonBody.token || result.token;
      result.action = jsonBody.action || result.action;
      result.protocolVersion = jsonBody.protocolVersion || result.protocolVersion;
      result.payload = jsonBody.payload || result.payload;
      result.data = jsonBody.data || result.data;
      result.fileName = jsonBody.fileName || result.fileName;
      result.schemaVersion = jsonBody.schemaVersion || result.schemaVersion;
    } catch(ex) {
      // Parse URL-encoded body
      var parts = body.split('&');
      parts.forEach(function(part) {
        var idx = part.indexOf('=');
        if (idx < 0) return;
        var key = decodeURIComponent(part.substring(0, idx));
        var val = decodeURIComponent(part.substring(idx + 1));
        if (key === 'token') result.token = val;
        else if (key === 'action') result.action = val;
        else if (key === 'protocolVersion') result.protocolVersion = parseInt(val, 10);
        else if (key === 'payload') result.payload = val;
        else if (key === 'data') result.data = val;
        else if (key === 'fileName') result.fileName = val;
      });
    }
  }

  return result;
}

// ─── Main Router ────────────────────────────────────────────────────────────

function doGet(e)  { return handleRequest_(e); }
function doPost(e) { return handleRequest_(e); }

function handleRequest_(e) {
  try {
    var params = parseRequest_(e);

    // Authenticate
    var auth = validateToken_(params.token);
    if (!auth.valid) {
      return errorResponse_(auth.code, auth.message, false);
    }

    var action = params.action;

    // IMAGE_UPLOAD and SEND_REMINDERS don't need protocol version
    if (action === 'IMAGE_UPLOAD') return handleImageUpload_(params);
    if (action === 'SEND_REMINDERS') return handleSendReminders_(params);

    // Sync actions require protocol v3
    if (params.protocolVersion !== CONFIG.PROTOCOL_VERSION) {
      return jsonResponse_({
        success: false,
        errorCode: 'PROTOCOL_VERSION_MISMATCH',
        expectedProtocolVersion: CONFIG.PROTOCOL_VERSION,
        receivedProtocolVersion: params.protocolVersion,
        retryable: false
      });
    }

    // Route sync actions
    if (action === 'SYNC_PULL') return handleSyncPullV3_(params);
    if (action === 'SYNC_PUSH') return handleSyncPushV3_(params);
    if (action === 'SYNC_BOOTSTRAP') return handleSyncBootstrapV3_(params);

    return errorResponse_('INVALID_REQUEST', 'Unknown action: ' + action, false);

  } catch (err) {
    return jsonResponse_({
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: err.toString(),
      retryable: false
    });
  }
}

// ─── SYNC_PULL (v3) ────────────────────────────────────────────────────────

function handleSyncPullV3_(params) {
  var startTs = new Date();
  var payload = {};
  try {
    if (params.payload) payload = JSON.parse(params.payload);
  } catch(e) {}
  var deviceId = payload.deviceId || 'unknown';
  var requestId = payload.requestId || '';

  var snap = loadCanonicalSnapshot_();
  var meta = loadMeta_();
  var initialized = meta.initialized === 'true';
  var serverSeq = parseInt(meta.serverSeq || '0', 10);

  var resp = {
    success: true,
    initialized: initialized,
    serverSeq: serverSeq,
    snapshot: null
  };

  if (initialized && snap) {
    resp.snapshot = snap;
  }

  var endTs = new Date();
  writeSyncAudit_(startTs, deviceId, 'SYNC_PULL', serverSeq, serverSeq, 0, true, endTs - startTs);

  return jsonResponse_(resp);
}

// ─── SYNC_BOOTSTRAP (v3) ───────────────────────────────────────────────────

function handleSyncBootstrapV3_(params) {
  var startTs = new Date();

  var payload = {};
  try { payload = JSON.parse(params.payload); } catch(e) {
    return errorResponse_('INVALID_REQUEST', 'Invalid payload JSON', false);
  }

  var deviceId = payload.deviceId || 'unknown';
  var requestId = payload.requestId || '';
  var expectedServerSeq = parseInt(payload.expectedServerSeq || -1, 10);

  var lock = LockService.getScriptLock();
  var acquired = false;
  try { lock.waitLock(3000); acquired = true; } catch(e) {}

  if (!acquired) return errorResponse_('SERVER_BUSY', 'Cannot acquire lock', true);

  try {
    var meta = loadMeta_();
    var initialized = meta.initialized === 'true';

    if (initialized) {
      return jsonResponse_({
        success: false,
        errorCode: 'SERVER_ALREADY_INITIALIZED',
        retryable: false
      });
    }

    if (expectedServerSeq !== 0) {
      return errorResponse_('INVALID_REQUEST', 'expectedServerSeq must be 0 for bootstrap', false);
    }

    // Validate and normalize the snapshot
    var snap = normalizeBootstrapSnapshot_(payload.snapshot || {});

    // Assign versions
    if (snap.inventory && snap.inventory.length > 0) {
      snap.inventory.forEach(function(item) {
        if (!item.version || item.version < 1) item.version = 1;
        if (!item.createdAt) item.createdAt = new Date().toISOString();
        if (!item.updatedAt) item.updatedAt = new Date().toISOString();
        if (!item.id) item.id = 'itm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);

        if (item.stockEntries && Array.isArray(item.stockEntries)) {
          item.stockEntries.forEach(function(entry) {
            if (!entry.version || entry.version < 1) entry.version = 1;
            if (!entry.createdAt) entry.createdAt = new Date().toISOString();
            if (!entry.updatedAt) entry.updatedAt = new Date().toISOString();
            if (!entry.id) entry.id = 'se_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
          });
        }
      });
    }

    // Recompute derived quantities
    snap.inventory.forEach(function(item) {
      item.quantity = recomputeItemStockQuantity_(item);
    });

    // Set meta
    snap.meta = snap.meta || {};
    snap.meta.serverSeq = 1;
    snap.meta.updatedAt = new Date().toISOString();
    snap.meta.initialized = true;
    snap.meta.locationsVersion = Object.keys(snap.segments || {}).length > 0 ? 1 : 0;
    snap.meta.categoriesVersion = Object.keys(snap.categories || {}).length > 0 ? 1 : 0;
    snap.meta.householdSettingsVersion = 1;
    snap.protocolVersion = CONFIG.PROTOCOL_VERSION;
    snap.schemaVersion = CONFIG.schemaVersion;

    // Save
    var saveResult = saveCanonicalSnapshot_(snap);
    if (!saveResult.success) {
      return errorResponse_(saveResult.error, 'Failed to save snapshot', true);
    }

    // Append bootstrap op record
    appendOpRecord_({
      serverSeq: 1,
      opId: 'bootstrap_' + deviceId,
      operationHash: 'bootstrap',
      deviceId: deviceId,
      type: 'BOOTSTRAP',
      entityType: 'system',
      entityId: '',
      status: 'applied',
      errorCode: '',
      entityVersion: 1,
      timestamp: new Date().toISOString(),
      payload: {}
    });

    var endTs = new Date();
    writeSyncAudit_(startTs, deviceId, 'SYNC_BOOTSTRAP', 0, 1, 0, true, endTs - startTs);

    return jsonResponse_({
      success: true,
      initialized: true,
      serverSeq: 1,
      snapshot: snap
    });

  } catch (err) {
    return errorResponse_('INTERNAL_ERROR', err.toString(), false);
  } finally {
    if (acquired) lock.releaseLock();
  }
}

function normalizeBootstrapSnapshot_(snap) {
  snap = snap || {};
  snap.segments = snap.segments || {};
  snap.coordinates = snap.coordinates || {};
  snap.spatialBackgroundImage = snap.spatialBackgroundImage || null;
  snap.categories = snap.categories || {};
  snap.inventory = snap.inventory || [];
  snap.users = snap.users || ['Default'];
  snap.userEmails = snap.userEmails || {};
  snap.reminderDays = snap.reminderDays || 30;
  return snap;
}

// ─── SYNC_PUSH (v3) ────────────────────────────────────────────────────────

function handleSyncPushV3_(params) {
  var startTs = new Date();

  var payload = {};
  try { payload = JSON.parse(params.payload); } catch(e) {
    return errorResponse_('INVALID_REQUEST', 'Invalid payload JSON', false);
  }

  var deviceId = payload.deviceId || 'unknown';
  var requestId = payload.requestId || '';
  var operations = payload.operations || [];

  // Validate payload size
  if (params.payload.length > CONFIG.maxPayloadSize) {
    return errorResponse_('PAYLOAD_TOO_LARGE', 'Payload exceeds maximum size', false);
  }

  if (operations.length > CONFIG.maxOpsPerPush) {
    return errorResponse_('PAYLOAD_TOO_LARGE', 'Too many operations in single push', false);
  }

  var lock = LockService.getScriptLock();
  var acquired = false;
  var waitStart = new Date().getTime();
  while (!acquired && (new Date().getTime() - waitStart) < CONFIG.lockTimeoutMs) {
    try { lock.waitLock(5000); acquired = true; } catch(e) {
      if (new Date().getTime() - waitStart >= CONFIG.lockTimeoutMs) break;
    }
  }

  if (!acquired) return errorResponse_('SERVER_BUSY', 'Synchronization is temporarily busy.', true);

  try {
    var meta = loadMeta_();
    if (meta.initialized !== 'true') {
      return errorResponse_('SERVER_NOT_INITIALIZED', 'Server not initialized', false);
    }

    var snap = loadCanonicalSnapshot_();
    if (!snap) {
      return errorResponse_('SNAPSHOT_CORRUPT', 'Cannot load snapshot', false);
    }

    // Initialize meta if needed
    snap.meta = snap.meta || {};
    snap.meta.serverSeq = snap.meta.serverSeq || parseInt(meta.serverSeq || '0', 10) || 0;
    snap.meta.locationsVersion = snap.meta.locationsVersion || 0;
    snap.meta.categoriesVersion = snap.meta.categoriesVersion || 0;
    snap.meta.householdSettingsVersion = snap.meta.householdSettingsVersion || 0;

    var existingOps = loadOpRecords_();
    var opMap = {};
    existingOps.forEach(function(r) { opMap[r.opId] = r; });

    var results = [];
    var currentSeq = snap.meta.serverSeq;

    for (var i = 0; i < operations.length; i++) {
      var op = operations[i];
      var result = processSingleOperation_(snap, op, currentSeq, opMap, deviceId);

      if (result.status === 'applied') {
        currentSeq += 1;
        result.serverSeq = currentSeq;
        snapshotResultToRecord_(result, op);
      }

      results.push(result);
    }

    // Update snapshot meta
    snap.meta.serverSeq = currentSeq;
    snap.meta.updatedAt = new Date().toISOString();
    snap.protocolVersion = CONFIG.PROTOCOL_VERSION;
    snap.schemaVersion = CONFIG.schemaVersion;

    // Recompute all derived quantities
    snap.inventory.forEach(function(item) {
      item.quantity = recomputeItemStockQuantity_(item);
    });

    // Save atomically
    var saveResult = saveCanonicalSnapshot_(snap);
    if (!saveResult.success) {
      return errorResponse_(saveResult.error, 'Failed to save snapshot', true);
    }

    var endTs = new Date();
    writeSyncAudit_(startTs, deviceId, 'SYNC_PUSH', snap.meta.serverSeq - operations.length, currentSeq,
      operations.length, true, endTs - startTs);

    return jsonResponse_({
      success: true,
      serverSeq: currentSeq,
      results: results,
      snapshot: snap
    });

  } catch (err) {
    return errorResponse_('INTERNAL_ERROR', err.toString(), false);
  } finally {
    if (acquired) lock.releaseLock();
  }
}

// ─── Single Operation Processing ────────────────────────────────────────────

var VALID_OP_TYPES = [
  'ITEM_PUT', 'ITEM_DELETE',
  'STOCK_ENTRY_PUT', 'STOCK_ENTRY_DELETE', 'STOCK_ADJUST',
  'LOCATIONS_PUT', 'CATEGORIES_PUT', 'HOUSEHOLD_SETTINGS_PUT'
];

function snapshotResultToRecord_(result, op) {
  var hash = '';
  try { hash = generateOpIdHash_(op); } catch(e) {}

  appendOpRecord_({
    serverSeq: result.serverSeq || 0,
    opId: op.opId || '',
    operationHash: hash,
    deviceId: op.deviceId || '',
    type: op.type || '',
    entityType: op.entityType || '',
    entityId: op.entityId || '',
    status: result.status || 'rejected',
    errorCode: result.errorCode || '',
    entityVersion: result.entityVersion || 0,
    timestamp: new Date().toISOString(),
    payload: op.payload || {}
  });
}

function processSingleOperation_(snap, op, currentSeq, opMap, deviceId) {
  // Validate required fields
  if (!op || !op.opId || !op.type) {
    return { opId: (op && op.opId) || '', status: 'rejected', errorCode: 'INVALID_OPERATION' };
  }

  var opId = op.opId;
  var type = op.type;

  // Check unknown type
  if (VALID_OP_TYPES.indexOf(type) === -1) {
    writeDeadLetter_(op, 'UNKNOWN_OPERATION: ' + type);
    return { opId: opId, status: 'rejected', errorCode: 'UNKNOWN_OPERATION' };
  }

  // Compute operation hash
  var opHash = generateOpIdHash_(op);

  // Check for duplicate opId
  var existing = findOpById_(opId);
  if (existing) {
    if (existing.operationHash && existing.operationHash !== opHash) {
      return {
        opId: opId,
        status: 'rejected',
        errorCode: 'OP_ID_REUSE'
      };
    }
    // Same hash — duplicate
    return {
      opId: opId,
      status: 'duplicate',
      serverSeq: existing.serverSeq,
      entityType: existing.entityType,
      entityId: existing.entityId,
      entityVersion: existing.entityVersion
    };
  }

  // Check dependsOnOpId
  if (op.dependsOnOpId) {
    var dep = findOpById_(op.dependsOnOpId);
    if (!dep || (dep.status !== 'applied' && dep.status !== 'duplicate')) {
      return {
        opId: opId,
        status: 'blocked',
        errorCode: 'DEPENDENCY_FAILED'
      };
    }
  }

  // Apply operation
  try {
    return applyV3Operation_(snap, op, opHash);
  } catch(err) {
    return {
      opId: opId,
      status: 'rejected',
      errorCode: 'INTERNAL_ERROR',
      message: err.toString()
    };
  }
}

// ─── V3 Operation Application ───────────────────────────────────────────────

function applyV3Operation_(snap, op, opHash) {
  var type = op.type;
  var payload = op.payload || {};
  var baseVersion = op.baseVersion || 0;
  var entityId = op.entityId || '';

  switch (type) {
    case 'ITEM_PUT': return applyItemPut_(snap, op, payload, baseVersion, entityId);
    case 'ITEM_DELETE': return applyItemDelete_(snap, op, payload, baseVersion, entityId);
    case 'STOCK_ENTRY_PUT': return applyStockEntryPut_(snap, op, payload, baseVersion);
    case 'STOCK_ENTRY_DELETE': return applyStockEntryDelete_(snap, op, payload, baseVersion);
    case 'STOCK_ADJUST': return applyStockAdjust_(snap, op, payload);
    case 'LOCATIONS_PUT': return applyLocationsPut_(snap, op, payload, baseVersion);
    case 'CATEGORIES_PUT': return applyCategoriesPut_(snap, op, payload, baseVersion);
    case 'HOUSEHOLD_SETTINGS_PUT': return applyHouseholdSettingsPut_(snap, op, payload, baseVersion);
    default:
      return { opId: op.opId, status: 'rejected', errorCode: 'UNKNOWN_OPERATION' };
  }
}

// ─── ITEM_PUT ───────────────────────────────────────────────────────────────

function applyItemPut_(snap, op, payload, baseVersion, entityId) {
  var itemData = payload.item || {};
  var itemId = entityId || itemData.id || '';

  if (!itemId) {
    return { opId: op.opId, status: 'rejected', errorCode: 'INVALID_OPERATION', message: 'Missing item id' };
  }

  snap.inventory = snap.inventory || [];

  if (baseVersion === 0) {
    // CREATE
    var existing = snap.inventory.find(function(i) { return i.id === itemId; });
    if (existing && !existing.deletedAt) {
      return {
        opId: op.opId, status: 'conflict', errorCode: 'ENTITY_ALREADY_EXISTS',
        entityType: 'item', entityId: itemId, expectedVersion: 0, actualVersion: existing.version || 1,
        serverEntity: sanitizeServerEntity_(existing)
      };
    }
    var now = new Date().toISOString();
    var newItem = {
      id: itemId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    applyItemFields_(newItem, itemData);
    newItem.quantity = 0;
    newItem.stockEntries = newItem.stockEntries || [];
    snap.inventory.push(newItem);

    return {
      opId: op.opId, status: 'applied',
      entityType: 'item', entityId: itemId, entityVersion: 1
    };

  } else {
    // UPDATE
    var idx = snap.inventory.findIndex(function(i) { return i.id === itemId; });
    if (idx < 0) {
      return {
        opId: op.opId, status: 'rejected', errorCode: 'ENTITY_NOT_FOUND',
        entityType: 'item', entityId: itemId
      };
    }

    var item = snap.inventory[idx];

    if (item.deletedAt) {
      return {
        opId: op.opId, status: 'rejected', errorCode: 'ENTITY_DELETED',
        entityType: 'item', entityId: itemId,
        serverEntity: sanitizeServerEntity_(item)
      };
    }

    if (baseVersion !== (item.version || 0)) {
      return {
        opId: op.opId, status: 'conflict', errorCode: 'VERSION_CONFLICT',
        entityType: 'item', entityId: itemId,
        expectedVersion: baseVersion, actualVersion: item.version || 0,
        serverEntity: sanitizeServerEntity_(item)
      };
    }

    // Apply allowed fields (NOT quantity, stockEntries, version, timestamps)
    applyItemFields_(item, itemData);
    item.version = (item.version || 0) + 1;
    item.updatedAt = new Date().toISOString();

    return {
      opId: op.opId, status: 'applied',
      entityType: 'item', entityId: itemId, entityVersion: item.version
    };
  }
}

function applyItemFields_(item, data) {
  var allowed = ['barcodeId', 'name', 'brand', 'category', 'itemType', 'owner',
    'uom', 'minQuantity', 'remarks', 'aiMetadata',
    'imageUrl', 'imageThumbUrl', 'imageSourceType', 'imageThumbKey', 'imageFullKey', 'imageMeta',
    'segment', 'container', 'subContainer',
    'purchaseDate', 'warrantyDate', 'expiryDate'];

  allowed.forEach(function(f) {
    if (data[f] !== undefined) item[f] = data[f];
  });

  // Ensure stockEntries exists for stock items
  if (item.itemType === 'stock' && !item.stockEntries) {
    item.stockEntries = [];
  }

  // Do NOT overwrite: quantity, stockEntries, version, createdAt, updatedAt, deletedAt
}

function sanitizeServerEntity_(item) {
  var clean = {};
  if (!item) return clean;
  var fields = ['id', 'version', 'name', 'brand', 'category', 'segment', 'container', 'subContainer',
    'owner', 'uom', 'minQuantity', 'quantity', 'remarks', 'aiMetadata', 'barcodeId',
    'purchaseDate', 'warrantyDate', 'expiryDate', 'itemType',
    'imageUrl', 'imageThumbUrl', 'imageSourceType', 'imageThumbKey', 'imageFullKey', 'imageMeta',
    'createdAt', 'updatedAt', 'deletedAt', 'stockEntries'];
  fields.forEach(function(f) {
    if (item[f] !== undefined) clean[f] = item[f];
  });
  return clean;
}

// ─── ITEM_DELETE ────────────────────────────────────────────────────────────

function applyItemDelete_(snap, op, payload, baseVersion, entityId) {
  snap.inventory = snap.inventory || [];
  var idx = snap.inventory.findIndex(function(i) { return i.id === entityId; });
  if (idx < 0) {
    return {
      opId: op.opId, status: 'rejected', errorCode: 'ENTITY_NOT_FOUND',
      entityType: 'item', entityId: entityId
    };
  }

  var item = snap.inventory[idx];

  if (item.deletedAt) {
    // Already deleted — idempotent success
    return {
      opId: op.opId, status: 'applied',
      entityType: 'item', entityId: entityId, entityVersion: item.version || 0
    };
  }

  if (baseVersion !== (item.version || 0)) {
    return {
      opId: op.opId, status: 'conflict', errorCode: 'VERSION_CONFLICT',
      entityType: 'item', entityId: entityId,
      expectedVersion: baseVersion, actualVersion: item.version || 0,
      serverEntity: sanitizeServerEntity_(item)
    };
  }

  item.deletedAt = new Date().toISOString();
  item.version = (item.version || 0) + 1;
  item.updatedAt = new Date().toISOString();

  // Stock entries remain as tombstone data

  return {
    opId: op.opId, status: 'applied',
    entityType: 'item', entityId: entityId, entityVersion: item.version
  };
}

// ─── STOCK_ENTRY_PUT ────────────────────────────────────────────────────────

function applyStockEntryPut_(snap, op, payload, baseVersion) {
  var itemId = payload.itemId || '';
  var entryData = payload.entry || {};
  var entryId = entryData.id || '';
  var initialQuantity = Number(payload.initialQuantity);

  if (!itemId || !entryId) {
    return { opId: op.opId, status: 'rejected', errorCode: 'INVALID_OPERATION', message: 'Missing itemId or entry id' };
  }

  snap.inventory = snap.inventory || [];
  var item = snap.inventory.find(function(i) { return i.id === itemId; });
  if (!item) {
    return { opId: op.opId, status: 'rejected', errorCode: 'ENTITY_NOT_FOUND',
      entityType: 'stock_entry', entityId: entryId };
  }
  if (item.deletedAt) {
    return { opId: op.opId, status: 'rejected', errorCode: 'ENTITY_DELETED',
      entityType: 'item', entityId: itemId, serverEntity: sanitizeServerEntity_(item) };
  }

  item.stockEntries = item.stockEntries || [];

  if (baseVersion === 0) {
    // CREATE
    if (item.stockEntries.find(function(e) { return e.id === entryId && !e.hiddenAt; })) {
      return {
        opId: op.opId, status: 'conflict', errorCode: 'ENTITY_ALREADY_EXISTS',
        entityType: 'stock_entry', entityId: entryId, expectedVersion: 0, actualVersion: 1
      };
    }

    if (!isFinite(initialQuantity) || initialQuantity < 0) {
      return { opId: op.opId, status: 'rejected', errorCode: 'INVALID_OPERATION', message: 'initialQuantity must be >= 0' };
    }

    var now = new Date().toISOString();
    var newEntry = {
      id: entryId,
      version: 1,
      quantity: initialQuantity,
      createdAt: now,
      updatedAt: now,
      hiddenAt: null
    };
    applyStockEntryFields_(newEntry, entryData);
    item.stockEntries.push(newEntry);
    item.version = (item.version || 0) + 1;

    return {
      opId: op.opId, status: 'applied',
      entityType: 'stock_entry', entityId: entryId, entityVersion: 1
    };

  } else {
    // UPDATE — metadata only, preserve quantity
    var seIdx = item.stockEntries.findIndex(function(e) { return e.id === entryId; });
    if (seIdx < 0) {
      return {
        opId: op.opId, status: 'rejected', errorCode: 'ENTITY_NOT_FOUND',
        entityType: 'stock_entry', entityId: entryId
      };
    }

    var entry = item.stockEntries[seIdx];
    if (entry.hiddenAt) {
      return {
        opId: op.opId, status: 'rejected', errorCode: 'ENTITY_DELETED',
        entityType: 'stock_entry', entityId: entryId
      };
    }

    if (baseVersion !== (entry.version || 0)) {
      return {
        opId: op.opId, status: 'conflict', errorCode: 'VERSION_CONFLICT',
        entityType: 'stock_entry', entityId: entryId,
        expectedVersion: baseVersion, actualVersion: entry.version || 0
      };
    }

    // Preserve current quantity
    var currentQty = entry.quantity;
    applyStockEntryFields_(entry, entryData);
    entry.quantity = currentQty;
    entry.version = (entry.version || 0) + 1;
    entry.updatedAt = new Date().toISOString();
    item.version = (item.version || 0) + 1;

    return {
      opId: op.opId, status: 'applied',
      entityType: 'stock_entry', entityId: entryId, entityVersion: entry.version
    };
  }
}

function applyStockEntryFields_(entry, data) {
  var allowed = ['segment', 'container', 'subContainer', 'purchaseDate', 'warrantyDate', 'expiryDate'];
  allowed.forEach(function(f) {
    if (data[f] !== undefined) entry[f] = data[f];
  });
  // quantity is NOT updated via metadata update — only via STOCK_ADJUST
}

// ─── STOCK_ENTRY_DELETE ────────────────────────────────────────────────────

function applyStockEntryDelete_(snap, op, payload, baseVersion) {
  var itemId = payload.itemId || '';
  var entryId = payload.entryId || '';

  snap.inventory = snap.inventory || [];
  var item = snap.inventory.find(function(i) { return i.id === itemId; });
  if (!item) {
    return { opId: op.opId, status: 'rejected', errorCode: 'ENTITY_NOT_FOUND', entityType: 'item', entityId: itemId };
  }
  if (item.deletedAt) {
    return { opId: op.opId, status: 'rejected', errorCode: 'ENTITY_DELETED', entityType: 'item', entityId: itemId };
  }

  item.stockEntries = item.stockEntries || [];
  var entry = item.stockEntries.find(function(e) { return e.id === entryId; });
  if (!entry) {
    return { opId: op.opId, status: 'rejected', errorCode: 'ENTITY_NOT_FOUND', entityType: 'stock_entry', entityId: entryId };
  }
  if (entry.hiddenAt) {
    // Already hidden
    return { opId: op.opId, status: 'applied', entityType: 'stock_entry', entityId: entryId, entityVersion: entry.version || 0 };
  }

  if (baseVersion !== (entry.version || 0)) {
    return {
      opId: op.opId, status: 'conflict', errorCode: 'VERSION_CONFLICT',
      entityType: 'stock_entry', entityId: entryId,
      expectedVersion: baseVersion, actualVersion: entry.version || 0
    };
  }

  entry.hiddenAt = new Date().toISOString();
  entry.version = (entry.version || 0) + 1;
  entry.updatedAt = new Date().toISOString();
  item.version = (item.version || 0) + 1;

  return {
    opId: op.opId, status: 'applied',
    entityType: 'stock_entry', entityId: entryId, entityVersion: entry.version
  };
}

// ─── STOCK_ADJUST ───────────────────────────────────────────────────────────

function applyStockAdjust_(snap, op, payload) {
  var itemId = payload.itemId || '';
  var entryId = payload.entryId || '';
  var delta = Number(payload.delta);

  if (!isFinite(delta) || delta === 0) {
    return { opId: op.opId, status: 'rejected', errorCode: 'INVALID_OPERATION', message: 'delta must be non-zero finite number' };
  }

  snap.inventory = snap.inventory || [];
  var item = snap.inventory.find(function(i) { return i.id === itemId; });
  if (!item) {
    return { opId: op.opId, status: 'rejected', errorCode: 'ENTITY_NOT_FOUND', entityType: 'item', entityId: itemId };
  }
  if (item.deletedAt) {
    return { opId: op.opId, status: 'rejected', errorCode: 'ENTITY_DELETED', entityType: 'item', entityId: itemId };
  }

  item.stockEntries = item.stockEntries || [];
  var entry = item.stockEntries.find(function(e) { return e.id === entryId; });
  if (!entry) {
    return { opId: op.opId, status: 'rejected', errorCode: 'ENTITY_NOT_FOUND', entityType: 'stock_entry', entityId: entryId };
  }
  if (entry.hiddenAt) {
    return { opId: op.opId, status: 'rejected', errorCode: 'ENTITY_DELETED', entityType: 'stock_entry', entityId: entryId };
  }

  var newQty = (entry.quantity || 0) + delta;
  if (newQty < 0) {
    return {
      opId: op.opId, status: 'rejected', errorCode: 'INSUFFICIENT_STOCK',
      entityType: 'stock_entry', entityId: entryId,
      message: 'Adjustment would make quantity negative (current: ' + (entry.quantity || 0) + ', delta: ' + delta + ')'
    };
  }

  entry.quantity = newQty;
  entry.version = (entry.version || 0) + 1;
  entry.updatedAt = new Date().toISOString();
  item.version = (item.version || 0) + 1;

  return {
    opId: op.opId, status: 'applied',
    entityType: 'stock_entry', entityId: entryId, entityVersion: entry.version
  };
}

// ─── LOCATIONS_PUT ─────────────────────────────────────────────────────────

function applyLocationsPut_(snap, op, payload, baseVersion) {
  var currentVersion = (snap.meta && snap.meta.locationsVersion) || 0;

  if (baseVersion !== currentVersion) {
    return {
      opId: op.opId, status: 'conflict', errorCode: 'VERSION_CONFLICT',
      entityType: 'locations', entityId: 'locations',
      expectedVersion: baseVersion, actualVersion: currentVersion,
      serverEntity: {
        segments: snap.segments || {},
        coordinates: snap.coordinates || {},
        spatialBackgroundImage: snap.spatialBackgroundImage || null
      }
    };
  }

  snap.segments = payload.segments || {};
  snap.coordinates = payload.coordinates || {};
  snap.spatialBackgroundImage = payload.spatialBackgroundImage || null;

  snap.meta = snap.meta || {};
  snap.meta.locationsVersion = currentVersion + 1;

  return {
    opId: op.opId, status: 'applied',
    entityType: 'locations', entityId: 'locations', entityVersion: snap.meta.locationsVersion
  };
}

// ─── CATEGORIES_PUT ─────────────────────────────────────────────────────────

function applyCategoriesPut_(snap, op, payload, baseVersion) {
  var currentVersion = (snap.meta && snap.meta.categoriesVersion) || 0;

  if (baseVersion !== currentVersion) {
    return {
      opId: op.opId, status: 'conflict', errorCode: 'VERSION_CONFLICT',
      entityType: 'categories', entityId: 'categories',
      expectedVersion: baseVersion, actualVersion: currentVersion,
      serverEntity: { categories: snap.categories || {} }
    };
  }

  snap.categories = payload.categories || {};
  snap.meta = snap.meta || {};
  snap.meta.categoriesVersion = currentVersion + 1;

  return {
    opId: op.opId, status: 'applied',
    entityType: 'categories', entityId: 'categories', entityVersion: snap.meta.categoriesVersion
  };
}

// ─── HOUSEHOLD_SETTINGS_PUT ─────────────────────────────────────────────────

function applyHouseholdSettingsPut_(snap, op, payload, baseVersion) {
  var currentVersion = (snap.meta && snap.meta.householdSettingsVersion) || 0;

  if (baseVersion !== currentVersion) {
    return {
      opId: op.opId, status: 'conflict', errorCode: 'VERSION_CONFLICT',
      entityType: 'household_settings', entityId: 'household_settings',
      expectedVersion: baseVersion, actualVersion: currentVersion,
      serverEntity: {
        users: snap.users || ['Default'],
        userEmails: snap.userEmails || {},
        reminderDays: snap.reminderDays || 30
      }
    };
  }

  // Validate
  var users = payload.users || [];
  if (users.indexOf('Default') < 0) {
    users = ['Default'].concat(users);
  }
  var userEmails = payload.userEmails || {};
  var reminderDays = parseInt(payload.reminderDays || 30, 10);
  if (!isFinite(reminderDays) || reminderDays < 1) reminderDays = 30;
  if (reminderDays > CONFIG.maxReminderDays) reminderDays = CONFIG.maxReminderDays;

  snap.users = users.filter(function(v, i, a) { return v && a.indexOf(v) === i; });
  snap.userEmails = userEmails;
  snap.reminderDays = reminderDays;

  snap.meta = snap.meta || {};
  snap.meta.householdSettingsVersion = currentVersion + 1;

  return {
    opId: op.opId, status: 'applied',
    entityType: 'household_settings', entityId: 'household_settings',
    entityVersion: snap.meta.householdSettingsVersion
  };
}

// ─── Stock Quantity Recompute ──────────────────────────────────────────────

function recomputeItemStockQuantity_(item) {
  if (!item || !item.stockEntries || !Array.isArray(item.stockEntries)) return 0;
  return item.stockEntries.reduce(function(sum, entry) {
    if (entry && !entry.hiddenAt) {
      return sum + Number(entry.quantity || 0);
    }
    return sum;
  }, 0);
}

// ─── IMAGE_UPLOAD (unchanged from legacy) ───────────────────────────────────

function handleImageUpload_(params) {
  var data = (params.data || '').trim();
  if (!data) return jsonResponse_({ success: false, error: 'Missing image data.' });

  try {
    var folder = getItemPhotosFolder_();
    var decoded = Utilities.base64Decode(data);
    var blob = Utilities.newBlob(decoded, 'image/jpeg', params.fileName || 'photo.jpg');
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var url = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1280';

    return jsonResponse_({
      success: true,
      url: url,
      fileId: file.getId(),
      fileName: file.getName(),
      mimeType: file.getMimeType(),
      sizeBytes: file.getSize()
    });
  } catch(err) {
    return jsonResponse_({ success: false, error: 'Image upload failed: ' + err.toString() });
  }
}

function getItemPhotosFolder_() {
  var folders = DriveApp.getFoldersByName('ItemPhotos');
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder('ItemPhotos');
}

// ─── SEND_REMINDERS (unchanged from legacy) ────────────────────────────────

function handleSendReminders_(params) {
  var rawPayload = (params.payload || '').trim();
  if (!rawPayload) return jsonResponse_({ success: false, error: 'Missing payload.' });

  var groups;
  try { groups = JSON.parse(rawPayload); } catch(err) {
    return jsonResponse_({ success: false, error: 'Invalid payload JSON: ' + err.message });
  }
  if (!Array.isArray(groups) || groups.length === 0) {
    return jsonResponse_({ success: true, sent: 0, recipients: 0 });
  }

  var tz = Session.getScriptTimeZone();
  var todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var sentCount = 0, recipientCount = 0, errors = [];

  groups.forEach(function(group) {
    var email = group.email, nOwner = group.owner || '', items = group.items || [];
    if (!email || items.length === 0) return;
    try {
      var htmlBody = buildReminderEmailHtml_(nOwner, items, todayStr);
      MailApp.sendEmail({ to: email, subject: 'Inventory Reminder: Expiry / Low Stock Alerts', htmlBody: htmlBody });
      sentCount++; recipientCount++;
    } catch(err) { errors.push('Failed for ' + email + ': ' + err.message); }
  });

  return jsonResponse_({ success: true, sent: sentCount, recipients: recipientCount, errors: errors.length > 0 ? errors : undefined });
}

function buildReminderEmailHtml_(ownerName, items, todayStr) {
  var expiringItems = [], lowStockItems = [];
  items.forEach(function(item) {
    var reminderTypes = item.reminderTypes || [];
    if (reminderTypes.indexOf('expiry') !== -1) {
      (item.expiryDetails || []).forEach(function(ed) {
        expiringItems.push({ name: item.name || '', itemId: item.itemId || '', category: item.category || '',
          location: ed.locationLabel || '\u2014', expiryDate: ed.expiryDate || '', daysLeft: ed.daysLeft, remarks: item.remarks || '' });
      });
    }
    if (reminderTypes.indexOf('low_stock') !== -1) {
      lowStockItems.push({ name: item.name || '', itemId: item.itemId || '', category: item.category || '',
        quantity: item.quantity || 0, minQuantity: item.minQuantity || 0, uom: item.uom || 'pcs', remarks: item.remarks || '' });
    }
  });
  var totalAlerts = expiringItems.length + lowStockItems.length;
  var html = '<html><body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px">';
  html += '<div style="background:#2563eb;color:white;padding:16px 20px;border-radius:8px 8px 0 0">';
  html += '<h2 style="margin:0;font-size:18px">Inventory Reminder</h2>';
  html += '<p style="margin:4px 0 0;font-size:12px;opacity:0.9">' + todayStr + '</p></div>';
  html += '<div style="border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 8px 8px">';
  html += '<p style="font-size:14px">Hello ' + escapeHtml_(ownerName) + ',</p>';
  html += '<p style="font-size:14px">You have <b>' + totalAlerts + '</b> alert(s) in your Home Inventory:</p>';

  if (expiringItems.length > 0) {
    html += '<h3 style="color:#dc2626;font-size:14px;margin-top:16px">Expiring Items</h3>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    html += '<tr style="background:#fef2f2"><th style="text-align:left;padding:6px;border:1px solid #fecaca">Item</th><th style="text-align:left;padding:6px;border:1px solid #fecaca">Location</th><th style="text-align:left;padding:6px;border:1px solid #fecaca">Expiry</th><th style="text-align:left;padding:6px;border:1px solid #fecaca">Days</th></tr>';
    expiringItems.forEach(function(ei) {
      html += '<tr><td style="padding:6px;border:1px solid #e2e8f0"><b>' + escapeHtml_(ei.name) + '</b><br><span style="color:#64748b;font-size:10px">' + escapeHtml_(ei.category) + '</span></td>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0">' + escapeHtml_(ei.location) + '</td>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0">' + ei.expiryDate + '</td>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0;color:' + (ei.daysLeft <= 0 ? '#dc2626' : '#d97706') + ';font-weight:bold">' + ei.daysLeft + 'd</td></tr>';
    });
    html += '</table>';
  }
  if (lowStockItems.length > 0) {
    html += '<h3 style="color:#d97706;font-size:14px;margin-top:16px">Low Stock</h3>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
    html += '<tr style="background:#fffbeb"><th style="text-align:left;padding:6px;border:1px solid #fde68a">Item</th><th style="text-align:left;padding:6px;border:1px solid #fde68a">Current</th><th style="text-align:left;padding:6px;border:1px solid #fde68a">Min</th><th style="text-align:left;padding:6px;border:1px solid #fde68a">Shortage</th></tr>';
    lowStockItems.forEach(function(lsi) {
      var shortage = Math.max(0, lsi.minQuantity - lsi.quantity);
      html += '<tr><td style="padding:6px;border:1px solid #e2e8f0"><b>' + escapeHtml_(lsi.name) + '</b><br><span style="color:#64748b;font-size:10px">' + escapeHtml_(lsi.category) + '</span></td>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0">' + lsi.quantity + ' ' + escapeHtml_(lsi.uom) + '</td>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0">' + lsi.minQuantity + '</td>';
      html += '<td style="padding:6px;border:1px solid #e2e8f0;color:#dc2626;font-weight:bold">-' + shortage + ' ' + escapeHtml_(lsi.uom) + '</td></tr>';
    });
    html += '</table>';
  }
  html += '<p style="font-size:11px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px">Sent by Find My Item \u2014 ' + new Date().toLocaleString() + '</p>';
  html += '</div></body></html>';
  return html;
}

function escapeHtml_(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Reminder Engine (server-side) ─────────────────────────────────────────

function checkAndRemind() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var snap = loadCanonicalSnapshot_();
  if (!snap) { console.log('No snapshot data found.'); return; }

  var inventory = snap.inventory || [];
  var reminderDays = snap.reminderDays || 30;
  var userEmails = snap.userEmails || {};
  sendExpiryReminders_(inventory, reminderDays, userEmails);
  sendLowStockReminders_(inventory, userEmails);
}

function setupTimeTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'checkAndRemind') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('checkAndRemind').timeBased().atHour(7).everyDays(1).create();
  console.log('Daily reminder trigger installed. Runs ~7 AM daily.');
}

function sumStockQuantity_(item) {
  if (!item || item.itemType !== 'stock') return item && item.quantity || 0;
  var entries = (item.stockEntries && Array.isArray(item.stockEntries) ? item.stockEntries : []);
  var total = 0;
  for (var i = 0; i < entries.length; i++) {
    if (!entries[i].hiddenAt) total += entries[i].quantity || 0;
  }
  return total;
}

function getStockLocationLabel_(entry) {
  if (!entry) return '';
  var parts = [entry.segment, entry.container, entry.subContainer].filter(function(p) { return !!p; });
  return parts.join(' > ') || '\u2014';
}

function getItemExpiryDates_(item) {
  var results = [];
  if (!item || item.deletedAt) return results;
  if (item.itemType !== 'stock' && item.expiryDate) {
    results.push({ locationLabel: null, expiryDate: item.expiryDate });
  }
  if (item.itemType === 'stock' && item.stockEntries && Array.isArray(item.stockEntries)) {
    for (var i = 0; i < item.stockEntries.length; i++) {
      var e = item.stockEntries[i];
      if (!e.hiddenAt && e.expiryDate) {
        results.push({ locationLabel: getStockLocationLabel_(e), expiryDate: e.expiryDate });
      }
    }
  }
  return results;
}

function getItemOwnerEmail_(owner, userEmails) {
  if (!owner || owner === 'Default') return '';
  return (userEmails && userEmails[owner]) || '';
}

function sendExpiryReminders_(inventory, reminderDays, userEmails) {
  if (!inventory || !inventory.length) return;
  reminderDays = reminderDays || 30;
  userEmails = userEmails || {};
  var tz = Session.getScriptTimeZone();
  var now = new Date();
  var todayStr = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var cutoff = new Date(now.getTime() + reminderDays * 86400000);
  var cutoffStr = Utilities.formatDate(cutoff, tz, 'yyyy-MM-dd');

  var expiring = [];
  inventory.forEach(function(item) {
    if (item.deletedAt) return;
    var expiryDates = getItemExpiryDates_(item);
    expiryDates.forEach(function(ed) {
      if (ed.expiryDate >= todayStr && ed.expiryDate <= cutoffStr) {
        expiring.push({ item: item, expiryDate: ed.expiryDate, locationLabel: ed.locationLabel });
      }
    });
  });
  if (!expiring.length) return;

  var reminded = getRemindedRecords_('expiry');
  expiring = expiring.filter(function(rec) {
    var key = rec.item.id + '|' + rec.expiryDate;
    if (rec.locationLabel) key += '|' + rec.locationLabel;
    return reminded.indexOf(key) === -1;
  });
  if (!expiring.length) return;

  var byOwner = {};
  expiring.forEach(function(rec) {
    var owner = rec.item.owner || 'Default';
    var email = getItemOwnerEmail_(owner, userEmails);
    if (!email) {
      var allEmails = Object.values(userEmails).filter(function(e) { return e && e.indexOf('@') > 0; });
      if (!allEmails.length) return;
      allEmails.forEach(function(e) { if (!byOwner[e]) byOwner[e] = []; byOwner[e].push(rec); });
    } else {
      if (!byOwner[email]) byOwner[email] = [];
      byOwner[email].push(rec);
    }
  });

  var todayStr2 = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var newReminders = [];
  Object.keys(byOwner).forEach(function(toEmail) {
    var recs = byOwner[toEmail];
    var itemsList = recs.map(function(rec) {
      var it = rec.item;
      var key = it.id + '|' + rec.expiryDate;
      if (rec.locationLabel) key += '|' + rec.locationLabel;
      newReminders.push([key, 'expiry', todayStr2, it.name || '']);
      return '- ' + (it.name || '') + ' | expiry: ' + rec.expiryDate;
    }).join('\n');
    try { MailApp.sendEmail(toEmail, 'Expiry Reminder: ' + recs.length + ' item(s)', itemsList); } catch(ex) {}
  });
  if (newReminders.length) saveRemindedRecords_(newReminders);
}

function sendLowStockReminders_(inventory, userEmails) {
  if (!inventory || !inventory.length) return;
  userEmails = userEmails || {};
  var tz = Session.getScriptTimeZone();
  var todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var active = getActiveLowStockKeys_();
  var lowStockItems = [], recoveredKeys = [];

  inventory.forEach(function(item) {
    if (!item || item.deletedAt || item.itemType !== 'stock') return;
    var qty = sumStockQuantity_(item);
    var minQty = Number(item.minQuantity || 0);
    var key = item.id + '|low';
    if (qty <= minQty && minQty > 0) {
      if (active.indexOf(key) === -1) lowStockItems.push(item);
    } else {
      if (active.indexOf(key) !== -1) recoveredKeys.push(key);
    }
  });
  if (recoveredKeys.length) clearLowStockKeys_(recoveredKeys);
  if (!lowStockItems.length) return;

  var byOwner = {};
  lowStockItems.forEach(function(item) {
    var owner = item.owner || 'Default';
    var email = getItemOwnerEmail_(owner, userEmails);
    if (!email) {
      var allEmails = Object.values(userEmails).filter(function(e) { return e && e.indexOf('@') > 0; });
      if (!allEmails.length) return;
      allEmails.forEach(function(e) { if (!byOwner[e]) byOwner[e] = []; byOwner[e].push(item); });
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
      return '- ' + (item.name || '') + ' | stock: ' + sumStockQuantity_(item);
    }).join('\n');
    try { MailApp.sendEmail(toEmail, 'Low Stock Alert: ' + items.length + ' item(s)', itemsList); } catch(ex) {}
  });
  if (newReminders.length) saveRemindedRecords_(newReminders);
}

function getRemindedRecords_(type) {
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

function getActiveLowStockKeys_() { return getRemindedRecords_('stock'); }

function clearLowStockKeys_(keysToRemove) {
  if (!keysToRemove || !keysToRemove.length) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Reminders');
  if (!sheet) return;
  var lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow < 2) return;
  var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  var rowsToKeep = data.filter(function(row) {
    return !(row[1] === 'stock' && keysToRemove.indexOf(String(row[0] || '')) !== -1);
  });
  sheet.getRange(2, 1, Math.max(lastRow - 1, 1), 4).clearContent();
  if (rowsToKeep.length) sheet.getRange(2, 1, rowsToKeep.length, 4).setValues(rowsToKeep);
}

function saveRemindedRecords_(records) {
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

// ─── Migration ─────────────────────────────────────────────────────────────

/**
 * Legacy to V3 migration function.
 * Run once manually from the Apps Script editor to migrate existing Data sheet
 * to the new double-buffered v3 format.
 */
function migrateLegacyDataToV3() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var legacySheet = ss.getSheetByName('Data');
    if (!legacySheet) {
      console.log('No legacy Data sheet found — nothing to migrate.');
      return;
    }

    // Read legacy data
    var chunkCount = parseInt(legacySheet.getRange('B2').getValue(), 10) || 1;
    var fullData = '';
    for (var i = 0; i < chunkCount; i++) {
      fullData += (legacySheet.getRange('A' + (i + 1)).getValue() || '');
    }

    if (!fullData) {
      console.log('Legacy Data sheet is empty — nothing to migrate.');
      return;
    }

    var snap;
    try { snap = JSON.parse(fullData); } catch(e) {
      console.log('Failed to parse legacy data: ' + e);
      return;
    }

    // Preserve backup
    var backupSheet = ensureSheet_('Data_LEGACY_BACKUP', []);
    backupSheet.clearContents();
    var backupChunks = Math.ceil(fullData.length / CONFIG.maxCellSize);
    for (var j = 0; j < backupChunks; j++) {
      backupSheet.getRange('A' + (j + 1)).setValue(
        fullData.substring(j * CONFIG.maxCellSize, (j + 1) * CONFIG.maxCellSize)
      );
    }
    backupSheet.getRange('B1').setValue(backupChunks);
    console.log('Legacy data backed up to Data_LEGACY_BACKUP');

    // Normalize snapshot to v3 format
    snap = normalizeLegacySnapshot_(snap);

    // Save as v3
    snap.protocolVersion = CONFIG.PROTOCOL_VERSION;
    snap.schemaVersion = CONFIG.schemaVersion;
    snap.meta = snap.meta || {};
    snap.meta.serverSeq = snap.meta.lastServerRevision || parseInt(legacySheet.getRange('B3').getValue(), 10) || 1;
    snap.meta.initialized = true;
    snap.meta.updatedAt = new Date().toISOString();

    var result = saveCanonicalSnapshot_(snap);
    if (result.success) {
      console.log('Migration complete! V3 snapshot saved.');
      console.log(' Items: ' + (snap.inventory || []).length);
      console.log(' Segments: ' + Object.keys(snap.segments || {}).length);
      console.log(' Categories: ' + Object.keys(snap.categories || {}).length);
      console.log(' Users: ' + (snap.users || []).length);
    } else {
      console.log('Migration FAILED: ' + result.error);
    }
  } catch(err) {
    console.log('Migration error: ' + err);
  } finally {
    lock.releaseLock();
  }
}

function normalizeLegacySnapshot_(snap) {
  snap.segments = snap.segments || {};
  snap.coordinates = snap.coordinates || {};
  snap.spatialBackgroundImage = snap.spatialBackgroundImage || null;
  snap.categories = snap.categories || {};
  snap.inventory = snap.inventory || [];
  snap.users = snap.users || ['Default'];
  snap.userEmails = snap.userEmails || {};
  snap.reminderDays = snap.reminderDays || 30;

  // Normalize inventory items
  snap.inventory.forEach(function(item) {
    if (!item.version || item.version < 1) item.version = 1;
    if (!item.createdAt) item.createdAt = new Date().toISOString();
    if (!item.updatedAt) item.updatedAt = new Date().toISOString();
    if (item.deletedAt === '') item.deletedAt = null;

    // Normalize stock entries
    if (item.stockEntries && Array.isArray(item.stockEntries)) {
      item.stockEntries.forEach(function(entry) {
        if (!entry.version || entry.version < 1) entry.version = 1;
        if (!entry.createdAt) entry.createdAt = new Date().toISOString();
        if (!entry.updatedAt) entry.updatedAt = new Date().toISOString();
        if (entry.hiddenAt === '') entry.hiddenAt = null;
      });
    }

    // Recompute derived quantity
    item.quantity = recomputeItemStockQuantity_(item);
  });

  // Set document versions
  snap.meta = snap.meta || {};
  snap.meta.locationsVersion = Object.keys(snap.segments || {}).length > 0 ? 1 : 0;
  snap.meta.categoriesVersion = Object.keys(snap.categories || {}).length > 0 ? 1 : 0;
  snap.meta.householdSettingsVersion = 1;

  return snap;
}
