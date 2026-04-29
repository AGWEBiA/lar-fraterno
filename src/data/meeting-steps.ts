export interface MeetingStep {
  id: string;
  title: string;
  duration: string;
  description: string;
  guidance: string;
}

export const meetingSteps: MeetingStep[] = [
  {
    id: "preparacao",
    title: "Preparação do Ambiente",
    duration: "2 min",
    description: "Tranquilidade, água ao centro, harmonia interior.",
    guidance:
      "Reúna a família em um ambiente tranquilo. Coloque um copo ou jarra de água ao centro da mesa para fluidificação. Respire profundamente algumas vezes e procure aquietar os pensamentos.",
  },
  {
    id: "prece-inicial",
    title: "Prece Inicial",
    duration: "2 min",
    description: "Simples e espontânea — pode ser o Pai Nosso.",
    guidance:
      "Faça uma prece breve e sincera, pedindo a presença e a proteção dos bons Espíritos. O Pai Nosso é uma escolha simples e profunda. Fale do coração.",
  },
  {
    id: "leitura",
    title: "Leitura do Evangelho",
    duration: "5–10 min",
    description: "Estudo sequencial do Evangelho Segundo o Espiritismo.",
    guidance:
      "Leia em sequência um trecho de O Evangelho Segundo o Espiritismo. Sem pressa. Você pode acompanhar pela leitura em áudio do app.",
  },
  {
    id: "comentarios",
    title: "Comentários e Reflexão",
    duration: "5–10 min",
    description: "Reflexões breves, focadas na aplicação pessoal.",
    guidance:
      "Compartilhem reflexões breves sobre a mensagem lida. Foco na aplicação pessoal, não em debates. Como esse ensinamento se aplica à minha vida hoje?",
  },
  {
    id: "vibracoes",
    title: "Vibrações de Amor",
    duration: "3 min",
    description: "Pensamentos de amor, paz e saúde.",
    guidance:
      "Em silêncio, irradiem pensamentos de amor, paz e saúde para o lar, familiares, amigos, desafetos, enfermos e a humanidade. Sintam o coração em paz.",
  },
  {
    id: "prece-final",
    title: "Prece de Encerramento",
    duration: "2 min",
    description: "Agradecimento e pedido de proteção.",
    guidance:
      "Encerre com uma prece de gratidão pela presença dos bons Espíritos e peça proteção para o lar. A água fluidificada pode ser tomada nos próximos dias como auxílio espiritual.",
  },
];
