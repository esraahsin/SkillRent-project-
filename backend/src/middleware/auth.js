const jwt = require('jsonwebtoken');
const { store } = require('../data/store');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'skillrent-access-secret';

function authRequired(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const user = store.users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authRequired, ACCESS_SECRET };
