import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade do Pulso",
  description: "Leia como o Pulso trata dados de conta, participação, convites, moderação e solicitações de titulares.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="container">
      <section className="panel" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Pulso · privacidade</p>
        <h1>Política de Privacidade</h1>
        <p><strong>Última atualização:</strong> 02/11/2026</p>
        <p>Esta página explica como o Pulso trata dados de autenticação, participação social, convites, moderação e solicitações de titular.</p>
      </section>
      <section className="panel" style={{ display: "grid", gap: 12 }}>
        <div><h2>Dados tratados</h2><p>Na comunidade geral: conta, email confirmado, declaração de cadastro independente de 17 anos ou mais, versão/data do aceite, apelido atribuído, textos, comentários, reações, bloqueios e denúncias. A declaração não é aferição de idade. Não coletamos data de nascimento ou documento nesse fluxo. Convites e aferição adulta permanecem apenas no piloto privado antigo. O Pulso não coleta localização nem oferece mensagens privadas entre participantes. A central de atendimento mantém solicitações privadas separadas do feed.</p></div>
        <div><h2>Finalidade e proteção</h2><p>Usamos esses dados para operar a comunidade de conteúdo geral, registrar o aceite, revisar conteúdo e aplicar proteção e limites contra abuso. A comunidade não ativa mensagens privadas, recomendação personalizada, créditos ou análise comportamental por esse aceite. Pessoas de até 16 anos dependem de vínculo com responsável; esse fluxo ainda não está disponível. Dados não são vendidos.</p></div>
        <div><h2>Direitos do titular</h2><p>Você pode solicitar confirmação, correção, exportação ou exclusão dos seus dados. A área autenticada oferece exportação e exclusão quando o acesso estiver habilitado.</p></div>
        <div><h2>Atendimento</h2><p>Ao registrar uma solicitação, guardamos email, assunto, mensagem, datas, status e histórico de respostas para tratar o pedido. Apenas a operação autorizada acessa a fila; o solicitante acompanha com protocolo e chave privada. A chave não é gravada em texto puro no banco. Não usamos mensagens de atendimento para publicidade. A conservação do histórico considera a necessidade de tratar a solicitação, obrigações legais e exercício de direitos. A exclusão ou anonimização deve ser solicitada à operação; não há descarte automático por prazo nesta versão. Você pode solicitar acesso, correção ou exclusão pelos canais abaixo. Limites contra abuso usam identificadores técnicos protegidos por hash. WhatsApp é externo ao Pulso e tem sua própria política de privacidade.</p></div>
        <div><h2>Contato</h2><p>Para dúvidas sobre privacidade: <Link href="/ajuda">Ajuda e atendimento humano</Link> ou <a href="mailto:contato@luiz-bella-artes.net">contato@luiz-bella-artes.net</a>.</p></div>
        <div className="action-row"><Link className="btn" href="/solos/pulso/regras">Regras do Pulso</Link><Link className="btn primary" href="/solos/pulso/entrar">Etapas de entrada</Link></div>
      </section>
    </main>
  );
}
