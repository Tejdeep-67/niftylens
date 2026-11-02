"""Collect past headlines for every NIFTY 50 stock from Google News RSS,
so I can check whether news sentiment says anything about next-day returns.

Google News search supports after:/before: in the query, so I ask for one
window at a time. Each query returns at most ~100 items, so this is a sample,
not every article.

Run: python analysis/collect_headlines.py --days 90
Output: analysis/data/headlines.csv (symbol, published, source, title)
"""
import argparse
import csv
import datetime as dt
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "data")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"


def load_stocks():
    # read the symbol list from shared/symbols.js so there is one source of truth
    src = open(os.path.join(HERE, "..", "shared", "symbols.js"), encoding="utf-8").read()
    rows = re.findall(r'symbol: "([^"]+)", name: "[^"]+", short: "[^"]+", sector: "[^"]+", q: "([^"]+)"', src)
    return rows


def fetch(query):
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": query, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def parse(xml_bytes):
    root = ET.fromstring(xml_bytes)
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        source = (item.findtext("source") or "").strip()
        pub = item.findtext("pubDate")
        if source and title.endswith(" - " + source):
            title = title[: -(len(source) + 3)]
        try:
            published = dt.datetime.strptime(pub, "%a, %d %b %Y %H:%M:%S %Z").replace(tzinfo=dt.timezone.utc)
        except Exception:
            continue
        yield published, source, title


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=90)
    ap.add_argument("--window", type=int, default=15)
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    today = dt.date.today()
    windows = []
    start = today - dt.timedelta(days=args.days)
    while start < today:
        end = min(start + dt.timedelta(days=args.window), today + dt.timedelta(days=1))
        windows.append((start, end))
        start = end

    seen = set()
    rows = []
    stocks = load_stocks()
    for i, (sym, q) in enumerate(stocks):
        for a, b in windows:
            query = f'"{q}" after:{a.isoformat()} before:{b.isoformat()}'
            try:
                items = list(parse(fetch(query)))
            except Exception as e:
                print("failed", sym, a, e)
                time.sleep(5)
                continue
            for published, source, title in items:
                key = (sym, title.lower())
                if key in seen:
                    continue
                seen.add(key)
                rows.append([sym, published.isoformat(), source, title])
            time.sleep(1.0)
        print(f"{i + 1}/{len(stocks)} {sym}: {sum(1 for r in rows if r[0] == sym)} headlines")

    path = os.path.join(OUT, "headlines.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["symbol", "published", "source", "title"])
        w.writerows(sorted(rows, key=lambda r: (r[0], r[1])))
    print("saved", len(rows), "headlines to", path)


if __name__ == "__main__":
    main()
