/**
 * sync-core.js — Protocol v3 Sync Core for Home Inventory
 *
 * Responsibilities:
 *   - Define protocol constants (version, operation types, error codes)
 *   - Create immutable outbox operations (queueItemPut, queueStockAdjust, etc.)
 *   - Manage canonical server snapshot cache in IndexedDB
 *   - Deterministic local projection (canonical + pending ops = projected UI state)
 *   - Sync pull / push / bootstrap HTTP transport
 *   - Outbox lifecycle (store → transmit → delete on applied/duplicate)
 *   - Conflict record persistence
 *   - Sync status computation
 *
 * This module is PURE sync logic. It does NOT touch the DOM.
 * Load before app.js.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

var SYNC_PROTOCOL_VERSION = 3;
var SYNC_SCHEMA_VERSION = '3.0.0';

var SYNC_OP_TYPES = Object.freeze({
  ITEM_PUT: 'ITEM_PUT',
  ITEM_DELETE: 'ITEM_DELETE',
  STOCK_ENTRY_PUT: 'STOCK_ENTRY_PUT',
  STOCK_ENTRY_DELETE: 'STOCK_ENTRY_DELETE',
  STOCK_ADJUST: 'STOCK_ADJUST',
  LOCATIONS_PUT: 'LOCATIONS_PUT',
  CATEGORIES_PUT: 'CATEGORIES_PUT',
  HOUSEHOLD_SETTINGS_PUT: 'HOUSEHOLD_SETTINGS_PUT'
});

var SYNC_ERROR_CODES = Object.freeze({
  AUTH_FAILED: 'AUTH_FAILED',
  PROTOCOL_VERSION_MISMATCH: 'PROTOCOL_VERSION_MISMATCH',
  SERVER_NOT_INITIALIZED: 'SERVER_NOT_INITIALIZED',
  SERVER_ALREADY_INITIALIZED: 'SERVER_ALREADY_INITIALIZED',
  SERVER_BUSY: 'SERVER_BUSY',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_OPERATION: 'INVALID_OPERATION',
  UNKNOWN_OPERATION: 'UNKNOWN_OPERATION',
  OP_ID_REUSE: 'OP_ID_REUSE',
  ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
  ENTITY_ALREADY_EXISTS: 'ENTITY_ALREADY_EXISTS',
  ENTITY_DELETED: 'ENTITY_DELETED',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  DEPENDENCY_FAILED: 'DEPENDENCY_FAILED',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  SNAPSHOT_CORRUPT: 'SNAPSHOT_CORRUPT',
  CHECKSUM_MISMATCH: 'CHECKSUM_MISMATCH',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
});

var SYNC_TERMINAL_STATUSES = ['applied', 'duplicate'];

// ─── Sync State ─────────────────────────────────────────────────────────────

var _syncState = {
  inProgress: false,
  lastFailed: false,
  conflictExists: false,
  protocolMismatch: false,
  cloudInitialized: false,
  outboxFlushInProgress: false,
  lastServerSeq: 0,
  lastSyncedAt: null,
  bootDone: false,
  retryTimer: null
};

function getSyncState() { return _syncState; }
function isSyncing() { return _syncState.inProgress || _syncState.outboxFlushInProgress; }
function isOnline() { return navigator.onLine; }

// ─── Device ID ──────────────────────────────────────────────────────────────

var _deviceId = null;
function getDeviceId() {
  if (_deviceId) return _deviceId;
  _deviceId = localStorage.getItem('hk_device_id');
  if (!_deviceId) {
    _deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('hk_device_id', _deviceId);
  }
  return _deviceId;
}

function generateOpId() {
  return 'op_' + getDeviceId() + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

function generateRequestId() {
  return 'req_' + getDeviceId() + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
}

// ─── IndexedDB (Outbox + Canonical Snapshot + Conflicts) ───────────────────

var _stateDb = null;

function openStateDb() {
  return new Promise(function(resolve, reject) {
    if (_stateDb) return resolve(_stateDb);
    var req = indexedDB.open('findmyitem-state', 2);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;

      // v1 stores
      if (!db.objectStoreNames.contains('appState')) {
        db.createObjectStore('appState', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('outbox')) {
        var outboxStore = db.createObjectStore('outbox', { keyPath: 'opId' });
        outboxStore.createIndex('createdAt', 'createdAt', { unique: false });
        outboxStore.createIndex('status', 'status', { unique: false });
      }

      // v2 stores (protocol v3)
      if (!db.objectStoreNames.contains('canonical')) {
        db.createObjectStore('canonical', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('conflicts')) {
        var conflictStore = db.createObjectStore('conflicts', { keyPath: 'opId' });
        conflictStore.createIndex('status', 'status', { unique: false });
      }
    };
    req.onsuccess = function(e) { _stateDb = e.target.result; resolve(_stateDb); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

// --- Outbox ---

function idbPutOutboxOp(op) {
  return openStateDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('outbox', 'readwrite');
      var store = tx.objectStore('outbox');
      var req = store.put(op);
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function idbGetOutboxOps() {
  return openStateDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('outbox', 'readonly');
      var store = tx.objectStore('outbox');
      var idx = store.index('createdAt');
      var req = idx.getAll();
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function idbDeleteOutboxOp(opId) {
  return openStateDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('outbox', 'readwrite');
      var store = tx.objectStore('outbox');
      var req = store.delete(opId);
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function idbClearOutbox() {
  return openStateDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('outbox', 'readwrite');
      var store = tx.objectStore('outbox');
      var req = store.clear();
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function idbGetPendingOutboxCount() {
  return openStateDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('outbox', 'readonly');
      var store = tx.objectStore('outbox');
      var req = store.count();
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

// --- Canonical Snapshot Cache ---

function idbGetCanonicalSnapshot() {
  return openStateDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('canonical', 'readonly');
      var store = tx.objectStore('canonical');
      var req = store.get('snapshot');
      req.onsuccess = function() { resolve(req.result ? req.result.value : null); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function idbPutCanonicalSnapshot(snap) {
  return openStateDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('canonical', 'readwrite');
      var store = tx.objectStore('canonical');
      var req = store.put({ key: 'snapshot', value: snap, savedAt: new Date().toISOString() });
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

// --- Conflict Records ---

function idbGetConflicts() {
  return openStateDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('conflicts', 'readonly');
      var store = tx.objectStore('conflicts');
      var req = store.getAll();
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function idbPutConflict(conflict) {
  return openStateDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('conflicts', 'readwrite');
      var store = tx.objectStore('conflicts');
      var req = store.put(conflict);
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function idbDeleteConflict(opId) {
  return openStateDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('conflicts', 'readwrite');
      var store = tx.objectStore('conflicts');
      var req = store.delete(opId);
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function idbGetConflictCount() {
  return openStateDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('conflicts', 'readonly');
      var store = tx.objectStore('conflicts');
      var req = store.count();
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

// ─── Deep Clone ─────────────────────────────────────────────────────────────

function deepClone(val) {
  if (val === undefined || val === null) return val;
  try { return JSON.parse(JSON.stringify(val)); } catch(e) { return val; }
}

// ─── Operation Creation Helpers ─────────────────────────────────────────────

/**
 * Create an immutable operation object and persist to IndexedDB outbox.
 * Once stored, these fields MUST never change:
 *   opId, type, entityType, entityId, baseVersion, dependsOnOpId, payload
 */

