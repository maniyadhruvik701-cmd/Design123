// Initialize state
let designs = [];

// Portal platforms specified by user
const PORTAL_PLATFORM_LIST = [
  'AJ-JIHU',
  'AJ-TN',
  'AJ-DE',
  'MY-JIHU',
  'MY-DE',
  'MY-HOP',
  'MY-JIHU01',
  'AMZ-JIKU',
  'AMZ-JIHU',
  'AMZ-KP-MY-PB',
  'AMZ-KP',
  'MY-PB',
];

// Shop platforms specified by user
const SHOP_PLATFORM_LIST = [
  'RT',
  'BB',
  'MS',
  'CT',
];

let platformCategories = {};
let deletedPlatforms = [];

// Helper to determine if a platform is 'portal', 'shop', or 'vendor'
function getPlatformCategory(platformName) {
  if (!platformName) return 'vendor';
  const clean = String(platformName).trim();
  if (platformCategories && platformCategories[clean]) {
    return platformCategories[clean];
  }
  const norm = clean.toUpperCase();

  // Check shop platforms
  if (norm === 'SHOP' || SHOP_PLATFORM_LIST.some(p => p.toUpperCase() === norm)) {
    return 'shop';
  }

  // Check portal platforms
  if (norm === 'PORTAL' || PORTAL_PLATFORM_LIST.some(p => p.toUpperCase() === norm)) {
    return 'portal';
  }
  // Check common portal prefixes
  if (norm.startsWith('AJ-') || norm.startsWith('MY-') || norm.startsWith('AMZ-')) {
    return 'portal';
  }

  return 'vendor';
}

let platforms = [
  // Portal Platforms
  'AJ-JIHU', 'AJ-TN', 'AJ-DE', 'MY-JIHU', 'MY-DE', 'MY-HOP', 'MY-JIHU01', 'AMZ-JIKU', 'AMZ-KP-MY-PB',
  // Shop Platforms
  'RT', 'BB', 'MS', 'CT',
  // Vendor Platforms
  'vender', 'b2b', 'website', 'bholo'
];

function sanitizeDesignPlatforms(design) {
  if (!design) return [];
  if (!design.platforms) {
    design.platforms = [];
  } else if (!Array.isArray(design.platforms)) {
    if (typeof design.platforms === 'object') {
      design.platforms = Object.keys(design.platforms).map(k => design.platforms[k]);
    } else {
      design.platforms = [];
    }
  }
  // Clean up platform object structure without auto-deleting valid platform data
  design.platforms = design.platforms.map(p => {
    if (typeof p === 'string') {
      return { name: p, status: 'pending', note: '', price: '1' };
    }
    return p;
  }).filter(p => p && p.name);

  return design.platforms;
}

function sanitizeDesigns(rawDesigns) {
  if (!rawDesigns) return [];
  const list = Array.isArray(rawDesigns)
    ? rawDesigns
    : Object.keys(rawDesigns).map(k => rawDesigns[k]);

  return list.map(d => {
    d.id = String(d.id || Date.now());
    sanitizeDesignPlatforms(d);
    return d;
  });
}

const DEFAULT_USERS = [
  { username: 'vishal', pin: '2179', role: 'admin', permissions: { tabs: ['dashboard', 'add', 'pending', 'completed', 'stockin', 'stockout', 'platforms', 'users'], platforms: [] } },
  { username: 'piyush', pin: '2179', role: 'admin', permissions: { tabs: ['dashboard', 'add', 'pending', 'completed', 'stockin', 'stockout', 'platforms', 'users'], platforms: [] } },
  { username: 'portal', pin: '5674', role: 'platform', permissions: { tabs: ['dashboard', 'pending', 'completed', 'stockin', 'stockout'], platforms: ['portal', ...PORTAL_PLATFORM_LIST] } },
  { username: 'vender', pin: '1475', role: 'platform', permissions: { tabs: ['dashboard', 'pending', 'completed', 'stockin', 'stockout'], platforms: ['vender', 'b2b', 'website', 'bholo'] } },
  { username: 'b2b', pin: '1268', role: 'platform', permissions: { tabs: ['dashboard', 'pending', 'completed', 'stockin', 'stockout'], platforms: ['b2b'] } },
  { username: 'shop', pin: '4142', role: 'platform', permissions: { tabs: ['dashboard', 'pending', 'completed', 'stockin', 'stockout'], platforms: ['RT', 'BB', 'MS', 'CT', 'shop'] } },
  { username: 'website', pin: '6598', role: 'platform', permissions: { tabs: ['dashboard', 'pending', 'completed', 'stockin', 'stockout'], platforms: ['website'] } },
  { username: 'bholo', pin: '1734', role: 'platform', permissions: { tabs: ['dashboard', 'pending', 'completed', 'stockin', 'stockout'], platforms: ['bholo'] } }
];

let appUsers = [];
let currentUser = null;

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDwU1-V9jIh01xOH3i_oMhH1nG3nZVkulM",
  authDomain: "design-27ec8.firebaseapp.com",
  databaseURL: "https://design-27ec8-default-rtdb.firebaseio.com",
  projectId: "design-27ec8",
  storageBucket: "design-27ec8.firebasestorage.app",
  messagingSenderId: "1082453137779",
  appId: "1:1082453137779:web:794bf9f8e720b1dee80d06",
  measurementId: "G-B63238D1TC"
};

// Initialize Firebase App
const fbApp = firebase.initializeApp(firebaseConfig);
const fbAuth = firebase.auth(fbApp);
const fbDb = firebase.database(fbApp);
const fbStorage = firebase.storage(fbApp);

let isFirebaseConnected = false;

// Setup Firebase Authentication listener
fbAuth.onAuthStateChanged(user => {
  if (user) {
    console.log("Firebase Authenticated successfully as:", user.email);
    isFirebaseConnected = true;
    setupFirebaseListeners();
  } else {
    console.log("Firebase Auth state: not signed in. Attempting sign in...");
    fbAuth.signInWithEmailAndPassword("maniyadhruvik07@gmail.com", "Maniya@#0707")
      .catch(err => console.error("Firebase Signin failed:", err));
  }
});

// Upload local data to Firebase if Firebase node is empty
async function uploadLocalStateToFirebaseIfEmpty() {
  try {
    const designsSnap = await fbDb.ref('designs').once('value');
    if (!designsSnap.exists() && designs && designs.length > 0) {
      const dbObject = {};
      designs.forEach(d => {
        dbObject[d.id] = d;
      });
      await fbDb.ref('designs').set(dbObject);
      console.log("Uploaded local designs cache to Firebase RTDB");
    }

    const platformsSnap = await fbDb.ref('platformsData').once('value');
    if (!platformsSnap.exists() && platforms && platforms.length > 0) {
      await fbDb.ref('platformsData').set({ list: platforms });
      console.log("Uploaded local platforms cache to Firebase RTDB");
    }

    const usersSnap = await fbDb.ref('appUsers').once('value');
    if (!usersSnap.exists() && appUsers && appUsers.length > 0) {
      await fbDb.ref('appUsers').set(appUsers);
      console.log("Uploaded local user permissions cache to Firebase RTDB");
    }
  } catch (err) {
    console.error("Local data migration to Firebase failed:", err);
  }
}

// Save image as Base64 directly (no Firebase Storage needed)
// This avoids the Storage rules/permission hanging issue
async function uploadImageToStorage(base64Str, filename) {
  // Return Base64 directly - images are stored in RTDB as Base64
  return base64Str;
}

let areListenersSetup = false;

// Setup Realtime Database listeners
function setupFirebaseListeners() {
  if (areListenersSetup) return;
  areListenersSetup = true;

  // DESIGNS, PLATFORMS & DELETED: Load ONCE together safely to prevent race condition.
  Promise.all([
    fbDb.ref('platformsData').once('value'),
    fbDb.ref('designs').once('value'),
    fbDb.ref('deletedPlatforms').once('value')
  ]).then(([platformsSnap, designsSnap, deletedSnap]) => {
    // 1. Process deletedPlatforms first
    const remoteDeleted = deletedSnap ? deletedSnap.val() : null;
    if (remoteDeleted && Array.isArray(remoteDeleted)) {
      remoteDeleted.forEach(dp => {
        if (!deletedPlatforms.some(x => x.toLowerCase() === String(dp).toLowerCase())) {
          deletedPlatforms.push(dp);
        }
      });
    }
    localforage.setItem('designStudioDeletedPlatforms', deletedPlatforms);

    // 2. Process platforms
    const platData = platformsSnap.val();
    if (platData && platData.list && Array.isArray(platData.list) && platData.list.length > 0) {
      platforms = platData.list;
      if (platData.categories) {
        platformCategories = platData.categories;
      }
    }

    // Never keep deleted platforms
    platforms = platforms.filter(p => !deletedPlatforms.some(dp => dp.toLowerCase() === p.toLowerCase()));

    // Guarantee default portal platforms exist in platforms array ONLY IF NOT DELETED
    PORTAL_PLATFORM_LIST.forEach(p => {
      const isDeleted = deletedPlatforms.some(dp => dp.toLowerCase() === p.toLowerCase());
      if (!isDeleted && !platforms.some(pl => pl.toUpperCase() === p.toUpperCase())) {
        platforms.push(p);
      }
    });

    // Guarantee default shop platforms exist in platforms array ONLY IF NOT DELETED
    SHOP_PLATFORM_LIST.forEach(p => {
      const isDeleted = deletedPlatforms.some(dp => dp.toLowerCase() === p.toLowerCase());
      if (!isDeleted && !platforms.some(pl => pl.toUpperCase() === p.toUpperCase())) {
        platforms.push(p);
      }
    });

    localforage.setItem('designStudioPlatforms', platforms);
    localforage.setItem('designStudioPlatformCategories', platformCategories);

    // 3. Process designs
    const data = designsSnap.val();
    if (data) {
      const rawList = Object.keys(data).map(key => {
        const item = data[key];
        item.id = String(item.id || key);
        return item;
      });
      designs = sanitizeDesigns(rawList);
      // Clean deleted platforms from loaded designs
      designs.forEach(d => {
        if (d.platforms && Array.isArray(d.platforms)) {
          d.platforms = d.platforms.filter(p => p && p.name && !deletedPlatforms.some(dp => dp.toLowerCase() === p.name.toLowerCase()));
        }
      });
      localforage.setItem('designStudioData', designs);
    } else {
      if (designs && designs.length > 0) {
        const dbObject = {};
        designs.forEach(d => {
          sanitizeDesignPlatforms(d);
          dbObject[d.id] = d;
        });
        fbDb.ref('designs').set(dbObject).catch(err => console.error("Firebase designs init write failed:", err));
      } else {
        designs = [];
        localforage.setItem('designStudioData', designs);
      }
    }

    renderGrids();
    renderPlatformManager();
    renderPlatformSelect();
    renderUsersManager();
  }).catch(err => console.error("Firebase load error:", err));

  // USERS: Real-time listener (needed so permission changes reflect on all devices)
  fbDb.ref('appUsers').on('value', snapshot => {
    const data = snapshot.val();
    if (data) {
      if (Array.isArray(data)) {
        appUsers = data;
      } else {
        appUsers = Object.keys(data).map(key => data[key]);
      }
      localforage.setItem('designStudioUsers', appUsers);
    } else {
      // Database is empty. If we have local users, upload them!
      if (appUsers && appUsers.length > 0) {
        fbDb.ref('appUsers').set(appUsers).catch(err => console.error("Firebase appUsers init write failed:", err));
      } else {
        appUsers = JSON.parse(JSON.stringify(DEFAULT_USERS));
        localforage.setItem('designStudioUsers', appUsers);
        fbDb.ref('appUsers').set(appUsers).catch(err => console.error("Firebase appUsers default write failed:", err));
      }
    }
    renderUsersManager();

    if (currentUser) {
      const updatedUser = appUsers.find(u => u.username === currentUser.username);
      if (updatedUser) {
        currentUser.permissions = updatedUser.permissions;
        currentUser.role = updatedUser.role;
        renderPlatformSelect();
        // NOTE: Do NOT call renderPlatformManager() here — it interferes with deletions
        renderGrids();
      }
    }
  });
}


// DOM Elements
const addDesignForm = document.getElementById('addDesignForm');
const photoInput = document.getElementById('photo');
const imagePreview = document.getElementById('imagePreview');
const emptyPreviewIcon = document.getElementById('emptyPreviewIcon');

const pendingGrid = document.getElementById('pendingGrid');
const completedGrid = document.getElementById('completedGrid');
const searchPending = document.getElementById('searchPending');
const searchCompleted = document.getElementById('searchCompleted');
const pendingEmptyState = document.getElementById('pendingEmptyState');
const completedEmptyState = document.getElementById('completedEmptyState');
const clearDataBtn = document.getElementById('clearDataBtn');
const addDesignModal = document.getElementById('addDesignModal');
const platformDetailsModal = document.getElementById('platformDetailsModal');

// Stock status elements
const searchStockOut = document.getElementById('searchStockOut');
const searchStockIn = document.getElementById('searchStockIn');
const stockOutEmptyState = document.getElementById('stockOutEmptyState');
const stockInEmptyState = document.getElementById('stockInEmptyState');
const stockOutGrid = document.getElementById('stockOutGrid');
const stockInGrid = document.getElementById('stockInGrid');
const stockStatusModal = document.getElementById('stockStatusModal');

let currentPhotoBase64 = '';

// Category Filter State for Pending and Completed sections ('portal', 'vendor', 'all')
let pendingActiveCategory = 'portal';
let completedActiveCategory = 'portal';

window.setPendingCategoryFilter = function (cat) {
  pendingActiveCategory = cat;

  const portalBtn = document.getElementById('pendingFilterPortalBtn');
  const vendorBtn = document.getElementById('pendingFilterVendorBtn');
  const shopBtn = document.getElementById('pendingFilterShopBtn');
  const allBtn = document.getElementById('pendingFilterAllBtn');

  if (portalBtn) portalBtn.classList.toggle('active', cat === 'portal');
  if (vendorBtn) vendorBtn.classList.toggle('active', cat === 'vendor');
  if (shopBtn) shopBtn.classList.toggle('active', cat === 'shop');
  if (allBtn) allBtn.classList.toggle('active', cat === 'all');

  renderGrids();
};

window.setCompletedCategoryFilter = function (cat) {
  completedActiveCategory = cat;

  const portalBtn = document.getElementById('completedFilterPortalBtn');
  const vendorBtn = document.getElementById('completedFilterVendorBtn');
  const shopBtn = document.getElementById('completedFilterShopBtn');
  const allBtn = document.getElementById('completedFilterAllBtn');

  if (portalBtn) portalBtn.classList.toggle('active', cat === 'portal');
  if (vendorBtn) vendorBtn.classList.toggle('active', cat === 'vendor');
  if (shopBtn) shopBtn.classList.toggle('active', cat === 'shop');
  if (allBtn) allBtn.classList.toggle('active', cat === 'all');

  renderGrids();
};

// User Session and Login logic
window.handleLoginSubmit = function () {
  const username = document.getElementById('loginUserSelect').value;
  const pin = document.getElementById('loginPinInput').value;
  const errorMsg = document.getElementById('loginErrorMessage');

  if (!username) {
    errorMsg.innerText = "Please select an account first!";
    errorMsg.style.display = 'block';
    return;
  }

  // Find user inside appUsers (loaded from database)
  const user = appUsers.find(u => u.username === username);
  if (user && user.pin === pin) {
    errorMsg.style.display = 'none';
    document.getElementById('loginPinInput').value = '';
    currentUser = {
      username: username,
      role: user.role,
      platform: user.platform || username,
      permissions: user.permissions
    };
    applyUserSession();
  } else {
    errorMsg.innerText = "Incorrect PIN! Please try again.";
    errorMsg.style.display = 'block';
  }
}

window.handleLogout = function () {
  currentUser = null;
  applyUserSession();
}

