// --- CAFE DN - Kitchen Display System (KDS) ---

let orders = [];
let lastOrdersJson = ''; // දත්ත වෙනස් වී ඇත්දැයි බැලීමට (නැවත නැවත re-render වීම වැළැක්වීමට)
let soundEnabled = true;
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    startClock();
    fetchOrdersFromServer();
    
    // තත්පර 2කට වරක් අලුත් Orders ඇවිත්දැයි Server එකෙන් Live පරීක්ෂා කිරීම
    setInterval(fetchOrdersFromServer, 2000);
});

// Server එකෙන් Live Orders ලබාගැනීම
function fetchOrdersFromServer() {
    fetch('/api/orders')
        .then(res => res.json())
        .then(data => {
            orders = data || [];
            const currentOrdersJson = JSON.stringify(orders);
            
            // දත්තවල කිසියම් වෙනසක් වී ඇත්නම් පමණක් renderTickets() ක්‍රියාත්මක කිරීම
            if (currentOrdersJson !== lastOrdersJson) {
                lastOrdersJson = currentOrdersJson;
                renderTickets();
            }
        })
        .catch(err => console.error("Error fetching orders:", err));
}

// Live Digital Clock
function startClock() {
    setInterval(() => {
        const now = new Date();
        const clockEl = document.getElementById('kds-clock');
        if (clockEl) clockEl.innerText = now.toLocaleTimeString();
    }, 1000);
}

