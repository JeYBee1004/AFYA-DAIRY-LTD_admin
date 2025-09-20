const { createClient } = window.supabase;

const supabaseUrl = 'https://nowlgjwlsaotkcniiswy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vd2xnandsc2FvdGtjbmlpc3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjQ3ODMsImV4cCI6MjA2OTgwMDc4M30.b0qzgGVWqxRIoEK485QX1pnXFqIPziG7jIr0vyj1L1U'; 

let supabaseClient;
let subscriptionChannels = []; 

(function antiInspect(window, document) {
  'use strict';

  // CONFIG: choose 'warn' or 'block' or 'log' when DevTools detected
  const ON_DETECT_ACTION = 'block'; 
  const CHECK_INTERVAL_MS = 500; 
  const SIZE_THRESHOLD = 160;

  // small helper to replace page content
  function blockPage(message) {
    try {
      document.head.innerHTML = '';
      document.body.innerHTML = `
        <div style="height:100vh;display:flex;align-items:center;justify-content:center;
                    font-family:Arial, sans-serif;text-align:center;padding:20px;">
          <div>
            <h1 style="margin:0 0 10px 0;">Access restricted</h1>
            <p style="margin:0 0 20px 0;">${message}</p>
          </div>
        </div>`;
      // optionally prevent further JS
      Object.freeze(document.body);
    } catch (e) {
      // fallback: redirect to blank page
      window.location.href = 'about:blank';
    }
  }

  // 1) Disable context menu (right-click)
  function disableContextMenu() {
    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      // optional visible feedback:
      // alert("Right-click is disabled on this page.");
      return false;
    }, { passive: false });
  }

  // 2) Disable selection and copy (optional)
  function disableSelectionAndCopy() {
    // prevent text selection and copy shortcuts
    document.addEventListener('selectstart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('copy', (e) => e.preventDefault(), { passive: false });
  }

  // 3) Disable common devtools & view-source keyboard shortcuts
  function disableDevtoolsShortcuts() {
    document.addEventListener('keydown', function (e) {
      // Normalize key name for cross-browser consistency
      const key = e.key || e.keyCode;

      // F12
      if (key === 'F12' || key === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I / J / C  (DevTools)
      if (e.ctrlKey && e.shiftKey && (key === 'I' || key === 'J' || key === 'C' || key === 'i' || key === 'j' || key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U (view-source)
      if (e.ctrlKey && (key === 'U' || key === 'u')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+K (Firefox console), Ctrl+Shift+S (some browsers)
      if (e.ctrlKey && e.shiftKey && (key === 'K' || key === 'k' || key === 'S' || key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, { passive: false });
  }

  // 4) Detect DevTools using outer/inner dimension heuristic + visibility
  function startDevtoolsDetector(onDetect) {
    let lastState = { open: false, orientation: null };

    function check() {
      const widthDiff  = Math.abs(window.outerWidth - window.innerWidth);
      const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
      const isOpen = widthDiff > SIZE_THRESHOLD || heightDiff > SIZE_THRESHOLD;

      // If devtools open state changed
      if (isOpen !== lastState.open) {
        lastState.open = isOpen;
        lastState.orientation = (widthDiff > heightDiff) ? 'vertical' : 'horizontal';
        if (isOpen) onDetect({ orientation: lastState.orientation, widthDiff, heightDiff });
      }
    }

    // also try to detect when developer tools are undocked (window.onfocus/blur sometimes helps)
    window.addEventListener('resize', check);
    window.addEventListener('focus', check);
    window.addEventListener('blur', check);

    // periodic check for browsers that don't trigger events
    const id = setInterval(check, CHECK_INTERVAL_MS);

    // return a stop function
    return function stop() {
      clearInterval(id);
      window.removeEventListener('resize', check);
      window.removeEventListener('focus', check);
      window.removeEventListener('blur', check);
    };
  }

  // 5) Action to take when DevTools detected (based on config)
  function handleDevtoolsDetected(info) {
    const msg = `Developer tools detected (${info.orientation || 'unknown'}). Page access restricted.`;
    if (ON_DETECT_ACTION === 'log') {
      console.warn(msg, info);
    } else if (ON_DETECT_ACTION === 'warn') {
      // show a banner/warn but do not remove content
      try {
        const banner = document.createElement('div');
        banner.textContent = 'Warning: Developer tools detected. Some actions may be disabled.';
        banner.style = 'position:fixed;top:0;left:0;right:0;padding:10px;text-align:center;background:#ffcc00;z-index:99999;font-family:Arial,sans-serif;';
        document.documentElement.appendChild(banner);
        setTimeout(() => banner.remove(), 5000);
      } catch (e) { /* ignore */ }
      console.warn(msg, info);
    } else {
      // block
      blockPage('Developer tools are not allowed on this page. Please close them and reload.');
      console.warn(msg, info);
    }
  }

  // Initialize everything
  function init() {
    try {
      disableContextMenu();
      disableSelectionAndCopy();
      disableDevtoolsShortcuts();
      startDevtoolsDetector(handleDevtoolsDetected);

      // defensive: detect if console opened by timing a debugger statement (best-effort & not guaranteed)
      // we won't call debugger; because it will pause script. Instead we measure console behavior:
      (function detectByConsoleTiming() {
        const start = Date.now();
        // some consoles delay or change timing of console.log; not reliable but harmless
        console.log('%c', 'font-size:1px'); // no-op
        const elapsed = Date.now() - start;
        if (elapsed > 1000) {
          handleDevtoolsDetected({ orientation: 'timing', elapsed });
        }
      }());
    } catch (e) {
      // fail silently - do not break the host page
      console.error('antiInspect init error', e);
    }
  }

  // run when DOM ready; keep robust if script is loaded late
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }

}(window, document));


function initializeSupabaseClient() {
    if (typeof window.supabase !== 'undefined') {
        try {
            supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
            console.log("Supabase client initialized successfully.");
        } catch (error) {
            console.error("Failed to initialize Supabase client:", error);
            showToast('Failed to connect to the database.', 'error');
            supabaseClient = null;
        }
    } else {
        console.error("Supabase library not found. Please ensure it is loaded.");
        showToast('Supabase library is missing.', 'error');
        supabaseClient = null;
    }
}

// 2. Global UI Functions
// -----------------------------------------------------------------------------
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-times-circle'}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const pageEl = document.getElementById(`${pageId}-page`);
    if (pageEl) pageEl.classList.add('active');
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        }
    });
    fetchAndRenderData(pageId);
    console.log(`Mapped to: ${pageId}-page`);
}

function openModal(title, bodyHtml) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.getElementById('modal-body').innerHTML = '';
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.querySelector('.main-content');
    if (!sidebar || !main) return;
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
}

