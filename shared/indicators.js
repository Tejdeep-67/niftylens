// Technical indicators. Inputs are plain arrays of numbers (closes), oldest first.
// Outputs are arrays of the same length with null where there isn't enough data yet.

export function sma(values, period) {
  const out = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

// EMA seeded with the SMA of the first `period` values (the usual way)
export function ema(values, period) {
  const out = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

// RSI with Wilder's smoothing.
// first avg gain/loss = simple average of the first `period` changes,
// after that avg = (prevAvg * (period - 1) + current) / period
export function rsi(values, period = 14) {
  const out = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = values[i] - values[i - 1];
    if (ch > 0) gain += ch;
    else loss -= ch;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = toRsi(avgGain, avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const ch = values[i] - values[i - 1];
    const g = ch > 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = toRsi(avgGain, avgLoss);
  }
  return out;
}

function toRsi(avgGain, avgLoss) {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(values, fast = 12, slow = 26, signal = 9) {
  const f = ema(values, fast);
  const s = ema(values, slow);
  const line = values.map((_, i) => (f[i] == null || s[i] == null ? null : f[i] - s[i]));
  const start = line.findIndex((v) => v != null);
  const sig = new Array(values.length).fill(null);
  if (start >= 0) {
    const e = ema(line.slice(start), signal);
    e.forEach((v, j) => (sig[start + j] = v));
  }
  const hist = line.map((v, i) => (v == null || sig[i] == null ? null : v - sig[i]));
  return { line, signal: sig, hist };
}

export function pctChange(a, b) {
  if (!b) return 0;
  return ((a - b) / b) * 100;
}

// simple daily log returns
export function logReturns(values) {
  const out = [];
  for (let i = 1; i < values.length; i++) out.push(Math.log(values[i] / values[i - 1]));
  return out;
}

export function stdev(arr) {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}

// annualised volatility from daily closes (252 trading days)
export function annualVolatility(closes) {
  return stdev(logReturns(closes)) * Math.sqrt(252) * 100;
}

export function last(arr) {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i];
  return null;
}

// plain-english reading of the indicators, used on the stock page
export function technicalSummary(closes) {
  if (!closes || closes.length < 60) return null;
  const price = closes[closes.length - 1];
  const s20 = last(sma(closes, 20));
  const s50 = last(sma(closes, 50));
  const r = last(rsi(closes, 14));
  const notes = [];
  let score = 0;
  if (price > s20) { score++; notes.push("Price is above its 20-day average"); }
  else { score--; notes.push("Price is below its 20-day average"); }
  if (s20 > s50) { score++; notes.push("20-day average is above the 50-day (short-term uptrend)"); }
  else { score--; notes.push("20-day average is below the 50-day (short-term downtrend)"); }
  if (r >= 70) notes.push("RSI above 70, often read as overbought");
  else if (r <= 30) notes.push("RSI below 30, often read as oversold");
  else notes.push("RSI in the neutral 30-70 zone");
  const trend = score >= 2 ? "Bullish" : score <= -2 ? "Bearish" : "Mixed";
  return { price, sma20: s20, sma50: s50, rsi14: r, trend, notes };
}
