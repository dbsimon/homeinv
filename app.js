/**
 * Home Inventory Manager - Core Architecture Engine
 * Data Model (v2)
 * Copyright (c) Westdoor Streetson 2026
 */
const APP_VERSION = '1.36';

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
    chooseSegment: '-- Choose Segment --',
    containerAssign: 'Container Assignment',
    chooseContainer: '-- Choose Container --',
    subContainerAssign: 'Sub-Container Assignment',
    chooseSubContainer: '-- Choose Sub-Container --',
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
  }
};

function t(key) {
    return (LANG[appState.language] && LANG[appState.language][key]) || (LANG['en'][key] || key);
}

// Global Structural States
let appState = {
    segments: {},
    coordinates: {},
    categories: {},
    inventory: [],
    users: ['Default'],
    currentUser: 'Default',
    userEmails: {},
    reminderDays: 30,
    language: 'en',
    selectedCategoryNodePath: null,
    activeMappingNode: null,
    spatialBackgroundImage: null
};

// Transient runtime state (not persisted)
let aiFilteredItemIds = null;
let editingNode = null; // { type: 'segment'|'container'|'subContainer', segment, container?, subContainer?, oldName }
let _mapDirty = false;
let _classesDirty = false;

// Coordinate key helpers
function buildCoordKey(seg, con, sub) {
    return `${seg}|${con}|${sub}`;
}
function parseCoordKey(key) {
    const parts = key.split('|');
    return { segment: parts[0], container: parts[1], subContainer: parts[2] || '' };
}

