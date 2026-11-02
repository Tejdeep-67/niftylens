// NIFTY 50 constituents (from the niftyindices.com constituent list, downloaded Nov 2026).
// The index is rebalanced twice a year so this list needs a manual update sometimes.
// "q" is the search phrase used for Google News.

export const STOCKS = [
  { symbol: "ADANIENT", name: "Adani Enterprises Ltd.", short: "Adani Enterprises", sector: "Metals", q: "Adani Enterprises" },
  { symbol: "ADANIPORTS", name: "Adani Ports and Special Economic Zone Ltd.", short: "Adani Ports", sector: "Services", q: "Adani Ports" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals Enterprise Ltd.", short: "Apollo Hospitals", sector: "Healthcare", q: "Apollo Hospitals" },
  { symbol: "ASIANPAINT", name: "Asian Paints Ltd.", short: "Asian Paints", sector: "Consumer Durables", q: "Asian Paints" },
  { symbol: "AXISBANK", name: "Axis Bank Ltd.", short: "Axis Bank", sector: "Financials", q: "Axis Bank" },
  { symbol: "BSE", name: "BSE Ltd.", short: "BSE Ltd", sector: "Financials", q: "BSE share price" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto Ltd.", short: "Bajaj Auto", sector: "Auto", q: "Bajaj Auto" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd.", short: "Bajaj Finance", sector: "Financials", q: "Bajaj Finance" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv Ltd.", short: "Bajaj Finserv", sector: "Financials", q: "Bajaj Finserv" },
  { symbol: "BEL", name: "Bharat Electronics Ltd.", short: "Bharat Electronics", sector: "Capital Goods", q: "Bharat Electronics BEL" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd.", short: "Bharti Airtel", sector: "Telecom", q: "Bharti Airtel" },
  { symbol: "CIPLA", name: "Cipla Ltd.", short: "Cipla", sector: "Healthcare", q: "Cipla share" },
  { symbol: "COALINDIA", name: "Coal India Ltd.", short: "Coal India", sector: "Oil & Gas", q: "Coal India" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories Ltd.", short: "Dr. Reddy's", sector: "Healthcare", q: "Dr. Reddy's" },
  { symbol: "EICHERMOT", name: "Eicher Motors Ltd.", short: "Eicher Motors", sector: "Auto", q: "Eicher Motors" },
  { symbol: "ETERNAL", name: "Eternal Ltd.", short: "Eternal", sector: "Consumer Services", q: "Eternal Zomato" },
  { symbol: "GRASIM", name: "Grasim Industries Ltd.", short: "Grasim", sector: "Cement", q: "Grasim" },
  { symbol: "HCLTECH", name: "HCL Technologies Ltd.", short: "HCLTech", sector: "IT", q: "HCLTech" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", short: "HDFC Bank", sector: "Financials", q: "HDFC Bank" },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance Company Ltd.", short: "HDFC Life", sector: "Financials", q: "HDFC Life" },
  { symbol: "HINDALCO", name: "Hindalco Industries Ltd.", short: "Hindalco", sector: "Metals", q: "Hindalco" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd.", short: "Hindustan Unilever", sector: "FMCG", q: "Hindustan Unilever" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", short: "ICICI Bank", sector: "Financials", q: "ICICI Bank" },
  { symbol: "ITC", name: "ITC Ltd.", short: "ITC", sector: "FMCG", q: "ITC share" },
  { symbol: "INFY", name: "Infosys Ltd.", short: "Infosys", sector: "IT", q: "Infosys" },
  { symbol: "INDIGO", name: "InterGlobe Aviation Ltd.", short: "IndiGo", sector: "Services", q: "IndiGo InterGlobe" },
  { symbol: "JSWSTEEL", name: "JSW Steel Ltd.", short: "JSW Steel", sector: "Metals", q: "JSW Steel" },
  { symbol: "JIOFIN", name: "Jio Financial Services Ltd.", short: "Jio Financial", sector: "Financials", q: "Jio Financial" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd.", short: "Kotak Mahindra Bank", sector: "Financials", q: "Kotak Mahindra Bank" },
  { symbol: "LT", name: "Larsen & Toubro Ltd.", short: "Larsen & Toubro", sector: "Construction", q: "Larsen Toubro" },
  { symbol: "M&M", name: "Mahindra & Mahindra Ltd.", short: "Mahindra & Mahindra", sector: "Auto", q: "Mahindra and Mahindra" },
  { symbol: "MARUTI", name: "Maruti Suzuki India Ltd.", short: "Maruti Suzuki", sector: "Auto", q: "Maruti Suzuki" },
  { symbol: "MAXHEALTH", name: "Max Healthcare Institute Ltd.", short: "Max Healthcare", sector: "Healthcare", q: "Max Healthcare" },
  { symbol: "NTPC", name: "NTPC Ltd.", short: "NTPC", sector: "Power", q: "NTPC share" },
  { symbol: "NESTLEIND", name: "Nestle India Ltd.", short: "Nestle India", sector: "FMCG", q: "Nestle India" },
  { symbol: "ONGC", name: "Oil & Natural Gas Corporation Ltd.", short: "ONGC", sector: "Oil & Gas", q: "ONGC share" },
  { symbol: "POWERGRID", name: "Power Grid Corporation of India Ltd.", short: "Power Grid", sector: "Power", q: "Power Grid" },
  { symbol: "RELIANCE", name: "Reliance Industries Ltd.", short: "Reliance Industries", sector: "Oil & Gas", q: "Reliance Industries" },
  { symbol: "SBILIFE", name: "SBI Life Insurance Company Ltd.", short: "SBI Life", sector: "Financials", q: "SBI Life" },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance Ltd.", short: "Shriram Finance", sector: "Financials", q: "Shriram Finance" },
  { symbol: "SBIN", name: "State Bank of India", short: "SBI", sector: "Financials", q: "SBI share" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries Ltd.", short: "Sun Pharma", sector: "Healthcare", q: "Sun Pharma" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd.", short: "TCS", sector: "IT", q: "TCS share" },
  { symbol: "TATACONSUM", name: "Tata Consumer Products Ltd.", short: "Tata Consumer", sector: "FMCG", q: "Tata Consumer" },
  { symbol: "TMPV", name: "Tata Motors Passenger Vehicles Ltd.", short: "Tata Motors PV", sector: "Auto", q: "Tata Motors Passenger Vehicles" },
  { symbol: "TATASTEEL", name: "Tata Steel Ltd.", short: "Tata Steel", sector: "Metals", q: "Tata Steel" },
  { symbol: "TECHM", name: "Tech Mahindra Ltd.", short: "Tech Mahindra", sector: "IT", q: "Tech Mahindra" },
  { symbol: "TITAN", name: "Titan Company Ltd.", short: "Titan Company", sector: "Consumer Durables", q: "Titan Company" },
  { symbol: "TRENT", name: "Trent Ltd.", short: "Trent", sector: "Consumer Services", q: "Trent share" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement Ltd.", short: "UltraTech Cement", sector: "Cement", q: "UltraTech Cement" }
];

// yahoo = Yahoo Finance symbol, mc = Moneycontrol chart symbol (used as a fallback)
export const INDICES = [
  { symbol: "NIFTY50", name: "NIFTY 50", yahoo: "^NSEI", mc: "in;NSX" },
  { symbol: "BANKNIFTY", name: "NIFTY BANK", yahoo: "^NSEBANK", mc: "in;nbx" },
  { symbol: "SENSEX", name: "SENSEX", yahoo: "^BSESN", mc: "in;SEN" },
];

const stockMap = new Map(STOCKS.map((s) => [s.symbol, s]));
const indexMap = new Map(INDICES.map((i) => [i.symbol, i]));

export function getStock(symbol) {
  return stockMap.get(symbol);
}

export function getIndex(symbol) {
  return indexMap.get(symbol);
}

export function isKnownSymbol(symbol) {
  return stockMap.has(symbol) || indexMap.has(symbol);
}

export function yahooSymbol(symbol) {
  const idx = indexMap.get(symbol);
  if (idx) return idx.yahoo;
  return symbol + ".NS";
}

export function displayName(symbol) {
  const s = stockMap.get(symbol) || indexMap.get(symbol);
  return s ? s.short || s.name : symbol;
}

export const SECTORS = [...new Set(STOCKS.map((s) => s.sector))].sort();
