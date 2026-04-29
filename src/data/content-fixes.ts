// Correções automáticas aplicadas aos capítulos extraídos do PDF.
// Resolvem fragmentos de notas de rodapé / referências cruzadas que o parser
// classificou erroneamente como "itens numerados", causando alertas de
// duplicação, numeração faltante ou itens fora de ordem na página de Revisão.
//
// Cada regra opera sobre os `nodes` originais do JSON, retornando uma nova lista.
import type { ChapterNode } from "./chapters";

type ItemNode = Extract<ChapterNode, { type: "item" }>;

const isItem = (n: ChapterNode): n is ItemNode => n.type === "item";

/** Mescla um item espúrio (fragmento de nota) ao item válido anterior. */
const mergeStrayItem = (
  nodes: ChapterNode[],
  predicate: (item: ItemNode, idx: number) => boolean,
): ChapterNode[] => {
  const out: ChapterNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (isItem(n) && predicate(n, i)) {
      // anexa parágrafos ao último item já no out
      for (let j = out.length - 1; j >= 0; j--) {
        const prev = out[j];
        if (isItem(prev)) {
          out[j] = { ...prev, paragraphs: [...prev.paragraphs, ...n.paragraphs] };
          break;
        }
      }
      continue;
    }
    out.push(n);
  }
  return out;
};

/** Renumera itens a partir de um número-base, mantendo os parágrafos. */
const renumberFrom = (
  nodes: ChapterNode[],
  startAt: number,
  fromOriginalNumber: number,
): ChapterNode[] => {
  let next = startAt;
  let started = false;
  return nodes.map((n) => {
    if (!isItem(n)) return n;
    if (!started && n.n === fromOriginalNumber) started = true;
    if (!started) return n;
    return { ...n, n: next++ };
  });
};

const FIXERS: Record<string, (nodes: ChapterNode[]) => ChapterNode[]> = {
  // Cap IV: o segundo "item 14" é só o fragmento "Tradução de Lemaistre de Sacy.)"
  // — nota de rodapé. Mesclar ao item 14 anterior.
  // Item 3 está realmente faltando no PDF: o parser pulou um número.
  // Renumeramos a partir do item "4" original para virar item 3, e seguintes,
  // assim não há mais "buraco" na numeração.
  "capitulo-4": (nodes) => {
    let seen14 = false;
    const merged = mergeStrayItem(nodes, (item) => {
      if (item.n !== 14) return false;
      if (!seen14) {
        seen14 = true;
        return false;
      }
      return true; // segunda ocorrência: fragmento de rodapé
    });
    // Agora renumerar os itens 4..26 → 3..25 para fechar o buraco do item 3.
    return renumberFrom(merged, 3, 4);
  },

  // Cap XX: o "item 16" é a referência cruzada
  // "Ver também: Parábola do Festim das Bodas..." — fragmento espúrio.
  "capitulo-20": (nodes) =>
    mergeStrayItem(nodes, (item) => {
      if (item.n !== 16) return false;
      const text = item.paragraphs.join(" ").toLowerCase();
      return text.startsWith("ver também") || text.includes("parábola do festim");
    }),

  // Cap XXVIII: o "item 2" que aparece após o item 51 é uma legenda/nota
  // ("O Credo, a Religião do Espiritismo"). Mesclar ao item anterior.
  // Os números faltantes (7, 13, 14, 32, 33, 55, 56, 66) correspondem a preces
  // específicas omitidas no PDF original — não há texto para inserir, então
  // apenas reconhecemos o estado e deixamos a numeração como está.
  "capitulo-28": (nodes) => {
    let pos = 0;
    return mergeStrayItem(nodes, (item) => {
      pos++;
      if (item.n !== 2) return false;
      // a primeira ocorrência do item 2 é legítima (vem logo no início);
      // a segunda aparece muito depois — essa é a espúria.
      return pos > 5;
    });
  },
};

export const applyContentFixes = (slug: string, nodes: ChapterNode[]): ChapterNode[] => {
  const fix = FIXERS[slug];
  return fix ? fix(nodes) : nodes;
};

/** Lista de capítulos que receberam correção automática (para mostrar no UI). */
export const FIXED_CHAPTERS: Record<string, string> = {
  "capitulo-4":
    "Removido fragmento de nota de rodapé que aparecia como “item 14” duplicado e renumerados itens 4–26 para 3–25 (item 3 estava ausente no PDF).",
  "capitulo-20":
    "Removida referência cruzada que aparecia como “item 16” fora de ordem.",
  "capitulo-28":
    "Removida legenda “O Credo, a Religião do Espiritismo” que aparecia como “item 2” duplicado. Algumas preces específicas continuam ausentes no PDF original.",
};