// Render Order Tickets
function renderTickets() {
    const container = document.getElementById('tickets-grid');
    if (!container) return;
    
    let filteredOrders = [];

    // ගෙවීම් කළ, closed වූ හෝ completed වූ ඇණවුම් සක්‍රීය ලැයිස්තුවෙන් හැසිරවීම
    if (currentFilter === 'all') {
        filteredOrders = orders.filter(o => {
            let status = (o.status || '').toLowerCase();
            let paymentStatus = (o.paymentStatus || '').toLowerCase();
            return status !== 'completed' && status !== 'closed' && paymentStatus !== 'paid';
        });
    } else if (currentFilter === 'completed') {
        filteredOrders = orders.filter(o => {
            let status = (o.status || '').toLowerCase();
            let paymentStatus = (o.paymentStatus || '').toLowerCase();
            return status === 'completed' && paymentStatus !== 'paid';
        });
    } else {
        filteredOrders = orders.filter(o => {
            let status = (o.status || '').toLowerCase();
            let paymentStatus = (o.paymentStatus || '').toLowerCase();
            return status === currentFilter && status !== 'closed' && paymentStatus !== 'paid';
        });
    }

    if (filteredOrders.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;">
            <h3>${currentFilter === 'completed' ? '🏁 Completed Orders කිසිවක් නැත' : '📋 ඇණවුම් කිසිවක් නැත (No Orders)'}</h3>
        </div>`;
        return;
    }

    container.innerHTML = filteredOrders.map(order => {
        let statusClass = order.status || 'pending';
        let actionBtnHtml = '';

        if (order.status === 'pending' || !order.status) {
            actionBtnHtml = `
                <button class="action-btn btn-start" onclick="changeStatus('${order.id}', 'preparing')">
                    🍳 Start Preparing
                </button>
            `;
        } else if (order.status === 'preparing') {
            actionBtnHtml = `
                <button class="action-btn btn-ready" onclick="changeStatus('${order.id}', 'ready')">
                    ✅ Mark as Ready
                </button>
            `;
        } else if (order.status === 'ready') {
            actionBtnHtml = `
                <div style="display: flex; gap: 6px; flex-direction: column;">
                    <button class="action-btn btn-notify" onclick="notifyCustomer('${order.id}')">
                        📲 Notify via WhatsApp
                    </button>
                    <button class="action-btn" style="background-color: #475569; color: white;" onclick="changeStatus('${order.id}', 'completed')">
                        🏁 Order Handed to Customer
                    </button>
                </div>
            `;
        } else if (order.status === 'completed') {
            actionBtnHtml = `
                <div style="text-align: center; font-weight: bold; color: #16a34a; padding: 6px; background: #dcfce7; border-radius: 4px;">
                    ✅ Order Completed
                </div>
            `;
        }

        let orderTypeBadge = order.type || 'Dine-in';
        let badgeColorBg = orderTypeBadge.toLowerCase().includes('takeaway') ? '#ee2266' : '#e0f2fe';
        let badgeColorText = orderTypeBadge.toLowerCase().includes('takeaway') ? '#e7e7dd' : '#0284c7';

        let tableInfoHtml = '';
        if (order.table && order.table.trim() !== '') {
            let cleanTableText = order.table;
            
            if (cleanTableText.includes('(')) {
                cleanTableText = cleanTableText.split('(')[0].trim();
            }

            if (cleanTableText.toLowerCase().includes('table')) {
                tableInfoHtml = `
                    <span style="background: #fef08a; color: #854d0e; padding: 3px 10px; border-radius: 6px; font-weight: bold; font-size: 0.95rem; border: 1px solid #facc15;">
                        📍 ${cleanTableText}
                    </span>
                `;
            } else if (order.table.toLowerCase().includes('dine-in') || order.table.toLowerCase().includes('takeaway')) {
                tableInfoHtml = `
                    <span style="background: #e2e8f0; color: #475569; padding: 3px 10px; border-radius: 6px; font-weight: bold; font-size: 0.95rem; border: 1px solid #cbd5e1;">
                        🌐 Outside
                    </span>
                `;
            } else {
                tableInfoHtml = `
                    <span style="background: #fef08a; color: #854d0e; padding: 3px 10px; border-radius: 6px; font-weight: bold; font-size: 0.95rem; border: 1px solid #facc15;">
                        📍 Table ${cleanTableText}
                    </span>
                `;
            }
        } else {
            tableInfoHtml = `
                <span style="background: #e2e8f0; color: #475569; padding: 3px 10px; border-radius: 6px; font-weight: bold; font-size: 0.95rem; border: 1px solid #cbd5e1;">
                    🌐 Outside
                </span>
            `;
        }

        let customerNameHtml = `
            <div style="background: #eff6ff; color: #1d4ed8; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 0.9rem; border: 1px solid #bfdbfe; display: inline-block;">
                👤 ${order.customerName || 'Guest'}
            </div>
        `;

        let phoneHtml = '';
        if (order.phone && order.phone.trim() !== '') {
            phoneHtml = `
                <div style="background: #ecfdf5; color: #047857; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem; margin-top: 4px; border: 1px solid #a7f3d0; display: inline-block;">
                    📱 : ${order.phone}
                </div>
            `;
        }

        let pickupTimeHtml = '';
        if (order.pickupTime && order.pickupTime.trim() !== '') {
            pickupTimeHtml = `
                <div style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 0.88rem; margin-top: 6px; text-align: center; border: 1px solid #bae6fd;">
                    🕒 Expected Pickup Time: ${order.pickupTime}
                </div>
            `;
        }

        return `
            <div class="ticket-card ${statusClass}">
                <div class="ticket-header">
                    <span class="order-id">${order.id}</span>
                    <span style="background: ${badgeColorBg}; color: ${badgeColorText}; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">
                        ${orderTypeBadge}
                    </span>
                </div>
                <div class="ticket-info" style="margin: 8px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 5px;">
                        ${customerNameHtml}
                        ${tableInfoHtml}
                        <span>⏰ ${order.time || ''}</span>
                    </div>
                    <div style="margin-top: 4px;">
                        ${phoneHtml}
                    </div>
                    ${pickupTimeHtml}
                </div>
                <div class="ticket-body">
                    ${(order.items || []).map(item => `
                        <div class="item-row">
                            <span><span class="qty-tag">${item.qty}x</span> ${item.name}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="ticket-footer">
                    ${actionBtnHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Kitchen එකෙන් Status එක වෙනස් කිරීම
async function changeStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }

        console.log(`Order ${orderId} marked as ${newStatus}`);
        fetchOrdersFromServer(); 

    } catch (error) {
        console.error('Error updating status:', error.message);
    }
}

// WhatsApp Trigger
function notifyCustomer(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order && order.phone) {
        const msg = `👋 Hello ${order.customerName || ''}!\n\nYour Order *${order.id}* is READY! 🎉\nPlease collect it from the counter / enjoy your meal.`;
        const waUrl = `https://wa.me/${order.phone}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
    } else {
        alert("පාරිභෝගිකයාගේ දුරකථන අංකය ලබා දී නොමැත.");
    }
}

// Sound Alert Toggle
function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) btn.innerText = soundEnabled ? "🔊 Sound Alert: ON" : "🔇 Sound Alert: OFF";
}

