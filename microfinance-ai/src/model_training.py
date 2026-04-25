import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib

print("=== GROUP MEMBER 3: TASK 3 - Encoding/Scaling NEW features + Model Training ===")

df = pd.read_csv("data/engineered_loans.csv")
selected_features = joblib.load("models/selected_features.pkl")
cat_cols = ["Education", "EmploymentType", "MaritalStatus", "HasMortgage",
            "HasDependents", "LoanPurpose", "HasCoSigner"]

X = df.drop("Default", axis=1)
y = df["Default"]

encoder = joblib.load("models/step1_preprocessed.pkl")[2]
scaler_new = StandardScaler()
X_num = scaler_new.fit_transform(X[selected_features])
X_cat = encoder.transform(X[cat_cols])
X_final = np.hstack((X_num, X_cat))

X_train, X_test, y_train, y_test = train_test_split(
    X_final, y, test_size=0.2, random_state=42, stratify=y
)

smote = SMOTE(random_state=42)
X_train_res, y_train_res = smote.fit_resample(X_train, y_train)

logreg = LogisticRegression(max_iter=1000, random_state=42)
rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
clf = xgb.XGBClassifier(objective="binary:logistic", eval_metric="auc",
                        random_state=42, n_estimators=200, learning_rate=0.1, max_depth=6)

logreg.fit(X_train_res, y_train_res)
rf.fit(X_train_res, y_train_res)
clf.fit(X_train_res, y_train_res)

non_default = y_train_res == 0
X_safe = X_train_res[non_default]
reg_amount = xgb.XGBRegressor(random_state=42)
reg_rate = xgb.XGBRegressor(random_state=42)
reg_term = xgb.XGBRegressor(random_state=42)
reg_amount.fit(X_safe, X_safe[:, selected_features.index("LoanAmount") if "LoanAmount" in selected_features else 2])
reg_rate.fit(X_safe, X_safe[:, selected_features.index("InterestRate") if "InterestRate" in selected_features else 6])
reg_term.fit(X_safe, X_safe[:, selected_features.index("LoanTerm") if "LoanTerm" in selected_features else 7])

joblib.dump((X_train_res, X_test, y_train_res, y_test), "data/preprocessed_data.pkl")
joblib.dump((logreg, rf, clf), "models/baselines_and_clf.pkl")
joblib.dump((reg_amount, reg_rate, reg_term), "models/recommendation_models.pkl")
joblib.dump(scaler_new, "models/final_scaler.pkl")

print("TASK 3 COMPLETE")