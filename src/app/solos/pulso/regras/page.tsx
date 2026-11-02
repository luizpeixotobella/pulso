import Link from "next/link";
import { COMMUNITY_NOTICE, COMMUNITY_NOTICE_HASH, COMMUNITY_POLICY_VERSION } from "@/lib/pulso-community-policy";
import LegacyRules from "@/components/pulso-legacy-rules";
export const metadata = { title: "Regras do Pulso", description: "Regras da comunidade de conteúdo geral, cadastro automático e revisão humana.", alternates: { canonical: "/solos/pulso/regras" } };
export default function RulesPage() {
 return <main className="container">
 <section className="panel conversation-hero"><p className="section-kicker">Pulso · comunidade geral</p><h1>Uma conversa aberta, com cuidado.</h1><p>Não somos uma rede de conteúdo adulto. O cadastro independente não exige convite nem aprovação da equipe. A publicação exige revisão humana.</p><div className="action-row"><Link className="btn primary" href="/solos/pulso/entrar">Participar</Link><Link className="btn" href="/privacy-policy">Privacidade</Link></div></section>
 <section className="panel" style={{ display: "grid", gap: 18 }}>
 <div><h2>1. Cadastro e participação</h2><p>Conta com email confirmado e aceite explícito. Nesta etapa, o cadastro independente é para quem declara ter 17 anos ou mais. Para pessoas de até 16 anos, é necessário vínculo com responsável; esse fluxo ainda não está disponível. Não declare uma idade diferente da sua. A leitura da timeline pública não exige conta.</p><p>O aceite é registrado com versão e data. Não é prova de idade, identidade ou consentimento parental.</p></div>
 <div><h2>2. Conteúdo geral, sempre revisado</h2><p>Posts em texto têm até mil caracteres; comentários, até quinhentos, com respostas até três níveis. Todos permanecem ocultos até decisão humana. Reações não publicam texto novo. Imagens, reposts, agentes patrocinados e benefícios do piloto não são liberados por esse cadastro.</p></div>
 <div><h2>3. Respeito e proteção</h2><p>São proibidos conteúdo sexual ou inadequado, exploração, aliciamento, ameaças, assédio, ódio, incentivo a dano, fraude, spam e exposição de dados pessoais. Não publique telefone, email, endereço, escola, documentos, localização ou convites para contato privado. Não tente contornar restrições de idade ou moderação.</p></div>
 <div><h2>4. Privacidade por padrão</h2><p>A comunidade usa apelido atribuído, sem publicar automaticamente seu nome de cadastro. Não há perfil público pesquisável, mensagens privadas, recomendação personalizada ou adesão automática a créditos, publicidade ou análise comportamental. A leitura é cronológica em lotes de até doze posts.</p></div>
 <div><h2>5. Público não significa privado</h2><p>Textos e respostas aprovados na comunidade são visíveis também a visitantes, com aviso antes do envio. Email e dados de conta não aparecem. Entrar na comunidade não libera posts ou conversas antigas do piloto privado.</p></div>
 <div><h2>6. Denúncia, suspensão e saída</h2><p>Você pode denunciar ou bloquear pelo feed. Conteúdo ou contas podem ser restringidos preventivamente. Para pedir revisão, use contato@luiz-bella-artes.net e informe apenas o identificador do caso, sem documentos ou senhas. Você pode exportar e excluir seus dados sociais na área de segurança. Não crie outra conta para contornar uma suspensão.</p></div>
 <div><h2>Seu aceite</h2><p>{COMMUNITY_NOTICE}</p><p><small>Versão: {COMMUNITY_POLICY_VERSION} · registro: {COMMUNITY_NOTICE_HASH}</small></p></div>
 </section>
 <details style={{ marginTop: 24 }}><summary>Regras preservadas do piloto privado antigo — não se aplicam como condição da comunidade geral</summary><LegacyRules /></details>
 </main>;
}
