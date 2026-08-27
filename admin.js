// --- CAFE DN - Admin Panel Script ---

// පිටුව ලෝඩ් වූ වහාම ලොග් වී ඇත්දැයි සහ ෂොප් ස්ටේටස් එක බැලීම
window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn');
    const overlay = document.getElementById('loginOverlay');
    
    if (isLoggedIn !== 'true') {
        if (overlay) overlay.style.display = 'flex';
    } else {
        if (overlay) overlay.style.display = 'none';
    }
    fetchShopStatus();
});

// Admin Login වීම පරීක්ෂා කිරීම සහ සර්වර් එකට යැවීම
async function handleAdminLogin(event) {
    event.preventDefault();
    const username = document.getElementById('adminUser').value;
    const password = document.getElementById('adminPass').value;
    const errorMsg = document.getElementById('loginError');

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem('isAdminLoggedIn', 'true');
            const overlay = document.getElementById('loginOverlay');
            if (overlay) overlay.style.display = 'none';
            
            // Login වූ පසු ඉන්පුට් ෆීල්ඩ්ස් හිස් කිරීම
            document.getElementById('adminUser').value = '';
            document.getElementById('adminPass').value = '';
            if (errorMsg) errorMsg.innerText = '';
        } else {
            if (errorMsg) errorMsg.innerText = data.message || 'වැරදි Username එකක් හෝ Password එකක්!';
        }
    } catch (err) {
        if (errorMsg) errorMsg.innerText = 'සර්වර් එක සමඟ සම්බන්ධ වීමේ දෝෂයක්!';
    }
}

// 🚪 Admin Logout Function (ඇඩ්මින් පැනල් එකෙන් ඉවත් වීම)
function adminLogout() {
    if (confirm('ඔබට ඇඩ්මින් පැනල් එකෙන් ඉවත් වීමට (Logout වීමට) අවශ්‍ය බව විශ්වාසද?')) {
        localStorage.removeItem('isAdminLoggedIn');
        const overlay = document.getElementById('loginOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
        // ඉන්පුට් ෆීල්ඩ්ස් සහ එරර් මැසේජ් ක්ලියර් කිරීම
        const userInp = document.getElementById('adminUser');
        const passInp = document.getElementById('adminPass');
        const errInp = document.getElementById('loginError');
        if (userInp) userInp.value = '';
        if (passInp) passInp.value = '';
        if (errInp) errInp.innerText = '';
    }
}

// Tab මාරු කිරීමේ ක්‍රමය
function openTab(tabId, btnElement) {
    // සියලුම tab contents සඟවන්න
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // සියලුම tab buttons වලින් active ඉවත් කරන්න
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // අදාළ ටැබ් එක පෙන්වීම
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // ක්ලික් කළ බොත්තමට active ලබාදීම
    if (btnElement) {
        btnElement.classList.add('active');
    }
}

// Fetch current shop status on load
async function fetchShopStatus() {
    try {
        const response = await fetch('/api/shop-status');
        const data = await response.json();
        updateShopStatusUI(data.isOpen);
    } catch (error) {
        console.error('Error fetching shop status:', error);
    }
}

// Toggle shop status (Open / Closed)
async function toggleShopStatus() {
    const btn = document.getElementById('shopStatusBtn');
    const isOpen = btn.classList.contains('open');
    const newStatus = !isOpen; // Switch state

    try {
        const response = await fetch('/api/shop-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isOpen: newStatus })
        });
        const data = await response.json();
        updateShopStatusUI(data.isOpen);
    } catch (error) {
        console.error('Error updating shop status:', error);
    }
}

// Update UI based on status
function updateShopStatusUI(isOpen) {
    const btn = document.getElementById('shopStatusBtn');
    const dot = document.getElementById('shopStatusDot');
    const text = document.getElementById('shopStatusText');

    if (!btn || !dot || !text) return;

    if (isOpen) {
        btn.className = 'shop-status-btn open';
        dot.textContent = '🟢';
        text.textContent = 'Shop Open';
    } else {
        btn.className = 'shop-status-btn closed';
        dot.textContent = '🔴';
        text.textContent = 'Shop Closed';
    }
}