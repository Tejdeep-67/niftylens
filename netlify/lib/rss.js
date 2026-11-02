// Tiny RSS parser - good enough for news feeds, avoids pulling in an XML library.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decode(s) {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => (ENTITIES[n.toLowerCase()] ?? m))
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

export function parseRss(xml, defaultSource = "") {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const b of blocks) {
    let title = tag(b, "title");
    let source = tag(b, "source") || defaultSource;
    const link = tag(b, "link") || (b.match(/<link>([^<]+)/) || [])[1] || "";
    const pub = tag(b, "pubDate");
    // google news puts " - Source Name" at the end of the title
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    if (!title) continue;
    const t = Date.parse(pub);
    items.push({ title, link, source, published: Number.isFinite(t) ? new Date(t).toISOString() : null });
  }
  return items;
}

// drop near-identical headlines (same story from different sites)
export function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = it.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").slice(0, 8).join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}
