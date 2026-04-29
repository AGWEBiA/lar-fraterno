// Gera um PDF A4 com o roteiro completo da reunião:
// prece inicial, leitura (texto integral dos itens selecionados),
// comentários-guia, vibrações, prece final, com espaço para anotações à mão.
import jsPDF from "jspdf";
import type { Chapter } from "@/data/chapters";
import type { MeetingGuide } from "@/data/meeting-guide-template";

interface ExportArgs {
  chapter: Chapter;
  guide: MeetingGuide;
  selectedItems: number[]; // vazio = todos
  date?: Date;
  participants?: string[];
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 18;
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 18;

export const exportRoteiroPdf = ({
  chapter,
  guide,
  selectedItems,
  date = new Date(),
  participants = [],
}: ExportArgs) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_TOP;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN_BOTTOM) {
      doc.addPage();
      y = MARGIN_TOP;
    }
  };

  const writeLines = (
    text: string,
    opts: { size?: number; style?: "normal" | "bold" | "italic"; lh?: number; color?: [number, number, number] } = {},
  ) => {
    const size = opts.size ?? 11;
    const style = opts.style ?? "normal";
    const lh = opts.lh ?? size * 0.45 + 1.5;
    doc.setFont("times", style);
    doc.setFontSize(size);
    if (opts.color) doc.setTextColor(...opts.color);
    else doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(text, PAGE_W - MARGIN_X * 2);
    for (const line of lines) {
      ensureSpace(lh);
      doc.text(line, MARGIN_X, y);
      y += lh;
    }
  };

  const sectionTitle = (label: string) => {
    ensureSpace(14);
    y += 4;
    doc.setDrawColor(180, 150, 80);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 6;
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(80, 60, 20);
    doc.text(label.toUpperCase(), MARGIN_X, y);
    y += 6;
  };

  const blankLines = (n: number) => {
    const lh = 7;
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    for (let i = 0; i < n; i++) {
      ensureSpace(lh);
      doc.line(MARGIN_X, y + 4, PAGE_W - MARGIN_X, y + 4);
      y += lh;
    }
  };

  // === Header ===
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(60, 40, 10);
  doc.text("Evangelho no Lar", PAGE_W / 2, y + 4, { align: "center" });
  y += 10;

  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `${chapter.subtitle ?? ""} — ${chapter.title}`.trim(),
    PAGE_W / 2,
    y + 4,
    { align: "center" },
  );
  y += 7;

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  const dateStr = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(dateStr, PAGE_W / 2, y + 4, { align: "center" });
  y += 6;

  if (participants.length) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Participantes: ${participants.join(", ")}`, PAGE_W / 2, y + 4, { align: "center" });
    y += 5;
  }
  y += 4;

  // === Prece inicial ===
  sectionTitle("Prece Inicial");
  writeLines(guide.opening_prayer, { style: "italic", size: 11 });

  // === Leitura ===
  sectionTitle("Leitura do Evangelho");
  writeLines(guide.reading_intro, { style: "italic", color: [110, 90, 50] });
  y += 2;

  const items = chapter.nodes.filter(
    (n): n is Extract<typeof chapter.nodes[number], { type: "item" }> => n.type === "item",
  );
  const filtered =
    selectedItems.length > 0
      ? items.filter((i) => selectedItems.includes(i.n))
      : items;

  for (const item of filtered) {
    ensureSpace(10);
    y += 2;
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(60, 40, 10);
    doc.text(`${item.n}.`, MARGIN_X, y);
    y += 5;
    for (const p of item.paragraphs) {
      writeLines(p, { size: 11 });
    }
  }

  // === Comentários ===
  sectionTitle("Comentários e Reflexão");
  for (const c of guide.commentary_points) {
    writeLines(c.title, { style: "bold", size: 11 });
    writeLines(c.text, { size: 11 });
    y += 1;
  }
  if (guide.reflection_questions.length) {
    y += 2;
    writeLines("Perguntas para reflexão:", { style: "bold", size: 11 });
    for (const q of guide.reflection_questions) {
      writeLines(`• ${q}`, { size: 11 });
    }
  }

  // === Vibrações ===
  sectionTitle("Vibrações");
  writeLines(guide.vibrations_focus, { style: "italic", size: 11 });

  // === Prece final ===
  sectionTitle("Prece Final");
  writeLines(guide.closing_prayer, { style: "italic", size: 11 });

  // === Anotações ===
  doc.addPage();
  y = MARGIN_TOP;
  sectionTitle("Anotações da Reunião");
  blankLines(28);

  // === Footer (todas as páginas) ===
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Evangelho Segundo o Espiritismo — Allan Kardec",
      MARGIN_X,
      PAGE_H - 8,
    );
    doc.text(`${i} / ${total}`, PAGE_W - MARGIN_X, PAGE_H - 8, { align: "right" });
  }

  const filename = `roteiro-${chapter.slug}-${date.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};
