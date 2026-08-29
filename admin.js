// --- CAFE DN - Admin Panel Script ---

// පිටුව ලෝඩ් වූ වහාම ලොග් වී ඇත්දැයි සහ ෂොප් ස්ටේටස් එක බැලීම
window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn');
    const overlay = document.getElementById('loginOverlay');
    
    if (isLoggedIn === 'true') {
        if (overlay) overlay.remove(); // මීට පෙර ලොග් වී ඇත්නම් ෆෝම් එක ඉවත් කරන්න
    } else {
        if (overlay) overlay.style.display = 'flex'; // ලොග් වී නැත්නම් ලොගින් ෆෝම් එක පෙන්වන්න
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
        console.log("Server Response:", data);

        // සර්වර් එක සාර්ථකයි නම්
        if (response.ok && (data.success === true || data.success === undefined || data.token)) {
            // 1. ලොග් වූ බව localStorage හි සටහන් කරන්න
            localStorage.setItem('isAdminLoggedIn', 'true');
            
            // 2. වහාම පිටුව ස්වයංක්‍රීයව රිෆ්‍රෙෂ් කරන්න (මෙය මඟින් ලොගින් ෆෝම් එක තනියම අപ്രത്യక్ష වී ඩෑෂ්බෝඩ් එක පෙන්වයි)
            window.location.reload();
        } else {
            if (errorMsg) errorMsg.innerText = data.message || 'වැරදි Username එකක් හෝ Password එකක්!';
        }
    } catch (err) {
        console.error("Login Error:", err);
        if (errorMsg) errorMsg.innerText = 'සර්වර් එක සමඟ සම්බන්ධ වීමේ දෝෂයක්!';
    }
}

// 🚪 Admin Logout Function (ඇඩ්මින් පැනල් එකෙන් ඉවත් වීම)
function adminLogout() {
    if (confirm('ඔබට ඇඩ්මින් පැනල් එකෙන් ඉවත් වීමට (Logout වීමට) අවශ්‍ය බව විශ්වාසද?')) {
        localStorage.removeItem('isAdminLoggedIn');
        // පිටුව රිෆ්‍රෙෂ් කළ විට නැවත ලොගින් ෆෝම් එක මතුවනු ඇත
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

// Toggle shop status (Open / Closed)
async function toggleShopStatus() {
    const btn = document.getElementById('shopStatusBtn');
    const isOpen = btn.classList.contains('open');
    const newStatus = !isOpen;

    try {
        const response = await fetch('/api/shop-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isOpen: newStatus })
        });
        const data = await response.json();
        updateShopStatusUI(data.isOpen);
    } catch (error) {
        console.error('Error updating shop status:', error); // දෝෂය මෙතැනදී නිවැරදි කර ඇත
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