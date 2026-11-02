import { useState } from "react";
import { getScorer } from "../lib/scorer.js";
import { timeAgo } from "../lib/format.js";

function Why({ title }) {
  const [words, setWords] = useState(null);
  const [open, setOpen] = useState(false);
  const toggle = async () => {
    if (!open && !words) {
      const s = await getScorer();
      setWords(s.explain(title, 5));
    }
    setOpen((o) => !o);
  };
  return (
    <>
      <button className="why-btn" onClick={toggle} aria-expanded={open}>
        {open ? "hide" : "why?"}
      </button>
      {open && words && (
        <div className="why" style={{ flexBasis: "100%" }}>
          {words.length === 0 && <span className="dim">no known words, so it falls back to the bias of the model</span>}
          {words.map((w) => (
            <span key={w.term} className={w.value >= 0 ? "pos" : "neg"} title="contribution to positive minus negative">
              {w.term} {w.value >= 0 ? "+" : "−"}{Math.abs(w.value).toFixed(2)}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

export default function NewsList({ items, limit = 50, filter = "all" }) {
  const list = items.filter((it) => filter === "all" || it.label === filter).slice(0, limit);
  if (!list.length) return <p className="empty">No headlines here.</p>;
  return (
    <ul className="news-list">
      {list.map((it, i) => (
        <li key={it.link || i} className="news-item">
          <span className={`label-chip ${it.label}`}>{it.label}</span>
          <div style={{ minWidth: 0 }}>
            <a className="title" href={it.link} target="_blank" rel="noreferrer">
              {it.title}
            </a>
            <div className="src">
              <span>{it.source || "News"}</span>
              {it.published && <span>· {timeAgo(it.published)}</span>}
              <span className="num">· score {it.score > 0 ? "+" : ""}{it.score.toFixed(2)}</span>
              <Why title={it.title} />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// running average of the score, oldest -> newest, for a small trend line
export function sentimentTrend(items, window = 5) {
  const sorted = items.filter((i) => i.published).sort((a, b) => a.published.localeCompare(b.published));
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const slice = sorted.slice(Math.max(0, i - window + 1), i + 1);
    out.push(slice.reduce((a, b) => a + b.score, 0) / slice.length);
  }
  return out;
}
