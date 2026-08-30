---
title: Anxiety Predictor
description: An iOS app that estimates anxiety levels based on lifestyle factors using an XGBoost model converted to CoreML, running 100% on-device.
tags:
  - Machine Learning
  - iOS
  - SwiftUI
  - CoreML
  - XGBoost
  - Human-Centered AI
date: 2026-04-01
link: https://anarusdiati.github.io/projects/anxiety-predictor/app/
github: https://github.com/anarusdiati/AnxietyPredictor-iOS
featured: true
---

## Overview

Anxiety is a **feeling** of worry and tension with physical signs like a faster heartbeat or higher blood pressure. Social anxiety is a strong fear of social situations that affects confidence and daily interactions. Most tools rely on occasional self reports and are not part of daily digital life, so early signs are often missed. This project uses data about habits, lifestyle, and symptoms to predict an anxiety score as a regression task.

**Anxiety Predictor** is an experimental iOS app I built as my first project at the Apple Developer Institute for AIML. The app helps users become more aware of lifestyle factors, such as sleep hours, stress level, caffeine intake, physical activity, and others, that may be related to their anxiety levels. **It is not a clinical screening tool**, nor a substitute for a mental health professional; its purpose is purely educational and for self awareness.

One design principle I held onto from the start: because the topic is as sensitive as mental health, the app had to run 100% on-device. No API calls, no user data ever leaves the phone.

### Objective

Build a prediction system that: (1) is accurate enough to be educationally useful, (2) is lightweight enough to run in real time on an iPhone without a server, (3) can explain the reasoning behind each prediction instead of just returning a number, and (4) preserves full privacy, meaning zero data ever leaves the device.

### Approach at a Glance

- Collected and cleaned a simulated dataset of 11,001 rows containing 19 physiological and behavioral variables (age, sleep, stress, caffeine, alcohol, smoking, family history, heart rate, etc.)
- Wrote a preprocessing pipeline (`preprocess()`) that reduces the 19 raw columns into a canonical 16 feature contract, including bucketing therapy sessions into 4 ordinal categories, converting weekly units to daily, and strict validation on Yes/No columns
- Trained an `XGBRegressor` regression model using hyperparameters tuned with Optuna, not manually
- Converted the model to CoreML format (`.mlmodel`) via `coremltools`, with automatic round trip verification (comparing the original XGBoost output against the converted output on the same sample) before the model was considered valid
- Replicated the Python preprocessing logic byte for byte in Swift (`FeatureEngineer.swift`), locked in place by two parallel test suites (Python and Swift) so the two sides never silently drift apart
- Designed a hybrid explainability system (`importance × intensity`) as a substitute for SHAP, which is too heavy for on-device use, so every prediction comes with an explanation personalized to that user
- Built the SwiftUI interface using the MVVM pattern: a 16 input assessment form, a color coded score gauge, an explanatory narrative, and contextual recommendation cards
- Stored assessment history locally (JSON in Application Support) to display in the History tab

## Data Understanding

