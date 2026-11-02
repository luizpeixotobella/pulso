import Link from "next/link";
import SupportCenter from "./support-center";
export const metadata = {
  title: "Ajuda e atendimento", description: "Dúvidas frequentes, contato humano e acompanhamento privado de solicitações no Pulso.",
  alternates: { canonical: "/ajuda" },
};
const faqs = [
 ["Preciso de convite para participar?", "Não para a comunidade geral. Faça seu cadastro, confirme o email e aceite as regras. O piloto privado antigo continua separado e restrito."],
 ["Por que meu post ou comentário ainda não apareceu?", "Publicações da comunidade passam por revisão humana. Enviar não significa aprovação imediata. Se houver um problema, escolha Publicação e moderação na solicitação abaixo."],
 ["O que é público e o que é privado?", "Posts públicos e respostas aprovadas podem ser vistos sem login. O conteúdo privado do piloto não se torna público ao entrar na comunidade. Solicitações de atendimento não são posts e ficam fora do feed."],
 ["Como peço correção, exportação ou exclusão dos meus dados?", "Use o assunto Privacidade e meus dados ou os canais diretos. Pode ser necessário confirmar a titularidade para proteger sua conta; nunca envie senha ou código de autenticação."],
 ["Posso compartilhar uma conversa?", "Posts públicos têm o botão Compartilhar e link próprio. Links não concedem acesso a conteúdo privado."],
 ["A ajuda automática substitui uma pessoa?", "Não. Estas são respostas prontas para dúvidas comuns, não um atendente ao vivo. Você pode falar com uma pessoa ou deixar uma solicitação sem passar por estas perguntas."],
];
export default function HelpPage() {
 return <main className="container support-page">
  <section className="panel support-intro"><p className="section-kicker">Pulso · estamos por aqui</p><h1>Ajuda e atendimento</h1><p>Uma dúvida rápida, um problema ou algo que precisa de cuidado? Escolha como prefere conversar.</p><div className="action-row"><a className="btn primary" href="#atendimento-humano">Quero falar com uma pessoa</a><a className="btn" href="#duvidas">Ver dúvidas frequentes</a><a className="btn" href="#acompanhar">Já tenho um protocolo</a></div></section>
  <SupportCenter />
  <section className="panel support-faq" id="duvidas"><p className="section-kicker">Respostas rápidas · uso opcional</p><h2>Dúvidas frequentes</h2>{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}<p>Não resolveu? <a href="#atendimento-humano">Vá direto ao atendimento humano</a>.</p></section>
  <p><Link href="/timeline">← Voltar às conversas</Link> · <Link href="/solos/pulso/regras">Regras e segurança</Link></p>
 </main>;
}
