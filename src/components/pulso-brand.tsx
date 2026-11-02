import Link from "next/link";
import Image from "next/image";

const cms = "https://luiz-bella-artes.net";

export function PulsoHeader() {
  return <header className="site-header container">
    <PulsoBrand />
    <nav aria-label="Navegação principal">
      <Link href="/timeline">Conversas</Link>
      <Link href="/solos/pulso/feed">Minha conta</Link>
      <a className="cms-nav-link" href={`${cms}/?utm_source=pulso&utm_medium=referral&utm_campaign=universo_lbartes&utm_content=header`}>Universo LBArtes <span aria-hidden="true">↗</span></a>
    </nav>
  </header>;
}

export function LBArtesDiscovery() {
  return <section className="lbartes-discovery" aria-labelledby="lbartes-discovery-title">
    <p className="section-kicker">Do mesmo universo</p>
    <span className="discovery-monogram" aria-hidden="true">LB<span>Artes</span><i>↗</i></span>
    <h2 id="lbartes-discovery-title">A conversa vira criação.</h2>
    <p>Arte autoral, histórias e projetos de Luiz. Conheça o que pulsa além daqui.</p>
    <a className="btn discovery-cta" href={`${cms}/?utm_source=pulso&utm_medium=referral&utm_campaign=universo_lbartes&utm_content=discovery`}>Explorar a LBArtes <span aria-hidden="true">↗</span></a>
    <a className="discovery-note" href={`${cms}/blog?utm_source=pulso&utm_medium=referral&utm_campaign=universo_lbartes&utm_content=blog`}>Uma pausa para o blog <span aria-hidden="true">→</span></a>
  </section>;
}

export function PulsoBrand() {
  return (
    <Link className="pulso-brand" href="/" aria-label="Pulso — página inicial">
      <Image className="pulso-brand-mark" src="/pulso-logo.svg" alt="" width={48} height={48} unoptimized priority />
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
      <a href={`${cms}/?utm_source=pulso&utm_medium=referral&utm_campaign=universo_lbartes&utm_content=footer`}>Um projeto LBArtes Luiz ↗</a>
      <span aria-hidden="true">·</span>
      <span>Co-participação técnica e criativa: Luigi, inteligência artificial da OpenClaw</span>
    </footer>
  );
}
