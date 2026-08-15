// --- CAFE DN - Customer App JavaScript (Complete & Fixed) ---

const RESTAURANT_WA_NUMBER = "94771234567"; // Restaurant WhatsApp Number

let systemData = {
    business: { name: "CAFE DN", isOpen: true },
    products: []
};

let categories = []; 
let currentCategory = 'all';
let cart = {}; 
let currentOrderType = 'dinein';
let isTableQR = false;
let tableNumber = "";

document.addEventListener('DOMContentLoaded', async () => {
    // 🌟 මුලින්ම Categories සහ පසුව Products එකවර ලෝඩ් කර ගැනීම
    await loadCategoriesForCart();
    await loadProductsFromServer();
    
    // 🌟 දැන් Categories සහ Products දෙකම සෑම තත්පර 3කට වතාවක්ම එකවර අප්ඩේට් වේ
    setInterval(async () => {
        await loadCategoriesForCart();
        await loadProductsFromServer();
    }, 3000);

    const urlParams = new URLSearchParams(window.location.search);
    tableNumber = urlParams.get('table');

    const orderTypeTabs = document.getElementById('order-type-tabs');
    const tableBadge = document.querySelector('.badge-table');

    if (tableNumber) {
        isTableQR = true;
        currentOrderType = 'dinein';
        if (tableBadge) tableBadge.innerText = `📍 Table ${tableNumber}`;
        if (orderTypeTabs) orderTypeTabs.style.display = 'flex'; 
    } else {
        if (tableBadge) tableBadge.innerText = `📍 Dine-in (Shop)`;
        if (orderTypeTabs) orderTypeTabs.style.display = 'flex';
        showOrderTypePopup();
    }

    updateCartUI();

    // 🌟 දත්ත සියල්ල ලෝඩ් වී අවසන් වූ පසු Loader එක Smooth ලෙස ඉවත් කිරීම (Fade out)
    hideAppLoader();
});

// Loader එක ක්‍රියාත්මක කර ඉවත් කරන ෆන්ෂන් එක
function hideAppLoader() {
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 600); // CSS transition කාලයට සමාන වේලාවක් තබා ඇත
    }
}


// Categories සර්වර් එකෙන් ලබා ගැනීම
async function loadCategoriesForCart() {
    try {
        const res = await fetch('/api/categories');
        if (res.ok) {
            categories = await res.json();
        }
    } catch (e) {
        console.error("Error loading categories for cart:", e);
    }
}

// Products සර්වර් එකෙන් ලබා ගැනීම
async function loadProductsFromServer() {
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                systemData.products = data;
                localStorage.setItem('cafe_dn_products', JSON.stringify(data));
            }
            renderProducts();
        }
    } catch (e) {
        let storedProducts = localStorage.getItem('cafe_dn_products');
        if (storedProducts) {
            try { systemData.products = JSON.parse(storedProducts); } catch (err) {}
        }
        renderProducts();
    }
}

