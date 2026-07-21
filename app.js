/**
 * Home Inventory Manager - Core Architecture Engine
 * Data Model (v2)
 * Copyright (c) Westdoor Streetson 2026
 */
const APP_VERSION = '1.50';

// ===== PWA: Service Worker Registration =====
var _deferredInstallPrompt = null;
var _swRegistration = null;
var _swUpdateWaiting = false;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' })
      .then(function(reg) {
        _swRegistration = reg;
        console.log('[PWA] Service Worker registered. Scope:', reg.scope);

        reg.addEventListener('updatefound', function() {
          var newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              _swUpdateWaiting = true;
              console.log('[PWA] New service worker waiting. Prompting user to update.');
              showUpdateToast();
            }
          });
        });
      })
      .catch(function(err) {
        console.warn('[PWA] Service Worker registration failed:', err.message || err);
      });

    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      if (refreshing) return;
      refreshing = true;
      console.log('[PWA] Controller changed — reloading');
      window.location.reload();
    });
  });
}

function showUpdateToast() {
  var toast = document.getElementById('syncToast');
  if (!toast) return;
  clearTimeout(toast._timer);
  toast.style.whiteSpace = 'normal';
  toast.style.pointerEvents = 'auto';
  toast.className = 'info';
  toast.innerHTML = '<span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
    + '<svg style="width:16px;height:16px;color:#2563eb;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></span>'
    + '<span style="flex-shrink:0">Update available.</span>'
    + '<button id="swRefreshBtn" style="background:#2563eb;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;margin-left:8px;flex-shrink:0">Refresh</button>'
    + '<button id="swLaterBtn" style="background:#e2e8f0;color:#475569;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px;flex-shrink:0">Later</button>'
    + '</span>';
  toast.classList.add('show');
  document.getElementById('swRefreshBtn').addEventListener('click', applyServiceWorkerUpdate);
  document.getElementById('swLaterBtn').addEventListener('click', dismissUpdateToast);
}

function applyServiceWorkerUpdate() {
  if (_swRegistration && _swRegistration.waiting) {
    _swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  hideToast();
}

function dismissUpdateToast() {
  _swUpdateWaiting = false;
  hideToast();
}

window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  _deferredInstallPrompt = e;
  console.log('[PWA] Install prompt captured (beforeinstallprompt)');
  showInstallPrompt();
});

function showInstallPrompt() {
  var toast = document.getElementById('syncToast');
  if (!toast || !_deferredInstallPrompt) return;
  clearTimeout(toast._timer);
  toast.style.whiteSpace = 'normal';
  toast.style.pointerEvents = 'auto';
  toast.className = 'info';
  toast.innerHTML = '<span style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
    + '<svg style="width:16px;height:16px;color:#2563eb;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>'
    + '<span style="flex-shrink:0">Install this app?</span>'
    + '<button id="installPromptBtn" style="background:#2563eb;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;margin-left:8px;flex-shrink:0">Install</button>'
    + '<button id="installDismissBtn" style="background:#e2e8f0;color:#475569;border:none;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;margin-left:4px;flex-shrink:0">Not now</button>'
    + '</span>';
  toast.classList.add('show');
  document.getElementById('installPromptBtn').addEventListener('click', promptInstallApp);
  document.getElementById('installDismissBtn').addEventListener('click', dismissInstallToast);
}

function promptInstallApp() {
  if (!_deferredInstallPrompt) {
    showToast('Install not available. You can install via browser menu.', 'info');
    return;
  }
  _deferredInstallPrompt.prompt();
  _deferredInstallPrompt.userChoice.then(function(result) {
    console.log('[PWA] Install choice:', result.outcome);
    _deferredInstallPrompt = null;
    hideToast();
  });
}

function dismissInstallToast() {
  hideToast();
}

window.addEventListener('appinstalled', function() {
  _deferredInstallPrompt = null;
  console.log('[PWA] App installed');
  dismissInstallGuide();
});

// ===== PWA Install Guide (shows on first visit for iOS/Android) =====
function showInstallGuide() {
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (localStorage.getItem('fmi_install_guide_dismissed')) return;

  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  var isAndroid = /Android/.test(navigator.userAgent);
  var isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|OPiOS/.test(navigator.userAgent);

  var guide = document.createElement('div');
  guide.id = 'pwaInstallGuide';
  guide.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9995;background:#1e293b;color:#fff;padding:14px 16px calc(14px + env(safe-area-inset-bottom, 0px));font-size:13px;display:flex;align-items:center;gap:12px;box-shadow:0 -4px 16px rgba(0,0,0,0.15);font-family:Inter,sans-serif;';

  var iconSvg = '';
  var text = '';

  if (isIOS && isSafari) {
    iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
    text = 'Tap <b style="color:#60a5fa">Share</b> then <b style="color:#60a5fa">Add to Home Screen</b> to install this app.';
  } else if (isAndroid) {
    iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>';
    text = 'Tap <b style="color:#60a5fa">⋮ menu</b> then <b style="color:#60a5fa">Install app</b> to add to your home screen.';
  } else {
    text = 'Install this app for quick access — look for the install icon in your browser address bar.';
    iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';
  }

  guide.innerHTML = iconSvg
    + '<span style="flex:1;line-height:1.4">' + text + '</span>'
    + '<button onclick="dismissInstallGuide()" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;padding:0 4px;line-height:1" title="Dismiss">&times;</button>';

  document.body.appendChild(guide);
}

function dismissInstallGuide() {
  var guide = document.getElementById('pwaInstallGuide');
  if (guide) { guide.remove(); }
  localStorage.setItem('fmi_install_guide_dismissed', '1');
}

setTimeout(function() {
  if (document.getElementById('passwordOverlay') && document.getElementById('passwordOverlay').style.display === 'none') {
    showInstallGuide();
  } else {
    // Wait for login, then show
    var obs = new MutationObserver(function() {
      var pw = document.getElementById('passwordOverlay');
      if (pw && pw.style.display === 'none') {
        showInstallGuide();
        obs.disconnect();
      }
    });
    var pwEl = document.getElementById('passwordOverlay');
    if (pwEl) obs.observe(pwEl, { attributes: true, attributeFilter: ['style'] });
    else showInstallGuide();
  }
}, 3000);
// ===== End Install Guide =====
// ===== End PWA Registration =====

// ===== iOS Safe Area Fix — applies safe-area-inset-top to sticky headers via JS =====
function applySafeAreaPadding() {
  var testPad = 'env(safe-area-inset-top, 0px)';
  var probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;padding-top:' + testPad + ';z-index:-1';
  document.body.appendChild(probe);
  var safeTop = getComputedStyle(probe).paddingTop;
  document.body.removeChild(probe);

  if (!safeTop || safeTop === '0px') {
    safeTop = 'constant(safe-area-inset-top, 0px)';
    probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;padding-top:' + safeTop + ';z-index:-1';
    document.body.appendChild(probe);
    safeTop = getComputedStyle(probe).paddingTop;
    document.body.removeChild(probe);
  }

  var inset = parseFloat(safeTop);
  if (!inset || inset <= 0) return;

  var px = inset + 'px';
  var headers = document.querySelectorAll('body > header.sticky');
  headers.forEach(function(h) {
    h.style.paddingTop = px;
  });
}
// ===== End iOS Safe Area Fix =====

// ===== Translation System =====
const LANG = {
  en: {
    appTitle: 'Find My Item',
    tabLocation: 'Location',
    tabRegister: 'Register',
    tabBrowse: 'Browse',
    tabClasses: 'Classifications',
    tabInventory: 'Inventory Database',
    tabCloud: 'Cloud Engine',
    tabScan: 'Barcode Scan',
    scanTitle: 'Barcode Scanner',
    scanDesc: 'Scan a barcode label or enter an Item ID to find where the item belongs.',
    scanCamera: 'Scan Barcode',
    scanStop: 'Stop',
    scanManual: 'or enter Item ID manually',
    scanPlaceholder: 'Enter System ID...',
    scanLookup: 'Look Up',
    scanNotFound: 'No item found with this ID.',
    scanFound: 'Item located',
    scanCameraError: 'Camera access denied or not available.',
    configuratorTitle: 'Segment Configurator',
    addSegment: 'Add Segment Zone',
    addContainer: 'Add Container',
    addSubContainer: 'Add Sub-Container',
    structuralIndex: 'Structural Index',
    locationMap: 'Location Map',
    gridHint: 'Select a container from structural index to map its position by clicking on the grid matrix.',
    activeNode: 'Active Node:',
    noneSelected: 'None Selected',
    importLayout: 'Import Layout Image',
    removeImage: 'Remove Image',
    saveLayout: 'Save Layout',
    assetsIn: 'Assets in',
    items: 'items',
    item: 'item',
    noAssets: 'No assets registered here.',
    classificationTitle: 'Classification Architect',
    selectedPath: 'Selected Parent Pathway',
    rootLevel: 'Root Level',
    newBranch: 'New Branch/Node Classification Title',
    addBranch: 'Add Branch',
    tierWarning: '⚠️ Tier structural threshold reached (Max 4 Levels Allowed).',
    resetSelection: 'Reset Selection to Root',
    deleteBranch: 'Delete Selection Branch',
    classDirTitle: 'Classification Directory Tree (Max 4 Tiers)',
    inventoryFormTitle: 'Register Inventory Stock Asset',
    modifyFormTitle: 'Modify Inventory Registry Asset',
    exitModify: 'Exit Modification Mode',
    itemName: 'Item Reference Designation',
    itemNamePlaceholder: 'e.g., Linen Suit Jacket',
    categoryRoute: 'Category Route Allocation',
    chooseCategory: '-- Choose Category Route --',
    targetSegment: 'Target Home Segment',
    containerAssign: 'Container Assignment',
    subContainerAssign: 'Sub-Container Assignment',
    brand: 'Brand',
    itemType: 'Item Type',
    uom: 'UOM',
    quantity: 'Quantity',
    minLevel: 'Min Level',
    purchaseDate: 'Purchase Date',
    warrantyDate: 'Warranty Date',
    expiryDate: 'Expiry Date',
    owner: 'Owner',
    selectUser: '-- Select User --',
    assetImage: 'Asset Image (Upload or URL)',
    uploadPhoto: 'Upload Photo',
    imageUrlPlaceholder: 'Or paste image URL...',
    remarks: 'Annotations / Remarks',
    remarksPlaceholder: 'Purchase location, serial numbers, warranty details...',
    saveAsset: 'Save Asset',
    aiSearchPlaceholder: 'Describe what you are looking for... e.g. \'blue jacket in bedroom wardrobe\'',
    aiSearch: 'AI Search',
    clearAiFilter: 'Clear AI Filter',
    searchItem: 'Search Item Reference...',
    allSegments: 'All Segments',
    allContainers: 'All Containers',
    allCategories: 'All Categories',
    allOwners: 'All Owners',
    activeCount: 'Active Registry Count:',
    visual: 'Visual',
    assetDetails: 'Asset Item Details',
    classification: 'Classification',
    physicalAddress: 'Location',
    ownerCol: 'Owner',
    annotations: 'Remarks',
    operations: 'Actions',
    noResults: 'No storage dataset elements correspond with current query configurations.',
    edit: 'Edit',
    drop: 'Drop',
    pipelineCreds: 'Pipeline Credentials',
    gasUrl: 'Google Apps Script Web App Deployment Endpoint URL',
    sysPassword: 'System Security Access Code',
    apiToken: 'Data Stream Transceiver Key',
    dsApiKey: 'DeepSeek AI API Key (for Inventory Semantic Search)',
    commitProfile: 'Commit Network Profile Changes',
    interoperability: 'Interoperability Processing Engine (Flat Sheet Formatting)',
    compileExcel: 'Compile Spreadsheet Output',
    compileDesc: 'Process current local registers into a cleanly formatted multi-column flattened dynamic .xlsx file sheet matrix.',
    generateXlsx: 'Generate .xlsx Export',
    ingestExcel: 'Ingest Spreadsheet Matrix',
    ingestDesc: 'Load structured spreadsheet files to append missing item parameters back into local system storage configurations.',
    processXlsx: 'Process Local .xlsx Document',
    householdMembers: 'Household Members',
    addUser: 'Add',
    destructiveOps: 'Destructive Operations Matrix',
    destructiveDesc: 'Purges application states and removes records permanently. Back up configurations via spreadsheets before proceeding.',
    pushCloud: 'Push to Cloud',
    pullCloud: 'Pull from Cloud',
    verifySync: 'Verify Sync',
    wipeLocal: 'Wipe Local Cache',
    passwordTitle: 'Access Restrained',
    passwordHint: 'Input Master System Password to decrypt inventory ledger.',
    authorize: 'Authorize',
    incorrectPwd: 'Incorrect Access Credentials.',
    quickAdd: 'Quick Add Asset',
    chooseSegPlaceholder: 'e.g., Bedroom, Kitchen',
    chooseConPlaceholder: 'e.g., Wardrobe A, Cabinet B',
    chooseSubPlaceholder: 'e.g., Top Drawer, Shelf A',
    none: 'None',
    noPhoto: 'No Photo',
    confirmDeleteSeg: 'Delete segment',
    confirmDeleteCon: 'Delete container',
    confirmDeleteSub: 'Delete sub-container',
    confirmDeleteItem: 'Are you sure you want to delete this item configuration rule?',
    confirmDeleteCategory: 'Permanently drop selected classification node path branches?',
    confirmPurge: 'Destroy all configured structures and application variables? This action cannot be reversed.',
    pleaseComplete: 'Please complete item reference, categories, segments and assignment containers.',
    noItemsExport: 'The working active system ledger contains zero dataset targets to map.',
    importSuccess: 'Spreadsheet processing successfully parsed.',
    importError: 'Error decoding file contents: ',
    profileUpdated: 'Local infrastructure access profile updated.',
    pushDispatched: 'Push dispatched',
    pullComplete: 'Cloud pull complete.',
    pullFailed: 'Pull failed: ',
    inSync: 'In Sync',
    notSynced: 'Not synced',
    offline: 'Offline',
    mismatch: 'Mismatch',
    cloudVsLocal: 'Cloud vs Local',
    cloud: 'Cloud',
    local: 'Local',
    synced: 'Synced',
    pushed: 'Pushed',
    pulled: 'Pulled',
    detailCategory: 'Category',
    detailLocation: 'Location',
    detailOwner: 'Owner',
    detailAdded: 'Added',
    detailRemarks: 'Remarks',
    detailId: 'System ID',
    newUserPlaceholder: 'e.g., John, Mary',
    language: 'Language',
    defaultUser: 'Default',
    cannotRemoveDefault: 'Cannot remove the Default user.',
    removeUser: 'Remove user',
    aiAnalyzing: 'Analyzing inventory with AI...',
    aiFound: 'AI found',
    aiNoMatch: 'AI found no matching items.',
    aiFailed: 'AI search failed: ',
    aiNoKey: 'DeepSeek API key not configured. Please add it in the Cloud Engine tab.',
    noItems: 'No inventory items to search.',
    syncVerifyFailed: 'Cannot reach cloud: ',
    pushFailed: 'Push failed: ',
    itemNotFound: 'Item not found: ',
    editError: 'Edit error: ',
    initError: 'Init error: ',
    chars: 'chars',
    chunks: 'chunks',
    itemsLoaded: 'items loaded.',
    missingEndpoint: 'Missing Google Script Deployment endpoint link URL profiles.',
    missingEndpointShort: 'Missing Google Script URL.',
    syncOk: 'Cloud registry download sync successfully deployed.',
    syncFailed: 'Failed to parse valid cloud response.',
    payload: 'Payload',
    id: 'ID',
    timestamp: 'Timestamp',
    cloudPushOk: 'Cloud backup push dispatched.',
    sheetError: 'Error decoding file contents: ',
    confirmRemoveUser: 'Remove user',
    member: 'member',
    members: 'members',
    segments: 'Segments',
    users: 'Users',
    itemsCap: 'Items',
    match: 'match',
    confirmDropCategory: 'Permanently drop selected classification node path branches?',
    changePassword: 'Change System Password',
    payloadToken: 'Payload Verification Token',
    aiMetadata: 'AI Metadata (Image Description for Search)',
    aiMetadataPlaceholder: 'AI-generated description of the asset...',
    barcodeCopied: 'Barcode ID copied',
    barcodeCopyFailed: 'Copy failed',
    tabToBuy: 'To-Buy',
    stockLow: 'Low stock',
    stockOut: 'Out of stock',
  },
  'zh-Hant': {
    appTitle: '物件追蹤',
    tabLocation: '位置',
    tabRegister: '登記',
    tabBrowse: '瀏覽',
    tabClasses: '分類',
    tabInventory: '庫存數據庫',
    tabCloud: '雲端引擎',
    tabScan: '條碼掃描',
    scanTitle: '條碼掃描器',
    scanDesc: '掃描條碼標籤或輸入物品 ID 以查找物品應存放的位置。',
    scanCamera: '掃描條碼',
    scanStop: '停止',
    scanManual: '或手動輸入物品 ID',
    scanPlaceholder: '輸入系統 ID...',
    scanLookup: '查詢',
    scanNotFound: '找不到此 ID 的物品。',
    scanFound: '已找到物品',
    scanCameraError: '相機存取被拒絕或不可用。',
    configuratorTitle: '空間配置器',
    addSegment: '新增空間區域',
    addContainer: '新增容器',
    addSubContainer: '新增子容器',
    structuralIndex: '結構索引',
    locationMap: '位置地圖',
    gridHint: '從結構索引中選擇容器，然後點擊網格矩陣來標記其位置。',
    activeNode: '當前節點：',
    noneSelected: '未選擇',
    importLayout: '匯入平面圖',
    removeImage: '移除圖片',
    saveLayout: '儲存佈局',
    assetsIn: '資產位於',
    items: '件',
    item: '件',
    noAssets: '此處沒有註冊的資產。',
    classificationTitle: '分類架構',
    selectedPath: '已選父層路徑',
    rootLevel: '根目錄',
    newBranch: '新分支/節點分類名稱',
    addBranch: '新增分支',
    tierWarning: '⚠️ 已達層級上限（最多 4 層）。',
    resetSelection: '重設為根目錄',
    deleteBranch: '刪除所選分支',
    classDirTitle: '分類目錄樹（最多 4 層）',
    inventoryFormTitle: '登記庫存資產',
    modifyFormTitle: '修改庫存資產',
    exitModify: '退出修改模式',
    itemName: '物品參考名稱',
    itemNamePlaceholder: '例如：亞麻西裝外套',
    categoryRoute: '分類路徑分配',
    chooseCategory: '-- 選擇分類路徑 --',
    targetSegment: '所屬家居空間',
    chooseSegment: '-- 選擇空間 --',
    containerAssign: '容器分配',
    chooseContainer: '-- 選擇容器 --',
    subContainerAssign: '子容器分配',
    chooseSubContainer: '-- 選擇子容器 --',
    brand: '品牌',
    itemType: '物品類型',
    uom: '單位',
    quantity: '數量',
    minLevel: '最低存量',
    purchaseDate: '購買日期',
    warrantyDate: '保養日期',
    expiryDate: '到期日期',
    owner: '擁有者',
    selectUser: '-- 選擇用戶 --',
    assetImage: '資產圖片（上傳或URL）',
    uploadPhoto: '上傳照片',
    imageUrlPlaceholder: '或貼上圖片網址...',
    remarks: '備註',
    remarksPlaceholder: '購買地點、序號、保養詳情...',
    saveAsset: '儲存資產',
    aiSearchPlaceholder: '描述你要尋找的物品... 例如「睡房衣櫃裡的藍色外套」',
    aiSearch: 'AI 搜尋',
    clearAiFilter: '清除 AI 篩選',
    searchItem: '搜尋物品名稱...',
    allSegments: '所有空間',
    allContainers: '所有容器',
    allCategories: '所有分類',
    allOwners: '所有用戶',
    activeCount: '當前記錄數：',
    visual: '圖片',
    assetDetails: '資產詳情',
    classification: '分類',
    physicalAddress: '位置',
    ownerCol: '擁有者',
    annotations: '備註',
    operations: '操作',
    noResults: '沒有符合當前查詢條件的儲存數據。',
    edit: '編輯',
    drop: '刪除',
    pipelineCreds: '管線憑證',
    gasUrl: 'Google Apps Script 網頁應用部署網址',
    sysPassword: '系統安全存取密碼',
    apiToken: '數據流傳輸密鑰',
    dsApiKey: 'DeepSeek AI API 密鑰（用於庫存語義搜尋）',
    commitProfile: '提交網絡配置更改',
    interoperability: '互通處理引擎（平面表格格式化）',
    compileExcel: '匯出試算表',
    compileDesc: '將當前本地記錄處理成格式化多列動態 .xlsx 檔案。',
    generateXlsx: '匯出 .xlsx 檔案',
    ingestExcel: '匯入試算表',
    ingestDesc: '載入結構化試算表檔案，將缺少的項目參數附加回本地系統存儲配置。',
    processXlsx: '處理本地 .xlsx 文件',
    householdMembers: '家庭成員',
    addUser: '新增',
    destructiveOps: '破壞性操作矩陣',
    destructiveDesc: '永久清除應用程式狀態和記錄。在繼續前請通過試算表備份配置。',
    pushCloud: '推送至雲端',
    pullCloud: '從雲端拉取',
    verifySync: '驗證同步',
    wipeLocal: '清除本地緩存',
    passwordTitle: '存取限制',
    passwordHint: '輸入主系統密碼以解密庫存帳本。',
    authorize: '授權',
    incorrectPwd: '存取憑證不正確。',
    quickAdd: '快速新增資產',
    chooseSegPlaceholder: '例如：睡房、廚房',
    chooseConPlaceholder: '例如：衣櫃A、櫥櫃B',
    chooseSubPlaceholder: '例如：上層抽屜、層架A',
    none: '無',
    noPhoto: '無圖片',
    confirmDeleteSeg: '刪除空間',
    confirmDeleteCon: '刪除容器',
    confirmDeleteSub: '刪除子容器',
    confirmDeleteItem: '確定要刪除此物品配置規則嗎？',
    confirmDeleteCategory: '永久刪除所選分類節點路徑分支？',
    confirmPurge: '銷毀所有已配置的結構和應用程式變數？此操作無法撤銷。',
    pleaseComplete: '請填寫物品名稱、分類、空間和容器分配。',
    noItemsExport: '工作系統帳本中沒有數據可供匯出。',
    importSuccess: '試算表處理成功。',
    importError: '解碼檔案內容時出錯：',
    profileUpdated: '本地基礎設施存取配置已更新。',
    pushDispatched: '推送已發送',
    pullComplete: '雲端拉取完成。',
    pullFailed: '拉取失敗：',
    inSync: '已同步',
    notSynced: '未同步',
    offline: '離線',
    mismatch: '不匹配',
    cloudVsLocal: '雲端 vs 本地',
    cloud: '雲端',
    local: '本地',
    synced: '已同步',
    pushed: '已推送',
    pulled: '已拉取',
    detailCategory: '分類',
    detailLocation: '位置',
    detailOwner: '擁有者',
    detailAdded: '新增時間',
    detailRemarks: '備註',
    detailId: '系統 ID',
    newUserPlaceholder: '例如：爸爸、媽媽',
    language: '語言',
    defaultUser: '預設用戶',
    cannotRemoveDefault: '無法移除預設用戶。',
    removeUser: '移除用戶',
    aiAnalyzing: 'AI 正在分析庫存...',
    aiFound: 'AI 找到',
    aiNoMatch: 'AI 未找到匹配的物品。',
    aiFailed: 'AI 搜尋失敗：',
    aiNoKey: '未配置 DeepSeek API 密鑰。請在雲端引擎頁面中添加。',
    noItems: '沒有可搜尋的庫存物品。',
    syncVerifyFailed: '無法連接雲端：',
    pushFailed: '推送失敗：',
    itemNotFound: '未找到物品：',
    editError: '編輯錯誤：',
    initError: '初始化錯誤：',
    chars: '字符',
    chunks: '區塊',
    itemsLoaded: '件物品已載入。',
    missingEndpoint: '缺少 Google Apps Script 部署網址。',
    missingEndpointShort: '缺少 Google Script 網址。',
    syncOk: '雲端註冊表下載同步成功。',
    syncFailed: '無法解析有效的雲端回應。',
    payload: '載荷',
    id: '編號',
    timestamp: '時間戳',
    cloudPushOk: '雲端備份推送已發送。',
    sheetError: '解碼檔案內容時出錯：',
    confirmRemoveUser: '移除用戶',
    member: '成員',
    members: '成員',
    segments: '空間',
    users: '用戶',
    itemsCap: '物品',
    match: '匹配',
    confirmDropCategory: '永久刪除所選分類節點路徑分支？',
    changePassword: '更改系統密碼',
    payloadToken: '載荷驗證令牌',
    aiMetadata: 'AI 元數據（用於搜尋的圖片描述）',
    aiMetadataPlaceholder: 'AI 生成的資產描述...',
    barcodeCopied: 'Barcode ID 已複製',
    barcodeCopyFailed: '複製失敗',
    tabToBuy: '待購清單',
    stockLow: '存量不足',
    stockOut: '缺貨',
  }
};

function t(key) {
    return (LANG[appState.language] && LANG[appState.language][key]) || (LANG['en'][key] || key);
}

// Device identity (persisted per-browser)
function getDeviceId() {
    var id = localStorage.getItem('hk_device_id');
    if (!id) {
        id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('hk_device_id', id);
    }
    return id;
}

function generateItemId() {
    var d = new Date();
    return 'itm_' + d.getTime().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

function generateBarcodeId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var result = '';
    for (var i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
function getItemLookupMatch(rawCode) {
    if (!rawCode) return null;
    var code = rawCode.trim();
    var byBarcode = appState.inventory.find(function(i) { return !i.deletedAt && i.barcodeId === code; });
    if (byBarcode) return byBarcode;
    var byId = appState.inventory.find(function(i) { return !i.deletedAt && i.id === code; });
    return byId || null;
}

function ensureInventoryBarcodeIds() {
    var changed = false;
    appState.inventory.forEach(function(item) {
        if (!item.barcodeId) {
            item.barcodeId = generateBarcodeId();
            changed = true;
        }
    });
    if (changed) saveStateToLocalStorage();
}
let appState = {
    meta: {
        deviceId: getDeviceId(),
        lastSyncedAt: null,
        lastServerRevision: null
    },
    syncQueue: [],
    segments: {},
    coordinates: {},
    categories: {},
    inventory: [],
    users: ['Default'],
    currentUser: 'Default',
    userEmails: {},
    reminderDays: 30,
    reminderLog: {},
    language: 'en',
    selectedCategoryNodePath: null,
    activeMappingNode: null,
    spatialBackgroundImage: null
};

/* ==========================================================================
   IndexedDB Image Store — isolate photos from localStorage
   ========================================================================== */
var _imageDb = null;
var _imageBlobUrlCache = {};
var _pendingImageMeta = null;

function openImageDb() {
    return new Promise(function(resolve, reject) {
        if (_imageDb) return resolve(_imageDb);
        var request = indexedDB.open('findmyitem-assets', 1);
        request.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('images')) {
                db.createObjectStore('images', { keyPath: 'key' });
            }
        };
        request.onsuccess = function(e) { _imageDb = e.target.result; resolve(_imageDb); };
        request.onerror = function(e) { reject(e.target.error); };
    });
}

function idbGetImage(key) {
    return openImageDb().then(function(db) {
        return new Promise(function(resolve, reject) {
            var tx = db.transaction('images', 'readonly');
            var store = tx.objectStore('images');
            var req = store.get(key);
            req.onsuccess = function() { resolve(req.result || null); };
            req.onerror = function() { reject(req.error); };
        });
    });
}

function idbPutImage(record) {
    return openImageDb().then(function(db) {
        return new Promise(function(resolve, reject) {
            var tx = db.transaction('images', 'readwrite');
            var store = tx.objectStore('images');
            var req = store.put(record);
            req.onsuccess = function() { resolve(record); };
            req.onerror = function() { reject(req.error); };
        });
    });
}

function idbDeleteImage(key) {
    return openImageDb().then(function(db) {
        return new Promise(function(resolve, reject) {
            var tx = db.transaction('images', 'readwrite');
            var store = tx.objectStore('images');
            var req = store.delete(key);
            req.onsuccess = function() { resolve(); };
            req.onerror = function() { reject(req.error); };
        });
    });
}

function idbListKeys() {
    return openImageDb().then(function(db) {
        return new Promise(function(resolve, reject) {
            var tx = db.transaction('images', 'readonly');
            var store = tx.objectStore('images');
            var req = store.getAllKeys();
            req.onsuccess = function() { resolve(req.result || []); };
            req.onerror = function() { reject(req.error); };
        });
    });
}

/* ==========================================================================
   Image Helpers — compress, store, resolve, migrate
   ========================================================================== */
function compressImageFileToBlob(file, maxPx, quality, mimeType) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var w = img.width, h = img.height;
                if (w > maxPx || h > maxPx) {
                    var ratio = Math.min(maxPx / w, maxPx / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                canvas.toBlob(function(blob) {
                    resolve({ blob: blob, width: w, height: h });
                }, mimeType || 'image/jpeg', quality);
            };
            img.onerror = function() { reject(new Error('Image load failed')); };
            img.src = e.target.result;
        };
        reader.onerror = function() { reject(new Error('File read failed')); };
        reader.readAsDataURL(file);
    });
}

function blobToDataUrl(blob) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() { resolve(reader.result); };
        reader.onerror = function() { reject(reader.error); };
        reader.readAsDataURL(blob);
    });
}

function generateImageKeys(itemId) {
    var ts = Date.now().toString(36);
    return { thumb: 'thumb_' + itemId + '_' + ts, full: 'full_' + itemId + '_' + ts };
}

function loadImageIntoCache(key) {
    if (_imageBlobUrlCache[key]) return Promise.resolve(_imageBlobUrlCache[key]);
    return idbGetImage(key).then(function(record) {
        if (record && record.blob) {
            var url = URL.createObjectURL(record.blob);
            _imageBlobUrlCache[key] = url;
            return url;
        }
        return null;
    });
}

function revokeAllCachedBlobUrls() {
    for (var k in _imageBlobUrlCache) {
        if (Object.prototype.hasOwnProperty.call(_imageBlobUrlCache, k)) {
            URL.revokeObjectURL(_imageBlobUrlCache[k]);
        }
    }
    _imageBlobUrlCache = {};
}

function normalizeDriveUrl(url) {
    if (!url) return url;
    var fileId = null;
    var matchPath = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchPath) fileId = matchPath[1];
    if (!fileId) {
        var matchParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (matchParam) fileId = matchParam[1];
    }
    if (fileId && url.indexOf('drive.google.com') !== -1) {
        return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1280';
    }
    return url;
}

function getRenderableImageSrc(item, preferThumb) {
    if (!item) return 'https://placehold.co/100?text=No+Photo';
    var primaryUrl = preferThumb ? (item.imageThumbUrl || item.imageUrl) : (item.imageUrl || item.imageThumbUrl);
    var primaryKey = preferThumb ? (item.imageThumbKey || item.imageFullKey) : (item.imageFullKey || item.imageThumbKey);
    if (primaryUrl && primaryUrl.indexOf('http') === 0) {
        if (primaryKey && !_imageBlobUrlCache[primaryKey]) {
            setTimeout(function() { hydrateRemoteImage(item); }, 200);
        }
        return normalizeDriveUrl(primaryUrl);
    }
    if (item.imageSourceType === 'idb' || (item.imageUrl && item.imageUrl.indexOf('data:image') === 0)) {
        var key = preferThumb ? (item.imageThumbKey || item.imageFullKey) : (item.imageFullKey || item.imageThumbKey);
        if (key) {
            if (_imageBlobUrlCache[key]) return _imageBlobUrlCache[key];
            loadImageIntoCache(key);
        }
        return 'https://placehold.co/100?text=No+Photo';
    }
    return item.imageUrl || 'https://placehold.co/100?text=No+Photo';
}

function saveUploadedImageToIndexedDb(file, itemId) {
    var keys = generateImageKeys(itemId);
    return Promise.all([
        compressImageFileToBlob(file, 320, 0.6, 'image/jpeg'),
        compressImageFileToBlob(file, 1280, 0.75, 'image/jpeg')
    ]).then(function(results) {
        var thumbResult = results[0];
        var fullResult = results[1];
        return Promise.all([
            blobToDataUrl(thumbResult.blob),
            idbPutImage({ key: keys.thumb, blob: thumbResult.blob, mime: 'image/jpeg' }),
            idbPutImage({ key: keys.full, blob: fullResult.blob, mime: 'image/jpeg' })
        ]).then(function(putResults) {
            var thumbDataUrl = putResults[0];
            var blobUrl = URL.createObjectURL(thumbResult.blob);
            _imageBlobUrlCache[keys.thumb] = blobUrl;
            _pendingImageMeta = {
                sourceType: 'idb',
                thumbKey: keys.thumb,
                fullKey: keys.full,
                imageUrl: '',
                imageThumbUrl: '',
                imageMeta: {
                    thumbBytes: thumbResult.blob.size,
                    fullBytes: fullResult.blob.size,
                    width: fullResult.width,
                    height: fullResult.height,
                    mime: 'image/jpeg',
                    createdAt: new Date().toISOString()
                }
            };
            return { dataUrl: thumbDataUrl, blobUrl: blobUrl, meta: _pendingImageMeta };
        });
    });
}

function uploadImageToCloud(blob, fileName) {
    var endpoint = localStorage.getItem('sys_gas_url');
    var secret = localStorage.getItem('sys_api_pwd');
    if (!endpoint) return Promise.reject(new Error('Cloud sync not configured. Set API URL in Settings.'));
    return blobToDataUrl(blob).then(function(dataUrl) {
        var b64 = dataUrl.split(',')[1];
        var params = new URLSearchParams();
        params.append('token', secret);
        params.append('action', 'IMAGE_UPLOAD');
        params.append('data', b64);
        params.append('fileName', fileName);
        return fetch(endpoint, { method: 'POST', body: params }).then(function(r) { return r.json(); });
    }).then(function(result) {
        if (result && result.success) return result.url;
        throw new Error(result ? result.error : 'Upload returned no URL');
    });
}

