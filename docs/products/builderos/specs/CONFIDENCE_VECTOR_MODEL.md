<!-- SYNOPSIS: Confidence Vector Model — multi-dimensional confidence for any Twin. -->

# Confidence Vector Model

**SSOT:** `docs/products/builderos/PRODUCT_HOME.md`

## Purpose

A confidence vector captures how much weight Taloa gives to a belief, prediction, or model for any entity. It is used by the Reality Alignment Engine, the Human Constellation, the Causality Engine, the Calibration Ledger, and every Twin. It separates confidence from certainty and records the evidence behind it.

## Dimensions

| Dimension | Meaning |
|---|---|
| `belief_strength` | How strongly the entity holds the belief (0–1). |
| `evidence_support` | How much independent, trustworthy evidence supports it (0–1). |
| `behavior_alignment` | How consistent the entity's actions are with the belief (0–1). |
| `emotional_weight` | Significance attached to the belief, not the intensity of the emotion (0–1). |
| `identity_attachment` | How central the belief is to identity or purpose (0–1). |
| `readiness` | How ready the entity is to act on or integrate the belief (0–1). |
| `trust` | Earned reliability of the source or model (0–1). |
| `confidence` | Combined scalar confidence (0–1). |

## Core functions

- `computeConfidenceVector(evidence)` — takes an evidence object and returns a vector with all dimensions.
- `combineConfidenceVectors(vectors, weights)` — merges multiple vectors, optionally weighted by source reliability.
- `calibrateConfidence(vector, outcome)` — adjusts confidence after an observed outcome.

## Rules

- Confidence is not probability. It is a structured summary of how much weight to place on something while remaining open to revision.
- A vector with high `belief_strength` but low `evidence_support` is a flag, not a strength.
- Calibration reduces confidence faster when a prediction was made with high confidence and was wrong.
