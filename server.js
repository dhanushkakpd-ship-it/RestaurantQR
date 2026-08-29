const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer'); 
const mongoose = require('mongoose'); 
const cloudinary = require('cloudinary').v2;

const app = express();

// 🌟 413 (Payload Too Large) දෝෂය වැළැක්වීම සඳහා සීමාව වැඩි කිරීම (10MB දක්වා)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(cors());

// Current directory එක static ලෙස Serve කිරීම (Frontend එක සඳහා)
app.use(express.static(__dirname));

// ==========================================
// ☁️ CLOUDINARY CONFIGURATION
// ==========================================
cloudinary.config({
    cloud_name: 'euc8lhe4',
    api_key: '954832384958133',
    api_secret: '_ZDWlH2YPmv_l6H__UulHDpv2Yk'
});

// Multer Memory Storage සැකසීම (ෆයිල් ලෝකල් ඩිස්ක් එකේ සේව් නොකර බෆර් එක හරහා Cloudinary යැවීමට)
const upload = multer({ storage: multer.memoryStorage() });

// Cloudinary වෙත ඉමේජ් අප්ලෝඩ් කිරීම සඳහා වන Helper Function එක
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

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dhanushkakpd_db_user:8qagi82&imRKVhC@cluster0.xgi1etr.mongodb.net/cafe_dn?retryWrites=true&w=majority&appName=Cluster0';

// Mongoose Models නිර්මාණය කිරීම
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

// Default Admin කෙනෙක් සෑදීමේ ෆන්ක්ෂන් එක (Username: admin, Password: 123)
async function createDefaultAdmin() {
    try {
        const count = await Admin.countDocuments();
        if (count === 0) {
            await Admin.create({ username: 'admin', password: '123' });
            console.log('👤 Default Admin Created: username -> admin | password -> 123');
        }
    } catch (err) {
        console.error('Error creating default admin:', err);
    }
}


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

app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        if (Array.isArray(req.body)) {
            await Product.deleteMany({});
            const savedProducts = await Product.insertMany(req.body);
            return res.json({ success: true, message: 'Products saved successfully', products: savedProducts });
        }

        const { id, name, category, price, description, existingImage, ...otherFields } = req.body;

        let imagePath = existingImage || '';
        if (req.file) {
            // Cloudinary වෙත Product Image එක Upload කිරීම
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

        console.log('Product saved to DB with Cloudinary Image:', updatedProduct.name);
        res.json({ success: true, message: 'Product saved successfully', product: updatedProduct });
    } catch (error) {
        console.error("Error saving product:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Product.deleteOne({ id: id });
        const remainingProducts = await Product.find({});
        console.log(`Product ${id} deleted from DB.`);
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

app.post('/api/categories', upload.single('image'), async (req, res) => {
    try {
        if (Array.isArray(req.body)) {
            await Category.deleteMany({});
            const savedCategories = await Category.insertMany(req.body);
            return res.json({ success: true, message: 'Categories saved successfully', categories: savedCategories });
        }

        const { id, name, takeawayCharge, existingImage } = req.body;

        let imagePath = existingImage || '';
        if (req.file) {
            // Cloudinary වෙත Category Image එක Upload කිරීම
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'cafe_dn/categories');
            imagePath = uploadResult.secure_url;
        }

        const categoryId = id && id !== '' ? id : 'CAT-' + Date.now();
        
        let categoryData = {
            id: categoryId,
            name: name || '',
            takeawayCharge: parseFloat(takeawayCharge) || 0,
            image: imagePath
        };

        const updatedCategory = await Category.findOneAndUpdate(
            { id: categoryId },
            categoryData,
            { upsert: true, new: true }
        );

        console.log('Category saved to DB with Cloudinary Image:', updatedCategory.name);
        res.json({ success: true, message: 'Category saved successfully', category: updatedCategory });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Category.deleteOne({ id: id });
        const remainingCategories = await Category.find({});
        console.log(`Category ${id} deleted from DB.`);
        res.json({ success: true, message: 'Category deleted successfully', categories: remainingCategories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ==========================================
// --- Orders APIs ---
// ==========================================
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
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

app.put('/api/orders/:id', async (req, res) => {
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

app.delete('/api/orders', async (req, res) => {
    try {
        await Order.deleteMany({});
        console.log("✅ සියලුම Orders සාර්ථකව ඩේටාබේස් එකෙන් මකා දැමුණා!");
        res.status(200).json({ success: true, message: "All orders cleared successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Order.deleteOne({ id: id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        console.log(`✅ Order ${id} deleted successfully from database.`);
        res.json({ success: true, message: `Order ${id} deleted successfully` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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

app.post('/api/shop-status', async (req, res) => {
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
// --- Admin Login API ---
// ==========================================
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username, password });
        if (admin) {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, message: 'වැරදි Username එකක් හෝ Password එකක්!' });
        }
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
        
        // ඩේටාබේස් එක සම්බන්ධ වූ පසු Default Admin සෑදීම
        await createDefaultAdmin();

        app.listen(PORT, () => {
            console.log(`🚀 CAFE DN Server running on port ${PORT}`);
            console.log(`☁️ Cloudinary Connected Successfully!`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
    });