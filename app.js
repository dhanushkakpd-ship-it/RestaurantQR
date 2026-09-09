// --- CAFE DN - Customer App JavaScript ---

const RESTAURANT_WA_NUMBER = "94754940329";

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
let lastProductDataJson = ""; 

document.addEventListener('DOMContentLoaded', async () => {
    await fetchShopStatus();
    await loadCategoriesForCart();
    await loadProductsFromServer();
    checkMyOrderStatus();
    initScrollSpy();

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const cartBar = document.getElementById('cart-bar');
            if (!cartBar) return;
            const isKeyboardOpen = window.visualViewport.height < window.innerHeight - 150;
            if (isKeyboardOpen) {
                cartBar.classList.add('keyboard-open');
            } else {
                cartBar.classList.remove('keyboard-open');
            }
        });
    }

    setInterval(async () => {
        await fetchShopStatus();
        await loadCategoriesForCart();
        await loadProductsFromServer(); 
        checkMyOrderStatus();
    }, 3000);

    const urlParams = new URLSearchParams(window.location.search);
    tableNumber = urlParams.get('table');

    if (tableNumber) {
        isTableQR = true;
        currentOrderType = 'dinein';
    } else {
        isTableQR = false;
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
    if (badge) {
        if (isShopOpen) {
            badge.innerHTML = "🟢 Open Now";
            badge.style.color = "#16a34a"; 
        } else {
            badge.innerHTML = "🔴 Shop Closed";
            badge.style.color = "#dc2626"; 
            const cartDetails = document.getElementById('cart-details');
            if (cartDetails && cartDetails.style.display === 'block') toggleCart();
            const cartBar = document.getElementById('cart-bar');
            if (cartBar) cartBar.style.display = 'none';
        }
    }
}

