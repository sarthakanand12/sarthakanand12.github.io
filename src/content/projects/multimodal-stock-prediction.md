---
title: 'Multi-modal stock prediction — BiLSTM + FinBERT'
org: Self-directed
period: 'Jan – Mar 2024'
status: archived
stack:
  - PyTorch
  - BiLSTM
  - FinBERT
  - RSI / technical indicators
problem: >-
  Price history and news sentiment are both weak predictors of direction on
  their own, and they fail on different days — a time-series model is blind to
  the announcement that moved the price, and a sentiment model has no notion of
  where in a trend the news arrived.
approach: >-
  A dual-branch architecture over S&P 500 constituents modelling price momentum
  and market sentiment jointly. The time-series branch is a BiLSTM over
  RSI-engineered inputs; the sentiment branch is a fine-tuned FinBERT producing
  three-class sentiment over scraped news, fused with the price representation
  before the prediction head.
result: >-
  74.6% directional accuracy multi-modal, against 57.4% for the time-series
  branch alone — a 17-point gap that is the actual claim, since the absolute
  number is not comparable across differently-constructed splits.
featured: false
order: 23
repo: null
writeup: null
papers: []
resultIsPlaceholder: false
---

## The case for two branches

Each modality has a characteristic blind spot. A price-only model sees a gap
open and has no idea whether it is noise or an earnings miss. A news-only model
reads a bullish headline and cannot tell that the move was already priced in
three days ago.

Fusing them is only worth it if the errors are uncorrelated, which is the
hypothesis the 57.4% → 74.6% comparison tests. The ablation is the result here;
the headline accuracy is not.

## Time-series branch

**BiLSTM** over engineered technical inputs, RSI foremost. Bidirectional is
defensible in training over historical windows and is the thing to be careful
about — it must never see beyond the prediction point at inference, or the whole
number is leakage. Feature engineering rather than raw closes because RSI
encodes a mean-reversion prior that an LSTM would otherwise have to learn from
scratch on a very low signal-to-noise series.

## Sentiment branch

**FinBERT**, fine-tuned for three-class sentiment on scraped financial news.
Financial text needs a domain model: "shares plunged on better-than-expected
guidance" is not something a general sentiment classifier parses correctly, and
in finance the sign is the whole label.

## What I would not claim

74.6% directional accuracy is not a trading result. It is a classification
result on a historical split, and it says nothing about transaction costs, slippage,
or whether the news timestamps in the scraped corpus precede the price moves
they are credited with — which, for scraped news, is the assumption most likely
to be quietly false. The defensible claim is narrower: on this dataset, the
sentiment branch adds information the price branch does not have.
