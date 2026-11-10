// Describe, in plain words, what changed between two versions of the site.
// Used for the "Publish" confirmation, the edit history and the list of changes in the editor.

import { formatDate } from "./dates.js";

const SECTION_FIELDS = {
  header: {
    page: "Header & logo", to: "/admin/header", from: "settings",
    fields: {
      orgName: "Organization name", tagline: "Tagline",
      logoSrc: "Logo", logoZoom: "Logo", logoX: "Logo", logoY: "Logo",
      navHome: "Menu names", navAbout: "Menu names", navEvents: "Menu names", navPhotos: "Menu names",
      navBook: "Menu names", navContact: "Menu names", navDonate: "Menu names",
    },
  },
  settings: {
    page: "Contact & general info", to: "/admin/contact",
    fields: {
      email: "Email", phone: "Phone number",
      address: "Address", mapQuery: "Map location", hours: "Open hours", facebook: "Facebook link",
      instagram: "Instagram link", footerNote: "Footer note",
    },
  },
  home: {
    page: "Home page", to: "/admin/home",
    fields: {
      greeting: "Greeting", heroTitle: "Main headline", heroSubtitle: "Headline subtitle",
      slides: "Slideshow photos", introHeading: "Welcome heading", introText: "Welcome text",
      introPhoto: "Welcome photo", highlights: "Highlight boxes",
    },
  },
  about: {
    page: "About page", to: "/admin/about",
    fields: {
      missionHeading: "Mission heading", missionText: "Mission text", missionPhoto: "Mission photo",
      spaceHeading: "Space heading", spaceText: "Space description", spacePhotos: "Space photos",
      spaceFeatures: "Space features list", leadersHeading: "Leadership heading", leadersIntro: "Leadership intro",
      nameHeading: "Name story heading", nameText: "Name story text", nameImage: "Name story picture", nameCaption: "Name story caption",
      mastersHeading: "Lineage heading", mastersIntro: "Lineage intro",
    },
  },
  booking: {
    page: "Renting page", to: "/admin/booking",
    fields: { heading: "Heading", intro: "Intro text", details: "Details list", pricing: "Rental rates", blockedDates: "Unavailable dates" },
  },
  contact: { page: "Contact page", to: "/admin/contact", fields: { heading: "Heading", intro: "Intro text" } },
  donate: {
    page: "Donate page", to: "/admin/donate",
    fields: {
      heading: "Heading", intro: "Intro text", taxNote: "Tax note",
      otherWaysHeading: "\"Other ways\" heading", otherWays: "\"Other ways\" text",
    },
  },
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// One change: { text, to (editor page to open), kind: "added" | "edited" | "removed",
//                revert(draft) (puts just this change back to the published version) }
const kindOf = (text) => (/^Added/.test(text) ? "added" : /^(Deleted|Removed)/.test(text) ? "removed" : "edited");
const entry = (text, to, revert) => ({ text, to, kind: kindOf(text), revert });
const clone = (x) => structuredClone(x);
const listAt = (d, path) => path.reduce((o, k) => o[k], d);

function diffList(before = [], after = [], { noun, label, fields, to, path }) {
  const out = [];
  const beforeMap = new Map(before.map((x) => [x.id, x]));
  const afterMap = new Map(after.map((x) => [x.id, x]));
  for (const item of after) {
    const prev = beforeMap.get(item.id);
    if (!prev) {
      out.push(entry(`Added ${noun} "${label(item)}"`, to, (d) => {
        const l = listAt(d, path);
        const i = l.findIndex((x) => x.id === item.id);
        if (i > -1) l.splice(i, 1);
      }));
    } else if (!same(prev, item)) {
      const changed = [...new Set(Object.keys(fields).filter((k) => !same(prev[k], item[k])).map((k) => fields[k]))];
      out.push(entry(`Edited ${noun} "${label(item)}"${changed.length ? ` (${changed.join(", ")})` : ""}`, to, (d) => {
        const l = listAt(d, path);
        const i = l.findIndex((x) => x.id === item.id);
        if (i > -1) l[i] = clone(prev);
      }));
    }
  }
  before.forEach((item, idx) => {
    if (afterMap.has(item.id)) return;
    out.push(entry(`Deleted ${noun} "${label(item)}"`, to, (d) => {
      const l = listAt(d, path);
      l.splice(Math.min(idx, l.length), 0, clone(item));
    }));
  });
  const orderBefore = before.map((x) => x.id).filter((id) => afterMap.has(id));
  const orderAfter = after.map((x) => x.id).filter((id) => beforeMap.has(id));
  if (!same(orderBefore, orderAfter)) {
    const rank = new Map(before.map((x, i) => [x.id, i]));
    out.push(entry(`Changed the order of ${noun}s`, to, (d) => {
      listAt(d, path).sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
    }));
  }
  return out;
}

const EVENT_FIELDS = {
  title: "title", date: "date", startTime: "start time", endTime: "end time", location: "location",
  summary: "short summary", description: "description", cover: "cover photo", coverPhoto: "cover photo", coverX: "cover framing", coverY: "cover framing", coverZoom: "cover framing",
};
const titleOf = (e) => e.title || "Untitled";
const shortDate = (k) => formatDate(k, { month: "short", day: "numeric" });
const dateRange = (list) => {
  const days = list.map((e) => e.date).sort();
  return days.length > 1 ? `${shortDate(days[0])} – ${shortDate(days[days.length - 1])}` : shortDate(days[0]);
};
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const eventLink = (e) => `/admin/events/${e.id}`;

// Events: repeating events are summarized as one line instead of one per date
function diffEvents(before = [], after = []) {
  const bm = new Map(before.map((e) => [e.id, e]));
  const am = new Map(after.map((e) => [e.id, e]));
  const changedFields = (a, b) => [...new Set(Object.keys(EVENT_FIELDS).filter((k) => !same(a[k], b[k])).map((k) => EVENT_FIELDS[k]))];
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
  const removeEvents = (events) => (d) => { d.events = d.events.filter((e) => !events.some((x) => x.id === e.id)); };
  const restoreEvents = (events) => (d) => {
    for (const ev of events) {
      const was = bm.get(ev.id);
      const i = d.events.findIndex((e) => e.id === ev.id);
      if (i > -1) d.events[i] = clone(was);
      else d.events.push(clone(was));
    }
  };

  const added = after.filter((e) => !bm.has(e.id));
  const deleted = before.filter((e) => !am.has(e.id));
  let edited = after.filter((e) => bm.has(e.id) && !same(bm.get(e.id), e));

  // Events whose only change is joining / leaving a repeating series
  const joined = new Map();
  edited = edited.filter((e) => {
    const prev = bm.get(e.id);
    if (changedFields(prev, e).length > 0 || prev.seriesId === e.seriesId) return true;
    if (e.seriesId && !prev.seriesId) joined.set(e.seriesId, e);
    else out.push(entry(`Removed event "${titleOf(e)}" from its repeating series`, eventLink(e), restoreEvents([e])));
    return false;
  });

  for (const group of groupBySeries(added)) {
    const origin = group[0].seriesId && joined.get(group[0].seriesId);
    if (origin) {
      out.push(entry(`Made event "${titleOf(origin)}" repeat: added ${plural(group.length, "more date")} (${dateRange([origin, ...group])})`, eventLink(origin), (d) => { removeEvents(group)(d); restoreEvents([origin])(d); }));
      joined.delete(group[0].seriesId);
    } else if (group.length > 1) {
      out.push(entry(`Added ${group.length} repeating events "${titleOf(group[0])}" (${dateRange(group)})`, eventLink(group[0]), removeEvents(group)));
    } else {
      out.push(entry(`Added event "${titleOf(group[0])}"`, eventLink(group[0]), removeEvents(group)));
    }
  }
  for (const e of joined.values()) out.push(entry(`Made event "${titleOf(e)}" part of a repeating series`, eventLink(e), restoreEvents([e])));

  for (const group of groupBySeries(edited)) {
    const fields = [...new Set(group.flatMap((e) => changedFields(bm.get(e.id), e)))];
    const detail = fields.length ? ` (${fields.join(", ")})` : "";
    out.push(
      entry(
        group.length > 1 && group[0].seriesId
          ? `Edited ${group.length} events "${titleOf(group[0])}" in a repeating series${detail}`
          : `Edited event "${titleOf(group[0])}"${detail}`,
        eventLink(group[0]),
        restoreEvents(group)
      )
    );
  }

  for (const group of groupBySeries(deleted)) {
    out.push(
      entry(
        group.length > 1
          ? `Deleted ${group.length} events "${titleOf(group[0])}" (${dateRange(group)})`
          : `Deleted event "${titleOf(group[0])}"`,
        "/admin/events",
        (d) => { for (const ev of group) d.events.push(clone(ev)); }
      )
    );
  }
  return out;
}

// Every change, each with the editor page it belongs to
export function listChanges(before, after) {
  if (!before || !after) return [];
  const changes = [];

  for (const [name, { page, to, fields, from }] of Object.entries(SECTION_FIELDS)) {
    const key = from || name; // a few sections are different views of the same data
    const a = before[key] || {};
    const b = after[key] || {};
    const changed = [...new Set(Object.keys(fields).filter((f) => !same(a[f] ?? "", b[f] ?? "")).map((f) => fields[f]))];
    const keys = Object.keys(fields).filter((f) => !same(a[f] ?? "", b[f] ?? ""));
    if (changed.length) {
      changes.push(entry(`${page}: updated ${changed.join(", ")}`, to, (d) => {
        d[key] = d[key] || {};
        for (const k of keys) { if (k in a) d[key][k] = clone(a[k]); else delete d[key][k]; }
      }));
    }
  }

  changes.push(
    ...diffList(before.about?.masters, after.about?.masters, {
      noun: "lineage master", label: (x) => x.name || "Unnamed", to: "/admin/about", path: ["about", "masters"],
      fields: { name: "name", tagline: "one-line description", bio: "biography", image: "picture", imageX: "picture framing", imageY: "picture framing", imageZoom: "picture framing" },
    }),
    ...diffList(before.about?.leaders, after.about?.leaders, {
      noun: "leader", label: (x) => x.name || "Unnamed", to: "/admin/about", path: ["about", "leaders"],
      fields: { name: "name", role: "role", phone: "phone", bio: "bio", photo: "photo" },
    }),
    ...diffList(before.donate?.methods, after.donate?.methods, {
      noun: "donation method", label: (x) => x.name || "Unnamed", to: "/admin/donate", path: ["donate", "methods"],
      fields: { name: "name", description: "description", detail: "details", link: "link", buttonText: "button" },
    }),
    ...diffEvents(before.events, after.events),
  );

  // Photos: summarize rather than listing every single one
  const pb = new Map((before.photos || []).map((p) => [p.id, p]));
  const pa = new Map((after.photos || []).map((p) => [p.id, p]));
  const added = [...pa.keys()].filter((id) => !pb.has(id)).length;
  const removed = [...pb.keys()].filter((id) => !pa.has(id)).length;
  const kept = [...pa.keys()].filter((id) => pb.has(id));
  const hidden = kept.filter((id) => !pb.get(id).hidden && pa.get(id).hidden).length;
  const shown = kept.filter((id) => pb.get(id).hidden && !pa.get(id).hidden).length;
  const strip = ({ hidden: _h, ...rest }) => rest;
  const edited = kept.filter((id) => !same(strip(pb.get(id)), strip(pa.get(id)))).length;
  const photos = (text, revert) => changes.push(entry(text, "/admin/photos", revert));
  const idsWhere = (pred) => [...pa.keys()].filter(pred);
  const addedIds = idsWhere((id) => !pb.has(id));
  const removedIds = [...pb.keys()].filter((id) => !pa.has(id));
  const hiddenIds = idsWhere((id) => pb.has(id) && !pb.get(id).hidden && pa.get(id).hidden);
  const shownIds = idsWhere((id) => pb.has(id) && pb.get(id).hidden && !pa.get(id).hidden);
  const editedIds = idsWhere((id) => pb.has(id) && !same(strip(pb.get(id)), strip(pa.get(id))));
  const forEachPhoto = (list, fn) => (d) => d.photos.forEach((p) => { if (list.includes(p.id)) fn(p); });
  // Put restored photos back where the published site used them
  const placed = (list) => (d) => {
    for (const id of list) {
      if (before.home?.slides?.includes(id) && !d.home.slides.includes(id)) d.home.slides.push(id);
      if (before.home?.introPhoto === id && !d.home.introPhoto) d.home.introPhoto = id;
      if (before.about?.missionPhoto === id && !d.about.missionPhoto) d.about.missionPhoto = id;
      if (before.about?.spacePhotos?.includes(id) && !d.about.spacePhotos.includes(id)) d.about.spacePhotos.push(id);
      before.about?.leaders?.forEach((l) => {
        if (l.photo !== id) return;
        const m = d.about.leaders.find((x) => x.id === l.id);
        if (m && !m.photo) m.photo = id;
      });
    }
  };
  if (added) {
    photos(`Added ${added} photo${added > 1 ? "s" : ""}`, (d) => {
      d.photos = d.photos.filter((p) => !addedIds.includes(p.id));
      d.home.slides = d.home.slides.filter((x) => !addedIds.includes(x));
      d.about.spacePhotos = d.about.spacePhotos.filter((x) => !addedIds.includes(x));
      if (addedIds.includes(d.home.introPhoto)) d.home.introPhoto = "";
      if (addedIds.includes(d.about.missionPhoto)) d.about.missionPhoto = "";
      d.about.leaders.forEach((l) => { if (addedIds.includes(l.photo)) l.photo = ""; });
    });
  }
  if (removed) {
    photos(`Deleted ${removed} photo${removed > 1 ? "s" : ""}`, (d) => {
      removedIds.forEach((id) => d.photos.push(clone(pb.get(id))));
      placed(removedIds)(d);
    });
  }
  if (hidden) photos(`Hid ${hidden} photo${hidden > 1 ? "s" : ""}`, forEachPhoto(hiddenIds, (p) => { delete p.hidden; }));
  if (shown) photos(`Un-hid ${shown} photo${shown > 1 ? "s" : ""}`, forEachPhoto(shownIds, (p) => { p.hidden = true; }));
  if (edited) {
    photos(`Edited ${edited} photo caption${edited > 1 ? "s" : ""} / album${edited > 1 ? "s" : ""}`, forEachPhoto(editedIds, (p) => {
      const keepHidden = p.hidden;
      const was = clone(pb.get(p.id));
      Object.keys(p).forEach((k) => delete p[k]);
      Object.assign(p, was);
      if (keepHidden) p.hidden = true; else delete p.hidden;
    }));
  }

  return changes;
}

// Just the sentences (what gets saved in the edit history)
export function describeChanges(before, after) {
  return listChanges(before, after).map((c) => c.text);
}
