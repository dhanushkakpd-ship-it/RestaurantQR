// --- CAFE DN - Admin Panel Script ---

// පිටුව ලෝඩ් වූ වහාම ටෝකන් එක ඇත්දැයි පරීක්ෂා කිරීම
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    const overlay = document.getElementById('loginOverlay');
    
    if (token) {
        if (overlay) overlay.remove(); 
    } else {
        if (overlay) overlay.style.display = 'flex'; 
    }
    fetchShopStatus();
});

// Admin Login වීම සහ Token එක Save කරගැනීම
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

        if (response.ok && data.success && data.token) {
            // 🌟 සර්වර් එකෙන් ලැබුණු Token එක localStorage එකේ සේව් කරගන්න
            localStorage.setItem('adminToken', data.token);
            
            // පිටුව රිෆ්‍රෙෂ් කරන්න
            window.location.reload();
        } else {
            if (errorMsg) errorMsg.innerText = data.message || 'වැරදි Username එකක් හෝ Password එකක්!';
        }
    } catch (err) {
        console.error("Login Error:", err);
        if (errorMsg) errorMsg.innerText = 'සර්වර් එක සමඟ සම්බන්ධ වීමේ දෝෂයක්!';
    }
}

// 🚪 Admin Logout Function
function adminLogout() {
    if (confirm('ඔබට ඇඩ්මින් පැනල් එකෙන් ඉවත් වීමට (Logout වීමට) අවශ්‍ය බව විශ්වාසද?')) {
        // 🌟 ඉවත් වන විට Token එක මකා දමන්න
        localStorage.removeItem('adminToken');
        window.location.reload(); 
    }
}

// Tab මාරු කිරීමේ ක්‍රමය
function openTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
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

// Toggle shop status with Token
async function toggleShopStatus() {
    const btn = document.getElementById('shopStatusBtn');
    const isOpen = btn.classList.contains('open');
    const newStatus = !isOpen;
    const token = localStorage.getItem('adminToken');

    try {
        const response = await fetch('/api/shop-status', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token // 🌟 Token එක යැවීම
            },
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