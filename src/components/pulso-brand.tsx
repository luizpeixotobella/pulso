import Link from "next/link";

export function PulsoBrand() {
  return (
    <Link className="pulso-brand" href="/" aria-label="Pulso — página inicial">
      <img className="pulso-brand-mark" src="/pulso-logo.svg" alt="" width={48} height={48} />
      <span>
        <strong>Pulso</strong>
        <small>LBArtes Luiz · SolOS</small>
      </span>
    </Link>
  );
}

export function PulsoCredits() {
  return (
    <footer className="pulso-credits">
      <span>© LBArtes Luiz</span>
      <span aria-hidden="true">·</span>
      <span>Co-participação técnica e criativa: Luigi, inteligência artificial da OpenClaw</span>
    </footer>
  );
}
