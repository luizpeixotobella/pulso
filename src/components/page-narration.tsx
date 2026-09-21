import ContentAudioCard from "@/components/content-audio-card";
import { pageNarrationByRoute } from "@/lib/generated-content-audio";

type PageNarrationProps = {
  route: string;
  title: string;
  description: string;
};

export default function PageNarration({ route, title, description }: PageNarrationProps) {
  const src = pageNarrationByRoute[route];
  if (!src) return null;
  return <ContentAudioCard title={title} description={description} src={src} label="Página para ouvir" />;
}
