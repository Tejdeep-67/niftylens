"""Train the headline sentiment model used by NiftyLens.

Model: TF-IDF (words + word pairs) -> multinomial logistic regression.
I picked this because it is small (runs in JavaScript in a few ms), fast to train
and easy to explain: every word gets a weight per class, so you can show *why*
a headline was called positive or negative.

Data (see get_data.py):
  - Financial PhraseBank, Sentences_50Agree  -> stratified 80/20 train/test split
  - Twitter Financial News Sentiment        -> its own train / valid files (valid = test)
Both are mapped to: negative / neutral / positive.

Run:  python ml/get_data.py && python ml/train_sentiment.py
Outputs:
  ml/results/metrics.json, ml/results/report.txt, ml/results/confusion_matrix.png
  shared/sentiment-model.js  (vocabulary, idf and weights for the JS scorer)
  ml/results/parity_cases.json (sample predictions used by the JS test)
"""
import json
import math
import os
import re
import time

import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.naive_bayes import ComplementNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
OUT = os.path.join(HERE, "results")
MODEL_JS = os.path.join(HERE, "..", "shared", "sentiment-model.js")
LABELS = ["negative", "neutral", "positive"]
SEED = 42


# ---------- text preprocessing (the JS version in shared/sentiment.js must do exactly the same) ----------
URL_RE = re.compile(r"https?://\S+")
CASHTAG_RE = re.compile(r"\$[a-z][a-z.]*")
NUM_RE = re.compile(r"\d+(?:[.,]\d+)*")
WORD_RE = re.compile(r"[a-z]+")


def tokenize(text):
    t = text.lower()
    t = URL_RE.sub(" ", t)
    t = CASHTAG_RE.sub(" ", t)
    t = t.replace("%", " pct ")
    t = NUM_RE.sub(" num ", t)
    words = [w for w in WORD_RE.findall(t) if len(w) > 1]
    # unigrams + bigrams
    return words + [words[i] + " " + words[i + 1] for i in range(len(words) - 1)]


# ---------- data ----------
def load_fpb():
    rows = []
    with open(os.path.join(DATA, "Sentences_50Agree.txt"), encoding="latin-1") as f:
        for line in f:
            line = line.strip()
            if "@" not in line:
                continue
            text, label = line.rsplit("@", 1)
            rows.append((text.strip(), label.strip()))
    df = pd.DataFrame(rows, columns=["text", "label"]).drop_duplicates("text")
    return df


def load_twitter(name):
    df = pd.read_csv(os.path.join(DATA, "twitter_" + name))
    mapping = {0: "negative", 1: "positive", 2: "neutral"}  # bearish, bullish, neutral
    df["label"] = df["label"].map(mapping)
    return df[["text", "label"]].drop_duplicates("text")


