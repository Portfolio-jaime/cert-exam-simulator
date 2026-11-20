import { certificateEligible } from '../exam/scoring';
import { DOMAINS, DOMAIN_LABEL, MODE_LABEL, PASS_SCALED, type Attempt } from '../types';

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

export async function buildPdf(a: Attempt, name: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const cert = certificateEligible(a);
  const who = name.trim() || 'Candidato';
  const id = certificateId(a, who);
  const date = new Date(a.finishedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  doc.setDrawColor(40, 60, 90);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, W - 16, 194);
  doc.setLineWidth(0.3);
  doc.rect(11, 11, W - 22, 188);

  doc.setTextColor(30, 45, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text(cert ? 'Certificado de práctica' : 'Informe de resultados', W / 2, 32, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Simulacro de práctica de Solutions Architect Associate (SAA-C03)', W / 2, 41, { align: 'center' });

  doc.setFontSize(12);
  doc.text(cert ? 'Se otorga a' : 'Candidato', W / 2, 56, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(who, W / 2, 67, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(
    cert
      ? 'por superar el simulacro completo con el puntaje estimado indicado.'
      : `Resultado del intento: ${a.result.passed ? 'por encima' : 'por debajo'} del umbral de ${PASS_SCALED}.`,
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
    `Puntaje estimado · ${a.result.correct} de ${a.result.total} correctas (${a.result.pct} %) · umbral ${PASS_SCALED}`,
    W / 2,
    100,
    { align: 'center' },
  );

  // Domain table
  let y = 114;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Dominio', 50, y);
  doc.text('Correctas', 200, y, { align: 'right' });
  doc.text('Nota', 240, y, { align: 'right' });
  doc.setLineWidth(0.2);
  doc.line(50, y + 2, 247, y + 2);
  doc.setFont('helvetica', 'normal');
  for (const d of DOMAINS) {
    y += 8;
    const r = a.result.byDomain[d];
    doc.text(DOMAIN_LABEL[d], 50, y);
    doc.text(`${r.correct} / ${r.total}`, 200, y, { align: 'right' });
    doc.text(`${r.pct} %`, 240, y, { align: 'right' });
  }

  doc.setFontSize(10);
  doc.text(
    `${MODE_LABEL[a.mode]} · ${date} · duración ${fmtDuration(a.durationSec)} de ${Math.round(a.limitSec / 60)} min${a.autoSubmitted ? ' · entrega automática' : ''}`,
    W / 2,
    163,
    { align: 'center' },
  );
  doc.text(`ID ${id}`, W / 2, 170, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(
    'Documento de práctica personal. No es una certificación ni un resultado oficial de AWS; el puntaje es una estimación.',
    W / 2,
    188,
    { align: 'center' },
  );
  return doc.output('blob');
}

export async function downloadPdf(a: Attempt, name: string): Promise<void> {
  const blob = await buildPdf(a, name);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${certificateEligible(a) ? 'certificado' : 'informe'}-saa-${certificateId(a, name.trim() || 'Candidato')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
