import { ALL_QUESTIONS, BANK_MAP, bankFor } from '../bank';
import { ExamSession, modeConfig } from '../exam/engine';
import { buildExam } from '../exam/sampler';
import { certificateEligible, isCorrect } from '../exam/scoring';
import { daysUntil, EXAMS, examById, type ExamDef } from '../exams';
import { scenarioView, tr, view, type Lang } from '../i18n';
import { downloadPdf } from '../pdf/certificate';
import { PLANS, RESOURCES } from '../plans';
import { Store } from '../store';
import type { Attempt, Mode, Question } from '../types';
import { fmtClock, h, mount } from './dom';

const store = new Store();
const root = document.getElementById('app')!;
let session: ExamSession | null = null;
let timer: number | undefined;
let sub: 'q' | 'summary' = 'q';

const lang = (): Lang => store.lang();
const T = (es: string, en: string) => tr(lang(), es, en);
const cur = (): ExamDef => examById(store.exam());
const MODE_EN: Record<Mode, string> = { block: 'Block', full: 'Full simulation', domain: 'Domain practice', review: 'Missed review' };
const MODE_ES: Record<Mode, string> = { block: 'Bloque', full: 'Simulacro completo', domain: 'Práctica por dominio', review: 'Repaso de falladas' };
const modeLabel = (m: Mode) => (lang() === 'en' ? MODE_EN[m] : MODE_ES[m]);
const NUM_ES = ['', 'UNA', 'DOS', 'TRES'];
const NUM_EN = ['', 'ONE', 'TWO', 'THREE'];

function stats() {
  return store.stats((a, id) => {
    const q = BANK_MAP.get(id);
    return q ? isCorrect(q, a.answers[id]) : false;
  });
}

function stopTimer() {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
}

const go = (hash: string) => {
  if (location.hash === hash) route();
  else location.hash = hash;
};

