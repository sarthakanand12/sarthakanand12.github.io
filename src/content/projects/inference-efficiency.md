---
title: 'Model adaptation & inference efficiency'
org: Convin
period: '2025 – 2026'
status: production
stack:
  - Qwen
  - Gemma
  - SFT / PEFT
  - KV-cache
  - tiktoken
problem: >-
  General-purpose models under-perform on consumer-conversation NER and
  insight extraction, and the enterprise inference endpoint offers no native
  prompt-cache guarantee — so every call pays full price for context that never
  changes.
approach: >-
  SFT of Qwen and Gemma models on consumer conversation data for NER and
  AI-insight extraction. Separately, restructured prompt templates so the
  invariant context sits in a stable prefix, and routed per-role
  prompt_cache_key values to keep each role's prefix hot on an endpoint with no
  cache guarantee of its own.
result: >-
  61% of a live production call measured cacheable static context, giving a
  ~30% projected input-cost reduction at list pricing — projected, not banked;
  it is one call profiled with a cl100k_base proxy tokenizer.
featured: false
order: 6
repo: null
writeup: null
papers:
  - gliner-generalist-model-for-named-entity-recognition
  - t-few-few-shot-peft-is-better-and-cheaper-than-in-context-learning
  - dlp-lora-efficient-task-specific-lora-fusion
  - prefix-tuning-optimizing-continuous-prompts-for-generation
  - sarathi-efficient-llm-inference-via-chunked-prefills
  - llmlingua-compressing-prompts-for-accelerated-inference
  - selective-context-compressing-context-to-enhance-inference-efficiency
  - arctic-inference-with-shift-parallelism
  - tessy-teacher-student-cooperation-framework-for-sft-data
resultIsPlaceholder: false
---

## Adaptation

Consumer conversation is its own domain — disfluent, code-mixed, and full of
entities (plan names, branch codes, product SKUs) that no general NER model has
seen. SFT of Qwen and Gemma checkpoints on in-domain conversation data covers
both the entity extraction and the downstream AI-insight extraction that reads
those entities.

## Prompt caching without a cache guarantee

The inference endpoint in use offers no native prompt-cache guarantee, which is
the awkward case: the cost saving is real and available, but only if the caller
does the work.

Two changes:

**Template restructuring.** A prompt cache is a prefix cache — it only helps if
the bytes at the front of every request are identical. So templates were
reordered to put every invariant (system rules, schema, few-shot exemplars)
ahead of anything per-call, instead of interleaving them for readability.

**Per-role `prompt_cache_key` routing.** Different roles have different
invariant prefixes. Keying by role keeps each one hot rather than letting them
evict each other.

## What the number actually is

`tiktoken` profiling of one live production call found **61% of its input tokens
were cacheable static context**, implying a **~30% projected** input-cost
reduction at list pricing.

Stated precisely because the precision matters: that is *projected*, not saved.
It is one call, and the token count came from a `cl100k_base` proxy rather than
the serving model's own tokenizer. The ratio is directionally right and the
absolute figure should not be quoted as banked savings.