function saveUploadedImage(file, tempId) {
    return Promise.all([
        compressImageFileToBlob(file, 320, 0.6, 'image/jpeg'),
        compressImageFileToBlob(file, 1280, 0.75, 'image/jpeg')
    ]).then(function(results) {
        var thumbResult = results[0];
        var fullResult = results[1];

        return uploadImageToCloud(thumbResult.blob, 'thumb_' + tempId + '.jpg').then(function(thumbUrl) {
            return uploadImageToCloud(fullResult.blob, 'full_' + tempId + '.jpg').then(function(fullUrl) {
                var keys = generateImageKeys(tempId);
                idbPutImage({ key: keys.thumb, blob: thumbResult.blob, mime: 'image/jpeg' }).catch(function(){});
                idbPutImage({ key: keys.full, blob: fullResult.blob, mime: 'image/jpeg' }).catch(function(){});
                var blobUrl = URL.createObjectURL(thumbResult.blob);
                _imageBlobUrlCache[keys.thumb] = blobUrl;
                _pendingImageMeta = {
                    sourceType: 'remote',
                    thumbKey: keys.thumb,
                    fullKey: keys.full,
                    imageUrl: fullUrl,
                    imageThumbUrl: thumbUrl,
                    imageMeta: {
                        thumbBytes: thumbResult.blob.size,
                        fullBytes: fullResult.blob.size,
                        width: fullResult.width,
                        height: fullResult.height,
                        mime: 'image/jpeg',
                        createdAt: new Date().toISOString()
                    }
                };
                return { dataUrl: blobUrl, blobUrl: blobUrl, meta: _pendingImageMeta };
            });
        });
    });
}

function normalizeImageFields(item) {
    if (!item) return item;
    if (item.imageThumbUrl || item.imageUrl) {
        item.imageSourceType = 'remote';
    } else if (!item.imageSourceType && (item.imageThumbKey || item.imageFullKey)) {
        item.imageSourceType = 'idb';
    }
    return item;
}

function hydrateRemoteImage(item) {
    if (!item) return;
    var thumbUrl = normalizeDriveUrl(item.imageThumbUrl);
    var fullUrl = normalizeDriveUrl(item.imageUrl);
    var thumbKey = item.imageThumbKey;
    var fullKey = item.imageFullKey;
    var isDriveThumb = thumbUrl && thumbUrl.indexOf('drive.google.com/thumbnail') !== -1;
    var isDriveFull = fullUrl && fullUrl.indexOf('drive.google.com/thumbnail') !== -1;
    if (isDriveThumb && thumbKey) {
        _imageBlobUrlCache[thumbKey] = thumbUrl;
    } else if (thumbUrl && thumbUrl.indexOf('http') === 0 && thumbKey && !_imageBlobUrlCache[thumbKey]) {
        fetch(thumbUrl)
            .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
            .then(function(blob) {
                idbPutImage({ key: thumbKey, blob: blob, mime: blob.type || 'image/jpeg' }).catch(function(){});
                _imageBlobUrlCache[thumbKey] = URL.createObjectURL(blob);
            })
            .catch(function(e) { /* silent */ });
    }
    if (isDriveFull && fullKey) {
        _imageBlobUrlCache[fullKey] = fullUrl;
    } else if (fullUrl && fullUrl.indexOf('http') === 0 && fullKey && !_imageBlobUrlCache[fullKey] && fullUrl !== thumbUrl) {
        fetch(fullUrl)
            .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
            .then(function(blob) {
                idbPutImage({ key: fullKey, blob: blob, mime: blob.type || 'image/jpeg' }).catch(function(){});
                _imageBlobUrlCache[fullKey] = URL.createObjectURL(blob);
            })
            .catch(function(e) { /* silent */ });
    }
}

function removeItemIdbImages(item) {
    if (!item) return Promise.resolve();
    var keys = [];
    if (item.imageThumbKey) keys.push(item.imageThumbKey);
    if (item.imageFullKey) keys.push(item.imageFullKey);
    if (keys.length === 0) return Promise.resolve();
    return Promise.all(keys.map(function(k) {
        if (_imageBlobUrlCache[k]) { URL.revokeObjectURL(_imageBlobUrlCache[k]); delete _imageBlobUrlCache[k]; }
        return idbDeleteImage(k);
    }));
}

function removeItemImagesQuiet(item) {
    removeItemIdbImages(item).catch(function(e) { console.warn('[image] Cleanup error:', e); });
}

function cleanupOrphanedImages() {
    return idbListKeys().then(function(allKeys) {
        var liveKeys = {};
        (appState.inventory || []).forEach(function(item) {
            if (item.imageThumbKey) liveKeys[item.imageThumbKey] = true;
            if (item.imageFullKey) liveKeys[item.imageFullKey] = true;
        });
        var orphanKeys = allKeys.filter(function(k) { return !liveKeys[k]; });
        if (orphanKeys.length === 0) return 0;
        return Promise.all(orphanKeys.map(function(k) {
            if (_imageBlobUrlCache[k]) { URL.revokeObjectURL(_imageBlobUrlCache[k]); delete _imageBlobUrlCache[k]; }
            return idbDeleteImage(k);
        })).then(function() { return orphanKeys.length; });
    });
}

function preloadAllIdbImages() {
    var keys = [];
    (appState.inventory || []).forEach(function(item) {
        if (item.imageThumbKey) keys.push(item.imageThumbKey);
        if (item.imageFullKey) keys.push(item.imageFullKey);
    });
    if (keys.length === 0) return Promise.resolve();
    return Promise.all(keys.map(function(k) { return loadImageIntoCache(k); }));
}

function migrateLegacyDataUrlImages() {
    var migrated = 0;
    var pending = [];
    (appState.inventory || []).forEach(function(item, idx) {
        if (item.deletedAt) return;
        if (!item.imageUrl || item.imageUrl.indexOf('data:image') !== 0) return;
        if (item.imageSourceType === 'idb' && item.imageThumbKey) return;
        var b64 = item.imageUrl;
        var keys = generateImageKeys(item.id);
        var blob = dataUrlToBlob(b64);
        if (!blob) return;
        item.imageSourceType = 'idb';
        item.imageThumbKey = keys.thumb;
        item.imageFullKey = keys.full;
        item.imageMeta = item.imageMeta || { thumbBytes: blob.size, fullBytes: blob.size, mime: blob.type || 'image/jpeg', createdAt: new Date().toISOString() };
        var origUrl = item.imageUrl;
        item.imageUrl = '';
        pending.push(
            idbPutImage({ key: keys.thumb, blob: blob, mime: blob.type || 'image/jpeg' })
                .then(function() { return blobToDataUrl(blob); })
                .then(function(dataUrl) {
                    var blobUrl = URL.createObjectURL(blob);
                    _imageBlobUrlCache[keys.thumb] = blobUrl;
                    _imageBlobUrlCache[keys.full] = blobUrl;
                })
                .catch(function(e) {
                    delete item.imageSourceType;
                    delete item.imageThumbKey;
                    delete item.imageFullKey;
                    item.imageUrl = origUrl;
                    console.warn('[migrate] Failed for item ' + idx + ': ' + e.message);
                })
        );
        migrated++;
    });
    return Promise.all(pending).then(function() {
        if (migrated > 0) {
            console.log('[migrate] Migrated ' + migrated + ' legacy base64 images to IndexedDB');
            saveStateToLocalStorage();
        }
        return migrated;
    });
}

function dataUrlToBlob(dataUrl) {
    try {
        var parts = dataUrl.split(',');
        if (parts.length < 2) return null;
        var mime = parts[0].match(/:(.*?);/);
        var bytes = atob(parts[1]);
        var arr = new Uint8Array(bytes.length);
        for (var i = 0; i < bytes.length; i++) { arr[i] = bytes.charCodeAt(i); }
        return new Blob([arr], { type: (mime ? mime[1] : 'image/jpeg') });
    } catch(e) {
        console.warn('[dataUrlToBlob] Failed:', e.message);
        return null;
    }
}

function maybeWarnStoragePressure() {
    if (!navigator.storage || !navigator.storage.estimate) return;
    navigator.storage.estimate().then(function(est) {
        var used = est.usage || 0;
        var quota = est.quota || 0;
        if (quota > 0 && used / quota > 0.8) {
            var usedMB = (used / 1024 / 1024).toFixed(1);
            var quotaMB = (quota / 1024 / 1024).toFixed(1);
            console.warn('[storage] High usage: ' + usedMB + '/' + quotaMB + ' MB (' + Math.round(used/quota*100) + '%)');
            showToast('Storage is ' + Math.round(used/quota*100) + '% full (' + usedMB + '/' + quotaMB + ' MB). Compact or remove old items in Settings.', 'warning');
        }
    }).catch(function() {});
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(function(granted) {
            if (granted) console.log('[storage] Persistent storage granted');
        }).catch(function() {});
    }
}

// Legacy compatibility wrapper — keep old callback API working internally
function compressImageFile(file, maxPx, quality, callback) {
    compressImageFileToBlob(file, maxPx, quality).then(function(result) {
        blobToDataUrl(result.blob).then(callback);
    });
}

// ===== Multi-Location Stock Helpers =====
function getStockEntries(item) {
    if (!item || item.itemType !== 'stock') return [];
    if (item.stockEntries && Array.isArray(item.stockEntries)) return item.stockEntries;
    return [];
}

function getActiveStockEntries(item) {
    return getStockEntries(item).filter(function(e) { return !e.hiddenAt; });
}

function getTotalStockQuantity(item) {
    return getActiveStockEntries(item).reduce(function(sum, e) { return sum + (e.quantity || 0); }, 0);
}

function isStockItemLow(item) {
    if (item.itemType !== 'stock') return false;
    var total = getTotalStockQuantity(item);
    return total <= (item.minQuantity || 0) && (item.minQuantity || 0) > 0;
}

function isStockItemOutOfStock(item) {
    if (item.itemType !== 'stock') return false;
    return getTotalStockQuantity(item) === 0;
}

function getStockLocationLabel(entry) {
    var parts = [];
    if (entry.segment) parts.push(entry.segment);
    if (entry.container) parts.push(entry.container);
    if (entry.subContainer) parts.push(entry.subContainer);
    return parts.join(' > ') || '\u2014';
}

function getStockLocationSummary(item) {
    if (item.itemType !== 'stock') return '';
    var entries = getActiveStockEntries(item);
    if (entries.length === 0) return 'No locations';
    var locations = entries.map(function(e) { return getStockLocationLabel(e) + ' (' + (e.quantity || 0) + ')'; });
    if (locations.length <= 2) return locations.join(' | ');
    return locations.slice(0, 2).join(' | ') + ' +' + (locations.length - 2) + ' more';
}

function generateStockEntryId() {
    return 'se_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

function migrateLegacyStockItem(item) {
    if (item.itemType !== 'stock') return false;
    if (item.stockEntries && Array.isArray(item.stockEntries)) return false;
    var entry = {
        id: generateStockEntryId(),
        segment: item.segment || '',
        container: item.container || '',
        subContainer: item.subContainer || '',
        quantity: item.quantity || 0,
        purchaseDate: item.purchaseDate || '',
        warrantyDate: item.warrantyDate || '',
        expiryDate: item.expiryDate || '',
        hiddenAt: item.quantity === 0 ? new Date().toISOString() : null
    };
    item.stockEntries = [entry];
    item.segment = '';
    item.container = '';
    item.subContainer = '';
    item.quantity = 0;
    item.purchaseDate = '';
    item.warrantyDate = '';
    item.expiryDate = '';
    return true;
}

// Transient runtime state (not persisted)
let aiFilteredItemIds = null;
let editingNode = null; // { type: 'segment'|'container'|'subContainer', segment, container?, subContainer?, oldName }
let _mapDirty = false;
let _classesDirty = false;
let _formDirty = false;
var _mapZoom = 1;
var _mapPanX = 0;
var _mapPanY = 0;
var _mapDragging = false;
var _mapDragStartX = 0;
var _mapDragStartY = 0;
var _mapDragStartPanX = 0;
var _mapDragStartPanY = 0;

function applyMapTransform() {
    var stage = document.getElementById('spatialMapStage');
    if (!stage) return;
    stage.style.transform = 'translate(' + _mapPanX + 'px, ' + _mapPanY + 'px) scale(' + _mapZoom + ')';
}

function zoomInMap() {
    var vp = document.getElementById('spatialMapViewport');
    if (!vp) return;
    var newZoom = Math.min(_mapZoom * 1.4, 4);
    var rect = vp.getBoundingClientRect();
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    _mapPanX = cx - (cx - _mapPanX) * (newZoom / _mapZoom);
    _mapPanY = cy - (cy - _mapPanY) * (newZoom / _mapZoom);
    _mapZoom = newZoom;
    applyMapTransform();
}

function zoomOutMap() {
    var vp = document.getElementById('spatialMapViewport');
    if (!vp) return;
    var newZoom = Math.max(_mapZoom / 1.4, 0.3);
    var rect = vp.getBoundingClientRect();
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    _mapPanX = cx - (cx - _mapPanX) * (newZoom / _mapZoom);
    _mapPanY = cy - (cy - _mapPanY) * (newZoom / _mapZoom);
    _mapZoom = newZoom;
    applyMapTransform();
}

// resetMapZoom is intentionally a hard reset to default origin (zoom=1, pan=0,0).
// It is kept separate from fitMapToViewport() because reset is a known-safe anchor
// state, while fitMapToViewport depends on placed content. Users may prefer a
// quick reset to default over a content-aware fit in some workflows.
function resetMapZoom() {
    _mapZoom = 1;
    _mapPanX = 0;
    _mapPanY = 0;
    applyMapTransform();
}

// fitMapToViewport looks at all placed coordinate markers and computes a
// zoom+pan such that the logical map content fits inside the viewport with
// 10% margin on each side. Single-point maps use a minimum content area.
function fitMapToViewport() {
    var vp = document.getElementById('spatialMapViewport');
    if (!vp) return;
    var rect = vp.getBoundingClientRect();
    var vpW = rect.width;
    var vpH = rect.height;
    if (vpW <= 0 || vpH <= 0) return;

    if (appState.coordinates && Object.keys(appState.coordinates).length > 0) {
        var minX = 100, minY = 100, maxX = 0, maxY = 0;
        Object.keys(appState.coordinates).forEach(function(k) {
            var c = appState.coordinates[k];
            if (c.x < minX) minX = c.x;
            if (c.x > maxX) maxX = c.x;
            if (c.y < minY) minY = c.y;
            if (c.y > maxY) maxY = c.y;
        });

        var contentW = ((maxX - minX) / 100) * vpW;
        var contentH = ((maxY - minY) / 100) * vpH;
        var cx = ((minX + maxX) / 2 / 100) * vpW;
        var cy = ((minY + maxY) / 2 / 100) * vpH;

        // Prevent division by zero for single-point maps
        var minContent = 0.1 * Math.min(vpW, vpH);
        if (contentW < minContent) contentW = minContent;
        if (contentH < minContent) contentH = minContent;

        var margin = 0.8; // content occupies 80% of the viewport (10% margin each side)
        var fitZoom = Math.min((vpW * margin) / contentW, (vpH * margin) / contentH);
        fitZoom = Math.max(0.3, Math.min(4, fitZoom));

        _mapZoom = fitZoom;
        _mapPanX = vpW / 2 - cx * _mapZoom;
        _mapPanY = vpH / 2 - cy * _mapZoom;
    } else {
        // No coordinates placed; reset to default view
        resetMapZoom();
        return;
    }

    applyMapTransform();
}

function mapStageCoordFromEvent(e) {
    var vp = document.getElementById('spatialMapViewport');
    if (!vp) return null;
    var rect = vp.getBoundingClientRect();
    var rx = e.clientX - rect.left;
    var ry = e.clientY - rect.top;
    var sx = (rx - _mapPanX) / _mapZoom;
    var sy = (ry - _mapPanY) / _mapZoom;
    return { x: sx, y: sy, vpW: rect.width, vpH: rect.height };
}

function installMapDragListeners() {
    var vp = document.getElementById('spatialMapViewport');
    if (!vp) return;

    vp.addEventListener('pointerdown', function(e) {
        if (e.target !== vp && e.target !== document.getElementById('spatialMapGridMatrix') && e.target !== document.getElementById('spatialMapBgImage')) return;
        _mapDragging = true;
        _mapDragStartX = e.clientX;
        _mapDragStartY = e.clientY;
        _mapDragStartPanX = _mapPanX;
        _mapDragStartPanY = _mapPanY;
        var stage = document.getElementById('spatialMapStage');
        if (stage) stage.classList.add('panning');
        e.preventDefault();
    });

    window.addEventListener('pointermove', function(e) {
        if (!_mapDragging) return;
        var dx = e.clientX - _mapDragStartX;
        var dy = e.clientY - _mapDragStartY;
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
        _mapPanX = _mapDragStartPanX + dx;
        _mapPanY = _mapDragStartPanY + dy;
        applyMapTransform();
    });

    window.addEventListener('pointerup', function(e) {
        if (!_mapDragging) return;
        _mapDragging = false;
        var stage = document.getElementById('spatialMapStage');
        if (stage) stage.classList.remove('panning');
    });
}

// Coordinate key helpers
function buildCoordKey(seg, con, sub) {
    return `${seg}|${con}|${sub}`;
}
function parseCoordKey(key) {
    const parts = key.split('|');
    return { segment: parts[0], container: parts[1], subContainer: parts[2] || '' };
}

// ===== Snapshot-Based Persistence ============================================
// Local appState is the canonical source of truth for structural data.
// Every mutation increments localSnapshotVersion. Successful push sets
// lastPushedSnapshotVersion. Dirty detection uses version comparison,
// not queue length.

// ===== Deep Clone Helper ======================================================
function deepCloneJsonSafe(value) {
    if (value === undefined || value === null) return value;
    try { return JSON.parse(JSON.stringify(value)); } catch(e) { return value; }
}

function buildPersistedStateSnapshot(state) {
    state = state || {};
    var snap = {};
    snap.meta = state.meta ? {
        deviceId: state.meta.deviceId,
        lastSyncedAt: state.meta.lastSyncedAt,
        lastServerRevision: state.meta.lastServerRevision,
        lastLocalChangeAt: state.meta.lastLocalChangeAt,
        lastChangeBy: state.meta.lastChangeBy,
        localSnapshotVersion: state.meta.localSnapshotVersion || 0,
        lastPushedSnapshotVersion: state.meta.lastPushedSnapshotVersion || 0
    } : { deviceId: getDeviceId(), lastSyncedAt: null, lastServerRevision: null, localSnapshotVersion: 0, lastPushedSnapshotVersion: 0 };
    snap.syncQueue = deepCloneJsonSafe(state.syncQueue || []);
    snap.segments = deepCloneJsonSafe(state.segments || {});
    snap.coordinates = deepCloneJsonSafe(state.coordinates || {});
    snap.categories = deepCloneJsonSafe(state.categories || {});
    snap.inventory = deepCloneJsonSafe(state.inventory || []);
    snap.users = deepCloneJsonSafe(state.users || ['Default']);
    snap.currentUser = state.currentUser || 'Default';
    snap.userEmails = deepCloneJsonSafe(state.userEmails || {});
    snap.reminderDays = state.reminderDays || 30;
    snap.reminderLog = deepCloneJsonSafe(state.reminderLog || {});
    snap.language = state.language || 'en';
    snap.spatialBackgroundImage = state.spatialBackgroundImage || null;
    return snap;
}

function buildCloudSyncPayload(state) {
    var payload = buildPersistedStateSnapshot(state);
    payload.syncQueue = [];
    return payload;
}

function replaceLocalStateWithCloud(cloud) {
    if (!cloud) return;
    var localDeviceId = (appState && appState.meta && appState.meta.deviceId) || getDeviceId();
    var snapshot = buildPersistedStateSnapshot(cloud);
    snapshot = migrateLegacyState(snapshot);
    snapshot.meta = snapshot.meta || {};
    snapshot.meta.deviceId = localDeviceId;
    snapshot.meta.lastSyncedAt = new Date().toISOString();
    snapshot.meta.lastServerRevision = (cloud.meta && cloud.meta.lastServerRevision != null) ? cloud.meta.lastServerRevision : (snapshot.meta.lastServerRevision || 0);
    snapshot.meta.localSnapshotVersion = snapshot.meta.localSnapshotVersion || 0;
    snapshot.meta.lastPushedSnapshotVersion = snapshot.meta.localSnapshotVersion || 0;
    snapshot.syncQueue = [];
    appState = snapshot;
    normalizeAllItemImageFields();
    if (typeof _formDirty !== 'undefined') _formDirty = false;
    saveStateToLocalStorage();
    syncUIComponents();
    updateSyncStatusBadge();
    updateSyncBanner();
    updateLoginSyncStatus();
}

async function startupLoadFromCloud() {
    var endpoint = localStorage.getItem('sys_gas_url');
    var secret = localStorage.getItem('sys_api_pwd');
    if (!endpoint) return;
    if (_syncInProgress) return;

    _syncInProgress = true;
    _syncLastFailed = false;
    _syncConflict = false;
    updateSyncStatusBadge();

    try {
        var cloud = await getCloudState(secret, endpoint);
        if (cloud) {
            replaceLocalStateWithCloud(cloud);
        }
        _syncLastFailed = false;
        _syncConflict = false;
    } catch (e) {
        console.error('[startupLoadFromCloud] ' + (e && e.message ? e.message : e), e);
        _syncLastFailed = true;
    } finally {
        _syncInProgress = false;
        updateSyncStatusBadge();
        updateSyncBanner();
        updateLoginSyncStatus();
    }
}

function hasUnsyncedSnapshot(state) {
    if (!state || !state.meta) return false;
    var localVer = state.meta.localSnapshotVersion || 0;
    var pushedVer = state.meta.lastPushedSnapshotVersion || 0;
    if (localVer > pushedVer) return true;
    var hasQueue = (state.syncQueue && state.syncQueue.length > 0);
    return hasQueue;
}

// ===== Unified Mutation Entry Point =====
// All state changes MUST flow through mutateState().
function mutateState(actionType, metadata) {
    appState.meta = appState.meta || {};
    appState.meta.lastLocalChangeAt = new Date().toISOString();
    appState.meta.lastChangeBy = appState.meta.deviceId || getDeviceId();
    appState.meta.localSnapshotVersion = (appState.meta.localSnapshotVersion || 0) + 1;
    enqueueSyncAction(actionType, metadata);
    saveStateToLocalStorage();
    updateSyncStatusBadge();
}

function hasUnsyncedLocalChanges(state) {
    return hasUnsyncedSnapshot(state);
}

function stampNow(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    var now = new Date().toISOString();
    obj.updatedAt = now;
    obj.updatedBy = appState.meta.deviceId || getDeviceId();
    return obj;
}

function enqueueSyncAction(actionType, metadata) {
    if (!appState.syncQueue) appState.syncQueue = [];
    appState.syncQueue.push({
        op: actionType,
        meta: metadata || {},
        timestamp: new Date().toISOString(),
        id: 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5)
    });
}

function updateSyncStatusBadge() {
    var badge = document.getElementById('syncStatusBadge');
    if (!badge) return;
    var pending = (appState.syncQueue && appState.syncQueue.length) || 0;
    if (_syncInProgress) {
        badge.innerText = '\u{1F504} Syncing\u2026';
        badge.className = 'text-[10px] text-blue-600 font-medium ml-2';
    } else if (_syncLastFailed) {
        badge.innerText = '\u274C Sync failed';
        badge.className = 'text-[10px] text-red-500 font-medium ml-2';
    } else if (_syncConflict) {
        badge.innerText = '\u26A0\uFE0F Conflict detected';
        badge.className = 'text-[10px] text-amber-600 font-medium ml-2';
    } else if (pending > 0) {
        badge.innerText = '\u{1F4E4} Pending sync (' + pending + ')';
        badge.className = 'text-[10px] text-slate-500 font-medium ml-2';
    } else if (appState.meta.lastSyncedAt) {
        badge.innerText = '\u2705 Synced ' + formatRelativeTime(appState.meta.lastSyncedAt);
        badge.className = 'text-[10px] text-emerald-600 font-medium ml-2';
    } else {
        badge.innerText = '\u26AA Saved locally';
        badge.className = 'text-[10px] text-slate-400 font-medium ml-2';
    }
    updateSyncBanner();
    updateSyncAlertRow();
    updateLoginSyncStatus();
    updateSyncCallToActionState();
}

function updateSyncAlertRow() {
    var row = document.getElementById('syncAlertRow');
    if (!row) return;
    if (_syncLastFailed) {
        row.className = 'rounded-lg p-3 mb-4 text-xs font-medium bg-red-50 text-red-700 border border-red-200';
        row.innerText = '\u274C Sync failed. Check your connection and endpoint URL, then try again.';
        row.classList.remove('hidden');
    } else if (_syncConflict) {
        row.className = 'rounded-lg p-3 mb-4 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer';
        row.innerHTML = '\u26A0\uFE0F <u>Data conflict detected. Tap to pull cloud data & resolve.</u>';
        row.onclick = function() { syncNow(); };
        row.classList.remove('hidden');
    } else if (appState.meta.lastSyncedAt) {
        row.className = 'rounded-lg p-3 mb-4 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200';
        row.innerText = '\u2705 Last synced: ' + new Date(appState.meta.lastSyncedAt).toLocaleString();
        row.classList.remove('hidden');
    } else {
        row.classList.add('hidden');
    }
}

function updateSyncBanner() {
    var pending = (appState.syncQueue && appState.syncQueue.length) || 0;
    var dotClass, text, textMobile;
    if (_syncInProgress) {
        dotClass = 'sync-dot-blue';
        text = 'Syncing\u2026';
        textMobile = 'Syncing\u2026';
    } else if (_syncLastFailed) {
        dotClass = 'sync-dot-red';
        text = 'Sync failed';
        textMobile = 'Failed';
    } else if (_syncConflict) {
        dotClass = 'sync-dot-amber';
        text = '\u26A0\uFE0F Conflict — tap to resolve';
        textMobile = 'Conflict — tap';
    } else if (pending > 0) {
        dotClass = 'sync-dot-gray';
        text = 'Pending sync (' + pending + ')';
        textMobile = pending + ' pending';
    } else if (appState.meta.lastSyncedAt) {
        dotClass = 'sync-dot-green';
        text = 'Synced ' + formatRelativeTime(appState.meta.lastSyncedAt);
        textMobile = 'Synced';
    } else {
        dotClass = 'sync-dot-gray';
        text = 'Saved locally';
        textMobile = 'Saved locally';
    }
    var htmlMobile = '<span class="sync-dot ' + dotClass + '"></span>' + textMobile;
    var htmlDesktop = '<span class="sync-dot ' + dotClass + '"></span>' + text;
    var elMobile = document.getElementById('syncBannerMobile');
    var elDesktop = document.getElementById('syncBannerDesktop');
    if (elMobile) elMobile.innerHTML = htmlMobile;
    if (elDesktop) elDesktop.innerHTML = htmlDesktop;
}

var _syncInProgress = false;
var _syncLastFailed = false;
var _syncConflict = false;
var _syncPendingCount = 0;

function formatRelativeTime(isoStr) {
    if (!isoStr) return '';
    var now = new Date();
    var then = new Date(isoStr);
    var diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
    if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
    return Math.floor(diffSec / 86400) + 'd ago';
}

function emptyStateHTML(icon, title, desc, btnLabel, btnOnclick) {
    var html = '<div class="empty-state">';
    if (icon) html += '<div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + icon + '</svg></div>';
    if (title) html += '<div class="empty-state-title">' + title + '</div>';
    if (desc) html += '<div class="empty-state-desc">' + desc + '</div>';
    if (btnLabel && btnOnclick) html += '<button class="empty-state-btn" onclick="' + btnOnclick + '">' + btnLabel + '</button>';
    html += '</div>';
    return html;
}

// ===== Modal System (replaces browser alert/confirm/prompt) =====
var _modalResolve = null;
var _focusTrigger = null;

function saveFocusTrigger() {
    _focusTrigger = document.activeElement;
}

function restoreFocusTrigger() {
    if (_focusTrigger && typeof _focusTrigger.focus === 'function') {
        try { _focusTrigger.focus(); } catch(e) {}
    }
    _focusTrigger = null;
}

function trapFocus(container) {
    var focusable = container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    container.addEventListener('keydown', function(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
}

function showAppConfirm(message, confirmLabel) {
    var overlay = document.getElementById('appModalOverlay');
    var msg = document.getElementById('appModalMessage');
    var cancelBtn = document.getElementById('appModalCancel');
    var confirmBtn = document.getElementById('appModalConfirm');
    saveFocusTrigger();
    msg.innerText = message;
    confirmBtn.innerText = confirmLabel || 'OK';
    confirmBtn.className = 'text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors';
    overlay.classList.remove('hidden');
    setTimeout(function() { confirmBtn.focus(); }, 50);
    return new Promise(function(resolve) {
        _modalResolve = resolve;
        confirmBtn.onclick = function() {
            overlay.classList.add('hidden');
            _modalResolve = null;
            restoreFocusTrigger();
            resolve(true);
        };
        cancelBtn.onclick = function() {
            overlay.classList.add('hidden');
            _modalResolve = null;
            restoreFocusTrigger();
            resolve(false);
        };
    });
}

function showAppAlert(message) {
    var overlay = document.getElementById('appModalOverlay');
    var msg = document.getElementById('appModalMessage');
    var cancelBtn = document.getElementById('appModalCancel');
    var confirmBtn = document.getElementById('appModalConfirm');
    saveFocusTrigger();
    msg.innerText = message;
    cancelBtn.classList.add('hidden');
    confirmBtn.innerText = 'OK';
    confirmBtn.className = 'text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors';
    overlay.classList.remove('hidden');
    setTimeout(function() { confirmBtn.focus(); }, 50);
    return new Promise(function(resolve) {
        confirmBtn.onclick = function() {
            overlay.classList.add('hidden');
            cancelBtn.classList.remove('hidden');
            restoreFocusTrigger();
            resolve();
        };
    });
}

function closeAppModal() {
    document.getElementById('appModalOverlay').classList.add('hidden');
    var cancelBtn = document.getElementById('appModalCancel');
    cancelBtn.classList.remove('hidden');
    if (_modalResolve) { _modalResolve(false); _modalResolve = null; }
    restoreFocusTrigger();
}

function showAppPrompt(message, info, defaultValue) {
    var overlay = document.getElementById('appPromptOverlay');
    var msg = document.getElementById('appPromptMessage');
    var infoEl = document.getElementById('appPromptInfo');
    var input = document.getElementById('appPromptInput');
    var confirmBtn = document.getElementById('appPromptConfirm');
    saveFocusTrigger();
    msg.innerText = message;
    infoEl.innerText = info || '';
    input.value = defaultValue || '';
    overlay.classList.remove('hidden');
    setTimeout(function() { input.focus(); input.select(); }, 100);
    return new Promise(function(resolve) {
        _modalResolve = resolve;
        confirmBtn.onclick = function() {
            var val = input.value.trim();
            overlay.classList.add('hidden');
            _modalResolve = null;
            restoreFocusTrigger();
            resolve(val);
        };
        input.onkeydown = function(e) {
            if (e.key === 'Enter') confirmBtn.click();
            if (e.key === 'Escape') { overlay.classList.add('hidden'); _modalResolve = null; restoreFocusTrigger(); resolve(null); }
        };
    });
}

function closeAppPrompt() {
    document.getElementById('appPromptOverlay').classList.add('hidden');
    if (_modalResolve) { _modalResolve(null); _modalResolve = null; }
    restoreFocusTrigger();
}

// Application Init Hooks
window.addEventListener('DOMContentLoaded', () => {
    try {
        document.getElementById('versionDisplay').innerText = 'v' + APP_VERSION;
        initializeLocalSecuritySchema();
        restoreStateFromLocalStorage();
        ensureInventoryBarcodeIds();
        initializeDefaultTiersIfEmpty();
        applyLanguageToDOM();
        syncUIComponents();
        updateSyncStatusBadge();
        ensureSyncDebugOverlay();
        switchTab('tab-spatial');
        clearActiveNode();
        installIOSZoomFix();
        startupLoadFromCloud();
        installFormDirtyListener();
        installFocusTraps();
        installMapDragListeners();
        updateLoginSyncStatus();
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            applySafeAreaPadding();
          });
        });
    } catch (e) {
        alert('Init error: ' + e.message + ' (line ' + e.lineNumber + ')');
        console.error(e);
    }
});

window.addEventListener('beforeunload', function(e) {
    var hasPendingSync = appState.syncQueue && appState.syncQueue.length > 0;
    if (_formDirty || hasPendingSync) {
        e.preventDefault();
        e.returnValue = '';
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;

    var promptOverlay = document.getElementById('appPromptOverlay');
    if (promptOverlay && !promptOverlay.classList.contains('hidden')) {
        closeAppPrompt();
        return;
    }

    var modalOverlay = document.getElementById('appModalOverlay');
    if (modalOverlay && !modalOverlay.classList.contains('hidden')) {
        closeAppModal();
        return;
    }

    var cloudModal = document.getElementById('cloudSettingsModal');
    if (cloudModal && !cloudModal.classList.contains('hidden')) {
        cloudModal.classList.add('hidden');
        restoreFocusTrigger();
        return;
    }

    closeItemDetail();
});

function installIOSZoomFix() {
    var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    if (!isIOS) return;
    var metaViewport = document.querySelector('meta[name="viewport"]');
    if (!metaViewport) return;
    document.addEventListener('focusout', function(event) {
        if (event.target.matches('input, textarea, select')) {
            setTimeout(function() {
                metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() {
                        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover');
                    });
                });
            }, 50);
        }
    });
}

/* ==========================================================================
   Section 1: Authentication & Protection Layer
   ========================================================================== */
function initializeLocalSecuritySchema() {
    if (!localStorage.getItem('sys_page_pwd')) {
        localStorage.setItem('sys_page_pwd', '1234');
    }
    if (!localStorage.getItem('sys_api_pwd')) {
        localStorage.setItem('sys_api_pwd', 'secretToken123');
    }

    document.getElementById('settingSystemPassword').value = localStorage.getItem('sys_page_pwd');
    document.getElementById('settingApiSecretToken').value = localStorage.getItem('sys_api_pwd');
    if(localStorage.getItem('sys_gas_url')) {
        document.getElementById('settingGoogleAppsScriptUrl').value = localStorage.getItem('sys_gas_url');
    }
    if(localStorage.getItem('sys_ds_api_key')) {
        document.getElementById('settingDeepSeekApiKey').value = localStorage.getItem('sys_ds_api_key');
    }

    const overlay = document.getElementById('passwordOverlay');
    overlay.style.display = 'flex';
}

function validateSystemAccess() {
    try {
        const input = document.getElementById('pagePasswordInput').value.trim();
        const activePhrase = localStorage.getItem('sys_page_pwd');

        if (input === 'RESET' || input === activePhrase) {
            const overlay = document.getElementById('passwordOverlay');
            overlay.style.display = 'none';
            updateLoginSyncStatus();
        } else {
            const errElement = document.getElementById('passwordError');
            errElement.classList.remove('hidden');
        }
    } catch (e) {
        showToast('Login error: ' + e.message, 'error');
    }
}

function getSyncStateSnapshot() {
    var pending = (appState.syncQueue && appState.syncQueue.length) || 0;
    if (_syncInProgress) return { state: 'syncing', pending: pending };
    if (_syncLastFailed) return { state: 'failed', pending: pending };
    if (_syncConflict) return { state: 'conflict', pending: pending };
    if (pending > 0) return { state: 'pending', pending: pending };
    if (appState.meta.lastSyncedAt) return { state: 'synced', syncedAt: appState.meta.lastSyncedAt };
    return { state: 'local', pending: 0 };
}

