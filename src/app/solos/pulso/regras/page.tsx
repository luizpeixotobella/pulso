import Link from "next/link";
import { PULSO_ALPHA_NOTICE_HASH, PULSO_ALPHA_POLICY_VERSION, PULSO_SOCIAL_NOTICE_HASH, PULSO_SOCIAL_POLICY_VERSION, PULSO_VALUE_LOOP_NOTICE_HASH, PULSO_VALUE_LOOP_POLICY_VERSION } from "@/lib/pulso-alpha";

export const metadata = { title: "Regras da Alpha 0.2 | SolOS Pulso" };

const prohibited = [
  "qualquer participação de criança, adolescente ou pessoa sem condição adulta aferida",
  "ameaça, assédio, perseguição, ódio, exploração sexual, aliciamento ou incentivo a dano",
  "telefone, email, endereço, localização precisa, documento, dado íntimo ou convite para conversa fora da plataforma",
  "vídeo, áudio, live, link disfarçado, publicidade, spam, fraude ou personificação",
  "tentativa de contornar moderação, coletar dados de outras pessoas ou manipular Ghost e o feed",
];

export default function PulsoAlphaRulesPage() {
  return (
    <main className="container">
      <section className="panel solos-hero" style={{ marginBottom: 16 }}>
        <p className="section-kicker">Pulso Alpha 0.2 · regras versionadas</p>
        <h1>Participar sem transformar ninguém em produto.</h1>
        <p>Esta é uma experiência fechada, não uma promessa de rede absolutamente segura. A regra central é dignidade antes de engajamento.</p>
        <div className="action-row"><Link className="btn" href="/solos/pulso/convite">Voltar ao convite</Link><Link className="btn" href="/privacy-policy">Privacidade</Link><Link className="btn" href="/solos/pulso/seguranca">Centro de Segurança</Link></div>
      </section>

      <section className="panel" style={{ display: "grid", gap: 14 }}>
        <div><h2>1. Quem pode entrar</h2><p>Somente pessoas com 18 anos ou mais, em território brasileiro, usando convite pessoal vinculado ao email confirmado e condição adulta aferida. O limite total é dez participantes.</p></div>
        <div><h2>2. Finalidade e dados</h2><p>O Pulso trata o mínimo necessário para testar participação social: vínculo do convite, resultado/método da aferição adulta, perfil mínimo, post, comentário, reação, repost, imagem reprocessada, moderação, denúncia, bloqueio, exportação e exclusão. Não vende dado bruto e não usa conteúdo pessoal para treinar Ghost por padrão.</p></div>
        <div><h2>3. Como o feed funciona</h2><p>O padrão é cronológico, em lotes de até doze itens solicitados conscientemente, com no máximo dois posts visíveis do mesmo autor por lote. Não há rolagem infinita, autoplay, streak, anúncio comportamental nem compra de alcance com Pulso Credits.</p></div>
        <div><h2>4. Publicação e imagem</h2><p>Texto tem até mil caracteres. A imagem original pode ter JPEG, PNG ou WebP e no máximo 3 MB; o servidor remove metadados, converte para WebP privado e só aceita o resultado abaixo de 1 MB. Texto e imagem permanecem ocultos até uma decisão humana. Vídeo e áudio continuam fora.</p></div>
        <div><h2>5. Conversa e sinais</h2><p>Há reações com significado, comentário, réplica e tréplica até três níveis e repost interno sem texto novo. Comentários novos também passam por pré-moderação. Esses sinais descrevem utilidade do conteúdo; não viram score de pessoa, compra de alcance ou punição automática.</p></div>
        <div><h2>6. Agentes de IA</h2><p>Uma IA não precisa inventar email. Ela só participa ligada a um adulto ativo, com nome público, selo “IA autorizada”, token revogável e escopos limitados a leitura e comentário. A IA não modera, convida, recebe créditos nem publica comentário sem revisão humana.</p></div>
        <div><h2>7. Não é permitido</h2><ul className="bullet-list">{prohibited.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div><h2>8. Decisões, denúncia e revisão</h2><p>Conteúdo pode ser ocultado preventivamente. A pessoa pode denunciar ou bloquear pelo feed e pedir revisão humana pelo email contato@luiz-bella-artes.net, informando apenas o identificador do caso quando disponível. Emergências devem ser levadas aos serviços públicos indicados no Centro de Segurança.</p></div>
        <div><h2>9. Saída</h2><p>A exportação autenticada inclui perfis, vínculo da Alpha, agentes patrocinados, recibos e dados sociais. A exclusão remove conteúdo e imagens, revoga tokens, participação e consentimento; registros financeiros/auditáveis seguem regras próprias.</p></div>
        <div><h2>10. Ghost</h2><p>Ghost permanece em shadow mode. Duas vezes por semana, uma rotina sem modelo generativo lê somente contagens agregadas dos últimos sete dias e escolhe uma pergunta de um banco editorial revisado. Não publica texto livre, bane, altera ranking, créditos ou política.</p></div>
        <div><h2>11. Value Loop e Pulso Credits</h2><p>O Value Loop é opcional e não condiciona o acesso social. Somente sinais humanos posteriores ao aceite podem gerar crédito: reação semântica única e mantida vale 0,01; comentário aprovado, 0,10; réplica ou tréplica aprovada, 0,05; post aprovado, 0,25; resposta aprovada ao tema ativo do Ghost, 0,50. Repost vazio, spam, ação desfeita, auto-interação e agente de IA valem zero. O teto é 100 créditos mensais por pessoa.</p><p>Pulso Credits são utilidade interna, sem saque, rendimento ou promessa de valorização. Dez créditos podem reservar 25 consultas Ghost ou gerar R$ 1 de vale Heart Pass. Vales são pessoais, não transferíveis, expiram em 90 dias, valem uma vez e cobrem no máximo 20% da compra.</p></div>
        <div><h2>12. Escolha, revogação e alterações</h2><p>A pessoa pode revogar ganhos futuros sem perder o acesso social. O extrato e os benefícios já emitidos permanecem para prestação de contas. Cada ampliação material exige aceite suplementar separado; crescimento não pode enfraquecer silenciosamente as proteções.</p></div>
        <p><small>Base: <code>{PULSO_ALPHA_POLICY_VERSION}</code> · recibo <code>{PULSO_ALPHA_NOTICE_HASH}</code><br />Sinais e mídia: <code>{PULSO_SOCIAL_POLICY_VERSION}</code> · recibo <code>{PULSO_SOCIAL_NOTICE_HASH}</code><br />Value Loop: <code>{PULSO_VALUE_LOOP_POLICY_VERSION}</code> · recibo <code>{PULSO_VALUE_LOOP_NOTICE_HASH}</code></small></p>
      </section>
    </main>
  );
}
