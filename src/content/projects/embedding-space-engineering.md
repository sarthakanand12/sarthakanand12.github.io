---
title: 'Embedding-space engineering for conversation taxonomy'
org: Convin
period: '2026'
status: production
stack:
  - mmBERT
  - Supervised contrastive loss
  - Relational distillation
  - Go
  - TEI (Rust)
  - MiniLM
problem: >-
  Telling an IVR/bot utterance from a human one is easy for a human and hard for
  an off-the-shelf embedding model — the two classes sit in overlapping regions
  of embedding space, across many languages and both native and Roman scripts.
approach: >-
  Treat it as a geometry problem rather than a classifier problem. A 7-metric
  geometry suite plus cross-lingual FLORES alignment scoring diagnosed
  mmBERT-base as having ≈0 IVR/human separation margin over 23 scenarios and 13
  languages. Fine-tuned the encoder with supervised contrastive loss and
  hard-negative mining on language-stratified splits, then added a relational
  distillation term — a frozen-teacher pairwise-similarity penalty — to recover
  cross-lingual alignment without giving back separation.
result: >-
  Separation margin 0/23 → 23/23 scenarios (+0.96 held-out), closing a 0.9996
  AUC leak. Shipped into a real-time Go voicemail-detection service on the live
  call path: 89% precision / 93% recall (AUC 0.98) on 3,612 gold-labelled calls,
  against 59% precision for the legacy telephony heuristic. Served via TEI at
  28.6K texts/s peak, p99 41 ms at 19.2K texts/s.
featured: true
order: 4
repo: null
writeup: null
papers:
  - supervised-contrastive-learning-supcon
  - supcl-seq-supervised-contrastive-learning-for-sequence-representations
  - pooling-and-semantic-shift-challenges-in-long-text-embedding-and-retrieval
  - m3-embedding-bge-m3-multi-linguality-multi-functionality-multi-granularity
  - setfit-efficient-few-shot-learning-without-prompts
  - gliner-generalist-model-for-named-entity-recognition
  - does-transliteration-help-multilingual-language-modeling
  - privileged-information-distillation-for-language-models
  - minimizing-flops-to-learn-efficient-sparse-representations
resultIsPlaceholder: false
---

## Measuring before training

The instinct is to fine-tune first and check accuracy after. That hides the
interesting question, which is whether the embedding space has any usable
structure to begin with.

So the harness measures geometry directly — a 7-metric suite (silhouette,
Davies-Bouldin, Calinski-Harabasz, intra- versus inter-class cosine, and
separation margin) plus cross-lingual alignment scored on FLORES. The verdict on
mmBERT-base was unambiguous: **≈0 separation margin across 23 scenarios and 13
languages**, native script and Romanized. There was no classifier to be built on
that space — a downstream head reporting decent accuracy was papering over a
geometry that did not encode the distinction at all.

## Contrastive fine-tuning, and the leak it exposed

Supervised contrastive loss with hard-negative mining on language-stratified
splits. Triplet loss was benchmarked as the alternative and lost — with 23
scenarios the batch-level structure SupCon exploits is worth more than triplet's
per-anchor view.

The first run scored **0.9996 AUC**, which is not a result, it is a bug report.
The split was leaking: near-duplicate utterances straddling train and held-out.
Language-stratified splits closed it. The honest number after that is what
matters — separation margin **0/23 → 23/23** scenarios, **+0.96** held out.

## The regression that came with the gain

Separation improved and cross-lingual alignment fell **−0.15**. The encoder had
bought its margin partly by letting languages drift apart from each other — a
perfectly good way to separate two classes and a bad property for a multilingual
production model.

The fix is a **relational distillation** term: a frozen copy of the pre-finetune
encoder is the teacher, and the loss penalises divergence in *pairwise
similarity structure* rather than in absolute embedding position. The student is
free to move the whole space to gain margin, but not to rearrange which points
sit near which. That recovered alignment without giving back separation.

## The multilingual/script axis

Utterances arrive in many languages, in native script and in Roman
transliteration of the same content. A data point therefore carries both a
`language` and a `script` field, and transliterated rows are marked as such —
because a model that separates the classes only in Roman script has not learned
what it appears to have learned.

## Shipping it onto the live call path

A lightweight MLP head on frozen embeddings handles action decisioning; joint
encoder+head fine-tuning under an accuracy/margin gate took accuracy **80% →
90%** over a GPT-4o-mini baseline, cutting both FPR and FNR rather than trading
one for the other.

In production it is a **Go** voicemail-detection (AMD) service in the real-time
call path. Two details carry it: a **reorder buffer**, because per-chunk scores
return asynchronously and a decision made on out-of-order chunks is a decision
made on a different call; and **cost-asymmetric decisioning**, because hanging
up on a human costs far more than leaving a message for a machine.

Field-validated on **3,612 gold-labelled calls: 89% precision / 93% recall, AUC
0.98** — against **59% precision** for the legacy telephony-heuristic baseline
it replaced.

## Serving economics

Embeddings serve through **TEI** (Rust) on a single A10. mmBERT's throughput
ceiling was the constraint, so the production backbone switched to **MiniLM**
in fp16 with fp32-parity verified: **28.6K texts/s** peak, and a committed SLO
of **p99 41 ms at 19.2K texts/s** — roughly 22× mmBERT's ceiling on the same
GPU.
