---
title: 'LLM agent eval & self-optimisation harness'
org: Convin
period: '2026'
status: active
stack:
  - Python
  - asyncio
  - DSPy
  - GEPA / MIPROv2
  - LLM-as-judge
  - tiktoken
problem: >-
  One aggregate score tells you nothing about which failure mode regressed — and
  an optimiser pointed at that score will happily delete a safety rule it cannot
  see.
approach: >-
  An eval harness replaying a production Next-Best-Action chatbot:
  persona-policy user simulation with adversarial commitment (non-agreeable by
  construction), a RAG-fixtured action loop, and LLM-as-judge rubric scoring.
  Criteria are atomic and binary — no partial credit — verified structurally
  where checkable and adjudicated by a 3-judge panel (Qwen, gpt-oss, Gemma)
  elsewhere, scoring raw traces rather than summaries.
result: >-
  Pass rate 24% → 76%. Optimisation runs on a Pareto front of weighted score ×
  turns-to-resolution: 0.21/18 → 0.67/10, a 3× margin over the ±0.14 noise
  floor fixed by 16 passes per trial — score-dominant configs are discarded on
  turn cost.
featured: true
order: 1
repo: null
writeup: null
papers:
  - judging-llm-as-a-judge-with-mt-bench-and-chatbot-arena
  - meta-harness-end-to-end-optimization-of-model-harnesses
  - skillopt-executive-strategy-for-self-evolving-agent-skills
  - agentic-harness-engineering
  - dive-into-claude-code
  - llms-get-lost-in-multi-turn-conversation
  - ares-automated-evaluation-framework-for-rag-systems
  - a-practitioner-s-guide-to-multi-turn-agentic-reinforcement-learning
resultIsPlaceholder: false
---

## Establish the noise floor before claiming a win

The first number this harness produced was not a score. It was **±0.14** — the
run-to-run spread across 16 passes per trial on an unchanged agent.

Everything downstream depends on that. A prompt edit that moves the aggregate by
0.09 has moved nothing, and without the floor there is no way to know it. No
edit in this loop is called a win beneath the floor.

## Atomic binary criteria

Partial credit is where rubrics go to die: a criterion scored 0.6 encodes a
judge's mood, not a fact about the transcript. So every criterion is atomic and
binary — it either happened or it did not.

Where a criterion is structurally checkable (was the retrieval call made? was
the closing statement present?) it is verified in code, not by a model. What
remains goes to a **3-judge panel** — Qwen, gpt-oss, Gemma — which reads **raw
traces**, not summaries. A summariser between the trace and the judge is an
extra model with its own failure modes, silently deciding what the judge is
allowed to see.

## The user simulator has to be hostile

A persona simulator that concedes when pushed measures nothing, because the
production failure mode is a user who does not concede. So the sim is built on
**persona-policy with adversarial commitment**: non-agreeable by construction,
holding its objection across turns instead of accepting the agent's first
reframe. The action loop runs against RAG fixtures so retrieval is held constant
while the prompt varies.

## Optimising on a Pareto front, not a score

An agent that resolves a case in 18 turns and one that resolves it in 10 are not
equivalent, and a single weighted score cannot say so. Optimisation therefore
runs on a front of **weighted score × turns-to-resolution**: **0.21/18 →
0.67/10**, roughly 3× the noise floor on the score axis while halving turn cost.

Configurations that dominated on score alone were discarded on turn cost. That
only happens if turns are in the objective rather than in a post-hoc note.

## Two rubrics, because one of them lies to the optimiser

The finding worth more than the lift: every signal a DSPy self-optimisation loop
receives derives from one fixed, human-authored criteria set. If that set does
not probe the hand-hardened anti-hallucination and closure rules, **GEPA can
strip them and the metric will not move** — reward misalignment, straightforwardly.

The fix was to split a **frozen regression rubric** from a **discovery rubric**
mined from live traces. The frozen set guards against regression; the discovery
set found pricing failure modes the frozen set was blind to. Each prompt edit is
now **pre-registered** with a predicted fix *and* a predicted regression, then
measured — so a change that helps for the wrong reason is visible as such.

## Inference economics

Separately, `tiktoken` profiling of a live production call found **61% of its
input tokens were cacheable static context**. Routing per-role
`prompt_cache_key`s gives a ~30% *projected* input-cost reduction at list
pricing — projected, not saved; it is one call measured with a `cl100k_base`
proxy.

## What is still weak

Worth saying out loud rather than having it extracted: the judge panel is
uncalibrated — MAE against a gold fixture was never established, so agreement
between three models is not the same as agreement with a human. And the noise
floor, though measured over 16 passes, was measured on one agent configuration.
