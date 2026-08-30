---
title: 'Filter pruning in ResNet-50 / VGG-19 via genetic search'
org: Self-directed
period: 'Sep – Nov 2023'
status: archived
stack:
  - PyTorch
  - Genetic algorithms
  - Pareto optimisation
  - HPC
problem: >-
  Which convolution filters can be removed from a trained network is a
  combinatorial choice, and the magnitude heuristics that dominate practice
  score each filter in isolation — blind to the fact that redundancy is a
  property of filter sets, not of single filters.
approach: >-
  Framed pruning as evolutionary search over binary-genome filter masks, one bit
  per filter, with fitness evaluated jointly on parameter count and accuracy.
  Knee-guided selection walks the complexity–accuracy Pareto front to the point
  of diminishing return rather than fixing a compression target in advance. The
  architecture was decomposed so candidate fitness evaluations run in parallel
  on HPC.
result: >-
  Parameters −78% on VGG-19 at −2% accuracy, and −82% on ResNet-50 at −4%
  accuracy — the harder result, since ResNet's residual connections make whole
  channels structurally load-bearing.
featured: false
order: 22
repo: null
writeup: null
papers: []
resultIsPlaceholder: false
---

## Redundancy is a property of sets

The standard heuristic ranks filters by weight magnitude and cuts the tail. It
works reasonably and it cannot see the thing that matters: two filters that are
individually large and mutually near-identical are together redundant, and
magnitude ranking keeps both.

A binary genome — one bit per filter, the mask *is* the individual — makes the
unit of selection the whole set. Crossover and mutation explore combinations
directly, so a pair the heuristic would preserve can be broken up if the
population finds it profitable.

## Knee-guided, not target-driven

Fixing "prune to 70%" in advance decides the trade-off before you know its
shape. Fitness is instead evaluated jointly on parameter count and accuracy, and
selection is guided to the **knee** of the Pareto front — the point past which
each additional parameter removed costs disproportionately more accuracy.

Where that knee sits is the answer, not an input.

## Cost, and why HPC

The obvious objection to evolutionary pruning is cost: every candidate needs a
fitness evaluation, and a fitness evaluation is a forward pass over validation
data. The generation loop is embarrassingly parallel though, so the architecture
was decomposed to evaluate candidates concurrently across HPC nodes.

## The two results are not equally hard

VGG-19: **−78% parameters at −2% accuracy**. ResNet-50: **−82% at −4%**.

VGG is a stack of plain convolutions and forgives aggressive pruning. ResNet's
residual connections mean a channel removed in one block changes what the skip
connection carries downstream — filters are structurally load-bearing in a way
VGG's are not. Higher compression there cost twice the accuracy, which is the
expected direction and the reason the two numbers should not be read as one
result.
