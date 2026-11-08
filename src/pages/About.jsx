import { useState } from "react";
import Text from "../components/Text.jsx";
import Lightbox from "../components/Lightbox.jsx";
import PageHeader from "./PageHeader.jsx";
import { useContent, photoById, photoSrc } from "../lib/content.jsx";

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function About() {
  const { content } = useContent();
  const { about } = content;
  const [lightbox, setLightbox] = useState(null);
  const spacePhotos = about.spacePhotos.map((id) => photoById(content, id)).filter(Boolean);

  return (
    <>
      <PageHeader title="About Us" intro={content.settings.tagline} image={photoSrc(content, "ph27")} />

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

      <section className="section section-tint">
        <div className="container">
          <p className="eyebrow">Visit us</p>
          <h2>{about.spaceHeading}</h2>
          <div className="space-layout">
            <Text className="prose">{about.spaceText}</Text>
            <ul className="feature-list">
              {about.spaceFeatures.filter(Boolean).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
          <div className="space-gallery">
            {spacePhotos.map((p, i) => (
              <button key={p.id} onClick={() => setLightbox(i)}><img src={p.src} alt={p.caption || ""} loading="lazy" /></button>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
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
      {lightbox !== null && <Lightbox photos={spacePhotos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
