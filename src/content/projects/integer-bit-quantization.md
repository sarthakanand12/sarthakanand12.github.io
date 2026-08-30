---
title: 'Integer-bit quantization in DNNs — PyTorch vs TensorFlow'
org: Self-directed
period: 'Jul – Aug 2023'
status: archived
stack:
  - PyTorch
  - TensorFlow
  - PTQ
  - CUDA
problem: >-
  Post-training quantization is advertised as a drop-in win, but the two major
  frameworks implement it differently enough that the storage and throughput
  numbers do not transfer between them — and neither documents where its
  accuracy actually breaks.
approach: >-
  Implemented post-training quantization in both PyTorch and TensorFlow and
  compared them on the same networks at matched bit widths, with multi-threaded
  multi-core GPU execution, measuring weight-matrix storage, throughput and
  accuracy degradation rather than accepting a single framework's reported
  figures.
result: >-
  Reduced weight-matrix storage at higher throughput in both frameworks, with
  the per-framework differences traceable to calibration and per-channel versus
  per-tensor scale granularity rather than to the arithmetic itself.
featured: false
order: 24
repo: null
writeup: null
papers: []
resultIsPlaceholder: false
---

## Why compare frameworks at all

PTQ is a small amount of arithmetic and a large amount of convention. Both
frameworks map float weights to integers and both report a compression ratio,
but they differ on where the scale factor lives (per tensor or per channel), how
the calibration set determines the clipping range, and which layers they refuse
to quantize by default.

Those choices, not the integer arithmetic, are what move accuracy. Running both
on the same networks at the same bit widths is the only way to see which
differences are real.

## What the numbers came down to

Storage falls as expected — the arithmetic is not where frameworks differ.
Throughput gains were sensitive to whether the kernel actually had an integer
path for the layer in question or silently dequantised, which is easy to
mistake for a quantization result when it is a kernel-coverage result.

Accuracy degradation tracked **scale granularity** most strongly: per-channel
scales tolerate outlier-heavy weight distributions that per-tensor scales
clip, and the layers that suffered were the ones with the widest per-channel
variance.

## Where this went

Superseded by production quantization and serving work at Convin, where the
constraint is a latency SLO rather than a benchmark table — but the framework
comparison is why I read a reported compression ratio as a claim about
calibration first and about bit width second.