function toggleUserMenu() {
    const um = document.getElementById('userMenu');
    if (!um) return;
    um.classList.toggle('show');
}

window.onclick = function(event) {
    if (!event.target.matches('.user-profile, .user-profile *')) {
        const dropdowns = document.getElementsByClassName('user-menu');
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

function switchTab(tabName, pageName) {
    document.querySelectorAll(`#${pageName}-page .tab-btn`).forEach(btn => btn.classList.remove('active'));
    const activeTabButton = document.querySelector(`#${pageName}-page .tab-btn[onclick*="${tabName}"]`);
    if (activeTabButton) {
        activeTabButton.classList.add('active');
    }
    console.log(`Switched to ${tabName} tab on ${pageName} page`);
}

// 3. User Authentication and Profile Integration
// -----------------------------------------------------------------------------
// unchanged except safe supabaseClient checks
async function fetchUserProfile() {
    if (!supabaseClient) {
        console.error("Supabase client not available.");
        return;
    }
    try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError) {
            console.error('Error fetching user:', userError);
            showToast('Authentication error.', 'error');
            window.location.href = 'index.html'; // Redirect to login page
            return;
        }

        if (user) {
            const { data: profile, error: profileError } = await supabaseClient
                .from('staff_info')
                .select('name, role, email')
                .eq('email', user.email)
                .single();

            if (profileError) {
                console.error('Error fetching user profile:', profileError);
                return;
            }

            const userNameEl = document.getElementById('user-name-display');
            const userRoleEl = document.getElementById('user-role-display');
            const profileName = document.getElementById('profile-name');
            const profileEmail = document.getElementById('profile-email');
            const profileRole = document.getElementById('profile-role');

            if (userNameEl) userNameEl.textContent = profile.name;
            if (userRoleEl) userRoleEl.textContent = profile.role;
            if (profileName) profileName.textContent = profile.name;
            if (profileEmail) profileEmail.textContent = profile.email;
            if (profileRole) profileRole.textContent = profile.role;
        } else {
            console.log("No user logged in. Redirecting...");
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error('Authentication check failed:', err);
    }
}

async function logout() {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        showToast('Error logging out.', 'error');
        console.error('Logout error:', error);
    } else {
        showToast('Logged out successfully!');
        // Clear all subscriptions
        subscriptionChannels.forEach(channel => {
            try {
                supabaseClient.removeChannel(channel);
            } catch (e) { /* ignore */ }
        });
        subscriptionChannels = [];
        window.location.href = 'index.html'; // Redirect to login page
    }
}

