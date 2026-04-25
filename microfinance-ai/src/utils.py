import joblib
import pandas as pd
import numpy as np
import os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_, _, encoder, scaler, numeric_cols_raw, _ = joblib.load(os.path.join(root, "models", "step1_preprocessed.pkl"))
selected_features = joblib.load(os.path.join(root, "models", "selected_features.pkl"))
final_scaler = joblib.load(os.path.join(root, "models", "final_scaler.pkl"))

def preprocess_input(request):
    data = pd.DataFrame([request.dict(exclude={"custom_loan_amount", "custom_interest_rate", "custom_loan_term"})])
    
    data["LoanToIncome"] = data["LoanAmount"] / (data["Income"] + 1e-8)
    data["EMIToIncome"] = (data["LoanAmount"] * (data["InterestRate"] / 100 / 12)) / (data["Income"] + 1e-8)
    data["EmploymentStability"] = data["MonthsEmployed"] / 12.0
    data["CreditUtilization"] = data["NumCreditLines"] / (data["CreditScore"] / 100 + 1e-8)
    data["PaymentRiskScore"] = data["InterestRate"] * data["DTIRatio"]
    data["LogIncome"] = np.log1p(data["Income"])
    data["LogLoanAmount"] = np.log1p(data["LoanAmount"])
    data["TotalDebtBurden"] = data["LoanToIncome"] * data["InterestRate"]
    
    X_num = final_scaler.transform(data[selected_features])
    X_cat = encoder.transform(data[["Education", "EmploymentType", "MaritalStatus",
                                    "HasMortgage", "HasDependents", "LoanPurpose", "HasCoSigner"]])
    return np.hstack((X_num, X_cat))[0]