import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPulsoPost } from "@/lib/pulso-public";
import { createClient } from "@/lib/supabase/server";
import { getPulsoAlphaAccess } from "@/lib/pulso-alpha";
import SinglePost from "@/components/pulso-single-post";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublicPulsoPost(id).catch(() => null);
  if (!post) return { title: "Publicação indisponível", description: "Esta publicação não está disponível para leitura pública.", robots: { index: false, follow: false }, openGraph: { title: "Publicação indisponível | Pulso", description: "Esta publicação não está disponível para leitura pública.", images: [] }, twitter: { title: "Publicação indisponível | Pulso", images: [] } };
  const plain = (post.body ?? "Converse no Pulso.").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  const title = `${post.authorName} no Pulso: ${plain.slice(0, 90)}`;
  const description = plain.slice(0, 200);
  const image = post.imageUrl ? { url: post.imageUrl, width: 1536, height: 1024, alt: post.imageAlt ?? "Ilustração do Pulso" } : { url: "/pulso-open-graph.png", width: 1200, height: 630, alt: "Pulso · converse com a gente" };
  return { title, description, alternates: { canonical: `/p/${post.id}` }, openGraph: { type: "article", title, description, url: `/p/${post.id}`, siteName: "Pulso · LBArtes Luiz", locale: "pt_BR", publishedTime: post.createdAt, images: [image] }, twitter: { card: "summary_large_image", title, description, images: [image.url] } };
}
export default async function PublicPostPage({ params }: Props) {
  const { id } = await params;
  let post;
  try { post = await getPublicPulsoPost(id); }
  catch { return <main className="container single-post-page"><section className="panel" role="status"><h1>Não foi possível carregar a conversa agora.</h1><p>Tente novamente em instantes.</p><Link className="btn" href={`/p/${encodeURIComponent(id)}`}>Tentar novamente</Link></section></main>; }
  if (!post) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const access = user ? await getPulsoAlphaAccess(user.id) : null;
  return <main className="container single-post-page"><Link className="back-link" href="/timeline">← Mais conversas no Pulso</Link><h1 className="single-post-title">Uma conversa no Pulso</h1><SinglePost post={post} canInteract={Boolean(access?.canInteract)} /><section className="panel single-post-invite"><h2>Tem algo a acrescentar?</h2><p>Leia sem conta. Para participar, entre ou crie seu perfil e aceite as regras. Novas respostas passam por revisão humana.</p><div className="action-row">{user ? access?.canInteract ? <p>Você já pode responder pelo campo de comentários acima.</p> : <Link className="btn primary" href={`/solos/pulso/entrar?next=${encodeURIComponent(`/p/${post.id}`)}`}>Concluir minha participação</Link> : <><Link className="btn primary" href={`/login?next=${encodeURIComponent(`/p/${post.id}`)}`}>Entrar nesta conversa</Link><Link className="btn" href={`/cadastro?next=${encodeURIComponent(`/p/${post.id}`)}`}>Criar minha conta</Link></>}</div></section></main>;
}
