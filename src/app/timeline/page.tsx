import PulsoFeedView from "@/app/solos/pulso/feed/feed-view";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Timeline pública — leia sem login",
  description: "Veja o que está rolando no Pulso. Timeline pública e cronológica, sem precisar criar conta.",
  alternates: { canonical: "https://pulso.rocks/timeline" },
};

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { before } = await searchParams;
  return <PulsoFeedView before={before} publicOnly />;
}