function showProfile() {
    showPage('profile');
    const um = document.getElementById('userMenu');
    if (um) um.classList.remove('show');
}

// 4. Data Fetching, Real-time Updates, and Dashboard Update
// -----------------------------------------------------------------------------
// fetchAndRenderData will accept optional pageId and keep calls safe
async function fetchAndRenderData(pageId = 'dashboard') {
    if (!supabaseClient) {
        console.error("Supabase client not available for fetchAndRenderData.");
        return;
    }
    await updateDashboardKPIs();
    await fetchAndRenderLivestock();
    await fetchAndRenderProduction();
    await fetchAndRenderFeeding();
    await fetchAndRenderHealth();
    await fetchAndRenderStaff();
    await fetchAndRenderActivities();
    await setupProductionChart();
    
    // Setup real-time subscriptions only once
    if (subscriptionChannels.length === 0) {
        setupRealtimeSubscriptions();
    }
}

async function updateDashboardKPIs() {
    if (!supabaseClient) return;
    try {
        const today = new Date().toISOString().slice(0, 10);

        const { data: cows, error: cowError } = await supabaseClient
            .from('cow_info')
            .select('*');

        const { data: productionData, error: productionError } = await supabaseClient
            .from('milk_production')
            .select('quantity')
            .eq('date', today);

        const { data: staffData, count: staffCount, error: staffError } = await supabaseClient
            .from('staff_info')
            .select('*', { count: 'exact' });

        if (cowError || productionError || staffError) {
            console.error('Error fetching dashboard KPIs:', cowError || productionError || staffError);
            return;
        }

        const cowsArray = Array.isArray(cows) ? cows : [];
        const healthyCount = cowsArray.filter(c => (c.status || '').toLowerCase() === 'healthy').length;
        const treatmentCount = cowsArray.filter(c => (c.status || '').toLowerCase() === 'treatment').length;
        const quarantineCount = cowsArray.filter(c => (c.status || '').toLowerCase() === 'quarantine').length;

        const totalLivestockEl = document.getElementById('total-livestock');
        if (totalLivestockEl) totalLivestockEl.innerText = cowsArray.length;

        const healthyEl = document.getElementById('healthy-cows');
        if (healthyEl) healthyEl.innerText = healthyCount;

        const treatmentEl = document.getElementById('treatment-cows');
        if (treatmentEl) treatmentEl.innerText = treatmentCount;

        const quarantineEl = document.getElementById('quarantine-cows');
        if (quarantineEl) quarantineEl.innerText = quarantineCount;

        const productionArr = Array.isArray(productionData) ? productionData : [];
        const totalProduction = productionArr.reduce((sum, record) => sum + (Number(record.quantity) || 0), 0);
        const dailyProductionEl = document.getElementById('daily-production');
        if (dailyProductionEl) dailyProductionEl.innerText = `${totalProduction.toFixed(1)}L`;

        const totalStaffEl = document.getElementById('total-staff');
        if (totalStaffEl) {
            // staffCount might be undefined; fallback to data length
            if (typeof staffCount === 'number') totalStaffEl.innerText = staffCount;
            else totalStaffEl.innerText = (Array.isArray(staffData) ? staffData.length : 0);
        }
    } catch (err) {
        console.error('updateDashboardKPIs error:', err);
    }
}

function setupRealtimeSubscriptions() {
    if (!supabaseClient) return;
    try {
        const channel = supabaseClient.channel('realtime_updates')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                console.log('Realtime update received:', payload);
                // re-render current page data
                const activePage = document.querySelector('.page.active');
                const pageId = activePage ? activePage.id.replace('-page', '') : 'dashboard';
                fetchAndRenderData(pageId);
            })
            .subscribe();

        subscriptionChannels.push(channel);
    } catch (err) {
        console.error('Failed to setup realtime subscriptions:', err);
    }
}