function applyUserSession() {
  const loginScreen = document.getElementById('loginScreen');
  if (!currentUser) {
    // Show login screen
    loginScreen.style.display = 'flex';
    // Clear selection UI on logout
    document.querySelectorAll('.avatar-item').forEach(el => el.classList.remove('active'));
    document.getElementById('loginUserSelect').value = '';
    document.getElementById('loginPinInput').value = '';
    return;
  }

  // Hide login screen
  loginScreen.style.display = 'none';

  // Update Profile Name in Header
  const userDisplay = document.querySelector('.user-profile span');
  if (userDisplay) {
    userDisplay.innerText = currentUser.username;
  }

  // Set up sidebar links display based on access
  const sidebarNav = document.querySelector('.sidebar-nav');
  if (sidebarNav && currentUser.permissions && currentUser.permissions.tabs) {
    let sidebarHtml = '';
    const userTabs = currentUser.permissions.tabs;

    if (userTabs.includes('dashboard')) {
      sidebarHtml += `
        <a href="#" class="sidebar-link active" onclick="switchSection('dashboard'); return false;">
          <i data-lucide="layout-dashboard"></i> Dashboard
        </a>
      `;
    }
    if (userTabs.includes('add')) {
      sidebarHtml += `
        <a href="#" class="sidebar-link" onclick="switchSection('add'); return false;">
          <i data-lucide="plus-circle"></i> Add Design
        </a>
      `;
    }
    if (userTabs.includes('pending')) {
      sidebarHtml += `
        <a href="#" class="sidebar-link" onclick="switchSection('pending'); return false;">
          <i data-lucide="clock"></i> Pending
        </a>
      `;
    }
    if (userTabs.includes('completed')) {
      sidebarHtml += `
        <a href="#" class="sidebar-link" onclick="switchSection('completed'); return false;">
          <i data-lucide="check-circle"></i> Completed
        </a>
      `;
    }
    if (userTabs.includes('completed') || userTabs.includes('stockin')) {
      sidebarHtml += `
        <a href="#" class="sidebar-link" onclick="switchSection('stockin'); return false;">
          <i data-lucide="trending-up"></i> Stock In
        </a>
      `;
    }
    if (userTabs.includes('completed') || userTabs.includes('stockout')) {
      sidebarHtml += `
        <a href="#" class="sidebar-link" onclick="switchSection('stockout'); return false;">
          <i data-lucide="trending-down"></i> Stock Out
        </a>
      `;
    }
    if (userTabs.includes('platforms')) {
      sidebarHtml += `
        <a href="#" class="sidebar-link" onclick="switchSection('platforms'); return false;">
          <i data-lucide="layers"></i> Platforms
        </a>
      `;
    }
    if (userTabs.includes('users')) {
      sidebarHtml += `
        <a href="#" class="sidebar-link" onclick="switchSection('users'); return false;">
          <i data-lucide="shield-check"></i> Permissions
        </a>
      `;
    }

    sidebarNav.innerHTML = sidebarHtml;
    lucide.createIcons();
  }

  // Switch to the first allowed section
  if (currentUser.permissions && currentUser.permissions.tabs && currentUser.permissions.tabs.length > 0) {
    switchSection(currentUser.permissions.tabs[0]);
  } else {
    switchSection('dashboard');
  }

  // Re-render select options & grids
  renderPlatformSelect();
  renderPlatformManager();
  renderUsersManager();
  renderGrids();
}

function renderUsersManager() {
  const container = document.getElementById('usersListContainer');
  if (!container) return;

  // Filter out admin users, as admins always have full access
  const platformUsers = appUsers.filter(u => u.role !== 'admin');

  container.innerHTML = platformUsers.map(user => {
    // Checkboxes for Tabs
    const tabOptions = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'add', label: 'Add Design' },
      { id: 'pending', label: 'Pending' },
      { id: 'completed', label: 'Completed' },
      { id: 'stockin', label: 'Stock In' },
      { id: 'stockout', label: 'Stock Out' },
      { id: 'platforms', label: 'Platforms' }
    ];

    const tabsHtml = tabOptions.map(tab => {
      const isChecked = user.permissions.tabs.includes(tab.id);
      return `
        <label class="permission-checkbox-label ${isChecked ? 'active' : ''}">
          <input type="checkbox" class="user-tab-checkbox-${user.username}" value="${tab.id}" ${isChecked ? 'checked' : ''} onchange="this.parentElement.classList.toggle('active', this.checked)">
          <span>${tab.label}</span>
        </label>
      `;
    }).join('');

    const assignedPlatforms = user.permissions && user.permissions.platforms ? user.permissions.platforms : [];

    const platformsHtml = assignedPlatforms.length === 0
      ? `<span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">No platforms assigned.</span>`
      : assignedPlatforms.map(p => `
          <span style="display: inline-block; background: #e0f2fe; color: #0284c7; padding: 0.3rem 0.75rem; border-radius: 9999px; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; border: 1px solid #bae6fd;">
            ${p}
          </span>
        `).join('');

    return `
      <div class="user-permission-row">
        <div class="user-permission-header">
          <div class="user-permission-username">
            <i data-lucide="user"></i>
            ${user.username}
          </div>
          <button class="btn btn-primary" onclick="saveUserPermissions('${user.username}')">
            <i data-lucide="save"></i> Save Permissions
          </button>
        </div>
        
        <div class="user-permission-grid">
          <div class="permission-col">
            <div class="permission-col-title">Sidebar Tabs Access</div>
            <div class="permission-checkbox-group">
              ${tabsHtml}
            </div>
          </div>
          
          <div class="permission-col">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <div class="permission-col-title" style="margin-bottom: 0;">Allowed Platforms</div>
              <button class="btn btn-primary" onclick="openUserPlatformsModal('${user.username}')" style="padding: 0.3rem 0.65rem; font-size: 0.75rem; border-radius: 6px; background: transparent; color: var(--accent-primary); border: 1px solid var(--accent-primary);">
                <i data-lucide="sliders" style="width: 12px; height: 12px;"></i> Manage Platforms
              </button>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
              ${platformsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function saveUsersDb() {
  localforage.setItem('designStudioUsers', appUsers).catch(err => console.error("LocalForage saveUsersDb failed:", err));
  if (isFirebaseConnected) {
    fbDb.ref('appUsers').set(appUsers).catch(err => console.error("Firebase saveUsersDb failed:", err));
  }
}

window.saveUserPermissions = function (username) {
  const userIndex = appUsers.findIndex(u => u.username === username);
  if (userIndex === -1) return;

  // Grab checked tabs
  const tabCheckboxes = document.querySelectorAll(`.user-tab-checkbox-${username}:checked`);
  const selectedTabs = Array.from(tabCheckboxes).map(cb => cb.value);

  // Keep existing platform permissions unchanged
  const existingPlatforms = appUsers[userIndex].permissions ? (appUsers[userIndex].permissions.platforms || []) : [];

  // Update permissions
  appUsers[userIndex].permissions = {
    tabs: selectedTabs,
    platforms: existingPlatforms
  };

  // Instant UI update
  renderUsersManager();

  // Save to DB in background
  saveUsersDb();

  alert(`Permissions for user "${username}" saved successfully!`);
}

// Helper for displaying prices
function getPriceDisplay(design, category = 'all') {
  if (!design.platforms || design.platforms.length === 0) return '₹0';

  let relevantPlats = design.platforms;
  if (category === 'portal') {
    relevantPlats = relevantPlats.filter(p => getPlatformCategory(p.name) === 'portal');
  } else if (category === 'vendor') {
    relevantPlats = relevantPlats.filter(p => getPlatformCategory(p.name) === 'vendor');
  } else if (category === 'shop') {
    relevantPlats = relevantPlats.filter(p => getPlatformCategory(p.name) === 'shop');
  }

  const prices = relevantPlats.map(p => parseFloat(p.price) || 0).filter(p => p > 0);
  if (prices.length === 0) {
    // Fallback to legacy global price if it exists
    return design.price ? `₹${design.price}` : '₹0';
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (minPrice === maxPrice) {
    return `₹${minPrice}`;
  } else {
    return `₹${minPrice} - ₹${maxPrice}`;
  }
}

// Modal Logic
window.openAddModal = function () {
  document.getElementById('editDesignId').value = '';
  document.getElementById('modalTitle').innerText = 'Add New Design';
  document.getElementById('platformCheckboxesGroup').style.display = 'block';
  document.getElementById('photo').required = true;
  addDesignForm.reset();
  currentPhotoBase64 = '';
  imagePreview.src = '';
  imagePreview.style.display = 'none';
  emptyPreviewIcon.style.display = 'flex';
  document.querySelectorAll('.material-input').forEach(input => {
    if (input.tagName !== 'SELECT' && input.nextElementSibling) {
      input.nextElementSibling.classList.remove('active');
    }
  });

  // Disable all platform price inputs initially
  document.querySelectorAll('.platform-price-input').forEach(input => {
    input.disabled = true;
    input.required = false;
  });

  addDesignModal.classList.add('active');
}

window.closeAddModal = function () {
  addDesignModal.classList.remove('active');
}

// Tab Switching Logic
window.switchSection = function (sectionId, categoryFilter) {
  if (sectionId === 'add') {
    openAddModal();
    return;
  }

  if (sectionId === 'pending' && categoryFilter) {
    setPendingCategoryFilter(categoryFilter);
  } else if (sectionId === 'completed' && categoryFilter) {
    setCompletedCategoryFilter(categoryFilter);
  }

  // Hide all sections
  document.querySelectorAll('.section-content').forEach(el => {
    el.style.display = 'none';
  });

  // Remove active class from all sidebar links
  document.querySelectorAll('.sidebar-link').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show target section
  const targetSection = document.getElementById(`section-${sectionId}`);
  if (targetSection) {
    targetSection.style.display = 'block';
  }

  // Set active link
  const activeBtn = Array.from(document.querySelectorAll('.sidebar-link')).find(btn =>
    btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${sectionId}'`)
  );
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}

// Initialize Icons
lucide.createIcons();

// Setup Image Preview Listener
photoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 70% quality
        currentPhotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
        imagePreview.src = currentPhotoBase64;
        imagePreview.style.display = 'block';
        emptyPreviewIcon.style.display = 'none';
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    currentPhotoBase64 = '';
    imagePreview.src = '';
    imagePreview.style.display = 'none';
    emptyPreviewIcon.style.display = 'flex';
  }
});

// Setup Material Input active states for labels
document.querySelectorAll('.material-input').forEach(input => {
  input.addEventListener('input', (e) => {
    const label = e.target.nextElementSibling;
    if (label && label.classList.contains('material-label')) {
      if (e.target.value) {
        label.classList.add('active');
      } else {
        label.classList.remove('active');
      }
    }
  });
});

window.togglePlatformPriceInput = function (platformName, isChecked) {
  const input = document.getElementById(`price_input_${platformName}`);
  if (input) {
    input.disabled = !isChecked;
    input.required = false; // no longer strictly required if we default to 1
  }
}

window.toggleAllPlatforms = function (isChecked) {
  const checkboxes = document.querySelectorAll('.platform-checkbox');
  checkboxes.forEach(cb => {
    if (cb.checked !== isChecked) {
      cb.checked = isChecked;
      togglePlatformPriceInput(cb.value, isChecked);
    }
  });
}

// Form Submission
addDesignForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Uploading & Saving...';

  try {
    const editId = document.getElementById('editDesignId').value;

    if (editId) {
      // Edit Mode
      const designIndex = designs.findIndex(d => d.id === editId);
      if (designIndex > -1) {
        designs[designIndex].sku = document.getElementById('sku').value;
        designs[designIndex].description = document.getElementById('description').value;
        if (currentPhotoBase64) {
          if (currentPhotoBase64.startsWith('data:image')) {
            const photoUrl = await uploadImageToStorage(currentPhotoBase64, `${editId}.jpg`);
            designs[designIndex].photo = photoUrl;
          } else {
            designs[designIndex].photo = currentPhotoBase64;
          }
        }
        await saveData();
        renderGrids();
        closeAddModal();
      }
      return;
    }

    // Create multiple designs if multiple platforms are selected
    const checkedCheckboxes = Array.from(document.querySelectorAll('.platform-checkbox:checked'));

    if (checkedCheckboxes.length === 0) {
      alert("Please select at least one platform.");
      return;
    }

    const platformsArray = checkedCheckboxes.map(cb => {
      const platformName = cb.value;
      const priceInput = document.getElementById(`price_input_${platformName}`);
      let finalPrice = priceInput ? priceInput.value : '1';
      if (!finalPrice || finalPrice.trim() === '' || finalPrice === '0') {
        finalPrice = '1';
      }
      return {
        name: platformName,
        status: 'pending',
        note: '',
        price: finalPrice
      };
    });

    const designId = Date.now().toString();
    let photoUrl = '';
    if (currentPhotoBase64 && currentPhotoBase64.startsWith('data:image')) {
      photoUrl = await uploadImageToStorage(currentPhotoBase64, `${designId}.jpg`);
    } else {
      photoUrl = currentPhotoBase64 || '';
    }

    const newDesign = {
      id: designId,
      sku: document.getElementById('sku').value,
      photo: photoUrl,
      description: document.getElementById('description').value,
      platforms: platformsArray
    };

    designs.push(newDesign);
    await saveData();
    renderGrids();

    // Reset Form
    addDesignForm.reset();
    currentPhotoBase64 = '';

    // Reset active classes on labels
    document.querySelectorAll('.material-input').forEach(input => {
      if (input.tagName !== 'SELECT' && input.nextElementSibling) {
        input.nextElementSibling.classList.remove('active');
      }
    });

    // Reset Preview
    imagePreview.src = '';
    imagePreview.style.display = 'none';
    emptyPreviewIcon.style.display = 'flex';

    // Close the Modal
    closeAddModal();
  } catch (error) {
    console.error("Save design failed:", error);
    alert("An error occurred while saving the design. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }
});

// Clear Data
clearDataBtn.addEventListener('click', async () => {
  if (confirm("Are you sure you want to clear all designs and reset the system?")) {
    designs = [];
    platforms = ['vender', 'b2b', 'shop', 'website', 'bholo', 'portal'];
    appUsers = JSON.parse(JSON.stringify(DEFAULT_USERS));

    deletedPlatforms = [];
    await localforage.setItem('designStudioData', designs);
    await localforage.setItem('designStudioPlatforms', platforms);
    await localforage.setItem('designStudioUsers', appUsers);
    await localforage.setItem('designStudioDeletedPlatforms', deletedPlatforms);

    if (isFirebaseConnected) {
      try {
        await fbDb.ref('designs').remove();
        await fbDb.ref('platformsData').set({ list: platforms });
        await fbDb.ref('appUsers').set(appUsers);
        await fbDb.ref('deletedPlatforms').remove();
      } catch (err) {
        console.error("Firebase reset failed:", err);
      }
    }

    alert("System has been reset to default values. The page will now reload.");
    location.reload();
  }
});

// Search Listeners
searchPending.addEventListener('input', renderGrids);
searchCompleted.addEventListener('input', renderGrids);
if (searchStockOut) searchStockOut.addEventListener('input', renderGrids);
if (searchStockIn) searchStockIn.addEventListener('input', renderGrids);

// Save to localforage (IndexedDB) and Firebase asynchronously in background
function saveData() {
  localforage.setItem('designStudioData', designs).catch(err => console.error("LocalForage saveData error:", err));
  localforage.setItem('designStudioPlatforms', platforms).catch(err => console.error("LocalForage platforms error:", err));
  localforage.setItem('designStudioPlatformCategories', platformCategories).catch(err => console.error("LocalForage categories error:", err));
  localforage.setItem('designStudioDeletedPlatforms', deletedPlatforms).catch(err => console.error("LocalForage deleted error:", err));
  
  if (isFirebaseConnected) {
    // Store platforms as a wrapped object with categories to preserve Portal vs Vendor classification
    fbDb.ref('platformsData').set({ list: platforms, categories: platformCategories }).catch(err => console.error("Firebase platforms sync failed:", err));
    fbDb.ref('deletedPlatforms').set(deletedPlatforms).catch(err => console.error("Firebase deletedPlatforms sync failed:", err));
    const dbObject = {};
    designs.forEach(d => {
      dbObject[d.id] = d;
    });
    fbDb.ref('designs').set(dbObject).catch(err => console.error("Firebase designs sync failed:", err));
  }
}

