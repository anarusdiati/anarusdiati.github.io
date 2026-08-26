---
title: "Anxiety Predictor"
description: "An iOS app that estimates anxiety levels based on lifestyle factors using an XGBoost model converted to CoreML, running 100% on-device."
tags: ["Machine Learning", "iOS", "SwiftUI", "CoreML", "XGBoost", "Human-Centered AI"]
date: 2026-04-01
link: "https://anarusdiati.github.io/projects/anxiety-predictor/app/"
github: "https://github.com/anarusdiati/AnxietyPredictor-iOS"
featured: true
---

## Overview

Anxiety Predictor is an experimental iOS app I built as my first project at the Apple Developer Institute for AIML. The app helps users become more aware of lifestyle factors, such as sleep hours, stress level, caffeine intake, physical activity, and others, that may be related to their anxiety levels. It is not a clinical screening tool, nor a substitute for a mental health professional; its purpose is purely educational and for self awareness.

One design principle I held onto from the start: because the topic is as sensitive as mental health, the app had to run 100% on-device. No API calls, no user data ever leaves the phone.

## Objective

Build a prediction system that: (1) is accurate enough to be educationally useful, (2) is lightweight enough to run in real time on an iPhone without a server, (3) can explain the reasoning behind each prediction instead of just returning a number, and (4) preserves full privacy, meaning zero data ever leaves the device.

## Approach

- Collected and cleaned a simulated dataset of 11,001 rows containing 19 physiological and behavioral variables (age, sleep, stress, caffeine, alcohol, smoking, family history, heart rate, etc.)
- Wrote a preprocessing pipeline (`preprocess()`) that reduces the 19 raw columns into a canonical 16 feature contract, including bucketing therapy sessions into 4 ordinal categories, converting weekly units to daily, and strict validation on Yes/No columns
- Trained an `XGBRegressor` regression model using hyperparameters tuned with Optuna, not manually
- Converted the model to CoreML format (`.mlmodel`) via `coremltools`, with automatic round trip verification (comparing the original XGBoost output against the converted output on the same sample) before the model was considered valid
- Replicated the Python preprocessing logic byte for byte in Swift (`FeatureEngineer.swift`), locked in place by two parallel test suites (Python and Swift) so the two sides never silently drift apart
- Designed a hybrid explainability system (`importance × intensity`) as a substitute for SHAP, which is too heavy for on-device use, so every prediction comes with an explanation personalized to that user
- Built the SwiftUI interface using the MVVM pattern: a 16 input assessment form, a color coded score gauge, an explanatory narrative, and contextual recommendation cards
- Stored assessment history locally (JSON in Application Support) to display in the History tab

## Tech Stack

Training and data: Python, XGBoost, Optuna (hyperparameter tuning), coremltools, pandas

iOS app: Swift, SwiftUI, CoreML, MVVM, XcodeGen

Testing: XCTest (Swift), pure Python contract tests (`test_pipeline.py`) that stay locked in sync with `FeatureEngineerTests.swift`

## Model / Method

The core model is an `XGBRegressor` (regression, not classification) with hyperparameters found automatically through Optuna:

```python
XGB_PARAMS = dict(
    n_estimators=496,
    max_depth=5,
    learning_rate=0.010623259840802923,
    subsample=0.7053046396574802,
    colsample_bytree=0.9530694337086799,
    random_state=42,
    objective="reg:squarederror",
    tree_method="hist",
)
```

Explainability uses a hybrid approach instead of SHAP:

```
weight = global_importance × per_user_intensity
```

`global_importance` comes from the model's feature importance (constant across all users), while `intensity` is a per feature function that maps a user's specific value to a range of [0, 1]. This means two users with the same final score can end up with different contributor explanations, depending on their own input values.

## Outcome

- RMSE: 1.02, predictions are off by about 1 point from the actual score on average (on a 1 to 10 scale)
- R²: 0.77, the model explains about 77% of the variance in anxiety scores on the test set
- MAE: 0.82, average absolute error under 1 point
- Found that Stress Level (56.6%) and Sleep Hours (24.3%) alone account for nearly 81% of the model's total decision weight, an insight that was used directly to prioritize the explanatory narrative in the UI
- The `.mlmodel` (under 1 MB) runs entirely on-device with no API calls, with real time inference on the iPhone's Neural Engine or CPU
- The two parallel test suites (Python and Swift) successfully prevented preprocessing drift between the two sides throughout development

## Lessons Learned

The biggest lesson from this project wasn't about model accuracy, it was about keeping two environments (Python for training, Swift for inference) in sync. The first draft of the training pipeline targeted a 20 feature schema that turned out to never match the iOS UI, which had already been built earlier with 16 fields. The two sides of the project moved forward independently until the mismatch was only caught once they were brought together. Since then, every feature change has had to be followed by updates on both sides plus passing both test suites before it's allowed to be committed. It's a discipline that slows down short term iteration, but it's the main reason this app can be trusted for a topic as sensitive as mental health while still remaining fully private.
