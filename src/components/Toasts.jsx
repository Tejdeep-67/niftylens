import { useMarket } from "../state/MarketData.jsx";
import { IconX } from "./Icons.jsx";

export default function Toasts() {
  const { toasts, dismiss } = useMarket();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind || ""}`} role="status">
          <div>
            <strong>{t.title}</strong>
            {t.body}
          </div>
          <button className="btn ghost small" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <IconX />
          </button>
        </div>
      ))}
    </div>
  );
}
