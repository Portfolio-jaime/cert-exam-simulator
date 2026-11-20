# 🧮 Scoring

## Correctness

| Question type | Credit |
|---|---|
| `single` | The selected option equals the answer. |
| `multi` ("Select TWO / THREE") | **All-or-nothing**: the selected set must equal the answer set. One missing or one extra option scores zero. No partial credit. |

> [!TIP]
> The UI caps selections at `choose` options, like the real exam, so you cannot over-select by accident.

## Scaled score

```
scaled = round(100 + 900 × correct / total)      // 100 – 1000
passed = scaled ≥ 720
```

| Correct of 50 | Percent | Scaled | Result |
|---:|---:|---:|---|
| 34 | 68 % | 712 | ❌ below |
| 35 | 70 % | 730 | ✅ pass |
| 40 | 80 % | 820 | ✅ pass |
| 50 | 100 % | 1000 | ✅ pass |

> [!WARNING]
> The scaled score is an **estimate**. Neither exam publishes its real conversion formula, so treat ≈ 69 % as the pass line and aim for **80 % or more on consistent simulations**.

## Unscored items

The AWS full simulation has 65 items, 15 of them **unscored** and **hidden** (picked at random), as in the real exam. Only the 50 scored items count towards the score and the domain percentages. The Claude exam currently has no unscored items.

## Per-domain results

Each scored question belongs to one domain. The results screen shows `correct / total` and a percentage per domain, with a red bar under **70 %** and a "weakest domain" hint. The home screen aggregates your whole history into **readiness by domain**.

## Certificate vs report

| Attempt | PDF |
|---|---|
| Full simulation, scaled ≥ 720 | 🏅 **Certificate of practice** |
| Anything else | 📄 **Results report** (same layout) |

Both carry your name, date, mode, estimated score, per-domain table, duration and a unique ID (hash of attempt, name, date and score), and both state that they are practice documents, not official credentials.

## Timing

| Mode | Size | Time |
|---|---:|---:|
| AWS block | 22 | 44 min |
| AWS full | 65 | 130 min |
| Claude block | 20 | 40 min |
| Claude full | 60 | 120 min |
| Domain practice / review | block size | block time, capped at 2 min per question for short sets |

When the clock reaches zero the attempt is **auto-submitted** and flagged as such. The recorded duration never exceeds the limit.