// 5. Form Modals & 6. Data Submission
// -----------------------------------------------------------------------------
// Livestock
function openLivestockModal() {
    const formHtml = `
        <form id="livestock-form">
            <div class="form-group">
                <label for="cow-name">Cow Name</label>
                <input type="text" id="cow-name" required>
            </div>
            <div class="form-group">
                <label for="cow-id">Cow ID</label>
                <input type="text" id="cow-id" required>
            </div>
            <div class="form-group">
                <label for="cow-breed">Breed</label>
                <input type="text" id="cow-breed" required>
            </div>
            <div class="form-group">
                <label for="cow-status">Status</label>
                <select id="cow-status" required>
                    <option value="Healthy">Healthy</option>
                    <option value="Lactating">Lactating</option>
                    <option value="Pregnant">Pregnant</option>
                    <option value="Sick">Sick</option>
                </select>
            </div>
            <div class="form-group">
                <label for="cow-birth-date">Birth Date</label>
                <input type="date" id="cow-birth-date" required>
            </div>
            <div class="form-group">
                <label for="cow-weight">Weight (kg)</label>
                <input type="number" id="cow-weight" required min="0">
            </div>
            <div class="form-group">
                <label for="cow-notes">Notes</label>
                <textarea id="cow-notes"></textarea>
            </div>
            <div class="modal-footer" id="modal-footer">
                <button type="submit" class="btn-primary">Save</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    openModal('Add New Livestock', formHtml);
    const form = document.getElementById('livestock-form');
    if (form) form.addEventListener('submit', handleLivestockSubmit);
}
async function handleLivestockSubmit(event) {
    event.preventDefault();
    if (!supabaseClient) {
        showToast('Database not connected.', 'error');
        return;
    }
    const newCow = {
        id: document.getElementById('cow-id').value,
        name: document.getElementById('cow-name').value,
        breed: document.getElementById('cow-breed').value,
        birth_date: document.getElementById('cow-birth-date').value,
        weight: parseFloat(document.getElementById('cow-weight').value) || 0,
        status: document.getElementById('cow-status').value,
        notes: document.getElementById('cow-notes').value || null,
    };
    try {
        const { error } = await supabaseClient.from('cow_info').insert([newCow]);
        if (error) {
            showToast('Error adding livestock. Please try again.', 'error');
            console.error('Error adding livestock:', error);
        } else {
            showToast('Livestock added successfully!');
            closeModal();
            await fetchAndRenderLivestock();
            await updateDashboardKPIs();
        }
    } catch (err) {
        console.error('handleLivestockSubmit error:', err);
        showToast('Error adding livestock. Check console.', 'error');
    }
}

// Production (milk)
function openProductionModal() {
    const formHtml = `
        <form id="production-form">
            <div class="form-group">
                <label for="prod-cow-id">Cow ID</label>
                <input type="text" id="prod-cow-id" placeholder="e.g., C-001" required>
            </div>
            <div class="form-group">
                <label for="prod-quantity">Quantity (L)</label>
                <input type="number" id="prod-quantity" step="0.1" required min="0">
            </div>
            <div class="form-group">
                <label for="prod-date">Date</label>
                <input type="date" id="prod-date" value="${new Date().toISOString().slice(0, 10)}" required>
            </div>
            <div class="form-group">
                <label for="milking-time">Milking Time</label>
                <select id="milking-time" required>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                </select>
            </div>
            <div class="form-group">
                <label for="prod-note">Note</label>
                <textarea id="prod-note"></textarea>
            </div>
            <div class="modal-footer" id="modal-footer">
                <button type="submit" class="btn-primary">Save</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    openModal('Record Milk Production', formHtml);
    const form = document.getElementById('production-form');
    if (form) form.addEventListener('submit', handleProductionSubmit);
}
async function handleProductionSubmit(event) {
    event.preventDefault();
    if (!supabaseClient) {
        showToast('Database not connected.', 'error');
        return;
    }
    const newProduction = {
        cow_id: document.getElementById('prod-cow-id').value,
        quantity: parseFloat(document.getElementById('prod-quantity').value) || 0,
        date: document.getElementById('prod-date').value,
        milking_time: document.getElementById('milking-time').value,
        notes: document.getElementById('prod-note').value || null,
    };
    try {
        const { error } = await supabaseClient.from('milk_production').insert([newProduction]);
        if (error) {
            showToast('Error recording production. Please try again.', 'error');
            console.error('Error recording production:', error);
        } else {
            showToast('Production record saved!');
            closeModal();
            await fetchAndRenderProduction();
            await updateDashboardKPIs();
            await setupProductionChart();
        }
    } catch (err) {
        console.error('handleProductionSubmit error:', err);
        showToast('Error saving production. Check console.', 'error');
    }
}

