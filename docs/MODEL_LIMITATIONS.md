# Model Limitations — read before trusting any output

**Status: research prototype.** Video checkpoints have documented, measured
weaknesses; the image model has published benchmark metrics that have not been
independently reproduced for this deployment. The application displays genuine
model output, but it must not be presented as forensic evidence.

## AI-generated image detection

Image uploads use [Abacus.AI Smaug](https://huggingface.co/abacusai/Smaug-AI-Image-Detector),
a local Apache-2.0 model pinned to revision
`c7c95951e04a87b884a4ad479401b1128c3903bd`. It analyzes three native-resolution
528×528 crops from the full image; no face detection or hosted inference API is
used. The model card reports 0.982 average AUC on OpenFake Reddit, OpenFake Core,
and CommunityForensics. Those results are model-author benchmarks, not an
independent evaluation of this project.

- Scores are uncalibrated and are not proof of authenticity or generation.
- This deployment uses a 0.35 decision threshold rather than 0.50 to favor
  catching more AI images; this may also flag more real photos, and has not been
  calibrated against a representative evaluation set.
- Small AI-edited regions may be missed; very new generators may evade detection.
- The model is intended for photographs; screenshots, illustrations, graphics,
  and heavily edited images may be misclassified.
- Do not use the result alone for consequential decisions.

## Measured performance (validation split, Phase 0 + threshold study)

| Model / path | ROC-AUC | Notes |
|--------------|---------|-------|
| V1 full-sequence (n=216) | 0.670 | overfits: train AUC 0.819 |
| V2 full-sequence (n=219) | 0.603 | underfits: train AUC 0.643 |
| V2 deployed ensemble (n=24 sample) | 0.819 | better than full-sequence; small sample — needs confirmation |

At the historical 0.75 threshold V1 missed 84.7% of fakes and V2 missed 99.3%
on the full-sequence eval. The 0.60 development threshold on the ensemble path
recovers recall (0.92) at the cost of false alarms (FPR 0.50) on the same small
sample. Full numbers: `evaluation/EVALUATION.md`, `evaluation/THRESHOLD_ANALYSIS.md`.

## Why the models are weak (evidence-ranked)

1. **Both checkpoints were trained on 67 videos** (54 train / 13 val) — the
   `preprocessed_new` folder they consumed is a tiny subset of the full
   dataset. This is the dominant cause. (See `training/TRAINING_NOTES.md`.)
2. Xception received `[0,1]` inputs against its ImageNet `[-1,1]`
   expectation; measured on pretrained features (50% top-1 flips).
3. Split leakage: identities/original-manipulated pairs crossed splits, so
   measured val metrics are optimistic.
4. Optimization settings (lr=1e-5, batch 1, 10 epochs, checkpointing on a
   13-video val_loss).
5. Face-detector variability across OpenCV builds shifts scores (±0.49
   observed) — reproducibility limit, not fixable by retraining alone.

## Standing limitations of any release using these checkpoints

- Scores are **uncalibrated sigmoid outputs**; do not call them probabilities
  or "confidence percentages".
- Video checkpoints were trained only on the DFD subset of FaceForensics++;
  unknown performance on other manipulation methods.
- Video analysis is single-face only; multi-person media is not fully covered.
- LIME explanations describe a replicated static frame; they do not explain
  the temporal pathway and do not prove which pixels were manipulated.
- Video checkpoints do not perform image classification. Image uploads use the
  separate Smaug model described above.
- The corrected retraining pipeline (`training/`) exists precisely to replace
  these checkpoints; until a retrained model passes the LOCKED test split,
  keep a research/prototype disclaimer visible in the UI.
