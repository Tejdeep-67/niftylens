// JavaScript version of the sentiment model trained in ml/train_sentiment.py.
// TF-IDF -> logistic regression. The tokenizer has to match the Python one exactly,
// there is a test (tests/sentiment.test.js) that checks the probabilities match.

const URL_RE = /https?:\/\/\S+/g;
const CASHTAG_RE = /\$[a-z][a-z.]*/g;
const NUM_RE = /\d+(?:[.,]\d+)*/g;
const WORD_RE = /[a-z]+/g;

export function tokenize(text) {
  let t = String(text).toLowerCase();
  t = t.replace(URL_RE, " ").replace(CASHTAG_RE, " ").replace(/%/g, " pct ").replace(NUM_RE, " num ");
  const words = (t.match(WORD_RE) || []).filter((w) => w.length > 1);
  const out = words.slice();
  for (let i = 0; i < words.length - 1; i++) out.push(words[i] + " " + words[i + 1]);
  return out;
}

function softmax(z) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

export function createScorer(model) {
  const { labels, intercept, terms, sublinearTf } = model;

  function vectorize(text) {
    const counts = new Map();
    for (const tok of tokenize(text)) {
      if (terms[tok]) counts.set(tok, (counts.get(tok) || 0) + 1);
    }
    const vec = [];
    let norm = 0;
    for (const [tok, c] of counts) {
      const tf = sublinearTf ? 1 + Math.log(c) : c;
      const v = tf * terms[tok][0];
      vec.push([tok, v]);
      norm += v * v;
    }
    norm = Math.sqrt(norm) || 1;
    return vec.map(([tok, v]) => [tok, v / norm]);
  }

  function predict(text) {
    const vec = vectorize(text);
    const z = intercept.slice();
    for (const [tok, v] of vec) {
      const w = terms[tok];
      for (let c = 0; c < labels.length; c++) z[c] += v * w[c + 1];
    }
    const probs = softmax(z);
    let best = 0;
    for (let c = 1; c < probs.length; c++) if (probs[c] > probs[best]) best = c;
    const pos = probs[labels.indexOf("positive")];
    const neg = probs[labels.indexOf("negative")];
    return {
      label: labels[best],
      confidence: probs[best],
      probs,
      // single number between -1 (very negative) and +1 (very positive)
      score: pos - neg,
      known: vec.length,
    };
  }

  // which words pushed the prediction towards positive / negative
  function explain(text, top = 6) {
    const vec = vectorize(text);
    const pi = labels.indexOf("positive");
    const ni = labels.indexOf("negative");
    const contrib = vec.map(([tok, v]) => {
      const w = terms[tok];
      return { term: tok, value: v * (w[pi + 1] - w[ni + 1]) };
    });
    contrib.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    return contrib.slice(0, top);
  }

  return { predict, explain, labels };
}

// average sentiment of a list of scored headlines. newer headlines count more
// (weight halves every `halfLifeHours`)
export function aggregate(items, now = Date.now(), halfLifeHours = 48) {
  let wSum = 0;
  let sSum = 0;
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const it of items) {
    counts[it.label] = (counts[it.label] || 0) + 1;
    const ageH = it.published ? Math.max(0, (now - new Date(it.published).getTime()) / 3.6e6) : 0;
    const w = Math.pow(0.5, ageH / halfLifeHours);
    wSum += w;
    sSum += w * it.score;
  }
  const score = wSum ? sSum / wSum : 0;
  return { score, counts, n: items.length, mood: moodLabel(score) };
}

export function moodLabel(score) {
  if (score >= 0.25) return "Bullish";
  if (score >= 0.08) return "Mildly bullish";
  if (score > -0.08) return "Neutral";
  if (score > -0.25) return "Mildly bearish";
  return "Bearish";
}