// Feeding
function openFeedingModal() {
    const formHtml = `
        <form id="feeding-form">
            <div class="form-group">
                <label for="feed-cow-id">Cow ID</label>
                <input type="text" id="feed-cow-id" placeholder="e.g., C-001" required>
            </div>
            <div class="form-group">
                <label for="feed-type">Feed Type</label>
                <select id="feed-type" required>
                    <option value="Hay">Hay</option>
                    <option value="Concentrate">Concentrate</option>
                    <option value="Silage">Silage</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label for="feed-name">Feed Name</label>
                <input type="text" id="feed-name">
            </div>
            <div class="form-group">
                <label for="feed-quantity">Quantity (kg)</label>
                <input type="number" id="feed-quantity" step="0.1" required min="0">
            </div>
            <div class="form-group">
                <label for="feed-date">Date</label>
                <input type="date" id="feed-date" value="${new Date().toISOString().slice(0, 10)}" required>
            </div>
            <div class="form-group">
                <label for="time-period">Time Period</label>
                <select id="time-period" required>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                </select>
            </div>
            <div class="form-group">
                <label for="feed-notes">Notes</label>
                <textarea id="feed-notes"></textarea>
            </div>
            <div class="modal-footer" id="modal-footer">
                <button type="submit" class="btn-primary">Save</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    openModal('Record Feeding', formHtml);
    const form = document.getElementById('feeding-form');
    if (form) form.addEventListener('submit', handleFeedingSubmit);
}
async function handleFeedingSubmit(event) {
    event.preventDefault();
    if (!supabaseClient) {
        showToast('Database not connected.', 'error');
        return;
    }
    const newFeeding = {
        cow_id: document.getElementById('feed-cow-id').value,
        feed_type: document.getElementById('feed-type').value,
        feed_name: document.getElementById('feed-name').value || null,
        quantity: parseFloat(document.getElementById('feed-quantity').value) || 0,
        date: document.getElementById('feed-date').value,
        time_period: document.getElementById('time-period').value,
        notes: document.getElementById('feed-notes').value || null,
    };
    try {
        const { error } = await supabaseClient.from('feeding_records').insert([newFeeding]);
        if (error) {
            showToast('Error recording feeding. Please try again.', 'error');
            console.error('Error recording feeding:', error);
        } else {
            showToast('Feeding record saved!');
            closeModal();
            await fetchAndRenderFeeding();
        }
    } catch (err) {
        console.error('handleFeedingSubmit error:', err);
        showToast('Error saving feeding. Check console.', 'error');
    }
}

// Health
function openHealthModal() {
    const formHtml = `
        <form id="health-form">
            <div class="form-group">
                <label for="health-cow-id">Cow ID</label>
                <input type="text" id="health-cow-id" placeholder="e.g., C-001" required>
            </div>
            <div class="form-group">
                <label for="health-status">Status</label>
                <select id="health-status" required>
                    <option value="Healthy">Healthy</option>
                    <option value="Treatment">Treatment</option>
                    <option value="Quarantine">Quarantine</option>
                    <option value="Deceased">Deceased</option>
                </select>
            </div>
            <div class="form-group">
                <label for="health-date">Date</label>
                <input type="date" id="health-date" value="${new Date().toISOString().slice(0, 10)}" required>
            </div>
            <div class="form-group">
                <label for="health-symptoms">Symptoms</label>
                <input type="text" id="health-symptoms">
            </div>
            <div class="form-group">
                <label for="health-treatment">Treatment</label>
                <input type="text" id="health-treatment">
            </div>
            <div class="form-group">
                <label for="health-vet">Veterinarian</label>
                <input type="text" id="health-vet">
            </div>
            <div class="form-group">
                <label for="health-notes">Notes</label>
                <textarea id="health-notes"></textarea>
            </div>
            <div class="modal-footer" id="modal-footer">
                <button type="submit" class="btn-primary">Save</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    openModal('Add Health Record', formHtml);
    const form = document.getElementById('health-form');
    if (form) form.addEventListener('submit', handleHealthSubmit);
}
async function handleHealthSubmit(event) {
    event.preventDefault();
    if (!supabaseClient) {
        showToast('Database not connected.', 'error');
        return;
    }
    const newHealth = {
        cow_id: document.getElementById('health-cow-id').value,
        health_status: document.getElementById('health-status').value,
        date: document.getElementById('health-date').value,
        symptoms: document.getElementById('health-symptoms').value || null,
        treatment: document.getElementById('health-treatment').value || null,
        veterinarian: document.getElementById('health-vet').value || null,
        notes: document.getElementById('health-notes').value || null,
    };
    try {
        const { error } = await supabaseClient.from('health_records').insert([newHealth]);
        if (error) {
            showToast('Error adding health record. Please try again.', 'error');
            console.error('Error adding health record:', error);
        } else {
            showToast('Health record saved!');
            closeModal();
            await fetchAndRenderHealth();
            await fetchAndRenderLivestock();
            await updateDashboardKPIs();
        }
    } catch (err) {
        console.error('handleHealthSubmit error:', err);
        showToast('Error saving health record. Check console.', 'error');
    }
}

