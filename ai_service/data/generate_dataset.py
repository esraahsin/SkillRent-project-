"""
Generate synthetic training data for fine-tuning sentence-transformers.
Produces (anchor, positive, negative) triplets covering all SkillRent taxonomy categories.
Run once: python data/generate_dataset.py
"""

import json
import random

random.seed(42)

# ---------------------------------------------------------------------------
# Raw exemplar sentences per subcategory
# ---------------------------------------------------------------------------
EXEMPLARS = {
    "Web Development": [
        "I build React and Next.js web apps with Tailwind, deployed to Vercel or AWS.",
        "Full-stack developer specializing in Node.js REST APIs and PostgreSQL databases.",
        "Frontend engineer with 5 years building responsive SPAs using Vue and TypeScript.",
        "I create fast, SEO-optimized websites with React 18, server components, and edge caching.",
        "Backend developer skilled in Express microservices, Docker, and CI/CD pipelines.",
        "I debug JavaScript errors, fix auth flows, and refactor legacy jQuery codebases.",
        "E-commerce specialist building Shopify stores and custom headless storefronts.",
        "I implement WebSockets, real-time dashboards, and GraphQL APIs in Node.js.",
    ],
    "Mobile Development": [
        "React Native developer shipping iOS and Android apps from one codebase.",
        "Flutter engineer building smooth cross-platform mobile experiences in Dart.",
        "iOS developer with Swift expertise, App Store submissions, and in-app purchases.",
        "Android Kotlin developer with deep knowledge of Jetpack Compose and navigation.",
        "I build offline-first mobile apps with SQLite, push notifications, and deep links.",
        "Cross-platform mobile specialist integrating REST APIs, analytics, and Firebase.",
    ],
    "Data Analysis": [
        "Python data analyst building pandas pipelines and interactive Plotly dashboards.",
        "I turn your messy CSV files into clean SQL databases and Power BI reports.",
        "Data scientist with expertise in scikit-learn, feature engineering, and A/B testing.",
        "Business intelligence developer creating KPI dashboards in Tableau and Looker.",
        "I perform statistical analysis, hypothesis testing, and regression modeling in R.",
        "Machine learning engineer fine-tuning models for classification and forecasting.",
    ],
    "Excel & Spreadsheets": [
        "Excel power user building complex financial models with VBA macros and pivot tables.",
        "I automate Google Sheets workflows, create VLOOKUP formulas, and build dashboards.",
        "Spreadsheet consultant who turns manual tracking into automated reporting systems.",
        "I build Excel templates for project management, budgeting, and inventory tracking.",
    ],
    "Cybersecurity": [
        "OSCP-certified penetration tester auditing web apps for OWASP Top 10 vulnerabilities.",
        "Security engineer performing network scans, firewall audits, and threat modeling.",
        "I conduct secure code reviews in Node.js, Python, and Java to find injection flaws.",
        "Web application pentester specializing in auth bypass, XSS, and IDOR vulnerabilities.",
        "Cloud security consultant reviewing AWS IAM policies and S3 bucket configurations.",
    ],
    "Video Editing": [
        "Premiere Pro editor cutting YouTube videos, YouTube Shorts, and corporate promos.",
        "DaVinci Resolve colorist and video editor for indie films and music videos.",
        "I create Instagram Reels and TikTok content with fast-paced editing and captions.",
        "After Effects animator adding motion graphics, lower thirds, and kinetic text.",
        "Podcast video editor syncing multi-cam footage and adding intro/outro sequences.",
    ],
    "Photo Editing": [
        "Photoshop retoucher for portrait cleanups, skin smoothing, and background removal.",
        "Lightroom editor delivering consistent color-graded photo packages for weddings.",
        "Product photographer and editor creating clean white-background shots for Amazon.",
        "I do advanced compositing, sky replacement, and object removal in Photoshop.",
    ],
    "3D Modeling": [
        "Blender artist creating 3D product visualizations and architectural renders.",
        "Cinema 4D animator producing 3D logo animations and motion graphics.",
        "I model characters, environments, and props for games using Maya and ZBrush.",
        "Architectural visualization specialist rendering photorealistic interior scenes.",
    ],
    "UI/UX Design": [
        "UX designer creating user flows, wireframes, and high-fidelity Figma prototypes.",
        "I conduct user research, usability tests, and design accessible component libraries.",
        "Product designer translating briefs into polished interfaces with design systems.",
        "Mobile UI specialist designing iOS and Android screens following platform guidelines.",
        "I audit existing products for UX issues, map pain points, and propose redesigns.",
    ],
    "Graphic Design": [
        "Graphic designer creating logos, posters, flyers, and social media templates.",
        "Illustrator and brand designer specializing in vector art and typographic logos.",
        "I design print-ready materials: business cards, brochures, and billboard ads.",
        "Social media graphic designer creating viral-ready thumbnails and carousel posts.",
    ],
    "Brand Identity": [
        "Brand strategist developing full visual identities: logo, palette, typography, guidelines.",
        "I rebrand companies with comprehensive brand books, stationery, and digital assets.",
        "Corporate identity designer creating cohesive systems for startups and enterprises.",
        "Brand consultant conducting competitor audits and positioning before designing.",
    ],
    "Motion Graphics": [
        "After Effects motion designer creating explainer videos, logo stings, and title sequences.",
        "I animate infographics, data visualizations, and social media stories.",
        "Broadcast designer producing channel packages, lower thirds, and news graphics.",
        "Kinetic typography specialist animating brand videos and promotional content.",
    ],
    "Content Creation": [
        "SEO copywriter producing blog posts, pillar pages, and product descriptions.",
        "Social media manager writing captions, newsletters, and LinkedIn thought leadership.",
        "Content strategist planning editorial calendars and multi-channel campaigns.",
        "I write long-form B2B articles, case studies, and white papers.",
    ],
    "English": [
        "English tutor helping non-native speakers with grammar, writing, and pronunciation.",
        "IELTS and TOEFL prep coach with 8.0+ band score strategies.",
        "Business English trainer for professionals preparing for presentations and meetings.",
        "I coach academic writing, essay structure, and citation styles at university level.",
    ],
    "French": [
        "French teacher for absolute beginners to advanced learners, all ages.",
        "DELF and DALF exam preparation coach with proven pass rates.",
        "Business French tutor helping professionals write formal emails and reports.",
        "Conversational French coach using immersive discussion-based lessons.",
    ],
    "Arabic": [
        "Modern Standard Arabic tutor for reading news and formal documents.",
        "Egyptian colloquial Arabic coach for daily conversation and travel.",
        "Quranic Arabic teacher focusing on recitation, tajweed, and comprehension.",
        "Arabic calligraphy and grammar instructor for all skill levels.",
    ],
    "Spanish": [
        "Spanish teacher covering grammar, conversation, and Latin American dialects.",
        "DELE exam preparation tutor with structured practice tests and feedback.",
        "Business Spanish coach for professionals in international markets.",
        "Conversational Spanish coach using storytelling and immersive role-play.",
    ],
    "Live Translation": [
        "Simultaneous interpreter for conferences, webinars, and international meetings.",
        "Live translator covering Arabic-English-French in real-time for events.",
        "Consecutive interpreter for business negotiations and legal proceedings.",
        "I provide live subtitling and real-time captioning for online broadcasts.",
    ],
    "Math Tutoring": [
        "PhD candidate tutoring calculus, linear algebra, and statistics for university students.",
        "High school math tutor covering algebra, geometry, and AP Calculus BC.",
        "I explain difficult math proofs clearly and help students develop problem-solving skills.",
        "IB and A-Level mathematics tutor with structured lesson plans and past papers.",
    ],
    "Science Tutoring": [
        "Physics tutor covering mechanics, thermodynamics, and electromagnetism at A-Level.",
        "Organic chemistry tutor helping students master reactions and mechanisms.",
        "Biology tutor specializing in cell biology, genetics, and ecology for IB students.",
        "I run virtual lab demonstrations and help with science project methodologies.",
    ],
    "Language Coaching": [
        "Public speaking coach helping professionals become confident presenters.",
        "Accent reduction specialist for non-native English speakers in corporate settings.",
        "Communication skills trainer for job interviews and salary negotiations.",
        "I coach TEDx speakers on storytelling structure, body language, and delivery.",
    ],
    "Exam Prep": [
        "SAT/ACT prep tutor improving scores by 200+ points with targeted drills.",
        "GRE and GMAT coach with adaptive practice tests and verbal strategy.",
        "IELTS tutor helping students achieve band 7+ with weekly mock tests.",
        "Medical entrance exam coach covering biology, chemistry, and critical thinking.",
    ],
    "Bookkeeping": [
        "Certified bookkeeper managing accounts receivable/payable in QuickBooks Online.",
        "I reconcile bank statements, categorize transactions, and prepare monthly P&L reports.",
        "Small business accountant handling VAT returns, payroll, and year-end closings.",
        "Xero certified bookkeeper cleaning up messy accounts and setting up chart of accounts.",
    ],
    "Presentation Support": [
        "PowerPoint designer creating visually compelling pitch decks for investors.",
        "I redesign bland slides into stunning visual stories with data visualization.",
        "Google Slides expert building reusable presentation templates for sales teams.",
        "Pitch deck consultant structuring narrative arc and visual hierarchy for startups.",
    ],
    "Market Research": [
        "Market researcher conducting competitive analysis and consumer surveys.",
        "I build industry reports covering market size, key players, and growth trends.",
        "Consumer insights analyst running focus groups and synthesizing qualitative data.",
        "Business analyst delivering TAM/SAM/SOM analysis for investor presentations.",
    ],
    "CV & Interview Coaching": [
        "Resume writer and LinkedIn optimizer helping candidates land interviews at FAANG.",
        "Career coach providing mock interviews, feedback, and negotiation strategies.",
        "I write ATS-optimized resumes tailored to specific job descriptions.",
        "Executive career coach helping C-level candidates with executive positioning.",
    ],
    "Cooking": [
        "Personal chef creating healthy weekly meal plans and cooking them at your home.",
        "Culinary instructor teaching knife skills, sauce techniques, and baking basics.",
        "Meal prep coach helping busy professionals batch-cook nutritious dinners.",
        "Pastry chef sharing cake decorating, bread baking, and dessert recipes.",
    ],
    "Home Organization": [
        "Professional organizer decluttering homes using the KonMari method.",
        "I design storage systems for kitchens, closets, and home offices.",
        "Home organization consultant helping families maintain tidy living spaces.",
        "Moving coordinator planning and organizing home transitions efficiently.",
    ],
    "Pet Care": [
        "Dog trainer using positive reinforcement for obedience and behavior correction.",
        "Pet sitter providing overnight stays and daily walks for dogs and cats.",
        "I provide grooming services: bathing, trimming, nail clipping for small breeds.",
        "Animal behaviorist consulting on anxiety, aggression, and separation issues.",
    ],
    "Errand Support": [
        "Personal assistant handling grocery shopping, appointment scheduling, and deliveries.",
        "Virtual assistant managing emails, calendars, and travel bookings remotely.",
        "I run errands for busy professionals: pharmacy, bank, dry cleaning, post office.",
        "Lifestyle manager coordinating household contractors and service appointments.",
    ],
    "Fitness Coaching": [
        "Certified personal trainer designing HIIT and strength programs for weight loss.",
        "Online fitness coach delivering personalized 12-week transformation programs.",
        "I create progressive overload programs for beginners to advanced athletes.",
        "Sports conditioning coach for runners, cyclists, and team sport athletes.",
    ],
    "Yoga": [
        "Registered yoga teacher (500 RYT) offering vinyasa, hatha, and restorative classes.",
        "I design private yoga sessions for stress relief, flexibility, and mindfulness.",
        "Prenatal yoga instructor guiding safe practice through all trimesters.",
        "Yoga therapist combining breathwork and asana for chronic pain management.",
    ],
    "Nutrition Guidance": [
        "Registered dietitian creating personalized meal plans for weight management.",
        "Sports nutritionist optimizing macros and timing for athletic performance.",
        "I provide evidence-based nutrition coaching for gut health and energy levels.",
        "Plant-based nutrition coach helping clients transition to vegan diets healthily.",
    ],
    "Meditation": [
        "Mindfulness meditation teacher offering guided sessions for stress and anxiety.",
        "I teach Vipassana, loving-kindness, and body scan techniques for beginners.",
        "Corporate mindfulness coach delivering workplace wellness programs.",
        "Sleep coach combining meditation and breathing exercises for insomnia relief.",
    ],
    "Guitar Lessons": [
        "Guitar teacher covering acoustic, electric, and fingerstyle for all levels.",
        "I teach music theory, scales, and chord progressions through songs you love.",
        "Rock and blues guitarist teaching improvisation, licks, and gear setup.",
        "Classical guitar instructor focusing on technique, sight-reading, and repertoire.",
    ],
    "Piano Lessons": [
        "Piano teacher for beginners to advanced students covering classical and contemporary.",
        "I teach sight-reading, scales, and jazz harmony on piano and keyboard.",
        "RCM exam prep piano tutor helping students pass grade exams with confidence.",
        "Pop and film score piano coach teaching by ear with chord charts.",
    ],
    "Singing Coaching": [
        "Vocal coach specializing in breath support, range extension, and tone quality.",
        "I prepare singers for auditions, open mics, and recording sessions.",
        "Pop and R&B singing teacher focusing on melisma, riffs, and stage presence.",
        "Classical voice instructor teaching bel canto technique and aria repertoire.",
    ],
    "Drawing & Painting": [
        "Art teacher covering drawing fundamentals: perspective, shading, and proportion.",
        "I teach watercolor, acrylic, and oil painting for beginners and intermediates.",
        "Digital illustration instructor teaching Procreate and Illustrator workflows.",
        "Portrait drawing coach helping students capture likeness and expression.",
    ],
}