function updateLoginSyncStatus() {
    var card = document.getElementById('loginSyncStatusCard');
    var text = document.getElementById('loginSyncStatusText');
    if (!card || !text) return;

    var snap = getSyncStateSnapshot();
    var msg = '';
    card.className = 'bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3 text-center';

    switch (snap.state) {
        case 'syncing':
            card.className = 'bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3 text-center';
            msg = 'Syncing\u2026';
            break;
        case 'failed':
            card.className = 'bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-center';
            msg = 'Sync failed';
            break;
        case 'conflict':
            card.className = 'bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-center cursor-pointer';
            msg = 'Conflict \u2014 tap Sync to resolve';
            card.onclick = function() { syncNow(); };
            break;
        case 'pending':
            card.className = 'bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-center';
            msg = 'Pending sync (' + snap.pending + ')';
            break;
        case 'synced':
            card.className = 'bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3 text-center';
            msg = 'Synced ' + formatRelativeTime(snap.syncedAt);
            break;
        default:
            msg = 'Saved locally';
            break;
    }
    text.innerText = msg;
}

function updateSyncCallToActionState() {
    var pending = (appState.syncQueue && appState.syncQueue.length) || 0;

    var btn = document.getElementById('btnHeaderSyncNow');
    if (btn) {
        btn.classList.remove('sync-cta-pending', 'sync-cta-syncing');
        if (_syncInProgress) {
            btn.classList.add('sync-cta-syncing');
        } else if (pending > 0) {
            btn.classList.add('sync-cta-pending');
        }
    }

    var mobile = document.getElementById('syncBannerMobile');
    if (mobile) {
        mobile.classList.remove('sync-cta-mobile-pending', 'sync-cta-mobile-syncing');
        if (_syncInProgress) {
            mobile.classList.add('sync-cta-mobile-syncing');
        } else if (pending > 0) {
            mobile.classList.add('sync-cta-mobile-pending');
        }
    }
}

/* ==========================================================================
   Section 2: Layout / UI / Tab Router Engineering
   ========================================================================== */
function switchTab(targetTabId) {
    // Stop barcode scanner when leaving scan tab
    if (targetTabId !== 'tab-scan' && _html5QrScanner) {
        stopBarcodeScan();
    }

    // If cloud tab, open as settings modal instead
    if (targetTabId === 'tab-cloud') {
        openCloudSettings();
        return;
    }

    document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.add('hidden-panel');
        p.classList.remove('active-panel');
    });

    const currentView = document.getElementById(targetTabId);
    if(currentView) {
        currentView.classList.remove('hidden-panel');
        currentView.classList.add('active-panel');
    }

    document.querySelectorAll('.tab-nav').forEach(btn => btn.classList.remove('tab-active'));
    document.querySelectorAll('[id^="btn-mobile-"]').forEach(btn => btn.classList.remove('tab-active-mobile'));

    const desktopBtn = document.getElementById(`btn-desktop-${targetTabId.replace('tab-', '')}`);
    if (desktopBtn) desktopBtn.classList.add('tab-active');

    const mobileBtn = document.getElementById(`btn-mobile-${targetTabId.replace('tab-', '')}`);
    if (mobileBtn) mobileBtn.classList.add('tab-active-mobile');

    // Reset map view to show all nodes when entering the location tab
    if (targetTabId === 'tab-spatial') {
        clearActiveNode();
    }
    if (targetTabId === 'tab-tobuy') {
        renderToBuyList();
    }
}

function markFormDirty() {
    _formDirty = true;
}

function resetFormDirty() {
    _formDirty = false;
}

function toggleAiMetadata() {
    var content = document.getElementById('aiMetadataContent');
    var icon = document.getElementById('aiMetadataToggleIcon');
    if (!content || !icon) return;
    var collapsed = content.classList.toggle('collapsed');
    icon.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
    icon.textContent = collapsed ? '\u25B6' : '\u25BC';
}

function expandAiMetadata() {
    var content = document.getElementById('aiMetadataContent');
    var icon = document.getElementById('aiMetadataToggleIcon');
    if (!content) return;
    content.classList.remove('collapsed');
    if (icon) { icon.style.transform = 'rotate(0deg)'; icon.textContent = '\u25BC'; }
}

function collapseAiMetadata() {
    var content = document.getElementById('aiMetadataContent');
    var icon = document.getElementById('aiMetadataToggleIcon');
    if (!content) return;
    content.classList.add('collapsed');
    if (icon) { icon.style.transform = 'rotate(-90deg)'; icon.textContent = '\u25B6'; }
}

var _originalSwitchTab = switchTab;
switchTab = function(targetTabId) {
    if (_formDirty && targetTabId !== 'tab-register') {
        showAppConfirm('You have unsaved changes. Discard them?', 'Discard').then(function(ok) {
            if (ok) {
                resetFormDirty();
                _originalSwitchTab(targetTabId);
            }
        });
        return;
    }
    _originalSwitchTab(targetTabId);
};

function installFormDirtyListener() {
    var tab = document.getElementById('tab-register');
    if (!tab) return;
    tab.addEventListener('input', function(e) {
        var t = e.target;
        if (t.id && (
            t.id.indexOf('invItem') === 0 ||
            t.id.indexOf('invCat') === 0
        )) {
            markFormDirty();
        }
    });
    tab.addEventListener('change', function(e) {
        var t = e.target;
        if (t.id && (
            t.id.indexOf('invItem') === 0 ||
            t.id.indexOf('invCat') === 0
        )) {
            markFormDirty();
        }
    });
}

function installFocusTraps() {
    var appModal = document.getElementById('appModalOverlay');
    if (appModal) trapFocus(appModal);

    var promptModal = document.getElementById('appPromptOverlay');
    if (promptModal) trapFocus(promptModal);

    var cloudModal = document.getElementById('cloudSettingsModal');
    if (cloudModal) trapFocus(cloudModal);
}

function toggleOverflowMenu(e, btnEl) {
    if (e) e.stopPropagation();
    var menu = document.getElementById('overflowMenu');
    if (!menu) return;

    if (!menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        return;
    }

    // Sync mobile user dropdown
    var mobileUserSel = document.getElementById('headerUserSelectMobile');
    if (mobileUserSel) {
        mobileUserSel.innerHTML = (appState.users || ['Default']).map(function(u) {
            return '<option value="' + u + '"' + (u === appState.currentUser ? ' selected' : '') + '>' + u + '</option>';
        }).join('');
    }
    // Update language button label
    var langBtns = document.querySelectorAll('#overflowMenu button[onclick*="switchLanguage"]');
    for (var i = 0; i < langBtns.length; i++) {
        langBtns[i].textContent = appState.language === 'en' ? '中/EN' : 'EN/中';
    }

    var btn = btnEl || (e && e.currentTarget) || (e && e.target && e.target.closest('button'));
    if (btn) {
        var rect = btn.getBoundingClientRect();
        var isMobile = window.innerWidth < 768;
        if (isMobile) {
            menu.style.left = '8px';
            menu.style.right = '8px';
            menu.style.width = 'auto';
            menu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
            menu.style.top = 'auto';
            menu.style.borderRadius = '16px 16px 0 0';
            menu.style.maxHeight = (rect.top - 16) + 'px';
            menu.style.overflowY = 'auto';
        } else {
            var menuW = 208;
            var left = Math.min(rect.right - menuW, window.innerWidth - menuW - 8);
            left = Math.max(8, left);
            menu.style.left = left + 'px';
            menu.style.right = 'auto';
            menu.style.width = menuW + 'px';
            menu.style.bottom = 'auto';
            menu.style.top = (rect.bottom + 4) + 'px';
            menu.style.borderRadius = '12px';
            menu.style.maxHeight = 'none';
            menu.style.overflowY = 'visible';
        }
    }

    menu.classList.remove('hidden');
}

function openCloudSettings() {
    saveFocusTrigger();
    document.getElementById('cloudSettingsModal').classList.remove('hidden');
    setTimeout(function() {
        var closeBtn = document.querySelector('#cloudSettingsModal button');
        if (closeBtn) closeBtn.focus();
    }, 50);
}

function closeCloudSettings(e) {
    if (e && e.target !== document.getElementById('cloudSettingsModal')) return;
    document.getElementById('cloudSettingsModal').classList.add('hidden');
    restoreFocusTrigger();
}

// Close overflow menu when clicking outside
document.addEventListener('click', function(e) {
    var menu = document.getElementById('overflowMenu');
    if (menu && !menu.classList.contains('hidden')) {
        var isMenuClick = menu.contains(e.target);
        var isTriggerClick = e.target.closest('[onclick*="toggleOverflowMenu"]');
        if (!isMenuClick && !isTriggerClick) {
            menu.classList.add('hidden');
        }
    }
});

function filterBy(field, value) {
    switchTab('tab-inventory');
    document.getElementById('filterSearchQuery').value = '';
    document.getElementById('filterSegmentSelect').value = '';
    document.getElementById('filterContainerSelect').value = '';
    document.getElementById('filterCategorySelect').value = '';
    document.getElementById('filterOwnerSelect').value = '';
    if (field === 'segment') {
        document.getElementById('filterSegmentSelect').value = value;
        syncFilterContainersDropdown();
    }
    if (field === 'category') document.getElementById('filterCategorySelect').value = value;
    if (field === 'owner') document.getElementById('filterOwnerSelect').value = value;
    renderFilteredInventoryTable();
    window.scrollTo({ top: document.getElementById('filterSearchQuery').offsetTop - 80, behavior: 'smooth' });
}

function showItemDetail(itemId) {
    var item = appState.inventory.find(function(i) { return i.id === itemId && !i.deletedAt; });
    if (!item) return;
    document.getElementById('detailItemName').innerText = item.name;
    var brandEl = document.getElementById('detailItemBrand');
    if (item.brand) {
        brandEl.innerText = item.brand;
        brandEl.classList.remove('hidden');
    } else {
        brandEl.classList.add('hidden');
    }
    document.getElementById('detailItemCategory').innerText = item.category;
    if (item.itemType === 'stock') {
        document.getElementById('detailItemLocation').innerText = getStockLocationSummary(item);
    } else {
        document.getElementById('detailItemLocation').innerText = (item.segment || '') + ' > ' + (item.container || '') + (item.subContainer ? ' > ' + item.subContainer : '');
    }
    document.getElementById('detailItemOwner').innerText = item.owner || 'Default';
    document.getElementById('detailItemExpiry').innerText = item.expiryDate || '\u2014';
    if (item.itemType === 'stock') {
        var totalQty = getTotalStockQuantity(item);
        var isLow = isStockItemLow(item);
        var isOut = isStockItemOutOfStock(item);
        var statusBadge = '';
        if (isOut) statusBadge = '<span class="text-[10px] bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5 ml-2 font-bold">OUT</span>';
        else if (isLow) statusBadge = '<span class="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 ml-2 font-bold">LOW</span>';
        var stockSection = document.getElementById('detailItemStockSection');
        stockSection.classList.remove('hidden');
        document.getElementById('detailItemStockTotal').innerHTML = totalQty + ' ' + (item.uom || 'pcs') + ' / min ' + (item.minQuantity || 0) + statusBadge;
        var breakdown = document.getElementById('detailItemStockBreakdown');
        var entries = getActiveStockEntries(item);
        breakdown.innerHTML = entries.map(function(e, idx) {
            var locLabel = getStockLocationLabel(e);
            var expStr = e.expiryDate ? '<span class="text-[10px] text-red-500 ml-1">Exp: ' + e.expiryDate + '</span>' : '';
            var rowId = 'detail-loc-' + idx;
            return '<div class="flex items-center justify-between text-xs py-1 px-2 bg-slate-50 rounded border border-slate-100">' +
                '<span class="text-slate-600 truncate flex-1">' + locLabel + expStr + '</span>' +
                '<span class="font-bold text-slate-800 mx-2">' + (e.quantity || 0) + '</span>' +
                '<button onclick="continueStockEntryIn(\'' + item.id + '\', \'' + e.id + '\')" class="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded px-2 py-0.5 font-medium">IN</button>' +
                '<button onclick="continueStockEntryOut(\'' + item.id + '\', \'' + e.id + '\')" class="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded px-2 py-0.5 font-medium ml-1">OUT</button>' +
                '</div>';
        }).join('');
    } else {
        document.getElementById('detailItemStockSection').classList.add('hidden');
    }
    document.getElementById('detailItemTime').innerText = item.timestamp;
    document.getElementById('detailItemRemarks').innerText = item.remarks || 'None';
    document.getElementById('detailItemBarcodeId').innerText = item.barcodeId || '\u2014';
    document.getElementById('detailItemId').innerText = item.id;
    var aiRow = document.getElementById('detailItemAiMetadataRow');
    var aiEl = document.getElementById('detailItemAiMetadata');
    if (item.aiMetadata) {
        aiEl.innerText = item.aiMetadata;
        aiRow.classList.remove('hidden');
    } else {
        aiRow.classList.add('hidden');
    }
    var img = document.getElementById('detailItemImage');
    var detailSrc = getRenderableImageSrc(item, false);
    if (detailSrc && detailSrc !== 'https://placehold.co/100?text=No+Photo') {
        img.src = detailSrc;
        img.classList.remove('hidden');
    } else {
        img.classList.add('hidden');
    }
    document.getElementById('itemDetailModal').classList.remove('hidden');
    _currentBarcodeValue = item.barcodeId;
    _currentBarcodeName = item.name;
    _currentScanItemId = item.id;

    var isStock = item.itemType === 'stock';
    document.getElementById('btnDetailDrop').classList.remove('hidden');
    document.getElementById('btnDetailDrop').classList.add('flex');
    document.getElementById('btnDetailOut').classList.toggle('hidden', !isStock);
    document.getElementById('btnDetailOut').classList.toggle('flex', isStock);
    document.getElementById('btnDetailIn').classList.toggle('hidden', !isStock);
    document.getElementById('btnDetailIn').classList.toggle('flex', isStock);

    var barcodeText = _currentBarcodeValue;
    setTimeout(function() {
        try {
            JsBarcode('#detailItemBarcode', barcodeText, {
                format: 'CODE39',
                width: 5,
                height: 110,
                displayValue: true,
                margin: 20,
                background: '#ffffff',
                lineColor: '#1e293b',
                font: 'monospace',
                fontSize: 18,
                textMargin: 6
            });
            document.getElementById('detailItemBarcodeLabel').innerText = item.name;
        } catch(e) {
            document.getElementById('detailItemBarcode').style.display = 'none';
            document.getElementById('detailItemBarcodeLabel').innerText = '';
        }
    }, 50);
}

var _currentBarcodeValue = null;
var _currentBarcodeName = null;

var _html5QrScanner = null;

function startBarcodeScan() {
    var container = document.getElementById('scanReaderContainer');
    var btnStart = document.getElementById('btnStartScan');
    var btnStop = document.getElementById('btnStopScan');

    if (typeof Html5Qrcode === 'undefined') {
        showToast(t('scanCameraError'), 'error');
        return;
    }

    try {
        container.classList.remove('hidden');
        btnStart.classList.add('hidden');
        btnStop.classList.remove('hidden');

        _html5QrScanner = new Html5Qrcode('scanReaderContainer');
        setTimeout(function() {
            _html5QrScanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
                },
                function onScanSuccess(decodedText) {
                    stopBarcodeScan();
                    var input = document.getElementById('scanManualIdInput');
                    input.value = decodedText.trim();
                    input.focus();
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                },
                function onScanError() {}
            ).catch(function(err) {
                container.classList.add('hidden');
                btnStart.classList.remove('hidden');
                btnStop.classList.add('hidden');
                showToast(t('scanCameraError'), 'error');
            });
        }, 100);
    } catch(e) {
        container.classList.add('hidden');
        btnStart.classList.remove('hidden');
        btnStop.classList.add('hidden');
        showToast(t('scanCameraError'), 'error');
    }
}

function stopBarcodeScan() {
    if (_html5QrScanner) {
        try {
            _html5QrScanner.stop().then(function() {
                _html5QrScanner.clear();
            }).catch(function() {});
        } catch(e) {}
        _html5QrScanner = null;
    }
    var container = document.getElementById('scanReaderContainer');
    var btnStart = document.getElementById('btnStartScan');
    var btnStop = document.getElementById('btnStopScan');
    container.classList.add('hidden');
    btnStart.classList.remove('hidden');
    btnStop.classList.add('hidden');
}

function lookupItemByManualId() {
    var input = document.getElementById('scanManualIdInput');
    var id = input.value.trim();
    if (!id) return;
    displayScanResult(id);
}

var _stockScanCallback = null;

function scanExistingStockBarcode() {
    if (typeof Html5Qrcode === 'undefined') {
        showToast(t('scanCameraError'), 'error');
        return;
    }

    var overlay = document.getElementById('stockScanOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'stockScanOverlay';
        overlay.className = 'fixed inset-0 bg-black/80 z-[9996] flex flex-col items-center justify-center p-4';
        overlay.innerHTML = '<div id="stockScanReader" class="w-full max-w-sm rounded-xl overflow-hidden bg-slate-900"></div>'
            + '<button id="btnCancelStockScan" class="mt-3 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-5 py-2 rounded-lg border border-white/20 transition-colors">Cancel</button>';
        document.body.appendChild(overlay);
        document.getElementById('btnCancelStockScan').addEventListener('click', cancelStockBarcodeScan);
    }
    overlay.classList.remove('hidden');

    try {
        _html5QrScanner = new Html5Qrcode('stockScanReader');
        setTimeout(function() {
            _html5QrScanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    aspectRatio: 1.777,
                    disableFlip: false
                },
                function onScanSuccess(decodedText) {
                    cancelStockBarcodeScan();
                    var id = decodedText.trim();
                    var item = getItemLookupMatch(id);
                    if (item) {
                        setupItemModificationContext(item.id);
                        showToast('Found: ' + item.name, 'success');
                    } else {
                        showToast('No item found with this barcode', 'error');
                    }
                },
                function onScanError() {}
            ).catch(function() {
                cancelStockBarcodeScan();
                showToast(t('scanCameraError'), 'error');
            });
        }, 100);
    } catch(e) {
        cancelStockBarcodeScan();
        showToast(t('scanCameraError'), 'error');
    }
}

function cancelStockBarcodeScan() {
    if (_html5QrScanner) {
        try { _html5QrScanner.stop().then(function() { _html5QrScanner.clear(); }).catch(function() {                });
                normalizeAllItemImageFields();
            } catch(e) {}
        _html5QrScanner = null;
    }
    var overlay = document.getElementById('stockScanOverlay');
    if (overlay) overlay.classList.add('hidden');
}

var _currentScanItemId = null;
var _recentScans = [];

function scanEditItem() {
    if (!_currentScanItemId) return;
    closeItemDetail();
    setupItemModificationContext(_currentScanItemId);
    switchTab('tab-register');
}

function addToRecentScans(item) {
    _recentScans = _recentScans.filter(function(r) { return r.id !== item.id; });
    var seg = item.segment || '';
    var con = item.container || '';
    var sub = item.subContainer || '';
    if (item.itemType === 'stock' && getActiveStockEntries(item).length > 0) {
        var first = getActiveStockEntries(item)[0];
        seg = first.segment || '';
        con = first.container || '';
        sub = first.subContainer || '';
    }
    _recentScans.unshift({ id: item.id, name: item.name, segment: seg, container: con, subContainer: sub, time: new Date().toISOString() });
    if (_recentScans.length > 5) _recentScans = _recentScans.slice(0, 5);
}

function renderRecentScans() {
    var card = document.getElementById('recentScansCard');
    var list = document.getElementById('recentScansList');
    if (!card || !list) return;
    if (_recentScans.length === 0) { card.classList.add('hidden'); return; }
    card.classList.remove('hidden');
    list.innerHTML = _recentScans.map(function(r) {
        var loc = [r.segment, r.container];
        if (r.subContainer) loc.push(r.subContainer);
        var shortName = r.name.length > 30 ? r.name.substring(0, 28) + '\u2026' : r.name;
        return '<div class="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors" onclick="displayScanResult(\'' + r.id + '\')">'
            + '<div class="flex-1 min-w-0"><div class="text-xs font-semibold text-slate-800 truncate">' + shortName + '</div><div class="text-[10px] text-slate-400"><span class="font-mono">' + r.id + '</span> \u00B7 ' + loc.join(' / ') + '</div></div>'
            + '<div class="text-[10px] text-slate-400 flex-shrink-0">' + formatRelativeTime(r.time) + '</div></div>';
    }).join('');
}

function removeFromRecentScans(itemId) {
    _recentScans = _recentScans.filter(function(r) { return r.id !== itemId; });
}

function displayScanResult(id) {
    document.getElementById('scanManualIdInput').value = id;
    document.getElementById('scanNotFoundCard').classList.add('hidden');
    document.getElementById('scanResultCard').classList.add('hidden');

    var item = getItemLookupMatch(id);
    if (!item) {
        document.getElementById('scanNotFoundCard').classList.remove('hidden');
        removeFromRecentScans(id);
        renderRecentScans();
        return;
    }

    addToRecentScans(item);
    renderRecentScans();

    _currentScanItemId = item.id;
    var isStock = item.itemType === 'stock';

    document.getElementById('scanResultName').innerText = item.name + (item.brand ? '  \u2014  ' + item.brand : '');
    document.getElementById('scanResultCategory').innerText = item.category;
    document.getElementById('scanResultOwner').innerText = item.owner || 'Default';
    document.getElementById('scanResultRemarks').innerText = item.remarks || 'None';

    var lowBadge = document.getElementById('scanResultLowStockBadge');
    if (isStock && isStockItemLow(item)) {
        lowBadge.classList.remove('hidden');
    } else {
        lowBadge.classList.add('hidden');
    }

    var stockInfo = document.getElementById('scanResultStockInfo');
    if (isStock) {
        stockInfo.classList.remove('hidden');
        var totalQty = getTotalStockQuantity(item);
        document.getElementById('scanResultStockTotal').innerText = '' + totalQty + ' ' + (item.uom || 'pcs') + ' / min ' + (item.minQuantity || 0);
        var breakdown = document.getElementById('scanResultStockBreakdown');
        var entries = getActiveStockEntries(item);
        breakdown.innerHTML = entries.map(function(e, idx) {
            var locLabel = getStockLocationLabel(e);
            var expStr = e.expiryDate ? '<span class="text-[10px] text-red-500 ml-1">Exp: ' + e.expiryDate + '</span>' : '';
            return '<div class="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-50 rounded border border-slate-100">' +
                '<span class="text-slate-600 truncate flex-1">' + locLabel + expStr + '</span>' +
                '<span class="font-bold text-slate-800 mx-2">' + (e.quantity || 0) + '</span>' +
                '<button onclick="event.stopPropagation(); continueStockEntryIn(\'' + item.id + '\', \'' + e.id + '\')" class="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded px-2 py-0.5 font-medium">IN</button>' +
                '<button onclick="event.stopPropagation(); continueStockEntryOut(\'' + item.id + '\', \'' + e.id + '\')" class="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded px-2 py-0.5 font-medium ml-1">OUT</button>' +
                '</div>';
        }).join('');
    } else {
        stockInfo.classList.add('hidden');
    }

    document.getElementById('btnScanDrop').classList.remove('hidden');
    document.getElementById('btnScanDrop').classList.add('flex');
    document.getElementById('btnScanOut').classList.toggle('hidden', !isStock);
    document.getElementById('btnScanOut').classList.toggle('flex', isStock);
    document.getElementById('btnScanIn').classList.toggle('hidden', !isStock);
    document.getElementById('btnScanIn').classList.toggle('flex', isStock);

    var img = document.getElementById('scanResultImage');
    var scanSrc = getRenderableImageSrc(item, true);
    if (scanSrc && scanSrc !== 'https://placehold.co/100?text=No+Photo' && !scanSrc.match(/^\[TRUNCATED\]/)) {
        img.src = scanSrc;
        img.classList.remove('hidden');
    } else {
        img.classList.add('hidden');
    }

    document.getElementById('scanResultCard').classList.remove('hidden');
    document.getElementById('scanResultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function scanDropItem() {
    if (!_currentScanItemId) return;
    var item = appState.inventory.find(function(i) { return i.id === _currentScanItemId && !i.deletedAt; });
    if (!item) return;
    var ok = await showAppConfirm('Drop "' + item.name + '"? This cannot be undone.', 'Drop');
    if (!ok) return;
    removeItemFromInventory(_currentScanItemId);
    removeFromRecentScans(_currentScanItemId);
    renderRecentScans();
    closeItemDetail();
    document.getElementById('scanResultCard').classList.add('hidden');
    document.getElementById('scanNotFoundCard').classList.remove('hidden');
    document.getElementById('scanNotFoundReason').innerText = '"' + item.name + '" removed.';
    syncUIComponents();
}

var _slPickerItemId = null;
var _slPickerMode = null;
var _nslItemId = null;

function openStockLocationActionPicker(itemId, mode) {
    var item = appState.inventory.find(function(i) { return i.id === itemId && !i.deletedAt; });
    if (!item || item.itemType !== 'stock') return;
    var entries = getActiveStockEntries(item);
    _slPickerItemId = itemId;
    _slPickerMode = mode;

    if (mode === 'OUT' && entries.filter(function(e) { return (e.quantity || 0) > 0; }).length === 0) {
        showToast('No locations with stock to remove.', 'error');
        return;
    }

    var title = mode === 'IN' ? 'Add Stock — Choose Location' : 'Remove Stock — Choose Location';
    document.getElementById('slPickerTitle').innerText = title;
    var listEl = document.getElementById('slPickerList');
    listEl.innerHTML = entries.map(function(e) {
        var locLabel = getStockLocationLabel(e);
        var css = 'cursor-pointer hover:bg-blue-50 border rounded-lg p-2.5 transition-colors flex justify-between items-center';
        var onclick = mode === 'IN'
            ? "closeStockLocationPicker(); continueStockEntryIn('" + itemId + "', '" + e.id + "')"
            : "closeStockLocationPicker(); continueStockEntryOut('" + itemId + "', '" + e.id + "')";
        return '<div class="' + css + '" onclick="' + onclick + '">' +
            '<div><div class="text-xs font-semibold text-slate-800">' + locLabel + '</div>' +
            (e.expiryDate ? '<div class="text-[10px] text-red-500">Exp: ' + e.expiryDate + '</div>' : '') +
            '</div>' +
            '<span class="text-sm font-bold text-blue-600">' + (e.quantity || 0) + '</span>' +
            '</div>';
    }).join('');

    var addBtn = document.getElementById('slPickerAddNewBtn');
    if (mode === 'IN') {
        addBtn.classList.remove('hidden');
        addBtn.classList.add('flex');
    } else {
        addBtn.classList.add('hidden');
        addBtn.classList.remove('flex');
    }

    document.getElementById('stockLocationPickerOverlay').classList.remove('hidden');
}

function closeStockLocationPicker() {
    document.getElementById('stockLocationPickerOverlay').classList.add('hidden');
}

async function scanStockOut() {
    if (!_currentScanItemId) return;
    var item = appState.inventory.find(function(i) { return i.id === _currentScanItemId && !i.deletedAt; });
    if (!item || item.itemType !== 'stock') return;
    var entries = getActiveStockEntries(item);
    var valid = entries.filter(function(e) { return (e.quantity || 0) > 0; });
    if (valid.length === 0) {
        showToast('No locations with stock to remove.', 'error');
        return;
    }
    if (valid.length === 1) {
        continueStockEntryOut(item.id, valid[0].id);
    } else {
        openStockLocationActionPicker(item.id, 'OUT');
    }
}

async function scanStockIn() {
    if (!_currentScanItemId) return;
    var item = appState.inventory.find(function(i) { return i.id === _currentScanItemId && !i.deletedAt; });
    if (!item || item.itemType !== 'stock') return;
    openStockLocationActionPicker(item.id, 'IN');
}

async function continueStockEntryIn(itemId, entryId) {
    var item = appState.inventory.find(function(i) { return i.id === itemId; });
    if (!item) return;
    var entry = getStockEntries(item).find(function(e) { return e.id === entryId; });
    if (!entry) return;
    var amount = await showAppPrompt('Add stock to ' + getStockLocationLabel(entry) + '?', 'Current: ' + (entry.quantity || 0) + ' ' + (item.uom || 'pcs'), '');
    if (!amount) return;
    var amt = parseInt(amount);
    if (isNaN(amt) || amt <= 0) { showToast('Please enter a positive number.', 'error'); return; }
    entry.quantity = (entry.quantity || 0) + amt;
    item.quantity = getTotalStockQuantity(item);
    item.updatedAt = new Date().toISOString();
    item.version = (item.version || 1) + 1;
    item.lastModifiedBy = appState.meta.deviceId;
    mutateState('STOCK_IN', { itemId: item.id, amount: amt, entryId: entryId });
    syncUIComponents();
    if (_currentScanItemId === itemId) {
        showItemDetail(itemId);
        displayScanResult(itemId);
    } else {
        showItemDetail(itemId);
    }
    showToast('Added ' + amt + ' ' + (item.uom || 'pcs'), 'success');
    setTimeout(function() { triggerReminderCheckThrottled(); }, 1500);
}

async function continueStockEntryOut(itemId, entryId) {
    var item = appState.inventory.find(function(i) { return i.id === itemId; });
    if (!item) return;
    var entry = getStockEntries(item).find(function(e) { return e.id === entryId; });
    if (!entry) return;
    if ((entry.quantity || 0) <= 0) { showToast('No stock to remove from this location.', 'error'); return; }
    var amount = await showAppPrompt('Remove from ' + getStockLocationLabel(entry) + '?', 'Current: ' + (entry.quantity || 0) + ' ' + (item.uom || 'pcs'), '');
    if (!amount) return;
    var amt = parseInt(amount);
    if (isNaN(amt) || amt <= 0) { showToast('Please enter a positive number.', 'error'); return; }
    if (amt > (entry.quantity || 0)) { showToast('Cannot remove more than current (' + (entry.quantity || 0) + ').', 'error'); return; }
    entry.quantity = (entry.quantity || 0) - amt;
    item.quantity = getTotalStockQuantity(item);
    item.updatedAt = new Date().toISOString();
    item.version = (item.version || 1) + 1;
    item.lastModifiedBy = appState.meta.deviceId;
    mutateState('STOCK_OUT', { itemId: item.id, amount: amt, entryId: entryId });
    syncUIComponents();
    if (_currentScanItemId === itemId) {
        showItemDetail(itemId);
        displayScanResult(itemId);
    } else {
        showItemDetail(itemId);
    }
    showToast('Removed ' + amt + ' ' + (item.uom || 'pcs'), 'success');
    setTimeout(function() { triggerReminderCheckThrottled(); }, 1500);
}

function openNewStockLocationModal(itemId) {
    _nslItemId = itemId;
    var segSel = document.getElementById('nslSegment');
    segSel.innerHTML = '<option value="">-- Choose Segment --</option>';
    Object.keys(appState.segments).forEach(function(s) {
        var opt = document.createElement('option');
        opt.value = s; opt.innerText = s; segSel.appendChild(opt);
    });
    document.getElementById('nslContainer').innerHTML = '<option value="">-- Choose Container --</option>';
    document.getElementById('nslSubContainer').innerHTML = '<option value="">-- Choose Sub-Container --</option>';
    document.getElementById('nslQty').value = 1;
    document.getElementById('nslExpiry').value = '';
    document.getElementById('nslPurchase').value = '';
    document.getElementById('nslWarranty').value = '';
    document.getElementById('newStockLocationOverlay').classList.remove('hidden');
    closeStockLocationPicker();
}

function closeNewStockLocationModal() {
    document.getElementById('newStockLocationOverlay').classList.add('hidden');
}

function syncNewStockLocationContainer() {
    var seg = document.getElementById('nslSegment').value;
    var conSel = document.getElementById('nslContainer');
    conSel.innerHTML = '<option value="">-- Choose Container --</option>';
    if (seg && appState.segments[seg]) {
        Object.keys(appState.segments[seg]).forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c; opt.innerText = c; conSel.appendChild(opt);
        });
    }
    syncNewStockLocationSub();
}

function syncNewStockLocationSub() {
    var seg = document.getElementById('nslSegment').value;
    var con = document.getElementById('nslContainer').value;
    var subSel = document.getElementById('nslSubContainer');
    subSel.innerHTML = '<option value="">-- Choose Sub-Container --</option>';
    if (seg && con && appState.segments[seg] && appState.segments[seg][con]) {
        (appState.segments[seg][con] || []).forEach(function(s) {
            var opt = document.createElement('option');
            opt.value = s; opt.innerText = s; subSel.appendChild(opt);
        });
    }
}

async function commitNewStockEntryFromModal(itemId) {
    var seg = document.getElementById('nslSegment').value;
    var con = document.getElementById('nslContainer').value;
    if (!seg || !con) { showToast('Segment and Container are required.', 'error'); return; }
    var item = appState.inventory.find(function(i) { return i.id === itemId; });
    if (!item) return;
    var qty = parseInt(document.getElementById('nslQty').value) || 0;
    if (qty <= 0) { showToast('Quantity must be > 0.', 'error'); return; }
    var entry = {
        id: generateStockEntryId(),
        segment: seg,
        container: con,
        subContainer: document.getElementById('nslSubContainer').value || '',
        quantity: qty,
        purchaseDate: document.getElementById('nslPurchase').value,
        warrantyDate: document.getElementById('nslWarranty').value,
        expiryDate: document.getElementById('nslExpiry').value,
        hiddenAt: null
    };
    if (!item.stockEntries) item.stockEntries = [];
    item.stockEntries.push(entry);
    item.quantity = getTotalStockQuantity(item);
    item.updatedAt = new Date().toISOString();
    item.version = (item.version || 1) + 1;
    item.lastModifiedBy = appState.meta.deviceId;
    mutateState('STOCK_IN', { itemId: item.id, amount: qty, entryId: entry.id });
    closeNewStockLocationModal();
    syncUIComponents();
    if (_currentScanItemId === itemId) {
        showItemDetail(itemId);
        displayScanResult(itemId);
    } else {
        showItemDetail(itemId);
    }
    showToast('Added ' + qty + ' ' + (item.uom || 'pcs') + ' to new location ' + getStockLocationLabel(entry), 'success');
    setTimeout(function() { triggerReminderCheckThrottled(); }, 1500);
}

