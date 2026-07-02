// Initialize state
let designs = [];
let platforms = ['vender', 'b2b', 'shop', 'website', 'bholo', 'portal'];

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

  // DESIGNS: Load ONCE only — same reason as platforms.
  // .on() listener fires after every .set() call (including our own deletes),
  // restoring the old Firebase cached data and undoing the deletion.
  fbDb.ref('designs').once('value').then(snapshot => {
    const data = snapshot.val();
    if (data) {
      designs = Object.keys(data).map(key => {
        const item = data[key];
        item.id = String(item.id || key);
        return item;
      });
      localforage.setItem('designStudioData', designs);
    } else {
      // Firebase has no designs. Upload what we have locally.
      if (designs && designs.length > 0) {
        const dbObject = {};
        designs.forEach(d => {
          dbObject[d.id] = d;
        });
        fbDb.ref('designs').set(dbObject).catch(err => console.error("Firebase designs init write failed:", err));
      } else {
        designs = [];
        localforage.setItem('designStudioData', designs);
      }
    }
    renderGrids();
  }).catch(err => console.error("Designs load error:", err));


  // PLATFORMS: Load ONCE only — no continuous listener.
  // Using .on() causes a feedback loop: when we write after delete, 
  // the listener fires again and can restore deleted platforms from cache.
  fbDb.ref('platformsData').once('value').then(snapshot => {
    const data = snapshot.val();
    if (data && data.list && Array.isArray(data.list)) {
      platforms = data.list;
      localforage.setItem('designStudioPlatforms', platforms);
    } else {
      // Database has no platforms. Upload what we have locally.
      if (platforms && platforms.length > 0) {
        fbDb.ref('platformsData').set({ list: platforms }).catch(err => console.error("Firebase platforms init write failed:", err));
      } else {
        platforms = ['vender', 'b2b', 'shop', 'website', 'bholo', 'portal'];
        localforage.setItem('designStudioPlatforms', platforms);
        fbDb.ref('platformsData').set({ list: platforms }).catch(err => console.error("Firebase platforms default write failed:", err));
      }
    }
    renderGrids();
    renderPlatformManager();
    renderPlatformSelect();
    renderUsersManager();
  }).catch(err => console.error("Platforms load error:", err));

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

async function saveUsersDb() {
  await localforage.setItem('designStudioUsers', appUsers);
  if (isFirebaseConnected) {
    try {
      await fbDb.ref('appUsers').set(appUsers);
    } catch (err) {
      console.error("Firebase saveUsersDb failed:", err);
      alert("Error: Failed to save user permissions to Firebase. " + err.message);
    }
  }
}

