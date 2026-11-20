# 🧭 Study plans

Each exam has a day-by-day plan shown on the **Study plan** page (`#/plan`). Tasks are checkboxes, saved locally, with a progress bar and a "Today" marker.

## ![AWS](https://img.shields.io/badge/AWS-232F3E?logo=amazonwebservices&logoColor=white) SAA-C03 · exam on 24 Nov 2026

| Day | Focus | Work |
|---|---|---|
| Fri 20 | 🔐 Security | 22-question block (44 min), review every miss, IAM/STS · SCP · KMS · endpoints · SG vs NACL |
| Sat 21 | 🛡️ Resilience | Block, Multi-AZ vs read replica, Aurora, DR strategies (RPO/RTO), SQS/SNS, ELB, Route 53 |
| Sun 22 | ⚡ Performance + 💰 Cost | Block, EBS/EFS/FSx and S3 tiering, Savings Plans vs Reserved vs Spot, transfer costs |
| Mon 23 | 🏁 Full simulation | 65 questions in 130 min with no lookups, review misses, ID and logistics, sleep early |
| Tue 24 | 🎓 Exam day | Read the last sentence first and find the constraint |

## ![Claude](https://img.shields.io/badge/Claude-D97757?logoColor=white) CCAR-F · exam on 12 Dec 2026

| Dates | Focus | Work |
|---|---|---|
| 25–26 Nov | 🤖 D1 Agentic | Agentic loops, orchestration, subagents, hooks, decomposition, sessions (TS 1.1–1.7) |
| 27 Nov | 🔧 D2 Tools & MCP | Tool descriptions, structured errors, tool distribution, built-in tools (TS 2.1–2.5) |
| 28–29 Nov | 💻 D3 Claude Code | CLAUDE.md hierarchy, commands and skills, path rules, plan mode, CI/CD (TS 3.1–3.6) |
| 30 Nov–1 Dec | ✍️ D4 Prompting | Explicit criteria, few-shot, tool_use + JSON schema, validation/retry, batch (TS 4.1–4.6) |
| 2–3 Dec | 🧠 D5 Context | Context preservation, escalation, error propagation, provenance (TS 5.1–5.6) |
| 4–5 Dec | 🛠️ Hands-on | Build the exercises from the guide: agent + hooks, MCP server, extraction pipeline, CI review |
| 8–9 Dec | 🧩 Scenario blocks | 20-question blocks (40 min), S1–S3 then S4–S6, review misses |
| 10 Dec | 🏁 Full simulation | 60 questions, 4 random scenarios, 120 min, aim ≥ 80 % |
| 11 Dec | 😴 Rest | Review only misses and notes, check ID and logistics |
| 12 Dec | 🎓 Exam day | Read what each item asks and how many responses to select |

## Adapting a plan

Plans are plain data in [`src/plans.ts`](../src/plans.ts):

```ts
{
  date: '2026-11-21',
  title: ['Resiliencia', 'Resilience'],          // [es, en]
  focus: ['resilient'],                          // domain ids to highlight
  tasks: [['Bloque de 22 preguntas', '22-question block']],
}
```

Change dates or tasks and rebuild. The exam date used for the countdown comes from `exams.ts`.

## How to use the app alongside the plan

1. Do the day's block under real timing, without lookups.
2. Open **Review** and read the explanation of every miss, not only the ones you got wrong by a lot.
3. Re-take **Review missed** the next day.
4. Watch the **readiness by domain** bars on the home screen and move study time to anything under 70 %.
