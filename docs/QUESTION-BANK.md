# 🧱 Question bank

Questions live in `data/questions/<exam>/*.json`. The **folder name is the exam id** (`saa`, `ccaf`) and every file is an array of questions.

```
data/questions/
├── saa/    secure.json · resilient.json · performance.json · cost.json
└── ccaf/   s1.json … s6.json   (one file per scenario)
```

## Schema

```json
{
  "id": "sec-01",
  "domain": "secure",
  "topic": "VPC endpoints",
  "scenario": "s1",
  "type": "single",
  "choose": 1,
  "stem": "Scenario text ending with the key constraint…",
  "options": [{ "id": "A", "text": "…" }, { "id": "B", "text": "…" }],
  "answer": ["B"],
  "explanation": "Why the answer is right.",
  "distractors": { "A": "Why A fails.", "C": "…", "D": "…" },
  "difficulty": 2,
  "en": {
    "stem": "…", "topic": "…", "explanation": "…",
    "options": { "A": "…", "B": "…" },
    "distractors": { "A": "…", "C": "…", "D": "…" }
  }
}
```

| Field | Rules |
|---|---|
| `id` | Unique across the whole bank. |
| `domain` | Must be a domain id of that exam (see `src/exams.ts`). |
| `scenario` | Required for exams that define scenarios (`ccaf`); must match a scenario id. |
| `type` / `choose` | `single` → `choose: 1`, **4** options. `multi` → `choose` 2 or 3, equal to `answer.length`, **≥ 5** options. |
| `distractors` | One short reason for **every incorrect option**, none for correct ones. |
| `stem` | ≥ 40 chars, unique. Realistic scenario; the constraint goes in the last sentence. |
| `explanation` | ≥ 30 chars. |
| `difficulty` | `1` easy · `2` medium · `3` hard. |
| `en` | Optional English text. For bilingual exams it must mirror the option ids and distractor keys exactly. |

> [!NOTE]
> Spanish is the base language; English lives under `en`. If a question has no `en`, the English view falls back to Spanish.

## Validate

```bash
npm run validate:bank
```

The validator checks: valid JSON, unique ids and stems, known domain and scenario, option and answer consistency, one reason per distractor, `choose` equals the number of answers, English mirrors the Spanish structure, and prints per-domain counts, the multi-select ratio and the spread of correct-answer letters. CI runs it on every pull request.

## Adding questions

1. Append to the right file (or create a new `.json` in the exam folder).
2. Keep the correct letter spread even across A–D.
3. Write plausible distractors that reflect real anti-patterns, not absurd options.
4. For `ccaf`, add the `en` block.
5. `npm run validate:bank && npm test`.

## Writing guidelines

- **Original content only.** Base questions on the public exam guides; never copy exam dumps.
- Mix difficulties (mostly level 2) and cover distinct sub-topics instead of repeating one trap.
- Use only facts you can verify against current official documentation.
- Prefer relative comparisons to exact prices.