function downloadBarcodeLabel() {
    if (!_currentBarcodeValue) return;
    var svg = document.getElementById('detailItemBarcode');
    if (!svg) return;

    var bbox = svg.getBBox();
    var svgW = Math.ceil(bbox.width);
    var svgH = Math.ceil(bbox.height);
    svg.setAttribute('width', svgW);
    svg.setAttribute('height', svgH);

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var svgData = new XMLSerializer().serializeToString(svg);
    var img = new Image();

    var scale = 2;
    var padH = 30;
    var padV = 12;
    var labelW = svgW + padH * 2;
    var labelH = svgH + padV * 2 + 48;

    img.onload = function() {
        canvas.width = labelW * scale;
        canvas.height = labelH * scale;
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, labelW, labelH);
        ctx.drawImage(img, padH, padV, svgW, svgH);
        ctx.fillStyle = '#1e293b';
        ctx.font = '20px "Inter", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(_currentBarcodeName || '', labelW / 2, svgH + padV + 28);
        ctx.font = '16px monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText(_currentBarcodeValue || '', labelW / 2, svgH + padV + 52);

        var url = canvas.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Label_' + (_currentBarcodeName || 'item').replace(/[^a-zA-Z0-9]/g, '_') + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

function copyBarcodeId() {
    var val = _currentBarcodeValue || '';
    if (!val) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(function() {
            showToast(t('barcodeCopied'), 'success');
        }).catch(function() {
            showToast(t('barcodeCopyFailed'), 'error');
        });
    } else {
        var textarea = document.createElement('textarea');
        textarea.value = val;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast(t('barcodeCopied'), 'success');
        } catch(e) {
            showToast(t('barcodeCopyFailed'), 'error');
        }
        document.body.removeChild(textarea);
    }
}

function closeItemDetail() {
    document.getElementById('itemDetailModal').classList.add('hidden');
}

/* ==========================================================================
   Section 2.5: User Management
   ========================================================================== */
function switchCurrentUser(username) {
    appState.currentUser = username;
    mutateState('SWITCH_USER', { username: username });
    syncUserInterface();
    renderFilteredInventoryTable();
}

function switchLanguage(lang) {
    appState.language = lang;
    mutateState('SWITCH_LANGUAGE', { language: lang });
    applyLanguageToDOM();
    syncUIComponents();
    var editId = document.getElementById('editTargetItemId').value;
    if (editId) {
        document.getElementById('inventoryFormTitle').innerText = t('modifyFormTitle');
    } else {
        document.getElementById('inventoryFormTitle').innerText = t('inventoryFormTitle');
    }
}

function applyLanguageToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        var key = el.getAttribute('data-i18n');
        var text = t(key);
        if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search' || el.type === 'url' || el.type === 'password')) {
            el.placeholder = text;
        } else {
            el.innerText = text;
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.getAttribute('data-i18n-title'));
    });
}

function addUser() {
    const input = document.getElementById('newUserName');
    const emailInput = document.getElementById('newUserEmail');
    const name = input.value.trim();
    if (!name) return;
    if (!appState.users.includes(name)) {
        appState.users.push(name);
        if (emailInput.value.trim()) {
            appState.userEmails[name] = emailInput.value.trim();
        }
        mutateState('ADD_USER', { username: name });
        syncUserInterface();
        input.value = '';
        emailInput.value = '';
    }
}

async function removeUser(username) {
    var ok = await showAppConfirm(t('confirmRemoveUser') + ' "' + username + '"?', 'Remove');
    if (!ok) return;
    if (username === 'Default') { showToast(t('cannotRemoveDefault'), 'error'); return; }
    appState.users = appState.users.filter(u => u !== username);
    if (appState.currentUser === username) {
        appState.currentUser = 'Default';
    }
    mutateState('REMOVE_USER', { username: username });
    syncUserInterface();
}

function syncUserInterface() {
    var headerSel = document.getElementById('headerUserSelect');
    var headerSelMobile = document.getElementById('headerUserSelectMobile');
    var formOwner = document.getElementById('invItemOwnerSelect');
    var filterOwner = document.getElementById('filterOwnerSelect');
    var userList = document.getElementById('userListDisplay');

    function populateUserSelect(sel) {
        if (!sel) return;
        var savedVal = sel.value;
        sel.innerHTML = '';
        appState.users.forEach(function(u) {
            var opt = document.createElement('option');
            opt.value = u; opt.innerText = u; sel.appendChild(opt);
        });
        if (appState.users.includes(savedVal)) sel.value = savedVal;
        else sel.value = appState.currentUser;
    }

    populateUserSelect(headerSel);
    populateUserSelect(headerSelMobile);

    if (formOwner) {
        var savedOwner = formOwner.value;
        formOwner.innerHTML = '<option value="">' + t('selectUser') + '</option>';
        appState.users.forEach(u => {
            var opt = document.createElement('option');
            opt.value = u; opt.innerText = u; formOwner.appendChild(opt);
        });
        if (appState.users.includes(savedOwner)) formOwner.value = savedOwner;
        else if (appState.users.includes(appState.currentUser)) formOwner.value = appState.currentUser;
    }

    if (filterOwner) {
        var savedFilter = filterOwner.value;
        filterOwner.innerHTML = '<option value="">' + t('allOwners') + '</option>';
        appState.users.forEach(u => {
            var opt = document.createElement('option');
            opt.value = u; opt.innerText = u; filterOwner.appendChild(opt);
        });
        if (appState.users.includes(savedFilter)) filterOwner.value = savedFilter;
    }

    if (userList) {
        userList.innerHTML = appState.users.map(u => {
            var email = appState.userEmails[u] || '';
            return '<div class="flex items-center gap-2 py-1"><span class="bg-slate-100 border border-slate-200 rounded-full px-3 py-1">' + u +
                (email ? ' <span class="text-[10px] text-slate-400">(' + email + ')</span>' : '') +
                '</span>' +
                (u !== 'Default' ? '<span onclick="removeUser(\'' + u.replace(/'/g, "&#39;") + '\')" class="text-slate-300 hover:text-red-500 cursor-pointer font-bold">×</span>' : '') +
                '</div>';
        }).join('');
    }

    // Populate reminder days
    var remDays = document.getElementById('settingReminderDays');
    if (remDays) remDays.value = appState.reminderDays || 30;
}

function commitReminderSettings() {
    var val = parseInt(document.getElementById('settingReminderDays').value) || 30;
    appState.reminderDays = Math.max(1, Math.min(365, val));
    mutateState('SET_REMINDER', { reminderDays: appState.reminderDays });
    showToast('Reminder set to ' + appState.reminderDays + ' days before expiry.', 'success');
}

/* ==========================================================================
   Section 3: Segment Configurator & Spatial Mapping (3-level)
   ========================================================================== */
function addSegmentNode() {
    const sName = document.getElementById('newSegmentName').value.trim();
    if (!sName) { showToast('No name entered', 'error'); return; }

    // Rename mode
    if (editingNode && editingNode.type === 'segment') {
        var oldName = editingNode.oldName;
        if (oldName !== sName && !appState.segments[sName]) {
            appState.segments[sName] = appState.segments[oldName];
            delete appState.segments[oldName];
            var newCoords = {};
            for (var k in appState.coordinates) {
                var parts = k.split('|');
                if (parts[0] === oldName) {
                    parts[0] = sName;
                    newCoords[parts.join('|')] = appState.coordinates[k];
                } else newCoords[k] = appState.coordinates[k];
            }
            appState.coordinates = newCoords;
            appState.inventory.forEach(function(item) {
                if (item.segment === oldName) item.segment = sName;
                if (item.stockEntries) {
                    item.stockEntries.forEach(function(e) { if (e.segment === oldName) e.segment = sName; });
                }
            });
            if (appState.activeMappingNode && appState.activeMappingNode.segment === oldName) {
                appState.activeMappingNode.segment = sName;
            }
            mutateState('RENAME_SEGMENT', { oldName: oldName, newName: sName });
            triggerBackgroundSync();
            syncUIComponents();
            var count = 0;
            appState.inventory.forEach(function(it) { if (it.segment === sName) count++; });
            showToast('Renamed: ' + oldName + ' -> ' + sName + ' (' + count + ' items updated)', 'success');
        } else {
            showToast('Cannot rename: ' + sName + ' already exists', 'error');
        }
        clearEditingState();
        return;
    }

    if (!appState.segments[sName]) {
        appState.segments[sName] = {};
        mutateState('ADD_SEGMENT', { entity: 'segment', action: 'create', path: sName, segment: sName });
        triggerBackgroundSync();
        syncUIComponents();
        document.getElementById('newSegmentName').value = '';
    }
}

function addContainerNode() {
    const segment = document.getElementById('targetSegmentSelect').value;
    const cName = document.getElementById('newContainerName').value.trim();
    if (!cName) return;

    // Edit mode — rename or move container
    if (editingNode && editingNode.type === 'container') {
        var oldSeg = editingNode.segment;
        var oldName = editingNode.oldName;
        var newSeg = segment;
        var newName = cName;
        if (!newSeg) { showToast('Select a target segment.', 'error'); return; }

        var isMove = (oldSeg !== newSeg);
        var isRename = (oldName !== newName);
        if (!isMove && !isRename) { clearEditingState(); return; }
        if (appState.segments[newSeg] && appState.segments[newSeg][newName] && (newSeg !== oldSeg || newName !== oldName)) {
            showToast('Container "' + newName + '" already exists in ' + newSeg + '.', 'error');
            clearEditingState(); return;
        }

        if (!appState.segments[newSeg]) appState.segments[newSeg] = {};
        appState.segments[newSeg][newName] = appState.segments[oldSeg][oldName];
        delete appState.segments[oldSeg][oldName];

        var newCoords = {};
        for (var k in appState.coordinates) {
            var parts = k.split('|');
            if (parts[0] === oldSeg && parts[1] === oldName) {
                parts[0] = newSeg; parts[1] = newName;
                newCoords[parts.join('|')] = appState.coordinates[k];
            } else newCoords[k] = appState.coordinates[k];
        }
        appState.coordinates = newCoords;
        appState.inventory.forEach(function(item) {
            if (item.segment === oldSeg && item.container === oldName) {
                item.segment = newSeg; item.container = newName;
            }
            if (item.stockEntries) {
                item.stockEntries.forEach(function(e) {
                    if (e.segment === oldSeg && e.container === oldName) {
                        e.segment = newSeg; e.container = newName;
                    }
                });
            }
        });
        if (appState.activeMappingNode && appState.activeMappingNode.segment === oldSeg && appState.activeMappingNode.container === oldName) {
            appState.activeMappingNode.segment = newSeg;
            appState.activeMappingNode.container = newName;
            document.getElementById('activeMappingContainerNode').innerText = newSeg + ' > ' + newName;
        }
        mutateState('RENAME_CONTAINER', { oldSeg: oldSeg, oldName: oldName, newSeg: newSeg, newName: newName });
        triggerBackgroundSync();
        syncUIComponents();
        showToast('Updated: ' + oldSeg + ' > ' + oldName + ' → ' + newSeg + ' > ' + newName, 'success');
        clearEditingState();
        return;
    }

    if (!appState.segments[segment]) appState.segments[segment] = {};
    if (!appState.segments[segment][cName]) {
        appState.segments[segment][cName] = [];
        mutateState('ADD_CONTAINER', { entity: 'container', action: 'create', path: segment + ' > ' + cName, segment: segment, container: cName });
        triggerBackgroundSync();
        syncUIComponents();
        document.getElementById('newContainerName').value = '';
    }
}

function addSubContainerNode() {
    const segment = document.getElementById('targetContainerSegmentSelect').value;
    const container = document.getElementById('targetContainerSelect').value;
    const scName = document.getElementById('newSubContainerName').value.trim();
    if (!segment || !container || !scName) return;

    // Edit mode — rename or move sub-container
    if (editingNode && editingNode.type === 'subContainer') {
        var oldSeg = editingNode.segment;
        var oldCon = editingNode.container;
        var oldName = editingNode.oldName;
        var newSeg = segment;
        var newCon = container;
        var newName = scName;
        if (!newSeg || !newCon) { showToast('Select target segment and container.', 'error'); return; }

        var isMove = (oldSeg !== newSeg || oldCon !== newCon);
        var isRename = (oldName !== newName);
        if (!isMove && !isRename) { clearEditingState(); return; }
        if ((isMove || isRename) && appState.segments[newSeg] && appState.segments[newSeg][newCon] && appState.segments[newSeg][newCon].includes(newName) && (newSeg !== oldSeg || newCon !== oldCon || newName !== oldName)) {
            showToast('Sub-container "' + newName + '" already exists in ' + newSeg + ' > ' + newCon + '.', 'error');
            clearEditingState(); return;
        }

        // Remove from old location
        if (appState.segments[oldSeg] && appState.segments[oldSeg][oldCon]) {
            appState.segments[oldSeg][oldCon] = appState.segments[oldSeg][oldCon].filter(function(s) { return s !== oldName; });
        }
        // Add to new location
        if (!appState.segments[newSeg]) appState.segments[newSeg] = {};
        if (!appState.segments[newSeg][newCon]) appState.segments[newSeg][newCon] = [];
        appState.segments[newSeg][newCon].push(newName);

        var newCoords = {};
        for (var k in appState.coordinates) {
            var parts = k.split('|');
            if (parts[0] === oldSeg && parts[1] === oldCon && parts[2] === oldName) {
                parts[0] = newSeg; parts[1] = newCon; parts[2] = newName;
                newCoords[parts.join('|')] = appState.coordinates[k];
            } else newCoords[k] = appState.coordinates[k];
        }
        appState.coordinates = newCoords;
        appState.inventory.forEach(function(item) {
            if (item.segment === oldSeg && item.container === oldCon && item.subContainer === oldName) {
                item.segment = newSeg; item.container = newCon; item.subContainer = newName;
            }
            if (item.stockEntries) {
                item.stockEntries.forEach(function(e) {
                    if (e.segment === oldSeg && e.container === oldCon && e.subContainer === oldName) {
                        e.segment = newSeg; e.container = newCon; e.subContainer = newName;
                    }
                });
            }
        });
        if (appState.activeMappingNode && appState.activeMappingNode.segment === oldSeg && appState.activeMappingNode.container === oldCon && appState.activeMappingNode.subContainer === oldName) {
            appState.activeMappingNode.segment = newSeg;
            appState.activeMappingNode.container = newCon;
            appState.activeMappingNode.subContainer = newName;
            document.getElementById('activeMappingContainerNode').innerText = newSeg + ' > ' + newCon + ' > ' + newName;
        }
        mutateState('RENAME_SUB_CONTAINER', { oldSeg: oldSeg, oldCon: oldCon, oldName: oldName, newSeg: newSeg, newCon: newCon, newName: newName });
        triggerBackgroundSync();
        syncUIComponents();
        showToast('Updated: ' + oldSeg + ' > ' + oldCon + ' > ' + oldName + ' → ' + newSeg + ' > ' + newCon + ' > ' + newName, 'success');
        clearEditingState();
        return;
    }

    if (!appState.segments[segment]) appState.segments[segment] = {};
    if (!appState.segments[segment][container]) appState.segments[segment][container] = [];
    if (!appState.segments[segment][container].includes(scName)) {
        appState.segments[segment][container].push(scName);
        mutateState('ADD_SUB_CONTAINER', { entity: 'subContainer', action: 'create', path: segment + ' > ' + container + ' > ' + scName, segment: segment, container: container, subContainer: scName });
        triggerBackgroundSync();
        syncUIComponents();
        document.getElementById('newSubContainerName').value = '';
    }
}

function clearEditingState() {
    editingNode = null;
    document.getElementById('newSegmentName').value = '';
    document.getElementById('newContainerName').value = '';
    document.getElementById('newSubContainerName').value = '';
    document.getElementById('newSegmentName').placeholder = t('chooseSegPlaceholder');
    document.getElementById('newContainerName').placeholder = t('chooseConPlaceholder');
    document.getElementById('newSubContainerName').placeholder = t('chooseSubPlaceholder');
    var cfg = document.getElementById('configuratorContent');
    if (cfg) {
        var btns = cfg.getElementsByTagName('button');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].innerHTML.trim() === '✓') btns[i].innerHTML = '+';
        }
    }
}

function syncTargetContainerDropdown() {
    const segSelect = document.getElementById('targetContainerSegmentSelect');
    const conSelect = document.getElementById('targetContainerSelect');
    const pickedSeg = segSelect.value;

    conSelect.innerHTML = '<option value="">' + t('chooseContainer') + '</option>';
    if (pickedSeg && appState.segments[pickedSeg]) {
        Object.keys(appState.segments[pickedSeg]).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.innerText = c;
            conSelect.appendChild(opt);
        });
    }
}

function toggleConfigurator() {
    const content = document.getElementById('configuratorContent');
    const icon = document.getElementById('configuratorToggleIcon');
    const hidden = content.classList.toggle('hidden');
    icon.style.transform = hidden ? 'rotate(0deg)' : 'rotate(180deg)';
    if (hidden) clearEditingState();
}

function expandConfigurator() {
    const content = document.getElementById('configuratorContent');
    const icon = document.getElementById('configuratorToggleIcon');
    content.classList.remove('hidden');
    icon.style.transform = 'rotate(180deg)';
}

function populateConfiguratorForEdit(type, seg, con, sub) {
    clearEditingState();
    if (type === 'segment') {
        editingNode = { type: 'segment', oldName: seg };
        document.getElementById('newSegmentName').value = seg;
        document.getElementById('newSegmentName').placeholder = 'Rename: ' + seg;
    } else if (type === 'container') {
        editingNode = { type: 'container', segment: seg, oldName: con };
        document.getElementById('targetSegmentSelect').value = seg;
        document.getElementById('newContainerName').value = con;
        document.getElementById('newContainerName').placeholder = 'Rename: ' + con;
    } else if (type === 'subContainer') {
        editingNode = { type: 'subContainer', segment: seg, container: con, oldName: sub };
        document.getElementById('targetContainerSegmentSelect').value = seg;
        syncTargetContainerDropdown();
        document.getElementById('targetContainerSelect').value = con;
        document.getElementById('newSubContainerName').value = sub;
        document.getElementById('newSubContainerName').placeholder = 'Rename: ' + sub;
    }
    // Change + button text
    var cfg = document.getElementById('configuratorContent');
    if (cfg) {
        var btns = cfg.getElementsByTagName('button');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].innerHTML.trim() === '+') btns[i].innerHTML = '✓';
        }
    }
}

async function deleteSegmentNode(seg) {
    var ok = await showAppConfirm(t('confirmDeleteSeg') + ' "' + seg + '" ' + t('members') + '?', 'Delete');
    if (!ok) return;
    delete appState.segments[seg];
    Object.keys(appState.coordinates).forEach(function(k) {
        if (k.indexOf(seg + '|') === 0) delete appState.coordinates[k];
    });
    if (appState.activeMappingNode && appState.activeMappingNode.segment === seg) {
        appState.activeMappingNode = null;
        document.getElementById('activeMappingContainerNode').innerText = t('noneSelected');
        document.getElementById('btnClearActiveNode').classList.add('hidden');
    }
    mutateState('DELETE_SEGMENT', { name: seg });
    triggerBackgroundSync();
    syncUIComponents();
}

async function deleteContainerNode(seg, con) {
    var ok = await showAppConfirm(t('confirmDeleteCon') + ' "' + seg + ' > ' + con + '"?', 'Delete');
    if (!ok) return;
    if (appState.segments[seg]) delete appState.segments[seg][con];
    var containerKey = buildCoordKey(seg, con, '');
    delete appState.coordinates[containerKey];
    Object.keys(appState.coordinates).forEach(function(k) {
        if (k.indexOf(seg + '|' + con + '|') === 0) delete appState.coordinates[k];
    });
    if (appState.activeMappingNode && appState.activeMappingNode.segment === seg && appState.activeMappingNode.container === con) {
        appState.activeMappingNode = null;
        document.getElementById('activeMappingContainerNode').innerText = t('noneSelected');
        document.getElementById('btnClearActiveNode').classList.add('hidden');
    }
    mutateState('DELETE_CONTAINER', { segment: seg, name: con });
    triggerBackgroundSync();
    syncUIComponents();
}

async function deleteSubContainerNode(seg, con, sub) {
    var ok = await showAppConfirm(t('confirmDeleteSub') + ' "' + seg + ' > ' + con + ' > ' + sub + '"?', 'Delete');
    if (!ok) return;
    if (appState.segments[seg] && appState.segments[seg][con]) {
        appState.segments[seg][con] = appState.segments[seg][con].filter(s => s !== sub);
    }
    const key = buildCoordKey(seg, con, sub);
    delete appState.coordinates[key];
    if (appState.activeMappingNode && appState.activeMappingNode.subContainer === sub) {
        appState.activeMappingNode = null;
        document.getElementById('activeMappingContainerNode').innerText = t('noneSelected');
        document.getElementById('btnClearActiveNode').classList.add('hidden');
    }
    mutateState('DELETE_SUB_CONTAINER', { segment: seg, container: con, name: sub });
    triggerBackgroundSync();
    syncUIComponents();
}

function clearActiveNode() {
    appState.activeMappingNode = null;
    document.getElementById('activeMappingContainerNode').innerText = t('noneSelected');
    document.getElementById('btnClearActiveNode').classList.add('hidden');
    clearEditingState();
    updateSpatialActionHint(null);
    renderSpatialMapGrid();
    renderContainerAssetList();
}

function updateSpatialActionHint(node) {
    var hint = document.getElementById('spatialActionHint');
    if (!hint) return;
    if (!node) {
        hint.className = 'text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 mt-2 inline-block';
        hint.innerText = 'Select a node from the index to begin';
    } else if (node.subContainer) {
        hint.className = 'text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 mt-2 inline-block';
        hint.innerText = 'Viewing assets in this location. Sub-containers cannot be placed on the map.';
    } else if (node.container) {
        var key = buildCoordKey(node.segment, node.container, '');
        if (appState.coordinates[key]) {
            hint.className = 'text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 mt-2 inline-block';
            hint.innerText = 'Drag the marker to reposition, or select another node';
        } else {
            hint.className = 'text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 mt-2 inline-block';
            hint.innerText = 'Click anywhere on the map to place this container';
        }
    } else {
        hint.className = 'text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 mt-2 inline-block';
        hint.innerText = 'Expand a segment and select a container to place it';
    }
}

function markMapDirty() {
    _mapDirty = true;
    var btn = document.getElementById('btnSaveLayout');
    if (btn) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-warning');
        var label = btn.querySelector('.btn-label');
        if (label) label.innerText = 'Save *';
    }
    var badge = document.getElementById('mapUnsavedBadge');
    if (badge) badge.classList.remove('hidden');
}

function saveLayoutMap() {
    mutateState('SAVE_LAYOUT', {});
    _mapDirty = false;
    var btn = document.getElementById('btnSaveLayout');
    if (btn) {
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-secondary');
        var label = btn.querySelector('.btn-label');
        if (label) label.innerText = 'Save';
    }
    var badge = document.getElementById('mapUnsavedBadge');
    if (badge) badge.classList.add('hidden');
    showToast('Layout saved', 'success');
    triggerSynchronousCloudBackupPush();
}

function markClassesDirty() {
    _classesDirty = true;
    var btn = document.getElementById('btnSaveClassification');
    if (btn) {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-warning');
        var label = btn.querySelector('.btn-label');
        if (label) label.innerText = 'Save *';
    }
}

function saveClassification() {
    mutateState('SAVE_CLASSIFICATION', {});
    _classesDirty = false;
    var btn = document.getElementById('btnSaveClassification');
    if (btn) {
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-secondary');
        var label = btn.querySelector('.btn-label');
        if (label) label.innerText = 'Save';
    }
    triggerSynchronousCloudBackupPush();
}

function selectNodeForAssets(seg, con, sub) {
    appState.activeMappingNode = { segment: seg, container: con || null, subContainer: sub || null };
    var label = seg;
    if (con) label += ' > ' + con;
    if (sub) label += ' > ' + sub;
    document.getElementById('activeMappingContainerNode').innerText = label;
    document.getElementById('btnClearActiveNode').classList.remove('hidden');
    if (sub) populateConfiguratorForEdit('subContainer', seg, con, sub);
    else if (con) populateConfiguratorForEdit('container', seg, con);
    else populateConfiguratorForEdit('segment', seg);
    updateSpatialActionHint(appState.activeMappingNode);
    renderContainerAssetList();
    renderSpatialMapGrid();
}

function selectSubContainerForMapping(segment, container, subContainer) {
    appState.activeMappingNode = { segment, container, subContainer };
    document.getElementById('activeMappingContainerNode').innerText = `${segment} > ${container} > ${subContainer}`;
    document.getElementById('btnClearActiveNode').classList.remove('hidden');
    populateConfiguratorForEdit('subContainer', segment, container, subContainer);
    updateSpatialActionHint(appState.activeMappingNode);
    renderSpatialMapGrid();
    renderContainerAssetList();
}

function quickAddAsset() {
    clearInventoryFormContext();
    switchTab('tab-register');
    document.getElementById('invItemName').focus();
}

function renderSpatialMapGrid() {
    const gridMatrix = document.getElementById('spatialMapGridMatrix');
    gridMatrix.innerHTML = '';

    const bgLayer = document.getElementById('spatialMapBgImage');
    const btnClear = document.getElementById('btnClearLayoutBg');

    if (appState.spatialBackgroundImage) {
        bgLayer.style.display = '';
        bgLayer.style.backgroundImage = `url('${appState.spatialBackgroundImage}')`;
        btnClear.classList.remove('hidden');
    } else {
        bgLayer.style.display = 'none';
        bgLayer.style.backgroundImage = '';
        btnClear.classList.add('hidden');
    }

    // Click to place a container, or clear selection when clicking empty space
    gridMatrix.onclick = function(e) {
        var node = appState.activeMappingNode;
        var placed = false;
        if (node && node.container && !node.subContainer) {
            var nodeKey = buildCoordKey(node.segment, node.container, '');
            if (!appState.coordinates[nodeKey]) {
                var sc = mapStageCoordFromEvent(e);
                if (sc) {
                    var xPercent = Math.round((sc.x / sc.vpW) * 100);
                    var yPercent = Math.round((sc.y / sc.vpH) * 100);
                    appState.coordinates[nodeKey] = { x: xPercent, y: yPercent };
                    markMapDirty();
                    mutateState('UPDATE_COORDINATE', { key: nodeKey });
                    renderSpatialMapGrid();
                    placed = true;
                }
            }
        }
        if (!placed) clearActiveNode();
    };

    // Determine which segments to show based on selection (segment-level filter only)
    var filterSeg = null;
    if (appState.activeMappingNode) {
        filterSeg = appState.activeMappingNode.segment;
    }

    // Build a map of container positions: prefer container-level coords, fallback to first sub-container coord
    var containerPositions = {}; // key: seg|con -> { x, y }
    Object.keys(appState.segments).forEach(function(seg) {
        var containerMap = appState.segments[seg] || {};
        Object.keys(containerMap).forEach(function(con) {
            var cKey = buildCoordKey(seg, con, '');
            var cCoord = appState.coordinates[cKey];
            if (cCoord) {
                containerPositions[seg + '|' + con] = { seg: seg, con: con, x: cCoord.x, y: cCoord.y };
            } else {
                var subList = containerMap[con] || [];
                for (var i = 0; i < subList.length; i++) {
                    var sKey = buildCoordKey(seg, con, subList[i]);
                    var sCoord = appState.coordinates[sKey];
                    if (sCoord) {
                        containerPositions[seg + '|' + con] = { seg: seg, con: con, x: sCoord.x, y: sCoord.y };
                        break;
                    }
                }
            }
        });
    });

    // Render container markers
    Object.keys(containerPositions).forEach(function(posKey) {
        var entry = containerPositions[posKey];
        var seg = entry.seg, con = entry.con;
        if (filterSeg && seg !== filterSeg) return;

        var isSelected = appState.activeMappingNode &&
            appState.activeMappingNode.container === con &&
            appState.activeMappingNode.segment === seg &&
            !appState.activeMappingNode.subContainer;

        var marker = document.createElement('div');
        marker.className = 'absolute transform -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] font-bold shadow-md cursor-grab active:cursor-grabbing select-none whitespace-nowrap z-10 ' +
            (isSelected ? 'bg-blue-600 text-white ring-2 ring-offset-1 ring-blue-400' : 'bg-slate-800 text-slate-100');
        marker.style.left = entry.x + '%';
        marker.style.top = entry.y + '%';
        marker.innerText = con;
        marker.setAttribute('data-seg', seg);
        marker.setAttribute('data-con', con);
        marker.addEventListener('mousedown', function(ev) { startMarkerDrag(ev, marker, seg, con); });
        marker.addEventListener('touchstart', function(ev) { startMarkerDrag(ev, marker, seg, con); }, { passive: false });
        marker.onclick = (function(segVal, conVal) {
            return function(ev) { if (window._markerDidDrag) { window._markerDidDrag = false; return; } ev.stopPropagation(); selectNodeForAssets(segVal, conVal); };
        })(seg, con);
        gridMatrix.appendChild(marker);
    });

    renderContainerAssetList();
}

function startMarkerDrag(e, marker, seg, con) {
    e.preventDefault();
    e.stopPropagation();
    window._markerDidDrag = false;

    function onMove(ev) {
        ev.preventDefault();
        var clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        var clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
        var sc = mapStageCoordFromEvent({ clientX: clientX, clientY: clientY });
        if (!sc) return;
        var dx = Math.abs(clientX - (e.touches ? e.touches[0].clientX : e.clientX));
        var dy = Math.abs(clientY - (e.touches ? e.touches[0].clientY : e.clientY));
        if (dx > 2 || dy > 2) {
            window._markerDidDrag = true;
        }
        var pctX = Math.round((sc.x / sc.vpW) * 100);
        var pctY = Math.round((sc.y / sc.vpH) * 100);
        pctX = Math.max(0, Math.min(100, pctX));
        pctY = Math.max(0, Math.min(100, pctY));
        marker.style.left = pctX + '%';
        marker.style.top = pctY + '%';
    }

    function onEnd(ev) {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        if (window._markerDidDrag) {
            var leftPct = parseFloat(marker.style.left);
            var topPct = parseFloat(marker.style.top);
            var key = buildCoordKey(seg, con, '');
            appState.coordinates[key] = { x: Math.round(leftPct), y: Math.round(topPct) };
            markMapDirty();
            mutateState('UPDATE_COORDINATE', { key: key });
        }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
}

function handleLayoutBackgroundUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';
    var endpoint = localStorage.getItem('sys_gas_url');
    showToast('Uploading layout image...', 'info');
    compressImageFileToBlob(file, 1600, 0.75, 'image/jpeg').then(function(result) {
        var uploadFn = endpoint
            ? uploadImageToCloud(result.blob, 'layout_bg_' + Date.now() + '.jpg')
            : Promise.reject(new Error('No cloud endpoint'));
        return uploadFn;
    }).then(function(url) {
        appState.spatialBackgroundImage = url;
        markMapDirty();
        mutateState('UPDATE_BACKGROUND_IMAGE', {});
        renderSpatialMapGrid();
        showToast('Layout image uploaded \u2014 click Save to keep', 'info');
    }).catch(function(err) {
        compressImageFile(file, 1600, 0.75, function(dataUrl) {
            appState.spatialBackgroundImage = dataUrl;
            markMapDirty();
            mutateState('UPDATE_BACKGROUND_IMAGE', {});
            renderSpatialMapGrid();
            showToast('Layout image saved locally only (no cloud configured)', 'info');
        });
    });
}

function clearLayoutBackground() {
    appState.spatialBackgroundImage = null;
    markMapDirty();
    mutateState('UPDATE_BACKGROUND_IMAGE', {});
    renderSpatialMapGrid();
    showToast('Layout background image removed', 'info');
}

