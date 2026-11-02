"""Compare my small model with FinBERT (ProsusAI/finbert, a BERT model fine-tuned on
financial text) on the same test sets.

FinBERT was fine-tuned on Financial PhraseBank, so its score on the PhraseBank test
split would be unfair (it has probably seen those sentences). I only compare on the
SEntFiN and Twitter test splits.

Needs: pip install torch transformers   (not needed for the app itself)
Run:   python ml/compare_finbert.py
"""
import json
import os
import time

import pandas as pd
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split

from train_sentiment import LABELS, OUT, SEED, load_sentfin, load_twitter

MODEL_NAME = "ProsusAI/finbert"


def main():
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    sf = load_sentfin()
    _, sf_test = train_test_split(sf, test_size=0.2, stratify=sf["label"], random_state=SEED)
    tw_test = load_twitter("sent_valid.csv")
    tests = {"sentfin_test": sf_test, "twitter_test": tw_test}

    tok = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME).eval()
    id2label = {int(k): v.lower() for k, v in model.config.id2label.items()}
    n_params = sum(p.numel() for p in model.parameters())

    out = {"model": MODEL_NAME, "params_millions": round(n_params / 1e6, 1), "scores": []}
    for name, df in tests.items():
        texts = df["text"].tolist()
        preds = []
        t0 = time.time()
        with torch.no_grad():
            for i in range(0, len(texts), 64):
                batch = tok(texts[i:i + 64], padding=True, truncation=True, max_length=64, return_tensors="pt")
                logits = model(**batch).logits
                preds += [id2label[j] for j in logits.argmax(-1).tolist()]
        secs = time.time() - t0
        res = {
            "set": name,
            "n": len(texts),
            "accuracy": round(accuracy_score(df["label"], preds), 4),
            "macro_f1": round(f1_score(df["label"], preds, average="macro", labels=LABELS), 4),
            "ms_per_headline_cpu": round(secs * 1000 / len(texts), 2),
        }
        print(res)
        out["scores"].append(res)

    with open(os.path.join(OUT, "finbert_comparison.json"), "w") as f:
        json.dump(out, f, indent=2)


if __name__ == "__main__":
    main()