export function route(): void {
  const [, page = '', arg = ''] = location.hash.replace(/^#/, '').split('/');
  if (page !== 'exam') stopTimer();
  switch (page) {
    case 'exam': return renderExam();
    case 'results': return renderResults(arg);
    case 'review': return renderReview(arg);
    case 'history': return renderHistory();
    case 'plan': return renderPlan();
    default: return renderHome();
  }
}

/* ------------------------------ shared bits ------------------------------ */

function langSwitch(): HTMLElement {
  const btn = (l: Lang) => h('button', { class: lang() === l ? 'primary' : '', onclick: () => { store.setLang(l); route(); } }, l.toUpperCase());
  return h('div', { class: 'row' }, btn('es'), btn('en'));
}

function questionBody(q: Question, exam: ExamDef): Node[] {
  const sc = scenarioView(exam, q.scenario, lang());
  return sc ? [h('div', { class: 'scenario' }, h('strong', {}, `${T('Escenario', 'Scenario')}: ${sc.title}`), h('p', { class: 'small' }, sc.text))] : [];
}

/* -------------------------------- home -------------------------------- */

function renderHome(): void {
  const exam = cur();
  const bank = bankFor(exam.id);
  const st = stats();
  const saved = store.loadSession();
  const days = daysUntil(exam.date);
  const history = store.history().filter((a) => a.exam === exam.id);
  const nameInput = h('input', { type: 'text', placeholder: T('Tu nombre completo (aparecerá en el PDF)', 'Your full name (it will appear on the PDF)'), value: store.name(), maxLength: 60 });
  nameInput.oninput = () => store.setName(nameInput.value);
  const domainSel = h('select', {}, ...exam.domains.map((d) => h('option', { value: d.id }, `${d.label} (${bank.filter((q) => q.domain === d.id).length})`)));
  const failedHere = [...st.failed].filter((id) => BANK_MAP.get(id) && bank.includes(BANK_MAP.get(id)!)).length;

  const tabs = h('div', { class: 'row' }, ...EXAMS.map((e) =>
    h('button', { class: e.id === exam.id ? 'primary' : '', onclick: () => { store.setExam(e.id); renderHome(); } }, e.short)));

  const modeCard = (mode: Mode, desc: string, extra?: Node, disabled = false) =>
    h('div', { class: 'card' }, h('h3', {}, modeLabel(mode)), h('p', { class: 'muted small' }, desc), extra,
      h('button', { class: 'primary', disabled: disabled || bank.length === 0, onclick: () => startExam(mode, mode === 'domain' ? domainSel.value : undefined) }, T('Empezar', 'Start')));

  // Readiness per domain, from this exam's attempts.
  const agg = Object.fromEntries(exam.domains.map((d) => [d.id, { c: 0, t: 0 }]));
  for (const a of history) for (const d of exam.domains) { const r = a.result.byDomain[d.id]; if (r) { agg[d.id].c += r.correct; agg[d.id].t += r.total; } }

  const countdown = days > 0 ? T(`Faltan ${days} día${days === 1 ? '' : 's'}`, `${days} day${days === 1 ? '' : 's'} to go`) : days === 0 ? T('¡Hoy es el examen!', 'Exam day is today!') : T('Fecha pasada', 'Date passed');
  const recent = history.slice(-5).reverse();

  mount(root,
    h('div', { class: 'row spread' }, h('h1', {}, 'Cert Exam Simulator'), langSwitch()),
    tabs,
    h('div', { class: 'card' },
      h('div', { class: 'row spread' }, h('div', {}, h('strong', {}, exam.name), h('div', { class: 'muted small' }, `${exam.code} · ${exam.date} · ${countdown}`)),
        h('button', { onclick: () => go('#/plan') }, T('Plan de estudio', 'Study plan'))),
      h('p', { class: 'muted small' }, T(`Banco: ${bank.length} preguntas · aprueba con ≥ ${exam.passScaled} (estimado) · selección múltiple todo-o-nada`, `Bank: ${bank.length} questions · pass at ≥ ${exam.passScaled} (estimated) · multi-select is all-or-nothing`)),
      exam.id === 'saa' && lang() === 'en' && h('p', { class: 'small', style: 'color:var(--warn)' }, 'The AWS question bank is currently in Spanish only.')),
    saved && h('div', { class: 'card banner' }, h('strong', {}, T('Tienes un intento en curso', 'You have an attempt in progress')),
      h('p', { class: 'muted small' }, `${modeLabel(saved.mode)} · ${Object.keys(saved.answers).length}/${saved.items.length}`),
      h('div', { class: 'row' }, h('button', { class: 'primary', onclick: resumeExam }, T('Continuar', 'Resume')),
        h('button', { class: 'danger', onclick: () => { store.clearSession(); renderHome(); } }, T('Descartar', 'Discard')))),
    h('div', { class: 'card' }, nameInput),
    h('div', { class: 'grid' },
      modeCard('block', T(`${exam.block.size} preguntas · ${exam.block.limitSec / 60} min · sin feedback hasta entregar.`, `${exam.block.size} questions · ${exam.block.limitSec / 60} min · no feedback until you submit.`)),
      modeCard('full', exam.full.scenarioCount
        ? T(`${exam.full.size} preguntas · ${exam.full.scenarioCount} escenarios al azar de ${exam.scenarios?.length} · ${exam.full.limitSec / 60} min. Emite certificado si apruebas.`, `${exam.full.size} questions · ${exam.full.scenarioCount} random scenarios out of ${exam.scenarios?.length} · ${exam.full.limitSec / 60} min. Certificate if you pass.`)
        : T(`${exam.full.size} preguntas (${exam.full.size - exam.full.unscored} puntuadas + ${exam.full.unscored} sin puntuar) · ${exam.full.limitSec / 60} min. Emite certificado si apruebas.`, `${exam.full.size} questions (${exam.full.size - exam.full.unscored} scored + ${exam.full.unscored} unscored) · ${exam.full.limitSec / 60} min. Certificate if you pass.`),
        bank.length < exam.full.size ? h('p', { class: 'small', style: 'color:var(--warn)' }, T(`El banco tiene ${bank.length}; el simulacro usará todas.`, `The bank has ${bank.length}; the simulation will use them all.`)) : undefined),
      modeCard('domain', T('Preguntas de un solo dominio.', 'Questions from a single domain.'), domainSel),
      modeCard('review', T(`Solo las que fallaste (${failedHere}).`, `Only the ones you missed (${failedHere}).`), undefined, failedHere === 0)),
    history.length > 0 && h('div', { class: 'card' }, h('h3', {}, T('Preparación por dominio', 'Readiness by domain')),
      ...exam.domains.map((d) => { const x = agg[d.id]; const pct = x.t ? Math.round((x.c / x.t) * 100) : 0; return h('div', { style: 'margin:8px 0' },
        h('div', { class: 'row spread small' }, h('span', {}, d.label), h('span', {}, x.t ? `${pct} %` : '—')),
        h('div', { class: `bar${x.t && pct < 70 ? ' weak' : ''}` }, h('i', { style: `width:${pct}%` }))); })),
    h('div', { class: 'card' },
      h('div', { class: 'row spread' }, h('h3', {}, T('Últimos intentos', 'Recent attempts')), h('button', { onclick: () => go('#/history') }, T('Ver historial', 'View history'))),
      recent.length === 0 ? h('p', { class: 'muted small' }, T('Aún no hay intentos.', 'No attempts yet.'))
        : h('table', {}, ...recent.map((a) => h('tr', {},
            h('td', {}, new Date(a.finishedAt).toLocaleString(lang() === 'en' ? 'en-US' : 'es-CO', { dateStyle: 'short', timeStyle: 'short' })),
            h('td', {}, modeLabel(a.mode)), h('td', { class: a.result.passed ? 'pass' : 'fail' }, `${a.result.scaled}`),
            h('td', {}, h('a', { href: `#/results/${a.id}` }, T('Detalle', 'Details'))))))));
}

/* ------------------------------- study plan ------------------------------- */

function renderPlan(): void {
  const exam = cur();
  const done = store.planDone();
  const plan = PLANS[exam.id];
  const today = new Date().toISOString().slice(0, 10);
  const all = plan.flatMap((d) => d.tasks.map((_, i) => `${exam.id}:${d.date}:${i}`));
  const nDone = all.filter((id) => done.has(id)).length;
  const days = daysUntil(exam.date);

  mount(root,
    h('div', { class: 'row spread' }, h('h1', {}, T('Plan de estudio', 'Study plan')), h('div', { class: 'row' }, langSwitch(), h('button', { onclick: () => go('#/') }, T('← Inicio', '← Home')))),
    h('div', { class: 'card' }, h('strong', {}, exam.name), h('div', { class: 'muted small' }, `${exam.code} · ${exam.date} · ${days > 0 ? T(`faltan ${days} días`, `${days} days to go`) : T('hoy / pasado', 'today / past')}`),
      h('div', { class: 'bar', style: 'margin-top:10px' }, h('i', { style: `width:${all.length ? Math.round((nDone / all.length) * 100) : 0}%` })),
      h('p', { class: 'small muted' }, T(`${nDone} de ${all.length} tareas completadas`, `${nDone} of ${all.length} tasks done`))),
    ...plan.map((d) => h('div', { class: `card${d.date === today ? ' banner' : ''}` },
      h('div', { class: 'row spread' }, h('h3', {}, `${d.date} · ${T(d.title[0], d.title[1])}`), d.date === today && h('span', { class: 'tag' }, T('Hoy', 'Today')), d.examDay && h('span', { class: 'tag multi' }, T('Examen', 'Exam'))),
      ...d.tasks.map((t, i) => { const id = `${exam.id}:${d.date}:${i}`;
        const cb = h('input', { type: 'checkbox', checked: done.has(id), onchange: () => { store.togglePlan(id); renderPlan(); } });
        return h('label', { class: 'row', style: 'margin:6px 0;cursor:pointer' }, cb, h('span', { style: done.has(id) ? 'text-decoration:line-through;opacity:.6' : '' }, T(t[0], t[1]))); }),
      d.focus && h('div', { class: 'row' }, ...d.focus.map((f) => h('span', { class: 'tag' }, exam.domains.find((x) => x.id === f)?.label ?? f))))),
    h('div', { class: 'card' }, h('h3', {}, T('Recursos', 'Resources')), ...RESOURCES[exam.id].map((r) => h('p', { class: 'small' }, h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer' }, r.label)))));
}

/* ------------------------------- exam flow ------------------------------- */

function startExam(mode: Mode, domain?: string): void {
  const exam = cur();
  const cfg = modeConfig(exam, mode);
  const bank = bankFor(exam.id);
  const { seen, failed } = stats();
  const items = buildExam({
    bank, exam, size: cfg.size, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, seen, failed, domain,
    onlyIds: mode === 'review' ? failed : undefined, unscored: cfg.unscored, byScenario: mode === 'full' && !!exam.full.scenarioCount,
  });
  if (items.length === 0) return;
  session = ExamSession.create(exam, mode, items, BANK_MAP, Date.now());
  sub = 'q';
  store.saveSession(session.state);
  go('#/exam');
}

function resumeExam(): void {
  const s = store.loadSession();
  if (!s) return;
  store.setExam(s.exam ?? 'saa');
  session = new ExamSession(s, BANK_MAP);
  sub = 'q';
  go('#/exam');
}

function submit(auto: boolean): void {
  if (!session) return;
  const a = session.finish(Date.now(), auto);
  store.saveAttempt(a);
  store.clearSession();
  stopTimer();
  session = null;
  go(`#/results/${a.id}`);
}

function renderExam(): void {
  if (!session) {
    const s = store.loadSession();
    if (!s) return go('#/');
    session = new ExamSession(s, BANK_MAP);
  }
  const s = session;
  const exam = examById(s.state.exam);
  if (s.isExpired(Date.now())) return submit(true);

  const timerEl = h('span', { class: 'timer' });
  const tick = () => {
    const left = s.remainingSec(Date.now());
    timerEl.textContent = fmtClock(left);
    timerEl.classList.toggle('low', left <= 300);
    if (left <= 0) submit(true);
  };
  stopTimer();
  tick();
  timer = window.setInterval(tick, 1000);
  const persist = () => store.saveSession(s.state);

  const navigator = () => h('div', { class: 'nav' }, ...s.state.items.map((it, i) =>
    h('button', {
      class: [s.isAnswered(i) ? 'answered' : '', s.isRevealed(i) ? 'revealed' : '', s.state.flags.includes(it.id) ? 'flagged' : '', sub === 'q' && i === s.state.index ? 'current' : ''].join(' '),
      onclick: () => { s.goto(i); sub = 'q'; persist(); renderExam(); },
    }, String(i + 1))));

  const top = (label: string) => h('div', { class: 'topbar' }, h('div', { class: 'row spread' },
    h('span', {}, label), h('span', { class: 'row' }, langSwitch(), timerEl,
      sub === 'q' && h('button', { onclick: () => { sub = 'summary'; renderExam(); } }, T('Revisar y entregar', 'Review and submit')))));

  if (sub === 'summary') {
    const n = s.length;
    const unanswered = s.state.items.filter((_, i) => !s.isAnswered(i)).length;
    const incomplete = s.state.items.filter((_, i) => s.isAnswered(i) && !s.isComplete(i)).length;
    return mount(root, top(T('Revisión', 'Review')),
      h('div', { class: 'card' }, h('h2', {}, T('Antes de entregar', 'Before you submit')),
        h('p', {}, T(`${n - unanswered} de ${n} respondidas · ${unanswered} sin responder · ${incomplete} incompletas · ${s.state.flags.length} marcadas.`, `${n - unanswered} of ${n} answered · ${unanswered} unanswered · ${incomplete} incomplete · ${s.state.flags.length} flagged.`)),
        navigator(),
        h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { onclick: () => { sub = 'q'; renderExam(); } }, T('Volver al examen', 'Back to exam')),
          h('button', { class: 'primary', onclick: () => submit(false) }, T('Entregar examen', 'Submit exam')))));
  }

  const q = s.question();
  const v = view(q, lang());
  const sel = new Set(s.state.answers[q.id] ?? []);
  const flagged = s.state.flags.includes(q.id);
  const multi = q.type === 'multi';
  const shown = s.isRevealed();
  const words = lang() === 'en' ? NUM_EN : NUM_ES;
  mount(root, top(`${modeLabel(s.state.mode)} · ${T('Pregunta', 'Question')} ${s.state.index + 1}/${s.length}`),
    ...questionBody(q, exam),
    h('div', { class: 'card' },
      h('div', { class: 'row' }, multi && h('span', { class: 'tag multi' }, T(`ELIGE ${words[q.choose] ?? q.choose}`, `SELECT ${words[q.choose] ?? q.choose}`)), flagged && h('span', { class: 'tag' }, T('Marcada', 'Flagged')), shown && h('span', { class: 'tag multi' }, T('Respuesta vista', 'Answer shown'))),
      h('div', { class: 'stem' }, v.stem),
      ...v.options.map((o) => h('label', { class: `opt${shown && q.answer.includes(o.id) ? ' right' : sel.has(o.id) ? ' sel' : ''}` },
        h('input', { type: multi ? 'checkbox' : 'radio', name: 'opt', checked: sel.has(o.id), onchange: () => { s.select(o.id); persist(); renderExam(); } }),
        h('span', {}, `${o.id}. ${o.text}${shown && q.answer.includes(o.id) ? '  ✓' : ''}`))),
      shown && h('div', { class: 'card banner', style: 'margin:10px 0' },
        h('p', { class: 'small' }, h('strong', {}, `${T('Respuesta correcta', 'Correct answer')}: ${q.answer.join(', ')}. `), v.explanation),
        h('p', { class: 'small muted' }, T('Esta pregunta cuenta como incorrecta porque viste la respuesta.', 'This question counts as incorrect because you viewed the answer.'))),
      h('div', { class: 'row spread', style: 'margin-top:12px' },
        h('button', { disabled: s.state.index === 0, onclick: () => { s.goto(s.state.index - 1); persist(); renderExam(); } }, T('← Anterior', '← Previous')),
        h('button', { onclick: () => { s.toggleFlag(); persist(); renderExam(); } }, flagged ? T('Quitar marca', 'Unflag') : T('Marcar para revisar', 'Flag for review')),
        h('button', { disabled: shown, title: T('Cuenta como incorrecta', 'Counts as incorrect'), onclick: () => { s.reveal(); persist(); renderExam(); } }, shown ? T('Respuesta vista', 'Answer shown') : T('Ver respuesta', 'Show answer')),
        s.state.index === s.length - 1
          ? h('button', { class: 'primary', onclick: () => { sub = 'summary'; renderExam(); } }, T('Revisar y entregar', 'Review and submit'))
          : h('button', { onclick: () => { s.goto(s.state.index + 1); persist(); renderExam(); } }, T('Siguiente →', 'Next →')))),
    h('div', { class: 'card' }, navigator()));
}

/* ------------------------------- results ------------------------------- */

const findAttempt = (id: string): Attempt | undefined => store.history().find((a) => a.id === id);

function renderResults(id: string): void {
  const a = findAttempt(id);
  if (!a) return go('#/');
  const exam = examById(a.exam);
  const r = a.result;
  const nameInput = h('input', { type: 'text', placeholder: T('Nombre completo (aparecerá en el PDF)', 'Full name (it will appear on the PDF)'), value: store.name(), maxLength: 60 });
  const nameErr = h('p', { class: 'small', style: 'color:var(--bad);display:none;margin:6px 0 0' }, T('Escribe tu nombre para el PDF.', 'Enter your name for the PDF.'));
  nameInput.oninput = () => { store.setName(nameInput.value); if (nameInput.value.trim()) nameErr.style.display = 'none'; };
  const pdfBtn = h('button', { class: 'primary', onclick: async () => {
    if (!store.name().trim()) { nameErr.style.display = 'block'; nameInput.focus(); return; }
    pdfBtn.disabled = true; await downloadPdf(a, store.name(), exam, lang()); pdfBtn.disabled = false; } },
    certificateEligible(a) ? T('Descargar certificado PDF', 'Download certificate PDF') : T('Descargar informe PDF', 'Download report PDF'));
  const scored = exam.domains.filter((d) => r.byDomain[d.id]?.total > 0).sort((x, y) => r.byDomain[x.id].pct - r.byDomain[y.id].pct);
  const weakest = scored[0];

  mount(root,
    h('div', { class: 'row spread' }, h('h1', {}, `${T('Resultado', 'Result')} · ${exam.short} · ${modeLabel(a.mode)}`), langSwitch()),
    h('div', { class: 'card' },
      h('div', { class: `score ${r.passed ? 'pass' : 'fail'}` }, `${r.scaled} / 1000`),
      h('p', {}, r.passed ? T(`Aprobado (estimado, umbral ${exam.passScaled}).`, `Pass (estimated, threshold ${exam.passScaled}).`) : T(`Por debajo del umbral de ${exam.passScaled} (estimado).`, `Below the ${exam.passScaled} threshold (estimated).`)),
      h('p', { class: 'muted small' }, T(`${r.correct} de ${r.total} correctas (${r.pct} %) · ${r.unanswered} sin responder · duración ${fmtClock(a.durationSec)}${a.autoSubmitted ? ' · entrega automática por tiempo' : ''}. `, `${r.correct} of ${r.total} correct (${r.pct}%) · ${r.unanswered} unanswered · duration ${fmtClock(a.durationSec)}${a.autoSubmitted ? ' · auto-submitted on time-out' : ''}. `)
        + (a.mode === 'full' && exam.full.unscored ? T('Las preguntas sin puntuar no cuentan, como en el examen real. ', 'Unscored questions do not count, as in the real exam. ') : '')
        + ((a.revealed?.length ?? 0) > 0 ? T(`${a.revealed!.length} pregunta(s) con respuesta vista cuentan como incorrectas. `, `${a.revealed!.length} question(s) with the answer shown count as incorrect. `) : '')
        + T('El puntaje escalado es una estimación; el examen real no publica su fórmula.', 'The scaled score is an estimate; the real exam does not publish its formula.'))),
    h('div', { class: 'card' }, h('h3', {}, T('Por dominio', 'By domain')),
      ...exam.domains.map((d) => { const x = r.byDomain[d.id] ?? { correct: 0, total: 0, pct: 0 }; return h('div', { style: 'margin:10px 0' },
        h('div', { class: 'row spread small' }, h('span', {}, d.label), h('span', {}, x.total ? `${x.correct}/${x.total} · ${x.pct} %` : T('sin preguntas', 'no questions'))),
        h('div', { class: `bar${x.total && x.pct < 70 ? ' weak' : ''}` }, h('i', { style: `width:${x.pct}%` }))); }),
      weakest && h('p', { class: 'small muted' }, T(`Dominio más débil: ${weakest.label}.`, `Weakest domain: ${weakest.label}.`))),
    h('div', { class: 'card' }, h('label', { class: 'small muted' }, T('Nombre para el certificado / informe', 'Name for the certificate / report')), nameInput, nameErr, h('div', { class: 'row', style: 'margin-top:10px' }, pdfBtn,
      h('button', { onclick: () => go(`#/review/${a.id}`) }, T('Ver revisión', 'View review')), h('button', { onclick: () => go('#/') }, T('Inicio', 'Home'))),
      !certificateEligible(a) && h('p', { class: 'small muted' }, T('El certificado se emite al aprobar un simulacro completo; cualquier otro intento genera un informe.', 'The certificate is issued when you pass a full simulation; any other attempt produces a report.'))));
}

/* -------------------------------- review -------------------------------- */

function renderReview(id: string): void {
  const a = findAttempt(id);
  if (!a) return go('#/');
  const exam = examById(a.exam);
  const onlyWrong = h('input', { type: 'checkbox' });
  const list = h('div');
  const draw = () => {
    const nodes: Node[] = [];
    a.items.forEach((it, idx) => {
      const q = BANK_MAP.get(it.id);
      if (!q) return;
      const picked = a.answers[q.id] ?? [];
      const ok = isCorrect(q, picked) && !(a.revealed ?? []).includes(q.id);
      if (onlyWrong.checked && ok) return;
      nodes.push(reviewCard(q, exam, idx + 1, picked, ok, it.scored, (a.revealed ?? []).includes(q.id)));
    });
    list.replaceChildren(...(nodes.length ? nodes : [h('p', { class: 'muted' }, T('Nada que mostrar.', 'Nothing to show.'))]));
  };
  onlyWrong.onchange = draw;
  draw();
  mount(root, h('div', { class: 'row spread' }, h('h1', {}, T('Revisión', 'Review')), h('div', { class: 'row' }, langSwitch(), h('button', { onclick: () => go(`#/results/${a.id}`) }, T('← Resultado', '← Result')))),
    h('label', { class: 'row' }, onlyWrong, T('Solo incorrectas / sin responder', 'Only incorrect / unanswered')), list);
}

function reviewCard(q: Question, exam: ExamDef, n: number, picked: string[], ok: boolean, scored: boolean, revealed = false): HTMLElement {
  const v = view(q, lang());
  const dom = exam.domains.find((d) => d.id === q.domain)?.label ?? q.domain;
  const sc = scenarioView(exam, q.scenario, lang());
  return h('div', { class: 'card' },
    h('div', { class: 'row' },
      h('span', { class: `tag ${ok ? 'pass' : 'fail'}` }, ok ? T('Correcta', 'Correct') : picked.length ? T('Incorrecta', 'Incorrect') : T('Sin responder', 'Unanswered')),
      h('span', { class: 'tag' }, dom), h('span', { class: 'tag' }, v.topic), sc && h('span', { class: 'tag' }, sc.title),
      q.type === 'multi' && h('span', { class: 'tag multi' }, T(`Elige ${q.choose}`, `Select ${q.choose}`)), !scored && h('span', { class: 'tag' }, T('Sin puntuar', 'Unscored')), revealed && h('span', { class: 'tag multi' }, T('Respuesta vista', 'Answer shown'))),
    h('div', { class: 'stem' }, `${n}. ${v.stem}`),
    ...v.options.map((o) => {
      const right = q.answer.includes(o.id);
      const mine = picked.includes(o.id);
      const why = v.distractors[o.id];
      return h('div', {},
        h('div', { class: `opt ${right ? 'right' : mine ? 'wrong' : ''}` }, h('span', {}, `${o.id}. ${o.text}${mine ? `  ← ${T('tu respuesta', 'your answer')}` : ''}${right ? '  ✓' : ''}`)),
        why && !right && h('div', { class: 'why' }, why));
    }),
    h('p', { class: 'small' }, h('strong', {}, T('Explicación: ', 'Explanation: ')), v.explanation));
}

/* -------------------------------- history -------------------------------- */

function renderHistory(): void {
  const all = store.history();
  const hist = all.slice().reverse();
  const clearBtn = h('button', { class: 'danger' }, T('Borrar historial', 'Clear history'));
  let armed = false;
  clearBtn.onclick = () => {
    if (!armed) { armed = true; clearBtn.textContent = T('Confirmar borrado', 'Confirm delete'); return; }
    store.clearHistory(); renderHistory();
  };
  const bars = all.slice(-20);
  mount(root, h('div', { class: 'row spread' }, h('h1', {}, T('Historial', 'History')), h('div', { class: 'row' }, langSwitch(), h('button', { onclick: () => go('#/') }, T('← Inicio', '← Home')))),
    bars.length > 0 && h('div', { class: 'card' }, h('h3', {}, T('Tendencia (últimos 20)', 'Trend (last 20)')),
      h('div', { class: 'row', style: 'align-items:flex-end;height:110px;gap:4px' }, ...bars.map((a) =>
        h('div', { title: `${a.exam?.toUpperCase()} ${a.result.scaled}`, style: `flex:1;height:${Math.round(((a.result.scaled - 100) / 900) * 100)}%;min-height:3px;background:${a.result.passed ? 'var(--ok)' : 'var(--bad)'};border-radius:3px` }))),
      h('p', { class: 'small muted' }, T('Verde = por encima del umbral de 720.', 'Green = above the 720 threshold.'))),
    h('div', { class: 'card' }, hist.length === 0 ? h('p', { class: 'muted' }, T('Sin intentos todavía.', 'No attempts yet.')) :
      h('table', {}, h('tr', {}, ...[T('Fecha', 'Date'), T('Examen', 'Exam'), T('Modo', 'Mode'), T('Puntaje', 'Score'), T('Aciertos', 'Correct'), T('Duración', 'Duration'), ''].map((t) => h('th', {}, t))),
        ...hist.map((a) => h('tr', {},
          h('td', {}, new Date(a.finishedAt).toLocaleString(lang() === 'en' ? 'en-US' : 'es-CO', { dateStyle: 'short', timeStyle: 'short' })),
          h('td', {}, examById(a.exam).short), h('td', {}, modeLabel(a.mode)),
          h('td', { class: a.result.passed ? 'pass' : 'fail' }, String(a.result.scaled)),
          h('td', {}, `${a.result.correct}/${a.result.total}`), h('td', {}, fmtClock(a.durationSec)),
          h('td', {}, h('a', { href: `#/results/${a.id}` }, T('Detalle', 'Details'))))))),
    hist.length > 0 && clearBtn);
}

void ALL_QUESTIONS;
