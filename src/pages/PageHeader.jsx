export default function PageHeader({ title, intro, image }) {
  return (
    <section className="page-header" style={image ? { backgroundImage: `url(${image})` } : undefined}>
      <div className="page-header-overlay" />
      <div className="container">
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
    </section>
  );
}
