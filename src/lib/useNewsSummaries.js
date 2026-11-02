import { useEffect, useState } from "react";
import { api } from "./api.js";

// fetch the news sentiment summary for a few symbols, one after another
export function useNewsSummaries(symbols) {
  const [map, setMap] = useState({});
  const key = symbols.join(",");
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const s of symbols) {
        try {
          const r = await api.news(s);
          if (!alive) return;
          setMap((m) => ({ ...m, [s]: r.data.summary }));
        } catch {
          if (alive) setMap((m) => ({ ...m, [s]: null }));
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return map;
}