function renderContainerAssetList() {
    var panel = document.getElementById('containerAssetsPanel');
    var label = document.getElementById('containerAssetsLabel');
    var countEl = document.getElementById('containerAssetsCount');
    var listEl = document.getElementById('containerAssetsList');

    if (!appState.activeMappingNode) {
        panel.classList.add('hidden');
        return;
    }

    var seg = appState.activeMappingNode.segment;
    var con = appState.activeMappingNode.container;
    var sub = appState.activeMappingNode.subContainer;
    var assets = appState.inventory.filter(function(item) {
        if (item.deletedAt) return false;
        if (item.itemType === 'stock') {
            var entries = getActiveStockEntries(item);
            return entries.some(function(e) {
                return e.segment === seg && (!con || e.container === con) && (!sub || e.subContainer === sub);
            });
        }
        if (item.segment !== seg) return false;
        if (con && item.container !== con) return false;
        if (sub && item.subContainer !== sub) return false;
        return true;
    });

    var nodeLabel = seg;
    if (con) nodeLabel += ' > ' + con;
    if (sub) nodeLabel += ' > ' + sub;

    panel.classList.remove('hidden');
    label.innerText = nodeLabel;
    countEl.innerText = assets.length + ' item' + (assets.length !== 1 ? 's' : '');

    if (assets.length === 0) {
        listEl.innerHTML = emptyStateHTML(
            '<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>',
            'No assets here yet',
            'Add an item to ' + nodeLabel,
            '+ Quick Add', 'quickAddAsset()'
        );
        return;
    }

    listEl.innerHTML = assets.map(function(item) {
        var locDetail = (item.itemType === 'stock') ? getStockLocationSummary(item) : (item.subContainer || '\u2014');
        return '<div class="container-asset-item flex items-center gap-3 p-2 rounded-lg border border-slate-100 cursor-pointer" onclick="switchTab(\'tab-inventory\'); document.getElementById(\'filterSearchQuery\').value=\'' + item.name.replace(/'/g, "\\'") + '\'; renderFilteredInventoryTable();">' +
            '<img src="' + getRenderableImageSrc(item, true) + '" class="h-8 w-8 object-cover rounded border border-slate-200 bg-slate-100" onerror="this.src=\'https://placehold.co/100?text=Error\'">' +
            '<div class="flex-1 min-w-0">' +
            '<div class="font-semibold text-slate-800 truncate">' + item.name + '</div>' +
            '<div class="text-[10px] text-slate-400">' + locDetail + ' \u00B7 ' + item.category + ' \u00B7 \uD83D\uDC64 ' + (item.owner || 'Default') + '</div>' +
            '</div>' +
            '<span class="text-[10px] text-slate-400 whitespace-nowrap">' + item.timestamp + '</span>' +
            '</div>';
    }).join('');
}

/* ==========================================================================
   Section 4: 4-Level Recursive Tree Classification Engine
   ========================================================================== */
function initializeDefaultTiersIfEmpty() {
    if (Object.keys(appState.categories).length === 0) {
        appState.categories = {
            "Clothing": { "Summer": { "Shirts": {}, "Skirts": {} }, "Winter": {} },
            "Electronic Devices": {},
            "Foods": {},
            "Bags": {}
        };
    }
}

function getCategoryNodeByPath(root, pathArr) {
    if (!pathArr || pathArr.length === 0) return root;
    let current = root;
    for (let bit of pathArr) {
        if (current && current[bit]) {
            current = current[bit];
        } else {
            return null;
        }
    }
    return current;
}

function selectCategoryNodeContext(pathJsonString) {
    const pathArr = JSON.parse(pathJsonString);
    appState.selectedCategoryNodePath = pathArr;
    document.getElementById('targetCategoryPathDisplay').value = pathArr.join(' > ');

    const warningLabel = document.getElementById('categoryDepthWarning');
    const addBtn = document.getElementById('btnAddCategoryNode');

    if (pathArr.length >= 4) {
        warningLabel.classList.remove('hidden');
        addBtn.disabled = true;
        addBtn.className = "bg-slate-300 text-slate-500 text-xs font-semibold px-4 rounded-lg cursor-not-allowed";
    } else {
        warningLabel.classList.add('hidden');
        addBtn.disabled = false;
        addBtn.className = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 rounded-lg transition-colors";
    }
}

function resetCategorySelectionContext() {
    appState.selectedCategoryNodePath = null;
    document.getElementById('targetCategoryPathDisplay').value = t('rootLevel');
    document.getElementById('categoryDepthWarning').classList.add('hidden');

    const addBtn = document.getElementById('btnAddCategoryNode');
    addBtn.disabled = false;
    addBtn.className = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 rounded-lg transition-colors";
}

function createClassificationNode() {
    const nodeName = document.getElementById('newCategoryNodeName').value.trim();
    if (!nodeName || nodeName.includes('>') || nodeName.includes('"')) return;

    let targetParentMap = appState.categories;
    if (appState.selectedCategoryNodePath) {
        targetParentMap = getCategoryNodeByPath(appState.categories, appState.selectedCategoryNodePath);
    }

    if (targetParentMap && !targetParentMap[nodeName]) {
        targetParentMap[nodeName] = {};
        markClassesDirty();
        mutateState('ADD_CATEGORY', { entity: 'category', action: 'create', name: nodeName });
        triggerBackgroundSync();
        syncUIComponents();
        document.getElementById('newCategoryNodeName').value = '';
        resetCategorySelectionContext();
    }
}

async function deleteSelectedCategoryNode() {
    if (!appState.selectedCategoryNodePath || appState.selectedCategoryNodePath.length === 0) return;

    var ok = await showAppConfirm(t('confirmDropCategory'), 'Delete');
    if (!ok) return;

    const pathToDelete = [...appState.selectedCategoryNodePath];
    const targetNodeKey = pathToDelete.pop();

    let targetParentMap = appState.categories;
    if (pathToDelete.length > 0) {
        targetParentMap = getCategoryNodeByPath(appState.categories, pathToDelete);
    }

    if (targetParentMap && targetParentMap[targetNodeKey]) {
        delete targetParentMap[targetNodeKey];
        markClassesDirty();
        mutateState('DELETE_CATEGORY', { name: targetNodeKey });
        triggerBackgroundSync();
        syncUIComponents();
        resetCategorySelectionContext();
    }
}

function flattenCategoryTreeToLinearRoutes(rootNode, activePrefixArray = [], collectedOutputList = []) {
    for (let key in rootNode) {
        const nextPath = [...activePrefixArray, key];
        collectedOutputList.push(nextPath.join(' > '));
        flattenCategoryTreeToLinearRoutes(rootNode[key], nextPath, collectedOutputList);
    }
    return collectedOutputList;
}

function getCategoryChildrenMap(parentMap, pathArr) {
    let current = parentMap || appState.categories;
    if (pathArr && pathArr.length > 0) {
        current = getCategoryNodeByPath(appState.categories, pathArr);
    }
    return current || {};
}

function buildCategoryPathFromSelects() {
    var parts = [];
    var l1 = document.getElementById('invCatL1').value;
    var l2 = document.getElementById('invCatL2').value;
    var l3 = document.getElementById('invCatL3').value;
    var l4 = document.getElementById('invCatL4').value;
    if (l1) parts.push(l1);
    if (l2) parts.push(l2);
    if (l3) parts.push(l3);
    if (l4) parts.push(l4);
    return parts.join(' > ');
}

function setCascadingCategorySelects(pathStr) {
    if (!pathStr) { resetCascadingCategorySelects(); return; }
    var parts = pathStr.split(' > ');
    syncCategoryLevel1();
    if (parts.length > 0) document.getElementById('invCatL1').value = parts[0];
    syncCategoryLevel2();
    if (parts.length > 1) document.getElementById('invCatL2').value = parts[1];
    syncCategoryLevel3();
    if (parts.length > 2) document.getElementById('invCatL3').value = parts[2];
    syncCategoryLevel4();
    if (parts.length > 3) document.getElementById('invCatL4').value = parts[3];
}

function resetCascadingCategorySelects() {
    document.getElementById('invCatL1').value = '';
    syncCategoryLevel2();
    document.getElementById('invCatL2').value = '';
    syncCategoryLevel3();
    document.getElementById('invCatL3').value = '';
    syncCategoryLevel4();
    document.getElementById('invCatL4').value = '';
}

function syncCategoryLevel1() {
    var sel = document.getElementById('invCatL1');
    var saved = sel.value;
    sel.innerHTML = '<option value="">Level 1</option>';
    Object.keys(appState.categories).forEach(function(k) {
        var opt = document.createElement('option');
        opt.value = k; opt.innerText = k; sel.appendChild(opt);
    });
    if ([...sel.options].some(function(o) { return o.value === saved; })) sel.value = saved;
}

function syncCategoryLevel2() {
    var sel = document.getElementById('invCatL2');
    var l1 = document.getElementById('invCatL1').value;
    var saved = sel.value;
    sel.innerHTML = '<option value="">Level 2</option>';
    if (l1 && appState.categories[l1]) {
        Object.keys(appState.categories[l1]).forEach(function(k) {
            var opt = document.createElement('option');
            opt.value = k; opt.innerText = k; sel.appendChild(opt);
        });
    }
    if ([...sel.options].some(function(o) { return o.value === saved; })) sel.value = saved;
    syncCategoryLevel3();
    syncCategoryLevel4();
}

function syncCategoryLevel3() {
    var sel = document.getElementById('invCatL3');
    var l1 = document.getElementById('invCatL1').value;
    var l2 = document.getElementById('invCatL2').value;
    var saved = sel.value;
    sel.innerHTML = '<option value="">Level 3</option>';
    if (l1 && l2 && appState.categories[l1] && appState.categories[l1][l2]) {
        Object.keys(appState.categories[l1][l2]).forEach(function(k) {
            var opt = document.createElement('option');
            opt.value = k; opt.innerText = k; sel.appendChild(opt);
        });
    }
    if ([...sel.options].some(function(o) { return o.value === saved; })) sel.value = saved;
    syncCategoryLevel4();
}

function syncCategoryLevel4() {
    var sel = document.getElementById('invCatL4');
    var l1 = document.getElementById('invCatL1').value;
    var l2 = document.getElementById('invCatL2').value;
    var l3 = document.getElementById('invCatL3').value;
    var saved = sel.value;
    sel.innerHTML = '<option value="">Level 4</option>';
    if (l1 && l2 && l3 && appState.categories[l1] && appState.categories[l1][l2] && appState.categories[l1][l2][l3]) {
        Object.keys(appState.categories[l1][l2][l3]).forEach(function(k) {
            var opt = document.createElement('option');
            opt.value = k; opt.innerText = k; sel.appendChild(opt);
        });
    }
    if ([...sel.options].some(function(o) { return o.value === saved; })) sel.value = saved;
}

/* ==========================================================================
   Section 5: Inventory Registration & Operations Matrix (3-level)
   ========================================================================== */
function syncInventoryFormContainersDropdown() {
    const segmentSelect = document.getElementById('invItemSegmentSelect');
    const containerSelect = document.getElementById('invItemContainerSelect');
    const pickedSeg = segmentSelect.value;

    containerSelect.innerHTML = '<option value="">' + t('chooseContainer') + '</option>';
    if (pickedSeg && appState.segments[pickedSeg]) {
        Object.keys(appState.segments[pickedSeg]).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.innerText = c;
            containerSelect.appendChild(opt);
        });
    }
    syncInventoryFormSubContainersDropdown();
}

function syncInventoryFormSubContainersDropdown() {
    const segmentSelect = document.getElementById('invItemSegmentSelect');
    const containerSelect = document.getElementById('invItemContainerSelect');
    const subSelect = document.getElementById('invItemSubContainerSelect');
    const pickedSeg = segmentSelect.value;
    const pickedCon = containerSelect.value;

    subSelect.innerHTML = '<option value="">' + t('chooseSubContainer') + '</option>';
    if (pickedSeg && pickedCon && appState.segments[pickedSeg] && appState.segments[pickedSeg][pickedCon]) {
        appState.segments[pickedSeg][pickedCon].forEach(sc => {
            const opt = document.createElement('option');
            opt.value = sc;
            opt.innerText = sc;
            subSelect.appendChild(opt);
        });
    }
}

function syncFilterContainersDropdown() {
    const segFilter = document.getElementById('filterSegmentSelect').value;
    const conFilter = document.getElementById('filterContainerSelect');
    const savedVal = conFilter.value;

    conFilter.innerHTML = '<option value="">' + t('allContainers') + '</option>';
    if (segFilter && appState.segments[segFilter]) {
        Object.keys(appState.segments[segFilter]).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.innerText = c;
            conFilter.appendChild(opt);
        });
    } else {
        const allContainers = new Set();
        Object.values(appState.segments).forEach(map => Object.keys(map).forEach(c => allContainers.add(c)));
        allContainers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.innerText = c;
            conFilter.appendChild(opt);
        });
    }

    if ([...conFilter.options].some(o => o.value === savedVal)) {
        conFilter.value = savedVal;
    }
}

function switchItemType(type) {
    var btnUnique = document.getElementById('btnItemTypeUnique');
    var btnStock = document.getElementById('btnItemTypeStock');
    var stockGlobal = document.getElementById('stockGlobalFields');
    var stockLocSection = document.getElementById('stockLocationsSection');
    var uniqueLocSection = document.getElementById('uniqueLocationSection');
    var uniqueDatesRow = document.getElementById('uniqueDatesRow1');
    var stockDatesNote = document.getElementById('stockDatesNote');
    var scanBtn = document.getElementById('btnScanExistingBarcode');
    markFormDirty();
    document.getElementById('invItemTypeValue').value = type;
    if (type === 'stock') {
        btnUnique.className = 'flex-1 text-xs font-medium py-2 px-3 bg-white text-slate-500 border border-slate-200 transition-colors';
        btnStock.className = 'flex-1 text-xs font-medium py-2 px-3 bg-amber-500 text-white transition-colors';
        stockGlobal.classList.remove('hidden');
        stockLocSection.classList.remove('hidden');
        uniqueLocSection.classList.add('hidden');
        uniqueDatesRow.classList.add('hidden');
        stockDatesNote.classList.remove('hidden');
        scanBtn.classList.remove('hidden');
        if (document.getElementById('stockLocationsRows').children.length === 0) {
            addStockLocationRow();
        }
        updateStockLocationsTotal();
    } else {
        btnUnique.className = 'flex-1 text-xs font-medium py-2 px-3 bg-blue-600 text-white transition-colors';
        btnStock.className = 'flex-1 text-xs font-medium py-2 px-3 bg-white text-slate-500 border border-slate-200 transition-colors';
        stockGlobal.classList.add('hidden');
        stockLocSection.classList.add('hidden');
        uniqueLocSection.classList.remove('hidden');
        uniqueDatesRow.classList.remove('hidden');
        stockDatesNote.classList.add('hidden');
        scanBtn.classList.add('hidden');
    }
}

// ===== Stock Location Row Management =====
function addStockLocationRow(entryData) {
    var rows = document.getElementById('stockLocationsRows');
    var rowIdx = rows.children.length;
    var row = document.createElement('div');
    row.className = 'stock-location-row bg-amber-50/40 border border-amber-200 rounded-lg p-3 shadow-sm';
    row.setAttribute('data-row-idx', rowIdx);

    var segOptions = '<option value="">-- Seg --</option>';
    Object.keys(appState.segments).forEach(function(s) {
        segOptions += '<option value="' + s.replace(/'/g, "&#39;") + '">' + s + '</option>';
    });

    var entryId = entryData ? entryData.id : generateStockEntryId();

    row.innerHTML =
        '<input type="hidden" class="sl-entry-id" value="' + entryId + '">' +
        '<div class="flex justify-between items-center mb-2">' +
        '<span class="text-[10px] font-bold text-slate-500">Location #' + (rowIdx + 1) + '</span>' +
        '<button type="button" class="text-slate-300 hover:text-red-500 text-xs font-bold px-1" onclick="removeStockLocationRow(this)" title="Remove this location">&times;</button>' +
        '</div>' +
        '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">' +
        '<div><label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Segment</label><select class="sl-segment w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none bg-white" onchange="syncStockRowContainers(this)"><option value="">-- Seg --</option>' + segOptions.slice(16) + '</select></div>' +
        '<div><label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Container</label><select class="sl-container w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none bg-white" onchange="syncStockRowSubContainers(this)"><option value="">-- Con --</option></select></div>' +
        '<div><label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Sub-Container</label><select class="sl-subcontainer w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none bg-white"><option value="">-- Sub --</option></select></div>' +
        '<div><label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Qty</label><input type="number" class="sl-qty w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none bg-white" min="0" step="1" value="0" oninput="updateStockLocationsTotal()"></div>' +
        '</div>' +
        '<div class="grid grid-cols-3 gap-2">' +
        '<div><label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Purchase</label><input type="date" class="sl-purchase w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none bg-white"></div>' +
        '<div><label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Warranty</label><input type="date" class="sl-warranty w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none bg-white"></div>' +
        '<div><label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Expiry</label><input type="date" class="sl-expiry w-full text-xs border border-slate-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none bg-white"></div>' +
        '</div>';

    rows.appendChild(row);

    if (entryData) {
        var selSeg = row.querySelector('.sl-segment');
        selSeg.value = entryData.segment || '';
        syncStockRowContainers(selSeg);
        row.querySelector('.sl-container').value = entryData.container || '';
        syncStockRowSubContainers(row.querySelector('.sl-container'));
        row.querySelector('.sl-subcontainer').value = entryData.subContainer || '';
        row.querySelector('.sl-qty').value = entryData.quantity || 0;
        row.querySelector('.sl-purchase').value = entryData.purchaseDate || '';
        row.querySelector('.sl-warranty').value = entryData.warrantyDate || '';
        row.querySelector('.sl-expiry').value = entryData.expiryDate || '';
    }

    updateStockLocationsTotal();
}

function removeStockLocationRow(btn) {
    var rows = document.getElementById('stockLocationsRows');
    var row = btn.closest('.stock-location-row');
    if (row) row.remove();
    updateStockLocationsTotal();
    renumberStockLocationRows();
}

function renumberStockLocationRows() {
    var rows = document.getElementById('stockLocationsRows').children;
    for (var i = 0; i < rows.length; i++) {
        rows[i].setAttribute('data-row-idx', i);
        var label = rows[i].querySelector('.text-slate-500');
        if (label) label.innerText = 'Location #' + (i + 1);
    }
}

function syncStockRowContainers(segSelect) {
    var row = segSelect.closest('.stock-location-row');
    var conSelect = row.querySelector('.sl-container');
    var segVal = segSelect.value;
    var saved = conSelect.value;
    conSelect.innerHTML = '<option value="">-- Con --</option>';
    if (segVal && appState.segments[segVal]) {
        Object.keys(appState.segments[segVal]).forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c; opt.innerText = c; conSelect.appendChild(opt);
        });
    }
    if ([].slice.call(conSelect.options).some(function(o) { return o.value === saved; })) {
        conSelect.value = saved;
    }
    syncStockRowSubContainers(conSelect);
}

function syncStockRowSubContainers(conSelect) {
    var row = conSelect.closest('.stock-location-row');
    var segSelect = row.querySelector('.sl-segment');
    var subSelect = row.querySelector('.sl-subcontainer');
    var segVal = segSelect.value;
    var conVal = conSelect.value;
    var saved = subSelect.value;
    subSelect.innerHTML = '<option value="">-- Sub --</option>';
    if (segVal && conVal && appState.segments[segVal] && appState.segments[segVal][conVal]) {
        (appState.segments[segVal][conVal] || []).forEach(function(sc) {
            var opt = document.createElement('option');
            opt.value = sc; opt.innerText = sc; subSelect.appendChild(opt);
        });
    }
    if ([].slice.call(subSelect.options).some(function(o) { return o.value === saved; })) {
        subSelect.value = saved;
    }
}

function updateStockLocationsTotal() {
    var total = 0;
    var rows = document.getElementById('stockLocationsRows').children;
    for (var i = 0; i < rows.length; i++) {
        var qtyInput = rows[i].querySelector('.sl-qty');
        if (qtyInput) total += (parseInt(qtyInput.value) || 0);
    }
    var el = document.getElementById('stockLocationsTotalQty');
    if (el) el.innerText = 'Total: ' + total;
}

function collectStockEntriesFromForm() {
    var entries = [];
    var rows = document.getElementById('stockLocationsRows').children;
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var idEl = row.querySelector('.sl-entry-id');
        entries.push({
            id: idEl ? idEl.value : generateStockEntryId(),
            segment: (row.querySelector('.sl-segment') || {}).value || '',
            container: (row.querySelector('.sl-container') || {}).value || '',
            subContainer: (row.querySelector('.sl-subcontainer') || {}).value || '',
            quantity: parseInt((row.querySelector('.sl-qty') || {}).value) || 0,
            purchaseDate: (row.querySelector('.sl-purchase') || {}).value || '',
            warrantyDate: (row.querySelector('.sl-warranty') || {}).value || '',
            expiryDate: (row.querySelector('.sl-expiry') || {}).value || '',
            hiddenAt: null
        });
    }
    return entries;
}

function clearStockLocationRows() {
    var rows = document.getElementById('stockLocationsRows');
    if (rows) rows.innerHTML = '';
}

function commitItemToInventory() {
    try {
    var name = document.getElementById('invItemName').value.trim();
    var categoryStr = buildCategoryPathFromSelects();
    var imageUrl = document.getElementById('invItemImageUrl').value.trim();
    var remarks = document.getElementById('invItemRemarks').value.trim();
    var editId = document.getElementById('editTargetItemId').value;
    var now = new Date().toISOString();
    var deviceId = appState.meta.deviceId;
    var isStock = document.getElementById('invItemTypeValue').value === 'stock';
    var owner = document.getElementById('invItemOwnerSelect').value || appState.currentUser || 'Default';

    if (!name || !categoryStr) {
        showToast(t('pleaseComplete'), 'error');
        return;
    }

    if (isStock) {
        var entries = collectStockEntriesFromForm();
        if (entries.length === 0) {
            showToast('Please add at least one stock location.', 'error');
            return;
        }
        var hasValidLocation = false;
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].segment && entries[i].container) { hasValidLocation = true; break; }
        }
        if (!hasValidLocation) {
            showToast('Each stock location needs at minimum a segment and container.', 'error');
            return;
        }
    } else {
        var segment = document.getElementById('invItemSegmentSelect').value;
        var container = document.getElementById('invItemContainerSelect').value;
        if (!segment || !container) {
            showToast(t('pleaseComplete'), 'error');
            return;
        }
    }

    if (_imageUploadState === 'failed') {
        showToast('Photo upload failed. Item was not saved. Check Cloud Engine settings and Apps Script deployment.', 'error');
        _imageUploadState = 'idle';
        return;
    }
    if (_imageUploadState === 'uploading') {
        showToast('Photo is still uploading. Please wait and try again.', 'warning');
        return;
    }

    var itemId, createdAt, version, barcodeId, existing;
    if (editId) {
        itemId = editId;
        existing = appState.inventory.find(function(i) { return i.id === editId; });
        createdAt = existing ? (existing.createdAt || existing.timestamp || now) : now;
        version = existing ? ((existing.version || 1) + 1) : 1;
        barcodeId = existing ? (existing.barcodeId || generateBarcodeId()) : generateBarcodeId();
    } else {
        itemId = generateItemId();
        createdAt = now;
        version = 1;
        barcodeId = generateBarcodeId();
    }

    var payloadItem = {
        id: itemId,
        barcodeId: barcodeId,
        name: name,
        brand: document.getElementById('invItemBrand').value.trim(),
        category: categoryStr,
        owner: owner,
        imageUrl: '',
        imageThumbUrl: '',
        imageSourceType: 'none',
        imageThumbKey: '',
        imageFullKey: '',
        imageMeta: null,
        remarks: remarks,
        aiMetadata: document.getElementById('invItemAiMetadata').value.trim(),
        itemType: isStock ? 'stock' : 'unique',
        uom: isStock ? document.getElementById('invItemUom').value.trim() : '',
        quantity: 0,
        minQuantity: isStock ? (parseInt(document.getElementById('invItemMinQuantity').value) || 0) : 0,
        segment: '',
        container: '',
        subContainer: '',
        purchaseDate: '',
        warrantyDate: '',
        expiryDate: '',
        stockEntries: [],
        createdAt: createdAt,
        updatedAt: now,
        version: version,
        deletedAt: null,
        lastModifiedBy: deviceId,
        timestamp: now.replace('T', ' ').substring(0, 16)
    };

    if (_pendingImageMeta && (_pendingImageMeta.sourceType === 'idb' || _pendingImageMeta.sourceType === 'remote')) {
        payloadItem.imageSourceType = _pendingImageMeta.sourceType;
        payloadItem.imageThumbKey = _pendingImageMeta.thumbKey;
        payloadItem.imageFullKey = _pendingImageMeta.fullKey;
        payloadItem.imageMeta = _pendingImageMeta.imageMeta;
        payloadItem.imageUrl = _pendingImageMeta.imageUrl || '';
        payloadItem.imageThumbUrl = _pendingImageMeta.imageThumbUrl || '';
    } else if (editId && existing) {
        if (!imageUrl && existing.imageUrl && existing.imageUrl.indexOf('http') === 0) {
            payloadItem.imageUrl = 'https://placehold.co/100?text=No+Photo';
            payloadItem.imageThumbUrl = '';
            payloadItem.imageSourceType = 'none';
            payloadItem.imageThumbKey = '';
            payloadItem.imageFullKey = '';
            payloadItem.imageMeta = null;
        } else if (imageUrl === existing.imageUrl || (!imageUrl && !existing.imageUrl)) {
            payloadItem.imageSourceType = existing.imageSourceType || 'none';
            payloadItem.imageThumbKey = existing.imageThumbKey || '';
            payloadItem.imageFullKey = existing.imageFullKey || '';
            payloadItem.imageMeta = existing.imageMeta || null;
            payloadItem.imageUrl = existing.imageUrl || '';
            payloadItem.imageThumbUrl = existing.imageThumbUrl || '';
        } else if (imageUrl && imageUrl.indexOf('http') === 0) {
            payloadItem.imageUrl = normalizeDriveUrl(imageUrl);
            payloadItem.imageThumbUrl = '';
            payloadItem.imageSourceType = 'remote';
            payloadItem.imageThumbKey = '';
            payloadItem.imageFullKey = '';
            payloadItem.imageMeta = null;
        } else {
            payloadItem.imageSourceType = existing.imageSourceType || 'none';
            payloadItem.imageThumbKey = existing.imageThumbKey || '';
            payloadItem.imageFullKey = existing.imageFullKey || '';
            payloadItem.imageMeta = existing.imageMeta || null;
            payloadItem.imageUrl = existing.imageUrl || '';
            payloadItem.imageThumbUrl = existing.imageThumbUrl || '';
        }
    } else if (imageUrl && imageUrl.indexOf('http') === 0) {
        payloadItem.imageUrl = normalizeDriveUrl(imageUrl);
        payloadItem.imageThumbUrl = '';
        payloadItem.imageSourceType = 'remote';
    } else {
        payloadItem.imageUrl = imageUrl || 'https://placehold.co/100?text=No+Photo';
        payloadItem.imageThumbUrl = '';
    }

    if (editId && existing) {
        var replacingPhoto = _pendingImageMeta && _pendingImageMeta.sourceType;
        var removingPhoto = !_pendingImageMeta && !imageUrl && (existing.imageThumbKey || existing.imageFullKey || (existing.imageUrl && existing.imageUrl.indexOf('http') === 0));
        if (replacingPhoto || removingPhoto || (existing.imageSourceType === 'idb' && payloadItem.imageSourceType !== 'idb') || (existing.imageUrl && existing.imageUrl.indexOf('data:image') === 0)) {
            removeItemImagesQuiet(existing);
        }
    }

    if (isStock) {
        payloadItem.stockEntries = collectStockEntriesFromForm();
        payloadItem.quantity = getTotalStockQuantity(payloadItem);
        payloadItem.uom = document.getElementById('invItemUom').value.trim();
        payloadItem.minQuantity = parseInt(document.getElementById('invItemMinQuantity').value) || 0;
    } else {
        payloadItem.segment = document.getElementById('invItemSegmentSelect').value;
        payloadItem.container = document.getElementById('invItemContainerSelect').value;
        payloadItem.subContainer = document.getElementById('invItemSubContainerSelect').value || '';
        payloadItem.purchaseDate = document.getElementById('invItemPurchaseDate').value;
        payloadItem.warrantyDate = document.getElementById('invItemWarrantyDate').value;
        payloadItem.expiryDate = document.getElementById('invItemExpiryDate').value;
    }

    if (editId) {
        var idx = appState.inventory.findIndex(function(i) { return i.id === editId; });
        if (idx !== -1) appState.inventory[idx] = payloadItem;
        mutateState('EDIT_ITEM', { itemId: editId });
    } else {
        appState.inventory.push(payloadItem);
        mutateState('COMMIT_ITEM', { itemId: itemId });
    }

    _pendingImageMeta = null;
    _imageUploadState = 'idle';

    if (editId) {
        clearInventoryFormContext();
    } else {
        softClearForNextItem();
    }
    resetFormDirty();
    syncUIComponents();
    showToast('\u{1F4E4} Pending sync', 'success');
    triggerBackgroundSync();
    setTimeout(function() { triggerReminderCheckThrottled(); }, 2000);
    } catch (err) {
        console.error('[commitItemToInventory] Runtime error:', err);
        showToast('Save failed: ' + (err.message || 'Unknown error'), 'error');
    }
}

function setupItemModificationContext(itemId) {
    try {
        var item = appState.inventory.find(function(i) { return i.id === itemId && !i.deletedAt; });
        if (!item) { showToast(t('itemNotFound') + itemId, 'error'); return; }

        switchTab('tab-register');
        document.getElementById('inventoryFormTitle').innerText = t('modifyFormTitle');
        document.getElementById('btnResetFormState').classList.remove('hidden');
        _pendingImageMeta = null;
        _lastUploadedImageFile = null;

        document.getElementById('editTargetItemId').value = item.id;
        document.getElementById('invItemName').value = item.name;
        document.getElementById('invItemBrand').value = item.brand || '';
        document.getElementById('invItemOwnerSelect').value = item.owner || appState.currentUser || 'Default';
        if (item.itemType === 'stock') {
            switchItemType('stock');
            document.getElementById('invItemUom').value = item.uom || '';
            document.getElementById('invItemMinQuantity').value = item.minQuantity || 0;
            clearStockLocationRows();
            var entries = getStockEntries(item);
            if (entries.length > 0) {
                entries.forEach(function(e) {
                    addStockLocationRow(e);
                });
            } else {
                addStockLocationRow();
            }
            updateStockLocationsTotal();
        } else {
            switchItemType('unique');
            document.getElementById('invItemSegmentSelect').value = item.segment || '';
            syncInventoryFormContainersDropdown();
            document.getElementById('invItemContainerSelect').value = item.container || '';
            syncInventoryFormSubContainersDropdown();
            document.getElementById('invItemSubContainerSelect').value = item.subContainer || '';
            document.getElementById('invItemPurchaseDate').value = item.purchaseDate || '';
            document.getElementById('invItemWarrantyDate').value = item.warrantyDate || '';
            document.getElementById('invItemExpiryDate').value = item.expiryDate || '';
        }
        setCascadingCategorySelects(item.category);

        var rawImg = item.imageUrl;
        var isRemoteType = item.imageSourceType === 'remote';
        var isIdb = item.imageSourceType === 'idb' && (item.imageThumbKey || item.imageFullKey);
        var isRemoteUrl = rawImg && rawImg.indexOf('http') === 0;
        var isRemote = isRemoteType || isRemoteUrl;
        var isPlaceholder = (!isIdb && !isRemote) && (rawImg === 'https://placehold.co/100?text=No+Photo' || !rawImg);
        document.getElementById('invItemImageUrl').value = isRemoteUrl ? rawImg : '';
        _pendingImageMeta = null;
        _imageUploadState = 'idle';
        var preview = document.getElementById('invItemImagePreview');
        var previewSrc;
        if (isIdb) {
            var key = item.imageThumbKey || item.imageFullKey;
            previewSrc = _imageBlobUrlCache[key] || '';
            if (!_imageBlobUrlCache[key]) loadImageIntoCache(key).then(function(url) { if (url) preview.src = url; });
        } else if (isRemote) {
            previewSrc = normalizeDriveUrl(item.imageThumbUrl) || rawImg;
            if (isRemoteType && !isRemoteUrl) hydrateRemoteImage(item);
        }
        if (previewSrc) {
            preview.src = previewSrc;
            preview.classList.remove('hidden');
            document.getElementById('btnAIAnalyze').style.display = '';
        } else {
            preview.src = '';
            preview.classList.add('hidden');
            document.getElementById('btnAIAnalyze').style.display = 'none';
        }
        document.getElementById('invItemRemarks').value = item.remarks;
        document.getElementById('invItemAiMetadata').value = item.aiMetadata || '';
        if (item.aiMetadata) { expandAiMetadata(); } else { collapseAiMetadata(); }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        resetFormDirty();
    } catch (err) {
        showToast(t('editError') + err.message, 'error');
    }
}

function softClearForNextItem() {
    document.getElementById('inventoryFormTitle').innerText = t('inventoryFormTitle');
    document.getElementById('btnResetFormState').classList.add('hidden');
    document.getElementById('editTargetItemId').value = '';
    document.getElementById('invItemName').value = '';
    document.getElementById('invItemBrand').value = '';
    resetCascadingCategorySelects();
    document.getElementById('invItemImageUrl').value = '';
    document.getElementById('invItemRemarks').value = '';
    document.getElementById('invItemAiMetadata').value = '';
    document.getElementById('invItemPurchaseDate').value = '';
    document.getElementById('invItemWarrantyDate').value = '';
    document.getElementById('invItemExpiryDate').value = '';
    document.getElementById('invItemUom').value = '';
    document.getElementById('invItemMinQuantity').value = '';
    clearStockLocationRows();
    switchItemType('unique');
    document.getElementById('invItemTypeValue').value = 'unique';
    _pendingImageMeta = null;
    _lastUploadedImageFile = null;
    _imageUploadState = 'idle';
    resetFormDirty();
    var preview = document.getElementById('invItemImagePreview');
    preview.src = '';
    preview.classList.add('hidden');
    document.getElementById('btnAIAnalyze').style.display = 'none';
}

function clearAllInventoryFields() {
    document.getElementById('inventoryFormTitle').innerText = t('inventoryFormTitle');
    document.getElementById('btnResetFormState').classList.add('hidden');
    document.getElementById('editTargetItemId').value = '';
    document.getElementById('invItemName').value = '';
    document.getElementById('invItemBrand').value = '';
    document.getElementById('invItemSegmentSelect').value = '';
    resetCascadingCategorySelects();
    document.getElementById('invItemContainerSelect').innerHTML = '<option value="">' + t('chooseContainer') + '</option>';
    document.getElementById('invItemSubContainerSelect').innerHTML = '<option value="">' + t('chooseSubContainer') + '</option>';
    document.getElementById('invItemImageUrl').value = '';
    document.getElementById('invItemRemarks').value = '';
    document.getElementById('invItemAiMetadata').value = '';
    document.getElementById('invItemPurchaseDate').value = '';
    document.getElementById('invItemWarrantyDate').value = '';
    document.getElementById('invItemExpiryDate').value = '';
    document.getElementById('invItemUom').value = '';
    document.getElementById('invItemMinQuantity').value = '';
    clearStockLocationRows();
    switchItemType('unique');
    document.getElementById('invItemTypeValue').value = 'unique';
    _pendingImageMeta = null;
    _lastUploadedImageFile = null;
    _imageUploadState = 'idle';
    resetFormDirty();
    var preview = document.getElementById('invItemImagePreview');
    preview.src = '';
    preview.classList.add('hidden');
    document.getElementById('btnAIAnalyze').style.display = 'none';
    if (document.getElementById('invItemOwnerSelect')) {
        document.getElementById('invItemOwnerSelect').value = appState.currentUser || 'Default';
    }
}

function clearInventoryFormContext() {
    document.getElementById('inventoryFormTitle').innerText = t('inventoryFormTitle');
    document.getElementById('btnResetFormState').classList.add('hidden');
    document.getElementById('editTargetItemId').value = '';
    document.getElementById('invItemName').value = '';
    document.getElementById('invItemBrand').value = '';
    document.getElementById('invItemSegmentSelect').value = '';
    resetCascadingCategorySelects();
    document.getElementById('invItemContainerSelect').innerHTML = '<option value="">' + t('chooseContainer') + '</option>';
    document.getElementById('invItemSubContainerSelect').innerHTML = '<option value="">' + t('chooseSubContainer') + '</option>';
    document.getElementById('invItemImageUrl').value = '';
    document.getElementById('invItemRemarks').value = '';
    document.getElementById('invItemAiMetadata').value = '';
    document.getElementById('invItemPurchaseDate').value = '';
    document.getElementById('invItemWarrantyDate').value = '';
    document.getElementById('invItemExpiryDate').value = '';
    document.getElementById('invItemUom').value = '';
    document.getElementById('invItemMinQuantity').value = '';
    clearStockLocationRows();
    switchItemType('unique');
    document.getElementById('invItemTypeValue').value = 'unique';
    _pendingImageMeta = null;
    _lastUploadedImageFile = null;
    _imageUploadState = 'idle';
    resetFormDirty();
    var preview = document.getElementById('invItemImagePreview');
    preview.src = '';
    preview.classList.add('hidden');
    document.getElementById('btnAIAnalyze').style.display = 'none';
    if (document.getElementById('invItemOwnerSelect')) {
        document.getElementById('invItemOwnerSelect').value = appState.currentUser || 'Default';
    }
}

function copyItemToNew(itemId) {
    var item = appState.inventory.find(i => i.id === itemId && !i.deletedAt);
    if (!item) return;
    setupItemModificationContext(itemId);
    document.getElementById('editTargetItemId').value = '';
    document.getElementById('inventoryFormTitle').innerText = t('inventoryFormTitle');
    document.getElementById('btnResetFormState').classList.add('hidden');
    _pendingImageMeta = null;
    _imageUploadState = 'idle';
    showToast('Copied "' + item.name + '" — edit and save as new item', 'info');
}

async function removeItemFromInventory(itemId) {
    var ok = await showAppConfirm(t('confirmDeleteItem'), 'Delete');
    if (!ok) return;
    var item = appState.inventory.find(function(i) { return i.id === itemId; });
    if (item) {
        item.deletedAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();
        item.version = (item.version || 1) + 1;
        item.lastModifiedBy = appState.meta.deviceId;
        removeItemImagesQuiet(item);
    }
    mutateState('REMOVE_ITEM', { itemId: itemId });
    syncUIComponents();
}

