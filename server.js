require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer'); 
const mongoose = require('mongoose'); 
const cloudinary = require('cloudinary').v2;
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 
const rateLimit = require('express-rate-limit'); 
const { body, validationResult } = require('express-validator'); // 🌟 Express-validator එකතු කරන ලදී

const app = express();

// 🌟 413 (Payload Too Large) දෝෂය වැළැක්වීම සඳහා සීමාව වැඩි කිරීම (10MB දක්වා)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 🌟 CORS ආරක්ෂාව තහවුරු කිරීම (ඔබේ Live ඩොමේන් එකට පමණක් සීමා කරන ලදී)
const allowedOrigins = [
    'https://cafe-dn-app.onrender.com',
    'http://localhost:5000', // Local development සඳහා අවශ්‍ය නම් පමණි
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Postman හෝ Server-to-server ඉල්ලීම් (origin නැති ඒවා) සඳහා ඉඩ දීම
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy violation: This origin is not allowed.'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Current directory එක static ලෙස Serve කිරීම (Frontend එක සඳහා)
app.use(express.static(__dirname));

// ==========================================
// 🛡️ RATE LIMITER CONFIGURATION (Brute-Force වැළැක්වීමට)
// ==========================================
const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // විනාඩි 1 ක කාල සීමාවක් තුළ
    max: 5, // උපරිම වාර 5කට වඩා උත්සාහ කළහොත් අවහිර වේ
    standardHeaders: true, 
    legacyHeaders: false, 
    message: { 
        success: false, 
        message: 'ප්‍රවේශ වීමේ උත්සාහයන් අධිකයි! කරුණාකර විනාඩි 1 කින් පසු නැවත උත්සාහ කරන්න.' 
    }
});


// ==========================================
// ☁️ CLOUDINARY CONFIGURATION (.env හරහා)
// ==========================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ storage: multer.memoryStorage() });

const uploadToCloudinary = (buffer, folderName) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: folderName },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(buffer);
    });
};


// ==========================================
// 🌐 MONGODB CONNECTION & SCHEMAS SETUP
// ==========================================

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'cafe_dn_super_secret_key_2026';

const Product = mongoose.model('Product', new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, default: '' },
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    description: { type: String },
    image: { type: String },
    badge: { type: String },
    available: { type: Boolean, default: true },
    visible: { type: Boolean, default: true }
}, { strict: false }));

const Category = mongoose.model('Category', new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    takeawayCharge: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
    image: { type: String }
}, { strict: false }));

const Order = mongoose.model('Order', new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    status: { type: String, default: 'pending' },
    paymentStatus: { type: String, default: 'unpaid' },
    createdAt: { type: Date, default: Date.now }
}, { strict: false }));

const ShopStatus = mongoose.model('ShopStatus', new mongoose.Schema({
    isOpen: { type: Boolean, default: true }
}));

const Admin = mongoose.model('Admin', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

async function createDefaultAdmin() {
    try {
        const count = await Admin.countDocuments();
        if (count === 0) {
            const hashedPassword = await bcrypt.hash('123', 10);
            await Admin.create({ username: 'admin', password: hashedPassword });
            console.log('👤 Default Admin Created: username -> admin | password -> 123 (Secured with Hash)');
        }
    } catch (err) {
        console.error('Error creating default admin:', err);
    }
}


// ==========================================
// 🛡️ AUTHENTICATION MIDDLEWARE (JWT Verification)
// ==========================================
const verifyAdminToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'ප්‍රවේශ වීම සඳහා Token එකක් අවශ්‍ය වේ!' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'අවලංගු Token ආකෘතියකි!' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token එක අගය කිරීමට නොහැකිය හෝ කල් ඉකුත් වී ඇත!' });
        }
        req.admin = decoded;
        next();
    });
};


