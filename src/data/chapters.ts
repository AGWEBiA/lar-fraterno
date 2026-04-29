// Capítulos iniciais de "O Evangelho Segundo o Espiritismo" — Allan Kardec
// Domínio público. Selecionamos trechos representativos para leitura sequencial.

export interface Chapter {
  slug: string;
  number: number;
  title: string;
  subtitle?: string;
  summary: string;
  paragraphs: string[];
}

export const chapters: Chapter[] = [
  {
    slug: "introducao",
    number: 0,
    title: "Introdução",
    subtitle: "O propósito desta obra",
    summary:
      "Kardec apresenta a finalidade do livro: explicar a parte moral dos ensinos de Jesus à luz do Espiritismo, tornando-os compreensíveis e aplicáveis à vida prática.",
    paragraphs: [
      "Podem-se dividir as matérias contidas nos Evangelhos em cinco partes: os atos comuns da vida do Cristo, os milagres, as predições, as palavras que serviram de fundamento aos dogmas da Igreja e o ensino moral. Se as quatro primeiras têm sido objeto de controvérsias, a última permaneceu sempre ao abrigo de qualquer contestação.",
      "Diante desse código divino, a própria incredulidade se inclina; é o terreno em que se podem encontrar todos os cultos, a bandeira sob a qual todos se podem abrigar, por mais diversas que sejam as suas crenças, porque jamais foi assunto de disputas religiosas.",
      "É à parte exclusivamente moral dos Evangelhos que se aplica o presente trabalho, parte essa que ninguém jamais contestou. Nesse código de moral celeste, todos se podem encontrar; nele encontram os homens a regra de conduta concernente a todas as circunstâncias da vida, mais privadas e mais íntimas, princípio de todas as suas relações sociais, fundadas na mais rigorosa justiça.",
    ],
  },
  {
    slug: "cap-1-eu-nao-vim-destruir-a-lei",
    number: 1,
    title: "Não vim destruir a lei",
    subtitle: "Capítulo I",
    summary:
      "Jesus veio cumprir a lei dos profetas, dando-lhe sentido espiritual. O Espiritismo continua essa obra, esclarecendo as verdades reveladas.",
    paragraphs: [
      "Não julgueis que vim destruir a lei ou os profetas; não vim destrui-los, mas cumpri-los. Em verdade vos digo, que o céu e a terra não passarão sem que se cumpra tudo o que está na lei, até um só jota e um só til.",
      "Há duas partes distintas na lei mosaica: a lei de Deus, promulgada no monte Sinai, e a lei civil ou disciplinar, decretada por Moisés. Uma é invariável; a outra, apropriada aos costumes e ao caráter do povo, modifica-se com o tempo.",
      "A lei de Deus é formulada por Moisés nos dez mandamentos do Decálogo. Essa lei é de todos os tempos e de todos os países, e por isso tem caráter divino. Todas as outras são leis decretadas pelo próprio Moisés, obrigado a conter, pelo temor, um povo naturalmente turbulento e indisciplinado.",
      "Jesus repele a parte da lei antiga que era apenas humana; conserva e desenvolve a parte da lei divina, dando-lhe o seu verdadeiro sentido. Quanto às leis civis, modifica-as profundamente, tanto na sua aplicação quanto no seu espírito.",
    ],
  },
  {
    slug: "cap-2-meu-reino-nao-e-deste-mundo",
    number: 2,
    title: "Meu reino não é deste mundo",
    subtitle: "Capítulo II",
    summary:
      "O reino prometido por Jesus é espiritual. A felicidade verdadeira não está nos bens materiais, mas na elevação da alma.",
    paragraphs: [
      "Respondeu Jesus: O meu reino não é deste mundo; se o meu reino fosse deste mundo, lutariam os meus servos, para que eu não fosse entregue aos judeus; mas, agora, o meu reino não é daqui.",
      "Por essas palavras, Jesus designa claramente a vida espiritual; pois o reino do mundo é o reino dos corpos, ao passo que o reino do céu é o dos Espíritos. O Cristo, descendo à Terra para cumprir a missão que lhe foi confiada, vinha ensinar aos homens que existe outra vida além desta efêmera, vida de felicidade ou de infortúnio, segundo os méritos de cada um.",
      "Essa vida futura, que os homens devem buscar com toda a sua alma, é o objetivo verdadeiro de nossa existência. Os bens deste mundo são passageiros; os do reino dos céus são eternos.",
    ],
  },
  {
    slug: "cap-3-ha-muitas-moradas-na-casa-de-meu-pai",
    number: 3,
    title: "Há muitas moradas na casa de meu Pai",
    subtitle: "Capítulo III",
    summary:
      "Os mundos são habitados por seres em diferentes graus de evolução. A pluralidade dos mundos é uma das grandes verdades reveladas.",
    paragraphs: [
      "Na casa de meu Pai há muitas moradas; se assim não fora, eu vo-lo teria dito: vou preparar-vos o lugar.",
      "A casa do Pai é o Universo; as diferentes moradas são os mundos que circulam no espaço infinito, e oferecem aos Espíritos que neles encarnam moradas correspondentes ao seu adiantamento.",
      "Independentemente da diversidade dos mundos, essas palavras de Jesus podem ainda ser entendidas com referência ao estado feliz ou infeliz do Espírito na erraticidade. Conforme está mais ou menos depurado e desprendido das ligações materiais, conforme o grau de seu adiantamento, o ambiente em que se acha o Espírito errante difere essencialmente, tanto pelo aspecto das coisas quanto pelas sensações que experimenta.",
    ],
  },
  {
    slug: "cap-5-bem-aventurados-os-aflitos",
    number: 5,
    title: "Bem-aventurados os aflitos",
    subtitle: "Capítulo V — A justiça das aflições",
    summary:
      "As aflições da vida têm causa e propósito: provas escolhidas pelo próprio Espírito antes de encarnar, expiações de faltas passadas, ou meios de evolução.",
    paragraphs: [
      "Bem-aventurados os aflitos, porque serão consolados! Bem-aventurados os que têm fome e sede de justiça, porque serão saciados! Bem-aventurados os misericordiosos, porque alcançarão misericórdia! Bem-aventurados os puros de coração, porque verão a Deus!",
      "Em todos os tempos, esta questão tem sido formulada: por que existem na Terra tantos sofrimentos? Por que sofre o homem de bem, vendo prosperar o mau? Os incrédulos não deixam de tomar essa aparente injustiça por argumento contra a Providência. Não querem compreender, no entanto, que, sendo a vida material apenas uma fração mui pequena de nossa existência espiritual, não se pode julgar do conjunto pelo que vemos nesse curtíssimo espaço de tempo.",
      "Toda aflição tem sua razão de ser, e Deus nada inflige sem motivo justo. Em todos os casos, é sempre o atingido que tirará o proveito, seja como expiação do passado, seja como prova para o presente, seja como meio de adquirir, para o futuro, conhecimento e força.",
      "Diante das aflições, em vez de te revoltares, agradece a Deus, que te dá ocasião de provar a tua fé e de adquirires méritos para a vida eterna. Coragem, pois! Toda dor suportada com resignação é um passo dado na via do progresso.",
    ],
  },
];

export const chapterBySlug = (slug: string) => chapters.find((c) => c.slug === slug);
