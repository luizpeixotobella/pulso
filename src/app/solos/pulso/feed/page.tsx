import PulsoFeedView from "./feed-view";

export const metadata = { title: "Seu feed", robots: { index: false, follow: false } };

export default async function PulsoFeedPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  return <PulsoFeedView {...await searchParams} />;
}
