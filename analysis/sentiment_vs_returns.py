"""Does news sentiment say anything about the next day's return?

Steps
1. score every collected headline with the same model the app uses
   (weights read from shared/sentiment-model.js, so Python and JS agree)
2. download daily closes for the NIFTY 50 stocks and the NIFTY index (Yahoo chart API)
3. give each headline a "trading day": a headline published before 15:30 IST on day d
   belongs to day d, after 15:30 it belongs to the next trading day (it could only
   affect prices from then on)
4. for each (stock, day) with at least MIN_HEADLINES headlines, compare
     - same-day return     close(d-1) -> close(d)
     - next-day return     close(d)   -> close(d+1)   (the "does it lead?" question)
   both raw and in excess of the NIFTY 50 return that day
5. save numbers + chart data to public/data/insights.json for the Insights page

Run: python analysis/sentiment_vs_returns.py
"""
import csv
import datetime as dt
import json
import math
import os
import re
import time
import urllib.request
from collections import defaultdict

import numpy as np
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
MIN_HEADLINES = 2


# ---------- the model (same maths as shared/sentiment.js) ----------
def load_model():
    src = open(os.path.join(ROOT, "shared", "sentiment-model.js"), encoding="utf-8").read()
    body = src[src.index("export default ") + len("export default "):].rstrip().rstrip(";")
    return json.loads(body)


def tokenize(text):
    t = text.lower()
    t = re.sub(r"https?://\S+", " ", t)
    t = re.sub(r"\$[a-z][a-z.]*", " ", t)
    t = t.replace("%", " pct ")
    t = re.sub(r"\d+(?:[.,]\d+)*", " num ", t)
    words = [w for w in re.findall(r"[a-z]+", t) if len(w) > 1]
    return words + [words[i] + " " + words[i + 1] for i in range(len(words) - 1)]


def score(model, text):
    terms = model["terms"]
    counts = defaultdict(int)
    for tok in tokenize(text):
        if tok in terms:
            counts[tok] += 1
    vec = {tok: (1 + math.log(c)) * terms[tok][0] for tok, c in counts.items()}
    norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
    z = list(model["intercept"])
    for tok, v in vec.items():
        for c in range(3):
            z[c] += v / norm * terms[tok][c + 1]
    m = max(z)
    e = [math.exp(x - m) for x in z]
    s = sum(e)
    p = [x / s for x in e]
    return p[2] - p[0]  # positive - negative


# ---------- prices ----------
def daily_closes(yahoo_symbol):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(yahoo_symbol)}?range=1y&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.load(r)["chart"]["result"][0]
    out = {}
    for t, c in zip(d["timestamp"], d["indicators"]["quote"][0]["close"]):
        if c is not None:
            out[dt.datetime.fromtimestamp(t, IST).date()] = c
    return out


def trading_day_for(published_utc, days):
    """days = sorted list of trading dates. returns the trading day the headline belongs to"""
    local = published_utc.astimezone(IST)
    d = local.date()
    after_close = local.hour * 60 + local.minute >= 15 * 60 + 30
    for day in days:
        if day > d or (day == d and not after_close):
            return day
    return None