function buildOp(type, entityType, entityId, baseVersion, payload, dependsOnOpId) {
  return {
    opId: generateOpId(),
    type: type,
    entityType: entityType,
    entityId: entityId,
    baseVersion: baseVersion || 0,
    dependsOnOpId: dependsOnOpId || null,
    createdAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    payload: deepClone(payload || {}),
    status: 'pending'
  };
}

function queueOperation(type, entityType, entityId, baseVersion, payload, dependsOnOpId) {
  var op = buildOp(type, entityType, entityId, baseVersion, payload, dependsOnOpId);
  return idbPutOutboxOp(op).then(function() { return op; });
}

function queueItemPut(item, baseVersion) {
  return queueOperation(SYNC_OP_TYPES.ITEM_PUT, 'item', item.id, baseVersion, { item: item });
}

function queueItemDelete(itemId, baseVersion) {
  return queueOperation(SYNC_OP_TYPES.ITEM_DELETE, 'item', itemId, baseVersion, {});
}

function queueStockEntryPut(itemId, entry, baseVersion, initialQuantity) {
  var payload = { itemId: itemId, entry: entry };
  if (baseVersion === 0 && initialQuantity !== undefined) {
    payload.initialQuantity = initialQuantity;
  }
  return queueOperation(SYNC_OP_TYPES.STOCK_ENTRY_PUT, 'stock_entry', entry.id || '', baseVersion, payload);
}

