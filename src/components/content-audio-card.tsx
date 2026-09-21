type ContentAudioCardProps = {
  title: string;
  description: string;
  src: string;
  label?: string;
  type?: string;
};

export default function ContentAudioCard({
  title,
  description,
  src,
  label = "Experiência em áudio",
  type = "audio/mpeg",
}: ContentAudioCardProps) {
  return (
    <aside
      style={{
        border: "1px solid rgba(116, 241, 255, 0.38)",
        borderRadius: 20,
        padding: 16,
        margin: "16px 0 20px",
        background:
          "radial-gradient(circle at top right, rgba(255, 76, 216, 0.18), transparent 38%), linear-gradient(135deg, rgba(116, 241, 255, 0.14), rgba(10, 15, 31, 0.7))",
        boxShadow: "0 16px 44px rgba(0, 0, 0, 0.18)",
      }}
      aria-label={`${label}: ${title}`}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          padding: "6px 10px",
          borderRadius: 999,
          background: "rgba(116, 241, 255, 0.15)",
          color: "var(--accent-2)",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}
      >
        ◉ {label}
      </span>
      <h2 style={{ margin: "0 0 8px", fontSize: "clamp(1.15rem, 2.5vw, 1.45rem)" }}>{title}</h2>
      <p style={{ margin: "0 0 12px", color: "var(--muted)" }}>{description}</p>
      <audio controls preload="metadata" style={{ width: "100%" }}>
        <source src={src} type={type} />
        Seu navegador não suporta reprodução de áudio.
      </audio>
      <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 12 }}>
        Roteiro e edição LBArtes × Luigi · voz neural Kokoro-82M · português brasileiro
      </p>
    </aside>
  );
}
