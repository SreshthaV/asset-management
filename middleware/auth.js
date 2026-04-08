const requireLogin = (req, res, next) => {
  if (!req.session.user) return res.redirect('/');
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user) return res.redirect('/');
  if (req.session.user.role !== 'admin') {
    return res.status(403).send('<h2>Access Denied – Admins Only</h2><a href="/dashboard">Go Back</a>');
  }
  next();
};

module.exports = { requireLogin, requireAdmin };