function showOrderTypePopup() {
    if (document.getElementById('order-type-popup')) return;

    const popupHtml = `
        <div id="order-type-popup" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6); display: flex; justify-content: center;
            align-items: center; z-index: 99999; backdrop-filter: blur(4px);
        ">
            <div style="
                background: white; padding: 25px; border-radius: 12px;
                width: 90%; max-width: 350px; text-align: center;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            ">
                <h3 style="margin-bottom: 8px; color: #1e293b; font-size: 1.25rem;">Welcome to CAFE DN! 🍽️</h3>
                <p style="color: #64748b; margin-bottom: 20px; font-size: 0.95rem;">කරුණාකර ඔබගේ ඇණවුම් ක්‍රමය තෝරන්න:</p>
                
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="selectExternalOrderType('dinein')" style="
                        flex: 1; padding: 12px; background: #3b82f6; color: white;
                        border: none; border-radius: 8px; font-weight: bold; cursor: pointer;
                        font-size: 1rem;
                    ">Dine-in</button>
                    
                    <button onclick="selectExternalOrderType('takeaway')" style="
                        flex: 1; padding: 12px; background: #10b981; color: white;
                        border: none; border-radius: 8px; font-weight: bold; cursor: pointer;
                        font-size: 1rem;
                    ">Takeaway</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);
}

function selectExternalOrderType(type) {
    currentOrderType = type;
    const tableBadge = document.querySelector('.badge-table');
    if (tableBadge) {
        tableBadge.innerText = type === 'dinein' ? `📍 Dine-in (Shop)` : `📍 Takeaway`;
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        const btnText = btn.innerText.toLowerCase();
        if (btnText.includes(type) || (type === 'dinein' && btnText.includes('dine'))) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const popup = document.getElementById('order-type-popup');
    if (popup) popup.remove();
    updateCartUI(); 
}

// 🌟 Categories ටැබ් නිවැරදිව පෙන්වීම
function renderCategoryTabs() {
    const container = document.getElementById('categoryTabs');
    if (!container) return;

    let categoriesList = categories;

    if (!categoriesList || categoriesList.length === 0) {
        categoriesList = [
            { id: 'juice', name: 'Juice' },
            { id: 'milkshake', name: 'Milkshake' },
            { id: 'rice', name: 'Rice' }
        ];
    }

    let html = `<button class="cat-tab ${currentCategory === 'all' ? 'active' : ''}" onclick="filterCategory('all')">🌟 All</button>`;
    
    categoriesList.forEach(cat => {
        let catId = typeof cat === 'object' ? (cat.id || cat.name) : cat;
        let catName = typeof cat === 'object' ? (cat.name || cat.id) : cat;

        html += `<button class="cat-tab ${currentCategory === catId ? 'active' : ''}" onclick="filterCategory('${catId}')">${catName}</button>`;
    });

    container.innerHTML = html;
}

function filterCategory(catId) {
    currentCategory = catId;
    renderProducts();
}

function renderProducts() {
    const container = document.getElementById('product-list');
    if (!container) return;

    renderCategoryTabs();

    let visibleProducts = systemData.products.filter(product => 
        product.visible !== false && product.visible !== "false"
    );

    if (currentCategory !== 'all') {
        visibleProducts = visibleProducts.filter(p => (p.category || 'General') === currentCategory);
    }

    if (visibleProducts.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #64748b; grid-column: 1 / -1; padding: 20px;">No items in this category.</p>`;
        return;
    }

    container.innerHTML = visibleProducts.map(product => `
        <div class="product-card" style="${(product.available === false || product.available === "false") ? 'opacity: 0.75; background: #fdf2f2;' : ''}">
            ${product.image ? `<img src="${product.image}" alt="${product.name}" onerror="this.style.display='none'">` : ''}
            <div class="product-info">
                <h3>${product.name}</h3>
                <div class="badge-box">
                    ${product.badge ? `<span class="badge">${product.badge}</span>` : ''}
                </div>
                <p class="desc">${product.desc || ''}</p>
                <div class="price-box">
                    <span class="current-price">Rs. ${Number(product.price).toFixed(0)}</span>
                    ${product.oldPrice ? `<span class="old-price">Rs. ${Number(product.oldPrice).toFixed(0)}</span>` : ''}
                </div>
            </div>
            <div class="product-action">
    <div>
        ${(product.available !== false && product.available !== "false") ? `
            <div class="qty-control" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <button onclick="changeQty('${product.id}', -1)" style="padding: 4px 10px;">-</button>
                <span id="qty-${product.id}" style="font-weight: bold;">${cart[product.id] || 0}</span>
                <button onclick="changeQty('${product.id}', 1)" style="padding: 4px 10px;">+</button>
            </div>
            <button class="add-btn" onclick="addToCart('${product.id}')" style="width: 100%;">Add to Cart</button>
        ` : `
            <span style="color: #dc2626; font-weight: 800; font-size: 0.75rem; background: #fee2e2; padding: 6px 10px; border-radius: 8px; display: block; text-align: center;">Today unavailable</span>
        `}
    </div>
</div>
        </div>
    `).join('');
}

function changeQty(productId, change) {
    if (!cart[productId]) cart[productId] = 0;
    cart[productId] += change;
    if (cart[productId] <= 0) delete cart[productId];
    
    const qtySpan = document.getElementById(`qty-${productId}`);
    if (qtySpan) qtySpan.innerText = cart[productId] || 0;
    updateCartUI();
}

function addToCart(productId) {
    if (!cart[productId]) cart[productId] = 1;
    const qtySpan = document.getElementById(`qty-${productId}`);
    if (qtySpan) qtySpan.innerText = cart[productId];
    updateCartUI();
}

function updateCartUI() {
    const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
    
    let subtotal = 0;
    let totalTakeAwayCharges = 0;

    Object.keys(cart).forEach(id => {
        const prod = systemData.products.find(p => p.id == id);
        if (prod) {
            const itemQty = cart[id];
            subtotal += (prod.price * itemQty);

            if (currentOrderType === 'takeaway') {
                const cat = categories.find(c => (c.id === prod.category || c.name === prod.category));
                if (cat && cat.takeawayCharge > 0) {
                    totalTakeAwayCharges += (Number(cat.takeawayCharge) * itemQty);
                }
            }
        }
    });

    const grandTotal = subtotal + totalTakeAwayCharges;

    const cartBar = document.getElementById('cart-bar');
    if (cartBar) {
        if (totalItems > 0) {
            cartBar.style.display = 'block';
            document.getElementById('cart-count').innerText = totalItems;
            document.getElementById('cart-total-price').innerText = `Rs. ${grandTotal.toFixed(2)}`;
            renderCartItemsList(totalTakeAwayCharges);
        } else {
            cartBar.style.display = 'none';
        }
    }
}

