// AnxietyPredictor — web port.
// Faithfully mirrors the iOS app's Swift logic:
//   FeatureEngineer.swift, ModelSchema.swift, TherapyLevel.swift,
//   AnxietyCategory.swift, ExplanationEngine.swift, RecommendationEngine.swift
// The trained model itself is the same XGBoost regressor, exported to ONNX
// (see tools/export_model.py) and run entirely in the browser via
// onnxruntime-web — no server, no data ever leaves the device.

(() => {
  "use strict";

  // ---------------------------------------------------------------------
  // Icons (small inline SVGs, 24x24, stroke-based)
  // ---------------------------------------------------------------------
  const ICONS = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
    run: '<circle cx="14.5" cy="5" r="1.8"/><path d="M9 20l2.2-5 2.5 1.5L16 20M6 13l4-2.5 2 2 3.5-1.3M6 9l4.5-1.5"/>',
    coffee: '<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M7 5.5c0-1 1-1 1-2M11 5.5c0-1 1-1 1-2"/>',
    wine: '<path d="M8 3h8l-1 7a3 3 0 0 1-3 3 3 3 0 0 1-3-3L8 3Z"/><path d="M12 13v6M9 21h6"/>',
    leaf: '<path d="M20 4C10 4 4 10 4 18c8 0 14-6 14-14Z"/><path d="M5 19c3-5 7-8 13-13"/>',
    smoke: '<path d="M2 17h13"/><path d="M2 13h9"/><path d="M17 17c1-2 3-2 3-4s-2-2-1.5-4.5"/>',
    people: '<circle cx="8.5" cy="8" r="3.2"/><circle cx="16" cy="9.5" r="2.6"/><path d="M3 20c0-3.3 2.6-5.5 5.5-5.5S14 16.7 14 20"/><path d="M14.7 14.8c2.3.4 4.3 2.1 4.3 5.2"/>',
    pill: '<rect x="3.5" y="9.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 13)"/><path d="M9.5 8.7l4.8 6.8" stroke-width="1.6"/>',
    alert: '<path d="M12 4 2 20h20L12 4Z"/><path d="M12 10.5v4.2M12 17.3v.1"/>',
    ear: '<path d="M13 3a6 6 0 0 0-6 6c0 2 1 3 1 5a2.5 2.5 0 0 1-2.5 2.5"/><path d="M13 3a6 6 0 0 1 6 6c0 4-4 4-4 8a3 3 0 0 1-6 0v-2"/>',
    boltheart: '<path d="M12.5 4.5c-2-1.6-5.4-1-6.7 1.4C4 9 6.3 12 12 17.5 17.7 12 20 9 18.2 5.9c-1.3-2.4-4.7-3-6.7-1.4Z"/>',
    heart: '<path d="M12 20S3.5 14.5 3.5 8.8C3.5 5.6 6 3.5 8.7 3.5c1.6 0 3 .8 3.3 2 .3-1.2 1.7-2 3.3-2 2.7 0 5.2 2.1 5.2 5.3 0 5.7-8.5 11.2-8.5 11.2Z"/>',
    wind: '<path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 13h15a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 18h9a2 2 0 1 0-2-2"/>',
    droplet: '<path d="M12 3s6.5 7.2 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.2 12 3 12 3Z"/>',
    tornado: '<path d="M3 5h18M5 9h14M7 13h10M9 17h6M10.5 21h3"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M4 20h16"/>',
    lightbulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.2 1 2.1h5c0-.9.4-1.7 1-2.1A6 6 0 0 0 12 3Z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 8v.1"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    shield: '<path d="M12 3l7 3v5.5C19 16.5 16 19.8 12 21c-4-1.2-7-4.5-7-9.5V6l7-3Z"/>',
    brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5.6A3.2 3.2 0 0 0 7 18a3 3 0 0 0 5-2.2V6.5A2.5 2.5 0 0 0 9.5 4H9Z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5.6A3.2 3.2 0 0 1 17 18a3 3 0 0 1-5-2.2V6.5A2.5 2.5 0 0 1 14.5 4h.5Z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.4" stroke-linecap="round"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    chevronRight: '<path d="M9 6l6 6-6 6"/>',
    trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
    sparkles: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
    reset: '<path d="M4 12a8 8 0 1 1 2.6 5.9"/><path d="M4 17v-5h5"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    doc: '<path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  };
  function icon(name, cls = "") {
    return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
  }

  // ---------------------------------------------------------------------
  // Model contract — mirrors ModelSchema.swift
  // ---------------------------------------------------------------------
  const FEATURE_ORDER = [
    "Age", "Sleep Hours", "Caffeine Intake", "Smoking", "Family History of Anxiety",
    "Stress Level", "Heart Rate", "Breathing Rate", "Sweating Level", "Dizziness",
    "Medication", "Recent Major Life Event", "Diet Quality", "Therapy Category",
    "Physical Activity", "Alcohol Consumption",
  ];

  const HUMAN_LABEL = {
    "Age": "Age", "Sleep Hours": "Sleep", "Caffeine Intake": "Caffeine", "Smoking": "Smoking",
    "Family History of Anxiety": "Family history", "Stress Level": "Stress", "Heart Rate": "Heart rate",
    "Breathing Rate": "Breathing rate", "Sweating Level": "Sweating", "Dizziness": "Dizziness",
    "Medication": "Medication", "Recent Major Life Event": "Recent life event", "Diet Quality": "Diet quality",
    "Therapy Category": "Therapy", "Physical Activity": "Physical activity", "Alcohol Consumption": "Alcohol",
  };

  const FEATURE_ICON = {
    "Age": "user", "Sleep Hours": "moon", "Caffeine Intake": "coffee", "Smoking": "smoke",
    "Family History of Anxiety": "people", "Stress Level": "boltheart", "Heart Rate": "heart",
    "Breathing Rate": "wind", "Sweating Level": "droplet", "Dizziness": "tornado",
    "Medication": "pill", "Recent Major Life Event": "alert", "Diet Quality": "leaf",
    "Therapy Category": "ear", "Physical Activity": "run", "Alcohol Consumption": "wine",
  };

  // ---------------------------------------------------------------------
  // Form field definitions — mirrors AssessmentView.swift's four cards
  // ---------------------------------------------------------------------
  const GROUPS = [
    {
      title: "About you", icon: "user", key: "about",
      fields: [
        { key: "age", type: "manualInt", label: "Age", icon: "user", min: 10, max: 100, unit: "years" },
      ],
    },
    {
      title: "Lifestyle", icon: "leaf", key: "lifestyle",
      fields: [
        { key: "sleepHours", type: "slider", label: "Sleep last night", icon: "moon", min: 0, max: 14, step: 0.5, unit: "hours",
          info: "Count actual sleep, not time spent in bed. Most adults need about 7–9 hours a night." },
        { key: "physicalActivityHoursPerWeek", type: "slider", label: "Physical activity", icon: "run", min: 0, max: 40, step: 0.5, unit: "hours/week",
          info: "Any movement counts — walking, gym, sports. A brisk 30-minute walk ≈ 0.5 hours." },
        { key: "caffeineMgPerDay", type: "slider", label: "Caffeine", icon: "coffee", min: 0, max: 1000, step: 10, unit: "mg/day", integerDisplay: true,
          info: "≈95mg per cup of brewed coffee, ≈50mg per cup of tea, ≈40mg per can of soda, ≈80mg per energy-drink shot." },
        { key: "alcoholDrinksPerWeek", type: "slider", label: "Alcohol", icon: "wine", min: 0, max: 60, step: 1, unit: "drinks/week", integerDisplay: true,
          info: "1 drink ≈ a 355ml beer (5%), a 150ml glass of wine (12%), or a 45ml shot of spirits (40%)." },
        { key: "dietQuality", type: "intSlider", label: "Diet quality", icon: "leaf", min: 1, max: 10, unit: "/ 10",
          info: "1 = mostly processed or fast food, 10 = balanced, whole-food meals most days." },
        { key: "smoking", type: "binary", label: "Smoking", icon: "smoke" },
      ],
    },
    {
      title: "Mental-health history", icon: "brain", key: "history",
      fields: [
        { key: "familyHistoryOfAnxiety", type: "binary", label: "Family history of anxiety", icon: "people",
          info: "A parent or sibling who has been diagnosed with, or clearly struggled with, an anxiety disorder." },
        { key: "onMedication", type: "binary", label: "On medication", icon: "pill",
          info: "Currently taking prescribed medication for anxiety, depression, or a related condition." },
        { key: "recentMajorLifeEvent", type: "binary", label: "Recent major life event", icon: "alert",
          info: "A significant change in the last few months — job loss, breakup, moving, bereavement, and similar." },
        { key: "therapySessionsPerMonth", type: "manualInt", label: "Therapy sessions / month", icon: "ear", min: 0, max: 30, unit: "",
          info: "Include therapy, counseling, or psychiatry visits focused on your mental health." },
        { key: "therapyCategoryDisplay", type: "readonly", label: "Therapy category" },
      ],
    },
    {
      title: "How you feel right now", icon: "boltheart", key: "current",
      fields: [
        { key: "stressLevel", type: "intSlider", label: "Stress level", icon: "boltheart", min: 1, max: 10, unit: "/ 10",
          info: "1 = completely calm, 10 = overwhelmed. Rate how you feel right now, not your average." },
        { key: "heartRateBpm", type: "slider", label: "Heart rate", icon: "heart", min: 30, max: 220, step: 1, unit: "bpm", integerDisplay: true,
          info: "Your resting heart rate right now. A typical resting rate is 60–100 bpm; check a wearable or count your pulse for 15 seconds ×4." },
        { key: "breathingRatePerMin", type: "slider", label: "Breathing rate", icon: "wind", min: 6, max: 60, step: 1, unit: "/ min", integerDisplay: true,
          info: "Breaths per minute at rest. A typical resting rate is 12–20 breaths/min." },
        { key: "sweatingLevel", type: "intSlider", label: "Sweating level", icon: "droplet", min: 1, max: 5, unit: "/ 5",
          info: "1 = no more than usual, 5 = drenched. Rate how much more than usual you're sweating right now." },
        { key: "dizziness", type: "binary", label: "Dizziness", icon: "tornado",
          info: "Any lightheadedness, wooziness, or feeling faint right now." },
      ],
    },
  ];

  const DEFAULT_INPUT = {
    age: 0,
    sleepHours: 0,
    physicalActivityHoursPerWeek: 0,
    caffeineMgPerDay: 0,
    alcoholDrinksPerWeek: 0,
    smoking: false,
    dietQuality: 1,
    familyHistoryOfAnxiety: false,
    onMedication: false,
    therapySessionsPerMonth: 0,
    stressLevel: 1,
    heartRateBpm: 30,
    breathingRatePerMin: 6,
    sweatingLevel: 1,
    dizziness: false,
    recentMajorLifeEvent: false,
  };

  // ---------------------------------------------------------------------
  // TherapyLevel.swift port
  // ---------------------------------------------------------------------
  function therapyLevel(sessionsPerMonth) {
    const n = Math.max(0, Math.round(sessionsPerMonth));
    if (n <= 0) return { level: 0, label: "None" };
    if (n <= 2) return { level: 1, label: "Low (1–2 / month)" };
    if (n <= 6) return { level: 2, label: "Medium (3–6 / month)" };
    return { level: 3, label: "High (7+ / month)" };
  }

  // ---------------------------------------------------------------------
  // FeatureEngineer.swift port
  // ---------------------------------------------------------------------
  function featureDictionary(input) {
    return {
      "Age": input.age,
      "Sleep Hours": input.sleepHours,
      "Caffeine Intake": input.caffeineMgPerDay,
      "Smoking": input.smoking ? 1 : 0,
      "Family History of Anxiety": input.familyHistoryOfAnxiety ? 1 : 0,
      "Stress Level": input.stressLevel,
      "Heart Rate": input.heartRateBpm,
      "Breathing Rate": input.breathingRatePerMin,
      "Sweating Level": input.sweatingLevel,
      "Dizziness": input.dizziness ? 1 : 0,
      "Medication": input.onMedication ? 1 : 0,
      "Recent Major Life Event": input.recentMajorLifeEvent ? 1 : 0,
      "Diet Quality": input.dietQuality,
      "Therapy Category": therapyLevel(input.therapySessionsPerMonth).level,
      "Physical Activity": input.physicalActivityHoursPerWeek / 7,
      "Alcohol Consumption": input.alcoholDrinksPerWeek / 7,
    };
  }

  // ---------------------------------------------------------------------
  // AnxietyCategory.swift port
  // ---------------------------------------------------------------------
  function categoryFromScore(score) {
    const clamped = Math.min(Math.max(score, 1), 10);
    const s = Math.floor(clamped + 0.5);
    if (s < 4) return "low";
    if (s <= 7) return "medium";
    return "high";
  }
  const CATEGORY_META = {
    low: { label: "Low", headline: "Low anxiety indicators", cssVar: "--cat-low" },
    medium: { label: "Medium", headline: "Moderate anxiety indicators", cssVar: "--cat-medium" },
    high: { label: "High", headline: "High anxiety indicators", cssVar: "--cat-high" },
  };

  // ---------------------------------------------------------------------
  // ExplanationEngine.swift port
  // ---------------------------------------------------------------------
  function intensity(feature, value, input) {
    switch (feature) {
      case "Sleep Hours":
        if (value < 4) return 1.0;
        if (value < 7) return (7 - value) / 3;
        if (value <= 9) return 0;
        return Math.min((value - 9) / 5, 0.6);
      case "Stress Level":
        return Math.max(0, Math.min(1, (value - 3) / 7));
      case "Caffeine Intake":
        return Math.max(0, Math.min(1, (value - 100) / 500));
      case "Alcohol Consumption":
        return Math.max(0, Math.min(1, value / 3));
      case "Physical Activity":
        if (value < 0.5) return 1 - value / 0.5;
        if (value <= 2) return 0;
        return Math.min((value - 2) / 3, 0.4);
      case "Heart Rate":
        if (value >= 100) return Math.min(1, (value - 100) / 40) + 0.2;
        if (value >= 85) return (value - 85) / 30;
        return 0;
      case "Breathing Rate":
        if (value >= 22) return Math.min(1, (value - 22) / 15) + 0.2;
        return 0;
      case "Sweating Level":
        return Math.max(0, (value - 2) / 3);
      case "Diet Quality":
        return Math.max(0, (7 - value) / 6);
      case "Smoking": return value === 1 ? 0.7 : 0;
      case "Family History of Anxiety": return value === 1 ? 0.5 : 0;
      case "Dizziness": return value === 1 ? 0.8 : 0;
      case "Recent Major Life Event": return value === 1 ? 0.8 : 0;
      case "Medication": return value === 1 ? 0.25 : 0;
      case "Therapy Category":
        return therapyLevel(input.therapySessionsPerMonth).level === 0 ? 0.3 : 0;
      case "Age":
        if (value < 20) return 0.3;
        if (value > 70) return 0.2;
        return 0;
      default: return 0;
    }
  }

  function displayValue(feature, input) {
    switch (feature) {
      case "Age": return `${input.age} yrs`;
      case "Sleep Hours": return `${input.sleepHours.toFixed(1)} h/night`;
      case "Caffeine Intake": return `${Math.round(input.caffeineMgPerDay)} mg/day`;
      case "Smoking": return input.smoking ? "Yes" : "No";
      case "Family History of Anxiety": return input.familyHistoryOfAnxiety ? "Yes" : "No";
      case "Stress Level": return `${input.stressLevel}/10`;
      case "Heart Rate": return `${Math.round(input.heartRateBpm)} bpm`;
      case "Breathing Rate": return `${Math.round(input.breathingRatePerMin)} /min`;
      case "Sweating Level": return `${input.sweatingLevel}/5`;
      case "Dizziness": return input.dizziness ? "Yes" : "No";
      case "Medication": return input.onMedication ? "Yes" : "No";
      case "Recent Major Life Event": return input.recentMajorLifeEvent ? "Yes" : "No";
      case "Diet Quality": return `${input.dietQuality}/10`;
      case "Therapy Category": return therapyLevel(input.therapySessionsPerMonth).label;
      case "Physical Activity": return `${input.physicalActivityHoursPerWeek.toFixed(1)} h/week`;
      case "Alcohol Consumption": return `${Math.round(input.alcoholDrinksPerWeek)} drinks/wk`;
      default: return "";
    }
  }

  function topFactors(input, features, importance, limit) {
    const scored = [];
    for (const feature of FEATURE_ORDER) {
      const value = features[feature] ?? 0;
      const inten = intensity(feature, value, input);
      const imp = importance[feature] ?? 0;
      const weight = imp * inten;
      if (weight <= 0) continue;
      scored.push({ feature, weight, displayValue: displayValue(feature, input) });
    }
    scored.sort((a, b) => b.weight - a.weight);
    return scored.slice(0, limit);
  }

  function contributionPhrase(factor) {
    switch (factor.feature) {
      case "Sleep Hours": return `short sleep (${factor.displayValue})`;
      case "Stress Level": return `elevated stress (${factor.displayValue})`;
      case "Caffeine Intake": return `high caffeine intake (${factor.displayValue})`;
      case "Alcohol Consumption": return `frequent alcohol use (${factor.displayValue})`;
      case "Physical Activity": return `low physical activity (${factor.displayValue})`;
      case "Heart Rate": return `elevated heart rate (${factor.displayValue})`;
      case "Breathing Rate": return `elevated breathing rate (${factor.displayValue})`;
      case "Sweating Level": return `increased sweating (level ${factor.displayValue})`;
      case "Diet Quality": return `lower diet quality (${factor.displayValue})`;
      case "Smoking": return "smoking";
      case "Family History of Anxiety": return "family history of anxiety";
      case "Dizziness": return "reported dizziness";
      case "Recent Major Life Event": return "a recent major life event";
      case "Medication": return "current anxiety medication";
      case "Therapy Category": return "no current therapy engagement";
      case "Age": return null;
      default: return null;
    }
  }

  function buildExplanation(score, category, factors) {
    const scoreText = score.toFixed(1);
    let header;
    if (category === "low") header = `Your estimated anxiety score is ${scoreText} out of 10, which sits in the low range.`;
    else if (category === "medium") header = `Your estimated anxiety score is ${scoreText} out of 10, which sits in the moderate range.`;
    else header = `Your estimated anxiety score is ${scoreText} out of 10, which is in the high range.`;

    if (factors.length === 0) {
      return header + " No single input stands out as a clear driver in this prediction.";
    }
    const phrases = factors.slice(0, 3).map(contributionPhrase).filter(Boolean);
    let tail;
    if (phrases.length === 1) tail = `The main contributor appears to be ${phrases[0]}.`;
    else if (phrases.length === 2) tail = `The main contributors appear to be ${phrases[0]} and ${phrases[1]}.`;
    else if (phrases.length >= 3) {
      const head = phrases.slice(0, -1).join(", ");
      tail = `The main contributors appear to be ${head}, and ${phrases[phrases.length - 1]}.`;
    } else {
      tail = "";
    }
    return tail ? header + " " + tail : header;
  }

  // ---------------------------------------------------------------------
  // RecommendationEngine.swift port
  // ---------------------------------------------------------------------
  function fmt1(v) { return v.toFixed(1); }

  function recommendationTemplate(feature, input) {
    switch (feature) {
      case "Sleep Hours": {
        const msg = input.sleepHours < 6
          ? `You're averaging ${fmt1(input.sleepHours)} h/night. Aim for 7–9 hours and set a consistent wind-down time — screens off 45 minutes before bed helps most people.`
          : `Sleep duration is close to target at ${fmt1(input.sleepHours)} h/night. Focus on quality: a cool (16–19°C), dark, quiet room cuts night-time waking.`;
        return { title: "Improve sleep", detail: msg, feature };
      }
      case "Stress Level":
        return { title: "Manage daily stress", feature,
          detail: `Your self-rated stress is ${input.stressLevel}/10. A five-minute guided meditation, a short walk outside, or paced 4-7-8 breathing between tasks can noticeably shift this.` };
      case "Caffeine Intake": {
        const cur = Math.round(input.caffeineMgPerDay);
        const target = Math.max(100, cur - 100);
        return { title: "Dial back caffeine", feature,
          detail: `You're at ${cur} mg/day. Try cutting to ${target} mg for two weeks, and avoid caffeine after 2pm — late caffeine fragments sleep even when you don't notice.` };
      }
      case "Alcohol Consumption":
        return { title: "Reduce alcohol frequency", feature,
          detail: "Alcohol disrupts REM sleep and amplifies next-day anxiety. Try two alcohol-free days per week and notice how your sleep quality responds." };
      case "Physical Activity":
        return { title: "Move more, gently", feature,
          detail: `You're at ${fmt1(input.physicalActivityHoursPerWeek)} h/week of activity. Even 20-minute walks on most days have measurable anti-anxiety effects.` };
      case "Heart Rate":
        return { title: "Check in on your heart rate", feature,
          detail: `A resting heart rate of ${Math.round(input.heartRateBpm)} bpm is on the elevated side. Hydration, reduced caffeine and light cardio typically help — if it persists above 100 bpm at rest, see a clinician.` };
      case "Breathing Rate":
        return { title: "Slow your breathing", feature,
          detail: `At ${Math.round(input.breathingRatePerMin)} breaths/min you're above resting norm. Box breathing (4-4-4-4) for two minutes, three times a day, trains a slower baseline.` };
      case "Diet Quality":
        return { title: "Upgrade one meal", feature,
          detail: `Diet quality self-rating is ${input.dietQuality}/10. Pick one meal and add protein + fibre + colour. Stable blood sugar reduces anxiety spikes.` };
      case "Smoking":
        if (!input.smoking) return null;
        return { title: "Consider a nicotine taper", feature,
          detail: "Nicotine is a short-acting stimulant that raises baseline anxiety between doses. Even reducing by a few cigarettes a day can change how you feel within two weeks." };
      case "Dizziness":
        if (!input.dizziness) return null;
        return { title: "Flag the dizziness", feature,
          detail: "Dizziness alongside anxiety often responds to hydration, electrolytes, and slower transitions from sitting to standing. If it's frequent, mention it to a GP." };
      case "Recent Major Life Event":
        if (!input.recentMajorLifeEvent) return null;
        return { title: "Give the transition time", feature,
          detail: "Major life events reliably elevate anxiety for 4–8 weeks. Structured routines, social contact, and talking it through — with friends or a therapist — shorten that window." };
      case "Therapy Category":
        if (therapyLevel(input.therapySessionsPerMonth).level !== 0) return null;
        return { title: "Consider a therapy session", feature,
          detail: "A single assessment session with a CBT-trained therapist is often enough to get a plan. Even short-term therapy has meaningful effects on anxiety scores." };
      case "Family History of Anxiety":
        if (!input.familyHistoryOfAnxiety) return null;
        return { title: "Know your baseline risk", feature,
          detail: "Family history raises baseline risk but isn't destiny. Early, structured interventions (sleep, exercise, CBT techniques) are especially high-leverage for you." };
      case "Sweating Level":
        return { title: "Cooling rituals", feature,
          detail: "When sweating spikes alongside anxiety, cool water on wrists, face, or the back of the neck activates the dive reflex and can abort a spiral quickly." };
      default:
        return null;
    }
  }

  function recommend(input, factors, limit = 5) {
    const out = [];
    const seen = new Set();
    for (const factor of factors) {
      if (seen.has(factor.feature)) continue;
      const rec = recommendationTemplate(factor.feature, input);
      if (rec) {
        out.push(rec);
        seen.add(factor.feature);
        if (out.length >= limit) break;
      }
    }
    if (out.length < limit && !seen.has("Stress Level") && input.stressLevel >= 6) {
      out.push({
        title: "Try a 4-7-8 breathing cycle",
        detail: "Inhale 4s, hold 7s, exhale 8s. Repeat four times. It engages the parasympathetic nervous system and can lower acute stress within minutes.",
        feature: "Stress Level",
      });
    }
    return out;
  }

  // ---------------------------------------------------------------------
  // Validation — mirrors AnxietyInput.Bounds / validate()
  // ---------------------------------------------------------------------
  const BOUNDS = {
    age: [10, 100], sleepHours: [0, 14], physicalActivityHoursPerWeek: [0, 40],
    caffeineMgPerDay: [0, 1000], alcoholDrinksPerWeek: [0, 60], dietQuality: [1, 10],
    therapySessionsPerMonth: [0, 30], stressLevel: [1, 10], heartRateBpm: [30, 220],
    breathingRatePerMin: [6, 60], sweatingLevel: [1, 5],
  };

  // =======================================================================
  // App state & rendering
  // =======================================================================
  const state = {
    input: { ...DEFAULT_INPUT },
    importance: null,
    session: null,
    modelReady: false,
    lastResult: null,
    lastInput: null,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setValue(key, value) {
    state.input[key] = value;
  }

  // -- Form rendering ------------------------------------------------------
  function fieldControlHTML(field) {
    const v = state.input[field.key];
    switch (field.type) {
      case "manualInt":
        return `
          <div class="field" data-key="${field.key}">
            <div class="field-row">
              <label class="field-label">${icon(field.icon)}<span>${field.label}</span>${field.info ? infoBtnHTML(field.key) : ""}</label>
              <div class="num-input">
                <input type="number" inputmode="numeric" id="in-${field.key}" min="${field.min}" max="${field.max}" value="${v}">
                ${field.unit ? `<span class="unit">${field.unit}</span>` : ""}
              </div>
            </div>
            ${field.info ? infoNoteHTML(field.key, field.info) : ""}
          </div>`;
      case "slider":
      case "intSlider": {
        const step = field.type === "intSlider" ? 1 : field.step;
        return `
          <div class="field" data-key="${field.key}">
            <div class="field-row">
              <label class="field-label">${icon(field.icon)}<span>${field.label}</span>${field.info ? infoBtnHTML(field.key) : ""}</label>
              <span class="field-value" id="val-${field.key}"></span>
            </div>
            <input type="range" class="slider" id="in-${field.key}" min="${field.min}" max="${field.max}" step="${step}" value="${v}">
            ${field.info ? infoNoteHTML(field.key, field.info) : ""}
          </div>`;
      }
      case "binary":
        return `
          <div class="field" data-key="${field.key}">
            <div class="field-row">
              <label class="field-label">${icon(field.icon)}<span>${field.label}</span>${field.info ? infoBtnHTML(field.key) : ""}</label>
              <div class="pill-toggle" id="in-${field.key}" role="group" aria-label="${field.label}">
                <button type="button" class="pill-opt" data-val="false">No</button>
                <button type="button" class="pill-opt" data-val="true">Yes</button>
              </div>
            </div>
            ${field.info ? infoNoteHTML(field.key, field.info) : ""}
          </div>`;
      case "readonly":
        return `
          <div class="field field-readonly" data-key="${field.key}">
            <span class="ro-label">${field.label}</span>
            <span class="ro-value" id="ro-${field.key}"></span>
          </div>`;
      default:
        return "";
    }
  }

  function infoBtnHTML(key) {
    return `<button type="button" class="info-btn" data-info-toggle="${key}" aria-label="More info">${icon("info")}</button>`;
  }
  function infoNoteHTML(key, text) {
    return `<p class="info-note" id="note-${key}" hidden>${text}</p>`;
  }

  function renderForm() {
    const container = $("#assessment-form");
    container.innerHTML = GROUPS.map(group => `
      <section class="card">
        <h2 class="card-title">${icon(group.icon)}<span>${group.title}</span></h2>
        <div class="card-body">
          ${group.fields.map(fieldControlHTML).join("")}
        </div>
      </section>
    `).join("");

    // Wire events
    for (const group of GROUPS) {
      for (const field of group.fields) {
        wireField(field);
      }
    }
    syncFormFromState();
  }

  function wireField(field) {
    if (field.type === "readonly") return;
    const el = $(`#in-${field.key}`);
    if (!el) return;

    if (field.info) {
      const btn = $(`[data-info-toggle="${field.key}"]`);
      const note = $(`#note-${field.key}`);
      btn.addEventListener("click", () => { note.hidden = !note.hidden; });
    }

    if (field.type === "manualInt") {
      el.addEventListener("change", () => {
        let n = parseInt(el.value, 10);
        if (Number.isNaN(n)) n = state.input[field.key];
        if (n !== 0) n = Math.min(Math.max(n, field.min), field.max);
        setValue(field.key, n);
        el.value = n;
        syncFormFromState();
      });
    } else if (field.type === "slider" || field.type === "intSlider") {
      el.addEventListener("input", () => {
        const raw = parseFloat(el.value);
        setValue(field.key, field.type === "intSlider" ? Math.round(raw) : raw);
        updateSliderValueLabel(field);
      });
    } else if (field.type === "binary") {
      $$(".pill-opt", el).forEach(btn => {
        btn.addEventListener("click", () => {
          setValue(field.key, btn.dataset.val === "true");
          syncBinaryField(field);
        });
      });
    }
  }

  function updateSliderValueLabel(field) {
    const v = state.input[field.key];
    const text = field.integerDisplay ? `${Math.round(v)}` : v.toFixed(1);
    $(`#val-${field.key}`).textContent = field.unit ? `${text} ${field.unit}` : text;
  }

  function syncBinaryField(field) {
    const wrap = $(`#in-${field.key}`);
    const v = state.input[field.key];
    $$(".pill-opt", wrap).forEach(btn => {
      btn.classList.toggle("active", (btn.dataset.val === "true") === v);
    });
  }

  function syncFormFromState() {
    for (const group of GROUPS) {
      for (const field of group.fields) {
        if (field.type === "readonly") continue;
        const el = $(`#in-${field.key}`);
        if (!el) continue;
        const v = state.input[field.key];
        if (field.type === "manualInt") {
          el.value = v;
        } else if (field.type === "slider" || field.type === "intSlider") {
          el.value = v;
          updateSliderValueLabel(field);
        } else if (field.type === "binary") {
          syncBinaryField(field);
        }
      }
    }
    const tl = therapyLevel(state.input.therapySessionsPerMonth);
    const roEl = $("#ro-therapyCategoryDisplay");
    if (roEl) roEl.textContent = tl.label;
  }

  function resetForm() {
    state.input = { ...DEFAULT_INPUT };
    syncFormFromState();
  }

  // -- ONNX inference --------------------------------------------------
  async function initModel() {
    const statusEl = $("#model-status");
    try {
      ort.env.wasm.wasmPaths = new URL("vendor/ort/", document.baseURI).href;
      // Single-threaded: avoids requiring cross-origin-isolation (COOP/COEP)
      // headers, which static hosts like GitHub Pages don't set by default.
      ort.env.wasm.numThreads = 1;
      const [session, importanceResp] = await Promise.all([
        ort.InferenceSession.create("model/anxiety_model.onnx", { executionProviders: ["wasm"] }),
        fetch("model/feature_importances.json"),
      ]);
      state.session = session;
      state.importance = (await importanceResp.json()).importance;
      state.modelReady = true;
      if (statusEl) statusEl.hidden = true;
      $("#predict-btn").disabled = false;
    } catch (err) {
      console.error("Model failed to load", err);
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "Couldn't load the prediction model. Check your connection and reload the page.";
      }
    }
  }

  async function runInference(features) {
    const arr = Float32Array.from(FEATURE_ORDER.map(f => features[f]));
    const tensor = new ort.Tensor("float32", arr, [1, FEATURE_ORDER.length]);
    const inputName = state.session.inputNames[0];
    const outputs = await state.session.run({ [inputName]: tensor });
    const outName = state.session.outputNames[0];
    const raw = Number(outputs[outName].data[0]);
    return Math.min(Math.max(raw, 1), 10);
  }

  // -- Prediction flow ---------------------------------------------------
  async function runPrediction() {
    if (state.input.age <= 0) {
      showToast("Please enter your age before running the assessment.");
      return;
    }
    for (const [key, [lo, hi]] of Object.entries(BOUNDS)) {
      const v = state.input[key];
      if (v < lo || v > hi) {
        showToast(`${key}: must be between ${lo} and ${hi}`);
        return;
      }
    }
    if (!state.modelReady) {
      showToast("Model is still loading — try again in a moment.");
      return;
    }

    setPredicting(true);
    try {
      const input = { ...state.input };
      const features = featureDictionary(input);
      const score = await runInference(features);
      const category = categoryFromScore(score);
      const factors = topFactors(input, features, state.importance, 5);
      const explanation = buildExplanation(score, category, factors);
      const recommendations = recommend(input, factors, 5);
      const result = {
        score, category, factors, explanation, recommendations,
        generatedAt: new Date().toISOString(),
      };
      state.lastInput = input;
      state.lastResult = result;
      saveHistoryRecord(input, result);
      renderResult(input, result);
      showView("result");
    } catch (err) {
      console.error(err);
      showToast("Prediction failed. Please try again.");
    } finally {
      setPredicting(false);
    }
  }

  function setPredicting(isRunning) {
    const btn = $("#predict-btn");
    btn.disabled = isRunning || !state.modelReady;
    btn.innerHTML = isRunning
      ? `<span class="spinner"></span><span>Running…</span>`
      : `${icon("sparkles")}<span>Predict Anxiety Level</span>`;
  }

  // -- Result rendering ----------------------------------------------------
  function fmtScore(v) { return v.toFixed(1); }
  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
      ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function gaugeSVG(score, category) {
    const progress = Math.max(0, Math.min(1, (score - 1) / 9));
    const r = 90, cx = 110, cy = 110;
    const startAngle = 135, sweep = 270;
    const circumference = 2 * Math.PI * r;
    const arcLen = (sweep / 360) * circumference;
    const trackDash = `${arcLen} ${circumference}`;
    const fillDash = `${arcLen * progress} ${circumference}`;
    const rot = startAngle - 90;
    const colorVar = CATEGORY_META[category].cssVar;
    return `
      <svg viewBox="0 0 220 220" class="gauge-svg">
        <circle cx="${cx}" cy="${cy}" r="${r}" class="gauge-track"
          stroke-dasharray="${trackDash}" transform="rotate(${rot} ${cx} ${cy})"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" class="gauge-fill" style="stroke:var(${colorVar})"
          stroke-dasharray="${fillDash}" transform="rotate(${rot} ${cx} ${cy})"/>
      </svg>`;
  }

  function renderResult(input, result) {
    const view = $("#tab-result");
    const catMeta = CATEGORY_META[result.category];

    const factorsHTML = result.factors.length === 0
      ? `<p class="muted">No single factor stands out — your inputs are well balanced.</p>`
      : result.factors.map(f => {
          const maxW = result.factors[0].weight || 1;
          const pct = Math.max(5, (f.weight / maxW) * 100);
          return `
            <div class="factor-row">
              <div class="factor-top">
                <span class="factor-icon">${icon(FEATURE_ICON[f.feature] || "info")}</span>
                <span class="factor-label">${HUMAN_LABEL[f.feature] || f.feature}</span>
                <span class="factor-val">${f.displayValue}</span>
              </div>
              <div class="factor-bar-track"><div class="factor-bar-fill" style="width:${pct}%"></div></div>
            </div>`;
        }).join("");

    const recsHTML = result.recommendations.length === 0
      ? `<p class="muted">Keep doing what you're doing — no specific changes suggested.</p>`
      : result.recommendations.map((r, i) => `
          <div class="rec-row">
            <span class="rec-icon">${icon(FEATURE_ICON[r.feature] || "lightbulb")}</span>
            <div>
              <p class="rec-title">${r.title}</p>
              <p class="rec-detail">${r.detail}</p>
            </div>
          </div>
          ${i < result.recommendations.length - 1 ? '<div class="divider"></div>' : ""}
        `).join("");

    const recapHTML = renderRecap(input);

    view.innerHTML = `
      <button type="button" class="back-btn" id="back-from-result">${icon("back")}<span>Back</span></button>
      <h1 class="page-title">Your result</h1>

      <section class="card center-card">
        <div class="gauge-wrap">
          ${gaugeSVG(result.score, result.category)}
          <div class="gauge-label">
            <span class="gauge-score" style="color:var(${catMeta.cssVar})">${fmtScore(result.score)}</span>
            <span class="gauge-of10">of 10</span>
            <span class="gauge-cat" style="color:var(${catMeta.cssVar});background:color-mix(in srgb, var(${catMeta.cssVar}) 15%, transparent)">${catMeta.label.toUpperCase()}</span>
          </div>
        </div>
        <p class="cat-headline" style="color:var(${catMeta.cssVar})">${catMeta.headline}</p>
        <p class="muted small">Assessed ${fmtDate(result.generatedAt)}</p>
      </section>

      <section class="card">
        <h2 class="card-title accent">${icon("list")}<span>What's driving this</span></h2>
        <p class="body-text">${result.explanation}</p>
      </section>

      <section class="card">
        <h2 class="card-title accent">${icon("chart")}<span>Top contributing factors</span></h2>
        ${factorsHTML}
      </section>

      <section class="card">
        <h2 class="card-title sage">${icon("lightbulb")}<span>Recommendations</span></h2>
        ${recsHTML}
      </section>

      <section class="card" id="recap-card">
        <button type="button" class="recap-toggle" id="recap-toggle">
          ${icon("list")}
          <div class="recap-toggle-text">
            <p class="recap-title">Your inputs</p>
            <p class="recap-sub">What you entered for this assessment</p>
          </div>
          ${icon("chevronDown", "recap-chevron")}
        </button>
        <div class="recap-body" id="recap-body" hidden>${recapHTML}</div>
      </section>

      <section class="disclaimer-card">
        ${icon("shield")}
        <p>This estimate is informational and is not medical advice. If your symptoms are persistent or severe, please reach out to a qualified clinician.</p>
      </section>
    `;

    $("#back-from-result").addEventListener("click", () => showView("assess"));
    const recapToggle = $("#recap-toggle");
    const recapBody = $("#recap-body");
    recapToggle.addEventListener("click", () => {
      recapBody.hidden = !recapBody.hidden;
      $(".recap-chevron", recapToggle).classList.toggle("open", !recapBody.hidden);
    });
  }

  function renderRecap(input) {
    const tl = therapyLevel(input.therapySessionsPerMonth);
    const groups = [
      { title: "About you", rows: [["user", "Age", `${input.age} years`]] },
      { title: "Lifestyle", rows: [
        ["moon", "Sleep last night", `${input.sleepHours.toFixed(1)} hours`],
        ["run", "Physical activity", `${input.physicalActivityHoursPerWeek.toFixed(1)} hours/week`],
        ["coffee", "Caffeine", `${Math.round(input.caffeineMgPerDay)} mg/day`],
        ["wine", "Alcohol", `${Math.round(input.alcoholDrinksPerWeek)} drinks/week`],
        ["leaf", "Diet quality", `${input.dietQuality} / 10`],
        ["smoke", "Smoking", input.smoking ? "Yes" : "No"],
      ]},
      { title: "Mental-health history", rows: [
        ["people", "Family history of anxiety", input.familyHistoryOfAnxiety ? "Yes" : "No"],
        ["pill", "On medication", input.onMedication ? "Yes" : "No"],
        ["alert", "Recent major life event", input.recentMajorLifeEvent ? "Yes" : "No"],
        ["ear", "Therapy sessions", `${input.therapySessionsPerMonth} / month`],
        ["chart", "Therapy category", tl.label],
      ]},
      { title: "How you felt", rows: [
        ["boltheart", "Stress level", `${input.stressLevel} / 10`],
        ["heart", "Heart rate", `${Math.round(input.heartRateBpm)} bpm`],
        ["wind", "Breathing rate", `${Math.round(input.breathingRatePerMin)} / min`],
        ["droplet", "Sweating level", `${input.sweatingLevel} / 5`],
        ["tornado", "Dizziness", input.dizziness ? "Yes" : "No"],
      ]},
    ];
    return groups.map(g => `
      <div class="recap-group">
        <p class="recap-group-title">${g.title.toUpperCase()}</p>
        ${g.rows.map(([ic, label, val], i) => `
          <div class="recap-row">
            <span class="recap-row-icon">${icon(ic)}</span>
            <span class="recap-row-label">${label}</span>
            <span class="recap-row-val">${val}</span>
          </div>
          ${i < g.rows.length - 1 ? '<div class="divider faint"></div>' : ""}
        `).join("")}
      </div>
    `).join("");
  }

  // -- History (localStorage) ---------------------------------------------
  const HISTORY_KEY = "anxietyPredictorHistory";

  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function persistHistory(records) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(records)); } catch {}
  }
  function saveHistoryRecord(input, result) {
    const records = loadHistory();
    records.unshift({ id: crypto.randomUUID(), input, result });
    persistHistory(records);
  }
  function deleteHistoryRecord(id) {
    persistHistory(loadHistory().filter(r => r.id !== id));
    renderHistory();
  }
  function deleteAllHistory() {
    persistHistory([]);
    renderHistory();
  }

  function renderHistory() {
    const records = loadHistory();
    const list = $("#history-list");
    const empty = $("#history-empty");
    const clearBtn = $("#clear-history");
    clearBtn.hidden = records.length === 0;

    if (records.length === 0) {
      list.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.innerHTML = records.map(r => {
      const meta = CATEGORY_META[r.result.category];
      return `
        <button type="button" class="history-row" data-id="${r.id}">
          <span class="history-score" style="color:var(${meta.cssVar});background:color-mix(in srgb, var(${meta.cssVar}) 16%, transparent);border-color:color-mix(in srgb, var(${meta.cssVar}) 35%, transparent)">${fmtScore(r.result.score)}</span>
          <span class="history-info">
            <span class="history-headline">${meta.headline}</span>
            <span class="history-date muted">${fmtDate(r.result.generatedAt)}</span>
          </span>
          <button type="button" class="history-delete" data-delete-id="${r.id}" aria-label="Delete">${icon("trash")}</button>
        </button>`;
    }).join("");

    $$(".history-row").forEach(row => {
      row.addEventListener("click", (e) => {
        if (e.target.closest("[data-delete-id]")) return;
        const rec = records.find(r => r.id === row.dataset.id);
        if (rec) {
          renderResult(rec.input, rec.result);
          showView("result");
        }
      });
    });
    $$("[data-delete-id]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteHistoryRecord(btn.dataset.deleteId);
      });
    });
  }

  // -- View / tab routing ----------------------------------------------
  function showView(name) {
    $$(".tab-panel").forEach(p => p.classList.remove("active"));
    $(`#tab-${name}`).classList.add("active");
    $$(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
    const topbar = $(".topbar");
    topbar.classList.toggle("nav-hidden", name === "result");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    if (name === "history") renderHistory();
  }

  function showToast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    t.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.hidden = true, 250); }, 3200);
  }

  // -- Init ----------------------------------------------------------------
  function init() {
    renderForm();

    $$(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => showView(btn.dataset.tab));
    });

    $("#reset-btn").addEventListener("click", resetForm);

    $("#assessment-form-wrap").addEventListener("submit", (e) => {
      e.preventDefault();
      runPrediction();
    });
    $("#predict-btn").addEventListener("click", (e) => {
      e.preventDefault();
      runPrediction();
    });

    $("#clear-history").addEventListener("click", () => {
      if (confirm("Delete all saved assessments? This can't be undone.")) deleteAllHistory();
    });

    setPredicting(false);
    initModel();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
