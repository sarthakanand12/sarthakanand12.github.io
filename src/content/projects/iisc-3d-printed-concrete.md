---
title: 'ML surrogates for 3D-printed concrete'
org: IISc Bangalore
period: 'May – Jul 2023'
status: archived
stack:
  - LSTM
  - Random Forest
  - SVR
  - FEM
problem: >-
  3D-printed concrete has to carry load in three directions at once, and its
  strength depends jointly on chemical, rheological and structural composition.
  FEM answers the question correctly and far too slowly to inform a print in
  progress.
approach: >-
  Characterised tri-directional strength across composition combinations at the
  Centre for Sustainable Technologies, then trained an LSTM over 40 FEM models
  to predict stress distribution on already-cured layers as a real-time
  surrogate. Random Forest, decision trees and SVR were benchmarked against
  each other on the strength-prediction task.
result: >-
  LSTM surrogate at MAE 0.43 with 0.6 s runtime, fast enough to run during a
  print rather than after it. Random Forest won the strength benchmark at
  R² 0.97, MAE 4.
featured: false
order: 31
repo: null
writeup: null
papers: []
resultIsPlaceholder: false
---

## Why a surrogate at all

FEM is the ground truth here, and it is not the problem. The problem is that a
print is a sequential process — each new layer loads the ones below it, already
cured — and a simulation that takes minutes cannot tell you whether the layer
you are about to lay down will fail the one under it.

So: 40 FEM models as the training set, an **LSTM** to learn the layer-by-layer
stress evolution, and **0.6 s** inference at **MAE 0.43**. Sequential
architecture because the input genuinely is a sequence of deposition steps, not
an unordered feature vector.

## The strength benchmark

Separately, predicting tri-directional strength from composition — chemical,
rheological and structural variables together. **Random Forest** benchmarked
best (**R² 0.97, MAE 4**) against decision trees and SVR.

With 40-odd composition combinations, that result is unsurprising in hindsight:
the ensemble's variance reduction is worth more at this sample size than SVR's
margin formulation, and a single decision tree has nothing to average against.
The honest caveat is the same one — a benchmark at this sample size ranks the
models on this dataset, not in general.
