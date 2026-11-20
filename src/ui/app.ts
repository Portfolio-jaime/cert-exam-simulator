import { BANK, BANK_MAP } from '../bank';
import { ExamSession, MODE_CONFIG } from '../exam/engine';
import { buildExam } from '../exam/sampler';
import { certificateEligible, isCorrect } from '../exam/scoring';
import { downloadPdf } from '../pdf/certificate';
import { Store } from '../store';
import { DOMAINS, DOMAIN_LABEL, MODE_LABEL, PASS_SCALED, type Attempt, type Domain, type Mode, type Question } from '../types';
import { fmtClock, h, mount } from './dom';

const store = new Store();
const root = document.getElementById('app')!;
let session: ExamSession | null = null;
let timer: number | undefined;
let view: 'q' | 'summary' = 'q';

const NUM_WORD = ['', 'UNA', 'DOS', 'TRES', 'CUATRO'];

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

/* ------------------------------ routing ------------------------------ */

export function route(): void {
  const [, page = '', arg = ''] = location.hash.replace(/^#/, '').split('/');
  if (page !== 'exam') stopTimer();
  switch (page) {
    case 'exam': return renderExam();
    case 'results': return renderResults(arg);
    case 'review': return renderReview(arg);
    case 'history': return renderHistory();
    default: return renderHome();
  }
}

const go = (hash: string) => {
  if (location.hash === hash) route();
  else location.hash = hash;
};

/* -------------------------------- home -------------------------------- */

function renderHome(): void {
  const st = stats();
  const saved = store.loadSession();
  const counts = Object.fromEntries(DOMAINS.map((d) => [d, BANK.filter((q) => q.domain === d).length])) as Record<Domain, number>;
  const nameInput = h('input', { type: 'text', placeholder: 'Tu nombre (para el PDF)', value: store.name(), maxLength: 60 });
  nameInput.oninput = () => store.setName(nameInput.value);
  const domainSel = h('select', {}, ...DOMAINS.map((d) => h('option', { value: d }, `${DOMAIN_LABEL[d]} (${counts[d]})`)));

  const modeCard = (mode: Mode, desc: string, extra?: Node, disabled = false) =>
    h('div', { class: 'card' },
      h('h3', {}, MODE_LABEL[mode]),
      h('p', { class: 'muted small' }, desc),
      extra,
      h('button', { class: 'primary', disabled, onclick: () => startExam(mode, mode === 'domain' ? (domainSel.value as Domain) : undefined) }, 'Empezar'),
    );

  const recent = store.history().slice(-5).reverse();
  mount(root,
    h('h1', {}, 'SAA-C03 Practice Exam'),
    h('p', { class: 'muted' }, `Banco: ${BANK.length} preguntas · aprueba con ≥ ${PASS_SCALED} (estimado) · selección múltiple todo-o-nada`),
    saved && h('div', { class: 'card banner' },
      h('strong', {}, 'Tienes un intento en curso'),
      h('p', { class: 'muted small' }, `${MODE_LABEL[saved.mode]} · ${Object.keys(saved.answers).length} de ${saved.items.length} respondidas`),
      h('div', { class: 'row' },
        h('button', { class: 'primary', onclick: resumeExam }, 'Continuar'),
        h('button', { class: 'danger', onclick: () => { store.clearSession(); renderHome(); } }, 'Descartar'))),
    h('div', { class: 'card' }, nameInput),
    h('div', { class: 'grid' },
      modeCard('block', '22 preguntas · 44 min · sin feedback hasta entregar.'),
      modeCard('full', '65 preguntas (50 puntuadas + 15 sin puntuar) · 130 min. Emite certificado si apruebas.', BANK.length < 65 ? h('p', { class: 'small', style: 'color:var(--warn)' }, `El banco tiene ${BANK.length}; el simulacro usará todas.`) : undefined),
      modeCard('domain', 'Preguntas de un solo dominio.', domainSel),
      modeCard('review', `Solo las que fallaste (${st.failed.size}).`, undefined, st.failed.size === 0)),
    h('div', { class: 'card' },
      h('div', { class: 'row spread' }, h('h3', {}, 'Últimos intentos'), h('button', { onclick: () => go('#/history') }, 'Ver historial')),
      recent.length === 0
        ? h('p', { class: 'muted small' }, 'Aún no hay intentos.')
        : h('table', {}, ...recent.map((a) => h('tr', {},
            h('td', {}, new Date(a.finishedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })),
            h('td', {}, MODE_LABEL[a.mode]),
            h('td', { class: a.result.passed ? 'pass' : 'fail' }, `${a.result.scaled}`),
            h('td', {}, h('a', { href: `#/results/${a.id}` }, 'Detalle')))))),
  );
}

