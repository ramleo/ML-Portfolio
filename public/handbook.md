# AIRaML Handbook

Every tool and platform on the site, what each one does, what it needs from you, and where it runs. 50 tools across 4 areas, plus 3 full platforms.

> Generated from the site's own data on 2026-08-30. If a description here differs from the one on a card, the card is right and this file needs regenerating.

## Contents

- **ML Pipeline** — 11 tools
- **Language & Documents** — 4 tools
- **Computer Vision** — 14 tools
- **Security & Trust** — 21 tools
- **Platforms** — 3 full applications

## How the site is organised

The home page shows the four areas. Choosing one opens a page listing only that area's tools. Every tool card turns over to show what it does, and searching from the home page looks across all 50 at once, so nothing is more than one step away.

Each entry below lists the same fields the card shows: what the tool does, the model or algorithm behind it, what you feed it, and whether it runs in your browser or on the server.

---

## ML Pipeline

Everything between a raw CSV and a trained, explained model — cleaning, feature work, tuning, comparison and drift.

11 tools. Browse them at `/tools/ml-pipeline`.

### AutoML Pipeline

*4-Model Competition*



| | |
|---|---|
| **Model** | RF · XGB · LGB · CatBoost |
| **Input** | Any CSV |
| **Models** | 4 |
| **Runs** | Server |
| **Tags** | scikit-learn, XGBoost, LightGBM, CatBoost |
| **Open** | `/tools/automl` |

### Data Drift Detection

*Monitor Production Data*



| | |
|---|---|
| **Model** | Statistical tests |
| **Input** | Trained model + batch CSV |
| **+ KS Test** | PSI |
| **Runs** | Server |
| **Tags** | PSI, KS Test, Distribution Shift, Monitoring |
| **Open** | `/tools/drift` |

### Data Preprocessing

*Clean Before You Train*



| | |
|---|---|
| **Model** | SimpleImputer · KNN · MICE |
| **Input** | Any CSV |
| **Steps** | 5 |
| **Runs** | Server |
| **Tags** | Imputation, Outliers, Encoding, Power Transform |
| **Open** | `/tools/preprocessing` |

### Ensemble Methods

*Combine Top-N Models*



| | |
|---|---|
| **Model** | Voting · Stacking |
| **Input** | AutoML winners |
| **Strategies** | 2 |
| **Runs** | Server |
| **Tags** | Voting, Stacking, Meta-Learner, scikit-learn |
| **Open** | `/tools/ensemble` |

### Feature Engineering

*No-Code Transforms*



| | |
|---|---|
| **Model** | scikit-learn · pandas |
| **Input** | Any CSV |
| **Transforms** | 10+ |
| **Runs** | Server |
| **Tags** | Transforms, Interactions, Date Features, Cyclical |
| **Open** | `/tools/featureeng` |

### Feature Selection

*Keep Only What Matters*



| | |
|---|---|
| **Model** | RFE · SelectKBest · Variance |
| **Input** | Any CSV |
| **Methods** | 4 |
| **Runs** | Server |
| **Tags** | RFE, SelectKBest, Variance, Correlation |
| **Open** | `/tools/featureselect` |

### Optuna Tuning

*Post-Winner Hyperparameter Search*



| | |
|---|---|
| **Model** | TPE Sampler · 5-fold CV |
| **Input** | AutoML winner |
| **Max Trials** | 30 |
| **Runs** | Server |
| **Tags** | Optuna, TPE Sampler, 5-fold CV |
| **Open** | `/tools/optuna` |

### Pipeline Builder

*End-to-End ML Canvas*



| | |
|---|---|
| **Model** | Full Pipeline |
| **Input** | Any labeled CSV |
| **Stages** | 7 |
| **Runs** | Server |
| **Tags** | Pipeline, AutoML, Optuna, SHAP, Ensemble, End-to-End |
| **Open** | `/tools/pipeline-builder` |

### Pipeline Cinema

*Animated ML Showcase*



| | |
|---|---|
| **Model** | Visual Demo |
| **Input** | No upload needed |
| **Stages** | 4 |
| **Runs** | Server |
| **Tags** | Animation, Pipeline, Visual, Cinematic, Demo |
| **Open** | `/tools/pipeline-cinema` |

