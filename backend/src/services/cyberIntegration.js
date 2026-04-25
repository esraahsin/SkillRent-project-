const PAYMENT_PATTERNS = [/paypal\.me/i, /pay\s?me/i, /\b(?:http|https):\/\//i, /\b(?:\+?\d[\d\s-]{7,}\d)\b/];

function inspectMessage(content) {
  const reasons = [];

  if (PAYMENT_PATTERNS.some((pattern) => pattern.test(content))) {
    reasons.push('Potential off-platform payment or contact sharing');
  }

  const words = content.split(/\s+/).filter(Boolean);
  if (words.length > 12) {
    const uniqueRatio = new Set(words.map((w) => w.toLowerCase())).size / words.length;
    if (uniqueRatio < 0.45) reasons.push('Possible bot-like repeated text');
  }

  return {
    flagged: reasons.length > 0,
    severity: reasons.length > 1 ? 'high' : 'medium',
    reason: reasons.join('; ') || null
  };
}

function buildTrustScore(user, stats) {
  // CYBER INTEGRATION POINT: Replace with richer anti-fraud scoring pipeline.
  const score = Math.max(
    0,
    Math.min(
      100,
      35 +
        stats.completedSessions * 7 +
        stats.avgRating * 8 +
        (user.isEmailVerified ? 5 : 0) +
        (stats.verifiedSkills ? 8 : 0) -
        stats.flagsCount * 12
    )
  );

  if (score >= 75) return { value: score, band: 'green' };
  if (score >= 55) return { value: score, band: 'yellow' };
  if (score >= 35) return { value: score, band: 'orange' };
  return { value: score, band: 'red' };
}

module.exports = { inspectMessage, buildTrustScore };
