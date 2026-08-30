---
title: 'Text-to-SQL agent over enterprise databases'
org: Convin
period: '2025 – 2026'
status: production
stack:
  - Python
  - Neo4j
  - Vector search
  - GRPO
  - Model routing (1.7B / 32B)
  - Speculative decoding
problem: >-
  Analysts need answers that span eight databases; a single-shot text-to-SQL
  call cannot resolve cross-database foreign keys, and putting ~1600 columns in
  a prompt is neither affordable nor accurate.
approach: >-
  A multi-hop agent — intake → classify_intent → discover_schema →
  resolve_values → supervisor → plan_sql → generate → evaluate. A Neo4j
  knowledge graph holds the full ERD; vector search over column descriptions
  plus a shortest-path walk carves the minimal distinguishing schema — the
  smallest table set that still separates the query — as SQL-construction
  context. N candidate queries are generated from divergent reasoning
  strategies, executed in parallel and cross-verified, with oracle selection
  over the candidate set rather than self-consistency voting.
result: >-
  46% first-turn and 86% second-turn accuracy at 95% user satisfaction, over 8
  databases, 45 tables and ~1600 columns — validated both wide (86-column
  tables) and deep (500K rows). The whole fan-out stays affordable on 1.7B
  models behind a 32B reasoning supervisor.
featured: true
order: 2
repo: null
writeup: null
papers:
  - next-generation-database-interfaces-a-survey-of-llm-based-text-to-sql
  - dcg-sql-enhancing-in-context-learning-with-deep-contextual-schema-link-graph
  - sql-palm-improved-llm-adaptation-for-text-to-sql
  - h-star-llm-driven-hybrid-sql-text-adaptive-reasoning-on-tables
  - weaver-interweaving-sql-and-llm-for-table-reasoning
  - blendsql-a-scalable-dialect-for-unifying-hybrid-question-answering
  - eagle-3-scaling-up-inference-acceleration-via-training-time-test
  - suffixdecoding-extreme-speculative-decoding-for-agentic-applications
  - dopd-dual-on-policy-distillation
  - a-vision-researcher-s-guide-to-rl-ppo-grpo
  - deepseekmath-pushing-the-limits-of-mathematical-reasoning
resultIsPlaceholder: false
---

## The schema problem is a retrieval problem

Eight databases, 45 tables, roughly 1600 columns. The naive approach — paste the
schema, ask for SQL — fails twice over: the context cost is prohibitive, and the
model has no way to know that a customer ID in one database is the same entity
as a subscriber ID in another.

Treating the ERD as a graph fixes both. Vector search over column descriptions
finds candidate entry points; a shortest-path walk between them returns the join
route, including the foreign keys that cross a database boundary. What reaches
the LLM is not a catalog and not even a subgraph — it is the **minimal
distinguishing schema**, the smallest table set that still separates this query
from its neighbours.

## N candidates, then an oracle

One prompt produces one query and no way to know if it is right. So the agent
generates N candidates from deliberately divergent reasoning strategies —
divide-and-conquer decomposition, query-plan-first, markdown DDL versus a raw
`PRAGMA` dump as schema representation — executes them in parallel, and
cross-verifies the results.

Selection is by **oracle**, not by self-consistency vote. Majority agreement
over candidates rewards the most likely error as readily as the right answer;
an oracle over executed results asks a different, checkable question.

## The verifier, and what it is trained on

The oracle is a GRPO-finetuned SQL verifier, and the axis it is trained on
matters more than the algorithm: it scores **retrieved columns**, not
query-string similarity. Two correct queries can look nothing alike.

The reward is deliberately coarse — **1** for an execution-result match, **0.1**
for valid-but-wrong SQL, **0** for malformed. The 0.1 rung exists so the model
is not indifferent between "wrong answer" and "syntax error"; the gap between
1 and 0.1 keeps it from optimising for mere parseability.

Training data was curated by a **k-sample difficulty filter**: sample each
question k times with the base model and drop both the 0/k questions (no signal,
just noise) and the k/k ones (already solved, no gradient). What survives is the
band where the policy can actually move.

## Why two model sizes

Most hops in a decomposed query are narrow: classify an intent, resolve a
literal to a canonical value, pick a column. Those do not need a frontier model.
A 1.7B model handles them and a 32B reasoning model acts as supervisor and SQL
planner, gating what the small model produces. That ratio is what makes an
N-candidate fan-out affordable at all. Speculative decoding covers the latency
budget.

## Operational constraints that shaped the design

Read-only by construction — the agent has no write path, which removes a whole
class of failure from the threat model. Per-user-group encryption policy governs
what any given caller can see. Business rules and per-schema query conventions
live in persistent cross-session memory rather than the prompt, so they survive
a context reset. Drift monitoring diffs the knowledge graph against live catalog
metadata, because a schema migration that silently invalidates a join path is
the most likely way this breaks.

The audit trail is retained deliberately: it is training data for on-policy
distillation and RL, which is the path to making the small model carry more of
the load.