def main():
    import urllib.parse  # noqa: F401  (used in daily_closes)

    model = load_model()
    rows = list(csv.DictReader(open(os.path.join(HERE, "data", "headlines.csv"), encoding="utf-8")))
    symbols = sorted({r["symbol"] for r in rows})
    print(len(rows), "headlines for", len(symbols), "stocks")

    print("downloading prices...")
    prices = {}
    nifty = daily_closes("^NSEI")
    for s in symbols:
        for attempt in range(3):
            try:
                prices[s] = daily_closes(s + ".NS")
                break
            except Exception as e:
                print("retry", s, e)
                time.sleep(5)
        time.sleep(0.8)
    days = sorted(nifty)

    # sentiment per (stock, trading day)
    per_day = defaultdict(list)
    first = min(days)
    for r in rows:
        pub = dt.datetime.fromisoformat(r["published"])
        if pub.astimezone(IST).date() < first:
            continue
        day = trading_day_for(pub, days)
        if day is None:
            continue
        per_day[(r["symbol"], day)].append(score(model, r["title"]))

    idx = {d: i for i, d in enumerate(days)}
    samples = []
    for (sym, day), scores in per_day.items():
        if len(scores) < MIN_HEADLINES or sym not in prices:
            continue
        i = idx[day]
        if i == 0 or i + 1 >= len(days):
            continue
        p = prices[sym]
        d0, d1, d2 = days[i - 1], day, days[i + 1]
        if not (d0 in p and d1 in p and d2 in p):
            continue
        same = p[d1] / p[d0] - 1
        nxt = p[d2] / p[d1] - 1
        m_same = nifty[d1] / nifty[d0] - 1
        m_next = nifty[d2] / nifty[d1] - 1
        samples.append({
            "symbol": sym, "day": day.isoformat(), "n": len(scores), "sent": float(np.mean(scores)),
            "same": same * 100, "next": nxt * 100, "same_ex": (same - m_same) * 100, "next_ex": (nxt - m_next) * 100,
        })
    print(len(samples), "stock-days with at least", MIN_HEADLINES, "headlines")

    sent = np.array([s["sent"] for s in samples])

    def corr(key):
        y = np.array([s[key] for s in samples])
        pr, pp = stats.pearsonr(sent, y)
        sr, sp = stats.spearmanr(sent, y)
        return {"pearson": round(float(pr), 4), "pearson_p": round(float(pp), 4), "spearman": round(float(sr), 4), "spearman_p": round(float(sp), 4)}

    results = {k: corr(k) for k in ["same", "next", "same_ex", "next_ex"]}

    # buckets by daily sentiment
    def bucket(v):
        return "negative" if v <= -0.15 else "positive" if v >= 0.15 else "neutral"

    buckets = {}
    for b in ["negative", "neutral", "positive"]:
        sel = [s for s in samples if bucket(s["sent"]) == b]
        if not sel:
            continue
        nx = np.array([s["next_ex"] for s in sel])
        sm = np.array([s["same_ex"] for s in sel])
        buckets[b] = {
            "n": len(sel),
            "avg_next_excess": round(float(nx.mean()), 3),
            "se_next_excess": round(float(nx.std(ddof=1) / math.sqrt(len(sel))), 3),
            "avg_same_excess": round(float(sm.mean()), 3),
            "up_next_share": round(float((nx > 0).mean()), 3),
        }

    # direction hit rate: does the sign of sentiment match the sign of next-day excess return?
    strong = [s for s in samples if abs(s["sent"]) >= 0.15]
    hits = sum(1 for s in strong if (s["sent"] > 0) == (s["next_ex"] > 0))
    hit_rate = hits / len(strong) if strong else None
    binom_p = float(stats.binomtest(hits, len(strong), 0.5).pvalue) if strong else None

    rng = np.random.default_rng(0)
    pick = rng.choice(len(samples), size=min(400, len(samples)), replace=False)
    scatter = [[round(samples[i]["sent"], 3), round(samples[i]["next_ex"], 2), round(samples[i]["same_ex"], 2)] for i in sorted(pick)]

    out = {
        "generated": dt.date.today().isoformat(),
        "period": [min(s["day"] for s in samples), max(s["day"] for s in samples)],
        "headlines": len(rows),
        "stock_days": len(samples),
        "min_headlines": MIN_HEADLINES,
        "correlations": results,
        "buckets": buckets,
        "direction": {"n": len(strong), "hit_rate": round(hit_rate, 4) if hit_rate else None, "binom_p": round(binom_p, 4) if binom_p else None},
        "scatter": scatter,
    }
    os.makedirs(os.path.join(ROOT, "public", "data"), exist_ok=True)
    with open(os.path.join(ROOT, "public", "data", "insights.json"), "w") as f:
        json.dump(out, f)
    os.makedirs(os.path.join(HERE, "results"), exist_ok=True)
    with open(os.path.join(HERE, "results", "summary.json"), "w") as f:
        json.dump({k: v for k, v in out.items() if k != "scatter"}, f, indent=2)
    print(json.dumps({k: v for k, v in out.items() if k != "scatter"}, indent=2))


if __name__ == "__main__":
    main()