def evaluate(name, y_true, y_pred):
    return {
        "set": name,
        "n": int(len(y_true)),
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "macro_f1": round(float(f1_score(y_true, y_pred, average="macro")), 4),
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    fpb = load_fpb()
    fpb_train, fpb_test = train_test_split(fpb, test_size=0.2, stratify=fpb["label"], random_state=SEED)
    tw_train = load_twitter("sent_train.csv")
    tw_test = load_twitter("sent_valid.csv")
    # make sure no test sentence leaks into training
    tw_train = tw_train[~tw_train["text"].isin(tw_test["text"])]

    train = pd.concat([fpb_train.assign(src="fpb"), tw_train.assign(src="twitter")], ignore_index=True)
    tests = {
        "phrasebank_test": fpb_test,
        "twitter_test": tw_test,
        "combined_test": pd.concat([fpb_test, tw_test], ignore_index=True),
    }
    print("train size", len(train), train["label"].value_counts().to_dict())
    for k, v in tests.items():
        print(k, len(v), v["label"].value_counts().to_dict())

    def vec():
        return TfidfVectorizer(analyzer=tokenize, min_df=2, sublinear_tf=True, max_features=8000)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    candidates = {
        "majority_class": Pipeline([("tfidf", vec()), ("clf", DummyClassifier(strategy="most_frequent"))]),
        "complement_nb": GridSearchCV(
            Pipeline([("tfidf", vec()), ("clf", ComplementNB())]),
            {"clf__alpha": [0.1, 0.3, 1.0]}, cv=cv, scoring="f1_macro", n_jobs=-1),
        "linear_svm": GridSearchCV(
            Pipeline([("tfidf", vec()), ("clf", LinearSVC(class_weight="balanced"))]),
            {"clf__C": [0.1, 0.3, 1.0]}, cv=cv, scoring="f1_macro", n_jobs=-1),
        "logistic_regression": GridSearchCV(
            Pipeline([("tfidf", vec()), ("clf", LogisticRegression(max_iter=3000, class_weight="balanced"))]),
            {"clf__C": [1.0, 3.0, 10.0]}, cv=cv, scoring="f1_macro", n_jobs=-1),
    }

    results = {}
    for name, model in candidates.items():
        t0 = time.time()
        model.fit(train["text"], train["label"])
        info = {"train_seconds": round(time.time() - t0, 1), "scores": []}
        if hasattr(model, "best_params_"):
            info["best_params"] = model.best_params_
            info["cv_macro_f1"] = round(float(model.best_score_), 4)
        for tname, tdf in tests.items():
            info["scores"].append(evaluate(tname, tdf["label"], model.predict(tdf["text"])))
        results[name] = info
        print(name, json.dumps(info))

    best = candidates["logistic_regression"].best_estimator_
    tfidf = best.named_steps["tfidf"]
    clf = best.named_steps["clf"]

    # detailed report + confusion matrix for the shipped model
    lines = []
    cms = {}
    for tname, tdf in tests.items():
        pred = best.predict(tdf["text"])
        lines.append(f"=== {tname} (n={len(tdf)}) ===")
        lines.append(classification_report(tdf["label"], pred, labels=LABELS, digits=3))
        cms[tname] = confusion_matrix(tdf["label"], pred, labels=LABELS).tolist()
        lines.append("confusion matrix (rows = true, cols = predicted) " + str(LABELS))
        lines.append(str(np.array(cms[tname])))
        lines.append("")
    report = "\n".join(lines)
    print(report)
    with open(os.path.join(OUT, "report.txt"), "w") as f:
        f.write(report)

    # most important words per class (for the README / model page)
    vocab = tfidf.get_feature_names_out()
    top = {}
    for ci, label in enumerate(clf.classes_):
        order = np.argsort(clf.coef_[ci])[::-1][:15]
        top[label] = [vocab[i] for i in order]

    metrics = {
        "trained_at": time.strftime("%Y-%m-%d"),
        "train_size": int(len(train)),
        "test_sizes": {k: int(len(v)) for k, v in tests.items()},
        "label_counts_train": train["label"].value_counts().to_dict(),
        "models": results,
        "shipped_model": "logistic_regression",
        "confusion_matrices": cms,
        "labels": LABELS,
        "vocab_size": int(len(vocab)),
        "top_words": top,
    }
    with open(os.path.join(OUT, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    plot_confusion(cms, os.path.join(OUT, "confusion_matrix.png"))
    export_js(tfidf, clf, metrics)
    write_parity_cases(best, tests["combined_test"])


def plot_confusion(cms, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 2, figsize=(10, 4.2))
    for ax, name in zip(axes, ["phrasebank_test", "twitter_test"]):
        cm = np.array(cms[name])
        norm = cm / cm.sum(axis=1, keepdims=True)
        ax.imshow(norm, cmap="Blues", vmin=0, vmax=1)
        for i in range(3):
            for j in range(3):
                ax.text(j, i, f"{cm[i, j]}\n{norm[i, j]:.0%}", ha="center", va="center",
                        color="white" if norm[i, j] > 0.5 else "black", fontsize=9)
        ax.set_xticks(range(3), LABELS)
        ax.set_yticks(range(3), LABELS)
        ax.set_xlabel("predicted")
        ax.set_ylabel("true")
        ax.set_title(name.replace("_", " "))
    plt.tight_layout()
    plt.savefig(path, dpi=130)


def export_js(tfidf, clf, metrics):
    vocab = tfidf.get_feature_names_out()
    idf = tfidf.idf_
    # one entry per term: [idf, w_negative, w_neutral, w_positive]
    order = [list(clf.classes_).index(l) for l in LABELS]
    terms = {}
    for i, term in enumerate(vocab):
        terms[term] = [round(float(idf[i]), 4)] + [round(float(clf.coef_[c][i]), 4) for c in order]
    model = {
        "labels": LABELS,
        "intercept": [round(float(clf.intercept_[c]), 5) for c in order],
        "sublinearTf": True,
        "terms": terms,
        "info": {
            "type": "tfidf + logistic regression",
            "trained": metrics["trained_at"],
            "train_size": metrics["train_size"],
            "scores": metrics["models"]["logistic_regression"]["scores"],
        },
    }
    with open(MODEL_JS, "w") as f:
        f.write("// generated by ml/train_sentiment.py - do not edit by hand\n")
        f.write("export default ")
        json.dump(model, f, separators=(",", ":"))
        f.write(";\n")
    print("wrote", MODEL_JS, os.path.getsize(MODEL_JS) // 1024, "KB")


def write_parity_cases(model, df):
    sample = df.sample(200, random_state=SEED)
    extra = ["Sensex crashes 1,200 points as FII selling continues",
             "TCS Q2 profit rises 9% YoY, beats estimates; declares dividend",
             "RBI keeps repo rate unchanged at 6.5%"]
    texts = list(sample["text"]) + extra
    probs = model.predict_proba(texts)
    classes = list(model.classes_)
    cases = [{"text": t, "probs": [round(float(p[classes.index(l)]), 6) for l in LABELS]} for t, p in zip(texts, probs)]
    with open(os.path.join(OUT, "parity_cases.json"), "w") as f:
        json.dump(cases, f)


if __name__ == "__main__":
    main()