// Platform Management - Instant Optimistic UI Update
window.addPlatform = function () {
  const input = document.getElementById('newPlatformInput');
  const catSelect = document.getElementById('newPlatformCategory');
  const addToAllCb = document.getElementById('addToAllDesignsCheckbox');
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    alert("Please enter a platform name!");
    return;
  }
  if (platforms.some(p => p.toLowerCase() === val.toLowerCase())) {
    alert(`Platform "${val}" is already added!`);
    return;
  }

  // If this platform was previously deleted, remove it from deleted list so it is restored
  deletedPlatforms = deletedPlatforms.filter(dp => dp.toLowerCase() !== val.toLowerCase());
  localforage.setItem('designStudioDeletedPlatforms', deletedPlatforms);
  if (isFirebaseConnected) {
    fbDb.ref('deletedPlatforms').set(deletedPlatforms).catch(e => console.error("Firebase deletedPlatforms set error:", e));
  }

  const selectedCategory = catSelect ? catSelect.value : getPlatformCategory(val);
  platformCategories[val] = selectedCategory;

  platforms.push(val);

  // Automatically add this platform to all existing designs as Pending
  const shouldAddToAll = !addToAllCb || addToAllCb.checked;
  if (shouldAddToAll) {
    designs.forEach(d => {
      if (!d.platforms) d.platforms = [];
      if (!d.platforms.some(p => p.name.toLowerCase() === val.toLowerCase())) {
        d.platforms.push({
          name: val,
          status: 'pending',
          note: '',
          price: '1'
        });
      }
    });
  }

  if (addToAllCb) {
    addToAllCb.checked = true; // Keep checked for subsequent platform additions
  }

  input.value = '';

  // 1. Update UI INSTANTLY (< 5ms response time)
  renderGrids();
  renderPlatformManager();
  renderPlatformSelect();
  renderUsersManager();

  // 2. Save in background
  saveData();
}

window.syncAllPlatformsToAllDesigns = function () {
  let addedCount = 0;
  platforms.forEach(plat => {
    designs.forEach(d => {
      if (!d.platforms) d.platforms = [];
      if (!d.platforms.some(p => p.name.toLowerCase() === plat.toLowerCase())) {
        d.platforms.push({
          name: plat,
          status: 'pending',
          note: '',
          price: '1'
        });
        addedCount++;
      }
    });
  });

  if (addedCount > 0) {
    renderGrids();
    saveData();
    alert(`Successfully synced platforms! Added ${addedCount} missing platform entry/entries to existing designs.`);
  } else {
    alert("All existing designs already have all platforms assigned.");
  }
}

window.deletePlatform = async function (platformName) {
  if (!platformName) return;
  if (confirm(`Are you sure you want to delete "${platformName}"?`)) {
    const targetName = String(platformName).trim();
    const lowerName = targetName.toLowerCase();

    // 1. Permanently register in deletedPlatforms to prevent resurrection
    if (!deletedPlatforms.some(dp => dp.toLowerCase() === lowerName)) {
      deletedPlatforms.push(targetName);
    }

    // 2. Filter out from global platforms array
    platforms = platforms.filter(p => p.toLowerCase() !== lowerName);

    // 3. Remove from platformCategories
    Object.keys(platformCategories).forEach(catKey => {
      if (catKey.toLowerCase() === lowerName) {
        delete platformCategories[catKey];
      }
    });

    // 4. Remove platform from all designs
    designs.forEach(d => {
      if (d.platforms && Array.isArray(d.platforms)) {
        d.platforms = d.platforms.filter(p => p && p.name && p.name.toLowerCase() !== lowerName);
      }
    });

    // 5. Clean up from user permissions
    appUsers.forEach(u => {
      if (u.permissions && u.permissions.platforms) {
        u.permissions.platforms = u.permissions.platforms.filter(p => p.toLowerCase() !== lowerName);
      }
    });

    // 6. Update UI INSTANTLY
    renderGrids();
    renderPlatformManager();
    renderPlatformSelect();
    renderUsersManager();

    // 7. Save locally to localforage
    await localforage.setItem('designStudioDeletedPlatforms', deletedPlatforms);
    await localforage.setItem('designStudioPlatforms', platforms);
    await localforage.setItem('designStudioPlatformCategories', platformCategories);
    await localforage.setItem('designStudioData', designs);
    await localforage.setItem('designStudioUsers', appUsers);

    // 8. Save to Firebase immediately
    if (isFirebaseConnected) {
      try {
        await fbDb.ref('deletedPlatforms').set(deletedPlatforms);
        await fbDb.ref('platformsData').set({ list: platforms, categories: platformCategories });
        
        const dbObject = {};
        designs.forEach(d => {
          dbObject[d.id] = d;
        });
        await fbDb.ref('designs').set(dbObject);
        await fbDb.ref('appUsers').set(appUsers);
      } catch (err) {
        console.error("Firebase platform delete sync failed:", err);
      }
    }
  }
}

function renderPlatformManager() {
  const list = document.getElementById('platformsList');
  if (!list) return;

  const portalPlats = platforms.filter(p => getPlatformCategory(p) === 'portal');
  const vendorPlats = platforms.filter(p => getPlatformCategory(p) === 'vendor');
  const shopPlats = platforms.filter(p => getPlatformCategory(p) === 'shop');

  const renderChip = (p, catBadgeClass, catIcon) => {
    let iconColor = '#7c3aed';
    if (catBadgeClass === 'portal') iconColor = '#0284c7';
    else if (catBadgeClass === 'shop') iconColor = '#d97706';

    return `
    <div class="platform-chip">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <i data-lucide="${catIcon}" style="width: 15px; height: 15px; color: ${iconColor};"></i>
        <span style="font-weight: 700; font-size: 0.95rem; color: #1e293b;">${p}</span>
      </div>
      <button class="btn-logout" style="padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid #fecaca; background: #fee2e2; color: #ef4444; cursor: pointer;" onclick="deletePlatform('${p}')" title="Delete platform">
        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
      </button>
    </div>
  `;
  };

  list.innerHTML = `
    <div class="platforms-category-container">
      <!-- Portal Platforms Box -->
      <div class="platform-cat-box" style="border-top: 3px solid #0284c7;">
        <div class="platform-cat-title" style="color: #0369a1;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="globe" style="width: 16px; height: 16px;"></i>
            <span>Portal Platforms</span>
          </div>
          <span class="category-count-badge" style="background: #e0f2fe; color: #0369a1;">${portalPlats.length}</span>
        </div>
        <div style="font-size: 0.78rem; color: #64748b; margin-bottom: 0.75rem;">
          Official portal platforms (AJ-JIHU, AJ-TN, AJ-DE, MY-JIHU, MY-DE, etc.)
        </div>
        <div>
          ${portalPlats.length === 0 ? `<div style="color: #94a3b8; font-size: 0.85rem; padding: 0.5rem 0;">No portal platforms added.</div>` : portalPlats.map(p => renderChip(p, 'portal', 'globe')).join('')}
        </div>
      </div>

      <!-- Vendor Platforms Box -->
      <div class="platform-cat-box" style="border-top: 3px solid #7c3aed;">
        <div class="platform-cat-title" style="color: #6d28d9;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="truck" style="width: 16px; height: 16px;"></i>
            <span>Vendor Platforms</span>
          </div>
          <span class="category-count-badge" style="background: #ede9fe; color: #6d28d9;">${vendorPlats.length}</span>
        </div>
        <div style="font-size: 0.78rem; color: #64748b; margin-bottom: 0.75rem;">
          External vendors & partner platforms (vender, b2b, website, bholo)
        </div>
        <div>
          ${vendorPlats.length === 0 ? `<div style="color: #94a3b8; font-size: 0.85rem; padding: 0.5rem 0;">No vendor platforms added.</div>` : vendorPlats.map(p => renderChip(p, 'vendor', 'truck')).join('')}
        </div>
      </div>

      <!-- Shop Platforms Box -->
      <div class="platform-cat-box" style="border-top: 3px solid #d97706;">
        <div class="platform-cat-title" style="color: #b45309;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="store" style="width: 16px; height: 16px;"></i>
            <span>Shop Platforms</span>
          </div>
          <span class="category-count-badge" style="background: #fef3c7; color: #b45309;">${shopPlats.length}</span>
        </div>
        <div style="font-size: 0.78rem; color: #64748b; margin-bottom: 0.75rem;">
          Shop outlet platforms (RT, BB, MS, CT)
        </div>
        <div>
          ${shopPlats.length === 0 ? `<div style="color: #94a3b8; font-size: 0.85rem; padding: 0.5rem 0;">No shop platforms added.</div>` : shopPlats.map(p => renderChip(p, 'shop', 'store')).join('')}
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
}

window.toggleCategoryPlatforms = function (category, isChecked) {
  const checkboxes = document.querySelectorAll(`.platform-cb-${category}`);
  checkboxes.forEach(cb => {
    if (cb.checked !== isChecked) {
      cb.checked = isChecked;
      togglePlatformPriceInput(cb.value, isChecked);
    }
  });
};

function renderPlatformSelect() {
  const container = document.getElementById('platformCheckboxes');
  if (!container) return;

  const portalPlats = platforms.filter(p => getPlatformCategory(p) === 'portal');
  const vendorPlats = platforms.filter(p => getPlatformCategory(p) === 'vendor');
  const shopPlats = platforms.filter(p => getPlatformCategory(p) === 'shop');

  const renderRow = (p, catColor, catClass) => `
    <div style="display: flex; align-items: center; gap: 0.75rem; width: 100%; background: #ffffff; padding: 0.45rem 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 0.35rem;">
      <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; min-width: 130px;">
        <input type="checkbox" class="platform-checkbox platform-cb-${catClass}" value="${p}" onchange="togglePlatformPriceInput('${p}', this.checked)" style="width: 16px; height: 16px; accent-color: ${catColor};">
        <span style="font-weight: 700; font-size: 0.88rem; color: #1e293b;">${p}</span>
      </label>
      <div style="flex: 1;">
        <input type="number" id="price_input_${p}" class="material-input platform-price-input" placeholder="Price (₹)" value="1" disabled style="margin-bottom: 0; padding: 0.4rem 0.6rem; font-size: 0.85rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
      </div>
    </div>
  `;

  container.innerHTML = `
    <!-- Global Select All -->
    <div style="width: 100%; display: flex; align-items: center; justify-content: space-between; background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 0.75rem;">
      <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
        <input type="checkbox" id="selectAllPlatforms" onchange="toggleAllPlatforms(this.checked)" style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
        <span style="font-weight: 800; color: #1e293b; font-size: 0.9rem;">Select All (All Platforms)</span>
      </label>
    </div>

    <!-- Portal Section -->
    <div style="margin-bottom: 1rem; border: 1px solid #bae6fd; border-radius: 8px; padding: 0.75rem; background: #f0f9ff;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; padding-bottom: 0.4rem; border-bottom: 1px solid #bae6fd;">
        <div style="font-weight: 800; color: #0369a1; font-size: 0.9rem; display: flex; align-items: center; gap: 0.4rem;">
          <i data-lucide="globe" style="width: 16px; height: 16px;"></i> Portal Platforms (${portalPlats.length})
        </div>
        <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 0.8rem; font-weight: 700; color: #0284c7;">
          <input type="checkbox" id="selectAllPortalCb" onchange="toggleCategoryPlatforms('portal', this.checked)" style="accent-color: #0284c7;">
          Select All Portal
        </label>
      </div>
      <div>
        ${portalPlats.length === 0 ? `<div style="font-size: 0.8rem; color: #64748b;">No portal platforms defined.</div>` : portalPlats.map(p => renderRow(p, '#0284c7', 'portal')).join('')}
      </div>
    </div>

    <!-- Shop Section -->
    <div style="margin-bottom: 1rem; border: 1px solid #fde68a; border-radius: 8px; padding: 0.75rem; background: #fffbeb;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; padding-bottom: 0.4rem; border-bottom: 1px solid #fde68a;">
        <div style="font-weight: 800; color: #b45309; font-size: 0.9rem; display: flex; align-items: center; gap: 0.4rem;">
          <i data-lucide="store" style="width: 16px; height: 16px;"></i> Shop Platforms (${shopPlats.length})
        </div>
        <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 0.8rem; font-weight: 700; color: #d97706;">
          <input type="checkbox" id="selectAllShopCb" onchange="toggleCategoryPlatforms('shop', this.checked)" style="accent-color: #d97706;">
          Select All Shop
        </label>
      </div>
      <div>
        ${shopPlats.length === 0 ? `<div style="font-size: 0.8rem; color: #64748b;">No shop platforms defined.</div>` : shopPlats.map(p => renderRow(p, '#d97706', 'shop')).join('')}
      </div>
    </div>

    <!-- Vendor Section -->
    <div style="margin-bottom: 0.5rem; border: 1px solid #ddd6fe; border-radius: 8px; padding: 0.75rem; background: #faf5ff;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; padding-bottom: 0.4rem; border-bottom: 1px solid #ddd6fe;">
        <div style="font-weight: 800; color: #6d28d9; font-size: 0.9rem; display: flex; align-items: center; gap: 0.4rem;">
          <i data-lucide="truck" style="width: 16px; height: 16px;"></i> Vendor Platforms (${vendorPlats.length})
        </div>
        <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 0.8rem; font-weight: 700; color: #7c3aed;">
          <input type="checkbox" id="selectAllVendorCb" onchange="toggleCategoryPlatforms('vendor', this.checked)" style="accent-color: #7c3aed;">
          Select All Vendor
        </label>
      </div>
      <div>
        ${vendorPlats.length === 0 ? `<div style="font-size: 0.8rem; color: #64748b;">No vendor platforms defined.</div>` : vendorPlats.map(p => renderRow(p, '#7c3aed', 'vendor')).join('')}
      </div>
    </div>
  `;

  lucide.createIcons();
}

// Edit and Delete functions
window.editDesignItem = function (id) {
  if (currentUser && currentUser.role === 'platform') return;
  const design = designs.find(d => String(d.id) === String(id));
  if (!design) return;

  document.getElementById('editDesignId').value = design.id;
  document.getElementById('modalTitle').innerText = 'Edit Design';
  document.getElementById('platformCheckboxesGroup').style.display = 'none';

  document.getElementById('sku').value = design.sku;
  document.getElementById('description').value = design.description;

  // Make photo optional during edit
  document.getElementById('photo').required = false;

  currentPhotoBase64 = design.photo;
  if (currentPhotoBase64) {
    imagePreview.src = currentPhotoBase64;
    imagePreview.style.display = 'block';
    emptyPreviewIcon.style.display = 'none';
  }

  // Set active classes
  document.querySelectorAll('.material-input').forEach(input => {
    if (input.value && input.nextElementSibling) {
      input.nextElementSibling.classList.add('active');
    }
  });

  addDesignModal.classList.add('active');
}

window.deleteDesignItem = function (id) {
  if (currentUser && currentUser.role === 'platform') return;
  if (confirm("Are you sure you want to delete this design?")) {
    designs = designs.filter(d => String(d.id) !== String(id));
    // Render UI instantly
    renderGrids();
    // Delete from Firebase directly & save in background
    if (isFirebaseConnected) {
      fbDb.ref(`designs/${id}`).remove().catch(err => console.error("Firebase delete design error:", err));
    }
    saveData();
  }
}

// User Platforms Assignment Modal Logic
let activeAssignUser = '';

window.openUserPlatformsModal = function (username) {
  activeAssignUser = username;
  const modal = document.getElementById('userPlatformsModal');
  const title = document.getElementById('userPlatformsModalTitle');
  const container = document.getElementById('userPlatformsList');

  if (!modal || !title || !container) return;

  title.innerText = `Manage Platforms for "${username}"`;

  const user = appUsers.find(u => u.username === username);
  if (!user) return;

  const assignedPlats = user.permissions && user.permissions.platforms ? user.permissions.platforms : [];

  const portalPlats = platforms.filter(p => getPlatformCategory(p) === 'portal');
  const vendorPlats = platforms.filter(p => getPlatformCategory(p) === 'vendor');
  const shopPlats = platforms.filter(p => getPlatformCategory(p) === 'shop');

  const renderUserPlatLabel = (plat) => {
    const isChecked = assignedPlats.includes(plat);
    return `
      <label class="permission-checkbox-label ${isChecked ? 'active' : ''}" style="width: 100%; display: flex; justify-content: space-between; border-radius: 8px; padding: 0.65rem 1rem; align-items: center; margin-bottom: 0.4rem;">
        <span style="font-weight: 700; font-size: 0.88rem;">${plat}</span>
        <input type="checkbox" class="user-plat-checkbox" value="${plat}" ${isChecked ? 'checked' : ''} onchange="this.parentElement.classList.toggle('active', this.checked)">
      </label>
    `;
  };

  container.innerHTML = `
    <!-- Portal Platforms -->
    <div style="margin-bottom: 1rem;">
      <div style="font-size: 0.85rem; font-weight: 800; color: #0284c7; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="globe" style="width: 14px; height: 14px;"></i> Portal Platforms (${portalPlats.length})
      </div>
      ${portalPlats.map(renderUserPlatLabel).join('')}
    </div>

    <!-- Shop Platforms -->
    <div style="margin-bottom: 1rem;">
      <div style="font-size: 0.85rem; font-weight: 800; color: #b45309; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="store" style="width: 14px; height: 14px;"></i> Shop Platforms (${shopPlats.length})
      </div>
      ${shopPlats.map(renderUserPlatLabel).join('')}
    </div>

    <!-- Vendor Platforms -->
    <div style="margin-bottom: 0.5rem;">
      <div style="font-size: 0.85rem; font-weight: 800; color: #7c3aed; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 0.35rem;">
        <i data-lucide="truck" style="width: 14px; height: 14px;"></i> Vendor Platforms (${vendorPlats.length})
      </div>
      ${vendorPlats.map(renderUserPlatLabel).join('')}
    </div>
  `;

  modal.classList.add('active');
  lucide.createIcons();
}

window.closeUserPlatformsModal = function () {
  const modal = document.getElementById('userPlatformsModal');
  if (modal) modal.classList.remove('active');
}

window.saveUserPlatformsAssignment = async function () {
  if (!activeAssignUser) return;

  const userIndex = appUsers.findIndex(u => u.username === activeAssignUser);
  if (userIndex === -1) return;

  const checkboxes = document.querySelectorAll('.user-plat-checkbox');
  const selectedPlatforms = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  if (!appUsers[userIndex].permissions) {
    appUsers[userIndex].permissions = { tabs: ['dashboard', 'pending', 'completed'], platforms: [] };
  }

  appUsers[userIndex].permissions.platforms = selectedPlatforms;

  // Save updated appUsers database
  await saveUsersDb();

  alert(`Platform allocations for user "${activeAssignUser}" updated successfully!`);

  closeUserPlatformsModal();
  renderUsersManager();
  renderGrids();
}

// Platform Details Modal Logic
window.removePlatformFromDesign = async function (designId, platformName) {
  if (confirm(`Are you sure you want to remove "${platformName}" from this design?`)) {
    const design = designs.find(d => String(d.id) === String(designId));
    if (design) {
      sanitizeDesignPlatforms(design);
      design.platforms = design.platforms.filter(p => p.name !== platformName);
      await saveData();
      renderGrids();
      openPlatformDetails(designId);
    }
  }
}

window.addPlatformToDesign = async function (designId) {
  const select = document.getElementById('addPlatformToDesignSelect');
  const priceInput = document.getElementById('addPlatformToDesignPrice');
  if (!select) return;
  const platName = select.value;
  if (!platName) {
    alert("Please select a platform to add.");
    return;
  }
  let priceVal = priceInput ? priceInput.value : '1';
  if (!priceVal || priceVal.trim() === '' || priceVal === '0') {
    priceVal = '1';
  }

  const design = designs.find(d => String(d.id) === String(designId));
  if (design) {
    sanitizeDesignPlatforms(design);
    if (!design.platforms.some(p => p.name === platName)) {
      design.platforms.push({
        name: platName,
        status: 'pending',
        note: '',
        price: priceVal
      });
      await saveData();
      renderGrids();
      openPlatformDetails(designId);
    }
  }
}

window.openPlatformDetails = function (id) {
  const design = designs.find(d => String(d.id) === String(id));
  if (!design) return;

  sanitizeDesignPlatforms(design);

  document.getElementById('detailPreviewImage').src = design.photo || '';
  document.getElementById('detailSku').innerText = design.sku;
  document.getElementById('detailPrice').innerText = getPriceDisplay(design);

  const list = document.getElementById('platformDetailsList');

  const isPlatformUser = currentUser && currentUser.role === 'platform';
  const filteredPlatforms = isPlatformUser
    ? design.platforms.filter(p => (currentUser.permissions?.platforms || []).includes(p.name))
    : design.platforms;

  const portalPlats = filteredPlatforms.filter(p => getPlatformCategory(p.name) === 'portal');
  const vendorPlats = filteredPlatforms.filter(p => getPlatformCategory(p.name) === 'vendor');
  const shopPlats = filteredPlatforms.filter(p => getPlatformCategory(p.name) === 'shop');

  const renderPlatCard = (p) => `
    <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 0.75rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <span style="font-weight: 800; font-size: 1.1rem; color: ${p.status === 'completed' ? '#10b981' : 'var(--text-color)'};">
          ${p.name}
        </span>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <label class="checkbox-wrapper" style="margin-bottom: 0;">
            <input type="checkbox" ${p.status === 'completed' ? 'checked' : ''} onchange="togglePlatformStatus('${design.id}', '${p.name}', this.checked)" />
            <span class="checkbox-text">Completed</span>
          </label>
          ${isPlatformUser ? '' : `
            <button class="btn" style="padding: 0.3rem 0.5rem; background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="removePlatformFromDesign('${design.id}', '${p.name}')" title="Remove Platform from Design">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          `}
        </div>
      </div>
      
      <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 0.75rem;">
        <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-muted);">Price (₹)</div>
        <input type="number" class="material-input" value="${p.price || ''}" onchange="updatePlatformPrice('${design.id}', '${p.name}', this.value)" style="margin-bottom: 0; padding: 0.4rem; font-size: 0.9rem; width: 100px; background: white;" ${isPlatformUser ? 'disabled' : ''} />
      </div>

      <input type="text" class="material-input" placeholder="Add a note or link..." value="${p.note || ''}" onchange="updatePlatformNote('${design.id}', '${p.name}', this.value)" style="margin-bottom: 0; background: white;" />
    </div>
  `;

  if (filteredPlatforms.length === 0) {
    list.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 1rem;">No platforms assigned.</div>`;
  } else {
    let detailsHtml = '';
    if (portalPlats.length > 0) {
      detailsHtml += `
        <div class="modal-plat-section-header modal-plat-portal-header">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="globe" style="width: 15px; height: 15px;"></i>
            <span>Portal Platforms (${portalPlats.length})</span>
          </div>
        </div>
        ${portalPlats.map(renderPlatCard).join('')}
      `;
    }
    if (shopPlats.length > 0) {
      detailsHtml += `
        <div class="modal-plat-section-header modal-plat-shop-header" style="margin-top: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="store" style="width: 15px; height: 15px;"></i>
            <span>Shop Platforms (${shopPlats.length})</span>
          </div>
        </div>
        ${shopPlats.map(renderPlatCard).join('')}
      `;
    }
    if (vendorPlats.length > 0) {
      detailsHtml += `
        <div class="modal-plat-section-header modal-plat-vendor-header" style="margin-top: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <i data-lucide="truck" style="width: 15px; height: 15px;"></i>
            <span>Vendor Platforms (${vendorPlats.length})</span>
          </div>
        </div>
        ${vendorPlats.map(renderPlatCard).join('')}
      `;
    }
    list.innerHTML = detailsHtml;
  }

  // Populate Add Platform to Design Section for Admin Users
  const addSection = document.getElementById('addPlatformToDesignSection');
  if (addSection) {
    if (isPlatformUser) {
      addSection.style.display = 'none';
    } else {
      addSection.style.display = 'block';
      const select = document.getElementById('addPlatformToDesignSelect');
      const addBtn = document.getElementById('addPlatformToDesignBtn');

      const existingNames = (design.platforms || []).map(p => p.name);
      const availablePlatforms = platforms.filter(p => !existingNames.includes(p));

      if (availablePlatforms.length === 0) {
        select.innerHTML = `<option value="">All platforms already added</option>`;
        select.disabled = true;
        if (addBtn) addBtn.disabled = true;
      } else {
        select.disabled = false;
        if (addBtn) addBtn.disabled = false;
        select.innerHTML = `<option value="">-- Select Platform --</option>` + availablePlatforms.map(p => `<option value="${p}">${p}</option>`).join('');
      }

      if (addBtn) {
        addBtn.onclick = function () {
          addPlatformToDesign(design.id);
        };
      }
    }
  }

  platformDetailsModal.classList.add('active');
  lucide.createIcons();
}