// Staff
function openStaffModal() {
    const formHtml = `
        <form id="staff-form">
            <div class="form-group">
                <label for="staff-name">Full Name</label>
                <input type="text" id="staff-name" required>
            </div>
            <div class="form-group">
                <label for="staff-email">Email</label>
                <input type="email" id="staff-email" required>
            </div>
            <div class="form-group">
                <label for="staff-phone">Phone Number</label>
                <input type="tel" id="staff-phone">
            </div>
            <div class="form-group">
                <label for="staff-role">Role</label>
                <select id="staff-role" required>
                    <option value="Administrator">Administrator</option>
                    <option value="Herdsman">Herdsman</option>
                    <option value="Veterinarian">Veterinarian</option>
                    <option value="General Staff">General Staff</option>
                </select>
            </div>
            <div class="form-group">
                <label for="staff-department">Department</label>
                <input type="text" id="staff-department">
            </div>
            <div class="form-group">
                <label for="staff-start-date">Start Date</label>
                <input type="date" id="staff-start-date">
            </div>
            <div class="modal-footer">
                <button type="submit" class="btn-primary">Save</button>
                <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    openModal('Add New Staff Member', formHtml);
    const form = document.getElementById('staff-form');
    if (form) form.addEventListener('submit', handleStaffSubmit);
}
async function handleStaffSubmit(event) {
    event.preventDefault();
    if (!supabaseClient) {
        showToast('Database not connected.', 'error');
        return;
    }
    const newStaff = {
        name: document.getElementById('staff-name').value,
        email: document.getElementById('staff-email').value,
        phone: document.getElementById('staff-phone').value || null,
        role: document.getElementById('staff-role').value,
        department: document.getElementById('staff-department').value || null,
        start_date: document.getElementById('staff-start-date').value || null,
    };
    try {
        const { error } = await supabaseClient.from('staff_info').insert([newStaff]);
        if (error) {
            showToast('Error adding staff member. Please try again.', 'error');
            console.error('Error adding staff member:', error);
        } else {
            showToast('Staff member added successfully!');
            closeModal();
            await fetchAndRenderStaff();
            await updateDashboardKPIs();
        }
    } catch (err) {
        console.error('handleStaffSubmit error:', err);
        showToast('Error saving staff. Check console.', 'error');
    }
}

// 7. Data Rendering (Tables & Cards)
// -----------------------------------------------------------------------------
// Livestock
async function fetchAndRenderLivestock() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('cow_info').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching livestock:', error);
            return;
        }
        const tbody = document.getElementById('livestock-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        (data || []).forEach(cow => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cow.id || ''}</td>
                <td>${cow.name || ''}</td>
                <td>${cow.breed || ''}</td>
                <td><span class="status ${String(cow.status || '').toLowerCase()}">${cow.status || ''}</span></td>
                <td>${cow.birth_date ? new Date(cow.birth_date).toLocaleDateString() : 'N/A'}</td>
                <td>${cow.weight != null ? `${cow.weight} kg` : 'N/A'}</td>
                <td>${cow.acquisition_date ? new Date(cow.acquisition_date).toLocaleDateString() : 'N/A'}</td>
                <td>${cow.notes || 'N/A'}</td>
                <td>
                    <button class="btn-icon delete-btn" onclick="deleteRecord('cow_info', '${cow.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('fetchAndRenderLivestock error:', err);
    }
}

// Production (support optional time filter)
async function fetchAndRenderProduction(filterTime = null) {
    if (!supabaseClient) return;
    try {
        let query = supabaseClient.from('milk_production').select('*').order('created_at', { ascending: false });
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching production records:', error);
            return;
        }
        const tbody = document.getElementById('production-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        (data || []).filter(record => {
            if (!filterTime) return true;
            return (record.milking_time || '').toLowerCase() === filterTime.toLowerCase();
        }).forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.id || ''}</td>
                <td>${record.cow_id || ''}</td>
                <td>${record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</td>
                <td>${record.milking_time || 'N/A'}</td>
                <td>${record.quantity != null ? `${record.quantity} L` : 'N/A'}</td>
                <td>${record.notes || 'N/A'}</td>
                <td>
                    <button class="btn-icon delete-btn" onclick="deleteRecord('milk_production', '${record.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('fetchAndRenderProduction error:', err);
    }
}

// Feeding (support optional time filter)
async function fetchAndRenderFeeding(filterTime = null) {
    if (!supabaseClient) return;
    try {
        let query = supabaseClient.from('feeding_records').select('*').order('created_at', { ascending: false });
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching feeding records:', error);
            return;
        }
        const tbody = document.getElementById('feeding-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        (data || []).filter(record => {
            if (!filterTime) return true;
            return (record.time_period || '').toLowerCase() === filterTime.toLowerCase();
        }).forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.id || ''}</td>
                <td>${record.cow_id || ''}</td>
                <td>${record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</td>
                <td>${record.time_period || 'N/A'}</td>
                <td>${record.feed_type || 'N/A'}</td>
                <td>${record.feed_name || 'N/A'}</td>
                <td>${record.quantity != null ? `${record.quantity} kg` : 'N/A'}</td>
                <td>${record.notes || 'N/A'}</td>
                <td>
                    <button class="btn-icon delete-btn" onclick="deleteRecord('feeding_records', '${record.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('fetchAndRenderFeeding error:', err);
    }
}

// Health
async function fetchAndRenderHealth() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('health_records').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching health records:', error);
            return;
        }
        const tbody = document.getElementById('health-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        (data || []).forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.id || ''}</td>
                <td>${record.cow_id || ''}</td>
                <td>${record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</td>
                <td><span class="status ${String(record.health_status || '').toLowerCase()}">${record.health_status || ''}</span></td>
                <td>${record.symptoms || 'N/A'}</td>
                <td>${record.treatment || 'N/A'}</td>
                <td>${record.veterinarian || 'N/A'}</td>
                <td>${record.notes || 'N/A'}</td>
                <td>
                    <button class="btn-icon delete-btn" onclick="deleteRecord('health_records', '${record.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (err) {
        console.error('fetchAndRenderHealth error:', err);
    }
}

// Staff
async function fetchAndRenderStaff() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('staff_info').select('*').order('name', { ascending: true });
        if (error) {
            console.error('Error fetching staff records:', error);
            return;
        }
        const staffGrid = document.getElementById('staff-grid');
        if (!staffGrid) return;
        staffGrid.innerHTML = '';
        (data || []).forEach(staff => {
            const card = document.createElement('div');
            card.className = 'staff-card';
            card.innerHTML = `
                <div class="staff-avatar"><i class="fas fa-user-tie"></i></div>
                <div class="staff-info">
                    <h4>${staff.name || ''}</h4>
                    <p class="staff-role">${staff.role || ''}</p>
                    <p class="staff-contact"><i class="fas fa-envelope"></i> ${staff.email || 'N/A'}</p>
                    <p class="staff-contact"><i class="fas fa-phone"></i> ${staff.phone || 'N/A'}</p>
                </div>
                <button class="btn-icon delete-btn" onclick="deleteRecord('staff_info', '${staff.id}')"><i class="fas fa-trash"></i></button>
            `;
            staffGrid.appendChild(card);
        });
    } catch (err) {
        console.error('fetchAndRenderStaff error:', err);
    }
}

// Activities
async function fetchAndRenderActivities() {
    if (!supabaseClient) return;
    try {
        const { data: cows, error: cowError } = await supabaseClient.from('cow_info').select('id, name, created_at').order('created_at', { ascending: false }).limit(3);
        const { data: production, error: prodError } = await supabaseClient.from('milk_production').select('id, cow_id, quantity, created_at').order('created_at', { ascending: false }).limit(3);
        const { data: health, error: healthError } = await supabaseClient.from('health_records').select('id, cow_id, health_status, created_at').order('created_at', { ascending: false }).limit(3);

        if (cowError || prodError || healthError) {
            console.error('Error fetching activities:', cowError || prodError || healthError);
            return;
        }

        let activities = [];
        (cows || []).forEach(c => activities.push({
            type: 'New Cow',
            description: `Registered new cow "${c.name}" (ID: ${c.id})`,
            timestamp: new Date(c.created_at)
        }));
        (production || []).forEach(p => activities.push({
            type: 'Production',
            description: `Recorded ${p.quantity}L of milk for cow ID: ${p.cow_id}`,
            timestamp: new Date(p.created_at)
        }));
        (health || []).forEach(h => activities.push({
            type: 'Health Record',
            description: `Updated health status for cow ID: ${h.cow_id} to "${h.health_status}"`,
            timestamp: new Date(h.created_at)
        }));

        activities.sort((a, b) => b.timestamp - a.timestamp);

        const activitiesList = document.getElementById('activities-list');
        if (!activitiesList) return;
        activitiesList.innerHTML = '';
        activities.slice(0, 5).forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon"><i class="fas fa-info-circle"></i></div>
                <div class="activity-details">
                    <span class="activity-type">${activity.type}</span>
                    <span class="activity-description">${activity.description}</span>
                    <span class="activity-time">${activity.timestamp.toLocaleString()}</span>
                </div>
            `;
            activitiesList.appendChild(activityItem);
        });
    } catch (err) {
        console.error('fetchAndRenderActivities error:', err);
    }
}