### Real-Time Analytics

*Live Event Dashboard*



| | |
|---|---|
| **Model** | Supabase Realtime · asyncpg |
| **Input** | Browser events (page views, tool opens) |
| **Live Events** | ∞ |
| **Runs** | Server |
| **Tags** | Real-Time, WebSocket, PostgreSQL, FastAPI, Supabase |
| **Open** | `/tools/realtime-analytics` |

### SHAP Explainability

*Per-Prediction Feature Impact*



| | |
|---|---|
| **Model** | SHAP · TreeExplainer |
| **Input** | AutoML winner |
| **Chart Per Prediction** | 1 |
| **Runs** | Server |
| **Tags** | SHAP, Feature Impact, Classification, Regression |
| **Open** | `/tools/shap` |

---

## Language & Documents

Reading and reasoning over text: questions answered from your own files, plain English turned into SQL.

4 tools. Browse them at `/tools/language-documents`.

### Contract/Invoice Reconciliation Assistant

*Discrepancy Report Across Documents*



| | |
|---|---|
| **Model** | Groq (llama-3.1-8b-instant) |
| **Input** | PDF, PNG, JPG (contract + invoices) |
| **Doc Roles** | 2 |
| **Runs** | Server |
| **Tags** | RAG, Reconciliation, Contracts, Invoices, LLM |
| **Open** | `/tools/contract-invoice-reconciliation` |

### Document Intelligence

*AI-Powered Document Data Extraction*



| | |
|---|---|
| **Model** | Groq / Gemini / Cohere |
| **Input** | PDF, PNG, JPG, JPEG, WEBP |
| **Document Types** | 8 |
| **Runs** | Server |
| **Tags** | OCR, LLM, PDF, Extraction, NLP |
| **Open** | `/tools/document-intelligence` |

### Multimodal RAG

*Tables & Figures as Citable Knowledge*



| | |
|---|---|
| **Model** | Groq / Mistral / Gemini |
| **Input** | PDF (text, tables, figures) |
| **Chunk Types** | 3 |
| **Runs** | Server |
| **Tags** | RAG, Multimodal, PDF, Citations, LLM |
| **Open** | `/tools/multimodal-rag` |

### Text-to-SQL Agent

*Natural Language → Database Queries*



| | |
|---|---|
| **Model** | Groq / Gemini / Cohere |
| **Input** | Natural language question |
| **LLM Providers** | 3 |
| **Runs** | Server |
| **Tags** | SQL, LLM, Agent, Database, NLP |
| **Open** | `/tools/text-to-sql` |

---

## Computer Vision

Tools that look at an image or a video — detection, depth, pose, re-identification and generation.

14 tools. Browse them at `/tools/computer-vision`.

### ASL Fingerspelling Recognition

*Client-Side · No API Cost*



| | |
|---|---|
| **Model** | MediaPipe HandLandmarker + k-NN (local) |
| **Input** | Live Webcam |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Sign Language, Hand Tracking, Client-Side, Local Compute |
| **Open** | `/tools/asl-fingerspelling-recognition` |

### Astrophotography Anomaly Detector

*Frame Differencing + Hough Transform*



| | |
|---|---|
| **Model** | OpenCV Hough Transform |
| **Input** | 5-30 Images |
| **API Calls** | 0 |
| **Runs** | Server |
| **Tags** | Astrophotography, Frame Differencing, Hough Transform, Image Stacking |
| **Open** | `/tools/astrophotography-anomaly-detector` |

### Crime Scene Reconstruction

*Sparse SfM*



| | |
|---|---|
| **Model** | OpenCV SIFT + incremental SfM |
| **Input** | Images |
| **API Calls** | 0 |
| **Runs** | Server |
| **Tags** | Structure-from-Motion, Photogrammetry, 3D Reconstruction, OpenCV |
| **Open** | `/tools/crime-scene-reconstruction` |

### Depth Parallax

*One Photo, Instant 3D*



| | |
|---|---|
| **Model** | Depth-Anything-V2-Small (ONNX) |
| **Input** | Single photo |
| **Model Size** | 37MB |
| **Runs** | Server |
| **Tags** | Depth Estimation, 3D, ONNX, Computer Vision |
| **Open** | `/tools/depth-parallax` |

