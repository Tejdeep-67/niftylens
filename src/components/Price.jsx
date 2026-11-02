import { useEffect, useState } from "react";
import { price as fmt } from "../lib/format.js";

// price that flashes green/red for a moment when it changes
export default function Price({ value, flash, className = "" }) {
  const [cls, setCls] = useState("");
  useEffect(() => {
    if (!flash) return;
    setCls("flash-" + flash);
    const t = setTimeout(() => setCls(""), 1000);
    return () => clearTimeout(t);
  }, [value, flash]);
  return <span className={`num price-cell ${cls} ${className}`}>{fmt(value)}</span>;
}
