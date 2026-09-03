// --- CAFE DN - Customer App JavaScript (Cleaned, Fixed & Smart Updated) ---

const RESTAURANT_WA_NUMBER = "94754940329"; // Restaurant WhatsApp Number

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
let isShopOpen = true; 
let latestActiveOrders = []; 
let lastProductDataJson = ""; // ප්‍රොඩක්ට් ඩේටා වෙනස්වීම් පරීක්ෂා කිරීමට

document.addEventListener('DOMContentLoaded', async () => {
    await fetchShopStatus();
    await loadCategoriesForCart();
    await loadProductsFromServer();
    checkMyOrderStatus();
    initScrollSpy(); // 🛠️ Scroll spy එක ආරම්භ කිරීම

    setInterval(async () => {
        await fetchShopStatus();
        await loadCategoriesForCart();
        await loadProductsFromServer(); 
        checkMyOrderStatus();
    }, 3000);

    const urlParams = new URLSearchParams(window.location.search);
    tableNumber = urlParams.get('table');

    const orderTypeTabs = document.getElementById('order-type-tabs');

    if (tableNumber) {
        isTableQR = true;
        currentOrderType = 'dinein';
        if (orderTypeTabs) orderTypeTabs.style.display = 'flex'; 
    } else {
        if (orderTypeTabs) orderTypeTabs.style.display = 'flex';
        showOrderTypePopup();
    }

    updateTableBadgeUI();
    updateCartUI();
});

async function fetchShopStatus() {
    try {
        const res = await fetch('/api/shop-status');
        if (res.ok) {
            const data = await res.json();
            const newIsOpen = (typeof data.isOpen === 'boolean') ? data.isOpen : true;
            
            if (isShopOpen !== newIsOpen) {
                isShopOpen = newIsOpen;
                systemData.business.isOpen = isShopOpen;
                updateStatusBadge();
                renderProducts(); 
            } else {
                isShopOpen = newIsOpen;
                systemData.business.isOpen = isShopOpen;
                updateStatusBadge();
            }
        }
    } catch (e) {
        console.error("Error fetching shop status:", e);
    }
}

function updateStatusBadge() {
    const badge = document.querySelector('.badge-status');
    const orderTypeTabs = document.getElementById('order-type-tabs'); 
    const tabButtons = document.querySelectorAll('.tab-btn'); 

    if (badge) {
        if (isShopOpen) {
            badge.innerHTML = "🟢 Open Now";
            badge.style.color = "#16a34a"; 

            if (orderTypeTabs) {
                orderTypeTabs.style.pointerEvents = 'auto';
                orderTypeTabs.style.opacity = '1';
            }

            tabButtons.forEach(btn => {
                btn.disabled = false;
                btn.style.cursor = 'pointer';
            });

        } else {
            badge.innerHTML = "🔴 Shop Closed";
            badge.style.color = "#dc2626"; 

            if (orderTypeTabs) {
                orderTypeTabs.style.pointerEvents = 'none'; 
                orderTypeTabs.style.opacity = '0.5';        
            }

            tabButtons.forEach(btn => {
                btn.disabled = true;
                btn.style.cursor = 'not-allowed'; 
            });

            const cartDetails = document.getElementById('cart-details');
            if (cartDetails && cartDetails.style.display === 'block') {
                toggleCart();
            }

            const cartBar = document.getElementById('cart-bar');
            if (cartBar) {
                cartBar.style.display = 'none';
            }
        }
    }
}

function updateTableBadgeUI() {
    const tableBadge = document.querySelector('.badge-table');
    if (!tableBadge) return;

    if (isTableQR) {
        tableBadge.innerText = `📍 Table ${tableNumber} (${currentOrderType === 'takeaway' ? 'Takeaway' : 'Dine-in'})`;
    } else {
        tableBadge.innerText = currentOrderType === 'takeaway' ? `📍 Takeaway` : `📍 Dine-in (Shop)`;
    }
}

async function loadCategoriesForCart() {
    try {
        const res = await fetch('/api/categories');
        if (res.ok) {
            const data = await res.json();
            categories = data.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
        }
    } catch (e) {
        console.error("Error loading categories for cart:", e);
    }
}

