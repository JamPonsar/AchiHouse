// Describe, in plain words, what changed between two versions of the site.
// Used for the "Publish" confirmation and for the edit history.

import { formatDate } from "./dates.js";

const SECTION_FIELDS = {
  settings: {
    page: "Contact & general info",
    fields: {
      orgName: "Organization name", tagline: "Tagline", email: "Email", phone: "Phone number",
      address: "Address", mapQuery: "Map location", hours: "Open hours", facebook: "Facebook link",
      instagram: "Instagram link", footerNote: "Footer note",
    },
  },
  home: {
    page: "Home page",
    fields: {
      greeting: "Greeting", heroTitle: "Main headline", heroSubtitle: "Headline subtitle",
      slides: "Slideshow photos", introHeading: "Welcome heading", introText: "Welcome text",
      introPhoto: "Welcome photo", highlights: "Highlight boxes",
    },
  },
  about: {
    page: "About page",
    fields: {
      missionHeading: "Mission heading", missionText: "Mission text", missionPhoto: "Mission photo",
      spaceHeading: "Space heading", spaceText: "Space description", spacePhotos: "Space photos",
      spaceFeatures: "Space features list", leadersHeading: "Leadership heading", leadersIntro: "Leadership intro",
    },
  },
  booking: {
    page: "Renting page",
    fields: { heading: "Heading", intro: "Intro text", details: "Details list", pricing: "Rental rates", blockedDates: "Unavailable dates" },
  },
  contact: { page: "Contact page", fields: { heading: "Heading", intro: "Intro text" } },
  donate: {
    page: "Donate page",
    fields: {
      heading: "Heading", intro: "Intro text", taxNote: "Tax note",
      otherWaysHeading: "\"Other ways\" heading", otherWays: "\"Other ways\" text",
    },
  },
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function diffList(before = [], after = [], { noun, label, fields }) {
  const out = [];
  const beforeMap = new Map(before.map((x) => [x.id, x]));
  const afterMap = new Map(after.map((x) => [x.id, x]));
  for (const item of after) {
    const prev = beforeMap.get(item.id);
    if (!prev) out.push(`Added ${noun} "${label(item)}"`);
    else if (!same(prev, item)) {
      const changed = Object.keys(fields).filter((k) => !same(prev[k], item[k])).map((k) => fields[k]);
      out.push(`Edited ${noun} "${label(item)}"${changed.length ? ` (${changed.join(", ")})` : ""}`);
    }
  }
  for (const item of before) if (!afterMap.has(item.id)) out.push(`Deleted ${noun} "${label(item)}"`);
  const orderBefore = before.map((x) => x.id).filter((id) => afterMap.has(id));
  const orderAfter = after.map((x) => x.id).filter((id) => beforeMap.has(id));
  if (!same(orderBefore, orderAfter)) out.push(`Changed the order of ${noun}s`);
  return out;
}

const EVENT_FIELDS = {
  title: "title", date: "date", startTime: "start time", endTime: "end time", location: "location",
  summary: "short summary", description: "description", coverPhoto: "cover photo",
};
const titleOf = (e) => e.title || "Untitled";
const shortDate = (k) => formatDate(k, { month: "short", day: "numeric" });
const dateRange = (list) => {
  const days = list.map((e) => e.date).sort();
  return days.length > 1 ? `${shortDate(days[0])} – ${shortDate(days[days.length - 1])}` : shortDate(days[0]);
};
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Events: repeating events are summarized as one line instead of one per date
function diffEvents(before = [], after = []) {
  const bm = new Map(before.map((e) => [e.id, e]));
  const am = new Map(after.map((e) => [e.id, e]));
  const changedFields = (a, b) => Object.keys(EVENT_FIELDS).filter((k) => !same(a[k], b[k])).map((k) => EVENT_FIELDS[k]);
  const groupBySeries = (items) => {
    const groups = new Map();
    for (const e of items) {
      const key = e.seriesId || e.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }
    return [...groups.values()];
  };
  const out = [];

  const added = after.filter((e) => !bm.has(e.id));
  const deleted = before.filter((e) => !am.has(e.id));
  let edited = after.filter((e) => bm.has(e.id) && !same(bm.get(e.id), e));

  // Events whose only change is joining / leaving a repeating series
  const joined = new Map();
  edited = edited.filter((e) => {
    const prev = bm.get(e.id);
    if (changedFields(prev, e).length > 0 || prev.seriesId === e.seriesId) return true;
    if (e.seriesId && !prev.seriesId) joined.set(e.seriesId, e);
    else out.push(`Removed event "${titleOf(e)}" from its repeating series`);
    return false;
  });

  for (const group of groupBySeries(added)) {
    const origin = group[0].seriesId && joined.get(group[0].seriesId);
    if (origin) {
      out.push(`Made event "${titleOf(origin)}" repeat: added ${plural(group.length, "more date")} (${dateRange([origin, ...group])})`);
      joined.delete(group[0].seriesId);
    } else if (group.length > 1) {
      out.push(`Added ${group.length} repeating events "${titleOf(group[0])}" (${dateRange(group)})`);
    } else {
      out.push(`Added event "${titleOf(group[0])}"`);
    }
  }
  for (const e of joined.values()) out.push(`Made event "${titleOf(e)}" part of a repeating series`);

  for (const group of groupBySeries(edited)) {
    const fields = [...new Set(group.flatMap((e) => changedFields(bm.get(e.id), e)))];
    const detail = fields.length ? ` (${fields.join(", ")})` : "";
    out.push(
      group.length > 1 && group[0].seriesId
        ? `Edited ${group.length} events "${titleOf(group[0])}" in a repeating series${detail}`
        : `Edited event "${titleOf(group[0])}"${detail}`
    );
  }

  for (const group of groupBySeries(deleted)) {
    out.push(
      group.length > 1
        ? `Deleted ${group.length} events "${titleOf(group[0])}" (${dateRange(group)})`
        : `Deleted event "${titleOf(group[0])}"`
    );
  }
  return out;
}

export function describeChanges(before, after) {
  if (!before || !after) return [];
  const changes = [];

  for (const [key, { page, fields }] of Object.entries(SECTION_FIELDS)) {
    const a = before[key] || {};
    const b = after[key] || {};
    const changed = Object.keys(fields).filter((f) => !same(a[f], b[f])).map((f) => fields[f]);
    if (changed.length) changes.push(`${page}: updated ${changed.join(", ")}`);
  }

  changes.push(
    ...diffList(before.about?.leaders, after.about?.leaders, {
      noun: "leader", label: (x) => x.name || "Unnamed",
      fields: { name: "name", role: "role", phone: "phone", bio: "bio", photo: "photo" },
    }),
    ...diffList(before.donate?.methods, after.donate?.methods, {
      noun: "donation method", label: (x) => x.name || "Unnamed",
      fields: { name: "name", description: "description", detail: "details", link: "link", buttonText: "button" },
    }),
    ...diffEvents(before.events, after.events),
  );

  // Photos: summarize rather than listing every single one
  const pb = new Map((before.photos || []).map((p) => [p.id, p]));
  const pa = new Map((after.photos || []).map((p) => [p.id, p]));
  const added = [...pa.keys()].filter((id) => !pb.has(id)).length;
  const removed = [...pb.keys()].filter((id) => !pa.has(id)).length;
  const edited = [...pa.keys()].filter((id) => pb.has(id) && !same(pb.get(id), pa.get(id))).length;
  if (added) changes.push(`Added ${added} photo${added > 1 ? "s" : ""}`);
  if (removed) changes.push(`Deleted ${removed} photo${removed > 1 ? "s" : ""}`);
  if (edited) changes.push(`Edited ${edited} photo caption${edited > 1 ? "s" : ""} / album${edited > 1 ? "s" : ""}`);

  return changes;
}