/* ------------------------------- exam flow ------------------------------- */

function startExam(mode: Mode, domain?: Domain): void {
  const cfg = MODE_CONFIG[mode];
  const { seen, failed } = stats();
  const items = buildExam({
    bank: BANK, size: cfg.size, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, seen, failed, domain,
    onlyIds: mode === 'review' ? failed : undefined, unscored: cfg.unscored,
  });
  if (items.length === 0) return;
  session = ExamSession.create(mode, items, BANK_MAP, Date.now());
  view = 'q';
  store.saveSession(session.state);
  go('#/exam');
}

function resumeExam(): void {
  const s = store.loadSession();
  if (!s) return;
  session = new ExamSession(s, BANK_MAP);
  view = 'q';
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

  const navigator = () => h('div', { class: 'nav' }, ...s.state.items.map((it, i) =>
    h('button', {
      class: [s.isAnswered(i) ? 'answered' : '', s.state.flags.includes(it.id) ? 'flagged' : '', view === 'q' && i === s.state.index ? 'current' : ''].join(' '),
      onclick: () => { s.goto(i); view = 'q'; persist(); renderExam(); },
    }, String(i + 1))));

  const persist = () => store.saveSession(s.state);
  const top = (label: string) => h('div', { class: 'topbar' }, h('div', { class: 'row spread' },
    h('span', {}, label), h('span', { class: 'row' }, timerEl,
      view === 'q' && h('button', { onclick: () => { view = 'summary'; renderExam(); } }, 'Revisar y entregar'))));

  if (view === 'summary') {
    const n = s.length;
    const unanswered = s.state.items.filter((_, i) => !s.isAnswered(i)).length;
    const incomplete = s.state.items.filter((_, i) => s.isAnswered(i) && !s.isComplete(i)).length;
    const confirmBtn = h('button', { class: 'primary', onclick: () => submit(false) }, 'Entregar examen');
    return mount(root, top('Revisión'),
      h('div', { class: 'card' },
        h('h2', {}, 'Antes de entregar'),
        h('p', {}, `${n - unanswered} de ${n} respondidas · ${unanswered} sin responder · ${incomplete} incompletas · ${s.state.flags.length} marcadas.`),
        navigator(),
        h('div', { class: 'row', style: 'margin-top:14px' },
          h('button', { onclick: () => { view = 'q'; renderExam(); } }, 'Volver al examen'), confirmBtn)));
  }

  const q = s.question();
  const sel = new Set(s.state.answers[q.id] ?? []);
  const flagged = s.state.flags.includes(q.id);
  const multi = q.type === 'multi';
  mount(root, top(`${MODE_LABEL[s.state.mode]} · Pregunta ${s.state.index + 1} de ${s.length}`),
    h('div', { class: 'card' },
      h('div', { class: 'row' }, multi && h('span', { class: 'tag multi' }, `ELIGE ${NUM_WORD[q.choose] ?? q.choose}`), flagged && h('span', { class: 'tag' }, 'Marcada')),
      h('div', { class: 'stem' }, q.stem),
      ...q.options.map((o) => h('label', { class: `opt${sel.has(o.id) ? ' sel' : ''}` },
        h('input', { type: multi ? 'checkbox' : 'radio', name: 'opt', checked: sel.has(o.id), onchange: () => { s.select(o.id); persist(); renderExam(); } }),
        h('span', {}, `${o.id}. ${o.text}`))),
      h('div', { class: 'row spread', style: 'margin-top:12px' },
        h('button', { disabled: s.state.index === 0, onclick: () => { s.goto(s.state.index - 1); persist(); renderExam(); } }, '← Anterior'),
        h('button', { onclick: () => { s.toggleFlag(); persist(); renderExam(); } }, flagged ? 'Quitar marca' : 'Marcar para revisar'),
        s.state.index === s.length - 1
          ? h('button', { class: 'primary', onclick: () => { view = 'summary'; renderExam(); } }, 'Revisar y entregar')
          : h('button', { onclick: () => { s.goto(s.state.index + 1); persist(); renderExam(); } }, 'Siguiente →'))),
    h('div', { class: 'card' }, navigator()));
}