function compressImageFile(file, maxPx, quality, callback) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            var w = img.width, h = img.height;
            if (w > maxPx || h > maxPx) {
                var ratio = Math.min(maxPx / w, maxPx / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            var compressed = canvas.toDataURL('image/jpeg', quality);
            callback(compressed);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

var _lastUploadedImageFile = null;

var _imageUploadState = 'idle';

function handleAssetImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    _lastUploadedImageFile = file;
    _imageUploadState = 'uploading';
    showToast('Uploading photo...', 'info');

    var tempId = 'new_' + Date.now().toString(36);
    saveUploadedImage(file, tempId).then(function(result) {
        _imageUploadState = 'ok';
        document.getElementById('invItemImageUrl').value = '';
        var preview = document.getElementById('invItemImagePreview');
        preview.src = result.blobUrl || result.dataUrl;
        preview.classList.remove('hidden');
        document.getElementById('btnAIAnalyze').style.display = '';
    }).catch(function(err) {
        _imageUploadState = 'failed';
        _lastUploadedImageFile = null;
        _pendingImageMeta = null;
        console.error('[upload] Cloud upload failed:', err);
        var msg = (err.message || 'Unknown error');
        if (msg.indexOf('Cloud sync not configured') !== -1 || msg.indexOf('Upload returned no URL') !== -1 || msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1) {
            msg = 'Photo upload failed. Check Cloud Engine settings and Apps Script deployment.';
        }
        showToast(msg, 'error');
        var preview = document.getElementById('invItemImagePreview');
        preview.src = '';
        preview.classList.add('hidden');
        document.getElementById('btnAIAnalyze').style.display = 'none';
    });
    event.target.value = '';
}

function updateImagePreviewFromUrl() {
    const url = document.getElementById('invItemImageUrl').value.trim();
    const preview = document.getElementById('invItemImagePreview');
    const normalized = normalizeDriveUrl(url);
    if (normalized) {
        preview.src = normalized;
        preview.classList.remove('hidden');
        document.getElementById('btnAIAnalyze').style.display = '';
    } else {
        preview.src = '';
        preview.classList.add('hidden');
        document.getElementById('btnAIAnalyze').style.display = 'none';
    }
}

async function aiAnalyzeImage() {
    const storedUrl = document.getElementById('invItemImageUrl').value.trim();
    if (!storedUrl && !_lastUploadedImageFile && !_pendingImageMeta) { showToast('Upload an image first.', 'error'); return; }

    const apiKey = localStorage.getItem('sys_ds_api_key');
    if (!apiKey) { showToast(t('aiNoKey'), 'error'); return; }

    const btn = document.getElementById('btnAIAnalyze');
    btn.disabled = true;
    btn.innerText = 'Analyzing...';

    try {
        var imageUrl = storedUrl;
        if (_lastUploadedImageFile) {
            imageUrl = await new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function() { resolve(reader.result); };
                reader.onerror = function() { reject(new Error('Failed to read image file')); };
                reader.readAsDataURL(_lastUploadedImageFile);
            });
            _lastUploadedImageFile = null;
        } else if (_pendingImageMeta && _pendingImageMeta.fullKey) {
            var fullRecord = await idbGetImage(_pendingImageMeta.fullKey);
            if (fullRecord && fullRecord.blob) {
                imageUrl = await blobToDataUrl(fullRecord.blob);
            }
        } else if (!imageUrl) {
            var editId = document.getElementById('editTargetItemId').value;
            if (editId) {
                var item = appState.inventory.find(function(i) { return i.id === editId; });
                if (item && item.imageSourceType === 'idb' && item.imageFullKey) {
                    var record = await idbGetImage(item.imageFullKey);
                    if (record && record.blob) {
                        imageUrl = await blobToDataUrl(record.blob);
                    }
                }
            }
        }
        var categories = flattenCategoryTreeToLinearRoutes(appState.categories);
        var categoriesHint = categories.length > 0 ? categories.join(' | ') : 'Uncategorized';
        var itemName = document.getElementById('invItemName').value.trim() || '';
        var brand = document.getElementById('invItemBrand').value.trim() || '';
        var contextParts = [];
        if (itemName) contextParts.push('Item name: "' + itemName + '"');
        if (brand) contextParts.push('Brand: "' + brand + '"');
        contextParts.push('Existing categories: ' + categoriesHint);
        var contextStr = contextParts.join('. ');

        var systemPrompt = 'You are a precise home inventory vision classifier. Analyze the provided image of a household item and extract its exact metadata into a strict JSON format.\n\n'
            + 'CRITICAL RULE: Rely ONLY on the visual evidence in the image. Do not generalize or assume items are clothing unless clearly shown.\n\n'
            + 'RETURN ONLY A RAW JSON OBJECT. Do not include markdown code blocks (e.g., ```json), intro text, or explanations.\n\n'
            + 'JSON Structure and Constraints:\n'
            + '{\n'
            + '  "category": "String. The best matching full hierarchical category path (e.g., Home Automation/Sensors).",\n'
            + '  "aiMetadata": "String. Concise visual attributes (color, material, approximate size, item type, condition). STRICTLY under 200 characters.",\n'
            + '  "itemName": "String. A descriptive name for the specific item seen.",\n'
            + '  "brand": "String. The visible brand name. If no brand is visible, return unbranded."\n'
            + '}\n\n'
            + 'Rules:\n'
            + '1. Break down the visual details objectively. Look for logos, text, textures, or specific hardware shapes before deciding on the name and category.\n'
            + '2. Omit any key if its value cannot be confidently determined from the image. Do not fabricate or guess data.\n'
            + '3. Ensure all JSON strings are properly escaped to prevent parsing errors.';

        var content = '';
        var usedVision = false;
        var visionErrMsg = '';

        function extractContent(msg) {
            if (!msg) return '';
            if (typeof msg.content === 'string') return msg.content;
            if (Array.isArray(msg.content)) {
                return msg.content.map(function(p) { return p.text || ''; }).join(' ');
            }
            return '';
        }

        // Vision call
        if (imageUrl.indexOf('data:image') === 0 || imageUrl.indexOf('http') === 0) {
            try {
                var visResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: [
                                { type: 'text', text: contextStr + '. Analyze the image of this household item and return the strict JSON with category, aiMetadata, itemName, brand fields.' },
                                { type: 'image_url', image_url: { url: imageUrl } }
                            ]}
                        ],
                        temperature: 0.2, max_tokens: 600
                    })
                });
                var visData = await visResp.json();
                if (visData.error) {
                    visionErrMsg = visData.error.message || JSON.stringify(visData.error);
                } else if (visData.choices && visData.choices[0]) {
                    content = extractContent(visData.choices[0].message);
                    if (content) usedVision = true;
                }
                if (!usedVision) visionErrMsg = visionErrMsg || 'Vision model returned empty response';
            } catch (visErr) {
                visionErrMsg = visErr.message;
            }
        } else {
            visionErrMsg = 'Image is not a valid URL or data URI';
        }

        // Text fallback when vision is unavailable
        if (!usedVision) {
            console.log('Vision mode unavailable (' + visionErrMsg + '), using text-only analysis');
            var txtResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: contextStr + '. Based on the item name and brand provided, suggest a matching category and description. Return the strict JSON.' }
                    ],
                    temperature: 0.3, max_tokens: 500
                })
            });
            var txtData = await txtResp.json();
            if (txtData.error) throw new Error(txtData.error.message || JSON.stringify(txtData.error));
            if (txtData.choices && txtData.choices[0]) content = extractContent(txtData.choices[0].message);
        }

        if (!content) throw new Error('Empty AI response');

        // Parse JSON from response — handle markdown fences
        var jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in AI response: ' + content.substring(0, 200));
        var meta = JSON.parse(jsonMatch[0]);

        // Apply category with fuzzy fallback
        if (meta.category) {
            var matched = tryMatchCategoryPath(meta.category, categories);
            if (matched) {
                setCascadingCategorySelects(matched);
            } else {
                setCascadingCategorySelects(meta.category);
            }
        }

        // Apply AI metadata
        var aiDesc = meta.aiMetadata || meta.description || meta.desc || '';
        if (typeof aiDesc === 'object') aiDesc = JSON.stringify(aiDesc);
        if (aiDesc) document.getElementById('invItemAiMetadata').value = aiDesc;

        // Suggest item name if empty
        if (meta.itemName && !itemName) {
            document.getElementById('invItemName').value = meta.itemName;
        }

        // Suggest brand if empty
        if (meta.brand && !brand) {
            document.getElementById('invItemBrand').value = meta.brand;
        }

        btn.innerText = usedVision ? '\u2713 Analyzed' : '\u2713 Text';
        setTimeout(function() { btn.innerText = 'AI Analyze'; }, 2500);

    } catch (err) {
        btn.innerText = 'AI Analyze';
        showToast('AI analysis failed: ' + err.message, 'error');
    }
    btn.disabled = false;
}

function tryMatchCategoryPath(aiCategory, categoryList) {
    if (!aiCategory || !categoryList) return null;
    var exact = categoryList.find(function(c) { return c === aiCategory; });
    if (exact) return exact;
    var lower = aiCategory.toLowerCase();
    var contains = categoryList.find(function(c) { return c.toLowerCase().indexOf(lower) >= 0; });
    if (contains) return contains;
    var parts = aiCategory.split(' > ');
    for (var i = parts.length; i >= 1; i--) {
        var prefix = parts.slice(0, i).join(' > ');
        var prefixMatch = categoryList.find(function(c) { return c.toLowerCase().indexOf(prefix.toLowerCase()) >= 0; });
        if (prefixMatch) return prefixMatch;
    }
    return null;
}

/* ==========================================================================
   Section 6: Excel Sheet Processor Engine (SheetJS) - Multi-Sheet Support
   ========================================================================== */
function exportLocalDatabasesToExcel() {
    var btn = document.querySelector('#btnExportXlsx');
    if (appState.inventory.length === 0) {
        showToast(t('noItemsExport'), 'error');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Generating\u2026';
        btn.classList.add('opacity-60');
    }

    var EXCEL_CELL_MAX = 32700;
    function safeCell(val) {
        if (typeof val !== 'string') return val;
        if (val.length <= EXCEL_CELL_MAX) return val;
        return '[TRUNCATED] ' + val.substring(0, EXCEL_CELL_MAX - 30) + ' [\u2026orig ' + val.length + ' chars]';
    }

    try {
        var columns = [
            "System ID",
            "Barcode ID",
            "Item Name",
            "Brand",
            "Item Type",
            "Classification Route",
            "Segment Zone",
            "Container",
            "Sub-Container",
            "Owner",
            "AI Metadata",
            "Purchase Date",
            "Warranty Date",
            "Expiry Date",
            "UOM",
            "Quantity",
            "Min Quantity",
            "Stock Entries JSON",
            "Image Link Asset",
            "User Remarks Annotation",
            "Last System Entry Update"
        ];

        var flatRows = appState.inventory.filter(function(item) { return !item.deletedAt; }).map(function(item) {
            var stockJson = '';
            if (item.itemType === 'stock' && item.stockEntries) {
                stockJson = safeCell(JSON.stringify(item.stockEntries));
            }
            return {
                "System ID": safeCell(item.id || ''),
                "Barcode ID": safeCell(item.barcodeId || ''),
                "Item Name": safeCell(item.name || ''),
                "Brand": safeCell(item.brand || ''),
                "Item Type": item.itemType === 'stock' ? 'stock' : 'unique',
                "Classification Route": safeCell(item.category || ''),
                "Segment Zone": safeCell(item.segment || ''),
                "Container": safeCell(item.container || ''),
                "Sub-Container": safeCell(item.subContainer || ''),
                "Owner": safeCell(item.owner || 'Default'),
                "AI Metadata": safeCell(item.aiMetadata || ''),
                "Purchase Date": safeCell(item.purchaseDate || ''),
                "Warranty Date": safeCell(item.warrantyDate || ''),
                "Expiry Date": safeCell(item.expiryDate || ''),
                "UOM": item.itemType === 'stock' ? safeCell(item.uom || '') : '',
                "Quantity": item.itemType === 'stock' ? getTotalStockQuantity(item) : '',
                "Min Quantity": item.itemType === 'stock' ? (item.minQuantity || 0) : '',
                "Stock Entries JSON": stockJson,
                "Image Link Asset": safeCell(getRenderableImageSrc(item, false).replace(/^https:\/\/placehold\.co\/100\?text=No\+Photo$/, '')),
                "User Remarks Annotation": safeCell(item.remarks || ''),
                "Last System Entry Update": safeCell(item.timestamp || '')
            };
        });

        var spatialRows = [];
        if (appState.spatialBackgroundImage) {
            var imgData = appState.spatialBackgroundImage;
            if (typeof imgData === 'string' && imgData.length > EXCEL_CELL_MAX) {
                imgData = '[TRUNCATED] ' + imgData.substring(0, EXCEL_CELL_MAX - 30) + ' [\u2026orig ' + imgData.length + ' chars]';
            }
            spatialRows.push({"Type":"LAYOUT_IMAGE","Segment":"","Container":"","Sub-Container":"","Coordinate X (%)":"","Coordinate Y (%)":"","ImageData":imgData});
        }
        for (var seg in appState.segments) {
            if (!appState.segments.hasOwnProperty(seg)) continue;
            var containerMap = appState.segments[seg];
            for (var con in containerMap) {
                if (!containerMap.hasOwnProperty(con)) continue;
                var key = buildCoordKey(seg, con, '');
                var coord = appState.coordinates[key];
                if (coord) spatialRows.push({"Type":"COORDINATE","Segment":seg,"Container":con,"Sub-Container":"","Coordinate X (%)":coord.x,"Coordinate Y (%)":coord.y,"ImageData":""});
                var subList = containerMap[con] || [];
                subList.forEach(function(sub) {
                    var subKey = buildCoordKey(seg, con, sub);
                    var subCoord = appState.coordinates[subKey];
                    if (subCoord) spatialRows.push({"Type":"COORDINATE","Segment":seg,"Container":con,"Sub-Container":sub,"Coordinate X (%)":subCoord.x,"Coordinate Y (%)":subCoord.y,"ImageData":""});
                });
            }
        }

        var invSheet = XLSX.utils.json_to_sheet(flatRows);

        // Set column widths for readability
        var colWidths = [22, 26, 18, 12, 28, 18, 18, 18, 14, 22, 16, 16, 14, 10, 12, 14, 24, 26, 24];
        invSheet['!cols'] = colWidths.map(function(w) { return { wch: w }; });

        var workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, invSheet, "Inventory Ledger");
        if (spatialRows.length > 0) {
            var spatialSheet = XLSX.utils.json_to_sheet(spatialRows);
            spatialSheet['!cols'] = [
                { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
                { wch: 18 }, { wch: 18 }, { wch: 24 }
            ];
            XLSX.utils.book_append_sheet(workbook, spatialSheet, "Spatial Map");
        }

        var wbout = XLSX.write(workbook, { bookType:'xlsx', type:'array' });
        var blob = new Blob([wbout], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Home_Inventory_Export_' + Math.floor(Date.now()/1000) + '.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    } catch(err) {
        showToast('Export failed: ' + err.message, 'error');
    }

    if (btn) {
        btn.disabled = false;
        btn.innerText = 'Generate .xlsx Export';
        btn.classList.remove('opacity-60');
    }
}

function importExcelToLocalDatabases(event) {
    var file = event.target.files[0];
    if (!file) return;

    function cleanCell(val) {
        if (typeof val !== 'string') return val;
        var m = val.match(/^\[TRUNCATED\]\s([\s\S]*?)\s\[\u2026orig\s\d+\schars\]$/);
        if (m) return m[1];
        return val;
    }

    function hasValue(v) {
        if (v === undefined || v === null) return false;
        if (typeof v === 'string' && v.trim() === '') return false;
        return true;
    }

    function findExistingItemForImport(row) {
        var sysId = cleanCell(row["System ID"]);
        if (sysId && typeof sysId === 'string' && sysId.trim()) {
            var byId = appState.inventory.find(function(i) { return !i.deletedAt && i.id === sysId.trim(); });
            if (byId) return byId;
        }
        var barcode = cleanCell(row["Barcode ID"]);
        if (barcode && typeof barcode === 'string' && barcode.trim()) {
            var byBarcode = appState.inventory.find(function(i) { return !i.deletedAt && i.barcodeId === barcode.trim(); });
            if (byBarcode) return byBarcode;
        }
        return null;
    }

    function validateImportRow(row) {
        var itemType = cleanCell(row["Item Type"]);
        if (itemType && typeof itemType === 'string' && itemType.trim()) {
            var type = itemType.trim().toLowerCase();
            if (type !== 'unique' && type !== 'stock') {
                return { valid: false, reason: "Invalid Item Type: '" + itemType + "'. Must be 'unique' or 'stock'." };
            }
        }
        var stockRaw = cleanCell(row["Stock Entries JSON"]);
        if (hasValue(stockRaw)) {
            try {
                var parsed = JSON.parse(String(stockRaw).trim());
                if (!Array.isArray(parsed)) {
                    return { valid: false, reason: "Stock Entries JSON must be an array." };
                }
            } catch(e) {
                return { valid: false, reason: "Invalid Stock Entries JSON: " + e.message };
            }
        }
        var qty = cleanCell(row["Quantity"]);
        if (hasValue(qty) && typeof qty !== 'number') {
            var qtyNum = Number(String(qty).trim());
            if (isNaN(qtyNum) || !isFinite(qtyNum) || qtyNum < 0) {
                return { valid: false, reason: "Invalid Quantity: '" + String(qty) + "'" };
            }
        }
        var minQty = cleanCell(row["Min Quantity"]);
        if (hasValue(minQty) && typeof minQty !== 'number') {
            var minQtyNum = Number(String(minQty).trim());
            if (isNaN(minQtyNum) || !isFinite(minQtyNum) || minQtyNum < 0) {
                return { valid: false, reason: "Invalid Min Quantity: '" + String(minQty) + "'" };
            }
        }
        var dates = ['Purchase Date', 'Warranty Date', 'Expiry Date'];
        for (var d = 0; d < dates.length; d++) {
            var dateVal = cleanCell(row[dates[d]]);
            if (hasValue(dateVal)) {
                var parsedDate = new Date(String(dateVal));
                if (isNaN(parsedDate.getTime())) {
                    return { valid: false, reason: "Invalid date in '" + dates[d] + "': '" + String(dateVal) + "'" };
                }
            }
        }
        return { valid: true };
    }

    function patchInventoryItemFromImport(existingItem, row) {
        var item = {};
        for (var k in existingItem) {
            if (Object.prototype.hasOwnProperty.call(existingItem, k)) {
                if (k === 'stockEntries' && Array.isArray(existingItem[k])) {
                    item[k] = existingItem[k].map(function(e) { return Object.assign({}, e); });
                } else if (typeof existingItem[k] === 'object' && existingItem[k] !== null) {
                    item[k] = Object.assign({}, existingItem[k]);
                } else {
                    item[k] = existingItem[k];
                }
            }
        }

        var itemType = cleanCell(row["Item Type"]);
        if (hasValue(itemType)) item.itemType = String(itemType).trim().toLowerCase();

        var name = cleanCell(row["Item Name"]);
        if (hasValue(name)) item.name = String(name);

        var brand = cleanCell(row["Brand"]);
        if (hasValue(brand)) item.brand = String(brand);

        var category = cleanCell(row["Classification Route"]);
        if (hasValue(category)) item.category = String(category);

        var segment = cleanCell(row["Segment Zone"]);
        if (hasValue(segment)) item.segment = String(segment);

        var container = cleanCell(row["Container"]);
        if (hasValue(container)) item.container = String(container);

        var subContainer = cleanCell(row["Sub-Container"]);
        if (hasValue(subContainer)) item.subContainer = String(subContainer);

        var owner = cleanCell(row["Owner"]);
        if (hasValue(owner)) item.owner = String(owner);

        var aiMd = cleanCell(row["AI Metadata"]);
        if (hasValue(aiMd)) item.aiMetadata = String(aiMd);

        var purDate = cleanCell(row["Purchase Date"]);
        if (hasValue(purDate)) item.purchaseDate = String(purDate);

        var warDate = cleanCell(row["Warranty Date"]);
        if (hasValue(warDate)) item.warrantyDate = String(warDate);

        var expDate = cleanCell(row["Expiry Date"]);
        if (hasValue(expDate)) item.expiryDate = String(expDate);

        var uom = cleanCell(row["UOM"]);
        if (hasValue(uom)) item.uom = String(uom);

        var quantity = cleanCell(row["Quantity"]);
        if (hasValue(quantity)) item.quantity = parseInt(quantity) || 0;

        var minQuantity = cleanCell(row["Min Quantity"]);
        if (hasValue(minQuantity)) item.minQuantity = parseInt(minQuantity) || 0;

        var img = cleanCell(row["Image Link Asset"]);
        if (hasValue(img)) item.imageUrl = String(img);

        var rem = cleanCell(row["User Remarks Annotation"]);
        if (hasValue(rem)) item.remarks = String(rem);

        var time = cleanCell(row["Last System Entry Update"]);
        if (hasValue(time)) item.timestamp = String(time);

        var barcodeId = cleanCell(row["Barcode ID"]);
        if (hasValue(barcodeId) && !item.barcodeId) {
            item.barcodeId = String(barcodeId).trim();
        }

        var stockRaw = cleanCell(row["Stock Entries JSON"]);
        if (hasValue(stockRaw)) {
            var stockEntries = [];
            if (item.itemType === 'stock') {
                try { stockEntries = JSON.parse(String(stockRaw).trim()); } catch(ee) { stockEntries = []; }
            }
            item.stockEntries = stockEntries;
            if (item.itemType === 'stock' && stockEntries.length > 0) {
                item.quantity = getTotalStockQuantity(item);
            }
        }

        item.updatedAt = new Date().toISOString();
        item.version = (item.version || 0) + 1;
        item.lastModifiedBy = appState.meta.deviceId;

        return item;
    }

    function createNewItemFromImport(row) {
        var id = generateItemId();
        var name = cleanCell(row["Item Name"]) || 'Unnamed Imported Asset';
        var brand = cleanCell(row["Brand"]) || '';
        var category = cleanCell(row["Classification Route"]) || '';
        var segment = cleanCell(row["Segment Zone"]) || '';
        var container = cleanCell(row["Container"]) || '';
        var subContainer = cleanCell(row["Sub-Container"]) || '';
        var owner = cleanCell(row["Owner"]) || 'Default';
        var aiMd = cleanCell(row["AI Metadata"]) || '';
        var purDate = cleanCell(row["Purchase Date"]) || '';
        var warDate = cleanCell(row["Warranty Date"]) || '';
        var expDate = cleanCell(row["Expiry Date"]) || '';
        var itemType = cleanCell(row["Item Type"]);
        itemType = (itemType && typeof itemType === 'string' && itemType.trim()) ? String(itemType).trim().toLowerCase() : 'unique';
        var uom = cleanCell(row["UOM"]) || '';
        var quantity = parseInt(cleanCell(row["Quantity"])) || 0;
        var minQuantity = parseInt(cleanCell(row["Min Quantity"])) || 0;
        var img = cleanCell(row["Image Link Asset"]) || '';
        var rem = cleanCell(row["User Remarks Annotation"]) || '';
        var time = cleanCell(row["Last System Entry Update"]) || new Date().toISOString().replace('T', ' ').substring(0, 16);
        var barcodeId = cleanCell(row["Barcode ID"]) || '';
        var stockRaw = cleanCell(row["Stock Entries JSON"]) || '';
        var stockEntries = [];
        if (stockRaw && itemType === 'stock') {
            try { stockEntries = JSON.parse(String(stockRaw).trim()); } catch(ee) { stockEntries = []; }
        }
        var nowIso = new Date().toISOString();
        var item = {
            id: id, name: name, brand: brand, category: category, segment: segment,
            container: container, subContainer: subContainer, owner: owner,
            aiMetadata: aiMd, purchaseDate: purDate, warrantyDate: warDate,
            expiryDate: expDate, itemType: itemType, uom: uom,
            quantity: quantity, minQuantity: minQuantity, imageUrl: img,
            stockEntries: stockEntries,
            remarks: rem, timestamp: time,
            createdAt: nowIso, updatedAt: nowIso, deletedAt: null,
            version: 1, lastModifiedBy: appState.meta.deviceId
        };
        if (barcodeId) item.barcodeId = String(barcodeId);
        if (itemType === 'stock' && stockEntries.length > 0) {
            item.quantity = getTotalStockQuantity(item);
        }
        return item;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });

            var invSheetName = workbook.SheetNames.find(function(n) { return n === "Inventory Ledger"; }) || workbook.SheetNames[0];
            var importErrors = [];
            var patchCount = 0;
            var newCount = 0;
            var skipCount = 0;

            if (invSheetName && workbook.Sheets[invSheetName]) {
                var rows = XLSX.utils.sheet_to_json(workbook.Sheets[invSheetName]);
                rows.forEach(function(r, rowIdx) {
                    var rowNum = rowIdx + 2;

                    var validation = validateImportRow(r);
                    if (!validation.valid) {
                        importErrors.push("Row " + rowNum + ": " + validation.reason);
                        skipCount++;
                        return;
                    }

                    var existingItem = findExistingItemForImport(r);

                    if (existingItem) {
                        var patchedItem = patchInventoryItemFromImport(existingItem, r);
                        var existingIdx = appState.inventory.findIndex(function(i) { return i.id === existingItem.id; });
                        if (existingIdx !== -1) {
                            appState.inventory[existingIdx] = patchedItem;
                        }
                        patchCount++;

                        if (patchedItem.segment) {
                            if (!appState.segments[patchedItem.segment]) appState.segments[patchedItem.segment] = {};
                            if (patchedItem.container && !appState.segments[patchedItem.segment][patchedItem.container]) {
                                appState.segments[patchedItem.segment][patchedItem.container] = [];
                            }
                            if (patchedItem.subContainer && patchedItem.container && !appState.segments[patchedItem.segment][patchedItem.container].includes(patchedItem.subContainer)) {
                                appState.segments[patchedItem.segment][patchedItem.container].push(patchedItem.subContainer);
                            }
                        }
                        if (patchedItem.owner && patchedItem.owner !== 'Default' && !appState.users.includes(patchedItem.owner)) {
                            appState.users.push(patchedItem.owner);
                        }
                    } else {
                        var itemName = cleanCell(r["Item Name"]);
                        if (!itemName || (typeof itemName === 'string' && !itemName.trim())) {
                            importErrors.push("Row " + rowNum + ": Missing Item Name for new item.");
                            skipCount++;
                            return;
                        }

                        var newItem = createNewItemFromImport(r);
                        appState.inventory.push(newItem);
                        newCount++;

                        if (newItem.segment) {
                            if (!appState.segments[newItem.segment]) appState.segments[newItem.segment] = {};
                            if (newItem.container && !appState.segments[newItem.segment][newItem.container]) {
                                appState.segments[newItem.segment][newItem.container] = [];
                            }
                            if (newItem.subContainer && newItem.container && !appState.segments[newItem.segment][newItem.container].includes(newItem.subContainer)) {
                                appState.segments[newItem.segment][newItem.container].push(newItem.subContainer);
                            }
                        }
                        if (newItem.owner && newItem.owner !== 'Default' && !appState.users.includes(newItem.owner)) {
                            appState.users.push(newItem.owner);
                        }
                    }
                });
            }

            var spatialSheetName = workbook.SheetNames.find(function(n) { return n === "Spatial Map"; });
            if (spatialSheetName && workbook.Sheets[spatialSheetName]) {
                var sRows = XLSX.utils.sheet_to_json(workbook.Sheets[spatialSheetName]);
                sRows.forEach(function(r) {
                    var imgData = cleanCell(r["ImageData"]);
                    if (r["Type"] === "LAYOUT_IMAGE" && imgData && (imgData+'').indexOf('data:image') === 0) {
                        appState.spatialBackgroundImage = imgData+'';
                    } else if ((r["Type"] === "COORDINATE" || !r["Type"]) && r["Segment"]) {
                        var seg = cleanCell(r["Segment"]) || '', con = cleanCell(r["Container"]) || '', sub = cleanCell(r["Sub-Container"]) || '';
                        var x = parseInt(r["Coordinate X (%)"]) || 0, y = parseInt(r["Coordinate Y (%)"]) || 0;
                        if (seg && con) {
                            if (!appState.segments[seg]) appState.segments[seg] = {};
                            if (!appState.segments[seg][con]) appState.segments[seg][con] = [];
                            if (sub) {
                                if (!appState.segments[seg][con].includes(sub)) appState.segments[seg][con].push(sub);
                                appState.coordinates[buildCoordKey(seg, con, sub)] = { x: x, y: y };
                            } else {
                                appState.coordinates[buildCoordKey(seg, con, '')] = { x: x, y: y };
                            }
                        }
                    }
                });
            }

            saveStateToLocalStorage();
            syncUIComponents();

            var summary = [];
            if (patchCount > 0) summary.push(patchCount + " item(s) updated");
            if (newCount > 0) summary.push(newCount + " new item(s) added");
            if (skipCount > 0) summary.push(skipCount + " row(s) skipped");
            if (summary.length === 0) summary.push("No items processed");
            showToast("Import: " + summary.join(", "), skipCount > 0 && (patchCount + newCount) > 0 ? 'info' : 'success');

            if (importErrors.length > 0) {
                showAppAlert("Import Errors — " + skipCount + " row(s) skipped:\n\n" + importErrors.join('\n'));
            }
        } catch(err) {
            showToast("Error decoding file contents: " + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

/* ==========================================================================
   Section 7: Google Apps Script Synchronization Engine
   ========================================================================== */
function commitCloudSystemCredentials() {
    const url = document.getElementById('settingGoogleAppsScriptUrl').value.trim();
    const pagePwd = document.getElementById('settingSystemPassword').value.trim();
    const token = document.getElementById('settingApiSecretToken').value.trim();
    const dsKey = document.getElementById('settingDeepSeekApiKey').value.trim();

    if(url) localStorage.setItem('sys_gas_url', url);
    if(pagePwd) localStorage.setItem('sys_page_pwd', pagePwd);
    if(token) localStorage.setItem('sys_api_pwd', token);
    if(dsKey) localStorage.setItem('sys_ds_api_key', dsKey);

    showToast('Local infrastructure access profile updated.', 'success');
}

async function triggerSynchronousCloudBackupPush(baseRevision) {
    const endpoint = localStorage.getItem('sys_gas_url');
    const secret = localStorage.getItem('sys_api_pwd');
    if(!endpoint) { return { success: false, error: 'No endpoint' }; }

    var segKeysBefore = Object.keys(appState.segments || {}).length;
    console.log('[push] start baseRev=' + (baseRevision !== undefined ? baseRevision : 'none') +
        ' segs=' + segKeysBefore + ' queue=' + (appState.syncQueue || []).length);

    // Guard: background pushes (no baseRevision) must not run during active syncNow.
    if (baseRevision === undefined && _syncInProgress) {
        console.log('[push] skipped – sync already in progress');
        return { success: false, error: 'sync in progress' };
    }

    try {
        var opsToSend = (appState.syncQueue || []).slice();
        var stateJson = buildSyncPayload();

        var params = new URLSearchParams();
        params.append('token', secret);
        params.append('action', 'SYNC_PUSH');
        params.append('payload', stateJson);
        params.append('operations', JSON.stringify(opsToSend));
        params.append('clientRevision', appState.meta.lastServerRevision || '');
        if (baseRevision !== undefined && baseRevision !== null) {
            params.append('baseRevision', String(baseRevision));
        }

        var resp = await fetch(endpoint, {
            method: 'POST',
            body: params
        });
        var text = await resp.text();
        var result;
        try { result = JSON.parse(text); } catch(e) { result = null; }

        if (result && result.success) {
            appState.meta.lastSyncedAt = new Date().toISOString();
            appState.meta.lastServerRevision = result.revision || null;
            appState.syncQueue = [];
            _syncLastFailed = false;
            _syncConflict = false;
            updateSyncStatusBadge();
            return { success: true, revision: result.revision };
        } else if (result && result.errorType === 'revision_mismatch') {
            return {
                success: false,
                conflict: true,
                currentRevision: result.currentRevision,
                error: result.message || 'Revision mismatch'
            };
        } else {
            _syncLastFailed = true;
            updateSyncStatusBadge();
            return { success: false, error: (result && result.error) || 'unknown' };
        }
    } catch (e) {
        _syncLastFailed = true;
        updateSyncStatusBadge();
        return { success: false, error: e.message };
    }
}

async function triggerBackgroundSync() {
    var endpoint = localStorage.getItem('sys_gas_url');
    if (!endpoint) return;
    setTimeout(async function() {
        if (_syncInProgress) return;
        await triggerSynchronousCloudBackupPush();
    }, 500);
}

function buildSyncPayload() {
    return JSON.stringify(buildCloudSyncPayload(appState));
}


function getSyncPayloadSize() {
    return buildSyncPayload().length;
}

/* ==========================================================================
   Section: Reminder Engine — expiry / low-stock email dispatch
   ========================================================================== */
var _reminderLastRun = 0;
var _reminderThrottleMs = 3 * 60 * 60 * 1000;

function daysUntil(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - today) / 86400000);
}

function getDueReminderItems() {
    var results = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var limit = appState.reminderDays || 30;

    appState.inventory.forEach(function(item) {
        if (item.deletedAt) return;

        var dueTypes = [];
        var expiryDetails = [];

        if (item.itemType === 'unique') {
            var daysLeft = daysUntil(item.expiryDate);
            if (daysLeft !== null && daysLeft <= limit) {
                dueTypes.push('expiry');
                expiryDetails.push({
                    locationLabel: null,
                    expiryDate: item.expiryDate,
                    daysLeft: daysLeft
                });
            }
        }

        if (item.itemType === 'stock') {
            var totalQty = getTotalStockQuantity(item);
            var minQty = item.minQuantity || 0;
            if (minQty > 0 && totalQty <= minQty) {
                dueTypes.push('low_stock');
            }

            getActiveStockEntries(item).forEach(function(entry) {
                if (!entry.expiryDate) return;
                var dl = daysUntil(entry.expiryDate);
                if (dl !== null && dl <= limit) {
                    if (dueTypes.indexOf('expiry') === -1) dueTypes.push('expiry');
                    expiryDetails.push({
                        entryId: entry.id,
                        locationLabel: getStockLocationLabel(entry),
                        expiryDate: entry.expiryDate,
                        daysLeft: dl
                    });
                }
            });
        }

        if (dueTypes.length === 0) return;

        var owner = item.owner || 'Default';
        var ownerEmail = (appState.userEmails && appState.userEmails[owner]) || '';

        results.push({
            owner: owner,
            email: ownerEmail,
            reminderTypes: dueTypes,
            itemId: item.id,
            barcodeId: item.barcodeId || '',
            name: item.name,
            category: item.category || '',
            quantity: item.itemType === 'stock' ? getTotalStockQuantity(item) : (item.quantity || 0),
            minQuantity: item.minQuantity || 0,
            uom: item.uom || '',
            expiryDate: item.expiryDate || '',
            remarks: item.remarks || '',
            expiryDetails: expiryDetails,
            stockEntries: item.itemType === 'stock' ? getActiveStockEntries(item) : []
        });
    });

    return results;
}

