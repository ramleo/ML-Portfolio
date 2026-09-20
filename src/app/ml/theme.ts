/** ML Unified world — signature colours, the app launch target, and the four
 *  model definitions. Mirrors the Text-to-SQL / Testwright world themes.
 *  Every model here is trained and live today. */

import { ML_UNIFIED_API } from "@/config/urls";

export const ML_ACCENT = "#e879f9";   // fuchsia — matches the ML Unified card
export const ML_ACCENT2 = "#a855f7";  // purple — gradient partner

/** The live app is the ML mode of the shared ML-Unified HF Space. */
export const APP_HREF = `${ML_UNIFIED_API}/?mode=ml`;

export type MlModel = {
  key: string;
  label: string;
  task: string;
  algo: string;
  metric: string;
  metricLabel: string;
  blurb: string;
};

export const MODELS: MlModel[] = [
  {
    key: "iris",
    label: "Iris Species",
    task: "Classification",
    algo: "Logistic Regression",
    metric: "96.7%",
    metricLabel: "Accuracy",
    blurb: "Classify an iris into one of three species from four petal and sepal measurements.",
  },
  {
    key: "titanic",
    label: "Titanic Survival",
    task: "Classification",
    algo: "Gradient Boosting",
    metric: "82.5%",
    metricLabel: "Accuracy",
    blurb: "Predict whether a passenger survives, from class, sex, age, fare and family aboard.",
  },
  {
    key: "diabetes",
    label: "Diabetes Risk",
    task: "Classification",
    algo: "Random Forest",
    metric: "77.5%",
    metricLabel: "Accuracy",
    blurb: "Estimate diabetes risk from eight clinical measurements such as glucose and BMI.",
  },
  {
    key: "insurance",
    label: "Insurance Premium",
    task: "Regression",
    algo: "Random Forest",
    metric: "±668",
    metricLabel: "MAE (₹)",
    blurb: "Predict an annual insurance premium from age, BMI, smoking status and region.",
  },
];
