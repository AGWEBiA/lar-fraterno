// "O Evangelho Segundo o Espiritismo" — Allan Kardec
// Tradução: Guillon Ribeiro (FEB). Conteúdo carregado do PDF original do usuário,
// destinado a uso pessoal/familiar no contexto do Evangelho no Lar.
import rawData from "./evangelho-full.json";
import { applyContentFixes } from "./content-fixes";

export type ChapterNode =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "item"; n: number; paragraphs: string[] };

export interface Chapter {
  slug: string;
  number: number;
  roman: string;
  title: string;
  subtitle?: string;
  summary: string;
  nodes: ChapterNode[];
  /** Texto plano de todos os parágrafos — usado para TTS e buscas. */
  paragraphs: string[];
}

// Resumo curto para cada capítulo (escrito por nós, sem reproduzir trechos protegidos).
const SUMMARIES: Record<string, string> = {
  "capitulo-1":  "Jesus veio cumprir, não destruir, a Lei. As três revelações — Moisés, Cristo e o Espiritismo — formam uma só obra divina.",
  "capitulo-2":  "O Reino de Cristo é espiritual. A vida futura é a verdadeira pátria; a Terra, lugar de provas e progresso.",
  "capitulo-3":  "Existem mundos diversos para a evolução do Espírito: de provas, de regeneração, e mundos felizes.",
  "capitulo-4":  "Renascer de novo é reencarnar. A pluralidade das existências é a chave da justiça divina e da evolução da alma.",
  "capitulo-5":  "Toda aflição tem uma causa, presente ou anterior. A resignação cristã transforma o sofrimento em progresso.",
  "capitulo-6":  "O Consolador prometido por Jesus é o Espírito de Verdade, manifestado nos tempos atuais pelo Espiritismo.",
  "capitulo-7":  "Pobres de espírito são os humildes. A humildade abre as portas do Reino; o orgulho as fecha.",
  "capitulo-8":  "A pureza do coração nasce da intenção. O verdadeiro escândalo está no pensamento, não apenas no ato.",
  "capitulo-9":  "Brandura, paciência e doçura desarmam a violência. A cólera é veneno do Espírito.",
  "capitulo-10": "Perdoar é condição para ser perdoado. A misericórdia é a forma mais alta da justiça.",
  "capitulo-11": "Amar o próximo como a si mesmo é a síntese de toda a Lei. Sem caridade não há salvação.",
  "capitulo-12": "Amai os vossos inimigos: vencer o mal com o bem é a marca do verdadeiro discípulo.",
  "capitulo-13": "Praticar o bem com discrição. A caridade silenciosa é a que mais agrada a Deus.",
  "capitulo-14": "Os laços de família são sagrados. Honrai pais, autoridades e a família espiritual da Humanidade.",
  "capitulo-15": "Não há salvação fora da caridade — princípio universal que ultrapassa toda forma religiosa.",
  "capitulo-16": "Não se pode servir simultaneamente a Deus e aos bens materiais. Equilíbrio entre o céu e a terra.",
  "capitulo-17": "Sede perfeitos: o aperfeiçoamento moral é a meta de cada existência.",
  "capitulo-18": "Muitos os chamados, poucos os escolhidos. A fé sem obras nada vale.",
  "capitulo-19": "A fé sincera transporta montanhas — ela é força, é luz e é confiança em Deus.",
  "capitulo-20": "Os trabalhadores da última hora são acolhidos pelo Senhor. Nunca é tarde para a transformação.",
  "capitulo-21": "Pelos frutos se conhece a árvore. Cuidado com falsos profetas, dentro e fora de nós.",
  "capitulo-22": "Casamento e divórcio à luz do Cristo: união pela alma, e não apenas pelo corpo.",
  "capitulo-23": "Estranha moral é a do mundo, que vê grandeza no que o Cristo chama de pequenez.",
  "capitulo-24": "Não se acende a candeia para escondê-la. A verdade espírita deve iluminar o mundo.",
  "capitulo-25": "Buscai e achareis: o esforço sincero é sempre amparado pelos bons Espíritos.",
  "capitulo-26": "Dai gratuitamente o que gratuitamente recebestes. A mediunidade é dom do céu, não comércio.",
  "capitulo-27": "Pedi e obtereis: a oração eleva a alma e atrai a inspiração dos bons Espíritos.",
  "capitulo-28": "Coletânea de preces espíritas para todas as circunstâncias da vida.",
};

const SUBTITLES: Record<string, string> = {
  "capitulo-1": "Capítulo I",
  "capitulo-2": "Capítulo II",
  "capitulo-3": "Capítulo III",
  "capitulo-4": "Capítulo IV",
  "capitulo-5": "Capítulo V",
  "capitulo-6": "Capítulo VI",
  "capitulo-7": "Capítulo VII",
  "capitulo-8": "Capítulo VIII",
  "capitulo-9": "Capítulo IX",
  "capitulo-10": "Capítulo X",
  "capitulo-11": "Capítulo XI",
  "capitulo-12": "Capítulo XII",
  "capitulo-13": "Capítulo XIII",
  "capitulo-14": "Capítulo XIV",
  "capitulo-15": "Capítulo XV",
  "capitulo-16": "Capítulo XVI",
  "capitulo-17": "Capítulo XVII",
  "capitulo-18": "Capítulo XVIII",
  "capitulo-19": "Capítulo XIX",
  "capitulo-20": "Capítulo XX",
  "capitulo-21": "Capítulo XXI",
  "capitulo-22": "Capítulo XXII",
  "capitulo-23": "Capítulo XXIII",
  "capitulo-24": "Capítulo XXIV",
  "capitulo-25": "Capítulo XXV",
  "capitulo-26": "Capítulo XXVI",
  "capitulo-27": "Capítulo XXVII",
  "capitulo-28": "Capítulo XXVIII",
};

const data = rawData as Array<{
  slug: string;
  number: number;
  roman: string;
  title: string;
  nodes: ChapterNode[];
}>;

export const chapters: Chapter[] = data.map((c) => {
  const fixedNodes = applyContentFixes(c.slug, c.nodes);
  const paragraphs: string[] = [];
  for (const n of fixedNodes) {
    if (n.type === "item") {
      for (const p of n.paragraphs) paragraphs.push(`${n.n}. ${p}`);
    } else {
      paragraphs.push(n.text);
    }
  }
  return {
    slug: c.slug,
    number: c.number,
    roman: c.roman,
    title: c.title,
    subtitle: SUBTITLES[c.slug],
    summary: SUMMARIES[c.slug] ?? "",
    nodes: fixedNodes,
    paragraphs,
  };
});

export const chapterBySlug = (slug: string): Chapter | undefined =>
  chapters.find((c) => c.slug === slug);
