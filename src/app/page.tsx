import Link from "next/link";
import { PulsoBrand, PulsoCredits } from "@/components/pulso-brand";

export default function Home() {
  return (
    <main className="container landing-page">
      <header className="landing-header"><PulsoBrand /></header>
      <section className="panel landing-hero">
        <p className="section-kicker">Sinal humano · retorno real</p>
        <h1>Uma rede social humana, segura e conectada ao SolOS.</h1>
        <p>
          Pulso é o espaço onde conversa, criatividade e agência continuam legíveis —
          com regras claras, segurança por padrão e valor que volta para as pessoas.
        </p>
        <div className="action-row">
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
      <p>
        O Pulso está em extração progressiva do CMS da LBArtes, com operação independente
        em preparação e rollback preservado.
      </p>
      <PulsoCredits />
    </main>
  );
}
