export type Post = {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_url: string | null;
  content: string;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