function makeReminderKey(itemId, type, detailSuffix) {
    return 'rem::' + type + '::' + itemId + '::' + (detailSuffix || '');
}

function buildReminderPayload() {
    if (!appState.reminderLog) appState.reminderLog = {};
    var log = appState.reminderLog;

    var due = getDueReminderItems();
    var grouped = {};
    var warnings = [];
    var now = new Date().toISOString();

    due.forEach(function(entry) {
        if (!entry.email) {
            warnings.push(entry.owner + ' (' + entry.name + ')');
            return;
        }

        var dedupeKeys = [];
        if (entry.reminderTypes.indexOf('expiry') !== -1) {
            if (entry.expiryDetails.length > 0) {
                entry.expiryDetails.forEach(function(ed) {
                    dedupeKeys.push(makeReminderKey(entry.itemId, 'expiry', ed.entryId || 'unique'));
                });
            } else {
                dedupeKeys.push(makeReminderKey(entry.itemId, 'expiry', 'unique'));
            }
        }
        if (entry.reminderTypes.indexOf('low_stock') !== -1) {
            dedupeKeys.push(makeReminderKey(entry.itemId, 'low', entry.quantity + '_' + entry.minQuantity));
        }

        var alreadySent = dedupeKeys.every(function(k) { return log[k]; });
        if (alreadySent) return;

        if (!grouped[entry.email]) {
            grouped[entry.email] = { email: entry.email, owner: entry.owner, items: [], dedupeKeys: [] };
        }
        grouped[entry.email].items.push(entry);
        grouped[entry.email].dedupeKeys = grouped[entry.email].dedupeKeys.concat(dedupeKeys);
    });

    return { groups: Object.values(grouped), warnings: warnings };
}

function sendReminderEmails() {
    var endpoint = localStorage.getItem('sys_gas_url');
    var secret = localStorage.getItem('sys_api_pwd');
    if (!endpoint) return Promise.resolve({ error: 'No GAS endpoint configured.' });
    if (!secret) return Promise.resolve({ error: 'No API token configured.' });

    var payloadData = buildReminderPayload();
    if (payloadData.groups.length === 0) {
        return Promise.resolve({
            sent: 0,
            recipients: 0,
            warnings: payloadData.warnings,
            message: 'No due reminders found.'
        });
    }

    var params = new URLSearchParams();
    params.append('token', secret);
    params.append('action', 'SEND_REMINDERS');
    params.append('timestamp', new Date().toISOString());
    params.append('deviceId', getDeviceId());
    params.append('reminderDays', String(appState.reminderDays || 30));
    params.append('payload', JSON.stringify(payloadData.groups));

    return fetch(endpoint, { method: 'POST', body: params })
        .then(function(resp) { return resp.json(); })
        .then(function(result) {
            if (result && result.success) {
                if (!appState.reminderLog) appState.reminderLog = {};
                payloadData.groups.forEach(function(g) {
                    g.dedupeKeys.forEach(function(k) {
                        appState.reminderLog[k] = new Date().toISOString();
                    });
                });
                saveStateToLocalStorage();
                return {
                    sent: result.sent || 0,
                    recipients: result.recipients || 0,
                    warnings: payloadData.warnings,
                    message: result.sent + ' reminder email(s) sent to ' + result.recipients + ' recipient(s).'
                };
            }
            return { error: result && result.error ? result.error : 'Unknown server error.' };
        })
        .catch(function(e) {
            return { error: 'Network error: ' + e.message };
        });
}

function triggerReminderCheckNow() {
    var now = Date.now();
    if (now - _reminderLastRun < 5000) {
        showToast('Please wait before triggering again.', 'info');
        return;
    }
    _reminderLastRun = now;

    var endpoint = localStorage.getItem('sys_gas_url');
    if (!endpoint) {
        showToast('Missing Google Script URL. Configure in Cloud Engine settings.', 'error');
        return;
    }
    var secret = localStorage.getItem('sys_api_pwd');
    if (!secret) {
        showToast('Missing API token. Configure in Cloud Engine settings.', 'error');
        return;
    }

    showToast('Evaluating reminders\u2026', 'info');

    sendReminderEmails().then(function(result) {
        if (result.error) {
            showToast('Reminder send failed: ' + result.error, 'error');
        } else {
            var msg = result.message;
            if (result.warnings && result.warnings.length > 0) {
                msg += ' (' + result.warnings.length + ' item(s) skipped: missing owner email)';
            }
            showToast(msg, result.sent > 0 ? 'success' : 'info');
        }
    });
}

function triggerReminderCheckThrottled() {
    var now = Date.now();
    if (now - _reminderLastRun < _reminderThrottleMs) return;
    _reminderLastRun = now;

    var endpoint = localStorage.getItem('sys_gas_url');
    var secret = localStorage.getItem('sys_api_pwd');
    if (!endpoint || !secret) return;

    sendReminderEmails().then(function(result) {
        if (result.error) {
            console.warn('[reminder] Auto-check failed:', result.error);
        } else if (result.sent > 0) {
            console.log('[reminder] Auto-check sent ' + result.sent + ' email(s).');
        }
    });
}

function showToast(message, type) {
    var toast = document.getElementById('syncToast');
    if (!toast) return;
    toast.style.whiteSpace = '';
    toast.style.pointerEvents = '';
    clearTimeout(toast._timer);
    var icon = '';
    if (type === 'info') icon = '<span class="toast-spinner"></span>';
    else if (type === 'success') icon = '<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
    else if (type === 'error') icon = '<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
    toast.className = type;
    toast.innerHTML = icon + ' <span>' + message + '</span>';
    toast.classList.add('show');
    if (type === 'success' || type === 'error' || type === 'info') {
        toast._timer = setTimeout(function() {
            toast.classList.remove('show');
        }, 2500);
    }
}

function hideToast() {
    var toast = document.getElementById('syncToast');
    if (toast) toast.classList.remove('show');
}

async function syncNow(opts) {
    opts = opts || {};
    var interactive = opts.interactive !== false;
    var btns = document.querySelectorAll('.btn-sync-refresh');
    btns.forEach(function(b) { b.classList.add('btn-syncing'); });
    if (interactive) showToast('Syncing…', 'info');

    var endpoint = localStorage.getItem('sys_gas_url');
    var secret = localStorage.getItem('sys_api_pwd');
    if (!endpoint) {
        if (interactive) showToast(t('missingEndpointShort'), 'error');
        btns.forEach(function(b) { b.classList.remove('btn-syncing'); });
        return;
    }
    if (_syncInProgress) {
        if (interactive) showToast('Sync already in progress', 'info');
        btns.forEach(function(b) { b.classList.remove('btn-syncing'); });
        return;
    }

    _syncInProgress = true;
    _syncLastFailed = false;
    _syncConflict = false;
    updateSyncStatusBadge();
    saveStateToLocalStorage();

    try {
        if (hasUnsyncedLocalChanges(appState)) {
            var baseRev = (appState.meta && appState.meta.lastServerRevision != null) ? appState.meta.lastServerRevision : 0;
            var pushedSnapshotVersion = (appState.meta && appState.meta.localSnapshotVersion) || 0;
            var pushResult = await triggerSynchronousCloudBackupPush(baseRev);

            if (!(pushResult && pushResult.success)) {
                if (pushResult && pushResult.conflict) {
                    var conflictCloud = await getCloudState(secret, endpoint);
                    if (conflictCloud) replaceLocalStateWithCloud(conflictCloud);
                    _syncConflict = true;
                    _syncLastFailed = false;
                    if (interactive) showToast('Cloud version prevailed over local conflict.', 'warning');
                    return;
                }
                throw new Error((pushResult && pushResult.error) || 'Push failed');
            }

            applyPushSuccess(false, pushedSnapshotVersion);
        }

        var cloud = await getCloudState(secret, endpoint);
        if (cloud) replaceLocalStateWithCloud(cloud);

        _syncLastFailed = false;
        _syncConflict = false;
        if (interactive) showToast('Sync complete.', 'success');
    } catch (e) {
        console.error('[syncNow] ' + (e && e.message ? e.message : e), e);
        _syncLastFailed = true;
        _syncConflict = false;
        if (interactive) showToast('Sync failed.', 'error');
    } finally {
        _syncInProgress = false;
        btns.forEach(function(b) { b.classList.remove('btn-syncing'); });
        updateSyncStatusBadge();
        updateSyncBanner();
        updateLoginSyncStatus();
    }
}
function applyPushSuccess(interactive, pushedSnapshotVersion) {
    _syncInProgress = false; _syncLastFailed = false; _syncConflict = false;
    appState.syncQueue = [];
    appState.meta.lastPushedSnapshotVersion = pushedSnapshotVersion;
    appState.meta.lastSyncedAt = new Date().toISOString();
    saveStateToLocalStorage();
    updateSyncStatusBadge(); updateSyncBanner();
    var bedroomCons = (appState.segments && appState.segments.Bedroom) ? Object.keys(appState.segments.Bedroom).join(',') : '(none)';
    console.log('[applyPushSuccess] Bedroom containers: [' + bedroomCons + ']');
    syncUIComponents();
    triggerReminderCheckThrottled();
    if (interactive) showToast('Synced \u2014 ' + (appState.inventory || []).length + ' items', 'success');
}

function countCategoryKeys(cat) {
    if (!cat || typeof cat !== 'object') return 0;
    var count = 0;
    Object.keys(cat).forEach(function(k) { count += 1 + countCategoryKeys(cat[k]); });
    return count;
}

// ══════ FORENSIC STRUCTURE INSTRUMENTATION ═══════════════════════════════════
// FORENSIC SAFETY: never prune empty structural nodes during sync serialization.
// Empty segments/containers/sub-containers/categories ARE valid user data.

function collectSegmentPaths(segs) {
    var paths = [];
    if (!segs) return paths;
    Object.keys(segs).sort().forEach(function(seg) {
        paths.push(seg);
        var containers = segs[seg] || {};
        Object.keys(containers).sort().forEach(function(con) {
            paths.push(seg + ' > ' + con);
            var subs = containers[con] || [];
            subs.slice().sort().forEach(function(sub) {
                paths.push(seg + ' > ' + con + ' > ' + sub);
            });
        });
    });
    return paths;
}

function collectCategoryPaths(cat) {
    var paths = [];
    function walk(node, prefix) {
        if (!node || typeof node !== 'object') return;
        Object.keys(node).sort().forEach(function(k) {
            var full = prefix ? prefix + ' > ' + k : k;
            paths.push(full);
            walk(node[k], full);
        });
    }
    walk(cat, '');
    return paths;
}

function collectStructureSnapshot(state) {
    state = state || {};
    var segs = state.segments || {};
    var cats = state.categories || {};
    var coords = state.coordinates || {};
    var conCount = 0, subCount = 0;
    Object.keys(segs).forEach(function(s) {
        var cMap = segs[s] || {};
        conCount += Object.keys(cMap).length;
        Object.keys(cMap).forEach(function(c) {
            subCount += (cMap[c] || []).length;
        });
    });
    var segPaths = collectSegmentPaths(segs);
    var catPaths = collectCategoryPaths(cats);
    return {
        segCount: Object.keys(segs).length,
        conCount: conCount,
        subCount: subCount,
        catCount: catPaths.length,
        coordCount: Object.keys(coords).length,
        segPaths: segPaths,
        catPaths: catPaths,
        segKeysSorted: Object.keys(segs).sort().join(','),
        catKeysSorted: Object.keys(cats).sort().join(',')
    };
}

function diffStructureSnapshots(before, after) {
    before = before || {}; after = after || {};
    var lostSegs = (before.segPaths || []).filter(function(p) { return (after.segPaths || []).indexOf(p) === -1; });
    var lostCats = (before.catPaths || []).filter(function(p) { return (after.catPaths || []).indexOf(p) === -1; });
    return {
        anyLoss: lostSegs.length > 0 || lostCats.length > 0 ||
            after.segCount < before.segCount || after.catCount < before.catCount,
        lostSegPaths: lostSegs, lostCatPaths: lostCats,
        segCountBefore: before.segCount, segCountAfter: after.segCount,
        conCountBefore: before.conCount, conCountAfter: after.conCount,
        subCountBefore: before.subCount, subCountAfter: after.subCount,
        catCountBefore: before.catCount, catCountAfter: after.catCount,
        coordCountBefore: before.coordCount, coordCountAfter: after.coordCount
    };
}

function logStructureSnapshot(label, snap) {
    snap = snap || {};
    console.log('[snapshot] ' + label +
        ' segs=' + snap.segCount + ' cons=' + snap.conCount +
        ' subs=' + snap.subCount + ' cats=' + snap.catCount +
        ' coords=' + snap.coordCount +
        (snap.segKeysSorted !== undefined ? ' keys=[' + snap.segKeysSorted + ']' : ''));
}

function assertNoStructuralLoss(beforeSnap, afterSnap, label) {
    if (!beforeSnap || !afterSnap) return true;
    var diff = diffStructureSnapshots(beforeSnap, afterSnap);
    if (diff.anyLoss) {
        var msg = '[STRUCT-LOSS] ' + label + ': segs ' + diff.segCountBefore + '→' + diff.segCountAfter +
            ' cons ' + diff.conCountBefore + '→' + diff.conCountAfter +
            ' subs ' + diff.subCountBefore + '→' + diff.subCountAfter +
            ' cats ' + diff.catCountBefore + '→' + diff.catCountAfter;
        if (diff.lostSegPaths.length) msg += ' lostSegs=[' + diff.lostSegPaths.join('; ') + ']';
        if (diff.lostCatPaths.length) msg += ' lostCats=[' + diff.lostCatPaths.join('; ') + ']';
        console.error(msg);
        updateSyncDebugOverlay('LOSS', diff, msg);
        return false;
    }
    return true;
}

function collectExpectedDeletedPathsFromSyncQueue(queue) {
    var deleted = [];
    if (!queue || !queue.length) return deleted;
    queue.forEach(function(e) {
        if (e.op === 'DELETE_SEGMENT') deleted.push(e.meta && e.meta.name || '');
        if (e.op === 'DELETE_CONTAINER') {
            var s = e.meta && e.meta.segment || '';
            var c = e.meta && e.meta.name || '';
            if (s && c) deleted.push(s + ' > ' + c);
        }
        if (e.op === 'DELETE_SUB_CONTAINER') {
            var s = e.meta && e.meta.segment || '';
            var c = e.meta && e.meta.container || '';
            var u = e.meta && e.meta.name || '';
            if (s && c && u) deleted.push(s + ' > ' + c + ' > ' + u);
        }
        if (e.op === 'DELETE_CATEGORY') deleted.push(e.meta && e.meta.name || '');
    });
    return deleted;
}

// ══════ DEBUG OVERLAY ═════════════════════════════════════════════════════════
function ensureSyncDebugOverlay() {
    if (document.getElementById('syncDebugOverlay')) return;
    var el = document.createElement('div');
    el.id = 'syncDebugOverlay';
    el.style.cssText = 'position:fixed;bottom:4px;right:4px;z-index:99999;' +
        'background:rgba(0,0,0,0.82);color:#0f0;font:10px monospace;' +
        'padding:6px 8px;border-radius:4px;max-width:340px;white-space:pre-wrap;pointer-events:none;';
    el.innerHTML = 'sync debug: idle';
    document.body.appendChild(el);
}

function updateSyncDebugOverlay(stage, snap, extra) {
    if (localStorage.getItem('sync_debug_overlay') !== '1') {
        var el = document.getElementById('syncDebugOverlay');
        if (el) el.remove();
        return;
    }
    ensureSyncDebugOverlay();
    var el = document.getElementById('syncDebugOverlay');
    if (!el) return;
    var lines = ['stage: ' + stage];
    if (snap) {
        lines.push('seg/con/sub/cat/coord: ' +
            (snap.segCount !== undefined ? snap.segCount : snap.segs || '?') + '/' +
            (snap.conCount !== undefined ? snap.conCount : snap.cons || '?') + '/' +
            (snap.subCount !== undefined ? snap.subCount : snap.subs || '?') + '/' +
            (snap.catCount !== undefined ? snap.catCount : snap.cats || '?') + '/' +
            (snap.coordCount !== undefined ? snap.coordCount : '?'));
    }
    lines.push('rev: ' + (appState.meta.lastServerRevision || 0));
    lines.push('queue: ' + (appState.syncQueue || []).length);
    if (extra) lines.push(extra);
    el.innerHTML = lines.join('\n');
}

function normalizeStateForSync(state) {
    // FORENSIC SAFETY: never prune empty structural nodes during sync payload.
    // Empty segments, containers, sub-containers, and categories ARE valid user data.
    return buildPersistedStateSnapshot(state);
}

function applyMergedState(mergedState, revision) {
    if (!mergedState) return false;
    // Build candidate first, validate, then atomically apply.
    var candidate = normalizeStateForSync(mergedState);
    if (candidate.meta && revision) candidate.meta.lastServerRevision = revision;
    candidate.meta.lastSyncedAt = new Date().toISOString();
    candidate.meta.deviceId = appState.meta.deviceId || getDeviceId();
    candidate.syncQueue = []; // Clear only after push success

    // Validate: merged must contain all local segments (minus explicit deletes)
    var localSnap = collectStructureSnapshot(appState);
    var candSnap = collectStructureSnapshot(candidate);
    var allowedLoss = collectExpectedDeletedPathsFromSyncQueue(appState.syncQueue);
    var diff = diffStructureSnapshots(localSnap, candSnap);
    var unexpectedLoss = (diff.lostSegPaths || []).filter(function(p) {
        return allowedLoss.indexOf(p) === -1;
    });
    if (unexpectedLoss.length > 0) {
        console.error('[applyMergedState] BLOCKED: would lose segments: ' + unexpectedLoss.join('; '));
        updateSyncDebugOverlay('BLOCKED', candSnap, 'would lose: ' + unexpectedLoss.join('; '));
        return false;
    }

    // Atomic swap
    appState.segments = candidate.segments;
    appState.categories = candidate.categories;
    appState.coordinates = candidate.coordinates;
    appState.inventory = candidate.inventory;
    appState.users = candidate.users;
    appState.currentUser = candidate.currentUser;
    appState.userEmails = candidate.userEmails;
    appState.reminderDays = candidate.reminderDays;
    appState.reminderLog = candidate.reminderLog;
    appState.language = candidate.language;
    appState.spatialBackgroundImage = candidate.spatialBackgroundImage;
    appState.meta = candidate.meta;
    appState.syncQueue = candidate.syncQueue;
    saveStateToLocalStorage();
    return true;
}

function applySyncSuccess(interactive, cloudState) {
    var segsBefore = Object.keys(appState.segments || {}).length;
    var catsBefore = countCategoryKeys(appState.categories);

    _syncInProgress = false;
    _syncLastFailed = false;
    _syncConflict = false;
    appState.syncQueue = [];
    saveStateToLocalStorage();
    updateSyncStatusBadge();
    updateSyncBanner();
    syncUIComponents();

    var segsAfter = Object.keys(appState.segments || {}).length;
    var catsAfter = countCategoryKeys(appState.categories);
    if (segsAfter < segsBefore || catsAfter < catsBefore) {
        console.error('[applySyncSuccess] STRUCTURAL DATA LOSS: segs ' + segsBefore + '→' + segsAfter + ' cats ' + catsBefore + '→' + catsAfter);
    }
    console.log('[applySyncSuccess] segs=' + segsAfter + ' cats=' + catsAfter +
        ' rev=' + (appState.meta.lastServerRevision || 0));

    triggerReminderCheckThrottled();
    if (interactive) showToast('Synced \u2014 ' + ((cloudState && cloudState.inventory || []).length) + ' items', 'success');
}

async function getCloudState(secret, endpoint) {
    try {
        var params = 'token=' + encodeURIComponent(secret) + '&action=SYNC_PULL';
        var resp = await fetch(endpoint + '?' + params, { method: 'GET' });
        var json = await resp.json();
        if (json && json.segments) {
            json.meta = json.meta || {};
            return json;
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Merges cloud payload into appState in-memory (does NOT save to localStorage or update UI).
 * Returns stats about the merge.
 */
function mergeCloudPayloadToMemory(cloud) {
    if (!cloud) return null;
    var segsBefore = Object.keys(appState.segments || {}).length;
    var catsBefore = countCategoryKeys(appState.categories);

    // Debug: trace specific container through merge
    var localBedroomCons = (appState.segments && appState.segments.Bedroom) ? Object.keys(appState.segments.Bedroom).join(',') : '(none)';
    var cloudBedroomCons = (cloud.segments && cloud.segments.Bedroom) ? Object.keys(cloud.segments.Bedroom).join(',') : '(none)';
    console.log('[merge] Bedroom containers — local: [' + localBedroomCons + '] cloud: [' + cloudBedroomCons + ']');
    // 1. Users — union merge
    var localUsers = appState.users || ['Default'];
    var cloudUsers = (cloud.users && Array.isArray(cloud.users)) ? cloud.users : ['Default'];
    var mergedUsers = Array.from(new Set(['Default'].concat(localUsers).concat(cloudUsers)));
    appState.users = mergedUsers;
    // 2. userEmails — union merge
    var localEmails = appState.userEmails || {};
    var cloudEmails = cloud.userEmails || {};
    appState.userEmails = Object.assign({}, localEmails, cloudEmails);
    // 3. inventory — per-item conflict resolution by updatedAt
    var localMap = {};
    (appState.inventory || []).forEach(function(item) { localMap[item.id] = item; });
    var cloudMap = {};
    (cloud.inventory || []).forEach(function(item) { cloudMap[item.id] = item; });
    var allIds = Array.from(new Set(Object.keys(localMap).concat(Object.keys(cloudMap))));
    var stats = { localNewerKept: 0, cloudNewerApplied: 0, cloudOnlyAdded: 0, localOnlyKept: 0, cloudDeleteWins: 0, localDeleteWins: 0 };
    appState.inventory = allIds.map(function(id) {
        var local = localMap[id];
        var remote = cloudMap[id];
        var result = resolveItemConflict(local, remote);
        switch (result.resolution) {
            case 'local-newer': case 'local-higher-version': case 'local-kept-delete-stale': case 'local-kept-tie': case 'local-only':
                if (remote) stats.localNewerKept++; else stats.localOnlyKept++; break;
            case 'cloud-newer': case 'cloud-higher-version': case 'cloud-kept-delete-stale': case 'cloud-kept-tie': case 'tied-cloud-preferred': case 'cloud-only':
                if (local) stats.cloudNewerApplied++; else stats.cloudOnlyAdded++; break;
            case 'local-delete-wins': stats.localDeleteWins++; break;
            case 'cloud-delete-wins': stats.cloudDeleteWins++; break;
        }
        return result.item;
    });
    appState.inventory.forEach(function(item) { normalizeImageFields(item); });
    appState._lastMergeStats = stats;

    // 4. segments — deep union merge
    var mergedSegments = {};
    var localSeg = appState.segments || {};
    var cloudSeg = cloud.segments || {};
    var allSegKeys = Object.keys(localSeg).concat(Object.keys(cloudSeg)).filter(function(v, i, a) { return a.indexOf(v) === i; });
    allSegKeys.forEach(function(segKey) {
        var localContainers = localSeg[segKey] || {};
        var cloudContainers = cloudSeg[segKey] || {};
        var allConKeys = Object.keys(localContainers).concat(Object.keys(cloudContainers)).filter(function(v, i, a) { return a.indexOf(v) === i; });
        mergedSegments[segKey] = {};
        allConKeys.forEach(function(conKey) {
            var localSubs = localContainers[conKey] || [];
            var cloudSubs = cloudContainers[conKey] || [];
            var mergedSubs = localSubs.concat(cloudSubs).filter(function(v, i, a) { return a.indexOf(v) === i; });
            mergedSegments[segKey][conKey] = mergedSubs;
        });
    });
    appState.segments = mergedSegments;
    // 5. categories — deep recursive union merge
    function deepMergeCategories(localCat, cloudCat) {
        var merged = {};
        var allKeys = Object.keys(localCat || {}).concat(Object.keys(cloudCat || {})).filter(function(v, i, a) { return a.indexOf(v) === i; });
        allKeys.forEach(function(key) {
            if (localCat && localCat.hasOwnProperty(key) && cloudCat && cloudCat.hasOwnProperty(key)) {
                merged[key] = deepMergeCategories(localCat[key], cloudCat[key]);
            } else if (cloudCat && cloudCat.hasOwnProperty(key)) {
                merged[key] = cloudCat[key];
            } else {
                merged[key] = localCat[key];
            }
        });
        return merged;
    }
    appState.categories = deepMergeCategories(appState.categories || {}, cloud.categories || {});
    // Debug: verify Bedroom containers survived merge
    var mergedBedroomCons = (appState.segments && appState.segments.Bedroom) ? Object.keys(appState.segments.Bedroom).join(',') : '(none)';
    console.log('[merge] after merge — Bedroom containers: [' + mergedBedroomCons + ']');
    // 6. coordinates — union merge
    appState.coordinates = Object.assign({}, appState.coordinates || {}, cloud.coordinates || {});
    // 7. spatialBackgroundImage — keep if newer side has it
    if (cloud.spatialBackgroundImage) appState.spatialBackgroundImage = cloud.spatialBackgroundImage;
    // 8. scalar fields — keep cloud values
    if (cloud.reminderDays) appState.reminderDays = cloud.reminderDays;
    if (cloud.language) appState.language = cloud.language;
    // 9. meta — track server revision
    appState.meta = appState.meta || {};
    if (cloud.meta && cloud.meta.lastServerRevision) {
        appState.meta.lastServerRevision = cloud.meta.lastServerRevision;
    }
    appState.meta.lastSyncedAt = new Date().toISOString();

    var segsAfter = Object.keys(appState.segments).length;
    var catsAfter = countCategoryKeys(appState.categories);
    if (segsAfter < segsBefore || catsAfter < catsBefore) {
        console.error('[mergeCloudPayloadToMemory] STRUCTURAL DATA LOSS: segs ' + segsBefore + '→' + segsAfter + ' cats ' + catsBefore + '→' + catsAfter);
    }
    console.log('[mergeCloudPayloadToMemory] result segs=' + segsAfter +
        ' cats=' + catsAfter);
    return stats;
}

function resolveItemConflict(localItem, cloudItem) {
    if (!cloudItem) return { item: localItem, resolution: 'local-only' };
    if (!localItem) return { item: cloudItem, resolution: 'cloud-only' };

    function getTime(item) {
        if (item.deletedAt) { var d = new Date(item.deletedAt); if (!isNaN(d.getTime())) return d.getTime(); }
        if (item.updatedAt) { var d = new Date(item.updatedAt); if (!isNaN(d.getTime())) return d.getTime(); }
        if (item.timestamp) { var d = new Date(item.timestamp); if (!isNaN(d.getTime())) return d.getTime(); }
        if (item.createdAt) { var d = new Date(item.createdAt); if (!isNaN(d.getTime())) return d.getTime(); }
        return 0;
    }

    var localTime = getTime(localItem);
    var cloudTime = getTime(cloudItem);
    var localDeleted = !!localItem.deletedAt;
    var cloudDeleted = !!cloudItem.deletedAt;

    if (cloudDeleted && !localDeleted) {
        if (cloudTime > localTime) return { item: cloudItem, resolution: 'cloud-delete-wins' };
        return { item: localItem, resolution: 'local-kept-delete-stale' };
    }
    if (localDeleted && !cloudDeleted) {
        if (localTime > cloudTime) return { item: localItem, resolution: 'local-delete-wins' };
        return { item: cloudItem, resolution: 'cloud-kept-delete-stale' };
    }

    if (cloudTime > localTime) return { item: cloudItem, resolution: 'cloud-newer' };
    if (localTime > cloudTime) return { item: localItem, resolution: 'local-newer' };

    var localVer = localItem.version || 0;
    var cloudVer = cloudItem.version || 0;
    if (cloudVer > localVer) return { item: cloudItem, resolution: 'cloud-higher-version' };
    if (localVer > cloudVer) return { item: localItem, resolution: 'local-higher-version' };

    if (cloudDeleted && !localDeleted) return { item: localItem, resolution: 'local-kept-tie' };
    if (localDeleted && !cloudDeleted) return { item: cloudItem, resolution: 'cloud-kept-tie' };

    return { item: cloudItem, resolution: 'tied-cloud-preferred' };
}



async function triggerSynchronousCloudFetchPull() {
    syncNow({ interactive: true });
}

async function verifyCloudSync() {
    var endpoint = localStorage.getItem('sys_gas_url');
    var secret = localStorage.getItem('sys_api_pwd');
    if(!endpoint) { showToast(t('missingEndpointShort'), 'error'); return; }

    try {
        var params = 'token=' + encodeURIComponent(secret) + '&action=SYNC_PULL';
        var resp = await fetch(endpoint + '?' + params, { method: 'GET' });
        var cloud = await resp.json();

        var localIds = new Set(appState.inventory.filter(function(i) { return !i.deletedAt; }).map(function(i) { return i.id; }));
        var cloudIds = new Set((cloud && cloud.inventory) ? cloud.inventory.map(function(i) { return i.id; }) : []);

        var localIdCount = localIds.size;
        var cloudIdCount = cloudIds.size;

        var missingInCloud = [...localIds].filter(function(id) { return !cloudIds.has(id); });
        var missingInLocal = [...cloudIds].filter(function(id) { return !localIds.has(id); });

        var localChecksum = computeStateChecksum();
        var cloudChecksum = (cloud && cloud.meta) ? cloud.meta.checksum : null;

        var cloudRev = (cloud && cloud.meta) ? cloud.meta.lastServerRevision : null;
        var localRev = appState.meta.lastServerRevision;

        if (missingInCloud.length === 0 && missingInLocal.length === 0 && cloudRev === localRev) {
            updateSyncStatusBadge();
            showToast('\u2705 In sync \u2014 ' + localIdCount + ' items, revision ' + (localRev || '?'), 'success');
        } else {
            var diffs = [];
            if (missingInCloud.length > 0) diffs.push(missingInCloud.length + ' only local');
            if (missingInLocal.length > 0) diffs.push(missingInLocal.length + ' only cloud');
            if (cloudRev !== localRev) diffs.push('revision mismatch');
            showToast('\u26A0\uFE0F Out of sync \u2014 ' + diffs.join(', ') + '. Tap the sync banner or use Restore from cloud to resolve.', 'error');
            _syncConflict = true;
            updateSyncStatusBadge();
        }
    } catch(e) {
        _syncLastFailed = true;
        updateSyncStatusBadge();
    }
}

function computeStateChecksum() {
    var activeItems = appState.inventory.filter(function(i) { return !i.deletedAt; });
    var ids = activeItems.map(function(i) { return i.id; }).sort().join(',');
    var segKeys = Object.keys(appState.segments).sort().join(',');
    var catKeys = Object.keys(appState.categories).sort().join(',');
    var str = ids + '|' + segKeys + '|' + catKeys;
    return simpleHash(str);
}

function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        var chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash.toString(36);
}

function triggerAutoCloudSyncIfPossible() {
    var endpoint = localStorage.getItem('sys_gas_url');
    if (!endpoint) return;
    setTimeout(function() {
        if (_syncInProgress) return;
        syncNow({ interactive: false }).catch(function() {});
    }, 300);
}
async function autoPullFromCloudIfPossible() {
    var endpoint = localStorage.getItem('sys_gas_url');
    var secret = localStorage.getItem('sys_api_pwd');
    if (!endpoint) return;
    if (_syncInProgress) return;

    try {
        var cloud = await getCloudState(secret, endpoint);
        if (!cloud) return;
        var cloudRev = (cloud.meta && cloud.meta.lastServerRevision != null) ? cloud.meta.lastServerRevision : 0;
        var localRev = (appState.meta && appState.meta.lastServerRevision != null) ? appState.meta.lastServerRevision : 0;
        if (cloudRev >= localRev) {
            replaceLocalStateWithCloud(cloud);
            _syncLastFailed = false;
            _syncConflict = false;
            updateSyncStatusBadge();
        }
    } catch (e) {
        console.warn('[autoPullFromCloudIfPossible] ' + (e && e.message ? e.message : e), e);
    }
}
function normalizeAllItemImageFields() {
    (appState.inventory || []).forEach(function(item) { normalizeImageFields(item); });
}
/* ==========================================================================
   Section 7.5: DeepSeek AI Semantic Search Engine
   ========================================================================== */
async function performAISearch() {
    const description = document.getElementById('aiSearchDescription').value.trim();
    if (!description) return;

    const apiKey = localStorage.getItem('sys_ds_api_key');
    if (!apiKey) {
        showToast(t('aiNoKey'), 'error');
        return;
    }

    if (appState.inventory.length === 0) {
        showToast(t('noItems'), 'error');
        return;
    }

    const btn = document.getElementById('btnAISearch');
    const statusEl = document.getElementById('aiSearchStatus');
    btn.disabled = true;
    btn.innerText = 'Searching...';
    btn.classList.add('ai-searching');
    statusEl.classList.remove('hidden');
    statusEl.innerText = t('aiAnalyzing');

    try {
        const inventoryMetadata = appState.inventory.filter(function(it) { return !it.deletedAt; }).map(function(item) {
            var seg = item.segment, con = item.container, sub = item.subContainer || '';
            if (item.itemType === 'stock' && getActiveStockEntries(item).length > 0) {
                var first = getActiveStockEntries(item)[0];
                seg = first.segment; con = first.container; sub = first.subContainer || '';
            }
            return {
                id: item.id,
                name: item.name,
                category: item.category,
                segment: seg,
                container: con,
                subContainer: sub,
                owner: item.owner || 'Default',
                remarks: item.remarks,
                aiMetadata: item.aiMetadata || ''
            };
        });

        const userMessage = `Description: "${description}"\n\nInventory Items:\n${JSON.stringify(inventoryMetadata)}\n\nReturn ONLY a JSON array of matching item IDs like ["item_123", "item_456"].`;

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an inventory search assistant. Given a natural description and inventory items with metadata, return a JSON array of matching item IDs. Match on name, category, location, owner, remarks, and aiMetadata (AI visual description). Be inclusive. Return ONLY a JSON array like ["id1","id2"].'
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                temperature: 0.1,
                max_tokens: 2048
            })
        });

        const data = await response.json();

        if (!data.choices || !data.choices[0]) {
            throw new Error('Unexpected API response structure');
        }

        const content = data.choices[0].message.content.trim();
        const jsonMatch = content.match(/\[.*\]/s);
        if (!jsonMatch) {
            throw new Error('Could not parse AI response');
        }

        const matchedIds = JSON.parse(jsonMatch[0]);
        aiFilteredItemIds = matchedIds.length > 0 ? matchedIds : null;

        statusEl.innerText = matchedIds.length > 0
            ? t('aiFound') + ' ' + matchedIds.length + ' ' + (matchedIds.length !== 1 ? t('items') : t('item')) + '.'
            : 'No matches — try a different description or clear the filter';
        document.getElementById('btnResetAISearch').classList.remove('hidden');

    } catch (err) {
        aiFilteredItemIds = null;
        statusEl.innerText = t('aiFailed') + err.message;
        document.getElementById('btnResetAISearch').classList.add('hidden');
    }

    btn.disabled = false;
    btn.innerText = 'AI Search';
    btn.classList.remove('ai-searching');
    renderFilteredInventoryTable();
}