function queueStockEntryDelete(itemId, entryId, baseVersion) {
  return queueOperation(SYNC_OP_TYPES.STOCK_ENTRY_DELETE, 'stock_entry', entryId, baseVersion, { itemId: itemId, entryId: entryId });
}

function queueStockAdjust(itemId, entryId, delta) {
  return queueOperation(SYNC_OP_TYPES.STOCK_ADJUST, 'stock_entry', entryId, 0, { itemId: itemId, entryId: entryId, delta: delta });
}

function queueLocationsPut(baseVersion) {
  return queueOperation(SYNC_OP_TYPES.LOCATIONS_PUT, 'locations', 'locations', baseVersion, {
    segments: deepClone(window._appStateRef ? window._appStateRef.segments : {}),
    coordinates: deepClone(window._appStateRef ? window._appStateRef.coordinates : {}),
    spatialBackgroundImage: window._appStateRef ? window._appStateRef.spatialBackgroundImage : null
  });
}

function queueCategoriesPut(baseVersion) {
  return queueOperation(SYNC_OP_TYPES.CATEGORIES_PUT, 'categories', 'categories', baseVersion, {
    categories: deepClone(window._appStateRef ? window._appStateRef.categories : {})
  });
}

function queueHouseholdSettingsPut(baseVersion) {
  return queueOperation(SYNC_OP_TYPES.HOUSEHOLD_SETTINGS_PUT, 'household_settings', 'household_settings', baseVersion, {
    users: deepClone(window._appStateRef ? window._appStateRef.users : ['Default']),
    userEmails: deepClone(window._appStateRef ? window._appStateRef.userEmails : {}),
    reminderDays: window._appStateRef ? window._appStateRef.reminderDays : 30
  });
}

// ─── Canonical Snapshot Helpers ─────────────────────────────────────────────

function emptyCanonicalSnapshot() {
  return {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    schemaVersion: SYNC_SCHEMA_VERSION,
    meta: {
      initialized: false,
      serverSeq: 0,
      updatedAt: null,
      locationsVersion: 0,
      categoriesVersion: 0,
      householdSettingsVersion: 0
    },
    segments: {},
    coordinates: {},
    spatialBackgroundImage: null,
    categories: {},
    inventory: [],
    users: ['Default'],
    userEmails: {},
    reminderDays: 30
  };
}

function getCanonicalSnapshot() {
  return idbGetCanonicalSnapshot().then(function(snap) {
    return snap || emptyCanonicalSnapshot();
  });
}

function setCanonicalSnapshot(snap) {
  if (!snap) return Promise.resolve();
  var normalized = deepClone(snap);
  normalized.meta = normalized.meta || {};
  normalized.segments = normalized.segments || {};
  normalized.coordinates = normalized.coordinates || {};
  normalized.categories = normalized.categories || {};
  normalized.inventory = normalized.inventory || [];
  normalized.users = normalized.users || ['Default'];
  normalized.userEmails = normalized.userEmails || {};
  normalized.reminderDays = normalized.reminderDays || 30;
  return idbPutCanonicalSnapshot(normalized);
}

// ─── Projection ─────────────────────────────────────────────────────────────

/**
 * projectState(canonicalSnapshot, pendingOperations, deviceLocalState)
 *
 * Deterministically builds the projected local UI state by:
 *   1. deep-cloning the canonical snapshot
 *   2. replaying pending operations in creation order
 *   3. preserving device-local state separately
 *
 * Returns: { projected: {...}, hasPending: bool, conflictCount: number }
 */