async function loadProductsFromServer() {
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const currentDataJson = JSON.stringify(data);
                
                if (currentDataJson !== lastProductDataJson) {
                    lastProductDataJson = currentDataJson;
                    systemData.products = data;
                    localStorage.setItem('cafe_dn_products', JSON.stringify(data));
                    renderProducts();
                }
            }
        }
    } catch (e) {
        let storedProducts = localStorage.getItem('cafe_dn_products');
        if (storedProducts && systemData.products.length === 0) {
            try { 
                systemData.products = JSON.parse(storedProducts); 
                renderProducts();
            } catch (err) {}
        }
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
    updateTableBadgeUI(); 

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

function renderCategoryTabs() {
    const container = document.getElementById('categoryTabs');
    if (!container) return;

    // 🛠️ FIX: Category bar එක sticky කිරීම (පහළට scroll වද්දී උඩින්ම රැඳී තිබීමට)
    container.style.position = 'sticky';
    container.style.top = '0';
    container.style.zIndex = '999';
    container.style.background = '#ffffff';
    container.style.paddingTop = '8px';
    container.style.paddingBottom = '8px';
    container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';

    let categoriesList = categories;

    if (!categoriesList || categoriesList.length === 0) {
        categoriesList = [
            { id: 'juice', name: 'Juice', image: '' },
            { id: 'milkshake', name: 'Milkshake', image: '' },
            { id: 'rice', name: 'Rice', image: '' }
        ];
    }

    let html = `
        <button class="cat-tab ${currentCategory === 'all' ? 'active' : ''}" onclick="filterCategory('all')">
            <span style="font-size: 1rem;">🌟</span>
            <span>All</span>
        </button>
    `;

    categoriesList.forEach(cat => {
        let catId = typeof cat === 'object' ? (cat.id || cat.name) : cat;
        let catName = typeof cat === 'object' ? (cat.name || cat.id) : cat;
        let catImage = typeof cat === 'object' ? cat.image : '';

        let imageHtml = catImage 
            ? `<img src="${catImage}" alt="${catName}" onerror="this.style.display='none'">` 
            : `<span style="font-size: 1rem;">🍽️</span>`;

        html += `
            <button class="cat-tab ${currentCategory === catId ? 'active' : ''}" onclick="filterCategory('${catId}')">
                ${imageHtml}
                <span>${catName}</span>
            </button>
        `;
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

    if (currentCategory === 'all') {
        visibleProducts.sort((a, b) => {
            const catA = categories.find(c => c.id === a.category || c.name === a.category);
            const catB = categories.find(c => c.id === b.category || c.name === b.category);
            
            const orderA = catA && catA.sortOrder !== undefined ? Number(catA.sortOrder) : 9999;
            const orderB = catB && catB.sortOrder !== undefined ? Number(catB.sortOrder) : 9999;
            
            return orderA - orderB;
        });
    } else {
        visibleProducts = visibleProducts.filter(p => (p.category || 'General') === currentCategory);
    }

    if (visibleProducts.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #64748b; grid-column: 1 / -1; padding: 20px;">No items in this category.</p>`;
        return;
    }

    container.innerHTML = visibleProducts.map(product => {
        const isProductUnavailable = (product.available === false || product.available === "false");
        const isDisabled = !isShopOpen || isProductUnavailable;

        const hasValidBadge = product.badge && product.badge !== "0" && product.badge.trim() !== "" && product.badge.toLowerCase() !== "none";
        const badgeHtml = hasValidBadge 
            ? `<div class="badge-box"><span class="badge">${product.badge}</span></div>` 
            : '';

        // 🛠️ FIX: Scroll spy මඟින් හඳුනා ගැනීමට පහසු වීමට product-card එකට data-category එක එකතු කර ඇත
        return `
            <div class="product-card" data-category="${product.category || 'General'}" style="${isDisabled ? 'opacity: 0.90; background: #f8ebeb;' : ''}">
                ${product.image ? `<img src="${product.image}" alt="${product.name}" onerror="this.style.display='none'">` : ''}
                <div class="product-info">
                    <h3 style="margin-bottom: ${hasValidBadge ? '4px' : '6px'};">${product.name}</h3>
                    
                    ${badgeHtml}
                    
                    <p class="desc" style="margin-top: ${hasValidBadge ? '0' : '4px'};">${product.desc || ''}</p>
                    
                    <div class="price-box" style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">
                        <span class="current-price" style="white-space: nowrap;">Rs. ${Number(product.price).toFixed(0)}</span>
                        ${product.oldPrice ? `<span class="old-price" style="white-space: nowrap;">Rs. ${Number(product.oldPrice).toFixed(0)}</span>` : ''}
                    </div>
                </div>
                <div class="product-action">
                    <div>
                        ${isShopOpen ? `
                            ${!isProductUnavailable ? `
                                <div class="qty-control" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <button onclick="changeQty('${product.id}', -1)" style="padding: 4px 10px;">-</button>
                                    <span id="qty-${product.id}" style="font-weight: bold;">${cart[product.id] || 0}</span>
                                    <button onclick="changeQty('${product.id}', 1)" style="padding: 4px 10px;">+</button>
                                </div>
                                <button class="add-btn" onclick="addToCart('${product.id}')" style="width: 100%;">Add to Cart</button>
                            ` : `
                                <span style="color: #dc2626; font-weight: 800; font-size: 0.75rem; background: #fee2e2; padding: 6px 10px; border-radius: 8px; display: block; text-align: center;">Today <br> unavailable</span>
                            `}
                        ` : `
                            <span style="color: #dc2626; font-weight: 800; font-size: 0.75rem; background: #fee2e2; padding: 6px 10px; border-radius: 8px; display: block; text-align: center;">Shop Closed</span>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 🛠️ FIX: Scroll වන විට අදාළ Category එක ස්වයංක්‍රීයව Select වීම සඳහා Scroll Spy function එක
function initScrollSpy() {
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (currentCategory !== 'all') return; // All view එකේදී පමණක් ක්‍රියාත්මක වේ

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const cards = document.querySelectorAll('.product-card');
            let activeCat = null;

            for (let card of cards) {
                const rect = card.getBoundingClientRect();
                // Screen එකේ උඩ භාගයේ පවතින product card එක පරීක්ෂා කිරීම
                if (rect.top <= 200 && rect.bottom >= 100) {
                    activeCat = card.getAttribute('data-category');
                    break;
                }
            }

            if (activeCat) {
                const tabButtons = document.querySelectorAll('.cat-tab');
                tabButtons.forEach(btn => {
                    const onclickAttr = btn.getAttribute('onclick') || '';
                    if (onclickAttr.includes(`'${activeCat}'`)) {
                        btn.classList.add('active');
                        // අවශ්‍ය නම් ස්වයංක්‍රීයව tab scroll වීමට සේ සැලසිය හැක
                        btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }
        }, 100);
    });
}

function changeQty(productId, change) {
    if (!isShopOpen) return;
    if (!cart[productId]) cart[productId] = 0;
    cart[productId] += change;
    if (cart[productId] <= 0) delete cart[productId];

    const qtySpan = document.getElementById(`qty-${productId}`);
    if (qtySpan) qtySpan.innerText = cart[productId] || 0;
    updateCartUI();
}

function addToCart(productId) {
    if (!isShopOpen) {
        showCustomAlert('කණගාටුයි, දැනට ආපන ශාලාව වසා ඇත. ඇණවුම් කළ නොහැක!');
        return;
    }
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
        if (totalItems > 0 && isShopOpen) {
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
    if (!isShopOpen) return;
    const details = document.getElementById('cart-details');
    if (details) {
        details.style.display = details.style.display === 'block' ? 'none' : 'block';
    }

    const timeContainer = document.getElementById('pickup-time-container');
    if (timeContainer) {
        timeContainer.style.display = isTableQR ? 'none' : 'block';
    }
}

function setOrderType(type, eventObj) {
    currentOrderType = type;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = eventObj || (window.event && window.event.target);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }

    updateTableBadgeUI(); 
    updateCartUI();
}

function openOrderModal() {
    if (!isShopOpen) {
        showCustomAlert('ආපන ශාලාව වසා ඇති බැවින් ඇණවුම් කළ නොහැක!');
        return;
    }

    if (Object.keys(cart).length === 0) {
        showCustomAlert('කරුණාකර අවම වශයෙන් එක් ආහාරයක් හෝ තෝරන්න!');
        return;
    }

    const nameInput = document.getElementById('cust-name') ? document.getElementById('cust-name').value.trim() : '';
    const phoneInput = document.getElementById('cust-phone') ? document.getElementById('cust-phone').value.trim() : '';

    if (!nameInput) {
        showCustomAlert('කරුණාකර ඔබගේ නම ඇතුළත් කරන්න!');
        document.getElementById('cust-name')?.focus();
        return;
    }

    if (!isTableQR && !phoneInput) {
        showCustomAlert('පිටතින් කරන ඇණවුම් සඳහා දුරකථන අංකය අනිවාර්ය වේ!');
        document.getElementById('cust-phone')?.focus();
        return;
    }

    if (phoneInput) {
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phoneInput)) {
            showCustomAlert('නිවැරදිව ඔබගේ දුරකථන අංකය ලබා දෙන්න!');
            document.getElementById('cust-phone')?.focus();
            return;
        }
    }

    const timeInput = document.getElementById('cust-time') ? document.getElementById('cust-time').value : '';
    if (!isTableQR && !timeInput) {
        showCustomAlert('කරුණාකර ඔබ ඇණවුම ලබා ගැනීමට බලාපොරොත්තු වන වේලාව තෝරන්න!');
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
    const modal = document.getElementById('order-modal') || 
                  document.getElementById('review-modal') || 
                  document.getElementById('orderModal') ||
                  document.querySelector('.order-modal') ||
                  document.querySelector('.review-modal');

    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
        modal.classList.remove('active', 'show', 'open', 'visible');
    }

    const backdrops = document.querySelectorAll('.modal-backdrop, .overlay, .backdrop, .popup-overlay');
    backdrops.forEach(b => {
        b.style.setProperty('display', 'none', 'important');
        b.remove();
    });
}

function showCustomAlert(message) {
    let alertBox = document.getElementById('custom-alert-box');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'custom-alert-box';
        alertBox.style.position = 'fixed';
        alertBox.style.top = '50%';
        alertBox.style.left = '50%';
        alertBox.style.transform = 'translate(-50%, -50%)';
        alertBox.style.backgroundColor = '#1e293b';
        alertBox.style.color = '#fff';
        alertBox.style.padding = '16px 24px';
        alertBox.style.borderRadius = '10px';
        alertBox.style.zIndex = '999999';
        alertBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
        alertBox.style.fontSize = '15px';
        alertBox.style.fontWeight = '600';
        alertBox.style.textAlign = 'center';
        alertBox.style.transition = 'all 0.3s ease';
        document.body.appendChild(alertBox);
    }
    alertBox.innerText = message;
    alertBox.style.display = 'block';
    alertBox.style.opacity = '1';

    setTimeout(() => {
        alertBox.style.opacity = '0';
        setTimeout(() => {
            alertBox.style.display = 'none';
        }, 300);
    }, 3000);
}

function submitOrder(sendWhatsApp) {
    if (!isShopOpen) {
        showCustomAlert('ආපන ශාලාව වසා ඇති බැවින් ඇණවුම් යැවිය නොහැක!');
        return;
    }

    const nameInput = document.getElementById('cust-name') ? document.getElementById('cust-name').value.trim() : '';
    const phoneInput = document.getElementById('cust-phone') ? document.getElementById('cust-phone').value.trim() : '';
    const pickupTimeInput = document.getElementById('cust-time') ? document.getElementById('cust-time').value : '';

    if (!isTableQR && !pickupTimeInput) {
        showCustomAlert('කරුණාකර වේලාව තෝරන්න!');
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
        let myOrders = JSON.parse(localStorage.getItem('cafeCustomerOrders') || '[]');
        myOrders.push(orderId);
        localStorage.setItem('cafeCustomerOrders', JSON.stringify(myOrders));

        showCustomAlert('🎉 ඔබගේ ඇණවුම සාර්ථකව යැවුණා!');
        
        const orderModal = document.getElementById('order-modal');
        if (orderModal) {
            orderModal.style.setProperty('display', 'none', 'important');
            orderModal.classList.remove('active', 'show', 'open', 'visible');
        }

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
        checkMyOrderStatus();
    })
    .catch(err => {
        console.error(err);
        showCustomAlert('Order එක යැවීමට නොහැකි වුණා. කරුණාකර නැවත උත්සාහ කරන්න.');
    });
}

async function checkMyOrderStatus() {
    let myOrders = JSON.parse(localStorage.getItem('cafeCustomerOrders') || '[]');
    const trackerContainer = document.getElementById('live-order-tracker');

    if (myOrders.length === 0) {
        if (trackerContainer) trackerContainer.style.display = 'none';
        return;
    }

    try {
        const res = await fetch('/api/orders');
        if (res.ok) {
            const allOrders = await res.json();
            let paidTimestamps = JSON.parse(localStorage.getItem('cafePaidTimestamps') || '{}');
            let currentTime = Date.now();

            latestActiveOrders = allOrders.filter(o => {
                if (!myOrders.includes(o.id)) return false;
                let status = (o.status || '').toLowerCase();
                let paymentStatus = (o.paymentStatus || '').toLowerCase();
                
                let isPaidOrCompleted = (status === 'paid' || status === 'completed' || paymentStatus === 'paid');

                if (isPaidOrCompleted) {
                    if (!paidTimestamps[o.id]) {
                        paidTimestamps[o.id] = currentTime;
                        localStorage.setItem('cafePaidTimestamps', JSON.stringify(paidTimestamps));
                    }

                    let elapsed = currentTime - paidTimestamps[o.id];
                    if (elapsed >= 60000) { 
                        myOrders = myOrders.filter(id => id !== o.id);
                        localStorage.setItem('cafeCustomerOrders', JSON.stringify(myOrders));
                        return false; 
                    }
                }

                if (status === 'cancelled') {
                    myOrders = myOrders.filter(id => id !== o.id);
                    localStorage.setItem('cafeCustomerOrders', JSON.stringify(myOrders));
                    return false;
                }

                return true;
            });

            if (latestActiveOrders.length > 0) {
                renderAllCustomerBadges(latestActiveOrders);
                
                const existingModal = document.getElementById('all-orders-popup-modal');
                if (existingModal) {
                    updateAllOrdersPopupContent(latestActiveOrders);
                }
            } else {
                if (trackerContainer) trackerContainer.style.display = 'none';
            }
        }
    } catch (e) {
        console.error("Error checking customer orders status:", e);
    }
}

function renderAllCustomerBadges(ordersList) {
    const trackerContainer = document.getElementById('live-order-tracker');
    if (!trackerContainer) return;

    trackerContainer.style.display = 'block';
    trackerContainer.style.margin = '10px auto';
    trackerContainer.style.width = '95%';
    trackerContainer.style.maxWidth = '600px';

    const latestOrder = ordersList[ordersList.length - 1];
    
    let currentStatus = (latestOrder.status || 'pending').toLowerCase();
    let paymentStatus = (latestOrder.paymentStatus || '').toLowerCase();
    
    let statusColor = '#fef08a';
    let textColor = '#854d0e';
    let statusText = 'Pending';

    if (currentStatus === 'preparing') { 
        statusColor = '#e0f2fe'; 
        textColor = '#0284c7'; 
        statusText = 'Preparing'; 
    } else if (currentStatus === 'ready') { 
        statusColor = '#dcfce7'; 
        textColor = '#16a34a'; 
        statusText = 'Ready!'; 
    } else if (currentStatus === 'paid' || paymentStatus === 'paid') { 
        statusColor = '#ccfbf1'; 
        textColor = '#0f766e'; 
        statusText = 'Paid 💳'; 
    } else if (currentStatus === 'completed') { 
        statusColor = '#f1f5f9'; 
        textColor = '#64748b'; 
        statusText = 'Waiting for Payment'; 
    } else if (currentStatus === 'cancelled') { 
        statusColor = '#fee2e2'; 
        textColor = '#ef4444'; 
        statusText = 'Cancelled'; 
    }

    let otherOrdersHtml = '';
    if (ordersList.length > 1) {
        otherOrdersHtml = `
            <button onclick="showAllOrdersPopup()" style="
                background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px;
                padding: 4px 10px; font-size: 0.75rem; font-weight: 700; color: #475569;
                cursor: pointer; display: flex; align-items: center; gap: 4px;
            ">
                <span>📦 View All (${ordersList.length})</span>
            </button>
        `;
    }

    let html = `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; font-weight: 700; color: #1e293b; margin-bottom: 6px;">
                <span>🔔 Live Order Status</span>
                ${otherOrdersHtml}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 8px;">
                <div>
                    <b style="font-size: 0.9rem; color: #0f172a;">${latestOrder.id}</b>
                    <span style="font-size: 0.8rem; color: #64748b; margin-left: 6px;">Rs. ${Number(latestOrder.total || 0).toFixed(0)}</span>
                </div>
                <span style="background: ${statusColor}; color: ${textColor}; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">${statusText}</span>
            </div>
        </div>
    `;
    trackerContainer.innerHTML = html;
}

function showAllOrdersPopup() {
    const existingModal = document.getElementById('all-orders-popup-modal');
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="all-orders-popup-modal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6); display: flex; justify-content: center;
            align-items: center; z-index: 99999; backdrop-filter: blur(4px);
        ">
            <div style="
                background: white; padding: 20px; border-radius: 12px;
                width: 90%; max-width: 400px; max-height: 80vh; overflow-y: auto;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0; color: #1e293b; font-size: 1.1rem;">📦 My Active Orders</h3>
                    <button onclick="document.getElementById('all-orders-popup-modal').remove()" style="
                        background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #64748b; font-weight: bold;
                    ">✕</button>
                </div>
                <div id="all-orders-list-container"></div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    updateAllOrdersPopupContent(latestActiveOrders);
}

function updateAllOrdersPopupContent(ordersList) {
    const container = document.getElementById('all-orders-list-container');
    if (!container) return;

    container.innerHTML = ordersList.map(order => {
        let currentStatus = (order.status || 'pending').toLowerCase();
        let paymentStatus = (order.paymentStatus || '').toLowerCase();
        
        let statusColor = '#fef08a';
        let textColor = '#854d0e';
        let statusText = 'Pending';

        if (currentStatus === 'preparing') { 
            statusColor = '#e0f2fe'; textColor = '#0284c7'; statusText = 'Preparing'; 
        } else if (currentStatus === 'ready') { 
            statusColor = '#dcfce7'; textColor = '#16a34a'; statusText = 'Ready!'; 
        } else if (currentStatus === 'paid' || paymentStatus === 'paid') { 
            statusColor = '#ccfbf1'; textColor = '#0f766e'; statusText = 'Paid 💳'; 
        } else if (currentStatus === 'completed') { 
            statusColor = '#f1f5f9'; textColor = '#64748b'; statusText = 'Waiting for Payment'; 
        } else if (currentStatus === 'cancelled') { 
            statusColor = '#fee2e2'; textColor = '#ef4444'; statusText = 'Cancelled'; 
        }

        return `
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <b style="font-size: 0.9rem; color: #0f172a;">${order.id}</b>
                    <span style="background: ${statusColor}; color: ${textColor}; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 700;">${statusText}</span>
                </div>
                <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 4px;">📍 ${order.table} | 🕒 ${order.pickupTime}</div>
                <div style="font-size: 0.9rem; font-weight: 600; color: #16a34a;">Total: Rs. ${Number(order.total || 0).toFixed(0)}</div>
            </div>
        `;
    }).join('');
}

window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }, 800);
});