---
title: 'Signal-processing ML for structural health monitoring'
org: Self-directed
period: '2023 – 2024'
status: archived
stack:
  - SSA
  - AMUSE (BSS)
  - Sparse autoencoders
  - Gaussian processes
  - MATLAB / Python
problem: >-
  Structural damage shows up as a shift in modal frequencies and mode shapes,
  but field sensor data arrives buried in noise heavy enough that conventional
  modal identification returns modes that are not there — and a false positive
  on a bridge is expensive in a different way from a false negative.
approach: >-
  Singular spectrum analysis combined with AMUSE blind source separation to
  recover modal frequencies and mode shapes from noisy multi-channel response,
  exploiting the temporal structure of vibration modes rather than assuming
  statistical independence alone. A sparse autoencoder on the recovered modal
  features then quantifies damage location and extent, with a Gaussian-process
  digital twin of linear oscillators providing physics-grounded expectations to
  compare against.
result: >-
  MAC 0.971 on recovered mode shapes and MSE 8.2e-05 on damage quantification,
  under noise levels where direct modal identification fails. Technical paper
  drafted.
featured: false
order: 25
repo: null
writeup: null
papers: []
resultIsPlaceholder: false
---

## Why SSA before BSS

Blind source separation on raw vibration data has a hard time: ICA-family
methods lean on non-Gaussianity, and structural response under ambient
excitation is close to Gaussian, which is precisely the case where the
assumption gives out.

**SSA** first, then **AMUSE**, works because AMUSE separates using *time-lagged
second-order statistics* rather than higher-order independence — and vibration
modes are exactly the kind of source that has distinguishable temporal
autocorrelation. SSA's trajectory-matrix decomposition front-loads that
structure and drops the noise components before separation runs.

**MAC 0.971** is the number that matters here: modal assurance criterion against
known mode shapes, under noise where direct identification returns spurious
modes.

## Sparse, deliberately

The damage-quantification autoencoder is sparse for a reason beyond
regularisation. Damage is *local* — a crack changes a few modal coordinates, not
the global response — so a sparsity penalty pushes the latent code toward one
where a small number of active units correspond to a small number of affected
regions. A dense code of the same capacity fits equally well and tells you
nothing about location.

**MSE 8.2e-05** on location and extent.

## The digital twin as a reference

A **Gaussian-process** surrogate of linear dynamic oscillators supplies the
undamaged baseline the pipeline compares against — and, being a GP, supplies
predictive variance with it. That matters in this application: a deviation
inside the model's own uncertainty is not evidence of damage, and a point-estimate
surrogate cannot make that distinction.

## Status

Three connected pieces — modal identification, damage quantification, the
physics-based twin — with a technical paper drafted and not submitted. The honest
limitation is that all of it is validated on simulated and lab-scale response;
field data has its own failure modes (temperature-driven modal drift especially,
which looks exactly like damage) that this pipeline does not yet separate out.