function projectState(canonical, pendingOps) {
  var projected = deepClone(canonical || emptyCanonicalSnapshot());

  if (!pendingOps || pendingOps.length === 0) {
    return { projected: projected, hasPending: false, conflictCount: 0 };
  }

  // Sort by creation order
  var ops = pendingOps.slice().sort(function(a, b) {
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  var conflictCount = 0;
  ops.forEach(function(op) {
    if (op.status === 'conflict' || op.status === 'blocked' || op.status === 'rejected') {
      conflictCount++;
    }
    applyOpToState(projected, op);
  });

  return { projected: projected, hasPending: true, conflictCount: conflictCount };
}

function applyOpToState(state, op) {
  if (!state || !op) return;
  var type = op.type;
  var payload = op.payload || {};

  switch (type) {
    case SYNC_OP_TYPES.ITEM_PUT:
      if (payload.item) {
        var idx = (state.inventory || []).findIndex(function(i) { return i.id === payload.item.id; });
        if (idx >= 0) {
          // Apply allowed fields only
          var existing = state.inventory[idx];
          if (existing.deletedAt) break; // Tombstoned — cannot restore
          applyItemFields(existing, payload.item);
        } else {
          state.inventory.push(deepClone(payload.item));
        }
      }
      break;

    case SYNC_OP_TYPES.ITEM_DELETE:
      if (op.entityId) {
        var ditem = (state.inventory || []).find(function(i) { return i.id === op.entityId; });
        if (ditem) ditem.deletedAt = ditem.deletedAt || new Date().toISOString();
      }
      break;

    case SYNC_OP_TYPES.STOCK_ENTRY_PUT:
      if (payload.itemId && payload.entry) {
        var sit = (state.inventory || []).find(function(i) { return i.id === payload.itemId; });
        if (sit && sit.stockEntries) {
          var existingEntry = sit.stockEntries.find(function(e) { return e.id === payload.entry.id; });
          if (existingEntry && !existingEntry.hiddenAt) {
            applyStockEntryFields(existingEntry, payload.entry);
            if (payload.initialQuantity !== undefined && op.baseVersion === 0) {
              existingEntry.quantity = payload.initialQuantity;
            }
          } else if (!existingEntry) {
            var newEntry = deepClone(payload.entry);
            newEntry.quantity = payload.initialQuantity || 0;
            newEntry.version = newEntry.version || 1;
            newEntry.hiddenAt = null;
            sit.stockEntries.push(newEntry);
          }
          sit.quantity = computeTotalStockQuantity(sit);
        }
      }
      break;

    case SYNC_OP_TYPES.STOCK_ENTRY_DELETE:
      if (payload.itemId && payload.entryId) {
        var sdi = (state.inventory || []).find(function(i) { return i.id === payload.itemId; });
        if (sdi && sdi.stockEntries) {
          var sde = sdi.stockEntries.find(function(e) { return e.id === payload.entryId; });
          if (sde && !sde.hiddenAt) {
            sde.hiddenAt = new Date().toISOString();
            sdi.quantity = computeTotalStockQuantity(sdi);
          }
        }
      }
      break;

    case SYNC_OP_TYPES.STOCK_ADJUST:
      if (payload.itemId && payload.entryId) {
        var sai = (state.inventory || []).find(function(i) { return i.id === payload.itemId; });
        if (sai && sai.stockEntries) {
          var sae = sai.stockEntries.find(function(e) { return e.id === payload.entryId; });
          if (sae && !sae.hiddenAt && isFinite(payload.delta)) {
            sae.quantity = Math.max(0, (sae.quantity || 0) + payload.delta);
            sai.quantity = computeTotalStockQuantity(sai);
          }
        }
      }
      break;

    case SYNC_OP_TYPES.LOCATIONS_PUT:
      state.segments = deepClone(payload.segments || {});
      state.coordinates = deepClone(payload.coordinates || {});
      state.spatialBackgroundImage = payload.spatialBackgroundImage || null;
      break;

    case SYNC_OP_TYPES.CATEGORIES_PUT:
      state.categories = deepClone(payload.categories || {});
      break;

    case SYNC_OP_TYPES.HOUSEHOLD_SETTINGS_PUT:
      if (payload.users) state.users = deepClone(payload.users);
      if (payload.userEmails) state.userEmails = deepClone(payload.userEmails);
      if (payload.reminderDays !== undefined) state.reminderDays = payload.reminderDays;
      break;
  }
}

function applyItemFields(target, source) {
  var fields = ['barcodeId', 'name', 'brand', 'category', 'itemType', 'owner',
    'uom', 'minQuantity', 'remarks', 'aiMetadata',
    'imageUrl', 'imageThumbUrl', 'imageSourceType', 'imageThumbKey', 'imageFullKey', 'imageMeta',
    'segment', 'container', 'subContainer',
    'purchaseDate', 'warrantyDate', 'expiryDate'];
  fields.forEach(function(f) {
    if (source[f] !== undefined) target[f] = source[f];
  });
}

function applyStockEntryFields(target, source) {
  var fields = ['segment', 'container', 'subContainer', 'purchaseDate', 'warrantyDate', 'expiryDate'];
  fields.forEach(function(f) {
    if (source[f] !== undefined) target[f] = source[f];
  });
}

function computeTotalStockQuantity(item) {
  if (!item || !item.stockEntries || !Array.isArray(item.stockEntries)) return 0;
  return item.stockEntries.reduce(function(sum, e) {
    return sum + (e && !e.hiddenAt ? (e.quantity || 0) : 0);
  }, 0);
}

// ─── HTTP Transport ─────────────────────────────────────────────────────────

function getSyncEndpoint() {
  return localStorage.getItem('sys_gas_url') || '';
}

function getSyncSecret() {
  return localStorage.getItem('sys_api_pwd') || '';
}

function syncFetch(action, payloadObj) {
  var endpoint = getSyncEndpoint();
  var secret = getSyncSecret();
  if (!endpoint || !secret) {
    return Promise.resolve({
      success: false,
      errorCode: 'AUTH_FAILED',
      message: 'Missing endpoint or token',
      retryable: false
    });
  }

  var params = new URLSearchParams();
  params.append('token', secret);
  params.append('action', action);
  params.append('protocolVersion', String(SYNC_PROTOCOL_VERSION));
  params.append('payload', JSON.stringify(payloadObj || {}));

  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: params.toString()
  }).then(function(resp) {
    return resp.text().then(function(text) {
      try { return JSON.parse(text); } catch(e) { return { success: false, errorCode: 'INVALID_REQUEST', message: text, retryable: false }; }
    });
  }).catch(function(err) {
    return { success: false, errorCode: 'INTERNAL_ERROR', message: err.message || 'Network error', retryable: true };
  });
}

