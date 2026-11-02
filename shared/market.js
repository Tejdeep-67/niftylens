// Market hours for NSE (cash segment). All times are IST (UTC+5:30, no DST).
// Holiday list taken from the NSE website (Holidays 2026 - Equities).

export const HOLIDAYS_2026 = {
  "2026-01-15": "Municipal Corporation Election - Maharashtra",
  "2026-01-26": "Republic Day",
  "2026-02-15": "Mahashivratri",
  "2026-03-03": "Holi",
  "2026-03-21": "Id-Ul-Fitr (Ramadan Eid)",
  "2026-03-26": "Shri Ram Navami",
  "2026-03-31": "Shri Mahavir Jayanti",
  "2026-04-03": "Good Friday",
  "2026-04-14": "Dr. Baba Saheb Ambedkar Jayanti",
  "2026-05-01": "Maharashtra Day",
  "2026-05-28": "Bakri Id",
  "2026-06-26": "Muharram",
  "2026-08-15": "Independence Day",
  "2026-09-14": "Ganesh Chaturthi",
  "2026-10-02": "Mahatma Gandhi Jayanti",
  "2026-10-20": "Dussehra",
  "2026-11-08": "Diwali Laxmi Pujan",
  "2026-11-10": "Diwali-Balipratipada",
  "2026-11-24": "Prakash Gurpurb Sri Guru Nanak Dev",
  "2026-12-25": "Christmas",
};

// Special sessions override the normal timings (Muhurat trading on Diwali, NSE circular).
// times are minutes after midnight IST
export const SPECIAL_SESSIONS = {
  "2026-11-08": { name: "Muhurat trading", preOpen: 14 * 60 + 5, open: 14 * 60 + 20, close: 15 * 60 + 30 },
};

const IST_OFFSET_MIN = 330;
const NORMAL = { preOpen: 9 * 60, open: 9 * 60 + 15, close: 15 * 60 + 30 };

// returns { date: "YYYY-MM-DD", minutes, weekday } for the given instant in IST
export function istParts(date = new Date()) {
  const t = new Date(date.getTime() + IST_OFFSET_MIN * 60000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return {
    date: `${y}-${m}-${d}`,
    minutes: t.getUTCHours() * 60 + t.getUTCMinutes(),
    seconds: t.getUTCSeconds(),
    weekday: t.getUTCDay(), // 0 = Sunday
  };
}

// session timings for a given IST date string, or null if the market doesn't trade that day
export function sessionFor(dateStr) {
  if (SPECIAL_SESSIONS[dateStr]) return SPECIAL_SESSIONS[dateStr];
  if (HOLIDAYS_2026[dateStr]) return null;
  const wd = new Date(dateStr + "T00:00:00Z").getUTCDay();
  if (wd === 0 || wd === 6) return null;
  return NORMAL;
}

function addDays(dateStr, n) {
  const t = new Date(dateStr + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

// convert IST date + minutes into a real Date
function istToDate(dateStr, minutes) {
  const t = new Date(dateStr + "T00:00:00Z").getTime();
  return new Date(t + (minutes - IST_OFFSET_MIN) * 60000);
}

export function nextOpen(now = new Date()) {
  const p = istParts(now);
  for (let i = 0; i < 15; i++) {
    const day = addDays(p.date, i);
    const s = sessionFor(day);
    if (!s) continue;
    if (i === 0 && p.minutes >= s.open) continue;
    return istToDate(day, s.open);
  }
  return null;
}

// state: "open" | "pre-open" | "closed"
export function marketStatus(now = new Date()) {
  const p = istParts(now);
  const s = sessionFor(p.date);
  let state = "closed";
  let reason = "";
  if (!s) {
    if (HOLIDAYS_2026[p.date]) reason = "Holiday: " + HOLIDAYS_2026[p.date];
    else reason = "Weekend";
  } else if (p.minutes >= s.open && p.minutes < s.close) {
    state = "open";
  } else if (p.minutes >= s.preOpen && p.minutes < s.open) {
    state = "pre-open";
  } else if (p.minutes < s.preOpen) {
    reason = "Opens later today";
  } else {
    reason = "Closed for the day";
  }
  const res = {
    state,
    reason,
    special: s && s.name ? s.name : null,
    istDate: p.date,
    istTime: `${String(Math.floor(p.minutes / 60)).padStart(2, "0")}:${String(p.minutes % 60).padStart(2, "0")}`,
  };
  if (state === "open") res.closesAt = istToDate(p.date, s.close).toISOString();
  else {
    const n = nextOpen(now);
    res.nextOpen = n ? n.toISOString() : null;
  }
  return res;
}

export function isTradingDay(dateStr) {
  return sessionFor(dateStr) !== null;
}
