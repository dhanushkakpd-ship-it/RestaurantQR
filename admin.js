// --- CAFE DN - Admin Panel Script ---

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