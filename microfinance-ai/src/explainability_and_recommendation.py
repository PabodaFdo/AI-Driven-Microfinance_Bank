import joblib
import shap
import numpy as np
import matplotlib.pyplot as plt
import os

os.makedirs("visualizations", exist_ok=True)

print("=== GROUP MEMBER 6: TASK 6 - Explainability & Recommendation ===")

# Use project-root-safe absolute paths
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

best_clf = joblib.load(os.path.join(root, "models", "best_risk_classifier.pkl"))
reg_amount, reg_rate, reg_term = joblib.load(os.path.join(root, "models", "recommendation_models.pkl"))
final_scaler = joblib.load(os.path.join(root, "models", "final_scaler.pkl"))
selected_features = joblib.load(os.path.join(root, "models", "selected_features.pkl"))
_, X_test, _, _ = joblib.load(os.path.join(root, "data", "preprocessed_data.pkl"))

explainer = shap.TreeExplainer(best_clf)
shap_values = explainer.shap_values(X_test[:500])
shap.summary_plot(shap_values, X_test[:500], show=False)
plt.savefig("visualizations/shap_summary.png")
plt.close()
print("SHAP summary plot saved")

ALLOWED_TERMS = [6, 12, 18, 24, 36, 48, 60]

def get_recommendation(applicant_array, custom_plan=None, requested_amount=None):
    risk_prob = best_clf.predict_proba(applicant_array.reshape(1, -1))[0][1]
    risk_category = "Low" if risk_prob < 0.25 else "Medium" if risk_prob <= 0.5 else "High"

    # Compute SHAP values for this prediction
    shap_values = explainer.shap_values(applicant_array.reshape(1, -1))[0]

    # Extract top 5 features by absolute SHAP value
    shap_indices = np.argsort(np.abs(shap_values))[-5:][::-1]  # Top 5 in descending order
    shap_explanations = []
    for idx in shap_indices:
        feature_name = selected_features[idx] if idx < len(selected_features) else f"Feature_{idx}"
        shap_val = float(shap_values[idx])
        shap_explanations.append({
            "feature": feature_name,
            "shap_value": round(shap_val, 4),
            "contribution": "positive" if shap_val > 0 else "negative"
        })

    loan_amount_idx = selected_features.index("LoanAmount") if "LoanAmount" in selected_features else 2
    interest_rate_idx = selected_features.index("InterestRate") if "InterestRate" in selected_features else 6
    loan_term_idx = selected_features.index("LoanTerm") if "LoanTerm" in selected_features else 7

    def snap_to_allowed_term(term_value):
        return min(ALLOWED_TERMS, key=lambda x: abs(x - term_value))

    def clamp_amount(value):
        return max(5000, min(float(value), 500000))

    def clamp_rate(value):
        return max(5.0, min(float(value), 30.0))

    def safe_amount_by_risk(predicted_amount, requested_amount, risk_category):
        if requested_amount is None:
            return clamp_amount(predicted_amount)

        requested_amount = clamp_amount(requested_amount)

        if risk_category == "Low":
            # Low risk: applicant can receive the requested amount
            return requested_amount
        elif risk_category == "Medium":
            # Medium risk: safer reduced amount
            candidate = min(predicted_amount, requested_amount * 0.85, requested_amount)
            return clamp_amount(candidate)
        else:
            # High risk: stronger reduction
            candidate = min(predicted_amount, requested_amount * 0.60, requested_amount)
            return clamp_amount(candidate)

    if custom_plan and custom_plan.get("LoanAmount") is not None:
        requested_amount = float(custom_plan["LoanAmount"])

        if risk_category == "Low":
            approved_amount = clamp_amount(requested_amount)
            approved_rate = clamp_rate(custom_plan["InterestRate"])
            approved_term = snap_to_allowed_term(round(custom_plan["LoanTerm"]))

            return {
                "status": "APPROVED",
                "plan": {
                    "LoanAmount": round(approved_amount, 2),
                    "InterestRate": round(approved_rate, 2),
                    "LoanTerm": approved_term
                },
                "risk_probability": float(risk_prob),
                "shap_explanations": shap_explanations
            }
        else:
            scaled_amount = reg_amount.predict(applicant_array.reshape(1, -1))[0]
            scaled_rate = reg_rate.predict(applicant_array.reshape(1, -1))[0]
            scaled_term = reg_term.predict(applicant_array.reshape(1, -1))[0]

            amount_original = scaled_amount * final_scaler.scale_[loan_amount_idx] + final_scaler.mean_[loan_amount_idx]
            rate_original = scaled_rate * final_scaler.scale_[interest_rate_idx] + final_scaler.mean_[interest_rate_idx]
            term_original = scaled_term * final_scaler.scale_[loan_term_idx] + final_scaler.mean_[loan_term_idx]

            safe_amount = safe_amount_by_risk(amount_original, requested_amount, risk_category)
            safe_rate = clamp_rate(rate_original * 0.9)
            safe_term = snap_to_allowed_term(round(term_original * 1.2))

            return {
                "status": "RECOMMENDED_SAFER",
                "plan": {
                    "LoanAmount": round(safe_amount, 2),
                    "InterestRate": round(safe_rate, 2),
                    "LoanTerm": safe_term
                },
                "risk_probability": float(risk_prob),
                "shap_explanations": shap_explanations
            }
    else:
        scaled_amount = reg_amount.predict(applicant_array.reshape(1, -1))[0]
        scaled_rate = reg_rate.predict(applicant_array.reshape(1, -1))[0]
        scaled_term = reg_term.predict(applicant_array.reshape(1, -1))[0]

        amount_original = scaled_amount * final_scaler.scale_[loan_amount_idx] + final_scaler.mean_[loan_amount_idx]
        rate_original = scaled_rate * final_scaler.scale_[interest_rate_idx] + final_scaler.mean_[interest_rate_idx]
        term_original = scaled_term * final_scaler.scale_[loan_term_idx] + final_scaler.mean_[loan_term_idx]

        safe_amount = safe_amount_by_risk(amount_original, requested_amount, risk_category)
        safe_rate = clamp_rate(rate_original)
        safe_term = snap_to_allowed_term(round(term_original))

        return {
            "status": "RECOMMENDED",
            "plan": {
                "LoanAmount": round(safe_amount, 2),
                "InterestRate": round(safe_rate, 2),
                "LoanTerm": safe_term
            },
            "risk_probability": float(risk_prob),
            "shap_explanations": shap_explanations
        }

joblib.dump(get_recommendation, "models/recommendation_function.pkl")
print("TASK 6 COMPLETE")