// ─── Sync Operations ────────────────────────────────────────────────────────

/**
 * syncPull() — Fetch the canonical snapshot from the server.
 * Returns { success, initialized, serverSeq, snapshot }
 */
function syncPull() {
  var payload = {
    deviceId: getDeviceId(),
    requestId: generateRequestId(),
    includeDeleted: true
  };
  return syncFetch('SYNC_PULL', payload);
}

/**
 * syncPush() — Send pending outbox operations.
 * Returns { success, serverSeq, results[], snapshot }
 */
function syncPush() {
  return idbGetOutboxOps().then(function(ops) {
    if (!ops || ops.length === 0) {
      return { success: true, serverSeq: 0, results: [], snapshot: null };
    }

    var payload = {
      deviceId: getDeviceId(),
      requestId: generateRequestId(),
      operations: ops.map(function(op) {
        return {
          opId: op.opId,
          type: op.type,
          entityType: op.entityType,
          entityId: op.entityId,
          baseVersion: op.baseVersion || 0,
          dependsOnOpId: op.dependsOnOpId || null,
          createdAt: op.createdAt,
          deviceId: op.deviceId,
          payload: op.payload
        };
      })
    };

    return syncFetch('SYNC_PUSH', payload);
  });
}

/**
 * syncBootstrap(snapshot) — Initialize an empty v3 backend.
 */
function syncBootstrap(snapshot) {
  var payload = {
    deviceId: getDeviceId(),
    requestId: generateRequestId(),
    expectedServerSeq: 0,
    snapshot: snapshot || emptyCanonicalSnapshot()
  };
  return syncFetch('SYNC_BOOTSTRAP', payload);
}

// ─── Result Processing ──────────────────────────────────────────────────────

/**
 * Process push results:
 *   - Delete outbox entries for 'applied' and 'duplicate'
 *   - Store 'conflict' results as conflict records
 *   - Keep 'blocked' and 'rejected' in outbox
 *   - Update canonical snapshot cache from server
 */
