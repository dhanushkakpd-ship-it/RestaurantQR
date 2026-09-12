// --- CAFE DN - Customer App JavaScript (Security Updated) ---

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
let lastProductDataJson = ""; 

document.addEventListener('DOMContentLoaded', async () => {
    await fetchShopStatus();
    await loadCategoriesForCart();
    await loadProductsFromServer();
    checkMyOrderStatus();

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
            categories = await res.json();
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

    let categoriesList = [...categories];

    // අඩ්මින් පැනල් එකේ දී ඇති sortOrder එක අනුව categories පෙළගැස්වීම
    if (categoriesList && categoriesList.length > 0) {
        categoriesList.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    }

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

    let sortedCategories = [...categories];
    if (sortedCategories && sortedCategories.length > 0) {
        sortedCategories.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    }

    visibleProducts.sort((a, b) => {
        let catAId = a.category || 'General';
        let catBId = b.category || 'General';
        
        let indexA = sortedCategories.findIndex(c => (typeof c === 'object' ? (c.id === catAId || c.name === catAId) : c === catAId));
        let indexB = sortedCategories.findIndex(c => (typeof c === 'object' ? (c.id === catBId || c.name === catBId) : c === catBId));
        
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;

        if (indexA !== indexB) return indexA - indexB;
        return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    });

    if (currentCategory !== 'all') {
        visibleProducts = visibleProducts.filter(p => (p.category || 'General') === currentCategory);
        if (visibleProducts.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: #64748b; grid-column: 1 / -1; padding: 20px;">No items in this category.</p>`;
            return;
        }
        container.innerHTML = generateProductsHtml(visibleProducts);
    } else {
        if (visibleProducts.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: #64748b; grid-column: 1 / -1; padding: 20px;">No items available.</p>`;
            return;
        }

        let groupedHtml = '';
        let categoryGroups = {};
        
        visibleProducts.forEach(product => {
            let cat = product.category || 'General';
            if (!categoryGroups[cat]) categoryGroups[cat] = [];
            categoryGroups[cat].push(product);
        });

        sortedCategories.forEach(catObj => {
            let catKey = typeof catObj === 'object' ? (catObj.id || catObj.name) : catObj;
            let catDisplayName = typeof catObj === 'object' ? (catObj.name || catObj.id) : catKey;

            if (categoryGroups[catKey] && categoryGroups[catKey].length > 0) {
                // 🌟 කුඩා, ලස්සන Modern Pill/Badge ස්ටייל එකට සකස් කළ Header එක
                groupedHtml += `
                    <div class="category-section-title" data-cat-id="${catKey}" style="
                        grid-column: 1 / -1; 
                        margin-top: 10px; 
                        margin-bottom: 2px; 
                        display: flex;
                        align-items: center;
                        scroll-margin-top: 100px;
                    ">
                        <span style="
                            background: #f1f5f9; 
                            color: #334155; 
                            padding: 6px 14px; 
                            border-radius: 20px; 
                            font-size: 0.95rem; 
                            font-weight: 700; 
                            display: inline-flex; 
                            align-items: center; 
                            gap: 6px;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
                            border: 1px solid #e2e8f0;
                            text-transform: capitalize;
                        ">
                             ${catDisplayName}
                        </span>
                    </div>
                `;
                groupedHtml += generateProductsHtml(categoryGroups[catKey]);
            }
        });

        container.innerHTML = groupedHtml;
        initScrollSpy(); // 🌟 මෙනුව රෙන්ඩර් වූ පසු Scroll Spy ක්‍රියාත්මක කිරීම
    }
}

let scrollTimeout = null;

function initScrollSpy() {
    const sections = document.querySelectorAll('.category-section-title');
    if (sections.length === 0) return;

    window.addEventListener('scroll', () => {
        if (currentCategory !== 'all') return;

        // 1. මෙනුව උඩටම ගොස් ඇත නම් ක්ෂණිකව 'All' ටැබ් එක තෝරන්න
        if (window.scrollY < 15) {
            highlightAllTab();
            return;
        }

        // 2. ස්ක්‍රෝල් කරන විට පවතින ටයිමර් එක ඉවත් කිරීම
        clearTimeout(scrollTimeout);

        // 3. ස්ක්‍රෝල් කිරීම නතර කර මිලි තත්පර 100 කට පසු (0.1 seconds) ක්‍රියාත්මක වීම
        scrollTimeout = setTimeout(() => {
            let scrollPosition = window.scrollY + 190;
            let activeCatId = null;
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (scrollPosition >= sectionTop) {
                    activeCatId = section.getAttribute('data-cat-id');
                }
            });

            if (activeCatId) {
                highlightCategoryTab(activeCatId);
            }
        }, 100); // මෙහි කාලය අවශ්‍ය නම් වැඩි හෝ අඩු කළ හැක
    });
}

