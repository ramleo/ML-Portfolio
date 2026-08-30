/**
 * The five stages of the pipeline story told on the home page, and the one
 * place their copy, colour and links live.
 *
 * Split out of PipelineShowcase.tsx, which had reached 397 lines — three from
 * the project's 400-line limit — with the data, two icon components, the card
 * and the section all in one scroll. Nothing here renders; it is content.
 */
const STAGES = [
  {
    step: 1, title: "Data Ingestion", accent: "#4c806d",
    tools: ["CSV Upload", "REST APIs", "Web Scraping", "Selenium", "Scrapy", "BeautifulSoup"],
    description: "Collect raw data from any source — upload CSV files, call REST APIs, or scrape websites with Selenium, Scrapy, or BeautifulSoup. This is where every ML project begins.",
    liveLink: "/?mode=eda",
    liveLinkLabel: "Try EDA Explorer →",
  },
  {
    step: 2, title: "Exploratory Analysis", accent: "#3e7c98",
    tools: ["Pandas", "NumPy", "Plotly", "Distributions", "Correlations", "Outliers"],
    description: "Understand the data before touching it. Distributions, missing values, correlations, outlier detection, type inference — visualized interactively.",
    liveLink: "/?mode=eda",
    liveLinkLabel: "Open EDA Explorer →",
  },
  {
    step: 3, title: "Feature Engineering", accent: "#7e68c0",
    tools: ["Encoding", "Scaling", "PCA", "LDA", "SHAP", "Feature Selection", "SMOTE", "ADASYN"],
    description: "Clean, encode, scale, and select features. Reduce dimensionality with PCA/LDA. Handle class imbalance with SMOTE and ADASYN. Identify important features with SHAP.",
    liveLink: null, liveLinkLabel: null,
  },
  {
    step: 4, title: "Model Training", accent: "#966f2b",
    tools: ["Scikit-learn", "XGBoost", "LightGBM", "CatBoost", "PyTorch", "GridSearchCV", "Auto-ML"],
    description: "Select and train the right algorithm — from Linear Regression and Random Forest to XGBoost, deep learning (CNN/RNN), and Auto-ML pipelines with hyperparameter tuning.",
    liveLink: "/?mode=ml",
    liveLinkLabel: "Try ML Platform →",
  },
  {
    step: 5, title: "Evaluation", accent: "#f87171",
    tools: ["Accuracy", "AUC-ROC", "Confusion Matrix", "Precision", "Recall", "F-Beta", "SHAP", "LIME"],
    description: "Measure model performance with the right metrics for the task. Interpret black-box predictions with SHAP and LIME. Validate on held-out data.",
    liveLink: "/?mode=ml",
    liveLinkLabel: "See Live Results →",
  },
  {
    step: 6, title: "Deployment", accent: "#818cf8",
    tools: ["FastAPI", "Flask", "Docker", "Render", "Vercel", "GCP", "Postman"],
    description: "Serve predictions via REST API with FastAPI or Flask. Containerize with Docker. Deploy to Render (ML backends) or Vercel (frontends). Every app here is live.",
    liveLink: "/?mode=vision",
    liveLinkLabel: "Try Vision Platform →",
  },
  {
    step: 7, title: "Monitoring", accent: "#64748b",
    tools: ["MLFlow", "Data Drift", "Model Drift", "Dashboards", "Alerts"],
    description: "Track model performance over time, detect data drift and concept drift, log experiments with MLFlow, and trigger retraining pipelines when performance degrades.",
    liveLink: null,
    liveLinkLabel: "Coming Soon",
    comingSoon: true,
  },
];

export type Stage = typeof STAGES[number];

export default STAGES;