function processPushResults(result) {
  if (!result || !result.success) return Promise.resolve(result);

  var promises = [];

  // Process per-operation results
  if (result.results && result.results.length > 0) {
    result.results.forEach(function(r) {
      if (r.status === 'applied' || r.status === 'duplicate') {
        promises.push(idbDeleteOutboxOp(r.opId).catch(function(){}));
      } else if (r.status === 'conflict') {
        // Store conflict record
        promises.push(idbPutConflict({
          opId: r.opId,
          status: 'conflict',
          errorCode: r.errorCode || 'VERSION_CONFLICT',
          entityType: r.entityType,
          entityId: r.entityId,
          expectedVersion: r.expectedVersion,
          actualVersion: r.actualVersion,
          serverEntity: r.serverEntity || null,
          resolved: false,
          timestamp: new Date().toISOString()
        }).catch(function(){}));
      }
      // blocked and rejected stay in outbox for visibility
    });
  }

  // Update canonical snapshot if provided
  if (result.snapshot) {
    promises.push(setCanonicalSnapshot(result.snapshot));
    _syncState.lastServerSeq = result.snapshot.meta ? result.snapshot.meta.serverSeq || 0 : 0;
  }

  if (result.serverSeq) {
    _syncState.lastServerSeq = result.serverSeq;
  }

  _syncState.lastSyncedAt = new Date().toISOString();
  return Promise.all(promises).then(function() { return result; });
}

// ─── Full Sync Flow ─────────────────────────────────────────────────────────

/**
 * fullSync() — Complete synchronization cycle:
 *   1. PULL latest canonical snapshot
 *   2. PUSH pending outbox operations
 *   3. Process results
 *   4. Return projected state
 */
var _syncSerialGuard = false;

function fullSync() {
  if (_syncSerialGuard) return Promise.resolve(null);
  _syncSerialGuard = true;
  _syncState.inProgress = true;

  // Step 1: Pull
  return syncPull().then(function(pullResult) {
    if (!pullResult.success) {
      _syncState.lastFailed = true;
      return Promise.reject(pullResult);
    }

    if (pullResult.initialized && pullResult.snapshot) {
      // Replace canonical snapshot — preserve pending ops
      return setCanonicalSnapshot(pullResult.snapshot).then(function() {
        _syncState.cloudInitialized = true;
        _syncState.lastServerSeq = pullResult.serverSeq || 0;
        _syncState.lastFailed = false;

        // Step 2: Push pending ops
        return syncPush().then(function(pushResult) {
          return processPushResults(pushResult).then(function() {
            _syncState.lastFailed = false;
            return buildProjectedState_();
          });
        });
      });
    } else {
      // Uninitialized server
      _syncState.cloudInitialized = false;
      _syncState.lastFailed = false;
      return { uninitialized: true };
    }
  }).catch(function(err) {
    if (err && err.errorCode) {
      if (err.errorCode === 'PROTOCOL_VERSION_MISMATCH') {
        _syncState.protocolMismatch = true;
      }
    }
    _syncState.lastFailed = true;
    return buildProjectedState_();
  }).finally(function() {
    _syncState.inProgress = false;
    _syncSerialGuard = false;
  });
}

function buildProjectedState_() {
  return Promise.all([
    getCanonicalSnapshot(),
    idbGetOutboxOps(),
    idbGetConflicts()
  ]).then(function(results) {
    var canonical = results[0];
    var pendingOps = results[1];
    var conflicts = results[2];

    var projection = projectState(canonical, pendingOps);

    return {
      canonical: canonical,
      projected: projection.projected,
      pendingCount: pendingOps.length,
      conflictCount: projection.conflictCount,
      conflicts: conflicts,
      synced: pendingOps.length === 0 && projection.conflictCount === 0 && !_syncState.lastFailed,
      protocolMismatch: _syncState.protocolMismatch,
      cloudInitialized: _syncState.cloudInitialized,
      lastServerSeq: _syncState.lastServerSeq,
      lastSyncedAt: _syncState.lastSyncedAt
    };
  });
}

// ─── Resolve Conflict ───────────────────────────────────────────────────────

/**
 * resolveConflict(opId, resolution, customPayload)
 *
 * resolution: 'cloud' — accept server version, delete the conflicting op
 * resolution: 'local' — resubmit with current server entity version
 */
