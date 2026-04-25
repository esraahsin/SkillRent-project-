const { SKILL_TAXONOMY } = require('../constants/taxonomy');

function verifySkillDescription(description = '') {
  // AI INTEGRATION POINT: Replace this heuristic with FastAPI + sentence-transformer service.
  const text = description.toLowerCase();
  const matches = [];

  SKILL_TAXONOMY.forEach(({ subcategories }) => {
    subcategories.forEach((item) => {
      if (text.includes(item.toLowerCase().split(' ')[0])) {
        matches.push(item);
      }
    });
  });

  const primary = matches[0] || 'Web Development';
  return {
    suggestedCategory: primary,
    confidence: matches.length > 0 ? 0.82 : 0.55,
    alternatives: [...new Set(matches)].slice(1, 3),
    providerBadgeEligible: matches.length > 0
  };
}

function semanticRecommendProviders(requestText, providerSkills) {
  // AI INTEGRATION POINT: Replace with vector embeddings + cosine similarity service.
  const normalized = requestText.toLowerCase();

  return providerSkills
    .map((skill) => {
      const text = `${skill.description} ${skill.category} ${skill.subcategory}`.toLowerCase();
      const overlap = normalized.split(/\s+/).filter((w) => w.length > 3 && text.includes(w)).length;
      return { skill, score: overlap };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ skill, score }) => ({ providerId: skill.userId, skillId: skill.id, score }));
}

module.exports = { verifySkillDescription, semanticRecommendProviders };
