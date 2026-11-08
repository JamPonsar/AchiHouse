import Text from "../components/Text.jsx";
import Phones from "../components/Phones.jsx";
import { Icon } from "../components/EventModal.jsx";
import PageHeader from "./PageHeader.jsx";
import { useContent } from "../lib/content.jsx";

export default function Contact() {
  const { content } = useContent();
  const { settings, contact } = content;
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(settings.mapQuery || settings.address)}&output=embed`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(settings.mapQuery || settings.address)}`;

  return (
    <>
      <PageHeader title={contact.heading} intro={contact.intro} image="/photos/photo-26.jpg" />
      <section className="section">
        <div className="container contact-grid">
          <div className="contact-cards">
            <a className="contact-card" href={`mailto:${settings.email}`}>
              <Icon name="mail" />
              <span><small>Email</small>{settings.email}</span>
            </a>
            <div className="contact-card">
              <Icon name="phone" />
              <span><small>Phone</small><Phones value={settings.phone} /></span>
            </div>
            <div className="contact-card">
              <Icon name="pin" />
              <span><small>Address</small><Text>{settings.address}</Text>
                <a className="text-link" href={directions} target="_blank" rel="noreferrer">Get directions →</a>
              </span>
            </div>
            <div className="contact-card">
              <Icon name="clock" />
              <span><small>Open hours</small><Text>{settings.hours}</Text></span>
            </div>
          </div>
          <div className="map-wrap">
            <iframe title="Map to Achi House" src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </div>
        </div>
      </section>
    </>
  );
}
