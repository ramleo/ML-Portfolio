"use client";

import { useState } from "react";

const ACCENT = "#a9652d";

const TAB_LABELS: Record<string, string> = {
  variance:    "Variance Filter",
  correlation: "Correlation Filter",
  topk:        "Top-K Filter",
  selectkbest: "SelectKBest",
  kendall:     "Kendall τ",
  chisq:       "Chi-squared",
  rfe:         "RFE",
  lasso:       "Lasso (L1)",
  ridge:       "Ridge (L2)",
  tree:        "Tree Importance",
  forward:     "Forward Selection",
  exhaustive:  "Exhaustive Search",
  pca:         "PCA",
  umap:        "UMAP",
  fa:          "Factor Analysis",
  lda:         "Linear Discriminant Analysis",
};

const HOW_IT_WORKS: Record<string, string> = {
  variance: "Computes the variance of each numeric feature across all rows. Variance = E[(X−μ)²]. Features with variance below the threshold are constant or near-constant and carry no signal — they are dropped first. E.g. if 'zipcode' has variance 0.0003 and your threshold is 0.01, it gets dropped — it barely changes across rows.",
  correlation: "Builds a Pearson r matrix between numeric features. When |r(A,B)| exceeds the threshold, the feature with lower mutual information vs. the target is discarded. This removes multicollinearity without losing predictive power. E.g. 'height_cm' and 'height_in' have r=0.99 — the one with lower MI vs. target is dropped.",
  topk: "After variance and correlation filtering, computes mutual information (MI ≈ −0.5 log(1−r²)) between each feature and the target, then keeps only the K highest-MI features. Fast hard-cutoff for very wide datasets. E.g. with K=5 and 20 candidates, only the 5 highest-MI features survive this step.",
  selectkbest: "Applies a univariate statistical test to each feature independently. f_regression: F(1,n−2) linear correlation. f_classif: one-way ANOVA. mi: MI approximation. Keeps the K features with the highest test score. E.g. f_regression on 'income' vs. 'price' computes F=142.3, ranking it above 'age' at F=8.1.",
  kendall: "Computes Kendall's τ rank correlation. For every pair of observations (x_i, x_j), counts concordant pairs (same order in feature and target) minus discordant pairs, divided by total pairs. Robust to outliers and non-linear monotonic relationships. E.g. 'education_level' (ordinal) vs. 'salary' gets τ=0.61 — strong monotonic association without assuming linearity.",
  chisq: "Bins numeric features into quartiles, then applies a χ² test of independence against the (binned) target. χ² = Σ (O−E)²/E where O = observed count and E = expected under independence. Higher χ² = stronger dependence. E.g. 'region' binned × 'churn' category yields χ²=38.4 — far above the independence baseline.",
  rfe: "Iterative backward elimination. Each round scores remaining features by MI × (1 − 0.35 × avg_redundancy_with_others) and removes the lowest-scoring one. Continues until the target count is reached. Penalises weak AND redundant features differently from pure MI. E.g. round 1 removes 'id' (MI=0.01, high redundancy with 'user_id'); round 2 removes 'tenure_days' once 'tenure_months' is kept.",
  lasso: "Coordinate descent with L1 regularisation. Soft-threshold update: w_j = sign(ρ_j) × max(|ρ_j| − α, 0) where ρ_j is the partial correlation residual. L1 penalty drives weak coefficients to exactly zero — built-in feature elimination. E.g. with α=0.05, 'transaction_count' weight shrinks to exactly 0 — Lasso has eliminated it.",
  ridge: "Gradient descent with L2 regularisation. Weight update: w_j ← w_j − lr × (∂MSE/∂w_j + 2αw_j). L2 shrinks all coefficients but never to zero — features ranked by final |w_j| and the weakest are pruned. E.g. 'age' and 'age_squared' both stay but their coefficients shrink from ±1.8 to ±0.3, and 'age_squared' ranks lower.",
  tree: "Random Forest-style importance. Builds N bootstrap trees; each split considers √p random features. Importance = cumulative weighted Gini (classification) or variance-reduction (regression) gain across all splits on each feature, averaged over trees. E.g. 'glucose' accumulates 0.38 average Gini gain across 50 trees — ranked #1 importance.",
  forward: "Greedy wrapper. Starts with an empty set S. Each round adds the feature f* = argmax_f MI(f, target) × (1 − 0.2 × avg_corr(f, S)). The diversity penalty (0.2 × redundancy) rewards diverse, complementary features over pure top-MI selection. E.g. step 1 picks 'glucose' (MI=0.71); step 2 picks 'bmi' (MI=0.54, low corr with glucose) over 'insulin' (MI=0.58, high corr with glucose).",
  exhaustive: "Enumerates all C(n,k) feature subsets of size k and scores each by avgMI(subset, target) − 0.3 × avgInterCorr(subset). Computationally infeasible for n > 15, so the algorithm automatically falls back to Forward Selection beyond that threshold. E.g. with 8 candidates and K=3, all C(8,3)=56 subsets are scored — {glucose, bmi, age} wins with score 0.61.",
  pca: "Standardises features (z-score), computes the covariance matrix, and extracts principal components via power iteration + deflation. Each PC is a linear combination of original features ordered by variance explained (eigenvalue / total variance). E.g. 10 correlated sensor features → PC1 explains 68% variance, PC2 explains 19% — 2 components replace 10 columns.\n\nKaiser criterion (Auto mode): on standardised data every original feature contributes exactly 1.0 to total variance, so an eigenvalue > 1 means that component alone captures more information than any single raw feature — it earns its place. Components with λ ≤ 1 explain less than one feature would and are discarded. Use Kaiser when you have no prior theory about how many components to keep and want a principled automatic cut-off. Caveat: on small datasets Kaiser can be too aggressive (dropping borderline components); on very wide datasets it can keep too many. When in doubt, compare Auto vs. manual scree-plot inspection.",
  umap: "Builds a k-NN affinity graph using Gaussian kernel weights, normalises it into a symmetric Laplacian, then extracts the eigenvectors corresponding to the 2 or 3 smallest non-zero eigenvalues. This spectral embedding captures non-linear manifold structure. E.g. a dataset of 500 handwritten digits (784 features) embedded into 2D reveals 10 tight clusters — one per digit class.",
  fa: "Factor Analysis finds latent variables (factors) that explain correlations between features. Unlike PCA which maximises total variance, FA models shared variance (communalities h²). Iteratively estimates loadings via principal axis factoring: replace diagonal of correlation matrix with current h²_i, extract eigenvectors, update communalities. Loadings show how strongly each feature relates to each factor. E.g. on Titanic: Factor 1 loads heavily on Fare (+0.81) and Pclass (−0.78) — both driven by latent 'wealth'. Caveat: assumes linear relationships between features and latent factors.",
  lda: "Linear Discriminant Analysis (LDA) finds axes that maximally separate classes. Computes between-class scatter S_B and within-class scatter S_W, then extracts eigenvectors of S_W⁻¹S_B — these discriminants push different classes apart while keeping same-class points close. Unlike PCA (unsupervised), LDA is supervised: it uses your target labels. E.g. on Titanic (Survived 0/1): LD1 aligns with the Fare+Pclass direction that best separates survivors from non-survivors. Caveat: requires categorical target; assumes Gaussian class distributions; max components = nClasses − 1. Max usable components = nClasses − 1: binary classification gives 1 component (1D projection), 3 classes gives max 2D scatter, 4+ classes allows 3D.",
};

export default function HowItWorks({ tabId }: { tabId: string }) {
  const [open, setOpen] = useState(false);
  const text = HOW_IT_WORKS[tabId];
  if (!text) return null;
  const label = TAB_LABELS[tabId] ?? tabId;
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          fontSize: "0.72rem", fontWeight: 600, color: "var(--text3)",
          transition: "color 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text3)")}
      >
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}
        >
          <path d="M3 2l4 3-4 3z" />
        </svg>
        How {label} works
      </button>
      {open && (
        <div style={{
          marginTop: "0.45rem", padding: "0.65rem 0.9rem",
          background: "rgba(255,255,255,0.03)", borderLeft: `2px solid ${ACCENT}`,
          borderRadius: "0 6px 6px 0", fontSize: "0.74rem",
          color: "var(--text3)", lineHeight: 1.65,
        }}>
          {text}
        </div>
      )}
    </div>
  );
}