// Filter Tickets
function filterOrders(status) {
    currentFilter = status;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    }

    renderTickets();
}

// --- Delete Modal Functions ---
function openDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.style.display = 'flex';
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.style.display = 'none';
}

// 1. දැනට Filter වී පෙනෙන Orders සියල්ල මකා දැමීම
async function handleBulkDelete() {
    const filteredOrders = orders.filter(o => {
        let status = (o.status || '').toLowerCase();
        let paymentStatus = (o.paymentStatus || '').toLowerCase();
        if (currentFilter === 'all') return status !== 'completed' && status !== 'closed' && paymentStatus !== 'paid';
        if (currentFilter === 'completed') return status === 'completed' && paymentStatus !== 'paid';
        return status === currentFilter && status !== 'closed' && paymentStatus !== 'paid';
    });

    if (filteredOrders.length === 0) {
        alert("මකා දැමීමට Orders කිසිවක් නැත!");
        return;
    }

    if (!confirm(`සැබවින්ම දැනට පෙනෙන (${currentFilter}) Orders ${filteredOrders.length} ක් මකා දැමීමට අවශ්‍යද?`)) return;

    try {
        for (const order of filteredOrders) {
            await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
        }
        alert("🗑️ දැනට පෙනෙන Orders සාර්ථකව මකා දැමුණා!");
        closeDeleteModal();
        fetchOrdersFromServer();
    } catch (err) {
        console.error("Error bulk deleting orders:", err);
        alert("❌ Orders මකා දැමීමේදී දෝෂයක් සිදු විය!");
    }
}

// නිශ්චිත Order ID එකක් මකා දැමීම (අංකය පමණක් ටයිප් කළ හැක)
async function handleSpecificDelete() {
    const inputField = document.getElementById('targetOrderId');
    if (!inputField) return;
    
    let orderId = inputField.value.trim();
    if (!orderId) { 
        alert("කරුණාකර Order Number එකක් (උදා: 123) ඇතුළත් කරන්න!"); 
        return; 
    }
    
    // "ORD-" හෝ "ord-" යන්න මුලින් නොමැති නම්, එය ස්වයංක්‍රීයව එකතු කිරීම
    if (!orderId.toUpperCase().startsWith("ORD-")) {
        orderId = "ORD-" + orderId;
    } else {
        // අකුරු uppercase (ORD-) බවට පත් කරගැනීම
        orderId = orderId.toUpperCase();
    }
    
    if (!confirm(`සැබවින්ම ${orderId} Order එක මකා දැමීමට අවශ්‍යද?`)) return;

    try {
        const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
        if (res.ok) {
            alert(`🗑️ ${orderId} සාර්ථකව මකා දැමුණි!`);
            inputField.value = '';
            closeDeleteModal();
            fetchOrdersFromServer();
        } else {
            alert("❌ Order එක මකා දැමීමට නොහැකි විය (ID එක වැරදි විය හැක).");
        }
    } catch (e) {
        console.error("Error deleting specific order:", e);
        alert("❌ Server දෝෂයක් සිදු විය.");
    }
}