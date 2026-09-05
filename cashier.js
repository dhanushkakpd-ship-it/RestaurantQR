// --- CAFE DN - Cashier Billing Panel (Complete JS with Tabs) ---

let allOrders = [];
let currentCashierTab = 'unpaid'; // මුලින්ම පෙන්වන්නේ Unpaid ටැබ් එකයි

document.addEventListener('DOMContentLoaded', () => {
    startClock();
    fetchOrdersForCashier();
    
    // තත්පර 2කට වරක් අලුත් Orders ඇවිත්දැයි බැලීම
    setInterval(fetchOrdersForCashier, 2000);
});

// Live Digital Clock
function startClock() {
    setInterval(() => {
        const now = new Date();
        const clockEl = document.getElementById('cashier-clock');
        if (clockEl) clockEl.innerText = now.toLocaleTimeString();
    }, 1000);
}

// Server එකෙන් සියලුම Orders ලබා ගැනීම
function fetchOrdersForCashier() {
    fetch('/api/orders')
        .then(res => res.json())
        .then(data => {
            allOrders = data || [];
            updateTabCounts();
            renderCashierTickets();
        })
        .catch(err => console.error("Error fetching cashier orders:", err));
}

// ටැබ් මාරු කිරීමේ කාර්යය
function switchCashierTab(tabName) {
    currentCashierTab = tabName;
    
    const unpaidBtn = document.getElementById('tab-unpaid-btn');
    const paidBtn = document.getElementById('tab-paid-btn');

    if (tabName === 'unpaid') {
        unpaidBtn.style.background = '#3b82f6';
        unpaidBtn.style.color = 'white';
        paidBtn.style.background = '#e2e8f0';
        paidBtn.style.color = '#475569';
    } else {
        paidBtn.style.background = '#22c55e';
        paidBtn.style.color = 'white';
        unpaidBtn.style.background = '#e2e8f0';
        unpaidBtn.style.color = '#475569';
    }

    renderCashierTickets();
}

// ටැබ් වල ඔර්ඩර් ගණන යාවත්කාලීන කිරීම
function updateTabCounts() {
    const unpaidList = allOrders.filter(o => {
        let status = (o.status || '').toLowerCase();
        let paymentStatus = (o.paymentStatus || '').toLowerCase();
        return status === 'completed' && paymentStatus !== 'paid';
    });

    const paidList = allOrders.filter(o => {
        let paymentStatus = (o.paymentStatus || '').toLowerCase();
        return paymentStatus === 'paid';
    });

    const unpaidCountEl = document.getElementById('unpaid-count');
    const paidCountEl = document.getElementById('paid-count');

    if (unpaidCountEl) unpaidCountEl.innerText = unpaidList.length;
    if (paidCountEl) paidCountEl.innerText = paidList.length;
}

