---
title: 'Yaksha — omnichannel conversation intelligence'
org: Convin
period: '2026'
status: production
stack:
  - Go
  - gRPC
  - Postgres
  - WebRTC
  - BM25 + embeddings
  - Topic graph
problem: >-
  A voice agent that holds context across WhatsApp and email needs one state
  machine, not three — and every real-time turn has to survive barge-in,
  hangup and multi-second LLM latency without ever speaking from a context the
  caller did not hear.
approach: >-
  A two-service Go platform — control plane plus deliberative engine — behind a
  unified gRPC contract, with a bidirectional Turn stream using deferred state
  commit: unacknowledged turns are discarded on barge-in or hangup, so LLM
  context and delivered audio never diverge. The deliberative pipeline is
  bounded on the principle that the LLM proposes and deterministic gates veto,
  over hybrid BM25/embedding retrieval and a global slot-belief store.
result: >-
  Real-time voice path end-to-end (WebRTC → STT → FSM → TTS) with
  sentence-boundary chunking for immediate synthesis. DB pool starvation during
  multi-second LLM calls solved by optimistic concurrency — rev tripwires on
  versioned JSON blobs instead of row locks — with injectable I/O seams keeping
  the core test suite hermetic and sub-second.
featured: true
order: 5
repo: null
writeup: null
papers:
  - dfa-rag-conversational-semantic-router-with-definite-finite-automaton
  - hiertod-task-oriented-dialogue-driven-by-hierarchical-goals
  - gauchobot-building-robust-tod-systems-from-scratch
  - diaggpt-multi-agent-dialogue-system-with-automatic-topic-management
  - schema-graph-guided-prompt-for-multi-domain-dialogue-state-tracking
  - ppdpp-plug-and-play-dialogue-policy-planner
  - revisiting-clustering-for-efficient-unsupervised-dialogue-structure-induction
  - script-based-dialog-policy-planning-for-an-ai-therapist
  - multiturn-dialogue-generation-via-sentence-and-discourse-level-context
  - fusion-functions-for-hybrid-retrieval-unconfirmed
  - llms-get-lost-in-multi-turn-conversation
  - lisa-llm-guided-semantic-aware-clustering-for-topic-modeling
resultIsPlaceholder: false
---

## Deferred state commit

The failure that defines a voice agent: the model generates a turn, the state
machine commits it, the caller barges in before a word of it plays. Now the
context says the agent asked a question the human never heard, and every
subsequent turn is reasoning from a transcript that does not exist.

The Turn stream is therefore bidirectional and **commits state only on
acknowledgement**. An unacknowledged turn is discarded on barge-in or hangup.
The invariant that buys: LLM context and delivered audio are always the same
conversation.

## The pool starvation problem

An LLM call takes seconds. If a request holds a database row lock across that
call, the connection pool is exhausted by a handful of concurrent conversations
— and the naive fix, a bigger pool, just moves the cliff.

So state does not take locks. Conversation state lives as a **versioned JSON
blob** in Postgres, written under **optimistic concurrency**: read a revision,
do the slow work, write back with a rev tripwire, retry on conflict. Conflicts
are rare because two turns of one conversation are rarely concurrent, and when
they are, losing the race is correct behaviour.

I/O is decoupled behind injectable seams, which is what makes the core suite
hermetic and sub-second — the deliberation logic is testable without a database,
an STT provider, or a model.

## LLM proposes, deterministic gates veto

The deliberative pipeline is bounded by construction. Model output is a
*proposal*; deterministic gates decide whether it is allowed. That ordering is
the whole safety story — a prompt asking a model not to do something is a
request, a gate that rejects the turn is a guarantee.

Retrieval is hybrid **BM25 + embeddings**, because a caller quoting an exact
policy number needs lexical match and a caller describing their problem needs
semantic. A **global slot-belief store** tracks what the system already believes
it knows, so the agent stops asking for the account number it was given four
turns ago.

## A topic graph that maintains itself

The conversational topic graph is bootstrapped from **live human transcripts**
rather than hand-authored — the flows real agents use, not the flows a designer
imagined. An ingestion loop monitors live conversations and runs scheduled graph
revisions, creating nodes dynamically for out-of-distribution flows.

That last part matters: a fixed graph degrades the moment the business changes,
and the signal that it has changed arrives as conversations the graph cannot
route.

## The real-time path

End-to-end WebRTC → STT → FSM → TTS. Synthesis starts on **sentence
boundaries** rather than waiting for a full generation, which is most of the
perceived latency win — the caller hears the first clause while the rest is
still decoding.

## Proactive outreach

A separate idempotent orchestration loop drives next-best-action outreach.
Idempotency is not optional here — a retry that double-sends is a customer
receiving the same call twice. It carries burst debouncing, channel-specific
cooldown anchors, and DND time-shifting with daily spread caps, so a legitimate
sequence of nudges does not become harassment.