function updateTableBadgeUI() {
    const tableBadge = document.querySelector('.badge-table');
    if (!tableBadge) return;
    if (isTableQR) {
        tableBadge.innerText = `📍 Table ${tableNumber} (${currentOrderType === 'takeaway' ? 'Takeaway' : 'Dine-in'})`;
    } else {
        tableBadge.innerText = currentOrderType === 'takeaway' ? `📍 Takeaway (Shop)` : `📍 Dine-in (Shop)`;
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
        console.error("Error loading categories:", e);
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
        <div id="order-type-popup" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 99999; backdrop-filter: blur(4px);">
            <div style="background: white; padding: 25px; border-radius: 12px; width: 90%; max-width: 350px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
                <h3 style="margin-bottom: 8px; color: #1e293b; font-size: 1.25rem;">Welcome to CAFE DN! 🍽️</h3>
                <p style="color: #64748b; margin-bottom: 20px; font-size: 0.95rem;">කරුණාකර ඔබගේ ඇණවුම් ක්‍රමය තෝරන්න:</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="selectExternalOrderType('dinein')" style="flex: 1; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Dine-in</button>
                    <button onclick="selectExternalOrderType('takeaway')" style="flex: 1; padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Takeaway</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);
}

function selectExternalOrderType(type) {
    currentOrderType = type;
    updateTableBadgeUI(); 
    const popup = document.getElementById('order-type-popup');
    if (popup) popup.remove();
    updateCartUI(); 
}

function renderCategoryTabs() {
    const container = document.getElementById('categoryTabs');
    if (!container) return;
    container.style.background = '#fff5f7'; 
    container.style.padding = '8px 0';

    let categoriesList = categories;
    let tabsHtml = `<div style="display: flex; overflow-x: auto; gap: 8px; padding: 0 12px; scrollbar-width: none;"><button class="cat-tab ${currentCategory === 'all' ? 'active' : ''}" onclick="filterCategory('all')"><span>🌟</span><span>All</span></button>`;

    categoriesList.forEach(cat => {
        let catId = cat.id || cat.name;
        let catName = cat.name || cat.id;
        let catImage = cat.image ? `<img src="${cat.image}" alt="${catName}" onerror="this.style.display='none'">` : `<span style="font-size: 1rem;">🍽️</span>`;

        tabsHtml += `<button class="cat-tab ${currentCategory === catId ? 'active' : ''}" onclick="filterCategory('${catId}')">${catImage}<span>${catName}</span></button>`;
    });

    tabsHtml += `</div>`;
    container.innerHTML = tabsHtml;
}

function filterCategory(catId) {
    currentCategory = catId;
    renderProducts();
}

function renderProducts() {
    const container = document.getElementById('product-list');
    if (!container) return;
    renderCategoryTabs();

    let visibleProducts = systemData.products.filter(product => product.visible !== false && product.visible !== "false");

    if (currentCategory === 'all') {
        visibleProducts.sort((a, b) => {
            const catA = categories.find(c => c.id === a.category || c.name === a.category);
            const catB = categories.find(c => c.id === b.category || c.name === b.category);
            return (catA?.sortOrder || 9999) - (catB?.sortOrder || 9999);
        });
    } else {
        visibleProducts = visibleProducts.filter(p => (p.category || 'General') === currentCategory);
    }

    if (visibleProducts.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #64748b; grid-column: 1 / -1; padding: 20px;">No items found.</p>`;
        return;
    }

    container.innerHTML = visibleProducts.map(product => {
        const isUnavailable = (product.available === false || product.available === "false");
        const isDisabled = !isShopOpen || isUnavailable;
        const hasBadge = product.badge && product.badge !== "0" && product.badge.trim() !== "";

        return `
            <div class="product-card" data-category="${product.category || 'General'}" style="${isDisabled ? 'opacity: 0.90; background: #f8ebeb;' : ''}">
                ${product.image ? `<img src="${product.image}" alt="${product.name}" onerror="this.style.display='none'">` : ''}
                <div class="product-info">
                    <h3>${product.name}</h3>
                    ${hasBadge ? `<div class="badge-box"><span class="badge">${product.badge}</span></div>` : ''}
                    <p class="desc">${product.desc || ''}</p>
                    <div class="price-box">
                        <span class="current-price">Rs. ${Number(product.price).toFixed(0)}</span>
                        ${product.oldPrice ? `<span class="old-price">Rs. ${Number(product.oldPrice).toFixed(0)}</span>` : ''}
                    </div>
                </div>
                <div class="product-action">
                    <div>
                        ${isShopOpen ? (isUnavailable ? `<span style="color: #dc2626; font-weight: 800; font-size: 0.75rem; background: #fee2e2; padding: 6px 10px; border-radius: 8px; display: block; text-align: center;">Unavailable</span>` : `
                            <div class="qty-control" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <button onclick="changeQty('${product.id}', -1)" style="padding: 4px 10px;">-</button>
                                <span id="qty-${product.id}" style="font-weight: bold;">${cart[product.id] || 0}</span>
                                <button onclick="changeQty('${product.id}', 1)" style="padding: 4px 10px;">+</button>
                            </div>
                            <button class="add-btn" onclick="addToCart('${product.id}')" style="width: 100%;">Add to Cart</button>
                        `) : `<span style="color: #dc2626; font-weight: 800; font-size: 0.75rem; background: #fee2e2; padding: 6px 10px; border-radius: 8px; display: block; text-align: center;">Shop Closed</span>`}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function initScrollSpy() {
    window.addEventListener('scroll', () => {
        if (currentCategory !== 'all' || window.scrollY < 50) return;
        const cards = document.querySelectorAll('.product-card');
        for (let card of cards) {
            const rect = card.getBoundingClientRect();
            if (rect.top <= 200 && rect.bottom >= 100) {
                const activeCat = card.getAttribute('data-category');
                document.querySelectorAll('.cat-tab').forEach(btn => {
                    if ((btn.getAttribute('onclick') || '').includes(`'${activeCat}'`)) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
                break;
            }
        }
    });
}

function changeQty(productId, change) {
    if (!isShopOpen) return;
    cart[productId] = (cart[productId] || 0) + change;
    if (cart[productId] <= 0) delete cart[productId];
    const qtySpan = document.getElementById(`qty-${productId}`);
    if (qtySpan) qtySpan.innerText = cart[productId] || 0;
    updateCartUI();
}

function addToCart(productId) {
    if (!isShopOpen) return;
    cart[productId] = (cart[productId] || 0) + 1;
    const qtySpan = document.getElementById(`qty-${productId}`);
    if (qtySpan) qtySpan.innerText = cart[productId];
    updateCartUI();
}

function updateCartUI() {
    const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
    let subtotal = 0, totalTakeAwayCharges = 0;

    Object.keys(cart).forEach(id => {
        const prod = systemData.products.find(p => p.id == id);
        if (prod) {
            subtotal += (prod.price * cart[id]);
            if (currentOrderType === 'takeaway') {
                const cat = categories.find(c => c.id === prod.category || c.name === prod.category);
                if (cat && cat.takeawayCharge > 0) totalTakeAwayCharges += (Number(cat.takeawayCharge) * cart[id]);
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
            html += `<div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><span>${cart[id]}x ${prod.name}</span><b>Rs. ${(prod.price * cart[id]).toFixed(2)}</b></div>`;
        }
    }
    if (takeawayCharges > 0) {
        html += `<div style="display: flex; justify-content: space-between; margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px; color: #d97706;"><span>Take Away Charges:</span><b>Rs. ${takeawayCharges.toFixed(2)}</b></div>`;
    }
    container.innerHTML = html;
}

function toggleCart() {
    if (!isShopOpen) return;
    const details = document.getElementById('cart-details');
    if (details) details.style.display = details.style.display === 'block' ? 'none' : 'block';
}

function openOrderModal() {
    if (!isShopOpen || Object.keys(cart).length === 0) return;
    const nameInput = document.getElementById('cust-name')?.value.trim() || '';
    const phoneInput = document.getElementById('cust-phone')?.value.trim() || '';
    
    if (!nameInput) {
        showCustomAlert('කරුණාකර ඔබගේ නම ඇතුළත් කරන්න!');
        return;
    }
    const orderModal = document.getElementById('order-modal');
    if (orderModal) orderModal.style.display = 'flex';
}

function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    if (modal) modal.style.display = 'none';
}

function showCustomAlert(message) {
    let alertBox = document.getElementById('custom-alert-box');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'custom-alert-box';
        alertBox.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1e293b; color: #fff; padding: 16px 24px; border-radius: 10px; z-index: 999999; text-align: center;';
        document.body.appendChild(alertBox);
    }
    alertBox.innerText = message;
    alertBox.style.display = 'block';
    setTimeout(() => alertBox.style.display = 'none', 3000);
}

function submitOrder(sendWhatsApp) {
    if (!isShopOpen) return;
    const nameInput = document.getElementById('cust-name')?.value.trim() || '';
    const phoneInput = document.getElementById('cust-phone')?.value.trim() || '';
    const orderId = "ORD-" + Math.floor(100 + Math.random() * 900);

    let subtotal = 0, totalTakeAwayCharges = 0;
    const orderItems = Object.keys(cart).map(id => {
        const prod = systemData.products.find(p => p.id == id);
        const qty = cart[id];
        subtotal += (prod.price * qty);
        return { name: prod.name, qty: qty, price: prod.price };
    });

    const newOrder = {
        id: orderId,
        customerName: nameInput,
        phone: phoneInput || 'Not Provided',
        status: 'pending',
        total: subtotal + totalTakeAwayCharges,
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
        // 🌟 සර්වර් එකෙන් එන secretKey එක LocalStorage එකේ Save කරගැනීම[cite: 5]
        myOrders.push({ id: data.order.id, secretKey: data.order.secretKey });
        localStorage.setItem('cafeCustomerOrders', JSON.stringify(myOrders));

        showCustomAlert('🎉 ඔබගේ ඇණවුම සාර්ථකව යැවුණා!');
        document.getElementById('order-modal').style.display = 'none';

        if (sendWhatsApp) {
            let waMessage = `🧾 *NEW ORDER - ${orderId}*\n👤 *Name:* ${nameInput}\n💰 *Total:* Rs. ${newOrder.total.toFixed(2)}`;
            window.open(`https://wa.me/${RESTAURANT_WA_NUMBER}?text=${encodeURIComponent(waMessage)}`, '_blank');
        }

        cart = {};
        updateCartUI();
        toggleCart();
        checkMyOrderStatus();
    })
    .catch(err => console.error(err));
}