window.closePlatformDetailsModal = function () {
  platformDetailsModal.classList.remove('active');
}

// Stock Status Selector Modal Logic
let selectedStockDesignId = null;

window.openStockStatusModal = function (id) {
  selectedStockDesignId = id;
  if (stockStatusModal) {
    stockStatusModal.classList.add('active');
    lucide.createIcons();
  }
}

window.closeStockStatusModal = function () {
  if (stockStatusModal) {
    stockStatusModal.classList.remove('active');
  }
  selectedStockDesignId = null;
}

window.setDesignStockStatus = async function (status) {
  if (!selectedStockDesignId) return;
  const design = designs.find(d => String(d.id) === String(selectedStockDesignId));
  if (design) {
    if (status === 'none') {
      delete design.stockStatus;
    } else {
      design.stockStatus = status;
    }
    await saveData();
    renderGrids();
  }
  closeStockStatusModal();
}

window.togglePlatformStatus = function (designId, platformName, isCompleted) {
  const design = designs.find(d => String(d.id) === String(designId));
  if (!design) return;
  const p = design.platforms.find(pl => pl.name === platformName);
  if (p) p.status = isCompleted ? 'completed' : 'pending';
  saveData();
  renderGrids();

  // Re-render the details list to update colors while the modal is open
  openPlatformDetails(designId);
}

window.updatePlatformNote = function (designId, platformName, noteValue) {
  const design = designs.find(d => String(d.id) === String(designId));
  if (!design) return;
  const p = design.platforms.find(pl => pl.name === platformName);
  if (p) p.note = noteValue;
  saveData();
}

window.updatePlatformPrice = function (designId, platformName, priceValue) {
  const design = designs.find(d => String(d.id) === String(designId));
  if (!design) return;
  const p = design.platforms.find(pl => pl.name === platformName);
  if (p) p.price = priceValue;
  saveData();
  renderGrids();
}


// Event Delegation for dynamically rendered buttons
document.body.addEventListener('click', (e) => {
  // Debug log for all body clicks
  console.log("Body clicked on element:", e.target);

  const avatarItem = e.target.closest('.avatar-item');
  if (avatarItem) {
    document.querySelectorAll('.avatar-item').forEach(el => el.classList.remove('active'));
    avatarItem.classList.add('active');

    const username = avatarItem.getAttribute('data-username');
    document.getElementById('loginUserSelect').value = username;

    // Auto-focus PIN input
    const pinInput = document.getElementById('loginPinInput');
    if (pinInput) {
      pinInput.focus();
    }
    return;
  }

  const editBtn = e.target.closest('.edit-design-btn');
  if (editBtn) {
    const id = editBtn.getAttribute('data-id');
    console.log("Edit button clicked, id:", id);
    window.editDesignItem(id);
    return;
  }

  const deleteBtn = e.target.closest('.delete-design-btn');
  if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-id');
    console.log("Delete button clicked, id:", id);
    window.deleteDesignItem(id);
    return;
  }

  const viewBtn = e.target.closest('.view-platforms-btn');
  if (viewBtn) {
    const id = viewBtn.getAttribute('data-id');
    console.log("View Platforms button clicked, id:", id);
    window.openPlatformDetails(id);
    return;
  }
});

// Card Rendering Helpers for Pending and Completed
function renderPendingCard(design, category = 'all') {
  const isPlatformUser = currentUser && currentUser.role === 'platform';
  const userPermPlats = (currentUser.permissions?.platforms || []).map(p => p.toLowerCase());
  const hasUserPlatform = (pName) => !isPlatformUser || userPermPlats.includes((pName || '').toLowerCase());

  let relevantPlats = (design.platforms || []).filter(p => hasUserPlatform(p.name));
  if (category === 'portal') {
    relevantPlats = relevantPlats.filter(p => getPlatformCategory(p.name) === 'portal');
  } else if (category === 'vendor') {
    relevantPlats = relevantPlats.filter(p => getPlatformCategory(p.name) === 'vendor');
  } else if (category === 'shop') {
    relevantPlats = relevantPlats.filter(p => getPlatformCategory(p.name) === 'shop');
  }

  const pendingPlats = relevantPlats.filter(p => p.status === 'pending');
  const completedPlats = relevantPlats.filter(p => p.status === 'completed');

  const catBadge = category === 'portal' 
    ? `<span style="background: #e0f2fe; color: #0284c7; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 800; display: inline-flex; align-items: center; gap: 3px;"><i data-lucide="globe" style="width: 10px; height: 10px;"></i> PORTAL</span>`
    : (category === 'vendor' 
        ? `<span style="background: #ede9fe; color: #7c3aed; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 800; display: inline-flex; align-items: center; gap: 3px;"><i data-lucide="truck" style="width: 10px; height: 10px;"></i> VENDOR</span>`
        : (category === 'shop'
            ? `<span style="background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 800; display: inline-flex; align-items: center; gap: 3px;"><i data-lucide="store" style="width: 10px; height: 10px;"></i> SHOP</span>`
            : ''));

  let platColor = 'var(--text-color)';
  if (category === 'portal') platColor = '#0284c7';
  else if (category === 'vendor') platColor = '#7c3aed';
  else if (category === 'shop') platColor = '#b45309';

  return `
    <div class="design-card fancy-hover" style="padding-bottom: 0; display: flex; flex-direction: column;">
      <div class="design-image-container">
        ${design.photo ? `<img src="${design.photo}" alt="${design.sku}" class="design-image" />` : `<div class="empty-preview" style="height: 100%; background: #eee;">No Image</div>`}
        <div class="price-badge" style="background: var(--bg-alt); color: var(--accent-primary); border: 1px solid var(--accent-primary); font-weight: 800;">
          ${getPriceDisplay(design, category)}
        </div>
        ${catBadge ? `<div style="position: absolute; top: 10px; left: 10px; z-index: 2;">${catBadge}</div>` : ''}
      </div>
      
      <div class="design-info" style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="design-sku">${design.sku}</div>
          <div style="display: flex; gap: 0.25rem;">
            ${isPlatformUser ? '' : `
              <button class="btn edit-design-btn" style="padding: 0.25rem; background: transparent; color: var(--text-muted);" data-id="${design.id}" title="Edit">
                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
              </button>
              <button class="btn delete-design-btn" style="padding: 0.25rem; background: transparent; color: #ef4444;" data-id="${design.id}" title="Delete">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            `}
          </div>
        </div>
        <div class="design-platform" style="margin-top: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">
          Platforms: <span style="font-weight: 700; color: ${platColor};">${pendingPlats.map(p => p.name).join(', ') || 'None'}</span><br/>
          <span style="color: ${completedPlats.length > 0 ? 'var(--accent-primary)' : 'inherit'}; font-weight: 600;">
            (${completedPlats.length}/${relevantPlats.length} Completed)
          </span>
        </div>
      </div>

      <button class="btn btn-primary view-platforms-btn" style="width: 100%; border-radius: 0 0 12px 12px; padding: 0.75rem; background: var(--bg-alt); color: var(--accent-primary); border-top: 1px solid var(--border-color); font-weight: 600;" data-id="${design.id}">
        ${isPlatformUser ? 'Edit Notes / Status' : 'View Platforms'}
      </button>
    </div>
  `;
}

