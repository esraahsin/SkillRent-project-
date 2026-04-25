const crypto = require('crypto');

const store = {
  users: [],
  skills: [],
  requests: [],
  sessions: [],
  messages: [],
  reviews: [],
  anomalyFlags: [],
  refreshTokens: new Map(),
  registrationEvents: []
};

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

module.exports = { store, createId, nowIso };