/* ------------------------------- results ------------------------------- */

function findAttempt(id: string): Attempt | undefined {
  return store.history().find((a) => a.id === id);
}

function renderResults(id: string): void {
  const a = findAttempt(id);
  if (!a) return go('#/');
  const r = a.result;
  const nameInput = h('input', { type: 'text', placeholder: 'Tu nombre (para el PDF)', value: store.name(), maxLength: 60 });
  nameInput.oninput = () => store.setName(nameInput.value);
  const pdfBtn = h('button', { class: 'primary', onclick: async () => { pdfBtn.disabled = true; await downloadPdf(a, store.name()); pdfBtn.disabled = false; } },
    certificateEligible(a) ? 'Descargar certificado PDF' : 'Descargar informe PDF');
  const weakest = [...DOMAINS].filter((d) => r.byDomain[d].total > 0).sort((x, y) => r.byDomain[x].pct - r.byDomain[y].pct)[0];

  mount(root,
    h('h1', {}, `Resultado · ${MODE_LABEL[a.mode]}`),
    h('div', { class: 'card' },
      h('div', { class: `score ${r.passed ? 'pass' : 'fail'}` }, `${r.scaled} / 1000`),
      h('p', {}, r.passed ? `Aprobado (estimado, umbral ${PASS_SCALED}).` : `Por debajo del umbral de ${PASS_SCALED} (estimado).`),
      h('p', { class: 'muted small' }, `${r.correct} de ${r.total} correctas (${r.pct} %) · ${r.unanswered} sin responder · duración ${fmtClock(a.durationSec)}${a.autoSubmitted ? ' · entrega automática por tiempo' : ''}. `
        + (a.mode === 'full' ? 'Las 15 preguntas sin puntuar no cuentan, como en el examen real. ' : '') + 'El puntaje escalado es una estimación; AWS no publica su fórmula.')),
    h('div', { class: 'card' },
      h('h3', {}, 'Por dominio'),
      ...DOMAINS.map((d) => { const x = r.byDomain[d]; return h('div', { style: 'margin:10px 0' },
        h('div', { class: 'row spread small' }, h('span', {}, DOMAIN_LABEL[d]), h('span', {}, x.total ? `${x.correct}/${x.total} · ${x.pct} %` : 'sin preguntas')),
        h('div', { class: `bar${x.total && x.pct < 70 ? ' weak' : ''}` }, h('i', { style: `width:${x.pct}%` }))); }),
      weakest && h('p', { class: 'small muted' }, `Dominio más débil: ${DOMAIN_LABEL[weakest]}.`)),
    h('div', { class: 'card' }, nameInput, h('div', { class: 'row', style: 'margin-top:10px' }, pdfBtn,
      h('button', { onclick: () => go(`#/review/${a.id}`) }, 'Ver revisión'), h('button', { onclick: () => go('#/') }, 'Inicio')),
      !certificateEligible(a) && h('p', { class: 'small muted' }, 'El certificado se emite al aprobar un simulacro completo; cualquier otro intento genera un informe.')));
}

/* -------------------------------- review -------------------------------- */