function renderCompletedCard(design, category = 'all') {
  const isPlatformUser = currentUser && currentUser.role === 'platform';
  const userPermPlats = (currentUser.permissions?.platforms || []).map(p => p.toLowerCase());
  const hasUserPlatform = (pName) => !isPlatformUser || userPermPlats.includes((pName || '').toLowerCase());

  let relevantPlats = (design.platforms || []).filter(p => hasUserPlatform(p.name));
  if (category === 'portal') {
    relevantPlats = relevantPlats.filter(p => getPlatformCategory(p.name) === 'portal');
  } else if (category === 'vendor') {
    relevantPlats = relevantPlats.filter(p => getPlatformCategory(p.name) === 'vendor');
  } else if (category === 'shop') {
    relevantPlats = relevantPlats.filter(p => getPlatformCategory(p.name) === 'shop');
  }

  const completedPlats = relevantPlats.filter(p => p.status === 'completed');
  const isFullyCompleted = relevantPlats.length > 0 && relevantPlats.every(p => p.status === 'completed');

  const catBadge = category === 'portal' 
    ? `<span style="background: #e0f2fe; color: #0284c7; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 800; display: inline-flex; align-items: center; gap: 3px;"><i data-lucide="globe" style="width: 10px; height: 10px;"></i> PORTAL</span>`
    : (category === 'vendor' 
        ? `<span style="background: #ede9fe; color: #7c3aed; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 800; display: inline-flex; align-items: center; gap: 3px;"><i data-lucide="truck" style="width: 10px; height: 10px;"></i> VENDOR</span>`
        : (category === 'shop'
            ? `<span style="background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 800; display: inline-flex; align-items: center; gap: 3px;"><i data-lucide="store" style="width: 10px; height: 10px;"></i> SHOP</span>`
            : ''));

  let platColor = 'var(--text-color)';
  if (category === 'portal') platColor = '#0284c7';
  else if (category === 'vendor') platColor = '#7c3aed';
  else if (category === 'shop') platColor = '#b45309';

  return `
    <div class="design-card fancy-hover" style="opacity: 0.9; display: flex; flex-direction: column;">
      <div class="design-image-container" onclick="openStockStatusModal('${design.id}')" style="cursor: pointer;" title="Click image to change stock status">
        ${design.photo ? `<img src="${design.photo}" alt="${design.sku}" class="design-image" style="filter: ${isFullyCompleted ? 'grayscale(20%)' : 'none'};" />` : `<div class="empty-preview" style="height: 100%; background: #eee;">No Image</div>`}
        <div class="price-badge" style="background: ${isFullyCompleted ? '#10b981' : '#f59e0b'}; color: white; font-weight: 800;">
          ${getPriceDisplay(design, category)}
        </div>
        ${catBadge ? `<div style="position: absolute; top: 10px; left: 10px; z-index: 2;">${catBadge}</div>` : ''}
        <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.6); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
          <i data-lucide="info" style="width: 10px; height: 10px;"></i> Click to set Stock
        </div>
      </div>
      
      <div class="design-info" style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div class="design-sku">${design.sku}</div>
            <span class="completed-tag" style="margin-top: 0.25rem; color: ${isFullyCompleted ? '#10b981' : '#d97706'}; font-weight: 700; display: flex; align-items: center; gap: 0.25rem;">
              <i data-lucide="${isFullyCompleted ? 'check' : 'clock'}" style="width: 14px; height: 14px;"></i>
              ${isFullyCompleted ? 'Completed' : 'Partially Completed'}
            </span>
          </div>
          <div style="display: flex; gap: 0.25rem;">
            ${isPlatformUser ? '' : `
              <button class="btn edit-design-btn" style="padding: 0.25rem; background: transparent; color: var(--text-muted);" data-id="${design.id}" title="Edit">
                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
              </button>
              <button class="btn delete-design-btn" style="padding: 0.25rem; background: transparent; color: #ef4444;" data-id="${design.id}" title="Delete">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
              </button>
            `}
          </div>
        </div>
        <div class="design-platform" style="margin-top: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">
          Platforms: <span style="font-weight: 700; color: ${platColor};">${completedPlats.map(p => p.name).join(', ') || 'None'}</span><br/>
          <span style="color: ${isFullyCompleted ? '#10b981' : '#d97706'}; font-weight: 600;">
            (${completedPlats.length}/${relevantPlats.length} Completed)
          </span>
        </div>
      </div>
      <button class="btn btn-primary view-platforms-btn" style="width: 100%; border-radius: 0 0 12px 12px; padding: 0.75rem; background: var(--bg-alt); color: var(--accent-primary); border-top: 1px solid var(--border-color); font-weight: 600;" data-id="${design.id}">
        ${isPlatformUser ? 'Edit Notes / Status' : 'View Platforms'}
      </button>
    </div>
  `;
}

// Render UI
function renderGrids() {
  if (!currentUser) return; // Prevent rendering if not logged in

  // Always sanitize design platforms array before filtering/rendering
  designs.forEach(d => {
    sanitizeDesignPlatforms(d);
    // Fallback: If a design has 0 platforms, auto-assign active platforms so it never vanishes
    if (!d.platforms || d.platforms.length === 0) {
      const activePlats = (platforms && platforms.length > 0) ? platforms : ['vender', 'b2b', 'shop', 'website', 'bholo'];
      d.platforms = activePlats.map(p => ({
        name: p,
        status: 'pending',
        note: '',
        price: '1'
      }));
    }
  });

  const pendingTerm = searchPending.value.toLowerCase();
  const completedTerm = searchCompleted.value.toLowerCase();
  const stockOutTerm = searchStockOut ? searchStockOut.value.toLowerCase() : '';
  const stockInTerm = searchStockIn ? searchStockIn.value.toLowerCase() : '';

  const isPlatformUser = currentUser.role === 'platform';
  const userPermPlats = (currentUser.permissions?.platforms || []).map(p => p.toLowerCase());
  const hasUserPlatform = (pName) => !isPlatformUser || userPermPlats.includes((pName || '').toLowerCase());

  // Filter designs for Portal Pending, Shop Pending, Vendor Pending and Total Pending
  const portalPending = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(pendingTerm) || d.description.toLowerCase().includes(pendingTerm);
    return d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'portal' && p.status === 'pending') && matchesSearch;
  });

  const shopPending = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(pendingTerm) || d.description.toLowerCase().includes(pendingTerm);
    return d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'shop' && p.status === 'pending') && matchesSearch;
  });

  const vendorPending = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(pendingTerm) || d.description.toLowerCase().includes(pendingTerm);
    return d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'vendor' && p.status === 'pending') && matchesSearch;
  });

  // Filter designs for Portal Completed, Shop Completed, Vendor Completed and Total Completed
  const portalCompleted = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(completedTerm) || d.description.toLowerCase().includes(completedTerm);
    return d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'portal' && p.status === 'completed') && matchesSearch;
  });

  const shopCompleted = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(completedTerm) || d.description.toLowerCase().includes(completedTerm);
    return d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'shop' && p.status === 'completed') && matchesSearch;
  });

  const vendorCompleted = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(completedTerm) || d.description.toLowerCase().includes(completedTerm);
    return d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'vendor' && p.status === 'completed') && matchesSearch;
  });

  const stockOut = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(stockOutTerm) || d.description.toLowerCase().includes(stockOutTerm);
    const hasCompletedPlatform = d.platforms.some(p => hasUserPlatform(p.name) && p.status === 'completed');
    return hasCompletedPlatform && d.stockStatus === 'out' && matchesSearch;
  });

  const stockIn = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(stockInTerm) || d.description.toLowerCase().includes(stockInTerm);
    const hasCompletedPlatform = d.platforms.some(p => hasUserPlatform(p.name) && p.status === 'completed');
    return hasCompletedPlatform && d.stockStatus === 'in' && matchesSearch;
  });

  // Calculate stats counts based on role (not search filter)
  const totalPending = designs.filter(d =>
    d.platforms && d.platforms.some(p => hasUserPlatform(p.name) && p.status === 'pending')
  ).length;

  const totalCompleted = designs.filter(d =>
    d.platforms && d.platforms.some(p => hasUserPlatform(p.name) && p.status === 'completed')
  ).length;

  const portalPendingCount = designs.filter(d =>
    d.platforms && d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'portal' && p.status === 'pending')
  ).length;

  const portalCompletedCount = designs.filter(d =>
    d.platforms && d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'portal' && p.status === 'completed')
  ).length;

  const shopPendingCount = designs.filter(d =>
    d.platforms && d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'shop' && p.status === 'pending')
  ).length;

  const shopCompletedCount = designs.filter(d =>
    d.platforms && d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'shop' && p.status === 'completed')
  ).length;

  const vendorPendingCount = designs.filter(d =>
    d.platforms && d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'vendor' && p.status === 'pending')
  ).length;

  const vendorCompletedCount = designs.filter(d =>
    d.platforms && d.platforms.some(p => hasUserPlatform(p.name) && getPlatformCategory(p.name) === 'vendor' && p.status === 'completed')
  ).length;

  const totalStockOut = designs.filter(d =>
    d.platforms && d.stockStatus === 'out' && d.platforms.some(p => hasUserPlatform(p.name) && p.status === 'completed')
  ).length;

  const totalStockIn = designs.filter(d =>
    d.platforms && d.stockStatus === 'in' && d.platforms.some(p => hasUserPlatform(p.name) && p.status === 'completed')
  ).length;

  // Update Main Dashboard Stats
  const pendingCountEl = document.getElementById('pendingCount');
  const completedCountEl = document.getElementById('completedCount');
  const stockOutCountEl = document.getElementById('stockOutCount');
  const stockInCountEl = document.getElementById('stockInCount');
  if (pendingCountEl) pendingCountEl.innerText = totalPending;
  if (completedCountEl) completedCountEl.innerText = totalCompleted;
  if (stockOutCountEl) stockOutCountEl.innerText = totalStockOut;
  if (stockInCountEl) stockInCountEl.innerText = totalStockIn;

  // Update Portal, Shop & Vendor Dashboard Breakdown Stats
  const portalPendingCountEl = document.getElementById('portalPendingCount');
  const portalCompletedCountEl = document.getElementById('portalCompletedCount');
  const shopPendingCountEl = document.getElementById('shopPendingCount');
  const shopCompletedCountEl = document.getElementById('shopCompletedCount');
  const vendorPendingCountEl = document.getElementById('vendorPendingCount');
  const vendorCompletedCountEl = document.getElementById('vendorCompletedCount');
  if (portalPendingCountEl) portalPendingCountEl.innerText = portalPendingCount;
  if (portalCompletedCountEl) portalCompletedCountEl.innerText = portalCompletedCount;
  if (shopPendingCountEl) shopPendingCountEl.innerText = shopPendingCount;
  if (shopCompletedCountEl) shopCompletedCountEl.innerText = shopCompletedCount;
  if (vendorPendingCountEl) vendorPendingCountEl.innerText = vendorPendingCount;
  if (vendorCompletedCountEl) vendorCompletedCountEl.innerText = vendorCompletedCount;

  // Update Filter Badges
  const pendingPortalFilterBadge = document.getElementById('pendingPortalFilterBadge');
  const pendingShopFilterBadge = document.getElementById('pendingShopFilterBadge');
  const pendingVendorFilterBadge = document.getElementById('pendingVendorFilterBadge');
  const pendingAllFilterBadge = document.getElementById('pendingAllFilterBadge');
  if (pendingPortalFilterBadge) pendingPortalFilterBadge.innerText = portalPendingCount;
  if (pendingShopFilterBadge) pendingShopFilterBadge.innerText = shopPendingCount;
  if (pendingVendorFilterBadge) pendingVendorFilterBadge.innerText = vendorPendingCount;
  if (pendingAllFilterBadge) pendingAllFilterBadge.innerText = totalPending;

  const completedPortalFilterBadge = document.getElementById('completedPortalFilterBadge');
  const completedShopFilterBadge = document.getElementById('completedShopFilterBadge');
  const completedVendorFilterBadge = document.getElementById('completedVendorFilterBadge');
  const completedAllFilterBadge = document.getElementById('completedAllFilterBadge');
  if (completedPortalFilterBadge) completedPortalFilterBadge.innerText = portalCompletedCount;
  if (completedShopFilterBadge) completedShopFilterBadge.innerText = shopCompletedCount;
  if (completedVendorFilterBadge) completedVendorFilterBadge.innerText = vendorCompletedCount;
  if (completedAllFilterBadge) completedAllFilterBadge.innerText = totalCompleted;

  // Render Pending Section (Divided into Portal, Shop and Vendor)
  if (pendingActiveCategory === 'portal') {
    if (portalPending.length === 0) {
      pendingEmptyState.style.display = 'block';
      pendingEmptyState.innerText = 'No portal pending designs found.';
      pendingGrid.innerHTML = '';
    } else {
      pendingEmptyState.style.display = 'none';
      pendingGrid.innerHTML = portalPending.map(d => renderPendingCard(d, 'portal')).join('');
    }
  } else if (pendingActiveCategory === 'shop') {
    if (shopPending.length === 0) {
      pendingEmptyState.style.display = 'block';
      pendingEmptyState.innerText = 'No shop pending designs found.';
      pendingGrid.innerHTML = '';
    } else {
      pendingEmptyState.style.display = 'none';
      pendingGrid.innerHTML = shopPending.map(d => renderPendingCard(d, 'shop')).join('');
    }
  } else if (pendingActiveCategory === 'vendor') {
    if (vendorPending.length === 0) {
      pendingEmptyState.style.display = 'block';
      pendingEmptyState.innerText = 'No vendor pending designs found.';
      pendingGrid.innerHTML = '';
    } else {
      pendingEmptyState.style.display = 'none';
      pendingGrid.innerHTML = vendorPending.map(d => renderPendingCard(d, 'vendor')).join('');
    }
  } else {
    // 'all' category: render all three sections cleanly with headers
    if (portalPending.length === 0 && vendorPending.length === 0 && shopPending.length === 0) {
      pendingEmptyState.style.display = 'block';
      pendingEmptyState.innerText = 'No pending designs found. Add one above!';
      pendingGrid.innerHTML = '';
    } else {
      pendingEmptyState.style.display = 'none';
      let html = '';
      if (portalPending.length > 0) {
        html += `
          <div style="grid-column: 1 / -1; margin-top: 0.25rem;">
            <div class="section-subgroup-header">
              <div class="section-subgroup-title subgroup-portal-title">
                <i data-lucide="globe" style="width: 18px; height: 18px;"></i>
                <span>Portal Pending Designs (${portalPending.length})</span>
              </div>
            </div>
          </div>
          ${portalPending.map(d => renderPendingCard(d, 'portal')).join('')}
        `;
      }
      if (shopPending.length > 0) {
        html += `
          <div style="grid-column: 1 / -1; margin-top: 1.5rem;">
            <div class="section-subgroup-header">
              <div class="section-subgroup-title subgroup-shop-title">
                <i data-lucide="store" style="width: 18px; height: 18px;"></i>
                <span>Shop Pending Designs (${shopPending.length})</span>
              </div>
            </div>
          </div>
          ${shopPending.map(d => renderPendingCard(d, 'shop')).join('')}
        `;
      }
      if (vendorPending.length > 0) {
        html += `
          <div style="grid-column: 1 / -1; margin-top: 1.5rem;">
            <div class="section-subgroup-header">
              <div class="section-subgroup-title subgroup-vendor-title">
                <i data-lucide="truck" style="width: 18px; height: 18px;"></i>
                <span>Vendor Pending Designs (${vendorPending.length})</span>
              </div>
            </div>
          </div>
          ${vendorPending.map(d => renderPendingCard(d, 'vendor')).join('')}
        `;
      }
      pendingGrid.innerHTML = html;
    }
  }

  // Render Completed Section (Divided into Portal, Shop and Vendor)
  if (completedActiveCategory === 'portal') {
    if (portalCompleted.length === 0) {
      completedEmptyState.style.display = 'block';
      completedEmptyState.innerText = 'No portal completed designs found yet.';
      completedGrid.innerHTML = '';
    } else {
      completedEmptyState.style.display = 'none';
      completedGrid.innerHTML = portalCompleted.map(d => renderCompletedCard(d, 'portal')).join('');
    }
  } else if (completedActiveCategory === 'shop') {
    if (shopCompleted.length === 0) {
      completedEmptyState.style.display = 'block';
      completedEmptyState.innerText = 'No shop completed designs found yet.';
      completedGrid.innerHTML = '';
    } else {
      completedEmptyState.style.display = 'none';
      completedGrid.innerHTML = shopCompleted.map(d => renderCompletedCard(d, 'shop')).join('');
    }
  } else if (completedActiveCategory === 'vendor') {
    if (vendorCompleted.length === 0) {
      completedEmptyState.style.display = 'block';
      completedEmptyState.innerText = 'No vendor completed designs found yet.';
      completedGrid.innerHTML = '';
    } else {
      completedEmptyState.style.display = 'none';
      completedGrid.innerHTML = vendorCompleted.map(d => renderCompletedCard(d, 'vendor')).join('');
    }
  } else {
    // 'all' category: render all three sections cleanly with headers
    if (portalCompleted.length === 0 && vendorCompleted.length === 0 && shopCompleted.length === 0) {
      completedEmptyState.style.display = 'block';
      completedEmptyState.innerText = 'No completed designs found yet.';
      completedGrid.innerHTML = '';
    } else {
      completedEmptyState.style.display = 'none';
      let html = '';
      if (portalCompleted.length > 0) {
        html += `
          <div style="grid-column: 1 / -1; margin-top: 0.25rem;">
            <div class="section-subgroup-header">
              <div class="section-subgroup-title subgroup-portal-title">
                <i data-lucide="globe" style="width: 18px; height: 18px;"></i>
                <span>Portal Completed Designs (${portalCompleted.length})</span>
              </div>
            </div>
          </div>
          ${portalCompleted.map(d => renderCompletedCard(d, 'portal')).join('')}
        `;
      }
      if (shopCompleted.length > 0) {
        html += `
          <div style="grid-column: 1 / -1; margin-top: 1.5rem;">
            <div class="section-subgroup-header">
              <div class="section-subgroup-title subgroup-shop-title">
                <i data-lucide="store" style="width: 18px; height: 18px;"></i>
                <span>Shop Completed Designs (${shopCompleted.length})</span>
              </div>
            </div>
          </div>
          ${shopCompleted.map(d => renderCompletedCard(d, 'shop')).join('')}
        `;
      }
      if (vendorCompleted.length > 0) {
        html += `
          <div style="grid-column: 1 / -1; margin-top: 1.5rem;">
            <div class="section-subgroup-header">
              <div class="section-subgroup-title subgroup-vendor-title">
                <i data-lucide="truck" style="width: 18px; height: 18px;"></i>
                <span>Vendor Completed Designs (${vendorCompleted.length})</span>
              </div>
            </div>
          </div>
          ${vendorCompleted.map(d => renderCompletedCard(d, 'vendor')).join('')}
        `;
      }
      completedGrid.innerHTML = html;
    }
  }

  // Render Stock Out
  if (stockOut.length === 0) {
    if (stockOutEmptyState) stockOutEmptyState.style.display = 'block';
    if (stockOutGrid) stockOutGrid.innerHTML = '';
  } else {
    if (stockOutEmptyState) stockOutEmptyState.style.display = 'none';
    if (stockOutGrid) {
      stockOutGrid.innerHTML = stockOut.map(design => {
        const userAssignedPlats = design.platforms.filter(p => hasUserPlatform(p.name));
        const userCompletedPlats = userAssignedPlats.filter(p => p.status === 'completed');
        const isFullyCompleted = userAssignedPlats.length > 0 && userAssignedPlats.every(p => p.status === 'completed');

        return `
          <div class="design-card fancy-hover" style="opacity: 0.9; display: flex; flex-direction: column; border-color: #fca5a5;">
            <div class="design-image-container" onclick="openStockStatusModal('${design.id}')" style="cursor: pointer;" title="Click image to change stock status">
              ${design.photo ? `<img src="${design.photo}" alt="${design.sku}" class="design-image" style="filter: ${isFullyCompleted ? 'grayscale(20%)' : 'none'};" />` : `<div class="empty-preview" style="height: 100%; background: #eee;">No Image</div>`}
              <div class="price-badge" style="background: #ef4444; color: white; font-weight: 800;">
                ${getPriceDisplay(design)}
              </div>
              <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(239, 68, 68, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="trending-down" style="width: 10px; height: 10px;"></i> Click to set Stock
              </div>
            </div>
            
            <div class="design-info" style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div class="design-sku">${design.sku}</div>
                  <span class="completed-tag" style="margin-top: 0.25rem; color: #ef4444; background: rgba(239, 68, 68, 0.1); font-weight: 700; display: flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="trending-down" style="width: 14px; height: 14px;"></i> Stock Out
                  </span>
                </div>
                <div style="display: flex; gap: 0.25rem;">
                  ${isPlatformUser ? '' : `
                    <button class="btn edit-design-btn" style="padding: 0.25rem; background: transparent; color: var(--text-muted);" data-id="${design.id}" title="Edit">
                      <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="btn delete-design-btn" style="padding: 0.25rem; background: transparent; color: #ef4444;" data-id="${design.id}" title="Delete">
                      <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                  `}
                </div>
              </div>
              <div class="design-platform" style="margin-top: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">
                Platforms: <span style="font-weight: 600; color: var(--text-color);">${userCompletedPlats.map(p => p.name).join(', ')}</span><br/>
                <span style="color: ${isFullyCompleted ? '#10b981' : '#d97706'}; font-weight: 600;">
                  (${userCompletedPlats.length}/${userAssignedPlats.length} Completed)
                </span>
              </div>
            </div>
            <button class="btn btn-primary view-platforms-btn" style="width: 100%; border-radius: 0 0 12px 12px; padding: 0.75rem; background: var(--bg-alt); color: var(--accent-primary); border-top: 1px solid var(--border-color); font-weight: 600;" data-id="${design.id}">
              ${isPlatformUser ? 'Edit Notes / Status' : 'View Platforms'}
            </button>
          </div>
        `;
      }).join('');
    }
  }

  // Render Stock In
  if (stockIn.length === 0) {
    if (stockInEmptyState) stockInEmptyState.style.display = 'block';
    if (stockInGrid) stockInGrid.innerHTML = '';
  } else {
    if (stockInEmptyState) stockInEmptyState.style.display = 'none';
    if (stockInGrid) {
      stockInGrid.innerHTML = stockIn.map(design => {
        const userAssignedPlats = design.platforms.filter(p => hasUserPlatform(p.name));
        const userCompletedPlats = userAssignedPlats.filter(p => p.status === 'completed');
        const isFullyCompleted = userAssignedPlats.length > 0 && userAssignedPlats.every(p => p.status === 'completed');

        return `
          <div class="design-card fancy-hover" style="opacity: 0.9; display: flex; flex-direction: column; border-color: #86efac;">
            <div class="design-image-container" onclick="openStockStatusModal('${design.id}')" style="cursor: pointer;" title="Click image to change stock status">
              ${design.photo ? `<img src="${design.photo}" alt="${design.sku}" class="design-image" style="filter: ${isFullyCompleted ? 'grayscale(20%)' : 'none'};" />` : `<div class="empty-preview" style="height: 100%; background: #eee;">No Image</div>`}
              <div class="price-badge" style="background: #10b981; color: white; font-weight: 800;">
                ${getPriceDisplay(design)}
              </div>
              <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(16, 185, 129, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                <i data-lucide="trending-up" style="width: 10px; height: 10px;"></i> Click to set Stock
              </div>
            </div>
            
            <div class="design-info" style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div class="design-sku">${design.sku}</div>
                  <span class="completed-tag" style="margin-top: 0.25rem; color: #10b981; background: rgba(16, 185, 129, 0.1); font-weight: 700; display: flex; align-items: center; gap: 0.25rem;">
                    <i data-lucide="trending-up" style="width: 14px; height: 14px;"></i> Stock In
                  </span>
                </div>
                <div style="display: flex; gap: 0.25rem;">
                  ${isPlatformUser ? '' : `
                    <button class="btn edit-design-btn" style="padding: 0.25rem; background: transparent; color: var(--text-muted);" data-id="${design.id}" title="Edit">
                      <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="btn delete-design-btn" style="padding: 0.25rem; background: transparent; color: #ef4444;" data-id="${design.id}" title="Delete">
                      <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                  `}
                </div>
              </div>
              <div class="design-platform" style="margin-top: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">
                Platforms: <span style="font-weight: 600; color: var(--text-color);">${userCompletedPlats.map(p => p.name).join(', ')}</span><br/>
                <span style="color: ${isFullyCompleted ? '#10b981' : '#d97706'}; font-weight: 600;">
                  (${userCompletedPlats.length}/${userAssignedPlats.length} Completed)
                </span>
              </div>
            </div>
            <button class="btn btn-primary view-platforms-btn" style="width: 100%; border-radius: 0 0 12px 12px; padding: 0.75rem; background: var(--bg-alt); color: var(--accent-primary); border-top: 1px solid var(--border-color); font-weight: 600;" data-id="${design.id}">
              ${isPlatformUser ? 'Edit Notes / Status' : 'View Platforms'}
            </button>
          </div>
        `;
      }).join('');
    }
  }

  // Re-initialize dynamic icons
  lucide.createIcons();
}

