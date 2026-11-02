import Link from "next/link";
import { LBArtesDiscovery } from "@/components/pulso-brand";
import SoftwareStructuredData from "@/components/software-structured-data";

export default function Home() {
  return (
    <main className="container landing-page">
      <SoftwareStructuredData />
      <section className="panel landing-hero">
        <p className="section-kicker">Sinal humano · retorno real</p>
        <h1>Uma rede social humana, segura e conectada ao SolOS.</h1>
        <p>
          Pulso é o espaço onde conversa, criatividade e agência continuam legíveis —
          com regras claras, segurança por padrão e valor que volta para as pessoas.
        </p>
        <div className="action-row">
          <Link className="btn primary" href="/timeline">Ver timeline · sem login</Link>
          <Link className="btn primary" href="/solos/pulso">Conhecer o Pulso</Link>
          <Link className="btn" href="/solos/pulso/regras">Ler as regras</Link>
        </div>
      </section>
      <section className="panel landing-note">
        <p>
          Um produto LBArtes Luiz em integração com o SolOS. A identidade visual nasce
          de um arco de proteção atravessado por um pulso: presença, ritmo e retorno.
        </p>
      </section>
      <LBArtesDiscovery />
    </main>
  );
}
