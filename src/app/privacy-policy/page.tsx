import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="container">
      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Pulso · privacidade</p>
        <h1>Política de Privacidade</h1>
        <p><strong>Última atualização:</strong> 21/09/2026</p>
        <p>Esta página explica como o Pulso trata dados de autenticação, participação social, convites, moderação e solicitações de titular.</p>
      </section>
      <section className="panel" style={{ display: "grid", gap: 12 }}>
        <div><h2>Dados tratados</h2><p>Conta, email confirmado, convite em hash, condição adulta declarada, perfil mínimo, posts, comentários, reações, bloqueios e denúncias. O Pulso não coleta localização nem mantém mensagens privadas.</p></div>
        <div><h2>Finalidade e proteção</h2><p>Usamos esses dados para operar o feed invite-only, aplicar consentimento, pré-moderação humana, limites da Alpha e trilhas auditáveis de segurança. Dados não são vendidos.</p></div>
        <div><h2>Direitos do titular</h2><p>Você pode solicitar confirmação, correção, exportação ou exclusão dos seus dados. A área autenticada oferece exportação e exclusão quando o acesso estiver habilitado.</p></div>
        <div><h2>Contato</h2><p>Para dúvidas sobre privacidade: <strong>contato@luiz-bella-artes.net</strong>.</p></div>
        <div className="action-row"><Link className="btn" href="/solos/pulso/regras">Regras do Pulso</Link><Link className="btn primary" href="/solos/pulso/entrar">Etapas de entrada</Link></div>
      </section>
    </main>
  );
}