function renderCartItemsList(takeawayCharges = 0) {
    const container = document.getElementById('cart-items-container');
    if (!container) return;

    let html = '';

    for (let id in cart) {
        const prod = systemData.products.find(p => p.id == id);
        if (prod) {
            const itemTotal = prod.price * cart[id];
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span>${cart[id]}x ${prod.name}</span>
                    <b>Rs. ${itemTotal.toFixed(2)}</b>
                </div>
            `;
        }
    }

    if (takeawayCharges > 0) {
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px; color: #d97706; font-size: 0.9rem;">
                <span>Take Away Packaging Charges:</span>
                <b>Rs. ${takeawayCharges.toFixed(2)}</b>
            </div>
        `;
    }

    container.innerHTML = html;
}

function toggleCart() {
    const details = document.getElementById('cart-details');
    if (details) {
        details.style.display = details.style.display === 'block' ? 'none' : 'block';
    }

    const timeContainer = document.getElementById('pickup-time-container');
    if (timeContainer) {
        timeContainer.style.display = isTableQR ? 'none' : 'block';
    }
}

function setOrderType(type) {
    currentOrderType = type;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    updateCartUI();
}

function openOrderModal() {
    if (Object.keys(cart).length === 0) {
        alert('කරුණාකර අවම වශයෙන් එක් ආහාරයක් හෝ තෝරන්න!');
        return;
    }

    const nameInput = document.getElementById('cust-name') ? document.getElementById('cust-name').value.trim() : '';
    const phoneInput = document.getElementById('cust-phone') ? document.getElementById('cust-phone').value.trim() : '';
    
    if (!nameInput) {
        alert('කරුණාකර ඔබගේ නම ඇතුළත් කරන්න!');
        document.getElementById('cust-name')?.focus();
        return;
    }

    if (!isTableQR && !phoneInput) {
        alert('පිටතින් කරන ඇණවුම් සඳහා දුරකථන අංකය අනිවාර්ය වේ!');
        document.getElementById('cust-phone')?.focus();
        return;
    }

    const timeInput = document.getElementById('cust-time') ? document.getElementById('cust-time').value : '';
    if (!isTableQR && !timeInput) {
        alert('කරුණාකර ඔබ ඇණවුම රැගෙන යාමට බලාපොරොත්තු වන වේලාව තෝරන්න!');
        return;
    }

    const isTakeaway = (currentOrderType === 'takeaway');
    let displayTableType = '';
    if (isTableQR) {
        displayTableType = isTakeaway ? `Table ${tableNumber} (Takeaway)` : `Table ${tableNumber}`;
    } else {
        displayTableType = isTakeaway ? 'Takeaway (Shop)' : 'Dine-in (Shop)';
    }

    let subtotal = 0;
    let totalTakeAwayCharges = 0;

    let itemsHtml = Object.keys(cart).map(id => {
        const prod = systemData.products.find(p => p.id == id);
        if (!prod) return '';
        const itemTotal = prod.price * cart[id];
        subtotal += itemTotal;

        if (currentOrderType === 'takeaway') {
            const cat = categories.find(c => (c.id === prod.category || c.name === prod.category));
            if (cat && cat.takeawayCharge > 0) {
                totalTakeAwayCharges += (Number(cat.takeawayCharge) * cart[id]);
            }
        }

        return `<div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>${cart[id]}x ${prod.name}</span>
            <b>Rs. ${itemTotal.toFixed(2)}</b>
        </div>`;
    }).join('');

    const grandTotal = subtotal + totalTakeAwayCharges;

    if (totalTakeAwayCharges > 0) {
        itemsHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#d97706; font-size:0.9rem;">
            <span>Take Away Packaging Charges:</span>
            <b>Rs. ${totalTakeAwayCharges.toFixed(2)}</b>
        </div>`;
    }

    const modalBody = document.getElementById('modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="modal-summary-card">
                <div>📍 <b>Type:</b> ${displayTableType}</div>
                <div>👤 <b>Name:</b> ${nameInput}</div>
                <div>📱 <b>Phone:</b> ${phoneInput || 'Not required'}</div>
                <div>🕒 <b>Pickup Time:</b> ${timeInput || 'ASAP'}</div>
            </div>
            <div style="border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 10px;">
                <p style="font-weight:700; color:#475569; margin-bottom:8px;">Order Items:</p>
                ${itemsHtml}
                <div style="display:flex; justify-content:space-between; margin-top:12px; font-size:1.05rem; color:#16a34a; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    <b>Total Amount:</b>
                    <b>Rs. ${grandTotal.toFixed(2)}</b>
                </div>
            </div>
        `;
    }

    const orderModal = document.getElementById('order-modal');
    if (orderModal) orderModal.style.display = 'flex';
}

function closeOrderModal() {
    const orderModal = document.getElementById('order-modal');
    if (orderModal) orderModal.style.display = 'none';
}

function submitOrder(sendWhatsApp) {
    const nameInput = document.getElementById('cust-name') ? document.getElementById('cust-name').value.trim() : '';
    const phoneInput = document.getElementById('cust-phone') ? document.getElementById('cust-phone').value.trim() : '';
    const pickupTimeInput = document.getElementById('cust-time') ? document.getElementById('cust-time').value : '';

    if (!isTableQR && !pickupTimeInput) {
        alert('කරුණාකර වේලාව තෝරන්න!');
        return;
    }

    const orderId = "ORD-" + Math.floor(100 + Math.random() * 900);
    
    const isTakeaway = (currentOrderType === 'takeaway');
    let finalTableType = '';
    
    if (isTableQR) {
        finalTableType = isTakeaway ? `Table ${tableNumber} (Takeaway)` : `Table ${tableNumber}`;
    } else {
        finalTableType = isTakeaway ? 'Takeaway' : 'Dine-in (Shop)';
    }
    
    const finalOrderTypeStr = isTakeaway ? 'Takeaway' : 'Dine-in';

    let subtotal = 0;
    let totalTakeAwayCharges = 0;

    const orderItems = Object.keys(cart).map(id => {
        const prod = systemData.products.find(p => p.id == id);
        const qty = cart[id];
        const price = prod ? prod.price : 0;
        subtotal += (price * qty);

        if (currentOrderType === 'takeaway') {
            const cat = categories.find(c => (c.id === prod?.category || c.name === prod?.category));
            if (cat && cat.takeawayCharge > 0) {
                totalTakeAwayCharges += (Number(cat.takeawayCharge) * qty);
            }
        }

        return { name: prod ? prod.name : 'Unknown', qty: qty, price: price };
    });

    const grandTotal = subtotal + totalTakeAwayCharges;

    const newOrder = {
        id: orderId,
        table: finalTableType,
        type: finalOrderTypeStr, 
        customerName: nameInput,
        phone: phoneInput || 'Not Provided',
        pickupTime: pickupTimeInput || 'ASAP',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'pending',
        subtotal: subtotal,
        takeawayCharge: totalTakeAwayCharges,
        total: grandTotal,
        items: orderItems
    };

    fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
    })
    .then(res => res.json())
    .then(data => {
        localStorage.setItem('customerOrderId', orderId);
        alert('🎉 ඔබගේ Order එක සාර්ථකව Kitchen එකට යැවුණා! Order ID: ' + orderId);

        if (sendWhatsApp) {
            let itemText = orderItems.map(i => `▫️ ${i.qty}x ${i.name} - Rs. ${(i.price * i.qty).toFixed(2)}`).join('\n');
            if (totalTakeAwayCharges > 0) {
                itemText += `\n▫️ Take Away Charges - Rs. ${totalTakeAwayCharges.toFixed(2)}`;
            }

            let waMessage = `🧾 *NEW ORDER - ${orderId}*\n` +
                            `📍 *Type:* ${finalTableType}\n` +
                            `👤 *Name:* ${nameInput}\n` +
                            `📱 *Phone:* ${phoneInput || 'N/A'}\n` +
                            `🕒 *Pickup Time:* ${pickupTimeInput || 'ASAP'}\n\n` +
                            `🛒 *Items:*\n${itemText}\n\n` +
                            `💰 *Total Amount:* Rs. ${grandTotal.toFixed(2)}`;

            const waUrl = `https://wa.me/${RESTAURANT_WA_NUMBER}?text=${encodeURIComponent(waMessage)}`;
            window.open(waUrl, '_blank');
        }

        cart = {};
        if(document.getElementById('cust-name')) document.getElementById('cust-name').value = '';
        if(document.getElementById('cust-phone')) document.getElementById('cust-phone').value = '';
        if(document.getElementById('cust-time')) document.getElementById('cust-time').value = '';
        
        updateCartUI();
        toggleCart();
        closeOrderModal();
    })
    .catch(err => {
        console.error(err);
        alert('Order එක යැවීමට නොහැකි වුණා. කරුණාකර නැවත උත්සාහ කරන්න.');
    });
}