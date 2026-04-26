/**
 * aiIntegration.js  — SkillRent real AI layer
 *
 * Calls the Python FastAPI service (ai_service/).
 * Falls back gracefully to heuristics when the service is unavailable,
 * so the app keeps working during local dev without Python running.
 */

const { SKILL_TAXONOMY } = require('../constants/taxonomy');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_TIMEOUT_MS  = Number(process.env.AI_TIMEOUT_MS || 4000);

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * POST to the AI service with a JSON body.
 * Returns parsed response or null on any failure.
 */
async function callAI(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[AI] ${path} returned ${res.status}: ${text.slice(0, 120)}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[AI] ${path} timed out after ${AI_TIMEOUT_MS}ms`);
    } else {
      console.warn(`[AI] ${path} unavailable: ${err.message}`);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── fallback heuristics (used when AI service is down) ─────────────────────

function _heuristicVerify(description = '') {
  const text = description.toLowerCase();
  const matches = [];
  SKILL_TAXONOMY.forEach(({ subcategories }) => {
    subcategories.forEach((item) => {
      if (text.includes(item.toLowerCase().split(' ')[0])) matches.push(item);
    });
  });
  const primary = matches[0] || 'Web Development';
  return {
    suggestedCategory: primary,
    suggestedSubcategory: primary,
    confidence: matches.length > 0 ? 0.72 : 0.45,
    alternatives: [...new Set(matches)].slice(1, 3),
    providerBadgeEligible: matches.length > 0 && description.length > 60,
    qualityFlags: description.length < 30 ? ['description_too_short'] : [],
  };
}

function _heuristicMatch(requestText, providerSkills) {
  const normalized = requestText.toLowerCase();
  return providerSkills
    .map((skill) => {
      const text = `${skill.description} ${skill.category} ${skill.subcategory}`.toLowerCase();
      const overlap = normalized
        .split(/\s+/)
        .filter((w) => w.length > 3 && text.includes(w)).length;
      return { skill, score: overlap };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ skill, score }) => ({
      providerId: skill.userId,
      skillId: skill.id,
      score: Math.min(1, score / 8),
      matchReason: 'Keyword overlap match (AI service offline)',
    }));
}

function _heuristicCategorize(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const matches = [];
  SKILL_TAXONOMY.forEach(({ category, subcategories }) => {
    subcategories.forEach((sub) => {
      if (text.includes(sub.toLowerCase().split(' ')[0])) {
        matches.push({ category, subcategory: sub });
      }
    });
  });
  const best = matches[0] || { category: 'Tech & Development', subcategory: 'Web Development' };
  return { ...best, confidence: matches.length > 0 ? 0.65 : 0.35, alternatives: [] };
}

// ─── exported functions ──────────────────────────────────────────────────────

/**
 * Verify a skill description.
 *
 * @param {string} description
 * @param {string} [category]   - user-provided category (optional)
 * @param {string} [subcategory] - user-provided subcategory (optional)
 * @returns {{ confidence, suggestedCategory, suggestedSubcategory,
 *             alternatives, providerBadgeEligible, qualityFlags }}
 */
async function verifySkillDescription(description = '', category, subcategory) {
  const result = await callAI('/verify-skill', { description, category, subcategory });
  if (result) return result;

  console.info('[AI] verifySkillDescription: using heuristic fallback');
  return _heuristicVerify(description);
}

/**
 * Semantically rank provider skills against a request.
 *
 * @param {string} requestText
 * @param {Array<{ id, userId, description, category, subcategory }>} providerSkills
 * @returns {Array<{ providerId, skillId, score, matchReason }>}
 */
async function semanticRecommendProviders(requestText, providerSkills) {
  if (!providerSkills?.length) return [];

  // Shape skills for the API
  const shaped = providerSkills.map((s) => ({
    skillId: s.id,
    userId: s.userId,
    description: s.description,
    category: s.category,
    subcategory: s.subcategory,
  }));

  const result = await callAI('/match-providers', {
    requestText,
    providerSkills: shaped,
    topK: 5,
  });

  if (result?.matches) return result.matches;

  console.info('[AI] semanticRecommendProviders: using heuristic fallback');
  return _heuristicMatch(requestText, providerSkills);
}

/**
 * Auto-categorize a seeker request.
 *
 * @param {string} title
 * @param {string} description
 * @returns {{ category, subcategory, confidence, alternatives }}
 */
async function categorizeRequest(title = '', description = '') {
  const result = await callAI('/categorize-request', { title, description });
  if (result) return result;

  console.info('[AI] categorizeRequest: using heuristic fallback');
  return _heuristicCategorize(title, description);
}

module.exports = {
  verifySkillDescription,
  semanticRecommendProviders,
  categorizeRequest,
};