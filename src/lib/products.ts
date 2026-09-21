export type ProductCategory = "moda" | "livro" | "nft" | "solos";

export type Product = {
  slug: string;
  title: string;
  category: ProductCategory;
  shortDescription: string;
  description: string[];
  image: string;
  badge: string;
  ctas: { label: string; href: string; primary?: boolean }[];
  bullets?: string[];
};

export const products: Product[] = [
  {
    slug: "hard-rock-70",
    title: "Camiseta Hard Rock 70",
    category: "moda",
    badge: "Moda autoral",
    shortDescription: "Atitude vintage, energia de palco e uma estética que chama atenção.",
    image: "https://cdn.colab55.com/images/55002/studio/174481/art/499897/tees.png",
    description: [
      "Uma peça para quem gosta de imagem forte, memória rock e atitude visual imediata. A Hard Rock 70 tem cara de palco, energia retrô e presença suficiente para transformar um look simples em assinatura pessoal.",
      "Ela funciona muito bem para quem quer vestir arte sem perder identidade. É uma escolha certeira para fãs de estética vintage, cultura musical e design com personalidade.",
    ],
    ctas: [
      { label: "Comprar no Brasil", href: "https://www.colab55.com/@lbartesluiz/tees/hard-rock-70", primary: true },
      { label: "Comprar internacional", href: "https://www.zazzle.com.br/store/lbartes_luiz" },
    ],
  },
  {
    slug: "hard-rock-70-thin",
    title: "Camiseta Hard Rock 70 Thin",
    category: "moda",
    badge: "Moda autoral",
    shortDescription: "A versão mais enxuta de uma estética retrô com impacto visual.",
    image: "https://cdn.colab55.com/images/55002/studio/174481/art/586677/tees.png",
    description: [
      "A Hard Rock 70 Thin preserva a vibração retrô da coleção, mas com uma leitura visual mais enxuta. É ideal para quem quer impacto, sem excesso, e curte um visual equilibrado entre nostalgia e contemporaneidade.",
      "É uma peça que conversa bem com quem gosta de moda com referência musical e acabamento visual limpo, mantendo a assinatura forte da LBArtes Luiz.",
    ],
    ctas: [
      { label: "Comprar no Brasil", href: "https://www.colab55.com/@lbartesluiz/tees/hard-rock-70-thin", primary: true },
      { label: "Comprar internacional", href: "https://www.zazzle.com.br/store/lbartes_luiz" },
    ],
  },
  {
    slug: "miley-curly",
    title: "Camiseta Miley Curly",
    category: "moda",
    badge: "Moda autoral",
    shortDescription: "Pop contemporâneo com personalidade e presença visual forte.",
    image: "https://cdn.colab55.com/images/55002/studio/174481/art/489650/tees.png",
    description: [
      "A Miley Curly aposta numa linguagem pop, ousada e instantaneamente reconhecível. É uma peça pensada para quem gosta de arte com referência contemporânea, cor emocional e personalidade visual marcante.",
      "Perfeita para compor um look com mais irreverência, ela funciona tanto como item de moda quanto como declaração estética.",
    ],
    ctas: [
      { label: "Comprar no Brasil", href: "https://www.colab55.com/@lbartesluiz/tees/miley-curly", primary: true },
      { label: "Comprar internacional", href: "https://www.zazzle.com.br/store/lbartes_luiz" },
    ],
  },
  {
    slug: "leao-de-juda",
    title: "Pôster Leão de Judá",
    category: "moda",
    badge: "Arte decorativa",
    shortDescription: "Um símbolo de força espiritual e impacto estético para o ambiente.",
    image: "https://cdn.colab55.com/images/55002/studio/174481/art/494110/posters.png",
    description: [
      "O Leão de Judá traz força simbólica, presença espiritual e impacto visual em uma composição feita para ocupar espaço com significado. Não é apenas decoração: é uma imagem que fala de coragem, proteção e identidade.",
      "Funciona muito bem em ambientes criativos, escritórios, salas ou espaços de contemplação — especialmente para quem quer unir arte e simbolismo.",
    ],
    ctas: [
      { label: "Comprar no Brasil", href: "https://www.colab55.com/@lbartesluiz/posters/leao-de-juda", primary: true },
      { label: "Comprar internacional", href: "https://www.zazzle.com.br/store/lbartes_luiz" },
    ],
  },
  {
    slug: "amorzinho",
    title: "LBArtes Luiz: Amorzinho",
    category: "livro",
    badge: "Livro ilustrado",
    shortDescription: "Um livro delicado, afetivo e visualmente marcante.",
    image: "https://m.media-amazon.com/images/I/61KZHbLDhlL._AC_UY218_.jpg",
    description: [
      "Amorzinho é um livro que aposta na delicadeza sem perder identidade visual. O título já abre uma porta emocional e a apresentação gráfica reforça essa sensação de proximidade, afeto e beleza simples.",
      "É uma boa pedida para quem gosta de obras curtas, visuais e cheias de intenção — ou para quem quer presentear com algo autoral.",
    ],
    ctas: [{ label: "Comprar na Amazon", href: "https://www.amazon.com.br/Lbartes-Luiz-Carlos-Peixoto-Bella/dp/1724042149", primary: true }],
  },
  {
    slug: "logo-apos-a-tempestade",
    title: "Logo Após A Tempestade",
    category: "livro",
    badge: "Livro ilustrado",
    shortDescription: "Uma proposta sensível sobre luz, recomeço e esperança.",
    image: "https://m.media-amazon.com/images/I/71XEznsZRUL._AC_UY218_.jpg",
    description: [
      "Logo Após A Tempestade tem apelo imediato: fala de recomeço, claridade e saída emocional. É um título que atrai tanto pela promessa poética quanto pela força visual da capa.",
      "Para leitores que gostam de mensagens de esperança com roupagem artística, ele tem potencial de tocar e ficar.",
    ],
    ctas: [{ label: "Comprar na Amazon", href: "https://www.amazon.com.br/Logo-Ap%C3%B3s-Tempestade-felicidade-entrando-ebook/dp/B0BTDBK2LT", primary: true }],
  },
  {
    slug: "coracao-s2",
    title: "LBArtes Luiz: Coração s2",
    category: "livro",
    badge: "Livro ilustrado",
    shortDescription: "Um título visual e afetivo com linguagem direta e autoral.",
    image: "https://m.media-amazon.com/images/I/61rdXSwt9vL._AC_UY218_.jpg",
    description: [
      "Coração s2 mistura afeto, simplicidade pop e identidade visual direta. O título é acessível, memorável e funciona muito bem para quem se conecta com livros de linguagem emocional e traço contemporâneo.",
      "É o tipo de obra que conversa com o público pelo sentimento antes mesmo da primeira página.",
    ],
    ctas: [{ label: "Comprar na Amazon", href: "https://www.amazon.com.br/LBArtes-Luiz-Carlos-Peixoto-Bella/dp/1679899562", primary: true }],
  },
  {
    slug: "elove",
    title: "LBArtes Luiz: eLove",
    category: "livro",
    badge: "Livro ilustrado",
    shortDescription: "Afeto, cultura digital e identidade visual em um mesmo objeto.",
    image: "https://m.media-amazon.com/images/I/71mhGEtqCbL._AC_UY218_.jpg",
    description: [
      "eLove traz uma leitura contemporânea do afeto, com um nome que conversa com o mundo digital e com a emoção ao mesmo tempo. É um título enxuto, moderno e muito vendável pela lembrança imediata que provoca.",
      "Ideal para quem gosta de propostas criativas, visuais e com identidade pop.",
    ],
    ctas: [{ label: "Comprar na Amazon", href: "https://www.amazon.com.br/LBArtes-Luiz-Carlos-Peixoto-Bella-ebook/dp/B083ZCH2T5", primary: true }],
  },
  {
    slug: "turne-do-amor",
    title: "LBArtes Luiz: Turnê do Amor",
    category: "livro",
    badge: "Livro ilustrado",
    shortDescription: "Um título com energia romântica, pop e memorável.",
    image: "https://m.media-amazon.com/images/I/81L0bMjL+yL._AC_UY218_.jpg",
    description: [
      "Turnê do Amor já nasce com potência de marca: é um título sonoro, visual e carregado de imaginário. Evoca movimento, romance, show, viagem emocional — tudo o que ajuda a tornar um livro memorável.",
      "É uma obra que pode conquistar tanto leitores quanto pessoas que se encantam primeiro pela ideia e pela capa.",
    ],
    ctas: [{ label: "Comprar na Amazon", href: "https://www.amazon.com.br/Lbartes-Luiz-Turn%C3%AA-Do-Amor/dp/1790155649", primary: true }],
  },
  {
    slug: "noizes",
    title: "LBArtes Luiz: É Noizes",
    category: "livro",
    badge: "Livro ilustrado",
    shortDescription: "Uma peça editorial com voz urbana e linguagem próxima.",
    image: "https://m.media-amazon.com/images/I/71hTSKzeeaL._AC_UY218_.jpg",
    description: [
      "É Noizes carrega uma linguagem mais próxima, urbana e espontânea. O título tem carisma, soa atual e se conecta com leitores que gostam de obras com tom mais direto e identidade brasileira.",
      "É um livro que tem cara de conversa, atitude e pertencimento — um diferencial importante para gerar conexão.",
    ],
    ctas: [{ label: "Comprar na Amazon", href: "https://www.amazon.com.br/LBArtes-Luiz-Carlos-Peixoto-Bella/dp/1694279553", primary: true }],
  },
  {
    slug: "with-love",
    title: "LBArtes Luiz: With Love",
    category: "livro",
    badge: "Livro ilustrado",
    shortDescription: "Afeto, assinatura visual e apelo de presente em formato livro.",
    image: "https://m.media-amazon.com/images/I/61uYpGqeMvL._AC_UY218_.jpg",
    description: [
      "With Love trabalha uma linguagem afetiva mais universal, com potencial de agradar quem busca delicadeza, presença visual e um toque de romantismo. O título é direto, elegante e fácil de lembrar.",
      "É uma obra que também pode funcionar muito bem como presente, por ter uma leitura emocional clara e acolhedora.",
    ],
    ctas: [{ label: "Comprar na Amazon", href: "https://www.amazon.com.br/LBArtes-Luiz-Carlos-Peixoto-Bella/dp/1689384271", primary: true }],
  },

  {
    slug: "solos-heart-pass",
    title: "SolOS Heart Pass",
    category: "solos",
    badge: "Passe utilitário SolOS",
    shortDescription: "Um passe simbólico para apoiadores iniciais do SolOS, com arte LBArtes e onboarding Ghost/Brave.",
    image: "/product-assets/solos-heart-pass-anastacia.jpg",
    description: [
      "O SolOS Heart Pass é a primeira formulação pública de um passe utilitário para apoiadores do SolOS. Ele parte da arte Anastacia Our Hearts #1, em Polygon, e funciona como ponto de entrada simbólico para a visão de operating layer, Ghost e ownership explícito.",
      "A proposta inicial não é prometer lucro, yield ou retorno financeiro. O valor do passe está em identidade, acesso, participação, guided onboarding e possíveis benefícios de uso dentro do ecossistema SolOS conforme o produto amadurece.",
      "O primeiro benefício técnico em estudo é o onboarding transparente de API keys, começando pelo Brave Search: cada usuário entende sua própria chave, seus créditos e seus limites, enquanto o SolOS prepara uma camada futura de quotas e créditos por usuário."
    ],
    bullets: [
      "Passe simbólico para apoiadores iniciais",
      "Arte NFT em Polygon por LBArtes Luiz",
      "Base para onboarding Ghost, Brave Search e futuros créditos de uso",
      "Sem promessa de rendimento, lucro automático ou retorno financeiro"
    ],
    ctas: [
      { label: "Ver NFT no OpenSea", href: "https://opensea.io/item/polygon/0x507783149b7abb6ce23414dd0c9742eb9f4549b4/1", primary: true },
      { label: "Conhecer SolOS", href: "/solos" }
    ],
  },
  {
    slug: "nfts-opensea",
    title: "Coleção LBArtes Luiz no OpenSea",
    category: "nft",
    badge: "Coleção NFT",
    shortDescription: "Uma curadoria digital para quem quer colecionar arte autoral em blockchain.",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
    description: [
      "A coleção de NFTs da LBArtes Luiz leva a assinatura visual da marca para o campo da arte digital colecionável. É um espaço para obras com apelo mais experimental, escassez percebida e potencial de valorização simbólica para quem acompanha o projeto desde cedo.",
      "Mais do que um item digital, cada NFT pode funcionar como peça de coleção, registro de fase criativa e ponto de entrada para um universo autoral que não cabe só no físico.",
    ],
    bullets: [
      "Para colecionadores de arte digital",
      "Para quem acompanha a evolução da marca",
      "Para quem enxerga valor em obras exclusivas e experimentais",
    ],
    ctas: [{ label: "Ver coleção no OpenSea", href: "https://opensea.io/lbartesluiz", primary: true }],
  },
];

export const featuredProducts = products;
export const productCategories: { key: ProductCategory; title: string; subtitle: string }[] = [
  { key: "moda", title: "Moda autoral", subtitle: "Compra nacional e internacional com a mesma identidade visual." },
  { key: "livro", title: "Livros ilustrados", subtitle: "Os 7 primeiros títulos localizados da Amazon Brasil para Luiz Carlos Peixoto Bella." },
  { key: "solos", title: "SolOS Pass", subtitle: "Passe utilitário inicial para Ghost, Brave Search e ownership no SolOS." },
  { key: "nft", title: "NFTs", subtitle: "A frente digital e colecionável da LBArtes Luiz no OpenSea." },
];
