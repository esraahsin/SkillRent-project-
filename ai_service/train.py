"""
Fine-tune sentence-transformers on SkillRent skill descriptions.
Compatible with sentence-transformers >= 3.0 (SentenceTransformerTrainer API).

Usage:
    python train.py

Output: ./fine_tuned_model/
"""

import json
import os
import random

random.seed(42)


def load_data():
    if not os.path.exists("data/triplets.json") or not os.path.exists("data/pairs.json"):
        print("Generating dataset first...")
        import subprocess
        subprocess.run(["python", "data/generate_dataset.py"], check=True)

    with open("data/triplets.json") as f:
        triplets = json.load(f)
    with open("data/pairs.json") as f:
        pairs = json.load(f)
    return triplets, pairs


def main():
    print("Loading libraries...")
    from sentence_transformers import SentenceTransformer
    from sentence_transformers.training_args import SentenceTransformerTrainingArguments
    from sentence_transformers.trainer import SentenceTransformerTrainer
    from sentence_transformers.losses import TripletLoss, MultipleNegativesRankingLoss
    from sentence_transformers.evaluation import TripletEvaluator
    from datasets import Dataset

    # -----------------------------------------------------------------------
    # Config
    # -----------------------------------------------------------------------
    BASE_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
    OUTPUT_DIR = "./fine_tuned_model"
    EPOCHS     = 4
    BATCH_SIZE = 16   # raise to 32 if you have a GPU

    # -----------------------------------------------------------------------
    # Data
    # -----------------------------------------------------------------------
    triplets, pairs = load_data()
    print(f"Loaded {len(triplets)} triplets, {len(pairs)} pairs")

    random.shuffle(triplets)
    split = int(0.9 * len(triplets))
    train_triplets = triplets[:split]
    eval_triplets  = triplets[split:]

    train_triplet_ds = Dataset.from_dict({
        "anchor":   [t["anchor"]   for t in train_triplets],
        "positive": [t["positive"] for t in train_triplets],
        "negative": [t["negative"] for t in train_triplets],
    })

    train_pair_ds = Dataset.from_dict({
        "anchor":   [p["sentence1"] for p in pairs],
        "positive": [p["sentence2"] for p in pairs],
    })

    eval_triplet_ds = Dataset.from_dict({
        "anchor":   [t["anchor"]   for t in eval_triplets],
        "positive": [t["positive"] for t in eval_triplets],
        "negative": [t["negative"] for t in eval_triplets],
    })

    # -----------------------------------------------------------------------
    # Model + losses
    # -----------------------------------------------------------------------
    model        = SentenceTransformer(BASE_MODEL)
    triplet_loss = TripletLoss(model=model)
    mnr_loss     = MultipleNegativesRankingLoss(model=model)
    print(f"Base model loaded: {BASE_MODEL}")

    # -----------------------------------------------------------------------
    # Evaluator
    # -----------------------------------------------------------------------
    evaluator = TripletEvaluator(
        anchors=eval_triplet_ds["anchor"],
        positives=eval_triplet_ds["positive"],
        negatives=eval_triplet_ds["negative"],
        name="skillrent-eval",
    )

    # -----------------------------------------------------------------------
    # Training arguments
    # -----------------------------------------------------------------------
    total_steps  = (len(train_triplets) // BATCH_SIZE) * EPOCHS
    warmup_steps = max(1, int(0.1 * total_steps))

    args = SentenceTransformerTrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        warmup_steps=warmup_steps,
        fp16=False,
        bf16=False,
        logging_steps=10,
        eval_strategy="steps",
        eval_steps=50,
        save_strategy="epoch",
        load_best_model_at_end=False,
        run_name="skillrent-ai",
    )

    # -----------------------------------------------------------------------
    # Trainer
    # -----------------------------------------------------------------------
    trainer = SentenceTransformerTrainer(
        model=model,
        args=args,
        train_dataset={"triplets": train_triplet_ds, "pairs": train_pair_ds},
        eval_dataset={"triplets": eval_triplet_ds},
        loss={"triplets": triplet_loss, "pairs": mnr_loss},
        evaluator=evaluator,
    )

    print(f"\nTraining — {EPOCHS} epochs, ~{total_steps} steps, {warmup_steps} warmup")
    trainer.train()

    # -----------------------------------------------------------------------
    # Save
    # -----------------------------------------------------------------------
    model.save(OUTPUT_DIR)
    print(f"\nModel saved to: {OUTPUT_DIR}")

    # -----------------------------------------------------------------------
    # Smoke test
    # -----------------------------------------------------------------------
    print("\nSmoke test...")
    from sklearn.metrics.pairwise import cosine_similarity
    test_model = SentenceTransformer(OUTPUT_DIR)

    anchors   = [
        "I build React apps with Node.js and PostgreSQL.",
        "I teach calculus and linear algebra to university students.",
        "Certified personal trainer offering HIIT programs.",
    ]
    positives = [
        "Full-stack developer with expertise in Vue and Express REST APIs.",
        "Math tutor helping students ace their university exams.",
        "Online fitness coach creating 12-week transformation plans.",
    ]
    negatives = [
        "Dog trainer using positive reinforcement techniques.",
        "Brand identity designer creating logo guidelines.",
        "Yoga instructor teaching vinyasa flow classes.",
    ]

    a = test_model.encode(anchors,   normalize_embeddings=True)
    p = test_model.encode(positives, normalize_embeddings=True)
    n = test_model.encode(negatives, normalize_embeddings=True)

    for i in range(len(anchors)):
        sp = cosine_similarity([a[i]], [p[i]])[0][0]
        sn = cosine_similarity([a[i]], [n[i]])[0][0]
        ok = "OK" if sp > sn else "FAIL"
        print(f"  [{ok}]  pos={sp:.3f}  neg={sn:.3f}  margin={sp-sn:+.3f}")

    print("\nDone! Run: uvicorn main:app --reload")


if __name__ == "__main__":
    main()