function resolveConflict(opId, resolution, customPayload) {
  return Promise.all([idbGetOutboxOps(), idbGetCanonicalSnapshot(), idbGetConflicts()]).then(function(results) {
    var ops = results[0];
    var snap = results[1];
    var conflicts = results[2];

    var conflictOp = ops.find(function(o) { return o.opId === opId; });
    var conflictRecord = conflicts.find(function(c) { return c.opId === opId; });

    if (!conflictOp) return { resolved: false, error: 'conflict not found' };

    if (resolution === 'cloud') {
      // Accept server version — just delete the conflict
      return idbDeleteOutboxOp(opId).then(function() {
        return idbDeleteConflict(opId).catch(function(){});
      }).then(function() {
        return { resolved: true };
      });
    }

    if (resolution === 'local') {
      // Resubmit with updated baseVersion
      var newOp = deepClone(conflictOp);
      newOp.opId = generateOpId();
      newOp.createdAt = new Date().toISOString();

      if (customPayload) {
        newOp.payload = customPayload;
      }

      // Use the current server version
      if (conflictRecord && conflictRecord.actualVersion !== undefined) {
        newOp.baseVersion = conflictRecord.actualVersion;
      }

      newOp.status = 'pending';

      return idbDeleteOutboxOp(opId).then(function() {
        return idbDeleteConflict(opId).catch(function(){});
      }).then(function() {
        return idbPutOutboxOp(newOp);
      }).then(function() {
        return { resolved: true, newOpId: newOp.opId };
      });
    }

    return { resolved: false, error: 'unknown resolution' };
  });
}

// ─── Bootstrap Flow ─────────────────────────────────────────────────────────

function attemptBootstrap(snapshotData) {
  var snap = snapshotData || emptyCanonicalSnapshot();
  snap.segments = snap.segments || {};
  snap.categories = snap.categories || {};
  snap.inventory = snap.inventory || [];
  snap.users = snap.users || ['Default'];
  snap.userEmails = snap.userEmails || {};
  snap.reminderDays = snap.reminderDays || 30;
  snap.coordinates = snap.coordinates || {};
  snap.spatialBackgroundImage = snap.spatialBackgroundImage || null;

  return syncBootstrap(snap).then(function(result) {
    if (result.success && result.snapshot) {
      return setCanonicalSnapshot(result.snapshot).then(function() {
        _syncState.cloudInitialized = true;
        _syncState.lastServerSeq = result.serverSeq || 0;
        return { success: true, snapshot: result.snapshot };
      });
    }
    return result;
  });
}

// ─── Sync Status Summary ────────────────────────────────────────────────────

/**
 * Get a human-readable sync status.
 * Returns { state: string, pendingCount: number, conflictCount: number }
 *
 * States: 'syncing', 'offline', 'conflict', 'pending', 'synced',
 *         'protocol_mismatch', 'cloud_uninitialized'
 */
function getSyncStatusSummary() {
  return Promise.all([
    idbGetPendingOutboxCount(),
    idbGetConflictCount()
  ]).then(function(counts) {
    var pending = counts[0] || 0;
    var conflicts = counts[1] || 0;

    if (_syncState.protocolMismatch) return { state: 'protocol_mismatch', pending: pending, conflicts: conflicts };
    if (isSyncing()) return { state: 'syncing', pending: pending, conflicts: conflicts };
    if (conflicts > 0) return { state: 'conflict', pending: pending, conflicts: conflicts };
    if (!isOnline()) return { state: 'offline', pending: pending, conflicts: conflicts };
    if (_syncState.lastFailed && pending > 0) return { state: 'offline', pending: pending, conflicts: conflicts };
    if (!_syncState.cloudInitialized && !_syncState.lastFailed) return { state: 'cloud_uninitialized', pending: pending, conflicts: conflicts };
    if (pending > 0) return { state: 'pending', pending: pending, conflicts: conflicts };
    if (_syncState.lastSyncedAt) return { state: 'synced', pending: 0, conflicts: 0 };
    return { state: 'offline', pending: pending, conflicts: conflicts };
  });
}

// ─── Initialize ─────────────────────────────────────────────────────────────

/**
 * initSyncCore() — Call once on app startup.
 * Loads canonical snapshot from IndexedDB, builds projection.
 */
function initSyncCore() {
  return getCanonicalSnapshot().then(function(snap) {
    if (snap && snap.meta && snap.meta.initialized) {
      _syncState.cloudInitialized = true;
      _syncState.lastServerSeq = snap.meta.serverSeq || 0;
    }
    return buildProjectedState_();
  });
}

// Guard for overlapping syncs
function acquireSyncGuard() {
  if (_syncSerialGuard) return false;
  _syncSerialGuard = true;
  return true;
}

function releaseSyncGuard() {
  _syncSerialGuard = false;
}
