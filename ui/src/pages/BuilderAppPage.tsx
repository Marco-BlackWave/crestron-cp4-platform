export default function BuilderAppPage() {
  return (
    <div className="builder-app-frame-shell">
      <iframe
        title="Crestron HTML5 UI Builder"
        src="/builder-app/index.html"
        className="builder-app-frame"
      />
    </div>
  );
}