CATEGORIES = {
    "Tech & Development": ["Web Development", "Mobile Development", "Data Analysis", "Excel & Spreadsheets", "Cybersecurity", "Video Editing", "Photo Editing", "3D Modeling"],
    "Design & Creativity": ["UI/UX Design", "Graphic Design", "Brand Identity", "Motion Graphics", "Content Creation"],
    "Languages & Translation": ["English", "French", "Arabic", "Spanish", "Live Translation"],
    "Education & Tutoring": ["Math Tutoring", "Science Tutoring", "Language Coaching", "Exam Prep"],
    "Business & Finance": ["Bookkeeping", "Presentation Support", "Market Research", "CV & Interview Coaching"],
    "Home & Lifestyle": ["Cooking", "Home Organization", "Pet Care", "Errand Support"],
    "Health & Wellness": ["Fitness Coaching", "Yoga", "Nutrition Guidance", "Meditation"],
    "Music & Arts": ["Guitar Lessons", "Piano Lessons", "Singing Coaching", "Drawing & Painting"],
}

# Reverse lookup: subcat -> category
SUBCAT_TO_CAT = {}
for cat, subs in CATEGORIES.items():
    for s in subs:
        SUBCAT_TO_CAT[s] = cat


def get_negative(anchor_subcat: str) -> str:
    """Return a sentence from a *different* category."""
    anchor_cat = SUBCAT_TO_CAT[anchor_subcat]
    other_cats = [c for c in CATEGORIES if c != anchor_cat]
    neg_cat = random.choice(other_cats)
    neg_subcat = random.choice(CATEGORIES[neg_cat])
    return random.choice(EXEMPLARS[neg_subcat])


