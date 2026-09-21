import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SafetyProfileClient from "./safety-profile-client";

export const metadata = { title: "Centro de Segurança | SolOS Pulso" };

const protections = [
  "Crianças, adolescentes e idade desconhecida não entram na superfície social da Alpha 0, nem em modo somente leitura.",
  "Cada participante usa convite pessoal vinculado ao email confirmado e condição adulta aferida fora do Pulso; autodeclaração sozinha não abre acesso.",
  "Mensagens privadas ficam desativadas para todos. Não há compartilhamento de localização nem descoberta irrestrita.",
  "Recomendação personalizada e perfilamento comercial ficam desligados por padrão.",
  "Regras locais barram aliciamento, contato externo, dados pessoais, ameaças e risco sexual infantil antes da IA.",
  "A IA faz triagem, mas todo post espera pré-moderação humana. Se qualquer camada falhar, o conteúdo não é liberado.",
  "Bloqueio, denúncia, exclusão e minimização de dados fazem parte do núcleo do produto.",
];

export default async function PulsoSafetyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("pulso_safety_profiles").select("age_band,age_assurance,status,can_publish,safety_mode").eq("user_id", user.id).maybeSingle() : { data: null };

  return (
    <main className="container">
      <section className="panel solos-hero" style={{ marginBottom: 16 }}><p className="section-kicker">Security first</p><h1>Centro de Segurança do Pulso</h1><p>Proteção integral, melhor interesse e privacidade por padrão. O piloto não abre funções de risco só para crescer mais rápido.</p><div className="action-row"><Link className="btn" href="/solos/pulso/feed">Abrir feed seguro</Link><Link className="btn" href="/solos/pulso/regras">Regras da Alpha 0</Link><Link className="btn" href="/privacy-policy">Privacidade</Link></div></section>
      <section className="grid" style={{ marginBottom: 16 }}>{protections.map((item) => <article className="panel" key={item}><p>{item}</p></article>)}</section>
      {profile ? <section className="panel" style={{ marginBottom: 16 }}><h2>Seu modo atual</h2><p>Aferição: {profile.age_assurance} · modo: {profile.safety_mode} · participação social: {profile.can_publish && profile.age_assurance === "verified_adult" ? "adulto verificado" : "não habilitada"}.</p></section> : null}
      {user ? <SafetyProfileClient /> : <section className="panel"><h2>Entre para configurar sua proteção</h2><Link className="btn primary" href="/login?next=/solos/pulso/seguranca">Entrar</Link></section>}
      <section className="panel" style={{ marginTop: 16 }}><h2>Ajuda imediata</h2><p>Se houver perigo atual, procure os serviços de emergência locais. No Brasil: Disque 100 para violações de direitos humanos; 190 em emergência policial; 188 para apoio emocional do CVV. Denúncias dentro do Pulso ocultam preventivamente riscos infantis graves.</p></section>
    </main>
  );
}
