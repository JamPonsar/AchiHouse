// Describe, in plain words, what changed between two versions of the site.
// Used for the "Publish" confirmation and for the edit history.

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
    page: "Book the Space page",
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
    ...diffList(before.events, after.events, {
      noun: "event", label: (x) => x.title || "Untitled",
      fields: {
        title: "title", date: "date", startTime: "start time", endTime: "end time", location: "location",
        summary: "short summary", description: "description", coverPhoto: "cover photo",
      },
    }).filter((c) => !c.startsWith("Changed the order")),
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
