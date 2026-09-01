// Initialize state
let designs = [];
let platforms = ['vender', 'b2b', 'shop', 'website', 'bholo', 'portal'];

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
  { username: 'portal', pin: '5674', role: 'platform', permissions: { tabs: ['dashboard', 'pending', 'completed', 'stockin', 'stockout'], platforms: ['portal'] } },
  { username: 'vender', pin: '1475', role: 'platform', permissions: { tabs: ['dashboard', 'pending', 'completed', 'stockin', 'stockout'], platforms: ['vender'] } },
  { username: 'b2b', pin: '1268', role: 'platform', permissions: { tabs: ['dashboard', 'pending', 'completed', 'stockin', 'stockout'], platforms: ['b2b'] } },
  { username: 'shop', pin: '4142', role: 'platform', permissions: { tabs: ['dashboard', 'pending', 'completed', 'stockin', 'stockout'], platforms: ['shop'] } },
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

  // DESIGNS & PLATFORMS: Load ONCE together safely to prevent race condition.
  Promise.all([
    fbDb.ref('platformsData').once('value'),
    fbDb.ref('designs').once('value')
  ]).then(([platformsSnap, designsSnap]) => {
    const platData = platformsSnap.val();
    if (platData && platData.list && Array.isArray(platData.list) && platData.list.length > 0) {
      platforms = platData.list;
      localforage.setItem('designStudioPlatforms', platforms);
    } else {
      if (platforms && platforms.length > 0) {
        fbDb.ref('platformsData').set({ list: platforms }).catch(err => console.error("Firebase platforms init write failed:", err));
      } else {
        platforms = ['vender', 'b2b', 'shop', 'website', 'bholo', 'portal'];
        localforage.setItem('designStudioPlatforms', platforms);
        fbDb.ref('platformsData').set({ list: platforms }).catch(err => console.error("Firebase platforms default write failed:", err));
      }
    }

    const data = designsSnap.val();
    if (data) {
      const rawList = Object.keys(data).map(key => {
        const item = data[key];
        item.id = String(item.id || key);
        return item;
      });
      designs = sanitizeDesigns(rawList);
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

// User Session and Login logic
window.handleLoginSubmit = function() {
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

window.handleLogout = function() {
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

window.saveUserPermissions = function(username) {
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
function getPriceDisplay(design) {
  if (!design.platforms || design.platforms.length === 0) return '₹0';
  
  const prices = design.platforms.map(p => parseFloat(p.price) || 0).filter(p => p > 0);
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
window.openAddModal = function() {
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
    if(input.tagName !== 'SELECT' && input.nextElementSibling) {
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

window.closeAddModal = function() {
  addDesignModal.classList.remove('active');
}

// Tab Switching Logic
window.switchSection = function(sectionId) {
  if (sectionId === 'add') {
    openAddModal();
    return;
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
    btn.getAttribute('onclick').includes(`'${sectionId}'`)
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
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
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

window.togglePlatformPriceInput = function(platformName, isChecked) {
  const input = document.getElementById(`price_input_${platformName}`);
  if (input) {
    input.disabled = !isChecked;
    input.required = false; // no longer strictly required if we default to 1
  }
}

window.toggleAllPlatforms = function(isChecked) {
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
      if(input.tagName !== 'SELECT' && input.nextElementSibling) {
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
    
    await localforage.setItem('designStudioData', designs);
    await localforage.setItem('designStudioPlatforms', platforms);
    await localforage.setItem('designStudioUsers', appUsers);
    
    if (isFirebaseConnected) {
      try {
        await fbDb.ref('designs').remove();
        await fbDb.ref('platformsData').set({ list: platforms });
        await fbDb.ref('appUsers').set(appUsers);
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
  
  if (isFirebaseConnected) {
    // Store platforms as a wrapped object to avoid Firebase array re-indexing on delete
    fbDb.ref('platformsData').set({ list: platforms }).catch(err => console.error("Firebase platforms sync failed:", err));
    const dbObject = {};
    designs.forEach(d => {
      dbObject[d.id] = d;
    });
    fbDb.ref('designs').set(dbObject).catch(err => console.error("Firebase designs sync failed:", err));
  }
}

// Platform Management - Instant Optimistic UI Update
window.addPlatform = function() {
  const input = document.getElementById('newPlatformInput');
  const addToAllCb = document.getElementById('addToAllDesignsCheckbox');
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    alert("Please enter a platform name!");
    return;
  }
  if (platforms.includes(val)) {
    alert(`Platform "${val}" is already added!`);
    return;
  }

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

window.syncAllPlatformsToAllDesigns = function() {
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

window.deletePlatform = function(platformName) {
  if (confirm(`Are you sure you want to delete "${platformName}"?`)) {
    // 1. Filter out from global platforms array
    platforms = platforms.filter(p => p.toLowerCase() !== platformName.toLowerCase());
    
    // 2. Remove platform from all designs
    designs.forEach(d => {
      if (d.platforms && Array.isArray(d.platforms)) {
        d.platforms = d.platforms.filter(p => p && p.name && p.name.toLowerCase() !== platformName.toLowerCase());
      }
    });
    
    // 3. Clean up from user permissions
    appUsers.forEach(u => {
      if (u.permissions && u.permissions.platforms) {
        u.permissions.platforms = u.permissions.platforms.filter(p => p.toLowerCase() !== platformName.toLowerCase());
      }
    });

    // 4. Update UI INSTANTLY
    renderGrids();
    renderPlatformManager();
    renderPlatformSelect();
    renderUsersManager();

    // 5. Save in background
    saveUsersDb();
    saveData();
  }
}

function renderPlatformManager() {
  const list = document.getElementById('platformsList');
  if (!list) return;
  
  list.innerHTML = platforms.map(p => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid var(--border-color);">
      <span style="font-weight: 600;">${p}</span>
      <button class="btn-logout" style="padding: 0.25rem 0.5rem; border-radius: 4px;" onclick="deletePlatform('${p}')">
        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
      </button>
    </div>
  `).join('');

  lucide.createIcons();
}

function renderPlatformSelect() {
  const container = document.getElementById('platformCheckboxes');
  if (container) {
    let selectAllHtml = `
      <div style="width: 100%; display: flex; align-items: center; gap: 1rem; background: #e2e8f0; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 0.5rem;">
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; width: 100%;">
          <input type="checkbox" id="selectAllPlatforms" onchange="toggleAllPlatforms(this.checked)" style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
          <span style="font-weight: 800; color: #1e293b;">Select All Platforms</span>
        </label>
      </div>
    `;

    container.innerHTML = selectAllHtml + platforms.map(p => `
      <div style="display: flex; align-items: center; gap: 1rem; width: 100%; background: #f8fafc; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; min-width: 120px;">
          <input type="checkbox" class="platform-checkbox" value="${p}" onchange="togglePlatformPriceInput('${p}', this.checked)" style="width: 16px; height: 16px; accent-color: var(--accent-primary);">
          <span style="font-weight: 600;">${p}</span>
        </label>
        <div style="flex: 1;">
          <input type="number" id="price_input_${p}" class="material-input platform-price-input" placeholder="Price (₹)" value="1" disabled style="margin-bottom: 0; padding: 0.5rem; font-size: 0.9rem; background: white;">
        </div>
      </div>
    `).join('');
  }
}

// Edit and Delete functions
window.editDesignItem = function(id) {
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
    if(input.value && input.nextElementSibling) {
      input.nextElementSibling.classList.add('active');
    }
  });

  addDesignModal.classList.add('active');
}

window.deleteDesignItem = function(id) {
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

window.openUserPlatformsModal = function(username) {
  activeAssignUser = username;
  const modal = document.getElementById('userPlatformsModal');
  const title = document.getElementById('userPlatformsModalTitle');
  const container = document.getElementById('userPlatformsList');
  
  if (!modal || !title || !container) return;
  
  title.innerText = `Manage Platforms for "${username}"`;
  
  const user = appUsers.find(u => u.username === username);
  if (!user) return;
  
  const assignedPlats = user.permissions && user.permissions.platforms ? user.permissions.platforms : [];
  
  container.innerHTML = platforms.map(plat => {
    const isChecked = assignedPlats.includes(plat);
    return `
      <label class="permission-checkbox-label ${isChecked ? 'active' : ''}" style="width: 100%; display: flex; justify-content: space-between; border-radius: 8px; padding: 0.75rem 1rem; align-items: center; margin-bottom: 0.5rem;">
        <span style="text-transform: uppercase; font-weight: 700; font-size: 0.9rem;">${plat}</span>
        <input type="checkbox" class="user-plat-checkbox" value="${plat}" ${isChecked ? 'checked' : ''} onchange="this.parentElement.classList.toggle('active', this.checked)">
      </label>
    `;
  }).join('');
  
  modal.classList.add('active');
  lucide.createIcons();
}

window.closeUserPlatformsModal = function() {
  const modal = document.getElementById('userPlatformsModal');
  if (modal) modal.classList.remove('active');
}

window.saveUserPlatformsAssignment = async function() {
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
window.removePlatformFromDesign = async function(designId, platformName) {
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

window.addPlatformToDesign = async function(designId) {
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

window.openPlatformDetails = function(id) {
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

  if (filteredPlatforms.length === 0) {
    list.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 1rem;">No platforms assigned.</div>`;
  } else {
    list.innerHTML = filteredPlatforms.map(p => `
      <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
        
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

        <input type="text" class="material-input" placeholder="Add a note..." value="${p.note || ''}" onchange="updatePlatformNote('${design.id}', '${p.name}', this.value)" style="margin-bottom: 0; background: white;" />
      </div>
    `).join('');
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
        addBtn.onclick = function() {
          addPlatformToDesign(design.id);
        };
      }
    }
  }

  platformDetailsModal.classList.add('active');
  lucide.createIcons();
}

window.closePlatformDetailsModal = function() {
  platformDetailsModal.classList.remove('active');
}

// Stock Status Selector Modal Logic
let selectedStockDesignId = null;

window.openStockStatusModal = function(id) {
  selectedStockDesignId = id;
  if (stockStatusModal) {
    stockStatusModal.classList.add('active');
    lucide.createIcons();
  }
}

window.closeStockStatusModal = function() {
  if (stockStatusModal) {
    stockStatusModal.classList.remove('active');
  }
  selectedStockDesignId = null;
}

window.setDesignStockStatus = async function(status) {
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

window.togglePlatformStatus = function(designId, platformName, isCompleted) {
  const design = designs.find(d => String(d.id) === String(designId));
  if (!design) return;
  const p = design.platforms.find(pl => pl.name === platformName);
  if (p) p.status = isCompleted ? 'completed' : 'pending';
  saveData();
  renderGrids();
  
  // Re-render the details list to update colors while the modal is open
  openPlatformDetails(designId); 
}

window.updatePlatformNote = function(designId, platformName, noteValue) {
  const design = designs.find(d => String(d.id) === String(designId));
  if (!design) return;
  const p = design.platforms.find(pl => pl.name === platformName);
  if (p) p.note = noteValue;
  saveData();
}

window.updatePlatformPrice = function(designId, platformName, priceValue) {
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

// Render UI
function renderGrids() {
  if (!currentUser) return; // Prevent rendering if not logged in

  // Always sanitize design platforms array before filtering/rendering
  designs.forEach(d => {
    sanitizeDesignPlatforms(d);
    // Fallback: If a design has 0 platforms, auto-assign active platforms so it never vanishes
    if (!d.platforms || d.platforms.length === 0) {
      const activePlats = (platforms && platforms.length > 0) ? platforms : ['vender', 'b2b', 'shop', 'website', 'bholo', 'portal'];
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

  // Filter designs based on role and status
  const pending = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(pendingTerm) || d.description.toLowerCase().includes(pendingTerm);
    return d.platforms.some(p => hasUserPlatform(p.name) && p.status === 'pending') && matchesSearch;
  });

  const completed = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(completedTerm) || d.description.toLowerCase().includes(completedTerm);
    return d.platforms.some(p => hasUserPlatform(p.name) && p.status === 'completed') && matchesSearch;
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

  const totalStockOut = designs.filter(d => 
    d.platforms && d.stockStatus === 'out' && d.platforms.some(p => hasUserPlatform(p.name) && p.status === 'completed')
  ).length;

  const totalStockIn = designs.filter(d => 
    d.platforms && d.stockStatus === 'in' && d.platforms.some(p => hasUserPlatform(p.name) && p.status === 'completed')
  ).length;

  const pendingCountEl = document.getElementById('pendingCount');
  const completedCountEl = document.getElementById('completedCount');
  const stockOutCountEl = document.getElementById('stockOutCount');
  const stockInCountEl = document.getElementById('stockInCount');
  if (pendingCountEl) pendingCountEl.innerText = totalPending;
  if (completedCountEl) completedCountEl.innerText = totalCompleted;
  if (stockOutCountEl) stockOutCountEl.innerText = totalStockOut;
  if (stockInCountEl) stockInCountEl.innerText = totalStockIn;

  // Render Pending
  if (pending.length === 0) {
    pendingEmptyState.style.display = 'block';
    pendingGrid.innerHTML = '';
  } else {
    pendingEmptyState.style.display = 'none';
    pendingGrid.innerHTML = pending.map(design => {
      const userAssignedPlats = design.platforms.filter(p => hasUserPlatform(p.name));
      const userCompletedPlats = userAssignedPlats.filter(p => p.status === 'completed');

      return `
        <div class="design-card fancy-hover" style="padding-bottom: 0; display: flex; flex-direction: column;">
          <div class="design-image-container">
            ${design.photo ? `<img src="${design.photo}" alt="${design.sku}" class="design-image" />` : `<div class="empty-preview" style="height: 100%; background: #eee;">No Image</div>`}
            <div class="price-badge" style="background: var(--bg-alt); color: var(--accent-primary); border: 1px solid var(--accent-primary); font-weight: 800;">
              ${getPriceDisplay(design)}
            </div>
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
              Platforms: <span style="font-weight: 600; color: var(--text-color);">${userAssignedPlats.filter(p => p.status === 'pending').map(p => p.name).join(', ')}</span><br/>
              <span style="color: ${userCompletedPlats.length > 0 ? 'var(--accent-primary)' : 'inherit'};">
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

  // Render Completed
  if (completed.length === 0) {
    completedEmptyState.style.display = 'block';
    completedGrid.innerHTML = '';
  } else {
    completedEmptyState.style.display = 'none';
    completedGrid.innerHTML = completed.map(design => {
      const userAssignedPlats = design.platforms.filter(p => hasUserPlatform(p.name));
      const userCompletedPlats = userAssignedPlats.filter(p => p.status === 'completed');
      const isFullyCompleted = userAssignedPlats.length > 0 && userAssignedPlats.every(p => p.status === 'completed');

      return `
        <div class="design-card fancy-hover" style="opacity: 0.9; display: flex; flex-direction: column;">
          <div class="design-image-container" onclick="openStockStatusModal('${design.id}')" style="cursor: pointer;" title="Click image to change stock status">
            ${design.photo ? `<img src="${design.photo}" alt="${design.sku}" class="design-image" style="filter: ${isFullyCompleted ? 'grayscale(20%)' : 'none'};" />` : `<div class="empty-preview" style="height: 100%; background: #eee;">No Image</div>`}
            <div class="price-badge" style="background: ${isFullyCompleted ? '#10b981' : '#f59e0b'}; color: white; font-weight: 800;">
              ${getPriceDisplay(design)}
            </div>
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
              Platforms: <span style="font-weight: 600; color: var(--text-color);">${userCompletedPlats.map(p => p.name).join(', ')}</span><br/>
              <span style="color: ${isFullyCompleted ? '#10b981' : '#d97706'};">
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
    
    const savedPlatforms = await localforage.getItem('designStudioPlatforms');
    if (savedPlatforms && Array.isArray(savedPlatforms)) {
      platforms = savedPlatforms;
    } else {
      platforms = ['vender', 'b2b', 'shop', 'website', 'bholo', 'portal'];
      await localforage.setItem('designStudioPlatforms', platforms);
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
      if (updated) {
        await localforage.setItem('designStudioUsers', appUsers);
      }
    } else {
      appUsers = JSON.parse(JSON.stringify(DEFAULT_USERS));
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
window.exportPendingToExcel = function() {
  if (typeof XLSX === 'undefined') {
    alert("Excel library is still loading or failed to load. Please try again in a moment.");
    return;
  }

  const pendingTerm = searchPending.value.toLowerCase();
  const isPlatformUser = currentUser && currentUser.role === 'platform';

  const pending = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(pendingTerm) || d.description.toLowerCase().includes(pendingTerm);
    if (isPlatformUser) {
      return d.platforms.some(p => (currentUser.permissions?.platforms || []).includes(p.name) && p.status === 'pending') && matchesSearch;
    } else {
      return d.platforms.some(p => p.status === 'pending') && matchesSearch;
    }
  });

  const data = [];
  const notesData = [];

  pending.forEach(d => {
    let relevantPlatforms = d.platforms;
    if (isPlatformUser) {
      relevantPlatforms = d.platforms.filter(p => (currentUser.permissions?.platforms || []).includes(p.name));
    }
    
    // Create a row object starting with the Design ID for Sheet 1
    const row = {
      "Design Name / No.": d.sku
    };

    // Add each platform as a separate column, and its value as the price
    relevantPlatforms.forEach(p => {
      row[p.name] = p.price || 0;
      
      // Collect links/notes for Sheet 2
      if (p.note && p.note.trim() !== '') {
        notesData.push({
          "Design Name / No.": d.sku,
          "Platform": p.name,
          "Link": p.note
        });
      }
    });

    data.push(row);
  });

  if (data.length === 0) {
    alert('No pending designs to export.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Prices
  const ws1 = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws1, "Pending Designs");

  // Sheet 2: Links/Notes
  if (notesData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(notesData);
    XLSX.utils.book_append_sheet(wb, ws2, "Links");
  } else {
    // If no links exist, add an empty sheet with headers just in case
    const ws2 = XLSX.utils.json_to_sheet([{"Design Name / No.": "-", "Platform": "-", "Link": "No links available"}]);
    XLSX.utils.book_append_sheet(wb, ws2, "Links");
  }

  XLSX.writeFile(wb, "Pending_Designs.xlsx");
};

// Export Completed Designs to Excel
window.exportCompletedToExcel = function() {
  if (typeof XLSX === 'undefined') {
    alert("Excel library is still loading or failed to load. Please try again in a moment.");
    return;
  }

  const completedTerm = searchCompleted.value.toLowerCase();
  const isPlatformUser = currentUser && currentUser.role === 'platform';

  const completed = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(completedTerm) || d.description.toLowerCase().includes(completedTerm);
    if (isPlatformUser) {
      return d.platforms.some(p => (currentUser.permissions?.platforms || []).includes(p.name) && p.status === 'completed') && matchesSearch;
    } else {
      return d.platforms.some(p => p.status === 'completed') && matchesSearch;
    }
  });

  const data = [];
  const notesData = [];

  completed.forEach(d => {
    let relevantPlatforms = d.platforms;
    if (isPlatformUser) {
      relevantPlatforms = d.platforms.filter(p => (currentUser.permissions?.platforms || []).includes(p.name));
    }
    
    // Only include platforms that are actually completed
    relevantPlatforms = relevantPlatforms.filter(p => p.status === 'completed');
    
    // Create a row object starting with the Design ID for Sheet 1
    const row = {
      "Design Name / No.": d.sku
    };

    // Add each platform as a separate column, and its value as the price
    relevantPlatforms.forEach(p => {
      row[p.name] = p.price || 0;
      
      // Collect links/notes for Sheet 2
      if (p.note && p.note.trim() !== '') {
        notesData.push({
          "Design Name / No.": d.sku,
          "Platform": p.name,
          "Link": p.note
        });
      }
    });

    data.push(row);
  });

  if (data.length === 0) {
    alert('No completed designs to export.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Prices
  const ws1 = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws1, "Completed Designs");

  // Sheet 2: Links/Notes
  if (notesData.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(notesData);
    XLSX.utils.book_append_sheet(wb, ws2, "Links");
  } else {
    // If no links exist, add an empty sheet with headers just in case
    const ws2 = XLSX.utils.json_to_sheet([{"Design Name / No.": "-", "Platform": "-", "Link": "No links available"}]);
    XLSX.utils.book_append_sheet(wb, ws2, "Links");
  }

  XLSX.writeFile(wb, "Completed_Designs.xlsx");
};

// ==========================================
// EXCEL UPLOAD & AUTO IMPORT LOGIC
// ==========================================

let parsedExcelEntries = [];

window.openExcelUploadModal = function() {
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

window.closeExcelUploadModal = function() {
  const modal = document.getElementById('excelUploadModal');
  if (modal) modal.classList.remove('active');
  parsedExcelEntries = [];
};

// Download Sample Template for User
window.downloadSampleExcelTemplate = function() {
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

window.handleExcelFileSelect = function(e) {
  const file = e.target.files[0];
  if (file) {
    handleExcelFileUpload(file);
  }
};

window.handleExcelFileUpload = function(file) {
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

  reader.onload = function(e) {
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

// Helper to test if a string is a link/URL
function isLinkValue(val) {
  if (!val || typeof val !== 'string') return false;
  const v = val.trim().toLowerCase();
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('www.') || 
         v.includes('.com') || v.includes('.in') || v.includes('.org') || v.includes('.net') || 
         v.includes('.co') || v.includes('/') || v.length > 15;
}

// Helper to extract platform name from column header like "Flipkart Link", "Amazon URL", "vender_link"
function extractPlatformFromHeader(header) {
  let h = String(header || '').trim();
  const cleaned = h.replace(/[-_ ]*(link|url|note|notes|listing|website link|portal link)[-_ ]*/gi, '').trim();
  return cleaned || h;
}

// Helper to extract clean price
function extractPrice(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (!s || s === '-' || s === '0000' || s === '0' || s.toLowerCase() === 'no') return null;
  const cleanStr = s.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleanStr);
  if (!isNaN(num) && num > 0) return String(num);
  return null;
}

// Normalization helper for fuzzy matching SKU and Platform names
function normalizeKeyStr(str) {
  return String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper to find existing design by SKU (handles hyphen/space variations like AQ-401 vs AQ 401)
function findDesignBySku(sku) {
  if (!sku || !designs || designs.length === 0) return null;
  const clean = String(sku).trim().toLowerCase();
  let found = designs.find(d => d && d.sku && d.sku.trim().toLowerCase() === clean);
  if (found) return found;

  const norm = normalizeKeyStr(sku);
  if (norm) {
    found = designs.find(d => d && d.sku && normalizeKeyStr(d.sku) === norm);
    if (found) return found;
  }
  return null;
}

// Helper to find matching platform in design's platforms list
function findPlatformInDesign(platformsList, platName) {
  if (!platformsList || !platName) return null;
  const clean = String(platName).trim().toLowerCase();
  let found = platformsList.find(p => p && p.name && p.name.trim().toLowerCase() === clean);
  if (found) return found;

  const cleanHeader = extractPlatformFromHeader(platName).trim().toLowerCase();
  found = platformsList.find(p => p && p.name && p.name.trim().toLowerCase() === cleanHeader);
  if (found) return found;

  const norm = normalizeKeyStr(platName);
  const normClean = normalizeKeyStr(cleanHeader);
  found = platformsList.find(p => {
    if (!p || !p.name) return false;
    const pNorm = normalizeKeyStr(p.name);
    return pNorm === norm || pNorm === normClean || pNorm.includes(norm) || norm.includes(pNorm);
  });
  return found || null;
}

// Intelligent Workbook Parsing
function processExcelWorkbook(workbook) {
  parsedExcelEntries = [];
  const defaultPlatform = (currentUser && currentUser.role === 'platform' && currentUser.permissions?.platforms?.[0]) || (platforms[0] || 'vender');
  
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    alert("The uploaded Excel workbook contains no sheets.");
    return;
  }

  const parsedItemsMap = new Map(); // Key: `${sku.toLowerCase()}__${platform.toLowerCase()}`

  function getOrInitEntry(sku, platform) {
    const cleanSku = String(sku).trim();
    const cleanPlatform = String(platform).trim();
    if (!cleanSku || cleanSku === '-' || cleanSku.toLowerCase() === 'design name / no.' || cleanSku.toLowerCase() === 'design no') return null;
    if (!cleanPlatform || cleanPlatform === '-') return null;

    const key = `${cleanSku.toLowerCase()}__${cleanPlatform.toLowerCase()}`;
    if (!parsedItemsMap.has(key)) {
      parsedItemsMap.set(key, {
        sku: cleanSku,
        platform: cleanPlatform,
        link: '',
        price: '1',
        status: ''
      });
    }
    return parsedItemsMap.get(key);
  }

  // Robust entry lookup helper
  function findMatchedEntry(sku, platHeader) {
    const cleanSku = String(sku).trim().toLowerCase();
    const cleanPlat = String(platHeader).trim().toLowerCase();
    const platCleaned = extractPlatformFromHeader(platHeader).trim().toLowerCase();

    // 1. Exact key match
    if (parsedItemsMap.has(`${cleanSku}__${cleanPlat}`)) {
      return parsedItemsMap.get(`${cleanSku}__${cleanPlat}`);
    }
    // 2. Cleaned platform header match
    if (parsedItemsMap.has(`${cleanSku}__${platCleaned}`)) {
      return parsedItemsMap.get(`${cleanSku}__${platCleaned}`);
    }

    // 3. Normalized alphanumeric match
    const normSku = normalizeKeyStr(sku);
    const normPlat = normalizeKeyStr(platHeader);
    const normPlatCleaned = normalizeKeyStr(platCleaned);

    for (const [key, entry] of parsedItemsMap.entries()) {
      if (normalizeKeyStr(entry.sku) === normSku) {
        const entryPlatNorm = normalizeKeyStr(entry.platform);
        if (entryPlatNorm === normPlat || entryPlatNorm === normPlatCleaned || entryPlatNorm.includes(normPlat) || normPlat.includes(entryPlatNorm)) {
          return entry;
        }
      }
    }
    return null;
  }

  // Check if there is a dedicated 'Links' or 'Link' sheet in the workbook
  const linksSheetName = sheetNames.find(s => s.trim().toLowerCase() === 'links' || s.trim().toLowerCase() === 'link' || s.toLowerCase().includes('link'));

  // Function to parse a sheet with (Design No, Platform, Link) columns
  function parseFlatSheet(sheet) {
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows || rows.length === 0) return;

    const sampleRow = rows[0];
    const allHeaders = Object.keys(sampleRow);

    let skuKey = null;
    let platformKey = null;
    let linkKey = null;
    let priceKey = null;
    let statusKey = null;

    allHeaders.forEach(header => {
      const h = header.trim().toLowerCase();
      
      // Platform Column header matching (handles plateform, platform, platfrom, etc.)
      if (h === 'platform' || h === 'plateform' || h === 'platfrom' || h === 'portal' || 
          h === 'channel' || h === 'marketplace' || h === 'site' || h === 'platform name' || 
          h === 'plateform name' || h.startsWith('plat')) {
        platformKey = header;
      }
      // SKU Column header matching
      else if (h.includes('design') || h.includes('sku') || h.includes('item') || 
               h.includes('code') || h.includes('model') || h === 'no' || h === 'no.' || 
               h === 'sr' || h === 'sr no' || h === 'id' || h === 'd.no' || h === 'dno') {
        if (!skuKey) skuKey = header;
      }
      // Link / Note Column header matching
      else if (h === 'link' || h === 'url' || h === 'note' || h === 'notes' || 
               h === 'web link' || h === 'product link' || h === 'listing link' || 
               h === 'listing' || h === 'href' || h.includes('link') || h.includes('url')) {
        linkKey = header;
      }
      // Price Column header matching
      else if (h.includes('price') || h.includes('rate') || h.includes('amount') || h.includes('cost') || h.includes('mrp')) {
        priceKey = header;
      }
      // Status Column header matching
      else if (h.includes('status')) {
        statusKey = header;
      }
    });

    if (!skuKey && allHeaders.length > 0) skuKey = allHeaders[0];

    rows.forEach(row => {
      const rawSku = skuKey ? row[skuKey] : row[allHeaders[0]];
      const sku = String(rawSku !== undefined && rawSku !== null ? rawSku : '').trim();

      if (!sku || sku === '-' || sku.toLowerCase() === 'design no' || sku.toLowerCase() === 'design name / no.' || sku.toLowerCase() === 'sku') {
        return;
      }

      if (platformKey) {
        // Dedicated platform column
        const rawPlatform = row[platformKey];
        const platform = String(rawPlatform !== undefined && rawPlatform !== null ? rawPlatform : '').trim();
        
        const rawLink = linkKey ? row[linkKey] : '';
        const link = String(rawLink !== undefined && rawLink !== null ? rawLink : '').trim();

        const rawPrice = priceKey ? row[priceKey] : '';
        const numPrice = extractPrice(rawPrice);

        const rawStatus = statusKey ? row[statusKey] : '';
        const status = String(rawStatus !== undefined && rawStatus !== null ? rawStatus : '').trim();

        // Skip rows without platform and link
        if (!platform && !link) return;
        if (link === 'No links available' || link === '-') return;

        const finalPlatform = platform || defaultPlatform;
        const entry = getOrInitEntry(sku, finalPlatform);
        if (entry) {
          if (link && link !== '-') entry.link = link;
          if (numPrice) entry.price = numPrice;
          if (status) entry.status = status;
        }
      } else {
        // Multi-column or matrix
        allHeaders.forEach(header => {
          if (header === skuKey || header === statusKey || header === priceKey) return;
          const val = String(row[header] !== undefined && row[header] !== null ? row[header] : '').trim();
          if (!val || val === '-' || val === 'No links available') return;

          if (header === linkKey) {
            const entry = getOrInitEntry(sku, defaultPlatform);
            if (entry) entry.link = val;
          } else {
            const platName = extractPlatformFromHeader(header);
            if (platName && platName.toLowerCase() !== 'description' && platName.toLowerCase() !== 'photo' && platName.toLowerCase() !== 'image') {
              const entry = getOrInitEntry(sku, platName);
              if (entry) {
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
      }
    });
  }

  // 1. If Links sheet exists, parse it first!
  if (linksSheetName) {
    parseFlatSheet(workbook.Sheets[linksSheetName]);

    // 2. Parse prices from all other sheets (e.g. 'Pending Designs', 'Completed Designs', etc.)
    const nonLinkSheets = sheetNames.filter(s => s !== linksSheetName);
    nonLinkSheets.forEach(sheetName => {
      const pSheet = workbook.Sheets[sheetName];
      if (!pSheet) return;
      const pRows = XLSX.utils.sheet_to_json(pSheet, { defval: '' });
      if (!pRows || pRows.length === 0) return;

      const pHeaders = Object.keys(pRows[0]);
      let pSkuKey = pHeaders.find(h => {
        const lower = h.trim().toLowerCase();
        return lower.includes('design') || lower.includes('sku') || lower.includes('item') || 
               lower.includes('code') || lower.includes('d.no') || lower.includes('dno') || 
               lower === 'no' || lower === 'no.' || lower === 'sr' || lower === 'sr no';
      }) || pHeaders[0];

      pRows.forEach(pRow => {
        const rawSku = pRow[pSkuKey];
        const pSku = String(rawSku !== undefined && rawSku !== null ? rawSku : '').trim();
        if (!pSku || pSku === '-' || pSku.toLowerCase() === 'design name / no.' || pSku.toLowerCase() === 'design no' || pSku.toLowerCase() === 'sku') return;

        pHeaders.forEach(pH => {
          if (pH === pSkuKey) return;
          const pVal = pRow[pH];
          const numPrice = extractPrice(pVal);
          if (numPrice) {
            let matchedEntry = findMatchedEntry(pSku, pH);
            if (matchedEntry) {
              matchedEntry.price = numPrice;
            } else if (parseFloat(numPrice) > 1) {
              const platName = extractPlatformFromHeader(pH);
              if (platName && platName.toLowerCase() !== 'description' && platName.toLowerCase() !== 'photo' && platName.toLowerCase() !== 'image') {
                const newEntry = getOrInitEntry(pSku, platName);
                if (newEntry) {
                  newEntry.price = numPrice;
                }
              }
            }
          }
        });
      });
    });
  } else {
    // If no dedicated Links sheet, parse all sheets
    sheetNames.forEach(sheetName => {
      parseFlatSheet(workbook.Sheets[sheetName]);
    });
  }

  parsedExcelEntries = Array.from(parsedItemsMap.values()).filter(item => item && item.sku && (item.link || item.price));

  if (parsedExcelEntries.length === 0) {
    alert("No valid design rows with links could be parsed from this Excel file.");
    return;
  }

  renderExcelPreview();
}

// Render Preview Table
function renderExcelPreview() {
  const previewContainer = document.getElementById('excelPreviewContainer');
  const rowCountEl = document.getElementById('excelPreviewRowCount');
  const statsEl = document.getElementById('excelPreviewStats');
  const tbody = document.getElementById('excelPreviewTbody');
  const submitBtn = document.getElementById('excelImportSubmitBtn');

  if (!previewContainer || !tbody) return;

  let updateCount = 0;
  let newCount = 0;

  const rowsHtml = parsedExcelEntries.map((item, idx) => {
    const matchedDesign = findDesignBySku(item.sku);
    const isExisting = !!matchedDesign;
    if (isExisting) {
      updateCount++;
    } else {
      newCount++;
    }

    return `
      <tr>
        <td style="color: var(--text-muted); font-size: 0.75rem;">${idx + 1}</td>
        <td style="font-weight: 700; color: #1e293b;">${item.sku} ${matchedDesign && matchedDesign.sku !== item.sku ? `<span style="color: #64748b; font-size: 0.75rem; font-weight: normal;">(${matchedDesign.sku})</span>` : ''}</td>
        <td>
          <span style="display: inline-block; background: #e0f2fe; color: #0284c7; padding: 0.15rem 0.5rem; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; text-transform: uppercase;">
            ${item.platform}
          </span>
        </td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${item.link ? `<a href="${item.link}" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">${item.link}</a>` : `<span style="color: var(--text-muted); font-style: italic;">No Link</span>`}
        </td>
        <td style="font-weight: 600;">₹${item.price || '1'}</td>
        <td>
          ${isExisting 
            ? `<span class="badge-action-update"><i data-lucide="refresh-cw" style="width: 11px; height: 11px; display: inline;"></i> Update Existing</span>`
            : `<span class="badge-action-new"><i data-lucide="plus" style="width: 11px; height: 11px; display: inline;"></i> New Design</span>`
          }
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rowsHtml;
  rowCountEl.innerText = parsedExcelEntries.length;
  statsEl.innerHTML = `<span style="color: #b45309; font-weight: 700;">${updateCount} to Update</span> &bull; <span style="color: #15803d; font-weight: 700;">${newCount} New</span>`;
  
  previewContainer.style.display = 'block';
  if (submitBtn) submitBtn.disabled = false;

  lucide.createIcons();
}

// Execute Import and Save
window.executeExcelImport = async function() {
  if (!parsedExcelEntries || parsedExcelEntries.length === 0) {
    alert("No data to import.");
    return;
  }

  const submitBtn = document.getElementById('excelImportSubmitBtn');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Importing & Saving...';

  try {
    const markCompleted = document.getElementById('excelMarkCompletedCheckbox')?.checked ?? true;
    const createMissing = document.getElementById('excelCreateMissingCheckbox')?.checked ?? true;

    let updatedDesignsCount = 0;
    let createdDesignsCount = 0;
    let updatedLinksCount = 0;
    let newPlatformsAdded = 0;

    // 1. Auto-register any brand new platforms found in Excel
    parsedExcelEntries.forEach(entry => {
      if (entry.platform && !platforms.some(p => p.toLowerCase() === entry.platform.toLowerCase() || normalizeKeyStr(p) === normalizeKeyStr(entry.platform))) {
        platforms.push(entry.platform);
        newPlatformsAdded++;
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
              name: entry.platform,
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
          if (entry.price && parseFloat(entry.price) > 0) {
            targetPlat.price = String(entry.price);
            changed = true;
          }

          // Explicit status override if present in excel
          if (entry.status && (entry.status.toLowerCase() === 'completed' || entry.status.toLowerCase() === 'pending')) {
            targetPlat.status = entry.status.toLowerCase();
            changed = true;
          }
        });

        if (changed) {
          updatedDesignsCount++;
        }
      } else if (createMissing) {
        // CREATE NEW DESIGN
        const newDesignId = String(Date.now() + Math.floor(Math.random() * 1000));
        const activePlatformsList = (platforms && platforms.length > 0) ? platforms : ['vender', 'b2b', 'shop', 'website', 'bholo', 'portal'];

        // Initialize platforms for new design
        const designPlatforms = activePlatformsList.map(pName => {
          const matchedEntry = entries.find(e => e.platform.toLowerCase() === pName.toLowerCase() || normalizeKeyStr(e.platform) === normalizeKeyStr(pName));
          const hasLink = matchedEntry && matchedEntry.link && matchedEntry.link.trim() !== '';
          return {
            name: pName,
            status: (hasLink && markCompleted) ? 'completed' : 'pending',
            note: matchedEntry ? (matchedEntry.link || '') : '',
            price: matchedEntry ? (matchedEntry.price || '1') : '1'
          };
        });

        // Add any additional platforms from entries that might not be in activePlatformsList
        entries.forEach(entry => {
          if (!designPlatforms.some(p => p.name.toLowerCase() === entry.platform.toLowerCase() || normalizeKeyStr(p.name) === normalizeKeyStr(entry.platform))) {
            designPlatforms.push({
              name: entry.platform,
              status: (entry.link && markCompleted) ? 'completed' : 'pending',
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
    await saveData();

    // Re-render all views and dropdowns
    renderPlatformSelect();
    renderPlatformManager();
    renderGrids();

    let msg = `Excel Import Successful!\n\n`;
    msg += `• ${updatedDesignsCount} designs updated with links & platforms\n`;
    if (createdDesignsCount > 0) msg += `• ${createdDesignsCount} new designs created\n`;
    msg += `• ${updatedLinksCount} total links synchronized.`;
    if (newPlatformsAdded > 0) msg += `\n• ${newPlatformsAdded} new platform(s) registered automatically.`;

    alert(msg);

    closeExcelUploadModal();
  } catch (err) {
    console.error("Error executing Excel import:", err);
    alert("An error occurred during import. Please check console for details.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
};