### Face Liveness Detector

*Real vs. Spoofed*



| | |
|---|---|
| **Model** | MiniFASNetV2-SE (ONNX) |
| **Input** | Webcam or photo |
| **Model Size** | 600KB |
| **Runs** | Server |
| **Tags** | Biometric Security, Anti-Spoofing, ONNX, Computer Vision |
| **Open** | `/tools/face-liveness` |

### Gait Pattern Comparison

*Client-Side · No API Cost*



| | |
|---|---|
| **Model** | MediaPipe PoseLandmarker (local) |
| **Input** | 2 Videos |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Computer Vision, Gait Analysis, Client-Side, Local Compute |
| **Open** | `/tools/gait-pattern-comparison` |

### Movement Form Comparison

*Client-Side · No API Cost*



| | |
|---|---|
| **Model** | MediaPipe PoseLandmarker (local) |
| **Input** | 2 Videos |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Computer Vision, Sports Tech, Client-Side, Local Compute |
| **Open** | `/tools/movement-form-comparison` |

### PPE Compliance Check

*YOLOv8n PPE*



| | |
|---|---|
| **Model** | YOLOv8n PPE (ONNX) |
| **Input** | Image |
| **API Calls** | 0 |
| **Runs** | Server |
| **Tags** | PPE Detection, Workplace Safety, Object Detection, Computer Vision |
| **Open** | `/tools/ppe-compliance-check` |

### Photo Library Visual Search

*CLIP · No API Cost*



| | |
|---|---|
| **Model** | clip-ViT-B-32 (local) |
| **Input** | Batch of photos + text query |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | CLIP, Embeddings, Computer Vision, Local Compute |
| **Open** | `/tools/photo-search` |

### Plant Growth Quantification

*Local · No API Cost*



| | |
|---|---|
| **Model** | HSV segmentation (local) |
| **Input** | 2-30 timelapse photos |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Segmentation, Computer Vision, Local Compute |
| **Open** | `/tools/plant-growth` |

### Pose VJ Visuals

*Client-Side · No API Cost*



| | |
|---|---|
| **Model** | MediaPipe HandLandmarker (client-side WASM) |
| **Input** | Webcam + optional microphone |
| **Backend Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Computer Vision, Creative Coding, Client-Side, Generative Art |
| **Open** | `/tools/pose-vj-visuals` |

### Text-Prompted Video Object Tracking

*Grounded-SAM*



| | |
|---|---|
| **Model** | SAM2 + Grounding DINO |
| **Input** | Video + Text |
| **API Call** | 1 |
| **Runs** | Server |
| **Tags** | Video Segmentation, Open-Vocabulary Detection, Grounded-SAM, Object Tracking |
| **Open** | `/tools/text-prompted-video-tracking` |

### Text-to-Image Generator

*Describe It, Generate It*



| | |
|---|---|
| **Model** | Gemini (gemini-3.1-flash-lite-image) |
| **Input** | Text prompt |
| **Prompt In** | 1 |
| **Runs** | Server |
| **Tags** | Image Generation, Gemini, Generative AI |
| **Open** | `/tools/text-to-image` |

### Wildlife Re-Identification

*MegaDescriptor*



| | |
|---|---|
| **Model** | MegaDescriptor-T-224 |
| **Input** | Target + Gallery Photos |
| **API Calls** | 0 |
| **Runs** | Server |
| **Tags** | Wildlife, Re-Identification, Embedding Similarity, Computer Vision |
| **Open** | `/tools/wildlife-reidentification` |

---

## Security & Trust

Checking whether something can be trusted: files, links, emails, packages, models and the people behind them.

21 tools. Browse them at `/tools/security-trust`.

### AI-Generated Code Detector

*Signals, Not A Verdict*



| | |
|---|---|
| **Model** | Client heuristics + Mistral judge |
| **Input** | Text |
| **API Calls** | 0 |
| **Runs** | Server |
| **Tags** | Code Stylometry, LLM Security, Zero Overclaiming, Second Opinion |
| **Open** | `/tools/ai-code-detector` |

### Adversarial Robustness Lab

*Local · No API Cost*



| | |
|---|---|
| **Model** | MobileNetV2 + FGSM/PGD/Patch/Black-box (local) |
| **Input** | Photo |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Adversarial ML, Security, Computer Vision, Local Compute |
| **Open** | `/tools/adversarial-robustness-lab` |

