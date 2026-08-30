---
title: 'Vendor–client matchmaking and regional risk grading'
org: JSW One Platforms
period: 'May – Jul 2024'
status: shipped
stack:
  - Python
  - ListNet (LTR)
  - PCA
  - UMAP
  - Salesforce / PowerBI
problem: >-
  Matching a client request to the right vendor was a manual judgement call, and
  the signals that should inform it — KPI history, regional risk, free-text
  feedback — lived in different systems in incomparable forms.
approach: >-
  Built a matchmaking and regional risk-grading workflow on KPI-derived vendor
  features, with sentiment analysis over free-text feedback folded in. PCA and
  UMAP reduced the raw feature space to an 8-feature signal set, then a ListNet
  learning-to-rank model with a probabilistic loss ordered vendors per request
  rather than scoring each one independently.
result: >-
  NDCG 0.85 on held-out requests, with scores surfaced to the sales team through
  the existing Salesforce / PowerBI stack rather than a new interface.
featured: false
order: 30
repo: null
writeup: null
papers:
  - rearank-reasoning-re-ranking-agent-via-reinforcement-learning
resultIsPlaceholder: false
---

## Ranking, not scoring

The instinct is to build a regressor: predict a suitability score per vendor,
sort by it. That optimises the wrong thing. Nobody consumes the absolute score —
they consume the top few vendors for *this* request, and a model trained on
pointwise error will happily sacrifice the ordering at the top to reduce error
in the long tail where nothing is ever selected.

**ListNet** takes the whole candidate list as the training unit and a
probabilistic loss over permutations, so the objective is the ordering itself.
NDCG 0.85 is measured on the thing the workflow actually uses.

## Compressing the feature space

Vendor KPI history plus free-text feedback sentiment produced far more raw
features than the labelled request volume could support. PCA and UMAP together
cut it to an **8-feature** signal set — PCA for the linear variance structure,
UMAP where the manifold was not linear.

## Delivery constraint

The scores had to arrive inside **Salesforce and PowerBI**, because that is
where the sales team already worked. A model behind a new dashboard is a model
nobody consults; this one shows up in the record the rep already has open.