def generate_triplets(n_per_subcat: int = 12) -> list[dict]:
    triplets = []
    for subcat, sentences in EXEMPLARS.items():
        for anchor in sentences:
            for _ in range(n_per_subcat // len(sentences) + 1):
                positives = [s for s in sentences if s != anchor]
                if not positives:
                    continue
                positive = random.choice(positives)
                negative = get_negative(subcat)
                triplets.append({
                    "anchor": anchor,
                    "positive": positive,
                    "negative": negative,
                    "label": subcat,
                    "category": SUBCAT_TO_CAT[subcat],
                })
    random.shuffle(triplets)
    return triplets


def generate_category_pairs() -> list[dict]:
    """Also generate category-level (anchor, positive) pairs for in-batch negatives."""
    pairs = []
    for subcat, sentences in EXEMPLARS.items():
        cat = SUBCAT_TO_CAT[subcat]
        for i, s1 in enumerate(sentences):
            for s2 in sentences[i + 1 :]:
                pairs.append({"sentence1": s1, "sentence2": s2, "label": 1.0, "category": cat, "subcategory": subcat})
    return pairs


if __name__ == "__main__":
    import os
    os.makedirs("data", exist_ok=True)

    triplets = generate_triplets(n_per_subcat=12)
    pairs = generate_category_pairs()

    with open("data/triplets.json", "w") as f:
        json.dump(triplets, f, indent=2)

    with open("data/pairs.json", "w") as f:
        json.dump(pairs, f, indent=2)

    print(f"Generated {len(triplets)} triplets and {len(pairs)} pairs")
    print(f"Subcategories covered: {len(EXEMPLARS)}")

    # Quick sanity check
    sample = triplets[0]
    print("\nSample triplet:")
    print(f"  Anchor  : {sample['anchor'][:80]}")
    print(f"  Positive: {sample['positive'][:80]}")
    print(f"  Negative: {sample['negative'][:80]}")
    print(f"  Label   : {sample['label']} ({sample['category']})")