// 🌟 Secret Key සමඟ ආරක්ෂාකාරීව Status එක චෙක් කරන ෆන්ක්ෂන් එක[cite: 5]
async function checkMyOrderStatus() {
    let myOrders = JSON.parse(localStorage.getItem('cafeCustomerOrders') || '[]');
    const trackerContainer = document.getElementById('live-order-tracker');

    if (myOrders.length === 0) {
        if (trackerContainer) trackerContainer.style.display = 'none';
        return;
    }

    let activeResults = [];
    let paidTimestamps = JSON.parse(localStorage.getItem('cafePaidTimestamps') || '{}');
    let currentTime = Date.now();

    for (let orderObj of myOrders) {
        let ordId = typeof orderObj === 'string' ? orderObj : orderObj.id;
        let secKey = typeof orderObj === 'string' ? '' : orderObj.secretKey;

        try {
            const res = await fetch('/api/customer-order-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: ordId, secretKey: secKey })
            });

            if (res.ok) {
                const data = await res.json();
                let o = data.order;
                let status = (o.status || '').toLowerCase();
                let paymentStatus = (o.paymentStatus || '').toLowerCase();
                
                if (status === 'paid' || status === 'completed' || paymentStatus === 'paid') {
                    if (!paidTimestamps[o.id]) {
                        paidTimestamps[o.id] = currentTime;
                        localStorage.setItem('cafePaidTimestamps', JSON.stringify(paidTimestamps));
                    }
                    if (currentTime - paidTimestamps[o.id] >= 60000) continue;
                }
                if (status === 'cancelled') continue;

                activeResults.push(o);
            }
        } catch (e) {
            console.error("Error checking status");
        }
    }

    let updatedStorageOrders = myOrders.filter(orderObj => {
        let idToCheck = typeof orderObj === 'string' ? orderObj : orderObj.id;
        return activeResults.some(active => active.id === idToCheck);
    });
    localStorage.setItem('cafeCustomerOrders', JSON.stringify(updatedStorageOrders));

    latestActiveOrders = activeResults;
    if (latestActiveOrders.length > 0) {
        renderAllCustomerBadges(latestActiveOrders);
    } else {
        if (trackerContainer) trackerContainer.style.display = 'none';
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
    
    trackerContainer.innerHTML = `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; font-weight: 700; color: #1e293b; margin-bottom: 6px;">
                <span>🔔 Live Order Status</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 8px;">
                <div>
                    <b style="font-size: 0.9rem; color: #0f172a;">${latestOrder.id}</b>
                    <span style="font-size: 0.8rem; color: #64748b; margin-left: 6px;">Rs. ${Number(latestOrder.total || 0).toFixed(0)}</span>
                </div>
                <span style="background: #e0f2fe; color: #0284c7; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">${currentStatus.toUpperCase()}</span>
            </div>
        </div>
    `;
}

window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => { loader.style.display = 'none'; }, 500);
        }
    }, 800);
});