### Attack-Surface / Exposed-Path Scanner

*Live Recon · Zero ML*



| | |
|---|---|
| **Model** | httpx + socket (server-side, no ML) |
| **Input** | Domain name |
| **Passive Checks** | 4 |
| **Runs** | Server, with a live external check |
| **Tags** | Security, Recon, Attack Surface, Live Network Check |
| **Open** | `/tools/attack-surface-scanner` |

### Binary Byte-Plot & Entropy Triage

*Static Analysis · No Execution*



| | |
|---|---|
| **Model** | Byte-plot + Shannon entropy (local) |
| **Input** | Any file |
| **Files Executed** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Security Research, Static Analysis, Malware Triage, Local Compute |
| **Open** | `/tools/malware-image-triage` |

### Browser Extension Permission Risk Analyzer

*Local · No API Cost*



| | |
|---|---|
| **Model** | Rule-based (local) |
| **Input** | Text |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Browser Security, Static Analysis, Zero ML, Local Compute |
| **Open** | `/tools/extension-permission-analyzer` |

### CAPTCHA Hardening Lab

*VLM Read Attempt · Before/After*



| | |
|---|---|
| **Model** | Mistral/Gemini vision cascade |
| **Input** | Photo |
| **VLM Read Attempts** | 2 |
| **Runs** | Server |
| **Tags** | Security Research, CAPTCHA, Adversarial ML, Vision-Language Model |
| **Open** | `/tools/captcha-hardening-lab` |

### DNS Tunneling / Exfiltration Detector

*Local · No API Cost*



| | |
|---|---|
| **Model** | Shannon entropy + heuristics (local) |
| **Input** | Pasted DNS query log or hostname |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Security, DNS Tunneling, Data Exfiltration, Local Compute |
| **Open** | `/tools/dns-tunneling-detector` |

### Email Header Authentication Checker

*Live DNS · Zero ML*



| | |
|---|---|
| **Model** | DNS TXT lookups (live) |
| **Input** | Text |
| **API Calls** | 0 |
| **Runs** | Server |
| **Tags** | Email Security, DNS, Anti-Spoofing, Zero ML |
| **Open** | `/tools/email-auth-checker` |

### Face Cloak

*Local · No API Cost*



| | |
|---|---|
| **Model** | InceptionResnetV1 (local) |
| **Input** | Photo |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Privacy, Security, Computer Vision, Local Compute |
| **Open** | `/tools/face-cloak` |

### Face Deanonymization Risk Demo

*Local · No API Cost*



| | |
|---|---|
| **Model** | InceptionResnetV1 (local) |
| **Input** | Photos |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Privacy, Security, Computer Vision, Local Compute |
| **Open** | `/tools/face-deanonymization-demo` |

### Keystroke Biometric Auth-Risk Demo

*Live Biometric Demo · Zero ML*



| | |
|---|---|
| **Model** | Scaled Manhattan distance (client-side) |
| **Input** | Typed keystroke timing |
| **Timing Signals** | 2 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Security, Biometrics, Keystroke Dynamics, Client-Side |
| **Open** | `/tools/keystroke-biometric-auth-risk` |

### LLM Prompt Injection Detection Playground

*Pattern + LLM Judge*



| | |
|---|---|
| **Model** | Regex heuristics + Mistral judge |
| **Input** | Text |
| **API Calls** | 0 |
| **Runs** | Server |
| **Tags** | Prompt Injection, LLM Security, AI Red-Teaming, RAG |
| **Open** | `/tools/prompt-injection-playground` |

### Malicious Package Scanner

*Local · No API Cost*



| | |
|---|---|
| **Model** | Static heuristics (local) |
| **Input** | Pasted manifest or source code |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Security, Supply Chain, Static Analysis, Local Compute |
| **Open** | `/tools/malicious-package-scanner` |

### Password Strength & Breach Checker

*Local · No API Cost*



| | |
|---|---|
| **Model** | zxcvbn-ts + HIBP k-anonymity range API |
| **Input** | Password (never stored) |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Security, Password Strength, Breach Detection, Local Compute |
| **Open** | `/tools/password-audit` |