function resetAISearchFilter() {
    aiFilteredItemIds = null;
    document.getElementById('btnResetAISearch').classList.add('hidden');
    document.getElementById('aiSearchStatus').classList.add('hidden');
    document.getElementById('aiSearchDescription').value = '';
    document.getElementById('aiSearchPanel').classList.add('hidden');
    document.getElementById('btnToggleAILabel').textContent = 'AI Deep Search';
    document.getElementById('aiToggleArrow').innerHTML = '&#9650;';
    renderFilteredInventoryTable();
}

var _currentItemTypeFilter = 'all';
var _inventorySortKey = 'name';
var _inventorySortDir = 'asc';

function setInventorySort(key) {
    if (_inventorySortKey === key) {
        _inventorySortDir = _inventorySortDir === 'asc' ? 'desc' : 'asc';
    } else {
        _inventorySortKey = key;
        _inventorySortDir = 'asc';
    }
    renderFilteredInventoryTable();
}

function updateInventorySortIndicators() {
    var headers = document.querySelectorAll('#tab-inventory thead th[data-sort-key]');
    headers.forEach(function(th) {
        var key = th.getAttribute('data-sort-key');
        var indicator = th.querySelector('.sort-arrow');
        if (indicator) indicator.textContent = '';
        th.removeAttribute('aria-sort');
        if (key === _inventorySortKey) {
            th.setAttribute('aria-sort', _inventorySortDir === 'asc' ? 'ascending' : 'descending');
            if (indicator) indicator.textContent = _inventorySortDir === 'asc' ? ' \u25B2' : ' \u25BC';
        }
    });
}

function getSortValue(item, key) {
    if (!item) return '';
    switch (key) {
        case 'name':     return (item.name || '').toLowerCase();
        case 'category': return (item.category || '').toLowerCase();
        case 'location':
            if (item.itemType === 'stock') return (getStockLocationSummary(item) || '').toLowerCase();
            return [(item.segment || ''), (item.container || ''), (item.subContainer || '')].join('|').toLowerCase();
        case 'owner':    return (item.owner || 'Default').toLowerCase();
        case 'created':  return item.createdAt || item.timestamp || '';
        default: return '';
    }
}

function setItemTypeFilter(filter) {
    _currentItemTypeFilter = filter;
    var btnAll = document.getElementById('btnFilterAll');
    var btnUnique = document.getElementById('btnFilterUnique');
    var btnStock = document.getElementById('btnFilterStock');
    btnAll.className = filter === 'all' ? 'btn btn-xs btn-dark rounded-none' : 'btn btn-xs btn-secondary rounded-none';
    btnUnique.className = filter === 'unique' ? 'btn btn-xs btn-primary rounded-none' : 'btn btn-xs btn-secondary rounded-none';
    btnStock.className = filter === 'stock' ? 'btn btn-xs btn-dark-amber rounded-none' : 'btn btn-xs btn-secondary rounded-none';
    renderFilteredInventoryTable();
}

function clearAllBrowseFilters() {
    document.getElementById('filterSearchQuery').value = '';
    document.getElementById('filterSegmentSelect').value = '';
    document.getElementById('filterCategorySelect').value = '';
    document.getElementById('filterContainerSelect').value = '';
    document.getElementById('filterOwnerSelect').value = '';
    setItemTypeFilter('all');
    syncFilterContainersDropdown();
    renderFilteredInventoryTable();
}

function toggleAIPanel() {
    var panel = document.getElementById('aiSearchPanel');
    var arrow = document.getElementById('aiToggleArrow');
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        arrow.textContent = '\u25B2';
        document.getElementById('btnToggleAILabel').textContent = 'Hide AI Search';
    } else {
        panel.classList.add('hidden');
        arrow.textContent = '\u25C0';
        document.getElementById('btnToggleAILabel').textContent = 'AI Deep Search';
    }
}

/* ==========================================================================
   Section 8: View Synchronizers & Structural Render Utilities
   ========================================================================== */
function saveStateToLocalStorage() {
    try {
        localStorage.setItem('hk_inventory_state', JSON.stringify(appState));
    } catch (err) {
        if (err.name === 'QuotaExceededError' || (err.message || '').toLowerCase().indexOf('quota') !== -1) {
            console.warn('[saveState] Quota exceeded — attempting auto-recovery');
            if (saveStateWithRecovery()) {
                showToast('Storage auto-compacted. Trimmed sync queue; some item images were purged from cache.', 'warning');
                return;
            }
            console.error('[saveState] Recovery failed. Storage is full.');
            showToast('Storage full. Go to Settings → Advanced and use Compact Storage or Wipe Local Cache.', 'error');
        } else {
            console.error('[saveState] Unexpected error:', err);
            showToast('Save failed: ' + (err.message || 'Unknown error'), 'error');
        }
    }
}

function saveStateWithRecovery() {
    var origQueue = (appState.syncQueue || []).slice();
    var recovered = false;

    if (origQueue.length > 10) {
        appState.syncQueue = origQueue.slice(-10);
    }

    try {
        localStorage.setItem('hk_inventory_state', JSON.stringify(appState));
        recovered = true;
        console.warn('[saveState] Recovery: trimmed sync queue ' + origQueue.length + '→' + (appState.syncQueue || []).length);
    } catch (e) {
        appState.syncQueue = origQueue;
    }

    return recovered;
}

function diagnoseStorage() {
    var totalBytes = 0;
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var v = localStorage.getItem(k);
        totalBytes += v ? v.length * 2 : 0; // UTF-16
        keys.push({ key: k, bytes: v ? v.length * 2 : 0 });
    }
    var stateStr = localStorage.getItem('hk_inventory_state') || '';
    var stateBytes = stateStr.length * 2;
    var inventoryCount = appState.inventory.length;
    var queueLen = (appState.syncQueue || []).length;
    var idbImageCount = 0;
    var idbThumbBytes = 0;
    var idbFullBytes = 0;
    var remoteCount = 0;
    appState.inventory.forEach(function(item) {
        if (item.imageSourceType === 'idb') {
            idbImageCount++;
            if (item.imageMeta) {
                idbThumbBytes += item.imageMeta.thumbBytes || 0;
                idbFullBytes += item.imageMeta.fullBytes || 0;
            }
        }
        if (item.imageUrl && item.imageUrl.indexOf('http') === 0) remoteCount++;
    });
    var idbTotalKB = ((idbThumbBytes + idbFullBytes) / 1024).toFixed(1);
    var report = [
        '=== Storage Diagnostic ===',
        'Total localStorage: ' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB (' + totalBytes + ' bytes)',
        'App state only:     ' + (stateBytes / 1024 / 1024).toFixed(2) + ' MB (' + stateBytes + ' bytes)',
        'Inventory items:    ' + inventoryCount,
        'Sync queue entries: ' + queueLen,
        'IDB-backed images:  ' + idbImageCount + ' (~' + idbTotalKB + ' KB in IndexedDB)',
        'Remote URL images:  ' + remoteCount,
        'Estimated limit:    ~5 MB (localStorage) + IndexedDB quota (varies)',
        ''
    ];
    if (idbImageCount > 0) {
        report.push('IDB IMAGE DETAILS:');
        var ranked = [];
        appState.inventory.forEach(function(item, i) {
            if (item.imageSourceType === 'idb' && item.imageMeta) {
                ranked.push({ idx: i, name: item.name, kb: ((item.imageMeta.thumbBytes || 0) + (item.imageMeta.fullBytes || 0)) / 1024 });
            }
        });
        ranked.sort(function(a, b) { return b.kb - a.kb; });
        ranked.slice(0, 5).forEach(function(r) {
            report.push('  [' + r.idx + '] ' + r.name + ': ' + r.kb.toFixed(1) + ' KB');
        });
    }
    report.push('');
    report.push('SUGGESTIONS:');
    report.push('  - Run compactLocalStorage() to trim sync queue');
    report.push('  - Call cleanupOrphanedImages() to free unreferenced blobs');
    report.push('  - Remove unused items');
    report.push('  - Purge Local Cache as last resort (also wipes IndexedDB)');
    console.log(report.join('\n'));
    return report.join('\n');
}

function compactLocalStorage() {
    var before = (localStorage.getItem('hk_inventory_state') || '').length * 2;
    var origQueue = (appState.syncQueue || []).slice();
    appState.syncQueue = (appState.syncQueue || []).slice(-10);
    try {
        localStorage.setItem('hk_inventory_state', JSON.stringify(appState));
        var after = (localStorage.getItem('hk_inventory_state') || '').length * 2;
        var saved = ((before - after) / 1024).toFixed(1);
        console.log('[compact] Freed ' + saved + ' KB (sync queue: ' + origQueue.length + '→' + appState.syncQueue.length + ')');
        showToast('Storage compacted. Freed ~' + saved + ' KB. Sync queue trimmed to last 10.', 'success');
    } catch (e) {
        appState.syncQueue = origQueue;
        console.error('[compact] Failed:', e);
        showToast('Compaction failed. Try Wipe Local Cache.', 'error');
    }
}

function migrateLegacyState(state) {
    if (!state || !state.segments) return state;
    var migrated = false;

    // Seed meta
    if (!state.meta || typeof state.meta !== 'object') {
        state.meta = { deviceId: getDeviceId(), lastSyncedAt: null, lastServerRevision: null };
        migrated = true;
    }
    if (!state.meta.deviceId) {
        state.meta.deviceId = getDeviceId();
        migrated = true;
    }
    if (state.meta.lastSyncedAt === undefined) {
        state.meta.lastSyncedAt = null;
        migrated = true;
    }
    if (state.meta.lastServerRevision === undefined) {
        state.meta.lastServerRevision = null;
        migrated = true;
    }
    if (state.meta.localSnapshotVersion === undefined) {
        state.meta.localSnapshotVersion = 0;
        migrated = true;
    }
    if (state.meta.lastPushedSnapshotVersion === undefined) {
        state.meta.lastPushedSnapshotVersion = 0;
        migrated = true;
    }
    if (state.meta.lastLocalChangeAt === undefined) {
        state.meta.lastLocalChangeAt = null;
        migrated = true;
    }

    // Ensure syncQueue
    if (!state.syncQueue || !Array.isArray(state.syncQueue)) {
        state.syncQueue = [];
        migrated = true;
    }

    // Migrate segments: array of strings -> object of arrays
    for (var seg in state.segments) {
        var val = state.segments[seg];
        if (Array.isArray(val)) {
            var newMap = {};
            val.forEach(function(cName) { newMap[cName] = []; });
            state.segments[seg] = newMap;
            migrated = true;
        }
    }

    // Migrate coordinates: 2-part key -> 3-part key
    var newCoords = {};
    for (var key in state.coordinates) {
        var parts = key.split(':');
        if (parts.length === 2) {
            newCoords[parts[0] + '|' + parts[1] + '|\u2014'] = state.coordinates[key];
            migrated = true;
        } else {
            newCoords[key] = state.coordinates[key];
        }
    }
    if (migrated) state.coordinates = newCoords;

    // Migrate inventory items: add modern fields
    if (state.inventory) {
        state.inventory.forEach(function(item) {
            if (item.subContainer === undefined) {
                item.subContainer = '';
                migrated = true;
            }
            if (item.owner === undefined) {
                item.owner = 'Default';
                migrated = true;
            }
            if (item.aiMetadata === undefined) {
                item.aiMetadata = '';
                migrated = true;
            }
            if (item.purchaseDate === undefined) {
                item.purchaseDate = '';
                migrated = true;
            }
            if (item.expiryDate === undefined) {
                item.expiryDate = '';
                migrated = true;
            }
            if (item.brand === undefined) {
                item.brand = '';
                migrated = true;
            }
            if (item.warrantyDate === undefined) {
                item.warrantyDate = '';
                migrated = true;
            }
            if (item.itemType === undefined) {
                item.itemType = 'unique';
                migrated = true;
            }
            if (item.uom === undefined) {
                item.uom = '';
                migrated = true;
            }
            if (item.quantity === undefined) {
                item.quantity = 0;
                migrated = true;
            }
            if (item.minQuantity === undefined) {
                item.minQuantity = 0;
                migrated = true;
            }
            // New sync model fields
            if (item.createdAt === undefined) {
                item.createdAt = item.timestamp ? item.timestamp.replace(' ', 'T') + ':00.000Z' : new Date().toISOString();
                migrated = true;
            }
            if (item.updatedAt === undefined) {
                item.updatedAt = item.timestamp ? item.timestamp.replace(' ', 'T') + ':00.000Z' : new Date().toISOString();
                migrated = true;
            }
            if (item.deletedAt === undefined) {
                item.deletedAt = null;
                migrated = true;
            }
            if (item.version === undefined) {
                item.version = 1;
                migrated = true;
            }
            if (item.lastModifiedBy === undefined) {
                item.lastModifiedBy = state.meta.deviceId;
                migrated = true;
            }
            if (migrateLegacyStockItem(item)) migrated = true;
        });
    }

    // Ensure users array and currentUser exist
    if (!state.users || !Array.isArray(state.users)) {
        state.users = ['Default'];
        migrated = true;
    }
    if (!state.users.includes('Default')) {
        state.users.unshift('Default');
        migrated = true;
    }
    if (!state.currentUser || !state.users.includes(state.currentUser)) {
        state.currentUser = 'Default';
        migrated = true;
    }
    if (!state.language) {
        state.language = 'en';
        migrated = true;
    }
    if (!state.userEmails || typeof state.userEmails !== 'object') {
        state.userEmails = {};
        migrated = true;
    }
    if (!state.reminderDays) {
        state.reminderDays = 30;
        migrated = true;
    }
    if (!state.reminderLog || typeof state.reminderLog !== 'object') {
        state.reminderLog = {};
        migrated = true;
    }

    return state;
}

function restoreStateFromLocalStorage() {
    const data = localStorage.getItem('hk_inventory_state');
    if (data) {
        try {
            appState = JSON.parse(data);
            appState = migrateLegacyState(appState);
            saveStateToLocalStorage();
            normalizeAllItemImageFields();
            migrateLegacyDataUrlImages().then(preloadAllIdbImages).then(function() {
                maybeWarnStoragePressure();
            });
            setTimeout(function() { triggerReminderCheckThrottled(); }, 5000);
        } catch (e) {
            console.error("Local state compilation damaged.", e);
        }
    }
}

async function purgeSystemStorageCache() {
    var ok = await showAppConfirm(t('confirmPurge'), 'Wipe All Data');
    if (ok) {
        revokeAllCachedBlobUrls();
        localStorage.removeItem('hk_inventory_state');
        if (_imageDb) { _imageDb.close(); _imageDb = null; }
        var delReq = indexedDB.deleteDatabase('findmyitem-assets');
        delReq.onsuccess = function() { location.reload(); };
        delReq.onerror = function() { location.reload(); };
        delReq.onblocked = function() { location.reload(); };
    }
}

function syncUIComponents() {
    // 1. Structural Map Selectors Updates
    const targetSegSelect = document.getElementById('targetSegmentSelect');
    const targetConSegSelect = document.getElementById('targetContainerSegmentSelect');
    const formSegSelect = document.getElementById('invItemSegmentSelect');
    const filterSegSelect = document.getElementById('filterSegmentSelect');

    const savedSegValue = formSegSelect.value;
    const savedFilterSegValue = filterSegSelect.value;

    targetSegSelect.innerHTML = '<option value="">' + t('chooseSegment') + '</option>';
    targetConSegSelect.innerHTML = '<option value="">' + t('chooseSegment') + '</option>';
    formSegSelect.innerHTML = '<option value="">' + t('chooseSegment') + '</option>';
    filterSegSelect.innerHTML = '<option value="">' + t('allSegments') + '</option>';

    Object.keys(appState.segments).forEach(seg => {
        const optA = document.createElement('option'); optA.value = seg; optA.innerText = seg; targetSegSelect.appendChild(optA);
        const optB = document.createElement('option'); optB.value = seg; optB.innerText = seg; targetConSegSelect.appendChild(optB);
        const optC = document.createElement('option'); optC.value = seg; optC.innerText = seg; formSegSelect.appendChild(optC);
        const optD = document.createElement('option'); optD.value = seg; optD.innerText = seg; filterSegSelect.appendChild(optD);
    });

    formSegSelect.value = savedSegValue;
    filterSegSelect.value = savedFilterSegValue;
    syncInventoryFormContainersDropdown();
    syncTargetContainerDropdown();
    syncFilterContainersDropdown();

    // 2. Categories Selectors Flatten Mapping
    const filterCatSelect = document.getElementById('filterCategorySelect');
    const savedFilterCatValue = filterCatSelect.value;

    filterCatSelect.innerHTML = '<option value="">' + t('allCategories') + '</option>';

    const continuousCategoriesList = flattenCategoryTreeToLinearRoutes(appState.categories);
    continuousCategoriesList.forEach(route => {
        const optB = document.createElement('option'); optB.value = route; optB.innerText = route; filterCatSelect.appendChild(optB);
    });

    filterCatSelect.value = savedFilterCatValue;

    // 2b. Populate cascading category Level 1
    syncCategoryLevel1();

    // 3. Render Tree Subcomponents Assemblies
    syncUserInterface();
    renderSpatialTreeHierarchy();
    renderClassificationDirectoryTree();
    renderFilteredInventoryTable();
    renderSpatialMapGrid();
    if (!document.getElementById('tab-tobuy').classList.contains('hidden-panel')) {
        renderToBuyList();
    }
}

function renderSpatialTreeHierarchy() {
    const treeBox = document.getElementById('spatialTreeHierarchy');
    treeBox.innerHTML = '';

    var segKeys = Object.keys(appState.segments);
    if (segKeys.length === 0) {
        treeBox.innerHTML = emptyStateHTML(
            '<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>',
            'No locations yet',
            'Add a segment to get started',
            '+ Add segment', 'expandConfigurator(); document.getElementById(\'newSegmentName\').focus()'
        );
        return;
    }

    segKeys.forEach(seg => {
        const segEsc = seg.replace(/'/g, "&#39;");
        const segDiv = document.createElement('div');
        segDiv.className = "mb-2";
        segDiv.innerHTML = `<div class="flex justify-between items-center cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5" onclick="event.stopPropagation(); selectNodeForAssets('${segEsc}')"><span class="font-bold text-slate-700">📂 ${seg}</span><span onclick="event.stopPropagation(); deleteSegmentNode('${segEsc}')" class="text-slate-300 hover:text-red-500 text-xs font-bold px-1">✕</span></div>`;

        const containerMap = appState.segments[seg];
        const containerList = document.createElement('div');
        containerList.className = "pl-4 mt-1 space-y-1 border-l border-slate-200 ml-2";

        Object.keys(containerMap).forEach(con => {
            const conEsc = con.replace(/'/g, "&#39;");
            const cDiv = document.createElement('div');
            cDiv.className = "mb-1";
            cDiv.innerHTML = `<div class="flex justify-between items-center cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5" onclick="event.stopPropagation(); selectNodeForAssets('${segEsc}', '${conEsc}')"><span class="text-xs font-semibold text-slate-600">📥 ${con}</span><span onclick="event.stopPropagation(); deleteContainerNode('${segEsc}', '${conEsc}')" class="text-slate-300 hover:text-red-500 text-xs font-bold px-1">✕</span></div>`;

            const subList = document.createElement('div');
            subList.className = "pl-4 mt-0.5 space-y-0.5 border-l border-slate-200 ml-2";

            (containerMap[con] || []).forEach(sub => {
                const subEsc = sub.replace(/'/g, "&#39;");
                const sItem = document.createElement('div');
                sItem.className = "flex justify-between items-center cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5";
                sItem.innerHTML = `<span class="text-[11px] text-slate-500 hover:text-blue-600" onclick="event.stopPropagation(); selectNodeForAssets('${segEsc}', '${conEsc}', '${subEsc}')">📦 ${sub}</span><span onclick="event.stopPropagation(); deleteSubContainerNode('${segEsc}', '${conEsc}', '${subEsc}')" class="text-slate-300 hover:text-red-500 text-xs font-bold px-1">✕</span>`;
                subList.appendChild(sItem);
            });

            cDiv.appendChild(subList);
            containerList.appendChild(cDiv);
        });

        segDiv.appendChild(containerList);
        treeBox.appendChild(segDiv);
    });
}

function generateRecursiveCategoryTreeHTML(rootNode, activePathArray = []) {
    let html = '<div class="pl-4 border-l border-slate-100 ml-2 space-y-1">';
    for (let key in rootNode) {
        const nextPath = [...activePathArray, key];
        const pathJsonString = JSON.stringify(nextPath);
        const isSelected = (JSON.stringify(appState.selectedCategoryNodePath) === pathJsonString);

        html += `<div class="tree-branch-line">
            <span onclick='selectCategoryNodeContext(${JSON.stringify(pathJsonString)})' class="cursor-pointer px-1.5 py-0.5 rounded text-xs transition-colors hover:bg-slate-100 ${isSelected ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600'}">
                🏷️ ${key}
            </span>`;
        html += generateRecursiveCategoryTreeHTML(rootNode[key], nextPath);
        html += '</div>';
    }
    html += '</div>';
    return html;
}

function renderClassificationDirectoryTree() {
    const targetContainer = document.getElementById('classificationDirectoryTree');
    targetContainer.innerHTML = '';

    var catKeys = Object.keys(appState.categories);
    if (catKeys.length === 0) {
        targetContainer.innerHTML = emptyStateHTML(
            '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 110-10 5 5 0 010 10z"/>',
            'No categories',
            'Categories help organize your inventory',
            null, null
        );
        return;
    }

    for (let topKey in appState.categories) {
        const topNodeDiv = document.createElement('div');
        topNodeDiv.className = "mb-2";
        const pathJsonString = JSON.stringify([topKey]);
        const isSelected = (JSON.stringify(appState.selectedCategoryNodePath) === pathJsonString);

        topNodeDiv.innerHTML = `
            <span onclick='selectCategoryNodeContext(${JSON.stringify(pathJsonString)})' class="cursor-pointer px-1.5 py-0.5 rounded transition-colors hover:bg-slate-100 font-semibold ${isSelected ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-800'}">
                📁 ${topKey}
            </span>
        `;
        topNodeDiv.innerHTML += generateRecursiveCategoryTreeHTML(appState.categories[topKey], [topKey]);
        targetContainer.appendChild(topNodeDiv);
    }
}

function renderFilteredInventoryTable() {
    var tableBody = document.getElementById('inventoryTableDataRows');
    var cardList = document.getElementById('inventoryCardListMobile');
    var query = document.getElementById('filterSearchQuery').value.toLowerCase().trim();
    var segFilter = document.getElementById('filterSegmentSelect').value;
    var catFilter = document.getElementById('filterCategorySelect').value;
    var conFilter = document.getElementById('filterContainerSelect').value;
    var ownerFilter = document.getElementById('filterOwnerSelect').value;

    var hasFilters = query || segFilter || catFilter || conFilter || ownerFilter || _currentItemTypeFilter !== 'all';
    var clearBtn = document.getElementById('btnClearAllFilters');
    if (clearBtn) clearBtn.classList.toggle('hidden', !hasFilters);

    var targets = appState.inventory.filter(function(item) {
        if (item.deletedAt) return false;
        if (aiFilteredItemIds && !aiFilteredItemIds.includes(item.id)) return false;
        if (_currentItemTypeFilter === 'unique' && item.itemType !== 'unique') return false;
        if (_currentItemTypeFilter === 'stock' && item.itemType !== 'stock') return false;
        if (item.itemType === 'stock' && isStockItemOutOfStock(item)) return false;
        var matchQuery = item.name.toLowerCase().includes(query) || item.remarks.toLowerCase().includes(query);
        var matchCat = !catFilter || item.category === catFilter || item.category.startsWith(catFilter + ' > ');
        var matchOwner = !ownerFilter || (item.owner || 'Default') === ownerFilter;
        var matchSeg = true;
        var matchCon = true;
        if (segFilter || conFilter) {
            if (item.itemType === 'stock') {
                var entries = getActiveStockEntries(item);
                matchSeg = !segFilter || entries.some(function(e) { return e.segment === segFilter; });
                matchCon = !conFilter || entries.some(function(e) { return e.container === conFilter; });
            } else {
                matchSeg = !segFilter || item.segment === segFilter;
                matchCon = !conFilter || item.container === conFilter;
            }
        }
        return matchQuery && matchSeg && matchCon && matchCat && matchOwner;
    });

    targets.sort(function(a, b) {
        var va = getSortValue(a, _inventorySortKey);
        var vb = getSortValue(b, _inventorySortKey);
        if (va < vb) return _inventorySortDir === 'asc' ? -1 : 1;
        if (va > vb) return _inventorySortDir === 'asc' ? 1 : -1;
        return 0;
    });

    document.getElementById('inventoryMetricCount').innerText = targets.length;

    tableBody.innerHTML = '';
    if (cardList) cardList.innerHTML = '';

    var emptyHtml = emptyStateHTML(
        '<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/><circle cx="11" cy="11" r="8"/>',
        'Nothing here yet',
        'Try adjusting your filters or add a new item',
        'Clear filters', 'clearAllBrowseFilters()'
    );

    if (targets.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7">' + emptyHtml + '</td></tr>';
        if (cardList) cardList.innerHTML = emptyHtml;
        return;
    }

    targets.forEach(function(item) {
        var tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/80 transition-colors';
        var syncIndicator = '';
        var lastSynced = appState.meta.lastSyncedAt;
        if (!lastSynced || !item.updatedAt || item.updatedAt > lastSynced) {
            syncIndicator = ' <span class="text-[9px] text-amber-500 font-medium" title="Not yet synced to cloud">\u25CF</span>';
        }
        var stockHtml = '';
        if (item.itemType === 'stock') {
            var tot = getTotalStockQuantity(item);
            var isLow = isStockItemLow(item);
            stockHtml = '<div class="text-[10px] text-amber-600 font-medium mt-0.5">\uD83D\uDCE6 ' + tot + ' ' + (item.uom || 'pcs') + (isLow ? ' \u26A0\uFE0F Low' : '') + '</div>';
        }
        var locHtml = '';
        if (item.itemType === 'stock') {
            locHtml = '<div class="font-semibold text-slate-700 text-xs">' + getStockLocationSummary(item) + '</div>';
        } else {
            locHtml = '<div class="font-semibold text-slate-700 cursor-pointer hover:text-blue-600" onclick="event.stopPropagation(); filterBy(\'segment\',\'' + (item.segment || '').replace(/'/g, "&#39;") + '\')">' + (item.segment || '') + '  >  ' + (item.container || '') + '</div><div class="text-slate-500 mt-0.5">\uD83D\uDCE6 ' + (item.subContainer || '<span class="text-slate-300 italic">\u2014</span>') + '</div>';
        }
        tr.innerHTML = '<td class="px-4 py-3 text-center"><img src="' + getRenderableImageSrc(item, true) + '" class="h-10 w-10 object-cover rounded-md border border-slate-200 mx-auto bg-slate-100" onerror="this.src=\'https://placehold.co/100?text=Error\'"></td>'
            + '<td class="px-4 py-3 cursor-pointer hover:bg-blue-50/50" onclick="showItemDetail(\'' + item.id + '\')"><div class="font-bold text-slate-900 hover:text-blue-600">' + item.name + syncIndicator + '</div>'
            + (item.brand ? '<div class="text-[10px] text-slate-400 mt-0.5">' + item.brand + '</div>' : '')
            + '<div class="text-[10px] text-slate-400 font-mono mt-0.5">ID: ' + item.id + '</div>'
            + stockHtml
            + '</td>'
            + '<td class="px-4 py-3"><span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium cursor-pointer hover:bg-blue-50 hover:text-blue-600" onclick="event.stopPropagation(); filterBy(\'category\',\'' + item.category.replace(/'/g, "&#39;") + '\')">' + item.category + '</span></td>'
            + '<td class="px-4 py-3 text-xs">' + locHtml + '</td>'
            + '<td class="px-4 py-3 text-center"><span class="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 font-medium cursor-pointer hover:bg-indigo-100" onclick="event.stopPropagation(); filterBy(\'owner\',\'' + (item.owner || 'Default').replace(/'/g, "&#39;") + '\')">' + (item.owner || 'Default') + '</span></td>'
            + '<td class="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate"><div>' + (item.remarks || '<span class="text-slate-300 italic">\u2014</span>') + '</div>'
            + (item.aiMetadata ? '<div class="text-[10px] text-indigo-400 mt-0.5">\uD83E\uDD16 AI described</div>' : '')
            + '<div class="text-[10px] text-slate-400 mt-1">\uD83D\uDD52 ' + (item.timestamp || '') + '</div></td>'
            + '<td class="px-4 py-3 text-center align-middle"><div class="flex flex-col gap-1 items-center"><button onclick="event.stopPropagation(); setupItemModificationContext(\'' + item.id + '\')" class="w-full text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 font-semibold px-2 py-0.5 rounded transition-colors border border-slate-200">Edit</button><button onclick="event.stopPropagation(); copyItemToNew(\'' + item.id + '\')" class="w-full text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-semibold px-2 py-0.5 rounded transition-colors border border-emerald-200">Copy</button></div></td>';
        tableBody.appendChild(tr);
    });

    if (cardList) {
        targets.forEach(function(item) {
            var card = document.createElement('div');
            card.className = 'inv-card';
            card.setAttribute('onclick', 'showItemDetail(\'' + item.id + '\')');

            var locDisplay = '';
            if (item.itemType === 'stock') {
                locDisplay = '<div class="inv-card-location">\uD83D\uDCCD ' + getStockLocationSummary(item) + '</div>';
            } else {
                var locationParts = [item.segment, item.container];
                if (item.subContainer) locationParts.push(item.subContainer);
                locDisplay = '<div class="inv-card-location">\uD83D\uDCCD ' + locationParts.join(' / ') + '</div>';
            }

            var stockHtml = '';
            if (item.itemType === 'stock') {
                var tot = getTotalStockQuantity(item);
                var isLow = isStockItemLow(item);
                stockHtml = '<span class="inv-card-stock ' + (isLow ? 'inv-card-stock-low' : 'inv-card-stock-normal') + '">\uD83D\uDCE6 ' + tot + ' ' + (item.uom || 'pcs') + (isLow ? ' \u26A0 Low' : '') + '</span>';
            }

            var expiryHtml = '';
            if (item.itemType !== 'stock' && item.expiryDate) {
                expiryHtml = '<span class="inv-card-expiry">\u23F3 ' + item.expiryDate + '</span>';
            }

            card.innerHTML =
                '<img src="' + getRenderableImageSrc(item, true) + '" class="inv-card-img" onerror="this.src=\'https://placehold.co/100?text=Error\'">'
                + '<div class="inv-card-body">'
                + '<div class="inv-card-name">' + item.name + '</div>'
                + (item.brand ? '<div class="inv-card-brand">' + item.brand + '</div>' : '')
                + '<span class="inv-card-category">' + item.category + '</span>'
                + locDisplay
                + '<div class="inv-card-meta">'
                + '<span class="inv-card-owner">\uD83D\uDC64 ' + (item.owner || 'Default') + '</span>'
                + (stockHtml ? stockHtml : '')
                + (expiryHtml ? expiryHtml : '')
                + '</div></div>'
                + '<div class="inv-card-actions">'
                + '<button class="inv-card-btn inv-card-btn-view" onclick="event.stopPropagation(); showItemDetail(\'' + item.id + '\')">View</button>'
                + '<button class="inv-card-btn inv-card-btn-edit" onclick="event.stopPropagation(); setupItemModificationContext(\'' + item.id + '\')">Edit</button>'
                + '</div>';
            cardList.appendChild(card);
        });
    }
    updateInventorySortIndicators();
}

function renderToBuyList() {
    var container = document.getElementById('tobuyListContainer');
    var metricEl = document.getElementById('tobuyMetricCount');
    if (!container) return;

    var items = appState.inventory.filter(function(item) {
        if (item.deletedAt) return false;
        if (item.itemType !== 'stock') return false;
        var tot = getTotalStockQuantity(item);
        return tot <= (item.minQuantity || 0);
    });

    if (metricEl) metricEl.innerText = items.length + ' items';

    if (items.length === 0) {
        container.innerHTML = emptyStateHTML(
            '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>',
            'All stocked up!',
            'No items need restocking right now.',
            null, null
        );
        return;
    }

    container.innerHTML = items.map(function(item) {
        var tot = getTotalStockQuantity(item);
        var shortage = (item.minQuantity || 0) - tot;
        var isOut = tot === 0;
        var badge = isOut ? '<span class="tobuy-badge-out">OUT OF STOCK</span>' : '<span class="tobuy-badge-low">LOW -' + shortage + '</span>';
        var locSummary = getStockLocationSummary(item);
        return '<div class="tobuy-card" onclick="showItemDetail(\'' + item.id + '\')">' +
            '<img src="' + getRenderableImageSrc(item, true) + '" class="tobuy-img" onerror="this.src=\'https://placehold.co/100?text=Error\'">' +
            '<div class="tobuy-body">' +
            '<div class="tobuy-name">' + item.name + (item.brand ? ' <span class="text-xs text-slate-400">' + item.brand + '</span>' : '') + '</div>' +
            '<div class="tobuy-meta">' +
            '<span class="text-xs text-slate-500">' + item.category + '</span>' +
            '<span class="text-xs text-slate-400"> | ' + (item.uom || 'pcs') + ' | min ' + (item.minQuantity || 0) + '</span>' +
            '</div>' +
            '<div class="tobuy-meta"><span class="text-xs text-slate-500">' + locSummary + '</span></div>' +
            '<div class="tobuy-stats">' +
            badge +
            '<span class="tobuy-qty">Total: <b>' + tot + '</b></span>' +
            '</div>' +
            '</div>' +
            '<div class="tobuy-actions">' +
            '<button onclick="event.stopPropagation(); showItemDetail(\'' + item.id + '\')" class="btn btn-xs btn-ghost">View</button>' +
            '<button onclick="event.stopPropagation(); setupItemModificationContext(\'' + item.id + '\')" class="btn btn-xs btn-primary">Edit</button>' +
            '<button onclick="event.stopPropagation(); _currentScanItemId=\'' + item.id + '\'; scanStockIn()" class="btn btn-xs btn-success">IN</button>' +
            '</div>' +
            '</div>';
    }).join('');
}
