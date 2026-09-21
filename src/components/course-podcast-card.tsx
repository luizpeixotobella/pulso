type CoursePodcastCardProps = {
  title: string;
  description: string;
  src: string;
  type?: string;
};

export default function CoursePodcastCard({
  title,
  description,
  src,
  type = "audio/mpeg",
}: CoursePodcastCardProps) {
  return (
    <div
      style={{
        border: "1px solid rgba(116, 241, 255, 0.35)",
        borderRadius: 18,
        padding: 14,
        background: "linear-gradient(135deg, rgba(116, 241, 255, 0.16), rgba(255, 76, 216, 0.12))",
        boxShadow: "0 0 24px rgba(116, 241, 255, 0.08)",
        margin: "14px 0 18px",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          padding: "6px 10px",
          borderRadius: 999,
          background: "rgba(116, 241, 255, 0.16)",
          color: "var(--accent-2)",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}
      >
        Podcast neural LBArtes
      </span>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ marginTop: 0 }}>{description}</p>
      <audio controls preload="metadata" style={{ width: "100%" }}>
        <source src={src} type={type} />
        Seu navegador não suporta reprodução de áudio.
      </audio>
      <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: 12 }}>
        Roteiro LBArtes × Luigi · voz neural Kokoro-82M · português brasileiro
      </p>
    </div>
  );
}