### Phishing Email Body Classifier

*Local · No API Cost*



| | |
|---|---|
| **Model** | Multinomial Naive Bayes (local) |
| **Input** | Pasted email body text |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Security, Phishing Detection, NLP, Local Compute |
| **Open** | `/tools/phishing-email-classifier` |

### QR Phishing Detector

*Local · No API Cost*



| | |
|---|---|
| **Model** | cv2 QRCodeDetector + heuristics (local) |
| **Input** | Photo or screenshot |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Security, Phishing Detection, Computer Vision, Local Compute |
| **Open** | `/tools/qr-phishing-detector` |

### SIEM Alert Triage Agent

*Grouping + LLM Judge*



| | |
|---|---|
| **Model** | Client-side grouping + Mistral small (server key) |
| **Input** | Pasted raw alert log |
| **Analysis Layers** | 2 |
| **Runs** | Server |
| **Tags** | Security, SIEM, Alert Triage, LLM Judge |
| **Open** | `/tools/siem-alert-triage` |

### Style Cloak

*Local · No API Cost*



| | |
|---|---|
| **Model** | CLIP ViT-B/32 (local) |
| **Input** | Image |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Privacy, Security, Computer Vision, Local Compute |
| **Open** | `/tools/style-cloak` |

### TLS / Security-Headers Scanner

*Live TLS + Headers · Zero ML*



| | |
|---|---|
| **Model** | ssl/socket + httpx (server-side, no ML) |
| **Input** | Domain name |
| **Headers Checked** | 6 |
| **Runs** | Server, with a live external check |
| **Tags** | Security, TLS, HTTP Security Headers, Live Network Check |
| **Open** | `/tools/tls-security-headers-scanner` |

### Video-Call Keystroke Inference

*Client-Side Only*



| | |
|---|---|
| **Model** | MediaPipe HandLandmarker (local) |
| **Input** | Video |
| **API Calls** | 0 |
| **Runs** | In your browser — nothing is uploaded |
| **Tags** | Security Research, Side-Channel, Computer Vision, Local Compute |
| **Open** | `/tools/video-keystroke-inference` |

### YARA File Scanner

*Live Engine · Real YARA*



| | |
|---|---|
| **Model** | yara-python (real YARA engine) |
| **Input** | Uploaded file + optional custom rule |
| **Built-in Rules** | 7 |
| **Runs** | Server, with a live external check |
| **Tags** | Security, YARA, Malware Analysis, Live Engine |
| **Open** | `/tools/yara-file-scanner` |

---

## Platforms

Complete multi-model applications, as opposed to the single-purpose tools above.

### ML Unified Platform

*Platform*

One app, four models. Select Iris classifier, Titanic survival predictor, Diabetes risk model, or Insurance premium estimator from a sidebar — all served from a single schema-driven FastAPI backend with dynamic forms.

| | |
|---|---|
| **Model** | Multi-Model |
| **Data** | 4 Datasets · 26 Features |
| **Models** | 4 |
| **Tags** | Platform, FastAPI, Schema-Driven, Classification, Regression |

### EDA Explorer

*Exploratory Analysis*

Upload any CSV dataset and instantly explore it — shape, dtypes, missing value heatmap, per-column distributions (histograms for numeric, bar charts for categorical), descriptive statistics, outlier counts, and a full Pearson correlation heatmap. No code required.

| | |
|---|---|
| **Model** | Pandas · NumPy |
| **Data** | Any CSV |
| **Datasets** | ∞ |
| **Tags** | EDA, Statistics, Correlation, Distributions, Data Profiling |

### ML Vision Platform

*Vision*

Three vision tasks in one app: classify images across 1000 ImageNet categories (MobileNetV2 · ResNet50 · SqueezeNet · GoogLeNet), detect objects with TinyYOLOv3 (COCO 80 classes), and segment scenes pixel-by-pixel with SegFormer-B0 (ADE20K 150 classes). All models run as ONNX on a FastAPI microservice.

| | |
|---|---|
| **Model** | SegFormer-B0 · YOLOv3 · MobileNetV2 |
| **Data** | ImageNet · COCO · ADE20K |
| **Seg Classes** | 150 |
| **Tags** | Vision, ONNX, Segmentation, Detection, Classification |

