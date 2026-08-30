---
title: 'Multimodal entity extraction from image-based text'
org: Amazon ML Challenge
period: 'Sep 2024'
status: archived
stack:
  - DocTR / EasyOCR
  - Llama 3.1-Instruct 7B
  - Qwen-VL 2B / 7B
  - ViT
  - HuggingFace
problem: >-
  Extract structured product attributes — weight, volume, dimensions, wattage —
  from photographs of packaging, where the text is small, rotated, partially
  occluded, and inconsistently formatted across brands.
approach: >-
  Two routes benchmarked head to head. The pipeline route runs OCR (DocTR,
  EasyOCR) over the image, regex-normalises the recovered spans, and feeds them
  to a prompt-tuned Llama 3.1-Instruct 7B for attribute assignment. The direct
  route skips OCR entirely and puts the image into a VLM — Qwen-VL 2B and 7B,
  with a ViT baseline — reading attributes straight off the pixels.
result: >-
  F1 0.67. The interesting finding was where each route fails: OCR→LLM loses on
  layout-dependent attributes where reading order carries meaning, and the VLM
  loses on small dense text that OCR resolves cleanly.
featured: false
order: 21
repo: null
writeup: null
papers:
  - prefix-tuning-optimizing-continuous-prompts-for-generation
  - gliner-generalist-model-for-named-entity-recognition
  - beyond-extraction-contextualising-tabular-data-for-summarisation
resultIsPlaceholder: false
---

## Two routes, and the reason to build both

The obvious pipeline is OCR then LLM: a specialist reader recovers the text, a
language model decides what each string means. The obvious alternative is a VLM
that does both at once. Which wins is not knowable in advance, so both were
built.

**OCR → LLM.** DocTR and EasyOCR over the image, then regex normalisation of the
recovered spans — because `1.5 kg`, `1,5kg` and `1500 g` are the same fact and a
prompt-tuned model should not have to spend capacity learning that. Llama
3.1-Instruct 7B, prompt-tuned rather than fully fine-tuned, assigns normalised
spans to attributes.

**Direct VLM.** Qwen-VL at 2B and 7B, with a ViT baseline, reading attributes
off the pixels with no intermediate text representation.

## Where each one breaks

F1 0.67 overall, but the aggregate hides the useful result — the two routes fail
on **disjoint** inputs.

The OCR pipeline loses **layout**. Once text is a bag of normalised spans, the
fact that `250` sat directly beneath the word `Net Weight` in a table is gone,
and the LLM has to guess which number belongs to which attribute. On packaging,
that spatial relationship often *is* the label.

The VLM loses **small dense text**. Where OCR resolves a 6-point ingredients
panel cleanly, the VLM reads confidently and wrongly — and unlike OCR, it gives
no confidence signal you can threshold on. A wrong OCR read looks like garbage;
a wrong VLM read looks like an answer.

Which suggests the right architecture is neither route alone but OCR spans
supplied to the VLM *with* their bounding boxes — text where OCR is reliable,
pixels where layout matters. Not built inside the competition window.