// Application Init Hooks
window.addEventListener('DOMContentLoaded', () => {
    try {
        document.getElementById('versionDisplay').innerText = 'v' + APP_VERSION;
        initializeLocalSecuritySchema();
        restoreStateFromLocalStorage();
        initializeDefaultTiersIfEmpty();
        applyLanguageToDOM();
        syncUIComponents();
        switchTab('tab-spatial');
        clearActiveNode();
        installIOSZoomFix();
        autoPullFromCloudIfPossible();
    } catch (e) {
        alert('Init error: ' + e.message + ' (line ' + e.lineNumber + ')');
        console.error(e);
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeItemDetail();
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
        } else {
            const errElement = document.getElementById('passwordError');
            errElement.classList.remove('hidden');
        }
    } catch (e) {
        alert('Login error: ' + e.message);
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
}

function toggleOverflowMenu(e) {
    if (e) e.stopPropagation();
    var menu = document.getElementById('overflowMenu');
    if (!menu) return;

    if (!menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        return;
    }

    // Position menu near the clicked button
    if (e && e.currentTarget) {
        var rect = e.currentTarget.getBoundingClientRect();
        var isMobile = window.innerWidth < 768;
        if (isMobile) {
            // Bottom sheet style: full-width, anchored above the nav bar
            menu.style.left = '8px';
            menu.style.right = '8px';
            menu.style.width = 'auto';
            menu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
            menu.style.top = 'auto';
            menu.style.borderRadius = '16px 16px 0 0';
            menu.style.maxHeight = (rect.top - 16) + 'px';
            menu.style.overflowY = 'auto';
        } else {
            // Desktop dropdown below the button
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
    document.getElementById('cloudSettingsModal').classList.remove('hidden');
}

function closeCloudSettings(e) {
    if (e && e.target !== document.getElementById('cloudSettingsModal')) return;
    document.getElementById('cloudSettingsModal').classList.add('hidden');
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
    const item = appState.inventory.find(i => i.id === itemId);
    if (!item) return;
    document.getElementById('detailItemName').innerText = item.name;
    document.getElementById('detailItemCategory').innerText = item.category;
    document.getElementById('detailItemLocation').innerText = (item.segment || '') + ' > ' + (item.container || '') + (item.subContainer ? ' > ' + item.subContainer : '');
    document.getElementById('detailItemOwner').innerText = item.owner || 'Default';
    document.getElementById('detailItemExpiry').innerText = item.expiryDate || '\u2014';
    if (item.itemType === 'stock') {
        var qtyWarn = item.quantity <= item.minQuantity && item.minQuantity > 0 ? ' \u26A0\uFE0F Low stock' : '';
        document.getElementById('detailItemStockRow').classList.remove('hidden');
        document.getElementById('detailItemStock').innerText = (item.quantity || 0) + ' ' + (item.uom || 'pcs') + '  /  min ' + (item.minQuantity || 0) + qtyWarn;
    } else {
        document.getElementById('detailItemStockRow').classList.add('hidden');
    }
    document.getElementById('detailItemTime').innerText = item.timestamp;
    document.getElementById('detailItemRemarks').innerText = item.remarks || 'None';
    document.getElementById('detailItemId').innerText = item.id;
    if (item.aiMetadata) {
        document.getElementById('detailItemRemarks').innerText += '\n\n\uD83E\uDD16 AI: ' + item.aiMetadata;
    }
    const img = document.getElementById('detailItemImage');
    if (item.imageUrl && item.imageUrl !== 'https://placehold.co/100?text=No+Photo') {
        img.src = item.imageUrl;
        img.classList.remove('hidden');
    } else {
        img.classList.add('hidden');
    }
    document.getElementById('itemDetailModal').classList.remove('hidden');
    _currentBarcodeItemId = item.id;
    _currentBarcodeItemName = item.name;

    // Generate barcode
    setTimeout(function() {
        try {
            JsBarcode('#detailItemBarcode', item.id, {
                format: 'CODE128',
                width: 1.5,
                height: 48,
                displayValue: false,
                margin: 4,
                background: '#ffffff',
                lineColor: '#1e293b'
            });
            document.getElementById('detailItemBarcodeLabel').innerText = item.name;
        } catch(e) {
            document.getElementById('detailItemBarcode').style.display = 'none';
            document.getElementById('detailItemBarcodeLabel').innerText = '';
        }
    }, 50);
}

var _currentBarcodeItemId = null;
var _currentBarcodeItemName = null;

var _html5QrScanner = null;

function startBarcodeScan() {
    var container = document.getElementById('scanReaderContainer');
    var btnStart = document.getElementById('btnStartScan');
    var btnStop = document.getElementById('btnStopScan');

    if (typeof Html5Qrcode === 'undefined') {
        alert(t('scanCameraError'));
        return;
    }

    try {
        container.classList.remove('hidden');
        btnStart.classList.add('hidden');
        btnStop.classList.remove('hidden');
        document.getElementById('scanNotFoundCard').classList.add('hidden');
        document.getElementById('scanResultCard').classList.add('hidden');

        _html5QrScanner = new Html5Qrcode('scanReaderContainer', { verbose: false });
        _html5QrScanner.start(
            { facingMode: 'environment' },
            {
                fps: 15,
                aspectRatio: 1.777,
                disableFlip: false,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            },
            function onScanSuccess(decodedText) {
                stopBarcodeScan();
                displayScanResult(decodedText.trim());
            },
            function onScanError() {}
        ).catch(function(err) {
            container.classList.add('hidden');
            btnStart.classList.remove('hidden');
            btnStop.classList.add('hidden');
            alert(t('scanCameraError'));
        });
    } catch(e) {
        container.classList.add('hidden');
        btnStart.classList.remove('hidden');
        btnStop.classList.add('hidden');
        alert(t('scanCameraError'));
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
        alert(t('scanCameraError'));
        return;
    }

    // Create a temporary scanner overlay in the register page
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
        _html5QrScanner = new Html5Qrcode('stockScanReader', { verbose: false });
        _html5QrScanner.start(
            { facingMode: 'environment' },
            { fps: 15, aspectRatio: 1.777, disableFlip: false, experimentalFeatures: { useBarCodeDetectorIfSupported: true } },
            function onScanSuccess(decodedText) {
                cancelStockBarcodeScan();
                var id = decodedText.trim();
                var item = appState.inventory.find(function(i) { return i.id === id; });
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
            alert(t('scanCameraError'));
        });
    } catch(e) {
        cancelStockBarcodeScan();
        alert(t('scanCameraError'));
    }
}

function cancelStockBarcodeScan() {
    if (_html5QrScanner) {
        try { _html5QrScanner.stop().then(function() { _html5QrScanner.clear(); }).catch(function() {}); } catch(e) {}
        _html5QrScanner = null;
    }
    var overlay = document.getElementById('stockScanOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function displayScanResult(id) {
    document.getElementById('scanManualIdInput').value = id;
    document.getElementById('scanNotFoundCard').classList.add('hidden');
    document.getElementById('scanResultCard').classList.add('hidden');

    var item = appState.inventory.find(function(i) { return i.id === id; });
    if (!item) {
        document.getElementById('scanNotFoundCard').classList.remove('hidden');
        return;
    }

    _currentScanItemId = item.id;
    var isStock = item.itemType === 'stock';

    document.getElementById('scanResultName').innerText = item.name;
    document.getElementById('scanResultCategory').innerText = item.category;
    document.getElementById('scanResultLocation').innerText = (item.segment || '') + ' \u203A ' + (item.container || '') + (item.subContainer ? ' \u203A ' + item.subContainer : '');
    document.getElementById('scanResultOwner').innerText = item.owner || 'Default';
    document.getElementById('scanResultExpiry').innerText = item.expiryDate || '\u2014';
    document.getElementById('scanResultRemarks').innerText = item.remarks || 'None';

    var stockInfo = document.getElementById('scanResultStockInfo');
    var stockText = document.getElementById('scanResultStockText');
    if (isStock) {
        stockInfo.classList.remove('hidden');
        stockText.innerText = (item.quantity || 0) + ' ' + (item.uom || 'pcs') + (item.quantity <= item.minQuantity && item.minQuantity > 0 ? ' \u26A0\uFE0F Below min (' + item.minQuantity + ')' : '');
    } else {
        stockInfo.classList.add('hidden');
    }

    document.getElementById('btnScanDrop').classList.toggle('hidden', isStock);
    document.getElementById('btnScanDrop').classList.toggle('flex', !isStock);
    document.getElementById('btnScanOut').classList.toggle('hidden', !isStock);
    document.getElementById('btnScanOut').classList.toggle('flex', isStock);
    document.getElementById('btnScanIn').classList.toggle('hidden', !isStock);
    document.getElementById('btnScanIn').classList.toggle('flex', isStock);

    var img = document.getElementById('scanResultImage');
    if (item.imageUrl && item.imageUrl !== 'https://placehold.co/100?text=No+Photo' && !item.imageUrl.match(/^\[TRUNCATED\]/)) {
        img.src = item.imageUrl;
        img.classList.remove('hidden');
    } else {
        img.classList.add('hidden');
    }

    document.getElementById('scanResultCard').classList.remove('hidden');
    document.getElementById('scanResultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

var _currentScanItemId = null;

function scanEditItem() {
    if (!_currentScanItemId) return;
    setupItemModificationContext(_currentScanItemId);
    switchTab('tab-register');
}

function scanDropItem() {
    if (!_currentScanItemId) return;
    var item = appState.inventory.find(function(i) { return i.id === _currentScanItemId; });
    if (!item) return;
    if (!confirm('Drop "' + item.name + '"? This cannot be undone.')) return;
    removeItemFromInventory(_currentScanItemId);
    document.getElementById('scanResultCard').classList.add('hidden');
    document.getElementById('scanNotFoundCard').classList.remove('hidden');
    document.getElementById('scanNotFoundCard').querySelector('span').innerText = '"' + item.name + '" removed.';
    syncUIComponents();
}

function scanStockOut() {
    if (!_currentScanItemId) return;
    var item = appState.inventory.find(function(i) { return i.id === _currentScanItemId; });
    if (!item || item.itemType !== 'stock') return;
    var currentQty = item.quantity || 0;
    var uom = item.uom || 'pcs';
    var input = prompt('Deduct quantity from "' + item.name + '"?\nCurrent: ' + currentQty + ' ' + uom + '\nEnter amount to remove:', '');
    if (input === null) return;
    var amount = parseInt(input);
    if (isNaN(amount) || amount <= 0) { alert('Please enter a positive number.'); return; }
    if (amount > currentQty) { alert('Cannot remove more than current stock (' + currentQty + ').'); return; }
    item.quantity = currentQty - amount;
    saveStateToLocalStorage();
    syncUIComponents();
    displayScanResult(_currentScanItemId);
    showToast('Removed ' + amount + ' ' + uom + ' — now ' + item.quantity, 'success');
}

function scanStockIn() {
    if (!_currentScanItemId) return;
    var item = appState.inventory.find(function(i) { return i.id === _currentScanItemId; });
    if (!item || item.itemType !== 'stock') return;
    var currentQty = item.quantity || 0;
    var uom = item.uom || 'pcs';
    var input = prompt('Add quantity to "' + item.name + '"?\nCurrent: ' + currentQty + ' ' + uom + '\nEnter amount to add:', '');
    if (input === null) return;
    var amount = parseInt(input);
    if (isNaN(amount) || amount <= 0) { alert('Please enter a positive number.'); return; }
    item.quantity = currentQty + amount;
    saveStateToLocalStorage();
    syncUIComponents();
    displayScanResult(_currentScanItemId);
    showToast('Added ' + amount + ' ' + uom + ' — now ' + item.quantity, 'success');
}

function downloadBarcodeLabel() {
    if (!_currentBarcodeItemId) return;
    var svg = document.getElementById('detailItemBarcode');
    if (!svg) return;

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var svgData = new XMLSerializer().serializeToString(svg);
    var img = new Image();

    img.onload = function() {
        var labelW = Math.max(img.width + 20, 260);
        var labelH = img.height + 52;
        canvas.width = labelW * 2;
        canvas.height = labelH * 2;
        ctx.scale(2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, labelW, labelH);
        ctx.drawImage(img, (labelW - img.width) / 2, 6);
        ctx.fillStyle = '#1e293b';
        ctx.font = '11px "Inter", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(_currentBarcodeItemName || '', labelW / 2, img.height + 22);
        ctx.font = '9px monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText(_currentBarcodeItemId || '', labelW / 2, img.height + 40);

        var url = canvas.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Label_' + (_currentBarcodeItemName || 'item').replace(/[^a-zA-Z0-9]/g, '_') + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

function closeItemDetail() {
    document.getElementById('itemDetailModal').classList.add('hidden');
}

/* ==========================================================================
   Section 2.5: User Management
   ========================================================================== */
function switchCurrentUser(username) {
    appState.currentUser = username;
    saveStateToLocalStorage();
    syncUserInterface();
    renderFilteredInventoryTable();
}

function switchLanguage(lang) {
    appState.language = lang;
    saveStateToLocalStorage();
    applyLanguageToDOM();
    syncUIComponents();
    // Re-apply dynamic form title
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
        saveStateToLocalStorage();
        syncUserInterface();
        input.value = '';
        emailInput.value = '';
    }
}

function removeUser(username) {
    if (!confirm(t('confirmRemoveUser') + ' "' + username + '"?')) return;
    if (username === 'Default') { alert(t('cannotRemoveDefault')); return; }
    appState.users = appState.users.filter(u => u !== username);
    if (appState.currentUser === username) {
        appState.currentUser = 'Default';
    }
    saveStateToLocalStorage();
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
    saveStateToLocalStorage();
    alert('Reminder set to ' + appState.reminderDays + ' days before expiry.');
}

/* ==========================================================================
   Section 3: Segment Configurator & Spatial Mapping (3-level)
   ========================================================================== */
function addSegmentNode() {
    const sName = document.getElementById('newSegmentName').value.trim();
    if (!sName) { alert('No name entered'); return; }

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
            appState.inventory.forEach(function(item) { if (item.segment === oldName) item.segment = sName; });
            if (appState.activeMappingNode && appState.activeMappingNode.segment === oldName) {
                appState.activeMappingNode.segment = sName;
            }
            saveStateToLocalStorage();
            syncUIComponents();
            var count = 0;
            appState.inventory.forEach(function(it) { if (it.segment === sName) count++; });
            alert('Renamed: ' + oldName + ' -> ' + sName + ' (' + count + ' items updated)');
        } else {
            alert('Cannot rename: oldName=' + oldName + ' sName=' + sName + ' exists=' + (appState.segments[sName] ? 'yes' : 'no'));
        }
        clearEditingState();
        return;
    }

    if (!appState.segments[sName]) {
        appState.segments[sName] = {};
        saveStateToLocalStorage();
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
        if (!newSeg) { alert('Select a target segment.'); return; }

        var isMove = (oldSeg !== newSeg);
        var isRename = (oldName !== newName);
        if (!isMove && !isRename) { clearEditingState(); return; }
        if (appState.segments[newSeg] && appState.segments[newSeg][newName] && (newSeg !== oldSeg || newName !== oldName)) {
            alert('Container "' + newName + '" already exists in ' + newSeg + '.');
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
        });
        if (appState.activeMappingNode && appState.activeMappingNode.segment === oldSeg && appState.activeMappingNode.container === oldName) {
            appState.activeMappingNode.segment = newSeg;
            appState.activeMappingNode.container = newName;
            document.getElementById('activeMappingContainerNode').innerText = newSeg + ' > ' + newName;
        }
        saveStateToLocalStorage();
        syncUIComponents();
        alert('Updated: ' + oldSeg + ' > ' + oldName + ' → ' + newSeg + ' > ' + newName);
        clearEditingState();
        return;
    }

    if (!appState.segments[segment]) appState.segments[segment] = {};
    if (!appState.segments[segment][cName]) {
        appState.segments[segment][cName] = [];
        saveStateToLocalStorage();
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
        if (!newSeg || !newCon) { alert('Select target segment and container.'); return; }

        var isMove = (oldSeg !== newSeg || oldCon !== newCon);
        var isRename = (oldName !== newName);
        if (!isMove && !isRename) { clearEditingState(); return; }
        if ((isMove || isRename) && appState.segments[newSeg] && appState.segments[newSeg][newCon] && appState.segments[newSeg][newCon].includes(newName) && (newSeg !== oldSeg || newCon !== oldCon || newName !== oldName)) {
            alert('Sub-container "' + newName + '" already exists in ' + newSeg + ' > ' + newCon + '.');
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
        });
        if (appState.activeMappingNode && appState.activeMappingNode.segment === oldSeg && appState.activeMappingNode.container === oldCon && appState.activeMappingNode.subContainer === oldName) {
            appState.activeMappingNode.segment = newSeg;
            appState.activeMappingNode.container = newCon;
            appState.activeMappingNode.subContainer = newName;
            document.getElementById('activeMappingContainerNode').innerText = newSeg + ' > ' + newCon + ' > ' + newName;
        }
        saveStateToLocalStorage();
        syncUIComponents();
        alert('Updated: ' + oldSeg + ' > ' + oldCon + ' > ' + oldName + ' → ' + newSeg + ' > ' + newCon + ' > ' + newName);
        clearEditingState();
        return;
    }

    if (!appState.segments[segment]) appState.segments[segment] = {};
    if (!appState.segments[segment][container]) appState.segments[segment][container] = [];
    if (!appState.segments[segment][container].includes(scName)) {
        appState.segments[segment][container].push(scName);
        saveStateToLocalStorage();
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

function deleteSegmentNode(seg) {
    if (!confirm(t('confirmDeleteSeg') + ' "' + seg + '" ' + t('members') + '?')) return;
    delete appState.segments[seg];
    // Clean up all coordinates under this segment
    Object.keys(appState.coordinates).forEach(function(k) {
        if (k.indexOf(seg + '|') === 0) delete appState.coordinates[k];
    });
    if (appState.activeMappingNode && appState.activeMappingNode.segment === seg) {
        appState.activeMappingNode = null;
        document.getElementById('activeMappingContainerNode').innerText = t('noneSelected');
        document.getElementById('btnClearActiveNode').classList.add('hidden');
    }
    saveStateToLocalStorage();
    syncUIComponents();
}

function deleteContainerNode(seg, con) {
    if (!confirm(t('confirmDeleteCon') + ' "' + seg + ' > ' + con + '"?')) return;
    if (appState.segments[seg]) delete appState.segments[seg][con];
    // Clean up container-level coordinates
    var containerKey = buildCoordKey(seg, con, '');
    delete appState.coordinates[containerKey];
    // Clean up sub-container coordinates under this container
    Object.keys(appState.coordinates).forEach(function(k) {
        if (k.indexOf(seg + '|' + con + '|') === 0) delete appState.coordinates[k];
    });
    if (appState.activeMappingNode && appState.activeMappingNode.segment === seg && appState.activeMappingNode.container === con) {
        appState.activeMappingNode = null;
        document.getElementById('activeMappingContainerNode').innerText = t('noneSelected');
        document.getElementById('btnClearActiveNode').classList.add('hidden');
    }
    saveStateToLocalStorage();
    syncUIComponents();
}

function deleteSubContainerNode(seg, con, sub) {
    if (!confirm(t('confirmDeleteSub') + ' "' + seg + ' > ' + con + ' > ' + sub + '"?')) return;
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
    saveStateToLocalStorage();
    syncUIComponents();
}

function clearActiveNode() {
    appState.activeMappingNode = null;
    document.getElementById('activeMappingContainerNode').innerText = t('noneSelected');
    document.getElementById('btnClearActiveNode').classList.add('hidden');
    clearEditingState();
    renderSpatialMapGrid();
    renderContainerAssetList();
}

function markMapDirty() {
    _mapDirty = true;
    var btn = document.getElementById('btnSaveLayout');
    if (btn) {
        btn.classList.remove('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
        btn.classList.add('bg-amber-500', 'text-white', 'hover:bg-amber-600');
        var label = btn.querySelector('.btn-label');
        if (label) label.innerText = 'Save *';
    }
}

function saveLayoutMap() {
    saveStateToLocalStorage();
    triggerAutoCloudSyncIfPossible();
    _mapDirty = false;
    var btn = document.getElementById('btnSaveLayout');
    if (btn) {
        btn.classList.remove('bg-amber-500', 'text-white', 'hover:bg-amber-600');
        btn.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
        var label = btn.querySelector('.btn-label');
        if (label) label.innerText = 'Save';
    }
}

function markClassesDirty() {
    _classesDirty = true;
    var btn = document.getElementById('btnSaveClassification');
    if (btn) {
        btn.classList.remove('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
        btn.classList.add('bg-amber-500', 'text-white', 'hover:bg-amber-600');
        var label = btn.querySelector('.btn-label');
        if (label) label.innerText = 'Save *';
    }
}

function saveClassification() {
    saveStateToLocalStorage();
    triggerAutoCloudSyncIfPossible();
    _classesDirty = false;
    var btn = document.getElementById('btnSaveClassification');
    if (btn) {
        btn.classList.remove('bg-amber-500', 'text-white', 'hover:bg-amber-600');
        btn.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
        var label = btn.querySelector('.btn-label');
        if (label) label.innerText = 'Save';
    }
}

function selectNodeForAssets(seg, con, sub) {
    appState.activeMappingNode = { segment: seg, container: con || null, subContainer: sub || null };
    var label = seg;
    if (con) label += ' > ' + con;
    if (sub) label += ' > ' + sub;
    document.getElementById('activeMappingContainerNode').innerText = label;
    document.getElementById('btnClearActiveNode').classList.remove('hidden');
    // Populate configurator for editing but don't auto-expand
    if (sub) populateConfiguratorForEdit('subContainer', seg, con, sub);
    else if (con) populateConfiguratorForEdit('container', seg, con);
    else populateConfiguratorForEdit('segment', seg);
    renderContainerAssetList();
    renderSpatialMapGrid();
}

function selectSubContainerForMapping(segment, container, subContainer) {
    appState.activeMappingNode = { segment, container, subContainer };
    document.getElementById('activeMappingContainerNode').innerText = `${segment} > ${container} > ${subContainer}`;
    document.getElementById('btnClearActiveNode').classList.remove('hidden');
    populateConfiguratorForEdit('subContainer', segment, container, subContainer);
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
                const dimensions = gridMatrix.getBoundingClientRect();
                const xPercent = Math.round(((e.clientX - dimensions.left) / dimensions.width) * 100);
                const yPercent = Math.round(((e.clientY - dimensions.top) / dimensions.height) * 100);
                appState.coordinates[nodeKey] = { x: xPercent, y: yPercent };
                markMapDirty();
                renderSpatialMapGrid();
                placed = true;
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
    var grid = document.getElementById('spatialMapGridMatrix');
    var rect = grid.getBoundingClientRect();
    var startX = e.touches ? e.touches[0].clientX : e.clientX;
    var startY = e.touches ? e.touches[0].clientY : e.clientY;

    function onMove(ev) {
        ev.preventDefault();
        var clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        var clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
        var dx = clientX - startX;
        var dy = clientY - startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            window._markerDidDrag = true;
        }
        var pctX = Math.round(((clientX - rect.left) / rect.width) * 100);
        var pctY = Math.round(((clientY - rect.top) / rect.height) * 100);
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

    compressImageFile(file, 1600, 0.75, function(dataUrl) {
        appState.spatialBackgroundImage = dataUrl;
        markMapDirty();
        renderSpatialMapGrid();
    });
    event.target.value = '';
}

function clearLayoutBackground() {
    appState.spatialBackgroundImage = null;
    markMapDirty();
    renderSpatialMapGrid();
}

function renderContainerAssetList() {
    const panel = document.getElementById('containerAssetsPanel');
    const label = document.getElementById('containerAssetsLabel');
    const countEl = document.getElementById('containerAssetsCount');
    const listEl = document.getElementById('containerAssetsList');

    if (!appState.activeMappingNode) {
        panel.classList.add('hidden');
        return;
    }

    const { segment, container, subContainer } = appState.activeMappingNode;
    const assets = appState.inventory.filter(item => {
        if (item.segment !== segment) return false;
        if (container && item.container !== container) return false;
        if (subContainer && item.subContainer !== subContainer) return false;
        return true;
    });

    var nodeLabel = segment;
    if (container) nodeLabel += ' > ' + container;
    if (subContainer) nodeLabel += ' > ' + subContainer;

    panel.classList.remove('hidden');
    label.innerText = nodeLabel;
    countEl.innerText = `${assets.length} item${assets.length !== 1 ? 's' : ''}`;

    if (assets.length === 0) {
        listEl.innerHTML = '<p class="text-slate-400 italic p-2">No assets registered here.</p>';
        return;
    }

    listEl.innerHTML = assets.map(item => `
        <div class="container-asset-item flex items-center gap-3 p-2 rounded-lg border border-slate-100 cursor-pointer" onclick="switchTab('tab-inventory'); document.getElementById('filterSearchQuery').value='${item.name.replace(/'/g, "\\'")}'; renderFilteredInventoryTable();">
            <img src="${item.imageUrl}" class="h-8 w-8 object-cover rounded border border-slate-200 bg-slate-100" onerror="this.src='https://placehold.co/100?text=Error'">
            <div class="flex-1 min-w-0">
                <div class="font-semibold text-slate-800 truncate">${item.name}</div>
                <div class="text-[10px] text-slate-400">${item.subContainer || '—'} · ${item.category} · 👤 ${item.owner || 'Default'}</div>
            </div>
            <span class="text-[10px] text-slate-400 whitespace-nowrap">${item.timestamp}</span>
        </div>
    `).join('');
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
        syncUIComponents();
        document.getElementById('newCategoryNodeName').value = '';
        resetCategorySelectionContext();
    }
}

function deleteSelectedCategoryNode() {
    if (!appState.selectedCategoryNodePath || appState.selectedCategoryNodePath.length === 0) return;

    const confirmPurge = confirm("Permanently drop selected classification node path branches?");
    if (!confirmPurge) return;

    const pathToDelete = [...appState.selectedCategoryNodePath];
    const targetNodeKey = pathToDelete.pop();

    let targetParentMap = appState.categories;
    if (pathToDelete.length > 0) {
        targetParentMap = getCategoryNodeByPath(appState.categories, pathToDelete);
    }

    if (targetParentMap && targetParentMap[targetNodeKey]) {
        delete targetParentMap[targetNodeKey];
        markClassesDirty();
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
    var stockFields = document.getElementById('stockFieldsContainer');
    var scanBtn = document.getElementById('btnScanExistingBarcode');
    if (type === 'stock') {
        btnUnique.className = 'flex-1 text-xs font-medium py-2 px-3 bg-white text-slate-500 transition-colors';
        btnStock.className = 'flex-1 text-xs font-medium py-2 px-3 bg-amber-600 text-white transition-colors';
        stockFields.classList.remove('hidden');
        scanBtn.classList.remove('hidden');
    } else {
        btnUnique.className = 'flex-1 text-xs font-medium py-2 px-3 bg-blue-600 text-white transition-colors';
        btnStock.className = 'flex-1 text-xs font-medium py-2 px-3 bg-white text-slate-500 transition-colors';
        stockFields.classList.add('hidden');
        scanBtn.classList.add('hidden');
        document.getElementById('invItemUom').value = '';
        document.getElementById('invItemQuantity').value = '';
        document.getElementById('invItemMinQuantity').value = '';
    }
}

function commitItemToInventory() {
    const name = document.getElementById('invItemName').value.trim();
    const categoryStr = buildCategoryPathFromSelects();
    const segment = document.getElementById('invItemSegmentSelect').value;
    const container = document.getElementById('invItemContainerSelect').value;
    const subContainer = document.getElementById('invItemSubContainerSelect').value;
    const imageUrl = document.getElementById('invItemImageUrl').value.trim();
    const remarks = document.getElementById('invItemRemarks').value.trim();
    const editId = document.getElementById('editTargetItemId').value;

    if (!name || !categoryStr || !segment || !container) {
        alert(t('pleaseComplete'));
        return;
    }

    const payloadItem = {
        id: editId ? editId : 'item_' + Date.now(),
        name,
        brand: document.getElementById('invItemBrand').value.trim(),
        category: categoryStr,
        segment,
        container,
        subContainer: subContainer || '',
        owner: document.getElementById('invItemOwnerSelect').value || appState.currentUser || 'Default',
        imageUrl: imageUrl || 'https://placehold.co/100?text=No+Photo',
        remarks,
        aiMetadata: document.getElementById('invItemAiMetadata').value.trim(),
        purchaseDate: document.getElementById('invItemPurchaseDate').value,
        warrantyDate: document.getElementById('invItemWarrantyDate').value,
        expiryDate: document.getElementById('invItemExpiryDate').value,
        itemType: document.getElementById('stockFieldsContainer').classList.contains('hidden') ? 'unique' : 'stock',
        uom: document.getElementById('stockFieldsContainer').classList.contains('hidden') ? '' : document.getElementById('invItemUom').value.trim(),
        quantity: document.getElementById('stockFieldsContainer').classList.contains('hidden') ? 0 : (parseInt(document.getElementById('invItemQuantity').value) || 0),
        minQuantity: document.getElementById('stockFieldsContainer').classList.contains('hidden') ? 0 : (parseInt(document.getElementById('invItemMinQuantity').value) || 0),
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    if (editId) {
        const idx = appState.inventory.findIndex(i => i.id === editId);
        if (idx !== -1) appState.inventory[idx] = payloadItem;
    } else {
        appState.inventory.push(payloadItem);
    }

    saveStateToLocalStorage();
    if (editId) {
        clearInventoryFormContext();
    } else {
        softClearForNextItem();
    }
    syncUIComponents();
    triggerAutoCloudSyncIfPossible();
}

function setupItemModificationContext(itemId) {
    try {
        const item = appState.inventory.find(i => i.id === itemId);
        if (!item) { alert(t('itemNotFound') + itemId); return; }

        switchTab('tab-register');
        document.getElementById('inventoryFormTitle').innerText = t('modifyFormTitle');
        document.getElementById('btnResetFormState').classList.remove('hidden');

        document.getElementById('editTargetItemId').value = item.id;
        document.getElementById('invItemName').value = item.name;
        document.getElementById('invItemBrand').value = item.brand || '';
        if (item.itemType === 'stock') {
            switchItemType('stock');
            document.getElementById('invItemUom').value = item.uom || '';
            document.getElementById('invItemQuantity').value = item.quantity || 0;
            document.getElementById('invItemMinQuantity').value = item.minQuantity || 0;
        } else {
            switchItemType('unique');
        }
        setCascadingCategorySelects(item.category);

        document.getElementById('invItemSegmentSelect').value = item.segment;

        syncInventoryFormContainersDropdown();
        document.getElementById('invItemContainerSelect').value = item.container;
        syncInventoryFormSubContainersDropdown();
        document.getElementById('invItemSubContainerSelect').value = item.subContainer || '';
        document.getElementById('invItemOwnerSelect').value = item.owner || appState.currentUser || 'Default';

        const rawImg = item.imageUrl;
        const isPlaceholder = (rawImg === 'https://placehold.co/100?text=No+Photo' || !rawImg);
        document.getElementById('invItemImageUrl').value = isPlaceholder ? '' : rawImg;
        const preview = document.getElementById('invItemImagePreview');
        if (!isPlaceholder) {
            preview.src = rawImg;
            preview.classList.remove('hidden');
            document.getElementById('btnAIAnalyze').style.display = '';
        } else {
            preview.src = '';
            preview.classList.add('hidden');
            document.getElementById('btnAIAnalyze').style.display = 'none';
        }
        document.getElementById('invItemRemarks').value = item.remarks;
        document.getElementById('invItemAiMetadata').value = item.aiMetadata || '';
        document.getElementById('invItemPurchaseDate').value = item.purchaseDate || '';
        document.getElementById('invItemWarrantyDate').value = item.warrantyDate || '';
        document.getElementById('invItemExpiryDate').value = item.expiryDate || '';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        alert(t('editError') + err.message);
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
    switchItemType('unique');
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
    switchItemType('unique');
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
    switchItemType('unique');
    var preview = document.getElementById('invItemImagePreview');
    preview.src = '';
    preview.classList.add('hidden');
    document.getElementById('btnAIAnalyze').style.display = 'none';
    if (document.getElementById('invItemOwnerSelect')) {
        document.getElementById('invItemOwnerSelect').value = appState.currentUser || 'Default';
    }
}

function removeItemFromInventory(itemId) {
    if (!confirm(t('confirmDeleteItem'))) return;
    appState.inventory = appState.inventory.filter(i => i.id !== itemId);
    saveStateToLocalStorage();
    syncUIComponents();
    triggerAutoCloudSyncIfPossible();
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

function handleAssetImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    _lastUploadedImageFile = file;

    compressImageFile(file, 1024, 0.7, function(dataUrl) {
        document.getElementById('invItemImageUrl').value = dataUrl;
        var preview = document.getElementById('invItemImagePreview');
        preview.src = dataUrl;
        preview.classList.remove('hidden');
        document.getElementById('btnAIAnalyze').style.display = '';
    });
    event.target.value = '';
}

function updateImagePreviewFromUrl() {
    const url = document.getElementById('invItemImageUrl').value.trim();
    const preview = document.getElementById('invItemImagePreview');
    if (url) {
        preview.src = url;
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
    if (!storedUrl && !_lastUploadedImageFile) { alert('Upload an image first.'); return; }

    const apiKey = localStorage.getItem('sys_ds_api_key');
    if (!apiKey) { alert(t('aiNoKey')); return; }

    const btn = document.getElementById('btnAIAnalyze');
    btn.disabled = true;
    btn.innerText = 'Analyzing...';

    try {
        // Build imageUrl for API: prefer original file for quality, fallback to stored URL
        var imageUrl = storedUrl;
        if (_lastUploadedImageFile) {
            imageUrl = await new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function() { resolve(reader.result); };
                reader.onerror = function() { reject(new Error('Failed to read image file')); };
                reader.readAsDataURL(_lastUploadedImageFile);
            });
            // Only use the original file once, then clear
            _lastUploadedImageFile = null;
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
        alert('AI analysis failed: ' + err.message);
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
        alert(t('noItemsExport'));
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
            "Image Link Asset",
            "User Remarks Annotation",
            "Last System Entry Update"
        ];

        var flatRows = appState.inventory.map(function(item) {
            return {
                "System ID": safeCell(item.id || ''),
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
                "Quantity": item.itemType === 'stock' ? (item.quantity || 0) : '',
                "Min Quantity": item.itemType === 'stock' ? (item.minQuantity || 0) : '',
                "Image Link Asset": safeCell(item.imageUrl || ''),
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
        alert('Export failed: ' + err.message);
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
        // Strip truncation marker: "[TRUNCATED] ... [...orig N chars]"
        var m = val.match(/^\[TRUNCATED\]\s([\s\S]*?)\s\[\u2026orig\s\d+\schars\]$/);
        if (m) return m[1];
        return val;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });

            var invSheetName = workbook.SheetNames.find(function(n) { return n === "Inventory Ledger"; }) || workbook.SheetNames[0];
            if (invSheetName && workbook.Sheets[invSheetName]) {
                var rows = XLSX.utils.sheet_to_json(workbook.Sheets[invSheetName]);
                rows.forEach(function(r) {
                    var id = cleanCell(r["System ID"]) || 'item_' + Math.floor(Math.random() * 1000000) + Date.now();
                    var name = cleanCell(r["Item Name"]) || 'Unnamed Imported Asset';
                    var brand = cleanCell(r["Brand"]) || '';
                    var category = cleanCell(r["Classification Route"]) || 'Foods';
                    var segment = cleanCell(r["Segment Zone"]) || 'Living Room';
                    var container = cleanCell(r["Container"]) || cleanCell(r["Sub-Container"]) || 'General Area';
                    var subContainer = cleanCell(r["Sub-Container"]) || '';
                    var owner = cleanCell(r["Owner"]) || 'Default';
                    var aiMd = cleanCell(r["AI Metadata"]) || '';
                    var purDate = cleanCell(r["Purchase Date"]) || '';
                    var warDate = cleanCell(r["Warranty Date"]) || '';
                    var expDate = cleanCell(r["Expiry Date"]) || '';
                    var itemType = cleanCell(r["Item Type"]) || 'unique';
                    var uom = cleanCell(r["UOM"]) || '';
                    var quantity = parseInt(cleanCell(r["Quantity"])) || 0;
                    var minQuantity = parseInt(cleanCell(r["Min Quantity"])) || 0;
                    var img = cleanCell(r["Image Link Asset"]) || 'https://placehold.co/100?text=No+Photo';
                    var rem = cleanCell(r["User Remarks Annotation"]) || '';
                    var time = cleanCell(r["Last System Entry Update"]) || new Date().toISOString().replace('T', ' ').substring(0, 16);

                    if (!appState.segments[segment]) appState.segments[segment] = {};
                    if (!appState.segments[segment][container]) appState.segments[segment][container] = [];
                    if (subContainer && !appState.segments[segment][container].includes(subContainer)) appState.segments[segment][container].push(subContainer);
                    if (owner && owner !== 'Default' && !appState.users.includes(owner)) appState.users.push(owner);

                    var existingIdx = appState.inventory.findIndex(function(i) { return i.id === id; });
                    var item = { id:id, name:name, brand:brand, category:category, segment:segment, container:container, subContainer:subContainer, owner:owner, aiMetadata:aiMd, purchaseDate:purDate, warrantyDate:warDate, expiryDate:expDate, itemType:itemType, uom:uom, quantity:quantity, minQuantity:minQuantity, imageUrl:img, remarks:rem, timestamp:time };
                    if (existingIdx !== -1) appState.inventory[existingIdx] = item;
                    else appState.inventory.push(item);
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
            alert("Spreadsheet processing successfully parsed.");
        } catch(err) {
            alert("Error decoding file contents: " + err.message);
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

    alert("Local infrastructure access profile updated.");
}

async function triggerSynchronousCloudBackupPush() {
    const endpoint = localStorage.getItem('sys_gas_url');
    const secret = localStorage.getItem('sys_api_pwd');
    if(!endpoint) { alert("Missing Google Script Deployment endpoint link URL profiles."); return; }

    try {
        const stateJson = buildSyncPayload();

        // Form POST for push (reaches server, no CORS needed for form submission)
        var iframe = document.getElementById('syncHiddenFrame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'syncHiddenFrame';
            iframe.name = 'syncHiddenFrame';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }

        var form = document.getElementById('syncHiddenForm');
        if (!form) {
            form = document.createElement('form');
            form.id = 'syncHiddenForm';
            form.method = 'POST';
            form.action = endpoint;
            form.target = 'syncHiddenFrame';
            form.style.display = 'none';
            document.body.appendChild(form);
        } else {
            form.action = endpoint;
            form.innerHTML = '';
        }

        addFormField(form, 'token', secret);
        addFormField(form, 'action', 'SYNC_PUSH');
        addFormField(form, 'payload', stateJson);

        form.submit();
        document.getElementById('syncStatusBadge').innerText = '📤 ' + t('pushed');
        document.getElementById('syncStatusBadge').className = 'text-[10px] text-blue-600 font-medium';
    } catch (e) {
        document.getElementById('syncStatusBadge').innerText = '❌ ' + t('offline');
        document.getElementById('syncStatusBadge').className = 'text-[10px] text-red-500 font-medium';
    }
}

function buildSyncPayload() {
    return JSON.stringify(appState);
}

function getSyncPayloadSize() {
    return buildSyncPayload().length;
}

function addFormField(form, name, value) {
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
}

function jsonpFetch(url, callbackName, timeoutMs) {
    return new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        var timer = setTimeout(function() {
            cleanup();
            reject(new Error('JSONP timeout'));
        }, timeoutMs || 15000);

        function cleanup() {
            clearTimeout(timer);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }

        window[callbackName] = function(data) {
            cleanup();
            resolve(data);
        };

        script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'jsonp=' + callbackName;
        script.onerror = function() {
            cleanup();
            reject(new Error('JSONP script load failed'));
        };
        document.head.appendChild(script);
    });
}

function showToast(message, type) {
    var toast = document.getElementById('syncToast');
    if (!toast) return;
    var icon = '';
    if (type === 'info') icon = '<span class="toast-spinner"></span>';
    else if (type === 'success') icon = '<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
    else if (type === 'error') icon = '<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
    toast.className = type;
    toast.innerHTML = icon + ' <span>' + message + '</span>';
    toast.classList.add('show');
    if (type === 'success' || type === 'error') {
        clearTimeout(toast._timer);
        toast._timer = setTimeout(function() {
            toast.classList.remove('show');
        }, 2500);
    }
}

function hideToast() {
    var toast = document.getElementById('syncToast');
    if (toast) toast.classList.remove('show');
}

async function syncFromCloudWithToast() {
    var btns = document.querySelectorAll('.btn-sync-refresh');
    btns.forEach(function(b) { b.classList.add('btn-syncing'); });

    showToast('Syncing from Google Sheet\u2026', 'info');

    try {
        const endpoint = localStorage.getItem('sys_gas_url');
        const secret = localStorage.getItem('sys_api_pwd');
        if (!endpoint) {
            showToast('Missing Google Script URL', 'error');
            btns.forEach(function(b) { b.classList.remove('btn-syncing'); });
            return;
        }

        const url = `${endpoint}?token=${encodeURIComponent(secret)}&action=SYNC_PULL`;
        const json = await jsonpFetch(url, 'hkPullCallback', 15000);

        if (json && json.segments) {
            appState = json;
            saveStateToLocalStorage();
            syncUIComponents();
            var count = (json.inventory || []).length;
            document.getElementById('syncStatusBadge').innerText = '\u2705 ' + t('pulled') + ' ' + new Date().toLocaleTimeString();
            document.getElementById('syncStatusBadge').className = 'text-[10px] text-emerald-600 font-medium';
            showToast('Sync complete \u2014 ' + count + ' items loaded', 'success');
        } else {
            document.getElementById('syncStatusBadge').innerText = '\u274c ' + t('offline');
            document.getElementById('syncStatusBadge').className = 'text-[10px] text-red-500 font-medium';
            showToast('Sync failed \u2014 no data received', 'error');
        }
    } catch (e) {
        document.getElementById('syncStatusBadge').innerText = '\u274c Offline';
        document.getElementById('syncStatusBadge').className = 'text-[10px] text-red-500 font-medium';
        showToast('Sync failed \u2014 server unreachable', 'error');
    }

    btns.forEach(function(b) { b.classList.remove('btn-syncing'); });
}

async function triggerSynchronousCloudFetchPull() {
    syncFromCloudWithToast();
}

async function verifyCloudSync() {
    const endpoint = localStorage.getItem('sys_gas_url');
    const secret = localStorage.getItem('sys_api_pwd');
    if(!endpoint) { alert("Missing Google Script URL."); return; }

    try {
        const url = `${endpoint}?token=${encodeURIComponent(secret)}&action=SYNC_PULL`;
        const cloud = await jsonpFetch(url, 'hkVerifyCallback', 15000);
        const localItems = appState.inventory.length;
        const cloudItems = (cloud && cloud.inventory) ? cloud.inventory.length : -1;
        const localSegs = Object.keys(appState.segments).length;
        const cloudSegs = (cloud && cloud.segments) ? Object.keys(cloud.segments).length : -1;

        if (cloudItems === localItems && cloudSegs === localSegs) {
            document.getElementById('syncStatusBadge').innerText = '✅ ' + t('inSync') + ' (' + localItems + ' ' + t('items') + ')';
            document.getElementById('syncStatusBadge').className = 'text-[10px] text-emerald-600 font-medium';
        } else {
            document.getElementById('syncStatusBadge').innerText = '⚠️ ' + t('cloud') + ':' + cloudItems + ' ' + t('local') + ':' + localItems;
            document.getElementById('syncStatusBadge').className = 'text-[10px] text-amber-600 font-medium';
        }
    } catch(e) {
        document.getElementById('syncStatusBadge').innerText = '❌ ' + t('offline');
        document.getElementById('syncStatusBadge').className = 'text-[10px] text-red-500 font-medium';
    }
}

function triggerAutoCloudSyncIfPossible() {
    const endpoint = localStorage.getItem('sys_gas_url');
    if (endpoint) {
        triggerSynchronousCloudBackupPush().catch(function() {});
        setTimeout(function() {
            autoPullFromCloudIfPossible();
        }, 3000);
    }
}

function autoPullFromCloudIfPossible() {
    const endpoint = localStorage.getItem('sys_gas_url');
    const secret = localStorage.getItem('sys_api_pwd');
    if (!endpoint) return;

    try {
        var url = endpoint + '?token=' + encodeURIComponent(secret) + '&action=SYNC_PULL';
        jsonpFetch(url, 'hkAutoPullCb', 12000).then(function(json) {
            if (json && json.inventory) {
                var mergedState = migrateLegacyState(json);
                if (!mergedState.language) mergedState.language = appState.language;
                appState = mergedState;
                saveStateToLocalStorage();
                syncUIComponents();
            }
        }).catch(function() {});
    } catch(e) {}
}

/* ==========================================================================
   Section 7.5: DeepSeek AI Semantic Search Engine
   ========================================================================== */
async function performAISearch() {
    const description = document.getElementById('aiSearchDescription').value.trim();
    if (!description) return;

    const apiKey = localStorage.getItem('sys_ds_api_key');
    if (!apiKey) {
        alert(t('aiNoKey'));
        return;
    }

    if (appState.inventory.length === 0) {
        alert(t('noItems'));
        return;
    }

    const btn = document.getElementById('btnAISearch');
    const statusEl = document.getElementById('aiSearchStatus');
    btn.disabled = true;
    btn.innerText = 'Searching...';
    btn.className = 'absolute right-1 top-1 bottom-1 bg-indigo-400 text-white text-xs font-bold px-4 rounded-md ai-searching';
    statusEl.classList.remove('hidden');
    statusEl.innerText = t('aiAnalyzing');

    try {
        const inventoryMetadata = appState.inventory.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            segment: item.segment,
            container: item.container,
            subContainer: item.subContainer || '',
            owner: item.owner || 'Default',
            remarks: item.remarks,
            aiMetadata: item.aiMetadata || ''
        }));

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
            : t('aiNoMatch');
        document.getElementById('btnResetAISearch').classList.remove('hidden');

    } catch (err) {
        aiFilteredItemIds = null;
        statusEl.innerText = t('aiFailed') + err.message;
        document.getElementById('btnResetAISearch').classList.add('hidden');
    }

    btn.disabled = false;
    btn.innerText = 'AI Search';
    btn.className = 'absolute right-1 top-1 bottom-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 rounded-md transition-colors';
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

function setItemTypeFilter(filter) {
    _currentItemTypeFilter = filter;
    var btnAll = document.getElementById('btnFilterAll');
    var btnUnique = document.getElementById('btnFilterUnique');
    var btnStock = document.getElementById('btnFilterStock');
    btnAll.className = filter === 'all' ? 'text-[10px] font-medium px-2.5 py-1.5 bg-slate-800 text-white transition-colors' : 'text-[10px] font-medium px-2.5 py-1.5 bg-white text-slate-500 transition-colors';
    btnUnique.className = filter === 'unique' ? 'text-[10px] font-medium px-2.5 py-1.5 bg-blue-600 text-white transition-colors' : 'text-[10px] font-medium px-2.5 py-1.5 bg-white text-slate-500 transition-colors';
    btnStock.className = filter === 'stock' ? 'text-[10px] font-medium px-2.5 py-1.5 bg-amber-600 text-white transition-colors' : 'text-[10px] font-medium px-2.5 py-1.5 bg-white text-slate-500 transition-colors';
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
    localStorage.setItem('hk_inventory_state', JSON.stringify(appState));
}

function migrateLegacyState(state) {
    if (!state || !state.segments) return state;
    let migrated = false;

    // Migrate segments: array of strings -> object of arrays
    for (let seg in state.segments) {
        const val = state.segments[seg];
        if (Array.isArray(val)) {
            const newMap = {};
            val.forEach(cName => { newMap[cName] = []; });
            state.segments[seg] = newMap;
            migrated = true;
        }
    }

    // Migrate coordinates: 2-part key -> 3-part key
    const newCoords = {};
    for (let key in state.coordinates) {
        const parts = key.split(':');
        if (parts.length === 2) {
            newCoords[`${parts[0]}|${parts[1]}|—`] = state.coordinates[key];
            migrated = true;
        } else {
            newCoords[key] = state.coordinates[key];
        }
    }
    if (migrated) state.coordinates = newCoords;

    // Migrate inventory items: add subContainer if missing
    if (state.inventory) {
        state.inventory.forEach(item => {
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

    return state;
}

function restoreStateFromLocalStorage() {
    const data = localStorage.getItem('hk_inventory_state');
    if (data) {
        try {
            appState = JSON.parse(data);
            appState = migrateLegacyState(appState);
            saveStateToLocalStorage();
        } catch (e) {
            console.error("Local state compilation damaged.", e);
        }
    }
}

function purgeSystemStorageCache() {
    if (confirm(t('confirmPurge'))) {
        localStorage.removeItem('hk_inventory_state');
        location.reload();
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
}

function renderSpatialTreeHierarchy() {
    const treeBox = document.getElementById('spatialTreeHierarchy');
    treeBox.innerHTML = '';

    Object.keys(appState.segments).forEach(seg => {
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
    const tableBody = document.getElementById('inventoryTableDataRows');
    const query = document.getElementById('filterSearchQuery').value.toLowerCase().trim();
    const segFilter = document.getElementById('filterSegmentSelect').value;
    const catFilter = document.getElementById('filterCategorySelect').value;
    const conFilter = document.getElementById('filterContainerSelect').value;
    const ownerFilter = document.getElementById('filterOwnerSelect').value;

    tableBody.innerHTML = '';

    const targets = appState.inventory.filter(item => {
        if (aiFilteredItemIds && !aiFilteredItemIds.includes(item.id)) return false;
        if (_currentItemTypeFilter === 'unique' && item.itemType !== 'unique') return false;
        if (_currentItemTypeFilter === 'stock' && item.itemType !== 'stock') return false;
        const matchQuery = item.name.toLowerCase().includes(query) || item.remarks.toLowerCase().includes(query);
        const matchSeg = !segFilter || item.segment === segFilter;
        const matchCon = !conFilter || item.container === conFilter;
        const matchCat = !catFilter || item.category === catFilter || item.category.startsWith(catFilter + ' > ');
        const matchOwner = !ownerFilter || (item.owner || 'Default') === ownerFilter;
        return matchQuery && matchSeg && matchCon && matchCat && matchOwner;
    });

    document.getElementById('inventoryMetricCount').innerText = targets.length;

    if(targets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-xs font-medium text-slate-400">No storage dataset elements correspond with current query configurations.</td></tr>`;
        return;
    }

    targets.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/80 transition-colors";
        tr.innerHTML = `
            <td class="px-4 py-3 text-center">
                <img src="${item.imageUrl}" class="h-10 w-10 object-cover rounded-md border border-slate-200 mx-auto bg-slate-100" onerror="this.src='https://placehold.co/100?text=Error'">
            </td>
            <td class="px-4 py-3 cursor-pointer hover:bg-blue-50/50" onclick="showItemDetail('${item.id}')">
                <div class="font-bold text-slate-900 hover:text-blue-600">${item.name}</div>
                <div class="text-[10px] text-slate-400 font-mono mt-0.5">ID: ${item.id}</div>
                ${item.itemType === 'stock' ? '<div class="text-[10px] text-amber-600 font-medium mt-0.5">\uD83D\uDCE6 ' + (item.quantity||0) + ' ' + (item.uom||'pcs') + (item.quantity <= item.minQuantity && item.minQuantity > 0 ? ' \u26A0\uFE0F Low' : '') + '</div>' : ''}
            </td>
            <td class="px-4 py-3">
                <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium cursor-pointer hover:bg-blue-50 hover:text-blue-600" onclick="event.stopPropagation(); filterBy('category','${item.category.replace(/'/g, "&#39;")}')">${item.category}</span>
            </td>
            <td class="px-4 py-3 text-xs">
                <div class="font-semibold text-slate-700 cursor-pointer hover:text-blue-600" onclick="event.stopPropagation(); filterBy('segment','${item.segment.replace(/'/g, "&#39;")}')">${item.segment}  >  ${item.container}</div>
                <div class="text-slate-500 mt-0.5">📦 ${item.subContainer || '<span class="text-slate-300 italic">—</span>'}</div>
            </td>
            <td class="px-4 py-3 text-center">
                <span class="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 font-medium cursor-pointer hover:bg-indigo-100" onclick="event.stopPropagation(); filterBy('owner','${(item.owner || 'Default').replace(/'/g, "&#39;")}')">${item.owner || 'Default'}</span>
            </td>
            <td class="px-4 py-3 text-xs text-slate-500 max-w-[140px] truncate">
                <div>${item.remarks || '<span class="text-slate-300 italic">—</span>'}</div>
                ${item.aiMetadata ? '<div class="text-[10px] text-indigo-400 mt-0.5">🤖 AI described</div>' : ''}
                <div class="text-[10px] text-slate-400 mt-1">🕒 ${item.timestamp}</div>
            </td>
            <td class="px-4 py-3 text-center space-x-1 whitespace-nowrap">
                <button onclick="event.stopPropagation(); setupItemModificationContext('${item.id}')" class="text-xs bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 font-semibold px-2 py-1 rounded transition-colors border border-slate-200">Edit</button>
                <button onclick="event.stopPropagation(); removeItemFromInventory('${item.id}')" class="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-2 py-1 rounded transition-colors border border-red-100">Drop</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}