// App Initialization
async function initApp() {
  try {
    const savedDesigns = await localforage.getItem('designStudioData');
    if (savedDesigns) {
      // Data Migration: Convert old single-platform designs or old multi-platform without prices
      designs = savedDesigns.map(d => {
        d.id = String(d.id); // Ensure all IDs are strings
        if (!d.platforms) {
          d.platforms = [{
            name: d.platform || 'Other',
            status: d.status || 'pending',
            note: '',
            price: d.price || '0'
          }];
        } else {
          // If they already have platforms but no price on them, migrate the global price
          d.platforms = d.platforms.map(p => ({
            ...p,
            price: p.price || d.price || '0'
          }));
        }
        return d;
      });
    }

    const savedDeleted = await localforage.getItem('designStudioDeletedPlatforms');
    if (savedDeleted && Array.isArray(savedDeleted)) {
      deletedPlatforms = savedDeleted;
    }

    const savedPlatforms = await localforage.getItem('designStudioPlatforms');
    if (savedPlatforms && Array.isArray(savedPlatforms)) {
      platforms = savedPlatforms.filter(p => !deletedPlatforms.some(dp => dp.toLowerCase() === p.toLowerCase()));
    } else {
      platforms = [
        'AJ-JIHU', 'AJ-TN', 'AJ-DE', 'MY-JIHU', 'MY-DE', 'MY-HOP', 'MY-JIHU01', 'AMZ-JIKU', 'AMZ-KP-MY-PB',
        'RT', 'BB', 'MS', 'CT',
        'vender', 'b2b', 'website', 'bholo'
      ].filter(p => !deletedPlatforms.some(dp => dp.toLowerCase() === p.toLowerCase()));
      await localforage.setItem('designStudioPlatforms', platforms);
    }

    // Guarantee default portal platforms exist in platforms array ONLY IF NOT DELETED
    PORTAL_PLATFORM_LIST.forEach(p => {
      const isDeleted = deletedPlatforms.some(dp => dp.toLowerCase() === p.toLowerCase());
      if (!isDeleted && !platforms.some(pl => pl.toUpperCase() === p.toUpperCase())) {
        platforms.push(p);
      }
    });

    // Guarantee default shop platforms exist in platforms array ONLY IF NOT DELETED
    SHOP_PLATFORM_LIST.forEach(p => {
      const isDeleted = deletedPlatforms.some(dp => dp.toLowerCase() === p.toLowerCase());
      if (!isDeleted && !platforms.some(pl => pl.toUpperCase() === p.toUpperCase())) {
        platforms.push(p);
      }
    });

    // Filter designs against deleted platforms
    if (designs && designs.length > 0) {
      designs.forEach(d => {
        if (d.platforms && Array.isArray(d.platforms)) {
          d.platforms = d.platforms.filter(p => p && p.name && !deletedPlatforms.some(dp => dp.toLowerCase() === p.name.toLowerCase()));
        }
      });
    }

    const savedCategories = await localforage.getItem('designStudioPlatformCategories');
    if (savedCategories && typeof savedCategories === 'object') {
      platformCategories = savedCategories;
    }

    // Load users from IndexedDB
    const savedUsers = await localforage.getItem('designStudioUsers');
    if (savedUsers && savedUsers.length > 0) {
      appUsers = savedUsers;
      // Merge any default users that might be missing
      let updated = false;
      for (const defUser of DEFAULT_USERS) {
        if (!appUsers.some(u => u.username === defUser.username)) {
          appUsers.push(JSON.parse(JSON.stringify(defUser)));
          updated = true;
        }
      }
      // Clean up deleted platforms from all users' permissions
      appUsers.forEach(u => {
        if (u.permissions && u.permissions.platforms) {
          u.permissions.platforms = u.permissions.platforms.filter(p => !deletedPlatforms.some(dp => dp.toLowerCase() === p.toLowerCase()));
        }
      });
      await localforage.setItem('designStudioUsers', appUsers);
    } else {
      appUsers = JSON.parse(JSON.stringify(DEFAULT_USERS));
      appUsers.forEach(u => {
        if (u.permissions && u.permissions.platforms) {
          u.permissions.platforms = u.permissions.platforms.filter(p => !deletedPlatforms.some(dp => dp.toLowerCase() === p.toLowerCase()));
        }
      });
      await localforage.setItem('designStudioUsers', appUsers);
    }

    // Migrate old LocalStorage data if localforage is empty
    const legacyDesigns = localStorage.getItem('designStudioData');
    if (legacyDesigns && !savedDesigns) {
      const parsedLegacy = JSON.parse(legacyDesigns);
      designs = parsedLegacy.map(d => {
        d.id = String(d.id); // Ensure all IDs are strings
        if (!d.platforms) {
          d.platforms = [{
            name: d.platform || 'Other',
            status: d.status || 'pending',
            note: '',
            price: d.price || '0'
          }];
        }
        return d;
      });
      await localforage.setItem('designStudioData', designs);
    }
    const legacyPlatforms = localStorage.getItem('designStudioPlatforms');
    if (legacyPlatforms && !savedPlatforms) {
      platforms = JSON.parse(legacyPlatforms);
      await localforage.setItem('designStudioPlatforms', platforms);
    }
  } catch (e) {
    console.error("Initialization error:", e);
  }

  // Set up login screen icons first
  lucide.createIcons();

  // Apply user session
  applyUserSession();
}

// Start App
initApp();

