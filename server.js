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
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const allowedOrigins = [
    'https://cafe-dn-app.onrender.com',
    'http://localhost:5000',
    'http://localhost:3000'
];

app.use(cors({
    origin: function (origin, callback) {
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

// public වෙනුවට ප්‍රධාන ෆෝල්ඩරයම static ලෙස ලබා දීම
app.use(express.static(path.join(__dirname)));

const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    standardHeaders: true, 
    legacyHeaders: false, 
    message: { 
        success: false, 
        message: 'ප්‍රවේශ වීමේ උත්සාහයන් අධිකයි! කරුණාකර විනාඩි 1 කින් පසු නැවත උත්සාහ කරන්න.' 
    }
});

const generalApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        success: false, 
        message: 'අධික ඉල්ලීම් ප්‍රමාණයක් යවා ඇත! කරුණාකර ටික වේලාවකින් නැවත උත්සාහ කරන්න.' 
    }
});

app.use('/api/', generalApiLimiter);

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

if (!process.env.JWT_SECRET) {
    console.error('❌ දෝෂයකි: JWT_SECRET පරිසර විචල්‍යය අර්ථ දක්වා නැත!');
    process.exit(1); 
}
const JWT_SECRET = process.env.JWT_SECRET;

if (!process.env.MONGO_URI) {
    console.error('❌ දෝෂයකි: MONGO_URI පරිසර විචල්‍යය අර්ථ දක්වා නැත!');
    process.exit(1);
}
const MONGO_URI = process.env.MONGO_URI;

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
    secretKey: { type: String, required: true }, 
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
            console.log('👤 Default Admin Created: username -> admin | password -> 123');
        }
    } catch (err) {
        console.error('Error creating default admin:', err);
    }
}

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
            return res.status(403).json({ success: false, message: 'Token එක කල් ඉකුත් වී ඇත!' });
        }
        req.admin = decoded;
        next();
    });
};

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

        // 🌟 otherFields ඉවත් කර ඇත
        const { id, name, category, price, description, existingImage, oldPrice, badge, available, visible } = req.body;

        if (id !== undefined && typeof id !== 'string') {
            return res.status(400).json({ success: false, message: 'අවලංගු ID ආකෘතියකි!' });
        }
        if (name !== undefined && typeof name !== 'string') {
            return res.status(400).json({ success: false, message: 'අවලංගු නමක ආකෘතියකි!' });
        }

        let imagePath = existingImage || '';
        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'cafe_dn/products');
            imagePath = uploadResult.secure_url;
        }

        const productId = id && typeof id === 'string' && id !== '' ? id : 'PROD-' + crypto.randomBytes(4).toString('hex');
        
        // 🌟 ...otherFields වෙනුවට සියලු fields විවෘතව සහ ආරක්ෂිතව දක්වා ඇත
        const updatedProduct = await Product.findOneAndUpdate(
            { id: String(productId) },
            {
                id: String(productId),
                name: typeof name === 'string' ? name : '',
                category: typeof category === 'string' ? category : '',
                price: parseFloat(price) || 0,
                oldPrice: oldPrice !== undefined && oldPrice !== '' ? parseFloat(oldPrice) : 0,
                description: typeof description === 'string' ? description : '',
                image: String(imagePath),
                badge: typeof badge === 'string' ? badge : '',
                available: available === 'true' || available === true,
                visible: visible === 'true' || visible === true
            },
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
        if (!id || typeof id !== 'string' || id.length > 50) {
            return res.status(400).json({ success: false, message: 'අවලංගු හැඳුනුම්මකි!' });
        }

        await Product.deleteOne({ id: id });
        const remainingProducts = await Product.find({});
        res.json({ success: true, message: 'Product deleted successfully', products: remainingProducts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

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

        // 🌟 id සහ name සඳහා දැඩි වර්ග පරීක්ෂාවන් (Type validations)
        if (id !== undefined && typeof id !== 'string') {
            return res.status(400).json({ success: false, message: 'අවලංගු ID ආකෘතියකි!' });
        }
        if (name !== undefined && typeof name !== 'string') {
            return res.status(400).json({ success: false, message: 'අවලංගු නමක ආකෘතියකි!' });
        }

        let imagePath = existingImage || '';
        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'cafe_dn/categories');
            imagePath = uploadResult.secure_url;
        }

        const categoryId = id && typeof id === 'string' && id !== '' ? id : 'CAT-' + crypto.randomBytes(4).toString('hex');
        
        // 🌟 categoryData variable එක භාවිත නොකර, ඍජුවම දත්ත මෙහි ඇතුළත් කර ඇත
        const updatedCategory = await Category.findOneAndUpdate(
            { id: String(categoryId) },
            {
                id: String(categoryId),
                name: typeof name === 'string' ? name : '',
                takeawayCharge: parseFloat(takeawayCharge) || 0,
                sortOrder: sortOrder !== undefined && sortOrder !== '' ? Number(sortOrder) : 0,
                image: String(imagePath)
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'Category saved successfully', category: updatedCategory });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/orders', verifyAdminToken, async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/orders', [
    body('name').optional().trim().escape(),
    body('phone').optional().trim().isLength({ min: 9, max: 15 }).withMessage('වලංගු දුරකථන අංකයක් ලබා දෙන්න!').escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const secretKey = 'SEC-' + crypto.randomBytes(16).toString('hex');
        const randomNum = crypto.randomInt(1000, 10000);

        const newOrderData = {
            id: `ORD-${randomNum}`,
            status: 'pending',
            paymentStatus: 'unpaid',
            secretKey: secretKey,
            createdAt: new Date(),
            ...req.body
        };
        const newOrder = await Order.create(newOrderData);
        
        res.status(201).json({ 
            success: true, 
            order: {
                id: newOrder.id,
                status: newOrder.status,
                paymentStatus: newOrder.paymentStatus,
                secretKey: newOrder.secretKey
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/customer-order-status', async (req, res) => {
    try {
        const { orderId, secretKey } = req.body;
        
        if (!orderId || typeof orderId !== 'string' || !secretKey || typeof secretKey !== 'string') {
            return res.status(400).json({ success: false, message: 'Order ID සහ SecretKey අනිවාර්යයෙන්ම string විය යුතුය!' });
        }

        const order = await Order.findOne({ id: orderId, secretKey: secretKey });

        if (!order) {
            return res.status(404).json({ success: false, message: 'අවසර නැත හෝ ඇණවුම සොයාගත නොහැකිය!' });
        }

        res.json({
            success: true,
            order: {
                id: order.id,
                status: order.status,
                paymentStatus: order.paymentStatus,
                orderType: order.orderType || order.type || 'N/A',
                createdAt: order.createdAt,
                total: order.total,
                items: order.items || order.orderItems || order.cart || []
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/orders/:id', verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || typeof id !== 'string' || id.length > 50) {
            return res.status(400).json({ success: false, message: 'අවලංගු හැඳුනුම්මකි!' });
        }

        let updateData = {};
        
        // 🌟 status සහ paymentStatus අගයන් සැබවින්ම string එකක් දැයි පරීක්ෂා කිරීම
        if (req.body.status !== undefined) {
            if (typeof req.body.status !== 'string') {
                return res.status(400).json({ success: false, message: 'අවලංගු තත්ත්ව ආකෘතියකි!' });
            }
            updateData.status = req.body.status;
        }

        if (req.body.paymentStatus !== undefined) {
            if (typeof req.body.paymentStatus !== 'string') {
                return res.status(400).json({ success: false, message: 'අවලංගු ගෙවීම් තත්ත්ව ආකෘතියකි!' });
            }
            updateData.paymentStatus = req.body.paymentStatus;
        }

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
        if (!id || typeof id !== 'string' || id.length > 50) {
            return res.status(400).json({ success: false, message: 'අවලංගු හැඳුනුම්මකි!' });
        }

        const result = await Order.deleteOne({ id: id });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, message: `Order ${id} deleted successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

app.post('/api/admin/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
            return res.status(400).json({ success: false, message: 'වලංගු නොවන ආදානයකි!' });
        }

        const admin = await Admin.findOne({ username: username });
        if (!admin) {
            return res.status(401).json({ success: false, message: 'වැරදි Username එකක් හෝ Password එකක්!' });
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'වැරදි Username එකක් හෝ Password එකක්!' });
        }

        const token = jwt.sign({ username: admin.username }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ success: true, message: 'Login successful', token: token });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB Database Connected Successfully!');
        await createDefaultAdmin();
        app.listen(PORT, () => {
            console.log(`🚀 CAFE DN Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
    });