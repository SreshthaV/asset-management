require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const Asset = require('./models/Asset');

const app = express();

// Database Connection
mongoose.connect(process.env.MONGO_URI);

// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));

// File Upload Setup (Multer)
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- ROUTES ---

// 1. Login Page (The first thing you see)
app.get('/', (req, res) => res.render('login'));

// 2. Login Logic
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "password") {
        res.redirect('/dashboard');
    } else {
        res.send("Invalid credentials");
    }
});

// 3. Dashboard (The Locker with Search & Categories)
app.get('/dashboard', async (req, res) => {
    const { search, category } = req.query;
    let query = {};

    if (search) {
        query.filename = { $regex: search, $options: 'i' };
    }

    if (category && category !== 'All') {
        query.category = category;
    }

    const assets = await Asset.find(query).sort({ uploadDate: -1 });
    res.render('dashboard', { assets });
});

// 4. File Upload Logic
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.send("Please select a file.");
    
    const newAsset = new Asset({
        filename: req.body.title || req.file.originalname,
        category: req.body.category,
        filePath: req.file.path
    });
    await newAsset.save();
    res.redirect('/dashboard');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
app.get('/dashboard', async (req, res) => {
    const { search, category } = req.query;
    let query = {};

    if (search) {
        query.filename = { $regex: search, $options: 'i' };
    }

    // Logic for category filtering from the header
    if (category && category !== 'All') {
        query.category = category;
    }

    const assets = await Asset.find(query).sort({ uploadDate: -1 });
    res.render('dashboard', { assets });
});