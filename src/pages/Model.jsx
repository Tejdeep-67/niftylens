import { useEffect, useState } from "react";
import metrics from "../../ml/results/metrics.json";
import finbert from "../../ml/results/finbert_comparison.json";
import { getScorer } from "../lib/scorer.js";
import Skeleton from "../components/Skeleton.jsx";

const EXAMPLES = [
  "Sensex tanks 900 points as FIIs pull out Rs 8,000 crore",
  "Infosys Q2 net profit rises 11%, beats Street estimates",
  "RBI keeps repo rate unchanged at 5.5%",
  "Tata Steel shares hit 52-week high on strong China demand",
  "SEBI slaps Rs 25 lakh penalty on broker for violations",
];

const SET_NAMES = { sentfin_test: "SEntFiN (Indian)", phrasebank_test: "PhraseBank", twitter_test: "Twitter news", combined_test: "All three" };
const MODEL_NAMES = {
  majority_class: "Always \"neutral\" (baseline)",
  complement_nb: "Naive Bayes",
  linear_svm: "Linear SVM",
  logistic_regression: "Logistic regression (shipped)",
};

function Playground() {
  const [scorer, setScorer] = useState(null);
  const [text, setText] = useState(EXAMPLES[0]);
  useEffect(() => {
    getScorer().then(setScorer);
  }, []);
  const res = scorer && text.trim() ? scorer.predict(text) : null;
  const words = scorer && text.trim() ? scorer.explain(text, 8) : [];
  const colors = { negative: "var(--down)", neutral: "#6b7588", positive: "var(--up)" };
  return (
    <div className="panel reveal">
      <div className="panel-head"><h2>Try it</h2><span className="sub">runs in your browser</span></div>
      <label className="sr-only" htmlFor="headline">Headline</label>
      <textarea id="headline" className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a market headline…" style={{ resize: "vertical" }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {EXAMPLES.map((e) => (
          <button key={e} className="btn small" onClick={() => setText(e)} style={{ fontSize: 12 }}>{e.length > 38 ? e.slice(0, 36) + "…" : e}</button>
        ))}
      </div>
      {!scorer ? (
        <Skeleton h={120} style={{ marginTop: 16 }} />
      ) : res ? (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
            <span className={`label-chip ${res.label}`} style={{ fontSize: 13, width: "auto", padding: "4px 10px" }}>{res.label}</span>
            <span className="num muted">score {res.score > 0 ? "+" : ""}{res.score.toFixed(3)} · {res.known} known words/pairs</span>
          </div>
          <div className="prob-bars" style={{ marginTop: 14 }}>
            {scorer.labels.map((l, i) => (
              <div className="prob" key={l}>
                <span className="muted">{l}</span>
                <div className="track"><div className="fill" style={{ width: res.probs[i] * 100 + "%", background: colors[l] }} /></div>
                <span className="num">{(res.probs[i] * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          {words.length > 0 && (
            <>
              <div className="dim" style={{ fontSize: 12, marginTop: 16 }}>Words that pushed it (weight × tf-idf, positive minus negative class)</div>
              <div className="why">
                {words.map((w) => (
                  <span key={w.term} className={w.value >= 0 ? "pos" : "neg"}>{w.term} {w.value >= 0 ? "+" : "−"}{Math.abs(w.value).toFixed(2)}</span>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ConfusionMatrix({ cm, labels }) {
  const max = Math.max(...cm.flat());
  return (
    <div className="cm" role="table" aria-label="Confusion matrix">
      <div className="h">true ↓ / pred →</div>
      {labels.map((l) => <div key={l} className="h">{l}</div>)}
      {cm.map((row, i) => (
        <div key={i} style={{ display: "contents" }}>
          <div className="h">{labels[i]}</div>
          {row.map((v, j) => (
            <div key={j} className="num" style={{ background: i === j ? `rgba(122,162,255,${0.15 + (v / max) * 0.6})` : `rgba(255,95,109,${(v / max) * 0.6})`, color: "var(--text)" }}>
              {v}
              <div className="dim" style={{ fontSize: 10.5 }}>{((v / row.reduce((a, b) => a + b, 0)) * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Model() {
  const sets = ["sentfin_test", "phrasebank_test", "twitter_test", "combined_test"];
  const lr = metrics.models.logistic_regression;
  const sf = lr.scores.find((s) => s.set === "sentfin_test");
  const noIndia = metrics.logreg_without_indian_data.find((s) => s.set === "sentfin_test");
  const fb = Object.fromEntries(finbert.scores.map((s) => [s.set, s]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>The sentiment model</h1>
          <p>A small model I trained myself: TF-IDF features and logistic regression. ~330 KB, runs in a few milliseconds in JavaScript.</p>
        </div>
      </div>

      <div className="kpis">
        <div className="panel kpi reveal"><div className="k">Macro-F1 · Indian headlines</div><div className="v num">{sf.macro_f1.toFixed(3)}</div></div>
        <div className="panel kpi reveal"><div className="k">Accuracy · Indian headlines</div><div className="v num">{(sf.accuracy * 100).toFixed(1)}%</div></div>
        <div className="panel kpi reveal"><div className="k">Training sentences</div><div className="v num">{metrics.train_size.toLocaleString("en-IN")}</div></div>
        <div className="panel kpi reveal"><div className="k">Vocabulary</div><div className="v num">{metrics.vocab_size.toLocaleString("en-IN")}</div></div>
      </div>

      <div className="grid two-col" style={{ marginTop: 16 }}>
        <Playground />
        <div className="panel reveal prose">
          <div className="panel-head"><h2>How it works</h2></div>
          <p><strong>1. Clean.</strong> Lowercase, drop links and $tickers, turn numbers into "num" and % into "pct" (so "rises 12%" and "rises 8%" look the same).</p>
          <p><strong>2. TF-IDF.</strong> Every word and word pair gets a weight: common in this headline, rare across all headlines = high weight. Each headline becomes a vector over {metrics.vocab_size.toLocaleString("en-IN")} terms.</p>
          <p><strong>3. Logistic regression.</strong> One weight per term per class (negative / neutral / positive). Softmax turns the three sums into probabilities.</p>
          <p><strong>4. Score.</strong> P(positive) − P(negative), from −1 to +1. A stock's mood is the recency-weighted average over its headlines.</p>
          <p>The same maths runs in the Netlify function and in this page. A test checks the JS probabilities match the Python model on 200+ sentences.</p>
        </div>
      </div>

      <div className="panel reveal" style={{ marginTop: 16 }}>
        <div className="panel-head"><h2>Results on held-out test sets</h2><span className="sub">macro-F1 / accuracy</span></div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Model</th>{sets.map((s) => <th key={s}>{SET_NAMES[s]}</th>)}</tr>
            </thead>
            <tbody>
              {Object.entries(metrics.models).map(([k, m]) => (
                <tr key={k} style={k === "logistic_regression" ? { background: "var(--accent-soft)" } : undefined}>
                  <td>{MODEL_NAMES[k] || k}</td>
                  {sets.map((s) => {
                    const r = m.scores.find((x) => x.set === s);
                    return <td key={s} className="num">{r.macro_f1.toFixed(3)} <span className="dim">/ {(r.accuracy * 100).toFixed(1)}%</span></td>;
                  })}
                </tr>
              ))}
              <tr>
                <td>Logistic regression, no Indian data</td>
                {sets.map((s) => {
                  const r = metrics.logreg_without_indian_data.find((x) => x.set === s);
                  return <td key={s} className="num">{r.macro_f1.toFixed(3)} <span className="dim">/ {(r.accuracy * 100).toFixed(1)}%</span></td>;
                })}
              </tr>
              <tr>
                <td>FinBERT (110M params, not fine-tuned by me)</td>
                {sets.map((s) => (
                  <td key={s} className="num">{fb[s] ? <>{fb[s].macro_f1.toFixed(3)} <span className="dim">/ {(fb[s].accuracy * 100).toFixed(1)}%</span></> : <span className="dim">n/a</span>}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div className="prose" style={{ fontSize: 13.5, marginTop: 14 }}>
          <p>
            Adding the SEntFiN Indian headlines to training moved macro-F1 on Indian headlines from <strong>{noIndia.macro_f1.toFixed(3)}</strong> to <strong>{sf.macro_f1.toFixed(3)}</strong>.
            The linear SVM scores a little higher, but I ship logistic regression because it gives probabilities, which the score and the gauge need.
          </p>
          <p>
            FinBERT is not directly comparable: it was trained on PhraseBank (so I don't score it there) and never saw the SEntFiN or Twitter training splits, while my model did.
            It does show that a small in-domain model is good enough here at a fraction of the size.
          </p>
        </div>
      </div>

      <div className="grid two-col" style={{ marginTop: 16 }}>
        <div className="panel reveal">
          <div className="panel-head"><h2>Confusion matrix</h2><span className="sub">SEntFiN test, n = {sf.n}</span></div>
          <ConfusionMatrix cm={metrics.confusion_matrices.sentfin_test} labels={metrics.labels} />
          <p className="dim" style={{ fontSize: 12.5, marginTop: 12 }}>Most mistakes are neutral vs. something, not positive vs. negative.</p>
        </div>
        <div className="panel reveal">
          <div className="panel-head"><h2>Strongest words</h2></div>
          {["positive", "negative"].map((l) => (
            <div key={l} style={{ marginBottom: 14 }}>
              <div className={`label-chip ${l}`} style={{ marginBottom: 8 }}>{l}</div>
              <div className="why" style={{ marginTop: 0 }}>
                {metrics.top_words[l].slice(0, 12).map((w) => <span key={w} className={l === "positive" ? "pos" : "neg"}>{w}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel reveal prose" style={{ marginTop: 16 }}>
        <div className="panel-head"><h2>Data and limits</h2></div>
        <p>
          Training data: <strong>Financial PhraseBank</strong> v1.0 (Malo et al., 2014; CC BY-NC-SA 3.0, 50% agreement file),
          <strong> SEntFiN 1.0</strong> (Sinha et al., 2022; MIT; I kept headlines where all entities have the same label) and
          <strong> Twitter Financial News Sentiment</strong> (zeroshot, MIT). PhraseBank's licence is non-commercial, which is fine for a student project.
        </p>
        <p>
          Limits: it reads words, not meaning, so sarcasm, "falls less than expected" or two companies in one headline can fool it.
          Headlines often describe a price move that already happened, so a positive label is not a buy signal (see Insights).
        </p>
      </div>
    </>
  );
}
