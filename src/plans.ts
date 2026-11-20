import type { ExamId } from './types';

export type Bi = [es: string, en: string];

export interface PlanDay {
  date: string;
  title: Bi;
  tasks: Bi[];
  /** Domain ids worth drilling that day. */
  focus?: string[];
  examDay?: boolean;
}

export interface Resource {
  label: string;
  url: string;
}

export const PLANS: Record<ExamId, PlanDay[]> = {
  saa: [
    {
      date: '2026-11-20',
      title: ['Seguridad + diagnóstico', 'Security + diagnostic'],
      focus: ['secure'],
      tasks: [
        ['Bloque de 22 preguntas con tiempo real (44 min)', '22-question block, real timing (44 min)'],
        ['Revisar cada error y su distractor', 'Review every miss and its distractors'],
        ['Repasar IAM/STS, SCP, KMS, endpoints, SG vs NACL', 'Review IAM/STS, SCPs, KMS, endpoints, SG vs NACL'],
      ],
    },
    {
      date: '2026-11-21',
      title: ['Resiliencia y alta disponibilidad', 'Resilience and high availability'],
      focus: ['resilient'],
      tasks: [
        ['Bloque de 22 preguntas', '22-question block'],
        ['Multi-AZ vs Read Replica, Aurora, estrategias de DR (RPO/RTO)', 'Multi-AZ vs read replicas, Aurora, DR strategies (RPO/RTO)'],
        ['SQS/SNS/EventBridge, ELB, Route 53', 'SQS/SNS/EventBridge, ELB, Route 53'],
      ],
    },
    {
      date: '2026-11-22',
      title: ['Rendimiento y costos', 'Performance and cost'],
      focus: ['performance', 'cost'],
      tasks: [
        ['Bloque de 22 preguntas', '22-question block'],
        ['Almacenamiento: EBS/EFS/FSx, clases y tiering de S3', 'Storage: EBS/EFS/FSx, S3 classes and tiering'],
        ['Savings Plans vs Reserved vs Spot, costos de transferencia', 'Savings Plans vs Reserved vs Spot, data transfer costs'],
      ],
    },
    {
      date: '2026-11-23',
      title: ['Simulacro completo + descanso', 'Full simulation + rest'],
      tasks: [
        ['Simulacro de 65 preguntas en 130 min, sin buscar nada', '65-question simulation in 130 min, no lookups'],
        ['Revisar solo los errores y las preguntas marcadas', 'Review only misses and flagged questions'],
        ['Preparar ID vigente y logística; dormir temprano', 'Prepare valid ID and logistics; sleep early'],
      ],
    },
    {
      date: '2026-11-24',
      title: ['Día del examen', 'Exam day'],
      examDay: true,
      tasks: [
        ['Llegar con tiempo y la identificación vigente', 'Arrive early with valid ID'],
        ['Leer la última frase primero e identificar la restricción', 'Read the last sentence first and spot the constraint'],
      ],
    },
  ],
  ccaf: [
    {
      date: '2026-11-25',
      title: ['D1 · Agentic loops y multiagente (TS 1.1–1.4)', 'D1 · Agentic loops and multi-agent (TS 1.1–1.4)'],
      focus: ['agentic'],
      tasks: [
        ['Leer la guía oficial, sección Dominio 1', 'Read the official guide, Domain 1 section'],
        ['Bloque de práctica por dominio: agentic', 'Domain practice block: agentic'],
      ],
    },
    {
      date: '2026-11-26',
      title: ['D1 · Hooks, descomposición y sesiones (TS 1.5–1.7)', 'D1 · Hooks, decomposition and sessions (TS 1.5–1.7)'],
      focus: ['agentic'],
      tasks: [
        ['Hooks del Agent SDK, interceptación de tool calls, resume/fork de sesión', 'Agent SDK hooks, tool-call interception, session resume/fork'],
        ['Repaso de falladas', 'Review of missed questions'],
      ],
    },
    {
      date: '2026-11-27',
      title: ['D2 · Diseño de herramientas y MCP (TS 2.1–2.5)', 'D2 · Tool design and MCP (TS 2.1–2.5)'],
      focus: ['mcp'],
      tasks: [
        ['Descripciones de herramientas, errores estructurados, reparto de tools entre agentes', 'Tool descriptions, structured errors, tool distribution across agents'],
        ['Practicar con un servidor MCP propio (ejercicio de la guía)', 'Hands-on with your own MCP server (guide exercise)'],
      ],
    },
    {
      date: '2026-11-28',
      title: ['D3 · Claude Code: configuración (TS 3.1–3.3)', 'D3 · Claude Code configuration (TS 3.1–3.3)'],
      focus: ['claudecode'],
      tasks: [
        ['Jerarquía de CLAUDE.md, slash commands, skills y reglas por ruta', 'CLAUDE.md hierarchy, slash commands, skills and path-specific rules'],
        ['Bloque de práctica por dominio: claudecode', 'Domain practice block: claudecode'],
      ],
    },
    {
      date: '2026-11-29',
      title: ['D3 · Plan mode, refinamiento y CI/CD (TS 3.4–3.6)', 'D3 · Plan mode, refinement and CI/CD (TS 3.4–3.6)'],
      focus: ['claudecode'],
      tasks: [
        ['Plan mode vs ejecución directa; Claude Code en pipelines', 'Plan mode vs direct execution; Claude Code in pipelines'],
        ['Repaso de falladas', 'Review of missed questions'],
      ],
    },
    {
      date: '2026-11-30',
      title: ['D4 · Prompts y salida estructurada (TS 4.1–4.3)', 'D4 · Prompts and structured output (TS 4.1–4.3)'],
      focus: ['prompting'],
      tasks: [
        ['Criterios explícitos, few-shot, tool_use con JSON schemas', 'Explicit criteria, few-shot, tool_use with JSON schemas'],
        ['Bloque de práctica por dominio: prompting', 'Domain practice block: prompting'],
      ],
    },
    {
      date: '2026-12-01',
      title: ['D4 · Validación, batch y revisión multi-pasada (TS 4.4–4.6)', 'D4 · Validation, batch and multi-pass review (TS 4.4–4.6)'],
      focus: ['prompting'],
      tasks: [
        ['Bucles de validación/reintento, batch processing, multi-instancia', 'Validation/retry loops, batch processing, multi-instance review'],
        ['Repaso de falladas', 'Review of missed questions'],
      ],
    },
    {
      date: '2026-12-02',
      title: ['D5 · Contexto y confiabilidad (TS 5.1–5.3)', 'D5 · Context and reliability (TS 5.1–5.3)'],
      focus: ['context'],
      tasks: [
        ['Preservar información crítica, escalamiento, propagación de errores', 'Preserve critical info, escalation, error propagation'],
        ['Bloque de práctica por dominio: context', 'Domain practice block: context'],
      ],
    },
    {
      date: '2026-12-03',
      title: ['D5 · Bases grandes, revisión humana y provenance (TS 5.4–5.6)', 'D5 · Large codebases, human review and provenance (TS 5.4–5.6)'],
      focus: ['context'],
      tasks: [
        ['Exploración de código, calibración de confianza, trazabilidad de fuentes', 'Codebase exploration, confidence calibration, source provenance'],
        ['Repaso de falladas', 'Review of missed questions'],
      ],
    },
    {
      date: '2026-12-04',
      title: ['Ejercicios prácticos de la guía (1/2)', 'Guide hands-on exercises (1/2)'],
      tasks: [
        ['Construir un agente con subagents y hooks', 'Build an agent with subagents and hooks'],
        ['Configurar CLAUDE.md + un slash command + un servidor MCP', 'Set up CLAUDE.md + a slash command + an MCP server'],
      ],
    },
    {
      date: '2026-12-05',
      title: ['Ejercicios prácticos de la guía (2/2)', 'Guide hands-on exercises (2/2)'],
      tasks: [
        ['Pipeline de extracción: tool_use + JSON schema + validación y reintento', 'Extraction pipeline: tool_use + JSON schema + validation and retry'],
        ['Integración en CI con revisión de PRs', 'CI integration with PR review'],
      ],
    },
    {
      date: '2026-12-08',
      title: ['Bloques por escenarios S1–S3', 'Scenario blocks S1–S3'],
      tasks: [
        ['Bloque de 20 preguntas con tiempo real (40 min)', '20-question block with real timing (40 min)'],
        ['Revisar errores y reforzar el dominio más débil', 'Review misses and reinforce the weakest domain'],
      ],
    },
    {
      date: '2026-12-09',
      title: ['Bloques por escenarios S4–S6', 'Scenario blocks S4–S6'],
      tasks: [
        ['Bloque de 20 preguntas con tiempo real (40 min)', '20-question block with real timing (40 min)'],
        ['Repaso de falladas', 'Review of missed questions'],
      ],
    },
    {
      date: '2026-12-10',
      title: ['Simulacro completo', 'Full simulation'],
      tasks: [
        ['60 preguntas, 4 escenarios al azar, 120 min', '60 questions, 4 random scenarios, 120 min'],
        ['Meta: ≥ 80 % en simulacros consistentes', 'Goal: ≥ 80% on consistent simulations'],
      ],
    },
    {
      date: '2026-12-11',
      title: ['Repaso final y descanso', 'Final review and rest'],
      tasks: [
        ['Repasar solo errores y notas; sin material nuevo', 'Review only misses and notes; no new material'],
        ['Verificar identificación y logística con Pearson', 'Check ID and logistics with Pearson'],
      ],
    },
    {
      date: '2026-12-12',
      title: ['Día del examen', 'Exam day'],
      examDay: true,
      tasks: [
        ['Identificación vigente y a tiempo', 'Valid ID and be on time'],
        ['Leer qué pide cada ítem y cuántas respuestas seleccionar', 'Read what each item asks and how many responses to select'],
      ],
    },
  ],
};

export const RESOURCES: Record<ExamId, Resource[]> = {
  saa: [
    { label: 'Official exam guide (SAA-C03)', url: 'https://docs.aws.amazon.com/aws-certification/latest/examguides/solutions-architect-associate-03.html' },
    { label: 'AWS Well-Architected Framework', url: 'https://aws.amazon.com/architecture/well-architected/' },
    { label: 'AWS Certified Solutions Architect – Associate', url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/' },
  ],
  ccaf: [
    { label: 'Anthropic documentation', url: 'https://docs.anthropic.com' },
    { label: 'Model Context Protocol', url: 'https://modelcontextprotocol.io' },
  ],
};
