// Work out which pieces of text / images are new or edited compared with the published site,
// so the editor and the preview can highlight them.

const clean = (s) => s.replace(/\s+/g, " ").trim();

// A text value, plus each of its paragraphs and lines (that's how the website splits them up)
function fragments(s) {
  const out = new Set();
  const whole = clean(s);
  if (!whole) return out;
  out.add(whole);
  for (const part of s.split(/\n/)) {
    const c = clean(part);
    if (c) out.add(c);
  }
  return out;
}

function collect(value, into) {
  if (typeof value === "string") fragments(value).forEach((f) => into.add(f));
  else if (Array.isArray(value)) value.forEach((v) => collect(v, into));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collect(v, into));
  return into;
}

// Everything on the published site: the baseline that edits are compared against
export const baselineOf = (published) => collect(published || {}, new Set());

// Text / image addresses in the draft that aren't in the published site
export function changedSet(published, draft) {
  if (!published || !draft) return new Set();
  const base = baselineOf(published);
  const out = new Set();
  collect(draft, new Set()).forEach((f) => { if (!base.has(f)) out.add(f); });
  return out;
}

export const normalize = clean;

// Is this field value new or edited? (Empty values are never highlighted.)
export function isChangedValue(baseline, value) {
  if (typeof value !== "string" || !baseline) return false;
  const frags = fragments(value);
  if (!frags.size) return false;
  return !baseline.has(clean(value)) && [...frags].some((f) => !baseline.has(f));
}

// Titles of events that are new or edited (used to outline the whole event card on the preview,
// which also covers changes to dates, times and covers that can't be matched as text)
export function changedEventTitles(published, draft) {
  if (!published || !draft) return new Set();
  const was = new Map((published.events || []).map((e) => [e.id, JSON.stringify(e)]));
  return new Set(
    (draft.events || []).filter((e) => was.get(e.id) !== JSON.stringify(e)).map((e) => clean(e.title || "")).filter(Boolean)
  );
}
