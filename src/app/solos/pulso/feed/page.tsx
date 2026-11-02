import PulsoFeedView from "./feed-view";

export const metadata = { title: "Seu feed", robots: { index: false, follow: false } };

export default async function PulsoFeedPage({ searchParams }: { searchParams: Promise<{ before?: string; post?: string }> }) {
  const { before, post } = await searchParams;
  return <PulsoFeedView before={before} postId={post} />;
}
