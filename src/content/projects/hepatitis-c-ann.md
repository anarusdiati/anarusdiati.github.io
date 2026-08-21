---
title: "Artificial Neural Network for Hepatitis C Virus Classification"
description: "A neural network model classifying Hepatitis C stages from clinical laboratory data."
tags: ["Machine Learning", "Artificial Intelligence"]
date: 2024-06-01
link: "https://anarusdiati.wixsite.com/anarusdiati/portfolio-collections/portfolio/artificial-neural-network-for-hepatitis-c-virus-classification"
featured: true
---

## Overview

This project uses an artificial neural network to classify Hepatitis C stages from clinical
laboratory measurements, supporting earlier and more consistent screening.

## Objective

Predict a patient's Hepatitis C category from routine blood-test features.

## Approach

- Preprocessed and normalized the clinical dataset, handling missing values
- Designed a feed-forward neural network architecture
- Trained and validated the model, tuning layers and hyperparameters

## Tech Stack

- Python
- TensorFlow / Keras
- pandas, scikit-learn

## Model

The network uses a standard feed-forward layer with a sigmoid activation. For a layer with
weights $W$, bias $b$, and input $x$, the output is:

$$
\hat{y} = \sigma(Wx + b), \quad \text{where } \sigma(z) = \frac{1}{1 + e^{-z}}
$$

The model was trained by minimizing binary cross-entropy loss:

$$
\mathcal{L} = -\frac{1}{N}\sum_{i=1}^{N} \Big[ y_i \log(\hat{y}_i) + (1-y_i)\log(1-\hat{y}_i) \Big]
$$

A minimal version of the training loop, for reference:

```python
import tensorflow as tf
from tensorflow import keras

model = keras.Sequential([
    keras.layers.Dense(16, activation="relu", input_shape=(x_train.shape[1],)),
    keras.layers.Dense(8, activation="relu"),
    keras.layers.Dense(1, activation="sigmoid"),
])

model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
model.fit(x_train, y_train, epochs=50, validation_split=0.2)
```

## Outcome

The network learns to separate Hepatitis C categories from clinical features.

> Add your accuracy, confusion matrix, and clinical caveats here.
