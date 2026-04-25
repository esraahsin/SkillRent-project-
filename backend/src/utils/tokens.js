const jwt = require('jsonwebtoken');
const { ACCESS_SECRET } = require('../middleware/auth');

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'skillrent-refresh-secret';

function issueAccessToken(userId) {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: '15m' });
}

function issueRefreshToken(userId) {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: '7d' });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = { issueAccessToken, issueRefreshToken, verifyRefreshToken };
