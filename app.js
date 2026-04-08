require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const archiver = require('archiver');
const crypto = require('crypto');

const Asset = require('./models/Asset');
const db = require('./config/db');
const { generateOTP, sendOTPEmail } = require('./utils/mailer');
const { requireLogin, requireAdmin } = require('./middleware/auth');

const app = express();
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

db.query('SELECT 1')
  .then(() => console.log('✅ MySQL connected'))
  .catch(err => console.error('❌ MySQL error:', err.message));

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
}));

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ════════════════════════════════════════════════
//  SIGNUP ROUTES
// ════════════════════════════════════════════════

app.get('/signup', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    return res.render('signup', { error: 'All fields are required.' });
  }
  if (password.length < 6) {
    return res.render('signup', { error: 'Password must be at least 6 characters.' });
  }
  if (password !== confirmPassword) {
    return res.render('signup', { error: 'Passwords do not match.' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.render('signup', { error: 'Email already registered. Please login.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY * 60 * 1000);

    await db.query('UPDATE otps SET used = TRUE WHERE email = ?', [email]);
    await db.query('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)', [email, otp, expiresAt]);
    await sendOTPEmail(email, otp);

    req.session.signupData = { name, email, password: hashed };
    req.session.signupVerified = false;

    res.redirect('/verify-signup-otp');
  } catch (err) {
    console.error('Signup error:', err);
    res.render('signup', { error: 'Something went wrong. Try again.' });
  }
});

app.get('/verify-signup-otp', (req, res) => {
  if (!req.session.signupData) return res.redirect('/signup');
  res.render('verify-signup-otp', { error: null, email: req.session.signupData.email });
});

app.post('/verify-signup-otp', async (req, res) => {
  const { otp } = req.body;
  const signupData = req.session.signupData;
  if (!signupData) return res.redirect('/signup');

  try {
    const [rows] = await db.query(
      `SELECT * FROM otps WHERE email = ? AND otp = ? AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
      [signupData.email, otp]
    );

    if (rows.length === 0) {
      return res.render('verify-signup-otp', { error: 'Invalid or expired OTP. Try again.', email: signupData.email });
    }

    await db.query('UPDATE otps SET used = TRUE WHERE id = ?', [rows[0].id]);

    // Create account now that OTP is verified
    await db.query(
      'INSERT INTO users (name, email, password, role, first_login) VALUES (?, ?, ?, "user", FALSE)',
      [signupData.name, signupData.email, signupData.password]
    );

    delete req.session.signupData;
    delete req.session.signupVerified;

    res.render('login', { error: '✅ Account created successfully! Please login.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.render('verify-signup-otp', { error: 'Server error. Try again.', email: signupData.email });
  }
});

app.post('/resend-signup-otp', async (req, res) => {
  const signupData = req.session.signupData;
  if (!signupData) return res.redirect('/signup');

  try {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY * 60 * 1000);
    await db.query('UPDATE otps SET used = TRUE WHERE email = ?', [signupData.email]);
    await db.query('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)', [signupData.email, otp, expiresAt]);
    await sendOTPEmail(signupData.email, otp);
    res.render('verify-signup-otp', { error: '✅ New OTP sent to your email.', email: signupData.email });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.render('verify-signup-otp', { error: 'Failed to resend. Try again.', email: signupData.email });
  }
});

// ════════════════════════════════════════════════
//  LOGIN ROUTES
// ════════════════════════════════════════════════

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.render('login', { error: 'Invalid email or password.' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.render('login', { error: 'Invalid email or password.' });

    req.session.user = { id: user.id, email: user.email, role: user.role };
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'Something went wrong. Try again.' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// ════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════

app.get('/dashboard', requireLogin, async (req, res) => {
  const { search, category } = req.query;
  const uid = String(req.session.user.id);
  let query = { userId: uid };
  if (search) query.filename = { $regex: search, $options: 'i' };
  if (category && category !== 'All') query.category = category;

  const assets = await Asset.find(query).sort({ uploadDate: -1 });

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const allAssets = await Asset.find({ userId: uid });
  const expiringAssets = allAssets.filter(a => a.expiryDate && a.expiryDate > now && a.expiryDate <= in30Days);
  const expiredAssets  = allAssets.filter(a => a.expiryDate && a.expiryDate <= now);

  const storageByCategory = {};
  let totalStorage = 0;
  allAssets.forEach(a => {
    if (a.fileSize) {
      storageByCategory[a.category] = (storageByCategory[a.category] || 0) + a.fileSize;
      totalStorage += a.fileSize;
    }
  });

  res.render('dashboard', {
    assets,
    user: req.session.user,
    currentPage: 'dashboard',
    search: search || '',
    category: category || 'All',
    expiringAssets,
    expiredAssets,
    storageByCategory,
    totalStorage
  });
});

app.post('/upload', requireLogin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.send('Please select a file.');
  await new Asset({
    userId:      String(req.session.user.id),
    filename:    req.body.title || req.file.originalname,
    category:    req.body.category,
    subType:     req.body.subType     || '',
    description: req.body.description || '',
    issuedBy:    req.body.issuedBy    || '',
    expiryDate:  req.body.expiryDate  || null,
    fileSize:    req.file.size        || 0,
    filePath:    req.file.path
  }).save();
  res.redirect('/dashboard');
});

app.post('/asset/:id/delete', requireLogin, async (req, res) => {
  const asset = await Asset.findOne({ _id: req.params.id, userId: String(req.session.user.id) });
  if (asset) {
    if (fs.existsSync(asset.filePath)) fs.unlinkSync(asset.filePath);
    await Asset.findByIdAndDelete(req.params.id);
  }
  res.redirect('back');
});

app.post('/asset/:id/edit', requireLogin, async (req, res) => {
  await Asset.findOneAndUpdate(
    { _id: req.params.id, userId: String(req.session.user.id) },
    {
      filename:    req.body.title,
      category:    req.body.category,
      subType:     req.body.subType     || '',
      description: req.body.description || '',
      issuedBy:    req.body.issuedBy    || '',
      expiryDate:  req.body.expiryDate  || null,
    }
  );
  res.redirect('back');
});

app.get('/profile', requireLogin, async (req, res) => {
  const tab = req.query.tab || 'account';
  const assets = await Asset.find({ userId: String(req.session.user.id) }).sort({ fileSize: -1 });
  const totalBytes = assets.reduce((sum, a) => sum + (a.fileSize || 0), 0);
  const totalSize = totalBytes < 1048576
    ? (totalBytes / 1024).toFixed(1) + ' KB'
    : (totalBytes / 1048576).toFixed(1) + ' MB';
  const storagePercent = Math.min(Math.round((totalBytes / (3 * 1024 * 1024 * 1024)) * 100), 100);

  res.render('profile', {
    user: req.session.user,
    tab,
    assets,
    totalSize,
    totalBytes,
    storagePercent,
    currentPage: 'profile'
  });
});
// ── FILES PAGE ────────────────────────────────────────────
app.get('/files', requireLogin, async (req, res) => {
  const { search, category } = req.query;
  let query = { userId: String(req.session.user.id) };
  if (search) query.filename = { $regex: search, $options: 'i' };
  if (category && category !== 'All') query.category = category;
  const assets = await Asset.find(query).sort({ uploadDate: -1 });
  res.render('files', { assets, user: req.session.user, search: search || '', category: category || 'All' });
});

// ════════════════════════════════════════════════
//  EXPORT / SHARE / VERSION ROUTES
// ════════════════════════════════════════════════

// Export ZIP
app.get('/export', requireLogin, async (req, res) => {
  const assets = await Asset.find({ userId: String(req.session.user.id) });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=my-assets.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  assets.forEach(asset => {
    if (fs.existsSync(asset.filePath)) {
      archive.file(asset.filePath, { name: asset.filename + path.extname(asset.filePath) });
    }
  });
  await archive.finalize();
});

// Generate / get share link
app.post('/asset/:id/share', requireLogin, async (req, res) => {
  let asset = await Asset.findOne({ _id: req.params.id, userId: String(req.session.user.id) });
  if (!asset) return res.status(404).json({ error: 'Not found' });
  if (!asset.shareToken) {
    asset.shareToken = crypto.randomBytes(20).toString('hex');
    await asset.save();
  }
  res.json({ token: asset.shareToken });
});

// Revoke share link
app.post('/asset/:id/unshare', requireLogin, async (req, res) => {
  await Asset.findOneAndUpdate({ _id: req.params.id, userId: String(req.session.user.id) }, { shareToken: null });
  res.redirect('back');
});

// Public share view
app.get('/share/:token', async (req, res) => {
  const asset = await Asset.findOne({ shareToken: req.params.token });
  if (!asset) return res.status(404).send('Link not found or has been revoked.');
  res.render('share', { asset });
});

// Upload new version
app.post('/asset/:id/version', requireLogin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.redirect('back');
  const asset = await Asset.findOne({ _id: req.params.id, userId: String(req.session.user.id) });
  if (!asset) return res.redirect('back');
  // push current file into versions
  asset.versions.push({ filePath: asset.filePath, fileSize: asset.fileSize, uploadDate: asset.uploadDate });
  asset.filePath = req.file.path;
  asset.fileSize = req.file.size;
  asset.uploadDate = new Date();
  await asset.save();
  res.redirect('back');
});

// ════════════════════════════════════════════════
//  ADMIN ROUTES
// ════════════════════════════════════════════════

app.get('/admin', requireAdmin, async (req, res) => {
  const [users] = await db.query('SELECT id, email, role, first_login, created_at FROM users');
  const SQL_DIR = path.resolve(__dirname, 'database');
  const sqlFiles = fs.existsSync(SQL_DIR) ? fs.readdirSync(SQL_DIR).filter(f => f.endsWith('.sql')) : [];
  res.render('admin', { users, sqlFiles, user: req.session.user });
});

app.get('/admin/sql/:filename', requireAdmin, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'database', filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found.');
  const content = fs.readFileSync(filePath, 'utf-8');
  res.render('sql-editor', { filename, content, user: req.session.user, saved: false });
});

app.post('/admin/sql/:filename', requireAdmin, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(__dirname, 'database', filename);
  fs.writeFileSync(filePath, req.body.content, 'utf-8');
  res.render('sql-editor', { filename, content: req.body.content, user: req.session.user, saved: true });
});

app.post('/admin/users/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (['user', 'admin'].includes(role)) {
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
  }
  res.redirect('/admin');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));