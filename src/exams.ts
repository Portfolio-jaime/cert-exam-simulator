import type { ExamId } from './types';

export interface DomainDef {
  id: string;
  label: string;
  weight: number;
}

export interface ScenarioDef {
  id: string;
  title: string;
  text: string;
  en: { title: string; text: string };
}

export interface ExamDef {
  id: ExamId;
  name: string;
  short: string;
  code: string;
  /** Exam day, ISO date (local time). */
  date: string;
  passScaled: number;
  domains: DomainDef[];
  scenarios?: ScenarioDef[];
  /** True when questions ship in Spanish and English. */
  bilingual?: boolean;
  full: { size: number; limitSec: number; unscored: number; scenarioCount?: number };
  block: { size: number; limitSec: number };
  disclaimer: string;
}

export const EXAMS: ExamDef[] = [
  {
    id: 'saa',
    name: 'AWS Solutions Architect – Associate',
    short: 'SAA-C03',
    code: 'SAA-C03',
    date: '2026-11-24',
    passScaled: 720,
    domains: [
      { id: 'secure', label: 'Design Secure Architectures', weight: 0.3 },
      { id: 'resilient', label: 'Design Resilient Architectures', weight: 0.26 },
      { id: 'performance', label: 'Design High-Performing Architectures', weight: 0.24 },
      { id: 'cost', label: 'Design Cost-Optimized Architectures', weight: 0.2 },
    ],
    full: { size: 65, limitSec: 130 * 60, unscored: 15 },
    block: { size: 22, limitSec: 44 * 60 },
    disclaimer: 'Documento de práctica personal. No es una certificación ni un resultado oficial de AWS; el puntaje es una estimación.',
  },
  {
    id: 'ccaf',
    name: 'Claude Certified Architect – Foundations',
    short: 'CCAR-F',
    code: 'CCAR-F',
    date: '2026-12-12',
    passScaled: 720,
    domains: [
      { id: 'agentic', label: 'Agentic Architecture & Orchestration', weight: 0.27 },
      { id: 'mcp', label: 'Tool Design & MCP Integration', weight: 0.18 },
      { id: 'claudecode', label: 'Claude Code Configuration & Workflows', weight: 0.2 },
      { id: 'prompting', label: 'Prompt Engineering & Structured Output', weight: 0.2 },
      { id: 'context', label: 'Context Management & Reliability', weight: 0.15 },
    ],
    bilingual: true,
    scenarios: [
      { id: 's1', title: 'Customer Support Resolution Agent', text: 'Construyes un agente de resolución de soporte con el Agent SDK. Atiende solicitudes ambiguas (devoluciones, disputas de facturación, problemas de cuenta) con herramientas MCP personalizadas: get_customer, lookup_order, process_refund y escalate_to_human. La meta es 80 %+ de resolución en el primer contacto sabiendo cuándo escalar.', en: { title: 'Customer Support Resolution Agent', text: 'You are building a customer support resolution agent with the Agent SDK. It handles ambiguous requests (returns, billing disputes, account issues) through custom MCP tools: get_customer, lookup_order, process_refund and escalate_to_human. The goal is 80%+ first-contact resolution while knowing when to escalate.' } },
      { id: 's2', title: 'Code Generation with Claude Code', text: 'Tu equipo usa Claude Code para generar, refactorizar, depurar y documentar código. Debes integrarlo en el flujo de trabajo con slash commands personalizados y configuraciones de CLAUDE.md, y decidir cuándo usar plan mode frente a ejecución directa.', en: { title: 'Code Generation with Claude Code', text: 'Your team uses Claude Code to generate, refactor, debug and document code. You must integrate it into the workflow with custom slash commands and CLAUDE.md configurations, and decide when to use plan mode versus direct execution.' } },
      { id: 's3', title: 'Multi-Agent Research System', text: 'Construyes un sistema de investigación multiagente con el Agent SDK. Un coordinator delega en subagents especializados: uno busca en la web, otro analiza documentos, otro sintetiza hallazgos y otro genera informes. El sistema investiga temas y produce informes completos y citados.', en: { title: 'Multi-Agent Research System', text: 'You are building a multi-agent research system with the Agent SDK. A coordinator delegates to specialized subagents: one searches the web, one analyzes documents, one synthesizes findings and one generates reports. The system researches topics and produces comprehensive, cited reports.' } },
      { id: 's4', title: 'Developer Productivity with Claude', text: 'Construyes herramientas de productividad para desarrolladores con el Agent SDK. El agente ayuda a explorar bases de código desconocidas, entender sistemas legados, generar boilerplate y automatizar tareas repetitivas. Usa las built-in tools (Read, Write, Bash, Grep, Glob) e integra servidores MCP.', en: { title: 'Developer Productivity with Claude', text: 'You are building developer productivity tools with the Agent SDK. The agent helps engineers explore unfamiliar codebases, understand legacy systems, generate boilerplate and automate repetitive tasks. It uses the built-in tools (Read, Write, Bash, Grep, Glob) and integrates MCP servers.' } },
      { id: 's5', title: 'Claude Code for Continuous Integration', text: 'Integras Claude Code en tu pipeline CI/CD. El sistema ejecuta revisiones de código automáticas, genera casos de prueba y da feedback en pull requests. Debes diseñar prompts con feedback accionable que minimicen los falsos positivos.', en: { title: 'Claude Code for Continuous Integration', text: 'You are integrating Claude Code into your CI/CD pipeline. The system runs automated code reviews, generates test cases and gives feedback on pull requests. You must design prompts that give actionable feedback and minimize false positives.' } },
      { id: 's6', title: 'Structured Data Extraction', text: 'Construyes un sistema que extrae información de documentos no estructurados con Claude, valida la salida con JSON schemas y mantiene alta precisión. Debe manejar casos límite con elegancia e integrarse con sistemas downstream.', en: { title: 'Structured Data Extraction', text: 'You are building a system that extracts information from unstructured documents with Claude, validates the output with JSON schemas and keeps accuracy high. It must handle edge cases gracefully and integrate with downstream systems.' } },
    ],
    full: { size: 60, limitSec: 120 * 60, unscored: 0, scenarioCount: 4 },
    block: { size: 20, limitSec: 40 * 60 },
    disclaimer: 'Documento de práctica personal. No es una certificación ni un resultado oficial; el puntaje es una estimación.',
  },
];

export const examById = (id: string | undefined): ExamDef => EXAMS.find((e) => e.id === id) ?? EXAMS[0];

export function daysUntil(isoDate: string, now = Date.now()): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const start = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), new Date(now).getDate()).getTime();
  return Math.round((target - start) / 86_400_000);
}
