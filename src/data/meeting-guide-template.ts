// Roteiro fixo de reunião — sem IA.
// Preces baseadas na tradição espírita (estilo livre, em prosa simples).
// Comentários e perguntas são genéricos e servem para qualquer capítulo,
// personalizados apenas pelo título e resumo do capítulo.

import type { Chapter } from "./chapters";

export interface MeetingGuide {
  opening_prayer: string;
  reading_intro: string;
  commentary_points: { title: string; text: string }[];
  reflection_questions: string[];
  vibrations_focus: string;
  closing_prayer: string;
}

const OPENING_PRAYER = `Pai de infinita bondade, agradecemos a oportunidade de nos reunirmos em Teu nome.
Pedimos a presença dos bons Espíritos, que nos amparem com sua luz e nos inspirem pensamentos elevados.
Que esta hora de estudo e oração fortaleça nossos corações e renove a paz em nosso lar.
Em nome de Jesus, assim seja.`;

const VIBRATIONS_FOCUS = `Dirijamos pensamentos de amor e paz aos familiares presentes e ausentes,
aos amigos e desafetos, aos enfermos do corpo e da alma, aos que sofrem em qualquer parte da Terra.
Que a luz do Cristo alcance a todos e desperte em cada coração o desejo do bem.`;

const CLOSING_PRAYER = `Senhor, agradecemos pela paz desta reunião e pela presença amorosa dos bons Espíritos.
Que os ensinamentos meditados se transformem em ação no nosso dia a dia.
Abençoa este lar, nossas famílias e todos os que precisam de amparo.
Em nome de Jesus, agradecemos. Assim seja.`;

const COMMENTARY_POINTS = [
  {
    title: "O que a mensagem nos ensina",
    text: "Buscar o sentido essencial do trecho lido, sem se prender ao literal. Como ele se relaciona com o ensino maior do Cristo: amar a Deus sobre todas as coisas e ao próximo como a si mesmo?",
  },
  {
    title: "Aplicação na vida diária",
    text: "De que forma posso colocar em prática esta lição hoje, em casa, no trabalho, no convívio com as pessoas? Pequenos gestos repetidos transformam o caráter mais do que grandes propósitos isolados.",
  },
  {
    title: "Espelho de si mesmo",
    text: "Em que pontos eu já vivo este ensinamento e em que pontos ainda preciso crescer? A reforma íntima começa por reconhecer, sem culpa, onde estamos hoje.",
  },
  {
    title: "Caridade silenciosa",
    text: "Lembrar que a melhor forma de testemunhar o Evangelho é o exemplo. Falar pouco e fazer muito — sobretudo no próprio lar, onde nossas máscaras caem.",
  },
];

const REFLECTION_QUESTIONS = [
  "Em que momento da minha semana esta mensagem poderia ter mudado algo?",
  "Há alguém com quem preciso exercitar mais paciência ou perdão?",
  "Que pequeno compromisso posso assumir até a próxima reunião?",
];

export const buildGuide = (chapter: Pick<Chapter, "title" | "summary">): MeetingGuide => ({
  opening_prayer: OPENING_PRAYER,
  reading_intro: chapter.summary
    ? `Hoje meditaremos sobre "${chapter.title}". ${chapter.summary}`
    : `Hoje meditaremos sobre "${chapter.title}".`,
  commentary_points: COMMENTARY_POINTS,
  reflection_questions: REFLECTION_QUESTIONS,
  vibrations_focus: VIBRATIONS_FOCUS,
  closing_prayer: CLOSING_PRAYER,
});