// Export Pending Designs to Excel
window.exportPendingToExcel = function () {
  if (typeof XLSX === 'undefined') {
    alert("Excel library is still loading or failed to load. Please try again in a moment.");
    return;
  }

  const pendingTerm = searchPending.value.toLowerCase();
  const isPlatformUser = currentUser && currentUser.role === 'platform';
  const category = pendingActiveCategory || 'all';

  const pending = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(pendingTerm) || d.description.toLowerCase().includes(pendingTerm);
    if (!matchesSearch) return false;

    return d.platforms.some(p => {
      const allowedByUser = !isPlatformUser || (currentUser.permissions?.platforms || []).includes(p.name);
      const matchesCat = category === 'all' || getPlatformCategory(p.name) === category;
      return allowedByUser && matchesCat && p.status === 'pending';
    });
  });

  const data = [];
  const notesData = [];

  pending.forEach(d => {
    let relevantPlatforms = d.platforms;
    if (isPlatformUser) {
      relevantPlatforms = d.platforms.filter(p => (currentUser.permissions?.platforms || []).includes(p.name));
    }
    if (category !== 'all') {
      relevantPlatforms = relevantPlatforms.filter(p => getPlatformCategory(p.name) === category);
    }
    relevantPlatforms = relevantPlatforms.filter(p => p.status === 'pending');

    // Create a row object starting with the Design ID for Sheet 1
    const row = {
      "Design Name / No.": d.sku
    };

    if (relevantPlatforms && relevantPlatforms.length > 0) {
      // Add each platform as a separate column, and its value as the price
      relevantPlatforms.forEach(p => {
        row[p.name] = p.price || 0;

        // Collect links/notes for Sheet 2
        notesData.push({
          "Design Name / No.": d.sku,
          "Platform": p.name,
          "Link": (p.note && p.note.trim() !== '') ? p.note.trim() : ""
        });
      });
    } else {
      notesData.push({
        "Design Name / No.": d.sku,
        "Platform": "",
        "Link": ""
      });
    }

    data.push(row);
  });

  if (data.length === 0) {
    alert(`No pending designs to export${category !== 'all' ? ` for ${category}` : ''}.`);
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Prices
  const ws1 = XLSX.utils.json_to_sheet(data);
  ws1['!cols'] = [{ wch: 22 }];
  const sheetTitle = category === 'all' ? "Pending Designs" : `Pending ${category.toUpperCase()}`;
  XLSX.utils.book_append_sheet(wb, ws1, sheetTitle);

  // Sheet 2: Links/Notes
  if (notesData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(notesData);
    ws2['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Links");
  } else {
    const ws2 = XLSX.utils.json_to_sheet([{ "Design Name / No.": "-", "Platform": "-", "Link": "" }]);
    ws2['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Links");
  }

  const filename = category === 'all' ? "Pending_Designs.xlsx" : `Pending_Designs_${category.charAt(0).toUpperCase() + category.slice(1)}.xlsx`;
  XLSX.writeFile(wb, filename);
};

// Export Completed Designs to Excel
window.exportCompletedToExcel = function () {
  if (typeof XLSX === 'undefined') {
    alert("Excel library is still loading or failed to load. Please try again in a moment.");
    return;
  }

  const completedTerm = searchCompleted.value.toLowerCase();
  const isPlatformUser = currentUser && currentUser.role === 'platform';
  const category = completedActiveCategory || 'all';

  const completed = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(completedTerm) || d.description.toLowerCase().includes(completedTerm);
    if (!matchesSearch) return false;

    return d.platforms.some(p => {
      const allowedByUser = !isPlatformUser || (currentUser.permissions?.platforms || []).includes(p.name);
      const matchesCat = category === 'all' || getPlatformCategory(p.name) === category;
      return allowedByUser && matchesCat && p.status === 'completed';
    });
  });

  const data = [];
  const notesData = [];

  completed.forEach(d => {
    let relevantPlatforms = d.platforms;
    if (isPlatformUser) {
      relevantPlatforms = d.platforms.filter(p => (currentUser.permissions?.platforms || []).includes(p.name));
    }
    if (category !== 'all') {
      relevantPlatforms = relevantPlatforms.filter(p => getPlatformCategory(p.name) === category);
    }

    // Only include platforms that are actually completed
    relevantPlatforms = relevantPlatforms.filter(p => p.status === 'completed');

    // Create a row object starting with the Design ID for Sheet 1
    const row = {
      "Design Name / No.": d.sku
    };

    if (relevantPlatforms && relevantPlatforms.length > 0) {
      // Add each platform as a separate column, and its value as the price
      relevantPlatforms.forEach(p => {
        row[p.name] = p.price || 0;

        // Collect links/notes for Sheet 2
        notesData.push({
          "Design Name / No.": d.sku,
          "Platform": p.name,
          "Link": (p.note && p.note.trim() !== '') ? p.note.trim() : ""
        });
      });
    } else {
      notesData.push({
        "Design Name / No.": d.sku,
        "Platform": "",
        "Link": ""
      });
    }

    data.push(row);
  });

  if (data.length === 0) {
    alert(`No completed designs to export${category !== 'all' ? ` for ${category}` : ''}.`);
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Prices
  const ws1 = XLSX.utils.json_to_sheet(data);
  ws1['!cols'] = [{ wch: 22 }];
  const sheetTitle = category === 'all' ? "Completed Designs" : `Completed ${category.toUpperCase()}`;
  XLSX.utils.book_append_sheet(wb, ws1, sheetTitle);

  // Sheet 2: Links/Notes
  if (notesData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(notesData);
    ws2['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Links");
  } else {
    const ws2 = XLSX.utils.json_to_sheet([{ "Design Name / No.": "-", "Platform": "-", "Link": "" }]);
    ws2['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Links");
  }

  const filename = category === 'all' ? "Completed_Designs.xlsx" : `Completed_Designs_${category.charAt(0).toUpperCase() + category.slice(1)}.xlsx`;
  XLSX.writeFile(wb, filename);
};

// ==========================================
// EXCEL UPLOAD & AUTO IMPORT LOGIC
// ==========================================

let parsedExcelEntries = [];

window.openExcelUploadModal = function () {
  const modal = document.getElementById('excelUploadModal');
  const fileInput = document.getElementById('excelFileInput');
  const fileNameDisplay = document.getElementById('excelSelectedFileName');
  const previewContainer = document.getElementById('excelPreviewContainer');
  const submitBtn = document.getElementById('excelImportSubmitBtn');

  if (!modal) return;

  // Reset states
  parsedExcelEntries = [];
  if (fileInput) fileInput.value = '';
  if (fileNameDisplay) {
    fileNameDisplay.innerText = '';
    fileNameDisplay.style.display = 'none';
  }
  if (previewContainer) previewContainer.style.display = 'none';
  if (submitBtn) submitBtn.disabled = true;

  // Setup drag & drop listeners on drop zone once
  const dropZone = document.getElementById('excelDropZone');
  if (dropZone && !dropZone.dataset.dndReady) {
    dropZone.dataset.dndReady = 'true';

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        handleExcelFileUpload(files[0]);
      }
    }, false);
  }

  modal.classList.add('active');
  lucide.createIcons();
};

window.closeExcelUploadModal = function () {
  const modal = document.getElementById('excelUploadModal');
  if (modal) modal.classList.remove('active');
  parsedExcelEntries = [];
};

// Download Sample Template for User
window.downloadSampleExcelTemplate = function () {
  if (typeof XLSX === 'undefined') {
    alert("Excel library is loading or failed to load. Please try again.");
    return;
  }

  const sampleFlat = [
    {
      "Design Name / No.": "DSGN-101",
      "Platform": "vender",
      "Link": "https://example.com/product/101",
      "Price": 499
    },
    {
      "Design Name / No.": "DSGN-101",
      "Platform": "website",
      "Link": "https://mybrand.com/item/101",
      "Price": 599
    },
    {
      "Design Name / No.": "DSGN-102",
      "Platform": "b2b",
      "Link": "https://b2b.example.com/p/102",
      "Price": 399
    },
    {
      "Design Name / No.": "DSGN-103",
      "Platform": "shop",
      "Link": "https://shop.example.com/103",
      "Price": 450
    }
  ];

  const sampleMulti = [
    {
      "Design Name / No.": "DSGN-101",
      "vender": 499,
      "b2b": 399,
      "shop": 450,
      "website": 599,
      "bholo": 420,
      "portal": 499
    },
    {
      "Design Name / No.": "DSGN-102",
      "vender": 550,
      "b2b": 450,
      "shop": 500,
      "website": 650,
      "bholo": 480,
      "portal": 550
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(sampleFlat);
  XLSX.utils.book_append_sheet(wb, ws1, "Designs & Links");

  const ws2 = XLSX.utils.json_to_sheet(sampleMulti);
  XLSX.utils.book_append_sheet(wb, ws2, "Multi-Platform Prices");

  XLSX.writeFile(wb, "Design_Import_Template.xlsx");
};

window.handleExcelFileSelect = function (e) {
  const file = e.target.files[0];
  if (file) {
    handleExcelFileUpload(file);
  }
};

window.handleExcelFileUpload = function (file) {
  if (typeof XLSX === 'undefined') {
    alert("Excel library is still loading. Please try again.");
    return;
  }

  const fileNameDisplay = document.getElementById('excelSelectedFileName');
  if (fileNameDisplay) {
    fileNameDisplay.innerText = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    fileNameDisplay.style.display = 'block';
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });

      processExcelWorkbook(workbook);
    } catch (err) {
      console.error("Failed to parse Excel file:", err);
      alert("Could not read this Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.");
    }
  };

  reader.readAsArrayBuffer(file);
};

// Helper to clean SKU string
function cleanSkuString(rawVal) {
  if (rawVal === undefined || rawVal === null) return '';
  let s = String(rawVal).replace(/\u00A0/g, ' ').trim();
  // Strip trailing float zeroes like 1024.0 or 1024.00 exported by Excel
  s = s.replace(/\.0+$/, '');
  return s;
}

// Check if string is a header or placeholder and NOT an actual SKU
function isHeaderOrPlaceholderSku(sku) {
  if (!sku) return true;
  const s = String(sku).trim().toLowerCase();
  const placeholders = [
    '-', '--', '---', 'n/a', 'na', 'null', 'none',
    'design no', 'design no.', 'design name', 'design name / no.', 'design name/no.',
    'sku', 'item code', 'product code', 'd.no', 'dno', 'style no', 'sr no', 'sr. no',
    'no', 'no.', 'sr', 'id'
  ];
  return placeholders.includes(s);
}

// Helper to test if a string is a link/URL
function isLinkValue(val) {
  if (!val || typeof val !== 'string') return false;
  const v = val.trim().toLowerCase();
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('www.') ||
    v.includes('.com') || v.includes('.in') || v.includes('.org') || v.includes('.net') ||
    v.includes('.co') || v.includes('/') || v.length > 15;
}

// Helper to extract clean price
function extractPrice(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).replace(/\u00A0/g, ' ').trim();
  if (!s || s === '-' || s === '0000' || s.toLowerCase() === 'no' || s.toLowerCase() === 'n/a') return null;
  const cleanStr = s.replace(/[^0-9.]/g, '');
  if (!cleanStr) return null;
  const num = parseFloat(cleanStr);
  if (!isNaN(num) && num >= 0) return String(num);
  return null;
}

// Normalization helper for fuzzy matching SKU and Platform names
function normalizeKeyStr(str) {
  return String(str || '').replace(/\u00A0/g, ' ').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Canonical platform aliases map
const PLATFORM_ALIASES = {
  'vendor': 'vender',
  'vender': 'vender',
  'vendr': 'vender',
  'web': 'website',
  'site': 'website',
  'website': 'website',
  'b2b': 'b2b',
  'b 2 b': 'b2b',
  'wholesale': 'b2b',
  'shop': 'shop',
  'retail': 'shop',
  'store': 'shop',
  'dukan': 'shop',
  'dukaan': 'shop',
  'offline': 'shop',
  'bholo': 'bholo',
  'bolo': 'bholo',
  'portal': 'portal',
  'portel': 'portal',
  'glowroad': 'glowroad',
  'meesho': 'meesho',
  'amazon': 'amazon',
  'flipkart': 'flipkart',
  'ajio': 'ajio',
  'myntra': 'myntra',
  'jiomart': 'jiomart'
};

// Clean platform name from header and resolve aliases
function resolvePlatformName(rawName) {
  if (!rawName) return '';
  let h = String(rawName).replace(/\u00A0/g, ' ').trim();
  const cleaned = h.replace(/[-_ ]*(link|url|note|notes|listing|website link|portal link|rate|price|mrp)[-_ ]*/gi, '').trim();
  const target = (cleaned || h).toLowerCase();

  if (PLATFORM_ALIASES[target]) {
    return PLATFORM_ALIASES[target];
  }

  const norm = normalizeKeyStr(target);
  for (const [alias, canonical] of Object.entries(PLATFORM_ALIASES)) {
    if (normalizeKeyStr(alias) === norm) {
      return canonical;
    }
  }

  if (Array.isArray(platforms)) {
    const existing = platforms.find(p => p.toLowerCase() === target || normalizeKeyStr(p) === norm);
    if (existing) return existing;
  }

  return cleaned || h;
}

// Find existing design by SKU with multiple intelligent fallback levels
function findDesignBySku(sku) {
  if (!sku || !designs || designs.length === 0) return null;
  const rawSku = cleanSkuString(sku);
  if (!rawSku || isHeaderOrPlaceholderSku(rawSku)) return null;

  const clean = rawSku.toLowerCase();

  // 1. Exact case-insensitive match
  let found = designs.find(d => d && d.sku && d.sku.trim().toLowerCase() === clean);
  if (found) return found;

  // 2. Normalized alphanumeric match
  const norm = normalizeKeyStr(rawSku);
  if (norm) {
    found = designs.find(d => d && d.sku && normalizeKeyStr(d.sku) === norm);
    if (found) return found;
  }

  // 3. Match without leading zeros (e.g., "0012" vs "12")
  const strippedZeros = norm.replace(/^0+/, '');
  if (strippedZeros) {
    found = designs.find(d => {
      if (!d || !d.sku) return false;
      const dNorm = normalizeKeyStr(d.sku).replace(/^0+/, '');
      return dNorm === strippedZeros;
    });
    if (found) return found;
  }

  return null;
}

// Find platform inside a design's platform array
function findPlatformInDesign(platformsList, platName) {
  if (!platformsList || !platName) return null;
  const resolved = resolvePlatformName(platName);
  const clean = resolved.toLowerCase();
  const norm = normalizeKeyStr(resolved);

  // 1. Exact case-insensitive match
  let found = platformsList.find(p => p && p.name && p.name.trim().toLowerCase() === clean);
  if (found) return found;

  // 2. Normalized alphanumeric equality match (e.g. 'AJ-TN' == 'AJTN', 'MY-JIHU 01' == 'myjihu01')
  found = platformsList.find(p => p && p.name && normalizeKeyStr(p.name) === norm);
  if (found) return found;

  return null;
}

// Status normalizer
function parseStatusValue(val) {
  if (!val) return '';
  const s = String(val).toLowerCase().trim();
  if (['completed', 'complete', 'done', 'yes', 'listed', 'live', 'active', 'ok', 'true', '✓'].includes(s)) {
    return 'completed';
  }
  if (['pending', 'no', 'remaining', 'process', 'in progress', 'false'].includes(s)) {
    return 'pending';
  }
  return '';
}

// Scan sheet to find the row where column headers actually exist (skips title/empty rows)
function detectHeaderRowIndex(sheet) {
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
  if (!matrix || matrix.length === 0) return 0;

  let bestRowIndex = 0;
  let maxScore = -1;

  for (let r = 0; r < Math.min(matrix.length, 20); r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    let score = 0;
    const rowText = row.map(c => String(c || '').trim().toLowerCase());

    rowText.forEach(cell => {
      if (!cell) return;
      if (cell.includes('design') || cell.includes('sku') || cell.includes('style') || cell.includes('art no') || cell.includes('d.no') || cell.includes('dno') || cell.includes('item code')) {
        score += 20;
      } else if (cell === 'platform' || cell === 'plateform' || cell === 'portal' || cell === 'marketplace') {
        score += 15;
      } else if (cell.includes('link') || cell.includes('url')) {
        score += 10;
      } else if (cell.includes('price') || cell.includes('rate') || cell.includes('mrp') || cell.includes('amount')) {
        score += 10;
      } else if (cell === 'vender' || cell === 'vendor' || cell === 'website' || cell === 'b2b' || cell === 'shop' || cell === 'bholo') {
        score += 15;
      } else if (cell === 'sr' || cell === 'sr no' || cell === 'sr. no' || cell === 'no' || cell === 'id') {
        score += 2;
      }
    });

    if (score > maxScore) {
      maxScore = score;
      bestRowIndex = r;
    }
  }

  return maxScore >= 10 ? bestRowIndex : 0;
}

// Priority-based column detection (Prevents Sr No from being picked over Design No)
function identifyColumns(allHeaders) {
  let skuKey = null;
  let platformKey = null;
  let linkKey = null;
  let priceKey = null;
  let statusKey = null;

  // PRIORITY 1: High confidence SKU / Design columns
  for (const h of allHeaders) {
    const lower = h.trim().toLowerCase();
    if (lower.includes('design') || lower.includes('sku') || lower.includes('d.no') ||
      lower.includes('dno') || lower.includes('style') || lower.includes('art no') ||
      lower.includes('article') || lower.includes('item code') || lower.includes('product code') ||
      lower.includes('pattern') || lower.includes('catalog')) {
      skuKey = h;
      break;
    }
  }

  // PRIORITY 2: Secondary item/code columns
  if (!skuKey) {
    for (const h of allHeaders) {
      const lower = h.trim().toLowerCase();
      if (lower.includes('item') || lower.includes('code') || lower.includes('model')) {
        skuKey = h;
        break;
      }
    }
  }

  // PRIORITY 3: Fallback ONLY if no better column exists
  if (!skuKey) {
    for (const h of allHeaders) {
      const lower = h.trim().toLowerCase();
      if (lower === 'no' || lower === 'no.' || lower === 'id' || lower === 'sr' || lower === 'sr no' || lower === 'sr. no') {
        skuKey = h;
        break;
      }
    }
  }

  if (!skuKey && allHeaders.length > 0) {
    skuKey = allHeaders[0];
  }

  allHeaders.forEach(h => {
    if (h === skuKey) return;
    const lower = h.trim().toLowerCase();

    // Platform
    if (!platformKey && (lower === 'platform' || lower === 'plateform' || lower === 'platfrom' ||
      lower === 'portal' || lower === 'channel' || lower === 'marketplace' || lower === 'site' ||
      lower === 'platform name' || lower === 'plateform name')) {
      platformKey = h;
    }
    // Link / URL
    else if (!linkKey && (lower === 'link' || lower === 'url' || lower === 'note' || lower === 'notes' ||
      lower === 'web link' || lower === 'product link' || lower === 'listing link' ||
      lower === 'listing' || lower === 'href' || lower.includes('link') || lower.includes('url'))) {
      linkKey = h;
    }
    // Price
    else if (!priceKey && (lower.includes('price') || lower.includes('rate') || lower.includes('amount') ||
      lower.includes('cost') || lower.includes('mrp') || lower === 'sp')) {
      priceKey = h;
    }
    // Status
    else if (!statusKey && lower.includes('status')) {
      statusKey = h;
    }
  });

  return { skuKey, platformKey, linkKey, priceKey, statusKey };
}

// Intelligent Multi-Sheet Workbook Parsing
function processExcelWorkbook(workbook) {
  parsedExcelEntries = [];
  const defaultPlatform = (currentUser && currentUser.role === 'platform' && currentUser.permissions?.platforms?.[0]) || (platforms[0] || 'vender');

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    alert("The uploaded Excel workbook contains no sheets.");
    return;
  }

  const parsedItemsMap = new Map(); // Key: `${normSku}__${normPlat}`

  function getOrInitEntry(sku, platform) {
    const cleanSku = cleanSkuString(sku);
    if (!cleanSku || isHeaderOrPlaceholderSku(cleanSku)) return null;

    const resolvedPlat = resolvePlatformName(platform) || defaultPlatform;
    const normSku = normalizeKeyStr(cleanSku);
    const normPlat = normalizeKeyStr(resolvedPlat);
    const key = `${normSku}__${normPlat}`;

    if (!parsedItemsMap.has(key)) {
      parsedItemsMap.set(key, {
        sku: cleanSku,
        platform: resolvedPlat,
        link: '',
        price: '1',
        status: ''
      });
    }
    return parsedItemsMap.get(key);
  }

  // Parse ALL sheets in workbook to capture all data
  sheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    const headerRowIndex = detectHeaderRowIndex(sheet);
    const rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: '' });
    if (!rows || rows.length === 0) return;

    const allHeaders = Object.keys(rows[0] || {});
    if (allHeaders.length === 0) return;

    const { skuKey, platformKey, linkKey, priceKey, statusKey } = identifyColumns(allHeaders);
    if (!skuKey) return;

    rows.forEach(row => {
      const rawSku = row[skuKey];
      const sku = cleanSkuString(rawSku);
      if (!sku || isHeaderOrPlaceholderSku(sku)) return;

      if (platformKey) {
        // Flat sheet structure: Dedicated Platform column exists
        const rawPlatform = row[platformKey];
        const platform = resolvePlatformName(rawPlatform) || defaultPlatform;

        const rawLink = linkKey ? String(row[linkKey] || '').trim() : '';
        const rawPrice = priceKey ? row[priceKey] : '';
        const numPrice = extractPrice(rawPrice);
        const rawStatus = statusKey ? parseStatusValue(row[statusKey]) : '';

        const entry = getOrInitEntry(sku, platform);
        if (entry) {
          if (rawLink && rawLink !== '-' && rawLink.toLowerCase() !== 'no links available') {
            entry.link = rawLink;
          }
          if (numPrice) {
            entry.price = numPrice;
          }
          if (rawStatus) {
            entry.status = rawStatus;
          }
        }
      } else {
        // Matrix / Multi-column structure (Platforms or links as column headers)
        let rowHasValidData = false;

        allHeaders.forEach(header => {
          if (header === skuKey || header === statusKey || header === priceKey) return;
          const val = String(row[header] !== undefined && row[header] !== null ? row[header] : '').trim();
          if (!val || val === '-' || val.toLowerCase() === 'no links available') return;

          if (header === linkKey) {
            // Dedicated single link column without platform column -> apply to default platform
            const entry = getOrInitEntry(sku, defaultPlatform);
            if (entry) {
              entry.link = val;
              rowHasValidData = true;
            }
          } else {
            // Column header is likely a platform name (e.g., "vender", "Amazon Link", "website", "shop")
            const platName = resolvePlatformName(header);
            if (platName && !['description', 'photo', 'image', 'sr', 'sr no', 'category', 'remark'].includes(platName.toLowerCase())) {
              const entry = getOrInitEntry(sku, platName);
              if (entry) {
                rowHasValidData = true;
                if (isLinkValue(val) || header.toLowerCase().includes('link') || header.toLowerCase().includes('url') || header.toLowerCase().includes('note')) {
                  entry.link = val;
                } else {
                  const numPrice = extractPrice(val);
                  if (numPrice) {
                    entry.price = numPrice;
                  } else {
                    entry.link = val;
                  }
                }
              }
            }
          }
        });

        // Capture general price/status from sheet row if present
        const generalPrice = priceKey ? extractPrice(row[priceKey]) : null;
        const generalStatus = statusKey ? parseStatusValue(row[statusKey]) : '';

        if (!rowHasValidData) {
          // If no platform columns had values, register under defaultPlatform so design is NOT dropped!
          const entry = getOrInitEntry(sku, defaultPlatform);
          if (entry) {
            if (generalPrice) entry.price = generalPrice;
            if (generalStatus) entry.status = generalStatus;
          }
        } else if (generalPrice || generalStatus) {
          // Update all entries for this SKU in current row
          for (const [k, e] of parsedItemsMap.entries()) {
            if (normalizeKeyStr(e.sku) === normalizeKeyStr(sku)) {
              if (generalPrice && (!e.price || e.price === '1')) e.price = generalPrice;
              if (generalStatus && !e.status) e.status = generalStatus;
            }
          }
        }
      }
    });
  });

  // Filter out invalid items, but keep entries even if link is still pending
  parsedExcelEntries = Array.from(parsedItemsMap.values()).filter(item => item && item.sku && !isHeaderOrPlaceholderSku(item.sku));

  if (parsedExcelEntries.length === 0) {
    alert("Could not detect any valid Design SKU rows in this Excel file. Please ensure your Excel sheet has a column for 'Design No' or 'SKU'.");
    return;
  }

  renderExcelPreview();
}

