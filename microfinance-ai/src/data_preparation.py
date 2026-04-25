import pandas as pd
import numpy as np
from sklearn.preprocessing import OneHotEncoder, StandardScaler
import joblib
import os

os.makedirs("models", exist_ok=True)
os.makedirs("data", exist_ok=True)

print("=== GROUP MEMBER 1: TASK 1 - Data Preparation (Outlier/Duplicate/Encoding/Scaling on INITIAL dataset) ===")

df = pd.read_csv("data/Loan_default.csv")
print(f"Original shape: {df.shape}")

df = df.drop(columns=["LoanID"])
df = df.drop_duplicates().reset_index(drop=True)
print(f"After duplicate removal: {df.shape}")

numeric_cols_raw = ["Age", "Income", "LoanAmount", "CreditScore", "MonthsEmployed",
                    "NumCreditLines", "InterestRate", "LoanTerm", "DTIRatio"]

def cap_outliers(series, factor=1.5):
    Q1 = series.quantile(0.25)
    Q3 = series.quantile(0.75)
    IQR = Q3 - Q1
    return series.clip(lower=Q1 - factor * IQR, upper=Q3 + factor * IQR)

for col in numeric_cols_raw:
    df[col] = cap_outliers(df[col])
    print(f"Outliers capped in {col}")

cat_cols = ["Education", "EmploymentType", "MaritalStatus", "HasMortgage",
            "HasDependents", "LoanPurpose", "HasCoSigner"]

encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore", drop="first")
X_cat = encoder.fit_transform(df[cat_cols])

scaler = StandardScaler()
X_num = scaler.fit_transform(df[numeric_cols_raw])

X_preprocessed = np.hstack((X_num, X_cat))
y = df["Default"].values

joblib.dump((X_preprocessed, y, encoder, scaler, numeric_cols_raw, list(encoder.get_feature_names_out(cat_cols))), 
            "models/step1_preprocessed.pkl")

df.to_csv("data/cleaned_loans.csv", index=False)

print("TASK 1 COMPLETE")