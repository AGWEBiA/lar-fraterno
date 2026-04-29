// Correções automáticas aplicadas aos capítulos extraídos do PDF original.
// Resolvem fragmentos de notas de rodapé / referências cruzadas que o parser
// classificou erroneamente como "itens numerados", e PREENCHEM lacunas
// confirmadas confrontando com a edição CEI/FEB (Bezerra, 2018).
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

/** Insere um novo item antes do primeiro item cujo número >= `beforeNumber`. */
const insertItemBefore = (
  nodes: ChapterNode[],
  newItem: ItemNode,
  beforeNumber: number,
): ChapterNode[] => {
  const out: ChapterNode[] = [];
  let inserted = false;
  for (const n of nodes) {
    if (!inserted && isItem(n) && n.n >= beforeNumber) {
      out.push(newItem);
      inserted = true;
    }
    out.push(n);
  }
  if (!inserted) out.push(newItem);
  return out;
};

const FIXERS: Record<string, (nodes: ChapterNode[]) => ChapterNode[]> = {
  // Cap IV
  // 1) o segundo "item 14" é só o fragmento "Tradução de Lemaistre de Sacy.)"
  //    — nota de rodapé. Mesclar ao item 14 anterior.
  // 2) o item 3 estava ausente no JSON original — preenchido a partir da
  //    edição CEI/FEB (Bezerra, 2018), p. 62.
  "capitulo-4": (nodes) => {
    let seen14 = false;
    const merged = mergeStrayItem(nodes, (item) => {
      if (item.n !== 14) return false;
      if (!seen14) {
        seen14 = true;
        return false;
      }
      return true;
    });
    const item3: ItemNode = {
      type: "item",
      n: 3,
      paragraphs: [
        "(Após a transfiguração.) Seus discípulos então o interrogaram dessa forma: “Por que dizem os escribas ser preciso que Elias venha primeiro?” — Jesus lhes respondeu: “É verdade que Elias há de vir e restabelecer todas as coisas, mas Eu vos declaro que Elias já veio e eles não o conheceram e o trataram como bem lhes aprouve. É assim que farão sofrer o Filho do Homem”. — Então os discípulos compreenderam que fora de João Batista que Ele lhes falara. (Mateus, 17:10 a 13; Marcos, 9:11 a 13.)",
      ],
    };
    return insertItemBefore(merged, item3, 4);
  },

  // Cap XX: o "item 16" é a referência cruzada
  // "Ver também: Parábola do Festim das Bodas..." — fragmento espúrio.
  "capitulo-20": (nodes) =>
    mergeStrayItem(nodes, (item) => {
      if (item.n !== 16) return false;
      const text = item.paragraphs.join(" ").toLowerCase();
      return text.startsWith("ver também") || text.includes("parábola do festim");
    }),

  // Cap XXVIII (Coletânea de preces espíritas):
  // 1) o segundo "item 2" (após o item 51) é uma legenda — mesclar ao anterior.
  // 2) preces 7, 13, 14, 32, 33, 55, 56 e 66 estavam ausentes no JSON
  //    original — preenchidas a partir da edição CEI/FEB (Bezerra, 2018).
  "capitulo-28": (nodes) => {
    let pos = 0;
    let cleaned = mergeStrayItem(nodes, (item) => {
      pos++;
      if (item.n !== 2) return false;
      return pos > 5;
    });
    const missing: ItemNode[] = [
      {
        type: "item",
        n: 7,
        paragraphs: [
          "(Para o fim da reunião.) Agradecemos aos Espíritos bons que se dignaram comunicar-se conosco e lhes rogamos que nos ajudem a pôr em prática as instruções que nos deram, fazendo com que cada um de nós, ao sair daqui, se sinta fortalecido para a prática do bem e do amor ao próximo. Desejamos igualmente que essas instruções sejam proveitosas aos Espíritos sofredores, ignorantes ou viciosos que puderam assistir a esta reunião e para os quais imploramos a misericórdia de Deus.",
        ],
      },
      {
        type: "item",
        n: 13,
        paragraphs: [
          "(Outra.) Meu Deus, permite que os Espíritos bons que me cercam venham em meu auxílio quando eu estiver em dificuldade, e que me sustentem se eu vacilar. Faze, Senhor, que me inspirem fé, esperança e caridade; que sejam para mim um amparo, uma esperança e uma prova da tua misericórdia. Faze, enfim, que eu encontre neles a força que me falta nas provas da vida e, para resistir às sugestões do mal, a fé que salva e o amor que consola.",
        ],
      },
      {
        type: "item",
        n: 14,
        paragraphs: [
          "(Outra.) Espíritos bem-amados, anjos da guarda, vós a quem Deus, pela sua infinita misericórdia, permite que veleis sobre os homens, sede nossos protetores nas provações da vida terrena. Dai-nos força, coragem e resignação; inspirai-nos tudo que é bom, detende-nos no declive do mal; que a vossa doce influência penetre nossa alma; fazei que sintamos como se um amigo devotado estivesse aqui, ao nosso lado, vendo os nossos sentimentos e partilhando das nossas alegrias. E tu, meu bom anjo, não me abandones. Necessito de toda a tua proteção para suportar com fé e amor as provas que Deus haja por bem enviar-me.",
        ],
      },
      {
        type: "item",
        n: 32,
        paragraphs: [
          "(Outra.) Sinto, ó meu Deus, necessidade de te pedir que me dês forças para suportar as provações que quiseste enviar-me. Permite que a luz se faça bastante viva em meu espírito, para que eu aprecie toda a extensão de um amor que me aflige porque me quer salvar. Submeto-me resignado, ó meu Deus, mas a criatura é tão fraca, que temo sucumbir, se não me amparares. Não me abandones, Senhor, pois sem ti nada posso.",
        ],
      },
      {
        type: "item",
        n: 33,
        paragraphs: [
          "(Outra.) Elevei meu olhar a ti, ó Eterno, e me senti fortalecido. És a minha força, não me abandones. Ó meu Deus, sinto-me esmagado sob o peso das minhas iniquidades. Ajuda-me. Conheces as fraquezas da minha carne, não desvies de mim o teu olhar! Ardente sede me devora; faze brotar a fonte da água viva onde eu possa matar minha sede. Que a minha boca só se abra para te entoar louvores, e não para me queixar das aflições da vida. Sou fraco, Senhor, mas o teu amor me sustentará. Ó Eterno, só Tu és grande, só Tu és o fim e o objetivo da minha vida. Bendito seja o teu nome, se me fazes sofrer, porque és o Senhor e eu o servo infiel. Curvarei a fronte sem me queixar, porque só Tu és grande, só Tu és a meta.",
        ],
      },
      {
        type: "item",
        n: 55,
        paragraphs: [
          "(Outra.) Meu Deus, confiaste a mim a sorte de um dos teus Espíritos; faze, Senhor, que eu seja digno da tarefa que me impuseste. Concede-me a tua proteção. Ilumina a minha inteligência a fim de que eu possa perceber desde cedo as tendências daquele que me cabe preparar para entrar na tua paz.",
        ],
      },
      {
        type: "item",
        n: 56,
        paragraphs: [
          "(Outra.) Deus de bondade, já que permitiste ao Espírito desta criança vir sofrer novamente as provas terrenas, destinadas a fazê-lo progredir, dá-lhe a luz, a fim de que aprenda a conhecer-te, amar-te e adorar-te. Faze, pela tua onipotência, que esta alma se regenere na fonte das tuas divinas instruções; que, sob o amparo do seu anjo da guarda, a sua inteligência cresça e se desenvolva, inspirando-lhe o desejo de aproximar-se cada vez mais de ti; que a ciência do Espiritismo seja a luz brilhante que o ilumine através das dificuldades da vida; que ele, enfim, saiba apreciar toda a extensão do teu amor, que nos experimenta para purificar-nos. Senhor, lança um olhar paternal sobre a família à qual confiaste esta alma, para que ela compreenda a importância da sua missão e faça que germinem nesta criança as boas sementes, até o dia em que ela possa, por suas próprias aspirações, elevar-se sozinha para ti. Digna-te, ó meu Deus, atender esta humilde prece, em nome e pelos méritos daquele que disse: “Deixai que venham a mim as criancinhas, porque o Reino dos céus é para os que se assemelham a elas”.",
        ],
      },
      {
        type: "item",
        n: 66,
        paragraphs: [
          "(Outra.) Nós te pedimos, Senhor, que espalhes as graças do teu amor e da tua misericórdia por todos os que sofrem, quer no Espaço como Espíritos errantes, quer entre nós como encarnados. Tem piedade das nossas fraquezas. Tu nos fizeste falíveis, mas nos deste a força para resistir ao mal e vencê-lo. Que a tua misericórdia se estenda sobre todos os que não foram capazes de resistir aos maus pendores e que ainda se deixam arrastar por maus caminhos. Que os Espíritos bons os cerquem; que a tua luz brilhe aos olhos deles e que, atraídos pelo calor vivificante, venham prosternar-se a teus pés, humildes, arrependidos e submissos. Nós também te pedimos, Pai de misericórdia, por aqueles irmãos nossos que não tiveram forças para suportar suas provas terrenas. Tu, Senhor, nos deste um fardo a carregar e não devemos depô-lo senão a teus pés. Grande, porém, é a nossa fraqueza e a coragem nos falta algumas vezes no curso da jornada. Compadece-te desses servos indolentes, que abandonaram a obra antes da hora. Que a tua justiça os poupe; permite que os Espíritos bons lhes levem alívio, consolações e esperanças no futuro. A perspectiva do perdão fortalece a alma; mostra-a, Senhor, aos culpados que desesperam e, sustentados por essa esperança, eles haurirão forças na própria grandeza de suas faltas e de seus sofrimentos, a fim de resgatarem o passado e se prepararem para a conquista do futuro.",
        ],
      },
    ];
    // Inserir cada item faltante na posição correta (antes do próximo item maior).
    for (const item of missing) {
      cleaned = insertItemBefore(cleaned, item, item.n + 1);
    }
    return cleaned;
  },
};

export const applyContentFixes = (slug: string, nodes: ChapterNode[]): ChapterNode[] => {
  const fix = FIXERS[slug];
  return fix ? fix(nodes) : nodes;
};

/** Lista de capítulos que receberam correção automática (para mostrar no UI). */
export const FIXED_CHAPTERS: Record<string, string> = {
  "capitulo-4":
    "Removido fragmento de nota de rodapé que aparecia como “item 14” duplicado e inserido o item 3 (faltante no PDF original), confrontado com a edição CEI/FEB (Bezerra, 2018).",
  "capitulo-20":
    "Removida referência cruzada que aparecia como “item 16” fora de ordem.",
  "capitulo-28":
    "Removida legenda que aparecia como “item 2” duplicado e inseridas as preces 7, 13, 14, 32, 33, 55, 56 e 66 (faltantes no PDF original), confrontadas com a edição CEI/FEB (Bezerra, 2018).",
};
