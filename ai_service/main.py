"""
SkillRent Unified AI Service
Handles: Skill Verification, Semantic Matching, Request Categorization
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SkillRent AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Taxonomy (mirrors backend/src/constants/taxonomy.js)
# ---------------------------------------------------------------------------
TAXONOMY = {
    "Tech & Development": [
        "Web Development", "Mobile Development", "Data Analysis",
        "Excel & Spreadsheets", "Cybersecurity", "Video Editing",
        "Photo Editing", "3D Modeling"
    ],
    "Design & Creativity": [
        "UI/UX Design", "Graphic Design", "Brand Identity",
        "Motion Graphics", "Content Creation"
    ],
    "Languages & Translation": [
        "English", "French", "Arabic", "Spanish", "Live Translation"
    ],
    "Education & Tutoring": [
        "Math Tutoring", "Science Tutoring", "Language Coaching", "Exam Prep"
    ],
    "Business & Finance": [
        "Bookkeeping", "Presentation Support", "Market Research",
        "CV & Interview Coaching"
    ],
    "Home & Lifestyle": [
        "Cooking", "Home Organization", "Pet Care", "Errand Support"
    ],
    "Health & Wellness": [
        "Fitness Coaching", "Yoga", "Nutrition Guidance", "Meditation"
    ],
    "Music & Arts": [
        "Guitar Lessons", "Piano Lessons", "Singing Coaching",
        "Drawing & Painting"
    ],
}

# Rich anchor texts used to build category/subcategory embedding centroids
CATEGORY_ANCHORS = {
    "Tech & Development": (
        "software engineer programmer full-stack developer coding web apps "
        "mobile applications database cloud computing algorithms debugging"
    ),
    "Design & Creativity": (
        "visual designer graphic artist UI UX branding illustration "
        "creative direction typography layout Figma Adobe aesthetics"
    ),
    "Languages & Translation": (
        "language translator interpreter multilingual bilingual "
        "foreign language communication live translation document"
    ),
    "Education & Tutoring": (
        "tutor teacher academic coaching explain concepts study "
        "exam prep homework help university high school lessons"
    ),
    "Business & Finance": (
        "business consultant finance accounting bookkeeping strategy "
        "marketing analysis presentation resume coaching career"
    ),
    "Home & Lifestyle": (
        "cooking meal prep home organization cleaning personal assistant "
        "errands pet care household lifestyle practical tasks"
    ),
    "Health & Wellness": (
        "personal trainer fitness workout yoga nutrition dietitian "
        "wellness coaching exercise health physical mental well-being"
    ),
    "Music & Arts": (
        "music lessons guitar piano singing voice coach art drawing "
        "painting creative performance instruments music theory"
    ),
}

SUBCATEGORY_ANCHORS = {
    "Web Development": (
        "React Vue Angular Node Express REST API JavaScript TypeScript "
        "HTML CSS frontend backend fullstack web application deployment Vercel"
    ),
    "Mobile Development": (
        "iOS Android React Native Flutter Swift Kotlin mobile app "
        "cross-platform native push notifications App Store Play Store"
    ),
    "Data Analysis": (
        "Python pandas NumPy SQL data visualization statistics "
        "machine learning Power BI Tableau insights dashboards reports"
    ),
    "Excel & Spreadsheets": (
        "Excel Google Sheets formulas pivot tables VLOOKUP macros VBA "
        "automation data entry reports financial modeling spreadsheet"
    ),
    "Cybersecurity": (
        "penetration testing security audit OWASP vulnerability assessment "
        "OSCP ethical hacking network security code review firewall"
    ),
    "Video Editing": (
        "Premiere Pro After Effects DaVinci Resolve video editing "
        "YouTube reels TikTok color grading audio mixing transitions"
    ),
    "Photo Editing": (
        "Photoshop Lightroom photo retouching compositing color correction "
        "portrait enhancement product photography RAW editing"
    ),
    "3D Modeling": (
        "Blender Maya 3ds Max Cinema 4D 3D modeling rendering "
        "animation rigging product visualization architectural visualization"
    ),
    "UI/UX Design": (
        "Figma Sketch user interface experience wireframe prototype "
        "usability testing design system component library accessibility"
    ),
    "Graphic Design": (
        "logo design visual identity Illustrator typography poster "
        "vector branding print social media graphics layout"
    ),
    "Brand Identity": (
        "brand strategy logo guidelines visual identity color palette "
        "typography brand book corporate identity rebranding"
    ),
    "Motion Graphics": (
        "After Effects motion design animation explainer video "
        "kinetic typography logo animation broadcast infographic"
    ),
    "Content Creation": (
        "copywriting blog writing SEO content strategy social media "
        "email newsletters storytelling thought leadership articles"
    ),
    "English": (
        "English teaching ESL grammar writing speaking listening "
        "reading IELTS TOEFL pronunciation business English"
    ),
    "French": (
        "French language teaching grammar vocabulary pronunciation "
        "DELF DALF business French conversation immersion"
    ),
    "Arabic": (
        "Arabic language Modern Standard Egyptian colloquial dialect "
        "Quran Fusha grammar reading writing speaking"
    ),
    "Spanish": (
        "Spanish teaching grammar conversation Latin American Castilian "
        "DELE exam business Spanish pronunciation reading"
    ),
    "Live Translation": (
        "simultaneous interpretation live translation conference "
        "meetings events multilingual real-time consecutive booth"
    ),
    "Math Tutoring": (
        "mathematics algebra calculus linear algebra statistics "
        "trigonometry discrete math university high school IB AP"
    ),
    "Science Tutoring": (
        "physics chemistry biology science labs experiments "
        "university high school AP IB GCSE concepts problems"
    ),
    "Language Coaching": (
        "communication skills public speaking presentation confidence "
        "accent reduction fluency conversational practice"
    ),
    "Exam Prep": (
        "SAT ACT GRE GMAT LSAT IELTS TOEFL exam strategy "
        "test preparation mock tests timing techniques scores"
    ),
    "Bookkeeping": (
        "accounting bookkeeping QuickBooks Xero financial records "
        "bank reconciliation invoicing tax preparation P&L balance sheet"
    ),
    "Presentation Support": (
        "PowerPoint Google Slides presentation design storytelling "
        "pitch deck investor deck data visualization slides"
    ),
    "Market Research": (
        "market analysis competitive intelligence consumer insights "
        "surveys focus groups industry research trends reports"
    ),
    "CV & Interview Coaching": (
        "resume CV writing LinkedIn profile optimization job interview "
        "coaching career advice salary negotiation cover letter"
    ),
    "Cooking": (
        "cooking recipes meal planning culinary technique healthy food "
        "kitchen skills baking cuisine dietary special occasions"
    ),
    "Home Organization": (
        "declutter organize home management cleaning KonMari method "
        "storage solutions minimalism space planning tidying"
    ),
    "Pet Care": (
        "pet sitting dog walking animal care grooming training "
        "veterinary advice behavior cats dogs small animals"
    ),
    "Errand Support": (
        "errands personal assistant delivery shopping administrative "
        "household tasks scheduling concierge lifestyle management"
    ),
    "Fitness Coaching": (
        "personal trainer workout plan exercise program strength training "
        "cardio weight loss body transformation HIIT nutrition"
    ),
    "Yoga": (
        "yoga instructor asanas poses flow vinyasa hatha pranayama "
        "flexibility mindfulness meditation classes online"
    ),
    "Nutrition Guidance": (
        "dietitian nutritionist meal plan macros healthy eating "
        "weight management sports nutrition supplements diet plan"
    ),
    "Meditation": (
        "meditation mindfulness stress relief anxiety relaxation "
        "breathing techniques guided visualization sleep mental health"
    ),
    "Guitar Lessons": (
        "guitar lessons acoustic electric bass chords scales tabs "
        "fingerpicking strumming music theory beginner advanced"
    ),
    "Piano Lessons": (
        "piano keyboard lessons classical contemporary scales chords "
        "sheet music sight-reading theory technique beginners"
    ),
    "Singing Coaching": (
        "voice coach singing lessons vocal technique range pitch "
        "breath support performance stage presence audition"
    ),
    "Drawing & Painting": (
        "drawing sketching painting watercolor oil acrylic portrait "
        "landscape still life perspective anatomy figure"
    ),
}

# ---------------------------------------------------------------------------
# Model loader (lazy, singleton)
# ---------------------------------------------------------------------------
_model = None

def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        model_path = os.getenv("MODEL_PATH", "./fine_tuned_model")
        fallback = "sentence-transformers/all-MiniLM-L6-v2"
        try:
            if os.path.isdir(model_path):
                logger.info(f"Loading fine-tuned model from {model_path}")
                _model = SentenceTransformer(model_path)
            else:
                logger.info(f"Fine-tuned model not found, loading base: {fallback}")
                _model = SentenceTransformer(fallback)
        except Exception as e:
            logger.error(f"Model load error: {e}")
            _model = SentenceTransformer(fallback)
        logger.info("Model loaded successfully")
    return _model


# ---------------------------------------------------------------------------
# Pre-computed centroid cache
# ---------------------------------------------------------------------------
_centroids: dict = {}

def get_centroids():
    global _centroids
    if _centroids:
        return _centroids
    model = get_model()
    logger.info("Computing embedding centroids...")
    for cat, text in CATEGORY_ANCHORS.items():
        _centroids[f"cat::{cat}"] = model.encode(text, normalize_embeddings=True)
    for subcat, text in SUBCATEGORY_ANCHORS.items():
        _centroids[f"sub::{subcat}"] = model.encode(text, normalize_embeddings=True)
    logger.info(f"Computed {len(_centroids)} centroids")
    return _centroids


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class SkillVerifyRequest(BaseModel):
    description: str
    category: Optional[str] = None
    subcategory: Optional[str] = None

class SkillVerifyResponse(BaseModel):
    confidence: float
    suggestedCategory: str
    suggestedSubcategory: str
    alternatives: List[str]
    providerBadgeEligible: bool
    qualityFlags: List[str]

class ProviderSkill(BaseModel):
    skillId: str
    userId: str
    description: str
    category: str
    subcategory: str

class MatchRequest(BaseModel):
    requestText: str
    providerSkills: List[ProviderSkill]
    topK: int = 5

class MatchResult(BaseModel):
    providerId: str
    skillId: str
    score: float
    matchReason: str

class MatchResponse(BaseModel):
    matches: List[MatchResult]

class CategorizeRequest(BaseModel):
    title: str
    description: str

class CategorizeResponse(BaseModel):
    category: str
    subcategory: str
    confidence: float
    alternatives: List[dict]


# ---------------------------------------------------------------------------
# Core inference functions
# ---------------------------------------------------------------------------

def _quality_flags(text: str) -> list[str]:
    """Light heuristic quality checks on a skill description."""
    flags = []
    if len(text.strip()) < 30:
        flags.append("description_too_short")
    if len(text.strip()) < 80:
        flags.append("description_brief")
    words = text.split()
    if len(words) > 3:
        unique_ratio = len(set(w.lower() for w in words)) / len(words)
        if unique_ratio < 0.5:
            flags.append("repetitive_text")
    generic = {"i do", "i can", "i will", "help", "service", "work"}
    content_words = {w.lower() for w in words if len(w) > 3}
    if content_words and len(content_words - generic) < 3:
        flags.append("too_generic")
    return flags


def verify_skill(req: SkillVerifyRequest) -> SkillVerifyResponse:
    model = get_model()
    centroids = get_centroids()

    emb = model.encode(req.description, normalize_embeddings=True).reshape(1, -1)

    # Score against all categories
    cat_scores = {}
    for cat in TAXONOMY:
        key = f"cat::{cat}"
        c_emb = centroids[key].reshape(1, -1)
        cat_scores[cat] = float(cosine_similarity(emb, c_emb)[0][0])

    # Score against all subcategories
    sub_scores = {}
    for subcat in SUBCATEGORY_ANCHORS:
        key = f"sub::{subcat}"
        s_emb = centroids[key].reshape(1, -1)
        sub_scores[subcat] = float(cosine_similarity(emb, s_emb)[0][0])

    best_cat = max(cat_scores, key=cat_scores.get)
    best_cat_score = cat_scores[best_cat]

    # Best subcategory restricted to best category's subcategories
    valid_subcats = TAXONOMY[best_cat]
    best_sub = max(valid_subcats, key=lambda s: sub_scores.get(s, 0))
    best_sub_score = sub_scores.get(best_sub, 0)

    # Alternatives: next best categories
    sorted_cats = sorted(cat_scores, key=cat_scores.get, reverse=True)
    alternatives = []
    for cat in sorted_cats[1:4]:
        top_sub = max(TAXONOMY[cat], key=lambda s: sub_scores.get(s, 0))
        alternatives.append(f"{cat} › {top_sub}")

    # Normalize confidence: cosine on normalized embeddings is [-1,1], shift to [0,1]
    raw_confidence = (best_sub_score + 1) / 2

    # Quality modifier
    flags = _quality_flags(req.description)
    penalty = 0.05 * len([f for f in flags if f in ("description_too_short", "too_generic")])
    confidence = max(0.0, min(1.0, raw_confidence - penalty))

    # Use submitted category/subcategory if provided and plausible
    final_cat = req.category if req.category and req.category in TAXONOMY else best_cat
    final_sub = req.subcategory if req.subcategory in SUBCATEGORY_ANCHORS else best_sub

    badge_eligible = (
        confidence >= 0.62
        and "description_too_short" not in flags
        and "too_generic" not in flags
    )

    return SkillVerifyResponse(
        confidence=round(confidence, 4),
        suggestedCategory=final_cat,
        suggestedSubcategory=final_sub,
        alternatives=alternatives,
        providerBadgeEligible=badge_eligible,
        qualityFlags=flags,
    )


def semantic_match(req: MatchRequest) -> MatchResponse:
    if not req.providerSkills:
        return MatchResponse(matches=[])

    model = get_model()
    query_emb = model.encode(req.requestText, normalize_embeddings=True)

    skill_texts = [
        f"{s.subcategory} {s.category} {s.description}"
        for s in req.providerSkills
    ]
    skill_embs = model.encode(skill_texts, normalize_embeddings=True)

    scores = cosine_similarity([query_emb], skill_embs)[0]

    indexed = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    top = indexed[: req.topK]

    results = []
    for idx, score in top:
        skill = req.providerSkills[idx]
        norm_score = round(float((score + 1) / 2), 4)
        # Build a short human-readable reason
        q_words = set(req.requestText.lower().split())
        s_words = set(skill_texts[idx].lower().split())
        overlap = [w for w in q_words & s_words if len(w) > 4][:3]
        reason = f"Matched on: {', '.join(overlap)}" if overlap else f"Strong semantic match in {skill.category}"
        results.append(
            MatchResult(
                providerId=skill.userId,
                skillId=skill.skillId,
                score=norm_score,
                matchReason=reason,
            )
        )

    return MatchResponse(matches=results)


def categorize_request(req: CategorizeRequest) -> CategorizeResponse:
    model = get_model()
    centroids = get_centroids()

    full_text = f"{req.title} {req.description}"
    emb = model.encode(full_text, normalize_embeddings=True).reshape(1, -1)

    cat_scores = {}
    for cat in TAXONOMY:
        key = f"cat::{cat}"
        c_emb = centroids[key].reshape(1, -1)
        cat_scores[cat] = float(cosine_similarity(emb, c_emb)[0][0])

    sub_scores = {}
    for subcat in SUBCATEGORY_ANCHORS:
        key = f"sub::{subcat}"
        s_emb = centroids[key].reshape(1, -1)
        sub_scores[subcat] = float(cosine_similarity(emb, s_emb)[0][0])

    best_cat = max(cat_scores, key=cat_scores.get)
    valid_subcats = TAXONOMY[best_cat]
    best_sub = max(valid_subcats, key=lambda s: sub_scores.get(s, 0))

    confidence = round((sub_scores.get(best_sub, 0) + 1) / 2, 4)

    sorted_cats = sorted(cat_scores, key=cat_scores.get, reverse=True)
    alternatives = []
    for cat in sorted_cats[1:4]:
        top_sub = max(TAXONOMY[cat], key=lambda s: sub_scores.get(s, 0))
        alternatives.append({
            "category": cat,
            "subcategory": top_sub,
            "score": round((cat_scores[cat] + 1) / 2, 4),
        })

    return CategorizeResponse(
        category=best_cat,
        subcategory=best_sub,
        confidence=confidence,
        alternatives=alternatives,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    # Warm up model and centroids at startup
    get_centroids()
    logger.info("Startup complete — model warm")


@app.get("/health")
def health():
    return {"status": "ok", "service": "SkillRent AI"}


@app.post("/verify-skill", response_model=SkillVerifyResponse)
def api_verify_skill(req: SkillVerifyRequest):
    if not req.description or len(req.description.strip()) < 5:
        raise HTTPException(400, "description is required")
    return verify_skill(req)


@app.post("/match-providers", response_model=MatchResponse)
def api_match_providers(req: MatchRequest):
    if not req.requestText or len(req.requestText.strip()) < 3:
        raise HTTPException(400, "requestText is required")
    return semantic_match(req)


@app.post("/categorize-request", response_model=CategorizeResponse)
def api_categorize_request(req: CategorizeRequest):
    if not req.title:
        raise HTTPException(400, "title is required")
    return categorize_request(req)