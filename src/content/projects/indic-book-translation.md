---
title: 'Indic book translation — multi-stage correction pipeline'
org: Convin
period: '2026'
status: shipped
stack:
  - Gemma
  - LangGraph
  - PPO
  - RLHF
  - DSPy
  - 2× H200
problem: >-
  Textbook translation into regional Indian languages degrades badly on
  off-the-shelf models — format, grammar and terminology drift apart across a
  page, and worse on low-resource languages.
approach: >-
  A Gemma harness over 300 NCERT pages × 18 Indian languages, with a
  phrase-level-trained draft model behind an [N]-sentinel block codec that
  survives Indic tokenization and translates a whole page in one call at 1:1
  alignment. The error corrector is a 10-node LangGraph loop — parallel
  script-purity and terminology checkers → aggregate → propose → verify →
  apply — with propose split from verify so no edit lands unreviewed, bounded
  at 4 passes with a two-strikes give-up rule.
result: >-
  ~5 s per page on 2× H200; PPO training on a hybrid ORM+PRM reward cut passes
  to convergence 4.4 → 3.1. Reviewers scored the output 9/10 and above the
  incumbent NCERT translation, and the work won a Ministry of Education (AICTE)
  tender.
featured: true
order: 3
repo: null
writeup: null
papers:
  - does-transliteration-help-multilingual-language-modeling
  - a-comparison-of-different-machine-transliteration-models
  - m3-embedding-bge-m3-multi-linguality-multi-functionality-multi-granularity
  - a-vision-researcher-s-guide-to-rl-ppo-grpo
  - dpo-direct-preference-optimization
  - neural-text-degeneration-with-unlikelihood-training
  - privileged-information-distillation-for-language-models
  - gopo-goal-oriented-preference-optimization
resultIsPlaceholder: false
---

## The alignment problem comes first

Translating a textbook page block-by-block is safe and useless — you lose the
page. Translating it in one call is what you want, and the thing that breaks is
alignment: the model returns 41 blocks for 43 inputs and there is no way to know
which two it merged.

The fix is a block codec built on `[N]` sentinels — script-agnostic anchors
chosen because they survive Indic tokenization, where a Devanagari or Bengali
delimiter does not reliably round-trip. The draft model is trained at
**phrase level** rather than sentence level, which is what makes it hold the
codec under pressure. One call, whole page, 1:1 alignment.

## Propose is not the same node as verify

The corrector is a 10-node LangGraph loop. Script-purity and terminology
checkers run in parallel, their findings aggregate, and then — the load-bearing
decision — **propose** and **verify** are separate nodes. No edit reaches the
page without a second pass having agreed to it.

The loop is bounded at 4 passes, with a two-strikes rule: an error the corrector
has failed twice is marked unfixable and abandoned rather than retried forever.
Some errors in the source are not errors the translator can fix.

## Hallucination is bounded structurally, not by prompt

The model never emits prose. It emits **span-level edits**, which are applied by
a deterministic 3-tier splice — exact match, then regex, then fuzzy — over
NFC-normalized text, so Devanagari and Bengali conjuncts compare equal instead
of differing by combining-mark order.

That is the whole anti-hallucination story: a model that can only describe a
span cannot invent a paragraph. Drafting failures get a 6-step fallback chain
(temperature resample, block shuffle, per-block retry, context-surround) gated
on a length ratio computed with combining marks excluded.

## Training the corrector

PPO on a hybrid reward:

- **ORM** — the error set empties. The outcome that actually matters.
- **PRM** — per edit: `verified · applied · no-new-error`, plus a step penalty.

The step penalty is what gives turn-level credit assignment: without it, a
corrector that eventually converges scores the same as one that converges fast,
and inference cost is per pass. Passes to convergence went **4.4 → 3.1**.

## Global page intelligence

Two mechanisms stop the page from fragmenting:

A **librarian** pass extracts audience, register and exercise mechanics once per
page and conditions every block — so an exercise instruction is not translated
in the register of body prose.

A **glossary** maps source term → approved translation with explicit
`IGNORE`/`UPDATE` decisions, persisted across page and chapter. That is what
holds terminology stable over 22 chapters, where per-page consistency would not.

## Serving

Human evaluation feeds an RLHF loop and self-evolving correction rules, with
DSPy for prompt versioning and SHA-256 node caching so a re-run does not re-pay
for unchanged nodes. On 2× H200: ~5 s per page. Reviewers scored the output
**9/10**, and above the incumbent NCERT translation — which was the bar that
mattered, and the basis of the AICTE tender win.
