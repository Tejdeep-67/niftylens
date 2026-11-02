import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { STOCKS, INDICES } from "../../shared/symbols.js";
import { IconSearch } from "./Icons.jsx";

const ALL = [...INDICES.map((i) => ({ symbol: i.symbol, short: i.name, sector: "Index" })), ...STOCKS];

export function searchSymbols(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return ALL.filter((x) => x.symbol.toLowerCase().includes(s) || x.short.toLowerCase().includes(s) || (x.name || "").toLowerCase().includes(s))
    .sort((a, b) => (a.symbol.toLowerCase().startsWith(s) ? -1 : 0) - (b.symbol.toLowerCase().startsWith(s) ? -1 : 0))
    .slice(0, 8);
}

// onPick: optional, otherwise navigates to the stock page
export default function Search({ onPick, placeholder = "Search NIFTY 50…", stocksOnly = false, className = "" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const ref = useRef();
  const results = useMemo(() => searchSymbols(q).filter((r) => !stocksOnly || r.sector !== "Index"), [q, stocksOnly]);

  const pick = (r) => {
    setQ("");
    setOpen(false);
    if (onPick) onPick(r.symbol);
    else nav(`/stock/${encodeURIComponent(r.symbol)}`);
  };

  return (
    <div className={`search ${className}`} ref={ref} onBlur={(e) => !ref.current.contains(e.relatedTarget) && setOpen(false)}>
      <IconSearch />
      <input
        className="input"
        value={q}
        placeholder={placeholder}
        aria-label={placeholder}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-autocomplete="list"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setSel(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          if (e.key === "Enter" && results[sel]) pick(results[sel]);
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && results.length > 0 && (
        <div className="search-results" role="listbox">
          {results.map((r, i) => (
            <button key={r.symbol} role="option" aria-selected={i === sel} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(r)}>
              <span><b>{r.symbol}</b> <span className="muted">{r.short}</span></span>
              <span className="dim">{r.sector}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
