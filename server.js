require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));


// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// MongoDB Atlas Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions'
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1-day expiration
}));

// File Upload Configuration (Multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: { type: String, default: 'user' },
    profilePicture: { type: String, default: '/default-profile.png' },
    cart: [
        {
            fragranceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fragrance' },
            size: String,
            quantity: { type: Number, default: 1 },
            price: Number
        }
    ]
});

const User = mongoose.model('User', userSchema);

const fragranceSchema = new mongoose.Schema({
    name: String,
    gender: String,
    brand: String,
    scent: [String],
    sizes: Object, // 30ml and 50ml
    top_notes: [String],
    longevity: String,
    sillage: String,
    season: [String],
    image: String
});

const Fragrance = mongoose.model('Fragrance', fragranceSchema);

// Middleware for authentication
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// Middleware for authentication (Ensures user is logged in)
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

// Middleware for admin access
const requireAdmin = async (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).send('Access denied.');
        }
        next();
    } catch (err) {
        console.error('Error checking admin role:', err);
        res.status(500).send('Internal Server Error');
    }
};

const cartRoutes = require('./routes/cart');
app.use('/cart', cartRoutes);


// Home Route - Requires Login
app.get('/', requireAuth, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.render('index', { user });
});

// Admin Dashboard - Only accessible to admins
app.get('/admin', requireAdmin, async (req, res) => {
    try {
        const users = await User.find(); // Fetch all users
        const adminUser = await User.findById(req.session.userId); // Get logged-in admin info
        res.render('admin', { users, user: adminUser }); // Pass 'user' to EJS
    } catch (err) {
        console.error('Error fetching admin data:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Route for updating user role
app.post('/admin/update-role/:userId', requireAdmin, async (req, res) => {
    try {
        const { role } = req.body; // Role will be passed from the form
        await User.findByIdAndUpdate(req.params.userId, { role }, { new: true });
        res.redirect('/admin');
    } catch (err) {
        console.error('Error updating role:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Route for deleting a user
app.post('/admin/delete-user/:userId', requireAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.userId);
        res.redirect('/admin');
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Registration Routes
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', upload.single('profilePicture'), async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const profilePicture = req.file ? `${req.file.filename}` : '/default-profile.png';

        const newUser = new User({ name, email, password: hashedPassword, profilePicture });
        await newUser.save();
        res.redirect('/login');
    } catch (err) {
        res.status(500).send('Error registering user');
    }
});

// Login Routes
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).send('Invalid email or password');
        }

        req.session.userId = user._id;
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error logging in');
    }
});

// Profile Routes
app.get('/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) return res.status(404).send('User not found');

        res.render('profile', { user });
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/profile/update', requireAuth, upload.single('profilePicture'), async (req, res) => {
    try {
        const { name, email } = req.body;
        let updateData = { name, email };

        if (req.file) {
            const user = await User.findById(req.session.userId);
            if (user.profilePicture !== '/default-profile.png') {
                fs.unlinkSync(`./uploads/${user.profilePicture.split('/').pop()}`);
            }
            updateData.profilePicture = `/uploads/${req.file.filename}`;
        }

        await User.findByIdAndUpdate(req.session.userId, updateData, { new: true });
        res.redirect('/profile');
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/profile/delete', requireLogin, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Check if user exists before deleting
        const user = await User.findById(userId);
        if (!user) return res.status(404).send('User not found');

        // Delete the user account
        await User.findByIdAndDelete(userId);

        // Destroy session after deleting account
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).send('Error logging out after account deletion');
            }
            res.redirect('/login');
        });
    } catch (err) {
        console.error('Error deleting account:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/fragrances', async (req, res) => {
    try {
        let query = {};
        
        // Filters
        if (req.query.gender) query.gender = req.query.gender;
        if (req.query.brand) query.brand = req.query.brand;
        if (req.query.scent) query.scent = { $in: req.query.scent.split(',') };
        if (req.query.top_notes) query.top_notes = { $in: req.query.top_notes.split(',') };
        if (req.query.season) query.season = { $in: req.query.season.split(',') };

        // Sorting
        let sort = {};
        if (req.query.sortBy) {
            let order = req.query.order === 'desc' ? -1 : 1;
            sort[req.query.sortBy] = order;
        }

        // Fetch fragrances
        const fragrances = await Fragrance.find(query).sort(sort);

        res.render('fragrances', { fragrances });
    } catch (err) {
        console.error('Error fetching fragrances:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/fragrances/add', upload.single('image'), async (req, res) => {
    try {
        const { name, gender, brand, scent, sizes, top_notes, longevity, sillage, season } = req.body;

        const newFragrance = new Fragrance({
            name,
            gender,
            brand,
            scent: scent.split(','),
            sizes: JSON.parse(sizes), 
            top_notes: top_notes.split(','),
            longevity,
            sillage,
            season: season.split(','),
            image: req.file ? req.file.filename : '' 
        });

        await newFragrance.save();
        res.redirect('/fragrances');
    } catch (err) {
        console.error('Error adding fragrance:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/fragrance/:id', async (req, res) => {
    try {
        const fragrance = await Fragrance.findById(req.params.id);
        if (!fragrance) return res.status(404).send('Fragrance not found');

        res.render('fragrance_detail', { fragrance });
    } catch (err) {
        console.error('Error fetching fragrance:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/fragrance/delete/:id', async (req, res) => {
    try {
        await Fragrance.findByIdAndDelete(req.params.id);
        res.redirect('/fragrances');
    } catch (err) {
        console.error('Error deleting fragrance:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/cart/add/:id', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const fragrance = await Fragrance.findById(req.params.id);
        const { size } = req.body;

        if (!fragrance || !fragrance.sizes[size]) {
            return res.status(400).send('Invalid fragrance or size');
        }

        const price = fragrance.sizes[size];

        // Check if item already exists in cart
        const itemIndex = user.cart.findIndex(
            (item) => item.fragranceId.equals(fragrance._id) && item.size === size
        );

        if (itemIndex > -1) {
            user.cart[itemIndex].quantity += 1; // Increment quantity
        } else {
            user.cart.push({ fragranceId: fragrance._id, size, quantity: 1, price });
        }

        await user.save();
        res.redirect('/cart');
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/cart', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).populate('cart.fragranceId');
        res.render('cart', { cart: user.cart });
    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/cart/remove/:itemId', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        user.cart = user.cart.filter((item) => item._id.toString() !== req.params.itemId);
        await user.save();
        res.redirect('/cart');
    } catch (err) {
        console.error('Error removing from cart:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/checkout', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        user.cart = []; // Empty the cart after checkout
        await user.save();
        res.send('Order placed successfully!');
    } catch (err) {
        console.error('Error during checkout:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