// ==========================================
// --- Products APIs ---
// ==========================================
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/products', verifyAdminToken, upload.single('image'), async (req, res) => {
    try {
        if (Array.isArray(req.body)) {
            await Product.deleteMany({});
            const savedProducts = await Product.insertMany(req.body);
            return res.json({ success: true, message: 'Products saved successfully', products: savedProducts });
        }

        const { id, name, category, price, description, existingImage, ...otherFields } = req.body;

        let imagePath = existingImage || '';
        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'cafe_dn/products');
            imagePath = uploadResult.secure_url;
        }

        const productId = id && id !== '' ? id : 'PROD-' + Date.now();
        
        let productData = {
            id: productId,
            name: name || '',
            category: category || '',
            price: parseFloat(price) || 0,
            description: description || '',
            image: imagePath,
            ...otherFields
        };

        const updatedProduct = await Product.findOneAndUpdate(
            { id: productId },
            productData,
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'Product saved successfully', product: updatedProduct });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/products/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        await Product.deleteOne({ id: id });
        const remainingProducts = await Product.find({});
        res.json({ success: true, message: 'Product deleted successfully', products: remainingProducts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ==========================================
// --- Categories APIs ---
// ==========================================
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find({});
        res.json(categories);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/categories', verifyAdminToken, upload.single('image'), async (req, res) => {
    try {
        if (Array.isArray(req.body)) {
            await Category.deleteMany({});
            const savedCategories = await Category.insertMany(req.body);
            return res.json({ success: true, message: 'Categories saved successfully', categories: savedCategories });
        }

        const { id, name, takeawayCharge, sortOrder, existingImage } = req.body;

        let imagePath = existingImage || '';
        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'cafe_dn/categories');
            imagePath = uploadResult.secure_url;
        }

        const categoryId = id && id !== '' ? id : 'CAT-' + Date.now();
        
        let categoryData = {
            id: categoryId,
            name: name || '',
            takeawayCharge: parseFloat(takeawayCharge) || 0,
            sortOrder: sortOrder !== undefined && sortOrder !== '' ? Number(sortOrder) : 0,
            image: imagePath
        };

        const updatedCategory = await Category.findOneAndUpdate(
            { id: categoryId },
            categoryData,
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'Category saved successfully', category: updatedCategory });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/categories/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        await Category.deleteOne({ id: id });
        const remainingCategories = await Category.find({});
        res.json({ success: true, message: 'Category deleted successfully', categories: remainingCategories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ==========================================
// --- Orders APIs (Input Validation සහ Sanitization සමඟ) ---
// ==========================================
app.get('/api/orders', verifyAdminToken, async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/orders', [
    // පාරිභෝගිකයාගේ නම පරීක්ෂා කිරීම සහ XSS වැළැක්වීම
    body('name')
        .optional()
        .trim()
        .escape(),

    // දුරකථන අංකය පරීක්ෂා කිරීම (ඇත්නම් නිවැරදි ආකෘතියක තිබේදැයි බලයි)
    body('phone')
        .optional()
        .trim()
        .isLength({ min: 9, max: 15 })
        .withMessage('වලංගු දුරකථන අංකයක් ලබා දෙන්න!')
        .escape()
], async (req, res) => {
    // දෝෂ ඇත්නම් පරීක්ෂා කර ප්‍රතික්ෂේප කිරීම
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const newOrderData = {
            id: `ORD-${Math.floor(100 + Math.random() * 900)}`,
            status: 'pending',
            paymentStatus: 'unpaid',
            createdAt: new Date(),
            ...req.body
        };
        const newOrder = await Order.create(newOrderData);
        res.status(201).json({ success: true, order: newOrder });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/orders/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        let updateData = {};
        if (req.body.status !== undefined) updateData.status = req.body.status;
        if (req.body.paymentStatus !== undefined) updateData.paymentStatus = req.body.paymentStatus;

        const updatedOrder = await Order.findOneAndUpdate({ id: id }, updateData, { new: true });

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, order: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/orders', verifyAdminToken, async (req, res) => {
    try {
        await Order.deleteMany({});
        res.status(200).json({ success: true, message: "All orders cleared successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/orders/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Order.deleteOne({ id: id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, message: `Order ${id} deleted successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==========================================
// --- Shop Status APIs ---
// ==========================================
app.get('/api/shop-status', async (req, res) => {
    try {
        let status = await ShopStatus.findOne({});
        if (!status) {
            status = await ShopStatus.create({ isOpen: true });
        }
        res.json({ isOpen: status.isOpen });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/shop-status', verifyAdminToken, async (req, res) => {
    try {
        const { isOpen } = req.body;
        let status = await ShopStatus.findOne({});
        if (!status) {
            status = new ShopStatus({ isOpen: isOpen });
        } else {
            status.isOpen = isOpen;
        }
        await status.save();
        res.json({ isOpen: status.isOpen });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ==========================================
// --- Admin Login API (Rate Limiter එකතු කරන ලදී) ---
// ==========================================
app.post('/api/admin/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });
        
        if (!admin) {
            return res.status(401).json({ success: false, message: 'වැරදි Username එකක් හෝ Password එකක්!' });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'වැරදි Username එකක් හෝ Password එකක්!' });
        }

        const token = jwt.sign({ username: admin.username }, JWT_SECRET, { expiresIn: '2h' });

        res.json({ 
            success: true, 
            message: 'Login successful', 
            token: token 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ==========================================
// --- Start Server & DB Connection ---
// ==========================================
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB Database Connected Successfully!');
        
        await createDefaultAdmin();

        app.listen(PORT, () => {
            console.log(`🚀 CAFE DN Server running on port ${PORT}`);
            console.log(`☁️ Cloudinary Connected Successfully!`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
    });