function highlightAllTab() {
    const tabs = document.querySelectorAll('.cat-tab');
    tabs.forEach(tab => {
        const onclickAttr = tab.getAttribute('onclick') || '';
        if (onclickAttr.includes("'all'") || onclickAttr.includes('"all"')) {
            if (!tab.classList.contains('active')) {
                tab.classList.add('active');
                tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        } else {
            tab.classList.remove('active');
        }
    });
}

function highlightCategoryTab(catId) {
    const tabs = document.querySelectorAll('.cat-tab');
    tabs.forEach(tab => {
        const onclickAttr = tab.getAttribute('onclick') || '';
        if (onclickAttr.includes(`'${catId}'`) || onclickAttr.includes(`"${catId}"`)) {
            if (!tab.classList.contains('active')) {
                tab.classList.add('active');
                tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        } else if (!onclickAttr.includes("'all'") && !onclickAttr.includes('"all"')) {
            tab.classList.remove('active');
        }
    });
}
// නිෂ්පාදන කාඩ්පත් සෑදීමට උපකාරක ෆන්ක්ෂන් එකක්
function generateProductsHtml(productsList) {
    return productsList.map(product => {
        const isProductUnavailable = (product.available === false || product.available === "false");
        const isDisabled = !isShopOpen || isProductUnavailable;
        const hasValidBadge = product.badge && product.badge !== "0" && product.badge.trim() !== "" && product.badge.toLowerCase() !== "none";
        const badgeHtml = hasValidBadge ? `<div class="badge-box"><span class="badge">${product.badge}</span></div>` : '';

        return `
            <div class="product-card" style="${isDisabled ? 'opacity: 0.90; background: #f8ebeb;' : ''}">
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
            
            // 🌟🌟🌟 මෙන්න මේ HTML කොටස වෙනස් කරන්න (cart-item-row class එක යෙදීම) 🌟🌟🌟
            html += `
                <div class="cart-item-row">
                    <span class="cart-item-name">${cart[id]}x ${prod.name}</span>
                    <b class="cart-item-price">Rs. ${itemTotal.toFixed(2)}</b>
                </div>
            `;
            // 🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟🌟
        }
    }

    // (Takeaway charges කොටස එලෙසම තබා ගන්න)
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

            <!-- 🌟 Table QR නම් රෝස පාට බටන් එකත්, Outside QR නම් කොළ පාට WhatsApp බටන් එකත් පමණක් පෙන්වීම -->
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                ${isTableQR 
                    ? `<button onclick="submitOrder(false)" style="width: 100%; padding: 12px; background: #db2777; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem;">✅ Confirm Order Only</button>`
                    : `<button onclick="submitOrder(true)" style="width: 100%; padding: 12px; background: #22c55e; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem;">📲 Confirm & Send via WhatsApp</button>`
                }
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
        table: finalTableType,
        type: finalOrderTypeStr, 
        customerName: nameInput,
        phone: phoneInput || 'Not Provided',
        pickupTime: pickupTimeInput || 'ASAP',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        if (data.success && data.order) {
            // 🌟 සර්වර් එකෙන් ලැබෙන ID එක සහ Secret Key එක LocalStorage හි සුරක්ෂිත කිරීම
            let myOrders = JSON.parse(localStorage.getItem('cafeCustomerOrders') || '[]');
            myOrders.push({
                id: data.order.id,
                secretKey: data.order.secretKey
            });
            localStorage.setItem('cafeCustomerOrders', JSON.stringify(myOrders));
        }

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

            let waMessage = `🧾 *NEW ORDER - ${data.success ? data.order.id : ''}*\n` +
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


// 🌟 ආරක්ෂිතව පාරිභෝගිකයාගේ ඇණවුම් තත්ත්වය පරීක්ෂා කිරීම
async function checkMyOrderStatus() {
    let myOrders = JSON.parse(localStorage.getItem('cafeCustomerOrders') || '[]');
    const trackerContainer = document.getElementById('live-order-tracker');

    if (myOrders.length === 0) {
        if (trackerContainer) trackerContainer.style.display = 'none';
        const floatingBubble = document.getElementById('floating-live-bubble');
        if (floatingBubble) floatingBubble.style.display = 'none';
        return;
    }

    try {
        let activeOrdersList = [];
        let paidTimestamps = JSON.parse(localStorage.getItem('cafePaidTimestamps') || '{}');
        let currentTime = Date.now();

        for (let orderObj of myOrders) {
            let orderId = typeof orderObj === 'object' ? orderObj.id : orderObj;
            let secretKey = typeof orderObj === 'object' ? orderObj.secretKey : '';

            const res = await fetch('/api/customer-order-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, secretKey })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.order) {
                    let serverOrder = data.order;
                    let status = (serverOrder.status || '').toLowerCase();
                    let paymentStatus = (serverOrder.paymentStatus || '').toLowerCase();
                    
                    let isPaidOrCompleted = (status === 'paid' || status === 'completed' || paymentStatus === 'paid');

                    if (isPaidOrCompleted) {
                        if (!paidTimestamps[serverOrder.id]) {
                            paidTimestamps[serverOrder.id] = currentTime;
                            localStorage.setItem('cafePaidTimestamps', JSON.stringify(paidTimestamps));
                        }

                        let elapsed = currentTime - paidTimestamps[serverOrder.id];
                        if (elapsed >= 60000) { 
                            myOrders = myOrders.filter(item => (typeof item === 'object' ? item.id !== serverOrder.id : item !== serverOrder.id));
                            localStorage.setItem('cafeCustomerOrders', JSON.stringify(myOrders));
                            continue; 
                        }
                    }

                    if (status === 'cancelled') {
                        // මෙහි තිබූ ප්‍රධාන දෝෂය (MyOrders මඟින් 'myOrders' ලෙස නිවැරදි කර ඇත)
                        myOrders = myOrders.filter(item => (typeof item === 'object' ? item.id !== serverOrder.id : item !== serverOrder.id));
                        localStorage.setItem('cafeCustomerOrders', JSON.stringify(myOrders));
                        continue;
                    }

                    let completeOrder = {
                        ...(typeof orderObj === 'object' ? orderObj : {}),
                        ...serverOrder
                    };

                    activeOrdersList.push(completeOrder);
                }
            }
        }

        latestActiveOrders = activeOrdersList;
        currentOrdersCache = activeOrdersList; // Modal එකට අවශ්‍ය Cache එක යාවත්කාලීන කිරීම

        const floatingBubble = document.getElementById('floating-live-bubble');
        const bubbleCountEl = document.getElementById('bubble-order-count');

        if (latestActiveOrders.length > 0) {
            if (bubbleCountEl) bubbleCountEl.innerText = latestActiveOrders.length;
            renderAllCustomerBadges(latestActiveOrders);
            
            const existingModal = document.getElementById('all-orders-popup-modal');
            if (existingModal) {
                updateAllOrdersPopupContent(latestActiveOrders);
            }
        } else {
            if (trackerContainer) trackerContainer.style.display = 'none';
            if (floatingBubble) floatingBubble.style.display = 'none';
        }
    } catch (e) {
        console.error("Error checking customer orders status:", e);
    }
}

let currentOrdersCache = []; // දත්ත තබා ගැනීමට ගෝලීය විචල්‍යයක් (Global Cache)

function renderAllCustomerBadges(ordersList) {
    const trackerContainer = document.getElementById('live-order-tracker');
    if (!trackerContainer) return;

    trackerContainer.style.display = 'block';
    trackerContainer.style.margin = '8px auto'; 
    trackerContainer.style.width = '92%';
    trackerContainer.style.maxWidth = '650px';

    const latestOrder = ordersList[ordersList.length - 1];
    
    let currentStatus = (latestOrder.status || 'pending').toLowerCase();
    let paymentStatus = (latestOrder.paymentStatus || '').toLowerCase();
    
    let statusBg = '#FEF3C7'; 
    let statusText = '#92400E'; 
    let statusDisplay = 'Pending';

    if (currentStatus === 'preparing') { 
        statusBg = '#DBEAFE'; statusText = '#1E40AF'; statusDisplay = 'Preparing'; 
    } else if (currentStatus === 'ready') { 
        statusBg = '#D1FAE5'; statusText = '#065F46'; statusDisplay = 'Ready! 🎉'; 
    } else if (currentStatus === 'paid' || paymentStatus === 'paid') { 
        statusBg = '#CCFBF1'; statusText = '#0F766E'; statusDisplay = 'Paid 💳'; 
    } else if (currentStatus === 'completed') { 
        statusBg = '#F3F4F6'; statusText = '#4B5563'; statusDisplay = 'Completed'; 
    } else if (currentStatus === 'cancelled') { 
        statusBg = '#FEE2E2'; statusText = '#991B1B'; statusDisplay = 'Cancelled'; 
    }

    let viewAllBtnHtml = '';
    if (ordersList.length > 1) {
        viewAllBtnHtml = `
            <button onclick="showAllOrdersPopup()" style="
                background: transparent; border: 1px solid #d1d5db; border-radius: 100px;
                padding: 2px 10px; font-size: 0.65rem; font-weight: 600; color: #374151;
                cursor: pointer; transition: all 0.2s; margin-left: 8px;
            ">
                View All (${ordersList.length})
            </button>
        `;
    }

    let pickupTimeHtml = '';
    let pTime = latestOrder.pickupTime || latestOrder.time || '';
    if (pTime && pTime.toLowerCase() !== 'asap' && pTime.trim() !== '') {
        pickupTimeHtml = `
            <div style="font-size: 0.8rem; color: #374151; font-weight: 600; background: #F9FAFB; padding: 6px 10px; border-radius: 6px;">
                ⏰ Pickup Time: <span style="font-weight: 400; color: #4B5563;">${pTime}</span>
            </div>
        `;
    }

    // 🌟 යාවත්කාලීන කළ කොටස: orderType හෝ table විස්තර පරීක්ෂා කර Dine-in හෝ Takeaway නිවැරදිව තෝරා ගැනීම
    let rawType = (latestOrder.type || latestOrder.orderType || latestOrder.table || '').toLowerCase();
    let orderTypeText = 'Dine-in';

    if (rawType.includes('takeaway') || rawType.includes('take-away')) {
        orderTypeText = 'Takeaway';
    } else if (rawType.includes('dine') || rawType.includes('table')) {
        orderTypeText = rawType.includes('table') ? latestOrder.table : 'Dine-in';
    } else if (latestOrder.type) {
        orderTypeText = latestOrder.type;
    }

    let html = `
        <div style="
            background: #ffffff; 
            border: 1px solid #E5E7EB; 
            border-radius: 12px; 
            padding: 8px 12px; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            flex-direction: column;
            gap: 6px;
        ">
            <div style="
                display: flex; justify-content: space-between; align-items: center; 
                font-size: 0.75rem; color: #6B7280; font-weight: 500;
            ">
                <div style="display: flex; align-items: center;">
                    <span style="margin-right: 6px;">🔔</span> Live Order Status
                </div>
                <div style="display: flex; align-items: center;">
                    <span style="font-weight: 600; color: #111827;">${latestOrder.id}</span>
                    ${viewAllBtnHtml}
                </div>
            </div>

            ${pickupTimeHtml}

            <div style="
                display: flex; justify-content: space-between; align-items: center; 
                background: #F9FAFB; padding: 6px 10px; border-radius: 8px;
                border: 1px solid #F3F4F6;
            ">
                <span style="
                    background: #EEF2FF; color: #4F46E5; padding: 2px 8px; 
                    border-radius: 6px; font-size: 0.65rem; font-weight: 600; 
                    text-transform: capitalize;
                ">
                    📍 ${orderTypeText}
                </span>

                <span style="font-size: 0.9rem; font-weight: 700; color: #111827;">
                    Rs. ${Number(latestOrder.total || 0).toFixed(0)}
                </span>

                <span style="
                    background: ${statusBg}; color: ${statusText}; padding: 3px 10px; 
                    border-radius: 100px; font-size: 0.7rem; font-weight: 700;
                ">
                    ${statusDisplay}
                </span>
            </div>
        </div>
    `;
    trackerContainer.innerHTML = html;
}

function updateAllOrdersPopupContent(ordersList) {
    const container = document.getElementById('all-orders-list-container');
    if (!container) return;

    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.padding = '5px';

    container.innerHTML = ordersList.map(order => {
        let currentStatus = (order.status || 'pending').toLowerCase();
        let paymentStatus = (order.paymentStatus || '').toLowerCase();
        
        let statusBg = '#FEF3C7'; 
        let statusText = '#92400E'; 
        let statusDisplay = 'Pending';

        if (currentStatus === 'preparing') { 
            statusBg = '#DBEAFE'; statusText = '#1E40AF'; statusDisplay = 'Preparing'; 
        } else if (currentStatus === 'ready') { 
            statusBg = '#D1FAE5'; statusText = '#065F46'; statusDisplay = 'Ready! 🎉'; 
        } else if (currentStatus === 'paid' || paymentStatus === 'paid') { 
            statusBg = '#CCFBF1'; statusText = '#0F766E'; statusDisplay = 'Paid 💳'; 
        } else if (currentStatus === 'completed') { 
            statusBg = '#F3F4F6'; statusText = '#4B5563'; statusDisplay = 'Completed'; 
        } else if (currentStatus === 'cancelled') { 
            statusBg = '#FEE2E2'; statusText = '#991B1B'; statusDisplay = 'Cancelled'; 
        }

        let orderItemsList = order.items || order.orderItems || order.cart || order.products || [];
        let itemsHtml = '<div style="font-size: 0.75rem; color: #6B7280;">No items found</div>';
        
        if (Array.isArray(orderItemsList) && orderItemsList.length > 0) {
            itemsHtml = orderItemsList.map(i => `<div style="font-size: 0.75rem; color: #4B5563;">• ${i.qty || i.quantity || 1}x ${i.name || i.productName || i.title || 'Item'}</div>`).join('');
        }

        // 🌟 යාවත්කාලීන කළ කොටස: orderType, type හෝ table විස්තර පරීක්ෂා කර නිවැරදි වර්ගය ලබා ගැනීම
        let rawType = (order.type || order.orderType || order.table || '').toLowerCase();
        let orderTypeText = 'Dine-in';

        if (rawType.includes('takeaway') || rawType.includes('take-away')) {
            orderTypeText = 'Takeaway';
        } else if (rawType.includes('dine') || rawType.includes('table')) {
            orderTypeText = rawType.includes('table') ? order.table : 'Dine-in';
        } else if (order.type) {
            orderTypeText = order.type;
        }

        return `
            <div style="
                background: #ffffff; border: 1px solid #E5E7EB; border-radius: 12px; 
                padding: 10px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                display: flex; flex-direction: column; gap: 6px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem;">
                    <span style="font-weight: 700; color: #111827;">${order.id || 'Order'}</span>
                    <span style="
                        background: #EEF2FF; color: #4F46E5; padding: 2px 8px; 
                        border-radius: 6px; font-weight: 600; text-transform: capitalize; font-size: 0.65rem;
                    ">
                        📍 ${orderTypeText}
                    </span>
                </div>

                <div style="background: #F9FAFB; padding: 6px 8px; border-radius: 6px;">
                    <div style="font-size: 0.7rem; font-weight: 600; color: #374151; margin-bottom: 2px;">Ordered Items:</div>
                    ${itemsHtml}
                </div>

                <div style="
                    display: flex; justify-content: space-between; align-items: center; 
                    border-top: 1px solid #F3F4F6; padding-top: 6px;
                ">
                    <span style="font-size: 0.9rem; font-weight: 700; color: #111827;">
                        Rs. ${Number(order.total || 0).toFixed(0)}
                    </span>
                    <span style="
                        background: ${statusBg}; color: ${statusText}; padding: 3px 10px; 
                        border-radius: 100px; font-size: 0.7rem; font-weight: 700;
                    ">
                        ${statusDisplay}
                    </span>
                </div>
            </div>
        `;
    }).join('');
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
    
    // දැන් මෙහි `currentOrdersCache` පාවිච්චි කරන නිසා ඩේටා නැතිවීමේ ප්‍රශ්නය එන්නේ නැත
    updateAllOrdersPopupContent(currentOrdersCache);
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

// Scroll වන විට මුල් Live Tracker එක පෙනේදැයි බලා Bubble එක පාලනය කිරීම
window.addEventListener('scroll', function() {
    const liveTracker = document.getElementById('live-order-tracker');
    const floatingBubble = document.getElementById('floating-live-bubble');
    
    if (liveTracker && liveTracker.style.display !== 'none') {
        const rect = liveTracker.getBoundingClientRect();
        // Tracker එක screen එකෙන් උඩට මතු වී ගියහොත් (Hidden නම්)
        if (rect.bottom < 0) {
            floatingBubble.style.display = 'flex';
        } else {
            floatingBubble.style.display = 'none';
        }
    }
});

// 🌟 Bubble එක click කළ විට 'View All Orders' මෝඩල් එක විවෘත කිරීම
function toggleLiveOrderModal() {
    const modal = document.getElementById('all-orders-popup-modal'); // 'View All' මෝඩලය Open කිරීම
    
    if (modal) {
        if (modal.style.display === 'flex') {
            modal.style.setProperty('display', 'none', 'important');
        } else {
            modal.style.setProperty('display', 'flex', 'important');
            // මෝඩලය විවෘත වූ විට අලුත්ම දත්ත එයට Load වී ඇති බවට වග බලා ගැනීම
            if (typeof latestActiveOrders !== 'undefined' && latestActiveOrders.length > 0) {
                 updateAllOrdersPopupContent(latestActiveOrders);
            }
        }
    } else {
        // මෝඩලය තවමත් නිර්මාණය වී නැතිනම් (පළමු වතාවට) showAllOrdersPopup() එක අමතන්න
        if (typeof showAllOrdersPopup === 'function') {
            showAllOrdersPopup();
        }
    }
}