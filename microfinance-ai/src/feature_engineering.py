import pandas as pd
import numpy as np
from sklearn.model_selection import cross_val_score
from xgboost import XGBClassifier
import joblib
import os
os.makedirs("visualizations", exist_ok=True)

print("=== GROUP MEMBER 2: TASK 2 - Feature Engineering + Best Feature Selection ===")

df = pd.read_csv("data/cleaned_loans.csv")

df["LoanToIncome"] = df["LoanAmount"] / (df["Income"] + 1e-8)
df["EMIToIncome"] = (df["LoanAmount"] * (df["InterestRate"] / 100 / 12)) / (df["Income"] + 1e-8)
df["EmploymentStability"] = df["MonthsEmployed"] / 12.0
df["CreditUtilization"] = df["NumCreditLines"] / (df["CreditScore"] / 100 + 1e-8)
df["PaymentRiskScore"] = df["InterestRate"] * df["DTIRatio"]
df["LogIncome"] = np.log1p(df["Income"])
df["LogLoanAmount"] = np.log1p(df["LoanAmount"])
df["TotalDebtBurden"] = df["LoanToIncome"] * df["InterestRate"]

numeric_cols_new = ["Age", "Income", "LoanAmount", "CreditScore", "MonthsEmployed",
                    "NumCreditLines", "InterestRate", "LoanTerm", "DTIRatio",
                    "LoanToIncome", "EMIToIncome", "EmploymentStability",
                    "CreditUtilization", "PaymentRiskScore", "LogIncome",
                    "LogLoanAmount", "TotalDebtBurden"]

print("Testing feature combos for highest accuracy...")
X_num = df[numeric_cols_new].copy()
y = df["Default"]

temp_model = XGBClassifier(random_state=42, eval_metric="auc", n_estimators=100)
temp_model.fit(X_num, y)
importances = pd.Series(temp_model.feature_importances_, index=numeric_cols_new).sort_values(ascending=False)

best_score = 0
best_features = numeric_cols_new
for k in range(8, len(numeric_cols_new) + 1):
    selected = importances.head(k).index.tolist()
    score = cross_val_score(XGBClassifier(random_state=42, eval_metric="auc"),
                            X_num[selected], y, cv=5, scoring="roc_auc", n_jobs=-1).mean()
    if score > best_score:
        best_score = score
        best_features = selected

print(f"Best feature set ({len(best_features)} features) - CV AUC: {best_score:.4f}")
joblib.dump(best_features, "models/selected_features.pkl")
df.to_csv("data/engineered_loans.csv", index=False)

print("TASK 2 COMPLETE")