// Render Cashier Order Tickets based on Active Tab
function renderCashierTickets() {
    const container = document.getElementById('cashier-tickets-grid');
    if (!container) return;

    // වත්මන් ටැබ් එකට අදාළ ඔර්ඩර්ස් පමණක් ෆිල්ටර් කිරීම
    let displayOrders = allOrders.filter(o => {
        let status = (o.status || '').toLowerCase();
        let paymentStatus = (o.paymentStatus || '').toLowerCase();

        if (currentCashierTab === 'unpaid') {
            return status === 'completed' && paymentStatus !== 'paid';
        } else {
            return paymentStatus === 'paid';
        }
    });

    updateTabCounts();

    if (displayOrders.length === 0) {
        let msg = currentCashierTab === 'unpaid' 
            ? "✅ මුදල් අය කර ගැනීමට බිල්පත් කිසිවක් නොමැත (No Unpaid Orders)" 
            : "📭 ගෙවීම් කළ බිල්පත් කිසිවක් හමු නොවීය (No Paid Orders)";
        
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 50px;">
            <h3>${msg}</h3>
        </div>`;
        return;
    }

    container.innerHTML = displayOrders.map(order => {
        let orderTypeBadge = order.type || 'Dine-in';
        let badgeColorBg = orderTypeBadge.toLowerCase().includes('takeaway') ? '#ee2266' : '#e0f2fe';
        let badgeColorText = orderTypeBadge.toLowerCase().includes('takeaway') ? '#e7e7dd' : '#0284c7';

        let tableInfoHtml = '';
        if (order.table && order.table !== 'N/A' && order.table.trim() !== '') {
            let cleanTableText = order.table.trim();
            if (cleanTableText.includes('(')) {
                cleanTableText = cleanTableText.split('(')[0].trim();
            }
            let lowerTable = cleanTableText.toLowerCase();
            if (lowerTable === 'takeaway' || lowerTable === 'dine-in' || lowerTable === 'outside') {
                tableInfoHtml = `<span style="background: #e2e8f0; color: #475569; padding: 3px 10px; border-radius: 6px; font-weight: bold; font-size: 0.95rem;">🌐 Outside</span>`;
            } else {
                let cleanTable = lowerTable.includes('table') ? cleanTableText : `Table ${cleanTableText}`;
                tableInfoHtml = `<span style="background: #fef08a; color: #854d0e; padding: 3px 10px; border-radius: 6px; font-weight: bold; font-size: 0.95rem;">📍 ${cleanTable}</span>`;
            }
        } else {
            tableInfoHtml = `<span style="background: #e2e8f0; color: #475569; padding: 3px 10px; border-radius: 6px; font-weight: bold; font-size: 0.95rem;">🌐 Outside</span>`;
        }

        let subtotal = 0;
        if (order.items && Array.isArray(order.items)) {
            subtotal = order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 1)), 0);
        }
        
        let takeawayCharge = Number(order.takeawayCharge || order.packagingCharge || 0);
        let totalAmount = subtotal + takeawayCharge;
        let isPaid = (order.paymentStatus || '').toLowerCase() === 'paid';

        return `
            <div class="ticket-card ready" style="border-top: 4px solid ${isPaid ? '#22c55e' : '#f59e0b'};">
                <div class="ticket-header">
                    <span class="order-id">${order.id}</span>
                    <span style="background: ${badgeColorBg}; color: ${badgeColorText}; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">
                        ${orderTypeBadge}
                    </span>
                </div>

                <div class="ticket-info" style="margin: 8px 0; background: #0f172a; padding: 10px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 5px; margin-bottom: 6px;">
                        <div style="color: #38bdf8; font-weight: bold; font-size: 0.95rem;">
                            👤 ${order.customerName || 'Guest'}
                        </div>
                        ${tableInfoHtml}
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem; color: #cbd5e1;">
                        ${order.phone ? `<div>📱 දුරකථන: <a href="tel:${order.phone}" style="color: #4ade80; text-decoration: none; font-weight: bold;">${order.phone}</a></div>` : ''}
                        ${order.pickupTime ? `<div>🕒 Pickup Time: <span style="color: #facc15; font-weight: bold;">${order.pickupTime}</span></div>` : ''}
                        ${order.time ? `<div>⏰ ඇණවුම් කළ වේලාව: <span style="color: #94a3b8;">${order.time}</span></div>` : ''}
                    </div>
                </div>

                <div class="ticket-body">
                     ${(order.items || []).map(item => `
                        <div class="item-row" style="display: flex; justify-content: space-between;">
                            <span><span class="qty-tag">${item.qty}x</span> ${item.name}</span>
                            <span>${item.price ? 'LKR ' + (item.price * item.qty) : ''}</span>
                        </div>
                    `).join('')}

                    ${takeawayCharge > 0 ? `
                        <div class="item-row" style="display: flex; justify-content: space-between; color: #d97706; margin-top: 4px; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
                            <span>Take Away Charges</span>
                            <span>LKR ${takeawayCharge.toFixed(2)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div style="padding: 10px; background: #f8fafc; border-top: 1px solid #e2e8f0; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; font-weight: bold;">
                    <span>Total Bill:</span>
                    <span style="color: #16a34a; font-size: 1.1rem;">LKR ${totalAmount > 0 ? totalAmount.toFixed(2) : '0.00'}</span>
                </div>
                
                <div class="ticket-footer" style="margin-top: 10px;">
                    <button class="action-btn" onclick="openBillModal('${order.id}')" style="width: 100%; background-color: ${isPaid ? '#475569' : '#6366f1'}; color: white; padding: 10px; font-size: 0.95rem; font-weight: bold; border-radius: 6px; border: none; cursor: pointer;">
                        ${isPaid ? '🖨️ View / Reprint Bill' : '🧾 View Bill & Pay'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Open Bill Modal with Thermal Receipt Format
function openBillModal(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    let subtotal = 0;
    if (order.items && Array.isArray(order.items)) {
        subtotal = order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 1)), 0);
    }
    let takeawayCharge = Number(order.takeawayCharge || order.packagingCharge || 0);
    let totalAmount = subtotal + takeawayCharge;
    let isPaid = (order.paymentStatus || '').toLowerCase() === 'paid';

    const modal = document.getElementById('bill-modal');
    const content = document.getElementById('modal-bill-body');

    content.innerHTML = `
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000;">
            <div style="text-align: center;">
                <h2 style="margin: 0 0 2px 0; font-size: 16px;">CAFE DN</h2>
                <div style="font-size: 10px;">Fresh Juice, Milkshake & Meals</div>
                <div style="font-size: 10px; margin-bottom: 5px;">Hotline: 0771234567</div>
            </div>

            <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>
            <div>
                <div><b>Order ID:</b> ${order.id}</div>
                <div><b>Type:</b> ${order.type || 'Dine-in'}</div>
                <div><b>Customer:</b> ${order.customerName || 'Guest'}</div>
                <div><b>Table/Info:</b> ${order.table || 'N/A'}</div>
                <div><b>Status:</b> ${isPaid ? 'PAID ✅' : 'PENDING PAYMENT ⏳'}</div>
                <div><b>Date/Time:</b> ${new Date().toLocaleString()}</div>
            </div>
            
            <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>
            <div style="font-weight: bold; display: flex; justify-content: space-between;">
                <span>ITEM</span>
                <span>TOTAL</span>
            </div>
            <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>

            <div>
                ${(order.items || []).map(item => `
                    <div style="margin-bottom: 4px;">
                        <div>${item.qty} x ${item.name}</div>
                        <div style="display: flex; justify-content: space-between; padding-left: 10px;">
                            <span>@ ${item.price}</span>
                            <span>Rs. ${(item.price * item.qty).toFixed(2)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${takeawayCharge > 0 ? `
                <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Take Away Packaging Charges</span>
                    <span>Rs. ${takeawayCharge.toFixed(2)}</span>
                </div>
            ` : ''}

            <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                <span>NET TOTAL:</span>
                <span>Rs. ${totalAmount.toFixed(2)}</span>
            </div>
            <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>

            <div style="text-align: center; margin-top: 10px; font-size: 11px;">
                <p style="margin: 2px;">Thank You For Visiting!</p>
                <p style="margin: 2px;">Come Again! 🍽️</p>
            </div>
        </div>

        <div class="no-print" style="margin-top: 20px; display: flex; gap: 10px;">
            <button onclick="window.print()" style="flex: 1; padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">🖨️ Print Bill</button>
            ${!isPaid ? `<button onclick="confirmPaymentAndFinish('${order.id}')" style="flex: 1; padding: 10px; background: #22c55e; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">💵 Pay & Close</button>` : ''}
        </div>
        <button class="no-print" onclick="closeBillModal()" style="width: 100%; margin-top: 8px; padding: 8px; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Close</button>
    `;
    modal.style.display = 'flex';
}

function closeBillModal() {
    document.getElementById('bill-modal').style.display = 'none';
}

// Confirm Payment and Mark Order as Paid (🌟 ඊට අමතරව JWT Token එකද ඇතුළත් කරන ලදී)
async function confirmPaymentAndFinish(orderId) {
    const token = localStorage.getItem('adminToken'); // 🌟 Token එක ලබා ගැනීම

    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token // 🌟 Token එක සර්වර් එකට යැවීම
            },
            body: JSON.stringify({ 
                paymentStatus: 'paid',
                status: 'closed' 
            })
        });

        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }

        closeBillModal();
        fetchOrdersForCashier(); 

    } catch (error) {
        console.error('Error completing order payment:', error.message);
        alert("පේමන්ට් එක තහවුරු කිරීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.");
    }
}