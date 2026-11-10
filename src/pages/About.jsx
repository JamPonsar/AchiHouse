import { useLayoutEffect, useRef, useState } from "react";
import Text from "../components/Text.jsx";
import Lightbox from "../components/Lightbox.jsx";
import Modal from "../components/Modal.jsx";
import PageHeader from "./PageHeader.jsx";
import { framedStyle, masterFrame, useContent, photoById, photoSrc } from "../lib/content.jsx";

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

// Picture of a lineage master, or a simple placeholder until one is uploaded
function MasterPicture({ master }) {
  return master.image ? (
    <div className="master-photo cover-framed" style={framedStyle(master.image, masterFrame(master))} role="img" aria-label={master.name} />
  ) : (
    <div className="master-photo master-placeholder" aria-hidden="true">☸</div>
  );
}

const SPACE_TEXT_MIN = 340; // narrowest the paragraph gets (px)
const SPACE_TEXT_MAX = 640; // widest it gets, so long text stays easy to read

// The description and the bullet list side by side. The text is made only as wide as needed for it to
// be about as tall as the list, within the limits above, so it re-fits when the text is edited or the
// window is resized. On phones everything simply stacks.
function SpaceLayout({ text, features }) {
  const box = useRef(null);
  const copy = useRef(null);
  const list = useRef(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => {
      if (window.innerWidth <= 820) { el.style.removeProperty("--space-text-w"); return; }
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      // the list's natural size (its longest bullet on one line)
      list.current.style.width = "max-content";
      const listWidth = list.current.offsetWidth;
      const target = list.current.offsetHeight;
      list.current.style.width = "";
      const roomForText = el.clientWidth - gap - listWidth;
      const max = Math.max(SPACE_TEXT_MIN, Math.min(SPACE_TEXT_MAX, roomForText));
      const heightAt = (w) => { el.style.setProperty("--space-text-w", `${w}px`); return copy.current.offsetHeight; };
      let lo = SPACE_TEXT_MIN;
      let hi = max;
      if (heightAt(lo) > target) { // narrowest is still too tall: find the narrowest width that fits the list's height
        if (heightAt(hi) > target) lo = hi; // even the widest is taller: use the widest
        else while (hi - lo > 6) { const mid = (lo + hi) / 2; if (heightAt(mid) <= target) hi = mid; else lo = mid; }
      } else {
        hi = lo; // text is shorter than the list even at its narrowest
      }
      el.style.setProperty("--space-text-w", `${Math.round(hi)}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [text, features.length, features.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-layout" ref={box}>
      <div ref={copy}><Text className="prose">{text}</Text></div>
      <ul className="feature-list" ref={list}>
        {features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
    </div>
  );
}

export default function About() {
  const { content } = useContent();
  const { about } = content;
  const [lightbox, setLightbox] = useState(null);
  const [openMaster, setOpenMaster] = useState(null);
  const [zoomed, setZoomed] = useState(null); // lineage picture shown full size
  const spacePhotos = about.spacePhotos.map((id) => photoById(content, id)).filter(Boolean);

  return (
    <>
      <PageHeader title={content.settings.navAbout?.trim() || "About Us"} intro={content.settings.tagline} image={photoSrc(content, "ph27")} />

      <section className="section">
        <div className="container split">
          <div>
            <p className="eyebrow">Who we are</p>
            <h2>{about.missionHeading}</h2>
            <Text className="prose">{about.missionText}</Text>
          </div>
          {about.missionPhoto && <div className="framed-photo"><img src={photoSrc(content, about.missionPhoto)} alt="" /></div>}
        </div>
      </section>

      {about.nameText && (
        <section className="section section-tint">
          <div className="container split name-story">
            <div>
              <p className="eyebrow">Our name</p>
              <h2>{about.nameHeading}</h2>
              <Text className="prose">{about.nameText}</Text>
            </div>
            {about.nameImage && (
              <figure className="name-photo">
                <img src={about.nameImage} alt={about.nameCaption || ""} loading="lazy" />
                {about.nameCaption && <figcaption>{about.nameCaption}</figcaption>}
              </figure>
            )}
          </div>
        </section>
      )}

      {about.masters?.length > 0 && (
        <section className="section masters">
          <div className="container">
            {about.mastersHeading && <h2>{about.mastersHeading}</h2>}
            {about.mastersIntro && <p className="lead">{about.mastersIntro}</p>}
            <div className="master-grid">
              {about.masters.map((m) => (
                <article key={m.id} className="master-card">
                  <MasterPicture master={m} />
                  <h3>{m.name}</h3>
                  {m.tagline && <p className="master-tagline">{m.tagline}</p>}
                  {m.bio && <button className="btn btn-outline btn-sm" onClick={() => setOpenMaster(m)}>Learn more</button>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section section-tint">
        <div className="container">
          <p className="eyebrow">Visit us</p>
          <h2>{about.spaceHeading}</h2>
          <SpaceLayout text={about.spaceText} features={about.spaceFeatures.filter(Boolean)} />
          <div className="space-gallery">
            {spacePhotos.map((p, i) => (
              <button key={p.id} onClick={() => setLightbox(i)}><img src={p.src} alt={p.caption || ""} loading="lazy" /></button>
            ))}
          </div>
        </div>
      </section>

      <section className="section leadership">
        <div className="container">
          <p className="eyebrow">The people behind Achi House</p>
          <h2>{about.leadersHeading}</h2>
          <p className="lead">{about.leadersIntro}</p>
          <div className="leaders">
            {about.leaders.map((l) => (
              <article key={l.id} className="leader">
                {l.photo ? (
                  <img className="leader-photo" src={photoSrc(content, l.photo)} alt={l.name} />
                ) : (
                  <div className="leader-photo leader-initials" aria-hidden="true">{initials(l.name || "?")}</div>
                )}
                <h3>{l.name}</h3>
                <p className="leader-role">{l.role}</p>
                {l.phone && <a className="leader-phone" href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}>{l.phone}</a>}
                <Text className="leader-bio">{l.bio}</Text>
              </article>
            ))}
          </div>
        </div>
      </section>
      {openMaster && (
        <Modal onClose={() => setOpenMaster(null)} className="master-modal" label={openMaster.name}>
          {openMaster.image ? (
            <button
              className="master-hero cover-framed"
              style={framedStyle(openMaster.image, masterFrame(openMaster))}
              onClick={() => setZoomed(openMaster)}
              aria-label={`Enlarge picture of ${openMaster.name}`}
              title="Click to see the whole picture"
            />
          ) : (
            <div className="master-hero master-hero-empty" aria-hidden="true">☸</div>
          )}
          <div className="master-modal-body">
            <h2>{openMaster.name}</h2>
            {openMaster.tagline && <p className="master-tagline">{openMaster.tagline}</p>}
            <Text className="prose master-bio">{openMaster.bio}</Text>
          </div>
        </Modal>
      )}
      {zoomed && (
        <Lightbox photos={[{ id: zoomed.id, src: zoomed.image, caption: zoomed.name }]} index={0} onIndex={() => {}} onClose={() => setZoomed(null)} />
      )}
      {lightbox !== null && <Lightbox photos={spacePhotos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