// 8. Data Deletion
// ----------------------------------------------------------------------------- 
async function deleteRecord(tableName, recordId) {
    if (!supabaseClient) {
        showToast('Database not connected.', 'error');
        return;
    }
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    try {
        const { error } = await supabaseClient
            .from(tableName)
            .delete()
            .eq('id', recordId);
        if (error) {
            showToast('Error deleting record. Please try again.', 'error');
            console.error('Error deleting record:', error);
        } else {
            showToast('Record deleted successfully!');
            // Refresh relevant sections
            if (tableName === 'cow_info') await fetchAndRenderLivestock();
            if (tableName === 'milk_production') {
                await fetchAndRenderProduction();
                await updateDashboardKPIs();
                await setupProductionChart();
            }
            if (tableName === 'feeding_records') await fetchAndRenderFeeding();
            if (tableName === 'health_records') {
                await fetchAndRenderHealth();
                await fetchAndRenderLivestock();
                await updateDashboardKPIs();
            }
            if (tableName === 'staff_info') {
                await fetchAndRenderStaff();
                await updateDashboardKPIs();
            }
        }
    } catch (err) {
        console.error('deleteRecord error:', err);
        showToast('Error deleting record. Check console.', 'error');
    }
}

// 9. Chart.js Configuration
// ----------------------------------------------------------------------------- 
let productionChart;
async function setupProductionChart() {
    if (!supabaseClient) return;
    try {
        const { data: productionData, error } = await supabaseClient
            .from('milk_production')
            .select('date, quantity')
            .order('date', { ascending: true });

        if (error) {
            console.error('Error fetching production data for chart:', error);
            return;
        }

        const dailyProduction = {};
        (productionData || []).forEach(record => {
            const date = record.date ? new Date(record.date).toLocaleDateString() : 'Unknown';
            dailyProduction[date] = (dailyProduction[date] || 0) + (Number(record.quantity) || 0);
        });

        const labels = Object.keys(dailyProduction);
        const data = Object.values(dailyProduction);

        const ctxEl = document.getElementById('production-chart');
        if (!ctxEl) return;
        const ctx = ctxEl.getContext('2d');
        if (productionChart) {
            productionChart.destroy();
        }
        productionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Milk Production (L)',
                    data: data,
                    borderColor: '#1e75ff',
                    backgroundColor: 'rgba(30, 117, 255, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Quantity (L)' }
                    },
                    x: {
                        title: { display: true, text: 'Date' }
                    }
                }
            }
        });
    } catch (err) {
        console.error('setupProductionChart error:', err);
    }
}

