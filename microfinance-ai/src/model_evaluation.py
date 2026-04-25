import joblib
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import os
os.makedirs("visualizations", exist_ok=True)

print("=== GROUP MEMBER 5: TASK 5 - Model Evaluation ===")

_, X_test, _, y_test = joblib.load("data/preprocessed_data.pkl")
baselines = joblib.load("models/baselines_and_clf.pkl")
best_clf = joblib.load("models/best_risk_classifier.pkl")
logreg, rf, _ = baselines

models = {"Logistic Regression": logreg, "Random Forest": rf, "XGBoost (Best)": best_clf}
results = []

for name, model in models.items():
    pred = model.predict(X_test)
    prob = model.predict_proba(X_test)[:, 1]
    results.append({
        "Model": name,
        "Accuracy": accuracy_score(y_test, pred),
        "Precision": precision_score(y_test, pred),
        "Recall": recall_score(y_test, pred),
        "F1": f1_score(y_test, pred),
        "ROC-AUC": roc_auc_score(y_test, prob)
    })

comparison = pd.DataFrame(results)
comparison.to_csv("visualizations/model_comparison.csv", index=False)
print(comparison.round(4))

plt.figure(figsize=(10,6))
sns.barplot(data=comparison, x="Model", y="ROC-AUC", palette="viridis")
plt.title("Model Comparison - ROC-AUC")
plt.savefig("visualizations/model_comparison_roc_auc.png")
plt.close()

cm = confusion_matrix(y_test, best_clf.predict(X_test))
plt.figure(figsize=(6,5))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues")
plt.title("Confusion Matrix - Best XGBoost")
plt.savefig("visualizations/confusion_matrix.png")
plt.close()

print("TASK 5 COMPLETE")