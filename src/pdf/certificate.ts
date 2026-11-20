import { certificateEligible } from '../exam/scoring';
import type { ExamDef } from '../exams';
import { tr, type Lang } from '../i18n';
import { MODE_LABEL, type Attempt } from '../types';

/** 8 hex chars derived from attempt data; lets a printed report be matched to its attempt. */
export function certificateId(a: Attempt, name: string): string {
  const src = `${a.id}|${name}|${a.finishedAt}|${a.result.scaled}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, '0');
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m} min ${String(sec % 60).padStart(2, '0')} s`;
}

export async function buildPdf(a: Attempt, name: string, exam: ExamDef, lang: Lang = 'es'): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const cert = certificateEligible(a);
  const who = name.trim() || tr(lang, 'Candidato', 'Candidate');
  const id = certificateId(a, who);
  const date = new Date(a.finishedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  doc.setDrawColor(40, 60, 90);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, W - 16, 194);
  doc.setLineWidth(0.3);
  doc.rect(11, 11, W - 22, 188);

  doc.setTextColor(30, 45, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(cert ? tr(lang, 'Certificado de práctica', 'Certificate of practice') : tr(lang, 'Informe de resultados', 'Results report'), W / 2, 32, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`${tr(lang, 'Simulacro de práctica', 'Practice simulation')}: ${exam.name} (${exam.code})`, W / 2, 41, { align: 'center' });

  doc.setFontSize(12);
  doc.text(cert ? tr(lang, 'Se otorga a', 'Awarded to') : tr(lang, 'Candidato', 'Candidate'), W / 2, 56, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(who, W / 2, 67, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(
    cert
      ? tr(lang, 'por superar el simulacro completo con el puntaje estimado indicado.', 'for passing the full simulation with the estimated score shown.')
      : tr(lang, `Resultado del intento: ${a.result.passed ? 'por encima' : 'por debajo'} del umbral de ${exam.passScaled}.`, `Attempt result: ${a.result.passed ? 'above' : 'below'} the ${exam.passScaled} threshold.`),
    W / 2,
    76,
    { align: 'center' },
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(34);
  doc.text(`${a.result.scaled} / 1000`, W / 2, 93, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(
    tr(lang, `Puntaje estimado · ${a.result.correct} de ${a.result.total} correctas (${a.result.pct} %) · umbral ${exam.passScaled}`, `Estimated score · ${a.result.correct} of ${a.result.total} correct (${a.result.pct}%) · threshold ${exam.passScaled}`),
    W / 2,
    100,
    { align: 'center' },
  );

  // Domain table
  let y = 114;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(tr(lang, 'Dominio', 'Domain'), 50, y);
  doc.text(tr(lang, 'Correctas', 'Correct'), 200, y, { align: 'right' });
  doc.text(tr(lang, 'Nota', 'Score'), 240, y, { align: 'right' });
  doc.setLineWidth(0.2);
  doc.line(50, y + 2, 247, y + 2);
  doc.setFont('helvetica', 'normal');
  y -= 0;
  const rowGap = exam.domains.length > 4 ? 7 : 8;
  for (const d of exam.domains) {
    y += rowGap;
    const r = a.result.byDomain[d.id] ?? { correct: 0, total: 0, pct: 0 };
    doc.text(d.label, 50, y);
    doc.text(`${r.correct} / ${r.total}`, 200, y, { align: 'right' });
    doc.text(`${r.pct} %`, 240, y, { align: 'right' });
  }

  doc.setFontSize(10);
  doc.text(
    tr(lang, `${MODE_LABEL[a.mode]} · ${date} · duración ${fmtDuration(a.durationSec)} de ${Math.round(a.limitSec / 60)} min${a.autoSubmitted ? ' · entrega automática' : ''}`, `${MODE_LABEL[a.mode]} · ${date} · duration ${fmtDuration(a.durationSec)} of ${Math.round(a.limitSec / 60)} min${a.autoSubmitted ? ' · auto-submitted' : ''}`),
    W / 2,
    163,
    { align: 'center' },
  );
  doc.text(`ID ${id}`, W / 2, 170, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(
    tr(lang, exam.disclaimer, 'Personal practice document. It is not a certification or an official result; the score is an estimate.'),
    W / 2,
    188,
    { align: 'center' },
  );
  return doc.output('blob');
}

export async function downloadPdf(a: Attempt, name: string, exam: ExamDef, lang: Lang = 'es'): Promise<void> {
  const blob = await buildPdf(a, name, exam, lang);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${certificateEligible(a) ? 'certificate' : 'report'}-${exam.id}-${certificateId(a, name.trim() || 'candidate')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