// 10. Filtering helpers for production/feeding buttons
// -----------------------------------------------------------------------------
// Use buttons with classes "production-filter-btn" and "feeding-filter-btn" and set data-time="Morning"| "Afternoon"| "Evening" or "All"
function setupFilterButtons() {
    // Production filter buttons
    document.querySelectorAll('.production-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const time = btn.dataset.time || null;
            // update active state
            document.querySelectorAll('.production-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fetchAndRenderProduction(time && time !== 'All' ? time : null);
        });
    });

    // Feeding filter buttons
    document.querySelectorAll('.feeding-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const time = btn.dataset.time || null;
            document.querySelectorAll('.feeding-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fetchAndRenderFeeding(time && time !== 'All' ? time : null);
        });
    });
}

// 11. Initial Load
// ----------------------------------------------------------------------------- 
document.addEventListener('DOMContentLoaded', async () => {
    initializeSupabaseClient();
    
    // Add event listeners for sidebar navigation
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.getAttribute('data-page');
            showPage(pageId);
        });
    });

    // Add event listeners for "Add" buttons (defensive)
    const livestockBtn = document.getElementById('livestock-add-btn');
    if (livestockBtn) livestockBtn.addEventListener('click', openLivestockModal);

    const productionBtn = document.getElementById('production-add-btn');
    if (productionBtn) productionBtn.addEventListener('click', openProductionModal);

    const feedingBtn = document.getElementById('feeding-add-btn');
    if (feedingBtn) feedingBtn.addEventListener('click', openFeedingModal);

    const healthBtn = document.getElementById('health-add-btn');
    if (healthBtn) healthBtn.addEventListener('click', openHealthModal);

    const staffBtn = document.getElementById('staff-add-btn');
    if (staffBtn) staffBtn.addEventListener('click', openStaffModal);

    // Setup filter buttons (production / feeding)
    setupFilterButtons();

    // Initial data fetch and render
    await fetchUserProfile();
    await fetchAndRenderData('dashboard');

    console.log("Admin dashboard loaded successfully.");
});



