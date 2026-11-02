"""Download the two labelled datasets used to train the headline sentiment model.

1. Financial PhraseBank v1.0 (Malo et al., 2014) - sentences from financial news,
   labelled by 5-8 annotators. Licence: CC BY-NC-SA 3.0.
   I use the "Sentences_50Agree" file (label = majority vote of annotators).
2. Twitter Financial News Sentiment (zeroshot on Hugging Face) - finance news
   headlines posted on Twitter, labelled bearish / bullish / neutral. Licence: MIT.

Files go to ml/data/ (git-ignored).
"""
import io
import os
import zipfile
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")

FPB_URL = "https://huggingface.co/datasets/takala/financial_phrasebank/resolve/main/data/FinancialPhraseBank-v1.0.zip"
TW_BASE = "https://huggingface.co/datasets/zeroshot/twitter-financial-news-sentiment/resolve/main/"


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    os.makedirs(DATA, exist_ok=True)
    fpb_path = os.path.join(DATA, "Sentences_50Agree.txt")
    if not os.path.exists(fpb_path):
        print("downloading financial phrasebank...")
        z = zipfile.ZipFile(io.BytesIO(download(FPB_URL)))
        with open(fpb_path, "wb") as f:
            f.write(z.read("FinancialPhraseBank-v1.0/Sentences_50Agree.txt"))
    for name in ["sent_train.csv", "sent_valid.csv"]:
        p = os.path.join(DATA, "twitter_" + name)
        if not os.path.exists(p):
            print("downloading", name)
            with open(p, "wb") as f:
                f.write(download(TW_BASE + name))
    print("data ready in", DATA)


if __name__ == "__main__":
    main()
