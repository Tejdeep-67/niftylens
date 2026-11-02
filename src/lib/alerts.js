// Alert rules are checked every time new prices (or sentiment) arrive.
// They are edge triggered: a rule fires when its condition becomes true and then
// re-arms only after the condition goes false again. Otherwise "price above 3000"
// would fire on every 30 second refresh.

export const ALERT_TYPES = {
  above: { label: "Price above", unit: "₹" },
  below: { label: "Price below", unit: "₹" },
  moveUp: { label: "Up more than", unit: "% today" },
  moveDown: { label: "Down more than", unit: "% today" },
  sentimentNeg: { label: "News sentiment turns negative", unit: "score below" },
};

export function conditionMet(rule, quote, sentiment) {
  switch (rule.type) {
    case "above":
      return quote != null && quote.price >= rule.value;
    case "below":
      return quote != null && quote.price <= rule.value;
    case "moveUp":
      return quote != null && quote.changePct >= rule.value;
    case "moveDown":
      return quote != null && quote.changePct <= -Math.abs(rule.value);
    case "sentimentNeg":
      return sentiment != null && sentiment.n >= 3 && sentiment.score <= -Math.abs(rule.value);
    default:
      return false;
  }
}

export function describe(rule) {
  const t = ALERT_TYPES[rule.type];
  if (!t) return rule.type;
  if (rule.type === "above" || rule.type === "below") return `${t.label} ₹${rule.value}`;
  if (rule.type === "sentimentNeg") return `${t.label} (score ≤ −${Math.abs(rule.value)})`;
  return `${t.label} ${rule.value}%`;
}

// returns { rules (with updated armed flags), fired: [{rule, message}] }
export function evaluate(rules, quotes, sentiments = {}, now = Date.now()) {
  const fired = [];
  const next = rules.map((rule) => {
    if (!rule.enabled) return rule;
    const quote = quotes[rule.symbol];
    const sent = sentiments[rule.symbol];
    // no data for this rule yet -> leave it alone
    if (rule.type === "sentimentNeg" ? !sent : !quote) return rule;
    const met = conditionMet(rule, quote, sent);
    const armed = rule.armed !== false;
    if (met && armed) {
      fired.push({ rule, message: messageFor(rule, quote, sent), at: now });
      return { ...rule, armed: false, lastFired: now };
    }
    if (!met && !armed) return { ...rule, armed: true };
    return rule;
  });
  return { rules: next, fired };
}

function messageFor(rule, q, s) {
  switch (rule.type) {
    case "above":
      return `${rule.symbol} is at ₹${q.price.toFixed(2)}, above your ₹${rule.value} level`;
    case "below":
      return `${rule.symbol} is at ₹${q.price.toFixed(2)}, below your ₹${rule.value} level`;
    case "moveUp":
      return `${rule.symbol} is up ${q.changePct.toFixed(2)}% today`;
    case "moveDown":
      return `${rule.symbol} is down ${Math.abs(q.changePct).toFixed(2)}% today`;
    case "sentimentNeg":
      return `News sentiment for ${rule.symbol} turned negative (score ${s.score.toFixed(2)} over ${s.n} headlines)`;
    default:
      return rule.symbol;
  }
}
