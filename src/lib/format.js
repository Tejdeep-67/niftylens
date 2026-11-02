const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function price(n) {
  return n == null || !Number.isFinite(n) ? "--" : inr.format(n);
}

export function rupees(n, digits = 2) {
  if (n == null || !Number.isFinite(n)) return "--";
  const sign = n < 0 ? "-" : "";
  return sign + "₹" + (digits === 0 ? inr0.format(Math.abs(n)) : inr.format(Math.abs(n)));
}

export function signed(n, d = 2) {
  if (n == null || !Number.isFinite(n)) return "--";
  return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(d);
}

export function pct(n, d = 2) {
  if (n == null || !Number.isFinite(n)) return "--";
  return signed(n, d) + "%";
}

// 1.2 Cr, 34.5 L etc. (Indian units)
export function compact(n) {
  if (n == null || !Number.isFinite(n)) return "--";
  const a = Math.abs(n);
  if (a >= 1e7) return (n / 1e7).toFixed(a >= 1e9 ? 0 : 2) + " Cr";
  if (a >= 1e5) return (n / 1e5).toFixed(2) + " L";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n));
}

export function tone(n) {
  if (n == null || n === 0) return "flat";
  return n > 0 ? "up" : "down";
}

export function timeAgo(date, now = Date.now()) {
  if (!date) return "";
  const s = Math.round((now - new Date(date).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return Math.round(s / 60) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  return Math.round(s / 86400) + "d ago";
}

export function istTime(date) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

export function istDateTime(date) {
  return new Date(date).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}