function renderReview(id: string): void {
  const a = findAttempt(id);
  if (!a) return go('#/');
  const onlyWrong = h('input', { type: 'checkbox' });
  const list = h('div');
  const draw = () => {
    const nodes: Node[] = [];
    a.items.forEach((it, idx) => {
      const q = BANK_MAP.get(it.id);
      if (!q) return;
      const picked = a.answers[q.id] ?? [];
      const ok = isCorrect(q, picked);
      if (onlyWrong.checked && ok) return;
      nodes.push(reviewCard(q, idx + 1, picked, ok, it.scored));
    });
    list.replaceChildren(...(nodes.length ? nodes : [h('p', { class: 'muted' }, 'Nada que mostrar.')]));
  };
  onlyWrong.onchange = draw;
  draw();
  mount(root, h('div', { class: 'row spread' }, h('h1', {}, 'Revisión'), h('button', { onclick: () => go(`#/results/${a.id}`) }, '← Resultado')),
    h('label', { class: 'row' }, onlyWrong, 'Solo incorrectas / sin responder'), list);
}

function reviewCard(q: Question, n: number, picked: string[], ok: boolean, scored: boolean): HTMLElement {
  return h('div', { class: 'card' },
    h('div', { class: 'row' },
      h('span', { class: `tag ${ok ? 'pass' : 'fail'}` }, ok ? 'Correcta' : picked.length ? 'Incorrecta' : 'Sin responder'),
      h('span', { class: 'tag' }, DOMAIN_LABEL[q.domain]), h('span', { class: 'tag' }, q.topic),
      q.type === 'multi' && h('span', { class: 'tag multi' }, `Elige ${q.choose}`), !scored && h('span', { class: 'tag' }, 'Sin puntuar')),
    h('div', { class: 'stem' }, `${n}. ${q.stem}`),
    ...q.options.map((o) => {
      const right = q.answer.includes(o.id);
      const mine = picked.includes(o.id);
      const why = q.distractors[o.id];
      return h('div', {},
        h('div', { class: `opt ${right ? 'right' : mine ? 'wrong' : ''}` }, h('span', {}, `${o.id}. ${o.text}${mine ? '  ← tu respuesta' : ''}${right ? '  ✓' : ''}`)),
        why && !right && h('div', { class: 'why' }, why));
    }),
    h('p', { class: 'small' }, h('strong', {}, 'Explicación: '), q.explanation));
}

/* -------------------------------- history -------------------------------- */

function renderHistory(): void {
  const hist = store.history().slice().reverse();
  const clearBtn = h('button', { class: 'danger' }, 'Borrar historial');
  let armed = false;
  clearBtn.onclick = () => {
    if (!armed) { armed = true; clearBtn.textContent = 'Confirmar borrado'; return; }
    store.clearHistory(); renderHistory();
  };
  const bars = store.history().slice(-20);
  mount(root, h('div', { class: 'row spread' }, h('h1', {}, 'Historial'), h('button', { onclick: () => go('#/') }, '← Inicio')),
    bars.length > 0 && h('div', { class: 'card' }, h('h3', {}, 'Tendencia (últimos 20)'),
      h('div', { class: 'row', style: 'align-items:flex-end;height:110px;gap:4px' }, ...bars.map((a) =>
        h('div', { title: `${a.result.scaled}`, style: `flex:1;height:${Math.round(((a.result.scaled - 100) / 900) * 100)}%;min-height:3px;background:${a.result.passed ? 'var(--ok)' : 'var(--bad)'};border-radius:3px` }))),
      h('p', { class: 'small muted' }, `Umbral ${PASS_SCALED}. Verde = por encima.`)),
    h('div', { class: 'card' }, hist.length === 0 ? h('p', { class: 'muted' }, 'Sin intentos todavía.') :
      h('table', {}, h('tr', {}, ...['Fecha', 'Modo', 'Puntaje', 'Aciertos', 'Duración', ''].map((t) => h('th', {}, t))),
        ...hist.map((a) => h('tr', {},
          h('td', {}, new Date(a.finishedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })),
          h('td', {}, MODE_LABEL[a.mode]),
          h('td', { class: a.result.passed ? 'pass' : 'fail' }, String(a.result.scaled)),
          h('td', {}, `${a.result.correct}/${a.result.total}`),
          h('td', {}, fmtClock(a.durationSec)),
          h('td', {}, h('a', { href: `#/results/${a.id}` }, 'Detalle')))))),
    hist.length > 0 && clearBtn);
}
