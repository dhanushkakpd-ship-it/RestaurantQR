const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // පින්තූර අප්ලෝඩ් කිරීමට

const app = express();

// 🌟 413 (Payload Too Large) දෝෂය වැළැක්වීම සඳහා සීමාව වැඩි කිරීම (10MB දක්වා)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(cors());

// Current directory එක static ලෙස Serve කිරීම
app.use(express.static(__dirname));

// 🌟 1. Categories සහ Products සඳහා වෙනම ෆෝල්ඩර් සැකසීම (ප්‍රොජෙක්ට් ෆෝල්ඩර් එක ඇතුළෙන්ම හැදෙන පරිදි)
const uploadBaseDir = path.join(__dirname, 'images');

const categoryUploadDir = path.join(uploadBaseDir, 'Category_img');
if (!fs.existsSync(categoryUploadDir)) {
    fs.mkdirSync(categoryUploadDir, { recursive: true });
}

const productUploadDir = path.join(uploadBaseDir, 'Product_img');
if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir, { recursive: true });
}

// 🌟 2. මෙම ෆෝල්ඩර් Static ලෙස බ්‍රවුසරයට ලබා දීම (Render සහ Local දෙකටම වැඩ කරයි)
app.use('/images', express.static(uploadBaseDir));


// 🌟 3. Multer Storage Setup (Categories සඳහා)
const categoryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, categoryUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cat-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadCategory = multer({ storage: categoryStorage });

// 🌟 4. Multer Storage Setup (Products සඳහා)
const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, productUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'prod-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadProduct = multer({ storage: productStorage });

// 📁 Database File එක සඳහා Path එක
const DB_FILE = path.join(__dirname, 'database.json');

// ඩේටා කියවා ගැනීම සහ සියලුම Keys නිවැරදිව පවතින බව තහවුරු කිරීම (Robust LoadDB)
function loadDB() {
    if (fs.existsSync(DB_FILE)) {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            const parsed = JSON.parse(data);
            return {
                products: Array.isArray(parsed.products) ? parsed.products : [],
                categories: Array.isArray(parsed.categories) ? parsed.categories : [],
                orders: Array.isArray(parsed.orders) ? parsed.orders : [],
                shopStatus: parsed.shopStatus || { isOpen: true }
            };
        } catch (e) {
            console.error("Error parsing database.json, resetting structure:", e);
            return { products: [], categories: [], orders: [], shopStatus: { isOpen: true } };
        }
    }
    // database.json නොමැති නම් මුලින්ම හිස් structure එකක් සෑදීම
    const initialData = { products: [], categories: [], orders: [], shopStatus: { isOpen: true } };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
}

// ඩේටා සේව් කිරීම (Save)
function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// --- Products APIs ---
app.get('/api/products', (req, res) => {
    const db = loadDB();
    res.json(db.products || []);
});

app.post('/api/products', uploadProduct.single('image'), (req, res) => {
    const db = loadDB();

    if (Array.isArray(req.body)) {
        db.products = req.body;
        saveDB(db);
        return res.json({ success: true, message: 'Products saved successfully' });
    }

    const { id, name, category, price, description, existingImage, ...otherFields } = req.body;
    
    let imagePath = existingImage || '';
    if (req.file) {
        imagePath = `/images/Product_img/${req.file.filename}`;
    }

    if (!db.products) db.products = [];

    const productId = id && id !== '' ? id : 'PROD-' + Date.now();
    const existingIndex = db.products.findIndex(p => p.id === productId);

    const productData = {
        id: productId,
        name: name || '',
        category: category || '',
        price: parseFloat(price) || 0,
        description: description || '',
        image: imagePath,
        ...otherFields 
    };

    if (existingIndex > -1) {
        db.products[existingIndex] = { 
            ...db.products[existingIndex], 
            ...productData,
            image: req.file ? imagePath : (db.products[existingIndex].image || '')
        };
    } else {
        db.products.push(productData);
    }

    saveDB(db);
    console.log('Product saved with image. Total items:', db.products.length);
    res.json({ success: true, message: 'Product saved successfully', product: productData });
});

app.delete('/api/products/:id', (req, res) => {
    const db = loadDB();
    const { id } = req.params;
    db.products = (db.products || []).filter(p => p.id !== id && p !== id);
    saveDB(db);
    console.log(`Product ${id} deleted. Remaining:`, db.products.length);
    res.json({ success: true, message: 'Product deleted successfully', products: db.products });
});

// --- Categories APIs ---
app.get('/api/categories', (req, res) => {
    const db = loadDB();
    res.json(db.categories || []);
});