// Render Preview Table (Shows rows with Links at top so user sees all filled data immediately)
function renderExcelPreview() {
  const previewContainer = document.getElementById('excelPreviewContainer');
  const rowCountEl = document.getElementById('excelPreviewRowCount');
  const statsEl = document.getElementById('excelPreviewStats');
  const tbody = document.getElementById('excelPreviewTbody');
  const submitBtn = document.getElementById('excelImportSubmitBtn');

  if (!previewContainer || !tbody) return;

  // Sort: Entries WITH links come first!
  const sortedEntries = [...parsedExcelEntries].sort((a, b) => {
    const aHas = (a.link && a.link.trim() !== '') ? 1 : 0;
    const bHas = (b.link && b.link.trim() !== '') ? 1 : 0;
    return bHas - aHas;
  });

  let updateCount = 0;
  let newCount = 0;
  let withLinksCount = 0;

  const rowsHtml = sortedEntries.map((item, idx) => {
    const matchedDesign = findDesignBySku(item.sku);
    const isExisting = !!matchedDesign;
    if (isExisting) {
      updateCount++;
    } else {
      newCount++;
    }

    const hasLink = item.link && item.link.trim() !== '';
    if (hasLink) withLinksCount++;

    return `
      <tr style="${hasLink ? 'background: #f0fdf4;' : ''}">
        <td style="color: var(--text-muted); font-size: 0.75rem; font-weight: 600;">${idx + 1}</td>
        <td style="font-weight: 700; color: #1e293b;">
          ${item.sku} ${matchedDesign && matchedDesign.sku !== item.sku ? `<span style="color: #64748b; font-size: 0.75rem; font-weight: normal;">(${matchedDesign.sku})</span>` : ''}
        </td>
        <td>
          <span style="display: inline-block; background: #e0f2fe; color: #0284c7; padding: 0.15rem 0.5rem; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; text-transform: uppercase;">
            ${item.platform}
          </span>
        </td>
        <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${hasLink
        ? `<a href="${item.link}" target="_blank" style="color: #15803d; font-weight: 600; text-decoration: underline;" title="${item.link}"><i data-lucide="external-link" style="width: 12px; height: 12px; display: inline;"></i> ${item.link}</a>`
        : `<span style="color: #94a3b8; font-style: italic; font-size: 0.8rem;">No Link (Pending)</span>`
      }
        </td>
        <td style="font-weight: 600;">₹${item.price || '1'}</td>
        <td>
          ${hasLink
        ? `<span style="display: inline-flex; align-items: center; gap: 3px; background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;"><i data-lucide="check-circle-2" style="width: 11px; height: 11px;"></i> Link Ready</span>`
        : (isExisting
          ? `<span class="badge-action-update"><i data-lucide="refresh-cw" style="width: 11px; height: 11px; display: inline;"></i> Update SKU</span>`
          : `<span class="badge-action-new"><i data-lucide="plus" style="width: 11px; height: 11px; display: inline;"></i> New Design</span>`
        )
      }
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rowsHtml;
  rowCountEl.innerText = parsedExcelEntries.length;

  const withoutLinksCount = parsedExcelEntries.length - withLinksCount;
  statsEl.innerHTML = `<span style="color: #15803d; font-weight: 800; font-size: 0.85rem;"><i data-lucide="link" style="width: 13px; height: 13px; display: inline;"></i> ${withLinksCount} Links Ready to Sync</span> &bull; <span style="color: #64748b; font-size: 0.8rem;">${withoutLinksCount} Pending (No link)</span> &bull; <span style="color: #0284c7; font-weight: 700; font-size: 0.8rem;">${updateCount} to Update</span>`;

  previewContainer.style.display = 'block';
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i data-lucide="check"></i> Confirm & Import (${withLinksCount} Links, ${parsedExcelEntries.length} Total Rows)`;
  }

  lucide.createIcons();
}

// Execute Import and Save (with collision-free ID generation)
window.executeExcelImport = async function () {
  if (!parsedExcelEntries || parsedExcelEntries.length === 0) {
    alert("No data to import.");
    return;
  }

  const submitBtn = document.getElementById('excelImportSubmitBtn');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Confirm & Import Excel';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Importing & Saving...';
  }

  try {
    const markCompleted = document.getElementById('excelMarkCompletedCheckbox')?.checked ?? true;
    const createMissing = document.getElementById('excelCreateMissingCheckbox')?.checked ?? true;

    let updatedDesignsCount = 0;
    let createdDesignsCount = 0;
    let updatedLinksCount = 0;
    let newPlatformsAdded = 0;
    let idCounter = 0;

    // 1. Auto-register any brand new platforms found in Excel
    parsedExcelEntries.forEach(entry => {
      if (entry.platform) {
        const resolved = resolvePlatformName(entry.platform);
        if (!platforms.some(p => p.toLowerCase() === resolved.toLowerCase() || normalizeKeyStr(p) === normalizeKeyStr(resolved))) {
          platforms.push(resolved);
          platformCategories[resolved] = getPlatformCategory(resolved);
          newPlatformsAdded++;
        }
      }
    });

    // 2. Group parsed entries by SKU (normalized)
    const entriesBySku = new Map();
    parsedExcelEntries.forEach(entry => {
      const normKey = normalizeKeyStr(entry.sku) || entry.sku.toLowerCase();
      if (!entriesBySku.has(normKey)) {
        entriesBySku.set(normKey, []);
      }
      entriesBySku.get(normKey).push(entry);
    });

    entriesBySku.forEach((entries, skuKey) => {
      const sampleSku = entries[0].sku;
      const existingDesign = findDesignBySku(sampleSku);

      if (existingDesign) {
        // UPDATE EXISTING DESIGN
        sanitizeDesignPlatforms(existingDesign);
        let changed = false;

        entries.forEach(entry => {
          let targetPlat = findPlatformInDesign(existingDesign.platforms, entry.platform);

          if (!targetPlat) {
            // Platform not yet attached to this design, add it!
            targetPlat = {
              name: resolvePlatformName(entry.platform),
              status: 'pending',
              note: '',
              price: entry.price || '1'
            };
            existingDesign.platforms.push(targetPlat);
            changed = true;
          }

          // Update link / note if present
          if (entry.link && entry.link.trim() !== '') {
            targetPlat.note = entry.link.trim();
            updatedLinksCount++;
            changed = true;

            // Automatically complete platform if option is enabled
            if (markCompleted) {
              targetPlat.status = 'completed';
            }
          }

          // Update price if present and valid
          if (entry.price && parseFloat(entry.price) >= 0) {
            targetPlat.price = String(entry.price);
            changed = true;
          }

          // Explicit status override if present in excel
          if (entry.status && (entry.status === 'completed' || entry.status === 'pending')) {
            targetPlat.status = entry.status;
            changed = true;
          }
        });

        if (changed) {
          updatedDesignsCount++;
        }
      } else if (createMissing) {
        // CREATE NEW DESIGN (Unique ID guaranteed to prevent Firebase/array overwrite)
        idCounter++;
        const newDesignId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${idCounter}`;
        const activePlatformsList = (platforms && platforms.length > 0) ? platforms : ['vender', 'b2b', 'shop', 'website', 'bholo', 'portal'];

        // Initialize platforms for new design
        const designPlatforms = activePlatformsList.map(pName => {
          const matchedEntry = entries.find(e => {
            const ePlat = resolvePlatformName(e.platform);
            return ePlat.toLowerCase() === pName.toLowerCase() || normalizeKeyStr(ePlat) === normalizeKeyStr(pName);
          });
          const hasLink = matchedEntry && matchedEntry.link && matchedEntry.link.trim() !== '';
          const explicitStatus = matchedEntry ? matchedEntry.status : '';

          let status = 'pending';
          if (explicitStatus) {
            status = explicitStatus;
          } else if (hasLink && markCompleted) {
            status = 'completed';
          }

          return {
            name: pName,
            status: status,
            note: matchedEntry ? (matchedEntry.link || '') : '',
            price: matchedEntry ? (matchedEntry.price || '1') : '1'
          };
        });

        // Add any additional platforms from entries that might not be in activePlatformsList
        entries.forEach(entry => {
          const resolved = resolvePlatformName(entry.platform);
          if (!designPlatforms.some(p => p.name.toLowerCase() === resolved.toLowerCase() || normalizeKeyStr(p.name) === normalizeKeyStr(resolved))) {
            const hasLink = entry.link && entry.link.trim() !== '';
            let status = 'pending';
            if (entry.status) {
              status = entry.status;
            } else if (hasLink && markCompleted) {
              status = 'completed';
            }

            designPlatforms.push({
              name: resolved,
              status: status,
              note: entry.link || '',
              price: entry.price || '1'
            });
          }
        });

        const newDesign = {
          id: newDesignId,
          sku: entries[0].sku,
          photo: '',
          description: 'Imported from Excel',
          platforms: designPlatforms
        };

        designs.unshift(newDesign);
        createdDesignsCount++;
        entries.forEach(e => {
          if (e.link && e.link.trim() !== '') updatedLinksCount++;
        });
      }
    });

    // Save to IndexedDB (localforage) and Firebase
    saveData();

    // Re-render all views and dropdowns
    renderPlatformSelect();
    renderPlatformManager();
    renderGrids();

    let msg = `Excel Import Successful!\n\n`;
    msg += `• ${updatedDesignsCount} existing designs updated with links & prices\n`;
    if (createdDesignsCount > 0) msg += `• ${createdDesignsCount} new designs created\n`;
    msg += `• ${updatedLinksCount} total links synchronized.`;
    if (newPlatformsAdded > 0) msg += `\n• ${newPlatformsAdded} new platform(s) registered automatically.`;

    alert(msg);

    closeExcelUploadModal();
  } catch (err) {
    console.error("Error executing Excel import:", err);
    alert("An error occurred during import: " + (err.message || "Please check console for details."));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
};