The dataset ([Kaggle](https://www.kaggle.com/datasets/natezhang123/social-anxiety-dataset)) used has \~11.000 samples of people with different levels of social anxiety from mild to severe. The data comes from real surveys and observations and has been cleaned for analysis but it is only for research and education, and **not for diagnosis or treatment.**

### **Exploratory Data Analysis**

- **Feature distributions**: each feature was examined to understand its spread and detect potential issues. The findings:
    - Features showed reasonable variation
    - No extreme skew or significant outliers
    - No constant or low-variance features

No transformation or outlier handling was required because it’s a psychological data, and it’s important to keep the outliers so that the model can understand better.

- **Correlation Between Variables**: relationships between features and the target were analyzed to identify useful signals. Findings:
    - Some features had moderate correlation with the target
    - No strong multicollinearity between features
    - Relationships were not purely linear

All features were retained, tree-based models were suitable.

- **Target Variable Distribution**: anxiety score was reviewed to ensure it supports regression modeling. The findings: distribution was relatively balanced, so that no transformation or resampling was needed.

Since EDA showed that the dataset was already in good condition, only lightweight cleaning was performed: ensuring consistent data formats, verifying no duplicate records, and validating data types. The focus is to **preserve data integrity** rather than force transformations, because over-processing clean data can introduce unnecessary complexity or even degrade performance.

## **Preprocessing and Encoding**

- Categorical variables were encoded into numerical format
- Data was structured into feature matrix (X) and target vector (y)
- Train-test split was applied (80/20)

## **Model Selection and Training**

Several models were tested including Random Forest, Gradient Boosting, and XGBoost. **XGBoost** was chosen because it works well on structured data can capture complex patterns and handle interactions between features. This is important in mental health because outcomes are influenced by many factors not just one.

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

```plain
weight = global_importance × per_user_intensity
```

`global_importance` comes from the model's feature importance (constant across all users), while `intensity` is a per feature function that maps a user's specific value to a range of [0, 1]. This means two users with the same final score can end up with different contributor explanations, depending on their own input values.

### **Hyperparameter Tuning**

Instead of manually guessing parameters **Optuna** automatically tries many combinations and learns from previous results to focus on the most promising ones, then identify optimal combinations for model performance. The optimal configurations for parameters: number of estimators = 496, learning rate = 0.0106, and tree-depth = 5.

### Model Conversion

The trained model in Python was converted using **_coremltools_** into Core ML format to enable deployment on iOS (Xcode). CoreML is selected because it enables on-device inference, eliminates dependency on external servers, and improves speed and privacy.

## Tech Stack

* **Training and data**: Python, XGBoost, Optuna (hyperparameter tuning), coremltools, pandas
* **iOS app**: Swift, SwiftUI, CoreML, MVVM, XcodeGen
* **Testing**: XCTest (Swift), pure Python contract tests (`test_pipeline.py`) that stay locked in sync with `FeatureEngineerTests.swift`

## Outcome

- **RMSE: 1.02**, predictions are off by about 1 point from the actual score on average (on a 1 to 10 scale)
- **R²: 0.77**, the model explains about 77% of the variance in anxiety scores on the test set
- **MAE: 0.82**, average absolute error under 1 point
- Found that Stress Level (56.6%) and Sleep Hours (24.3%) alone account for nearly 81% of the model's total decision weight, an insight that was used directly to prioritize the explanatory narrative in the UI
- The `.mlmodel` (under 1 MB) runs entirely on-device with no API calls, with real time inference on the iPhone's Neural Engine or CPU

## **Feature Importance**

After generating the predicted anxiety score, the application provides an interpretation by highlighting which input factors contributed most to the result. These factors are the most influential variables based on the model, and are likely contributing to the prediction. This makes the prediction **transparent**, helps users understand why they receive a certain score, and increases trust and usability of the system.

The app translates model predictions into interpretable insights and actionable recommendations to help users manage or reduce their anxiety level. It works by taking the most influential features and maps them to relevant suggestions.

## Limitations

- The data is based on self-reported inputs, which may not always be fully accurate, and the model provides a one-time prediction without tracking changes over time; results **should not** be interpreted as a clinical diagnosis.
- While the system provides instant prediction, it **does not yet** integrate passive data streams such as Apple Health (example: sleep hours, heart rate, physical activity, age). Future work will explore continuous data integration to enable fully near real-time monitoring and deeper behavioral insights.

## Lessons Learned

- **Good data** reduces unnecessary processing and supports simpler models when data quality is already sufficient. This reflects efficient experimental design and avoiding unnecessary complexity.
- **EDA** is used to observe patterns, validate assumptions, and identify relevant features which guides what actions are necessary and what can be avoided.
- **Model selection** is based on hypothesis that certain models such as XGBoost perform better on structured data due to their ability to capture non linear relationships.
- **Hyperparameter tuning** improves performance by systematically optimizing model behavior based on experimental results rather than fixed assumptions.
- **Stopping criteria** are defined based on diminishing returns where further improvement does not significantly increase performance or generalization.