app.post('/api/categories', uploadCategory.single('image'), (req, res) => {
    const db = loadDB();

    if (Array.isArray(req.body)) {
        db.categories = req.body;
        saveDB(db);
        return res.json({ success: true, message: 'Categories saved successfully' });
    }

    const { id, name, takeawayCharge, existingImage } = req.body;
    
    let imagePath = existingImage || '';
    if (req.file) {
        imagePath = `/images/Category_img/${req.file.filename}`;
    }

    if (!db.categories) db.categories = [];

    const categoryId = id && id !== '' ? id : 'CAT-' + Date.now();
    const existingIndex = db.categories.findIndex(c => c.id === categoryId);

    const categoryData = {
        id: categoryId,
        name: name || '',
        takeawayCharge: parseFloat(takeawayCharge) || 0,
        image: imagePath
    };

    if (existingIndex > -1) {
        db.categories[existingIndex] = { 
            ...db.categories[existingIndex], 
            ...categoryData,
            image: req.file ? imagePath : (db.categories[existingIndex].image || '')
        };
    } else  {
        db.categories.push(categoryData);
    }

    saveDB(db);
    console.log('Category saved with image. Total items:', db.categories.length);
    res.json({ success: true, message: 'Category saved successfully', category: categoryData });
});

app.delete('/api/categories/:id', (req, res) => {
    const db = loadDB();
    const { id } = req.params;
    db.categories = (db.categories || []).filter(c => c.id !== id && c !== id);
    saveDB(db);
    console.log(`Category ${id} deleted. Remaining:`, db.categories.length);
    res.json({ success: true, message: 'Category deleted successfully', categories: db.categories });
});

// --- Orders APIs ---
app.get('/api/orders', (req, res) => {
    const db = loadDB();
    res.json(db.orders || []);
});

app.post('/api/orders', (req, res) => {
    const db = loadDB();
    const newOrder = {
        id: `ORD-${Math.floor(100 + Math.random() * 900)}`,
        status: 'pending',
        paymentStatus: 'unpaid',
        createdAt: new Date(),
        ...req.body
    };
    if (!db.orders) db.orders = [];
    db.orders.push(newOrder);
    saveDB(db);
    res.status(201).json({ success: true, order: newOrder });
});

app.put('/api/orders/:id', (req, res) => {
    const db = loadDB();
    const { id } = req.params;
    const orderIndex = (db.orders || []).findIndex(o => o.id === id);

    if (orderIndex === -1) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.body.status !== undefined) {
        db.orders[orderIndex].status = req.body.status;
    }
    if (req.body.paymentStatus !== undefined) {
        db.orders[orderIndex].paymentStatus = req.body.paymentStatus;
    }

    saveDB(db);
    res.json({ success: true, order: db.orders[orderIndex] });
});

app.delete('/api/orders', (req, res) => {
    try {
        const db = loadDB();
        db.orders = []; 
        saveDB(db);    

        console.log("✅ සියලුම Orders සාර්ථකව මකා දැමුණා!");
        res.status(200).json({ success: true, message: "All orders cleared successfully" });
    } catch (error) {
        console.error("Error clearing orders:", error);
        res.status(500).json({ success: false, error: "Failed to clear orders" });
    }
});

// 🌟 තනි Order එකක් ID එක මඟින් ඩේටාබේස් එකෙන් මකා දැමීම සඳහා DELETE Route එක (app.listen එකට ඉහළට ගෙන එන ලදී)
app.delete('/api/orders/:id', (req, res) => {
    try {
        const db = loadDB();
        const { id } = req.params;

        if (!db.orders) {
            db.orders = [];
        }

        const initialLength = db.orders.length;
        db.orders = db.orders.filter(order => order.id !== id);

        if (db.orders.length === initialLength) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        saveDB(db);
        console.log(`✅ Order ${id} deleted successfully from database.`);
        res.json({ success: true, message: `Order ${id} deleted successfully` });
    } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).json({ success: false, error: "Failed to delete order" });
    }
});

// --- Shop Status APIs ---
app.get('/api/shop-status', (req, res) => {
    const db = loadDB();
    res.json(db.shopStatus || { isOpen: true });
});

app.post('/api/shop-status', (req, res) => {
    const db = loadDB();
    const { isOpen } = req.body;
    
    db.shopStatus = { isOpen: isOpen };
    saveDB(db);
    
    res.json(db.shopStatus);
});

// Port භාවිතය (සියලුම Routes වලට පසුව තැබීම නිවැරදියි)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 CAFE DN Server running on port ${PORT}`);
    console.log(`📁 Category Images: ${categoryUploadDir}`);
    console.log(`📁 Product Images: ${productUploadDir}`);
});