window.saveUserPermissions = async function(username) {
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

  // Save to DB
  await saveUsersDb();
  
  alert(`Permissions for user "${username}" saved successfully!`);
  
  renderUsersManager();
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

// Save to localforage (IndexedDB) and Firebase
async function saveData() {
  await localforage.setItem('designStudioData', designs);
  await localforage.setItem('designStudioPlatforms', platforms);
  
  if (isFirebaseConnected) {
    try {
      // Store platforms as a wrapped object to avoid Firebase array re-indexing on delete
      await fbDb.ref('platformsData').set({ list: platforms });
      const dbObject = {};
      designs.forEach(d => {
        dbObject[d.id] = d;
      });
      await fbDb.ref('designs').set(dbObject);
    } catch (err) {
      console.error("Firebase saveData failed:", err);
      alert("Error: Failed to sync designs or platforms to Firebase. " + err.message);
    }
  }
}

// Platform Management
window.addPlatform = async function() {
  const input = document.getElementById('newPlatformInput');
  const val = input.value.trim();
  if (val && !platforms.includes(val)) {
    platforms.push(val);
    await saveData();
    input.value = '';
    renderGrids();
    renderPlatformManager();
    renderPlatformSelect();
    renderUsersManager();
  }
}

window.deletePlatform = async function(platformName) {
  if (confirm(`Are you sure you want to delete ${platformName}?`)) {
    platforms = platforms.filter(p => p !== platformName);
    
    // Clean up from user permissions
    appUsers.forEach(u => {
      if (u.permissions && u.permissions.platforms) {
        u.permissions.platforms = u.permissions.platforms.filter(p => p !== platformName);
      }
    });
    await saveUsersDb();
    
    await saveData();
    renderGrids();
    renderPlatformManager();
    renderPlatformSelect();
    renderUsersManager();
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

window.deleteDesignItem = async function(id) {
  if (currentUser && currentUser.role === 'platform') return;
  if (confirm("Are you sure you want to delete this design?")) {
    designs = designs.filter(d => String(d.id) !== String(id));
    await saveData();
    renderGrids();
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
window.openPlatformDetails = function(id) {
  const design = designs.find(d => String(d.id) === String(id));
  if (!design) return;

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
          <label class="checkbox-wrapper" style="margin-bottom: 0;">
            <input type="checkbox" ${p.status === 'completed' ? 'checked' : ''} onchange="togglePlatformStatus('${design.id}', '${p.name}', this.checked)" />
            <span class="checkbox-text">Completed</span>
          </label>
        </div>
        
        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 0.75rem;">
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-muted);">Price (₹)</div>
          <input type="number" class="material-input" value="${p.price || ''}" onchange="updatePlatformPrice('${design.id}', '${p.name}', this.value)" style="margin-bottom: 0; padding: 0.4rem; font-size: 0.9rem; width: 100px; background: white;" ${isPlatformUser ? 'disabled' : ''} />
        </div>

        <input type="text" class="material-input" placeholder="Add a note..." value="${p.note || ''}" onchange="updatePlatformNote('${design.id}', '${p.name}', this.value)" style="margin-bottom: 0; background: white;" />
      </div>
    `).join('');
  }

  platformDetailsModal.classList.add('active');
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

  const pendingTerm = searchPending.value.toLowerCase();
  const completedTerm = searchCompleted.value.toLowerCase();
  const stockOutTerm = searchStockOut ? searchStockOut.value.toLowerCase() : '';
  const stockInTerm = searchStockIn ? searchStockIn.value.toLowerCase() : '';

  const isPlatformUser = currentUser.role === 'platform';

  // Filter designs based on role and status
  const pending = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(pendingTerm) || d.description.toLowerCase().includes(pendingTerm);
    if (isPlatformUser) {
      return d.platforms.some(p => (currentUser.permissions?.platforms || []).includes(p.name) && p.status === 'pending') && matchesSearch;
    } else {
      return d.platforms.some(p => p.status === 'pending') && matchesSearch;
    }
  });

  const completed = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(completedTerm) || d.description.toLowerCase().includes(completedTerm);
    if (isPlatformUser) {
      return d.platforms.some(p => (currentUser.permissions?.platforms || []).includes(p.name) && p.status === 'completed') && matchesSearch;
    } else {
      return d.platforms.some(p => p.status === 'completed') && matchesSearch;
    }
  });

  const stockOut = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(stockOutTerm) || d.description.toLowerCase().includes(stockOutTerm);
    const hasCompletedPlatform = isPlatformUser
      ? d.platforms.some(p => (currentUser.permissions?.platforms || []).includes(p.name) && p.status === 'completed')
      : d.platforms.some(p => p.status === 'completed');
    return hasCompletedPlatform && d.stockStatus === 'out' && matchesSearch;
  });

  const stockIn = designs.filter(d => {
    if (!d.platforms) return false;
    const matchesSearch = d.sku.toLowerCase().includes(stockInTerm) || d.description.toLowerCase().includes(stockInTerm);
    const hasCompletedPlatform = isPlatformUser
      ? d.platforms.some(p => (currentUser.permissions?.platforms || []).includes(p.name) && p.status === 'completed')
      : d.platforms.some(p => p.status === 'completed');
    return hasCompletedPlatform && d.stockStatus === 'in' && matchesSearch;
  });

  // Calculate stats counts based on role (not search filter)
  const totalPending = designs.filter(d => 
    d.platforms && 
    (isPlatformUser ? d.platforms.some(p => (currentUser.permissions?.platforms || []).includes(p.name) && p.status === 'pending') : d.platforms.some(p => p.status === 'pending'))
  ).length;

  const totalCompleted = designs.filter(d => 
    d.platforms &&
    (isPlatformUser ? d.platforms.some(p => (currentUser.permissions?.platforms || []).includes(p.name) && p.status === 'completed') : d.platforms.some(p => p.status === 'completed'))
  ).length;

  const totalStockOut = designs.filter(d => 
    d.platforms && d.stockStatus === 'out' &&
    (isPlatformUser ? d.platforms.some(p => (currentUser.permissions?.platforms || []).includes(p.name) && p.status === 'completed') : d.platforms.some(p => p.status === 'completed'))
  ).length;

  const totalStockIn = designs.filter(d => 
    d.platforms && d.stockStatus === 'in' &&
    (isPlatformUser ? d.platforms.some(p => (currentUser.permissions?.platforms || []).includes(p.name) && p.status === 'completed') : d.platforms.some(p => p.status === 'completed'))
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
      const userAssignedPlats = isPlatformUser 
        ? design.platforms.filter(p => (currentUser.permissions?.platforms || []).includes(p.name))
        : design.platforms;
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
      const userAssignedPlats = isPlatformUser 
        ? design.platforms.filter(p => (currentUser.permissions?.platforms || []).includes(p.name))
        : design.platforms;
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
        const userAssignedPlats = isPlatformUser 
          ? design.platforms.filter(p => (currentUser.permissions?.platforms || []).includes(p.name))
          : design.platforms;
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
        const userAssignedPlats = isPlatformUser 
          ? design.platforms.filter(p => (currentUser.permissions?.platforms || []).includes(p.name))
          : design.platforms;
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
