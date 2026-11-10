// The live site was set up before some content existed (e.g. the lineage section on the About page).
// Fill in anything missing from the starter content, so it appears and can be edited. Applied to
// everything loaded, so published and draft stay identical and nothing shows up as a change.
import { seedContent } from "../data/seed.js";

const ABOUT_DEFAULTS = ["nameHeading", "nameText", "nameImage", "nameCaption", "mastersHeading", "mastersIntro", "masters"];

export function withDefaults(content) {
  if (!content?.about) return content;
  const missing = ABOUT_DEFAULTS.filter((k) => content.about[k] === undefined);
  if (!missing.length) return content;
  const about = { ...content.about };
  for (const k of missing) about[k] = structuredClone(seedContent.about[k]);
  return { ...content, about };
}
