import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "5rem 1.5rem" }}>
      <p>Pulso · LBArtes Luiz</p>
      <h1>Uma rede social humana, segura e conectada ao SolOS.</h1>
      <p>
        Este é o repositório independente do Pulso. A aplicação está em
        extração progressiva do CMS da LBArtes.
      </p>
      <p><Link href="/solos/pulso">Entrar no Pulso</Link></p>
    </main>
  );
}
