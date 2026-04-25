import os
import sys

# Add parent directory to path so imports work when running from api directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import logging
from typing import Optional, List, Dict, Any
from src.utils import preprocess_input
from src.explainability_and_recommendation import get_recommendation

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Microfinance Loan Risk Engine",
    version="1.0.0",
    description="AI service for loan risk prediction and recommendations"
)

class LoanRequest(BaseModel):
    """Request schema for loan prediction - matches Spring backend contract"""
    Age: int
    Income: float
    LoanAmount: float
    CreditScore: int
    MonthsEmployed: int
    NumCreditLines: int
    InterestRate: float
    LoanTerm: int
    DTIRatio: float
    Education: str
    EmploymentType: str
    MaritalStatus: str
    HasMortgage: str
    HasDependents: str
    LoanPurpose: str
    HasCoSigner: str
    # Optional fields for recommendation endpoint
    RiskScore: Optional[float] = None
    RiskLevel: Optional[str] = None

class RiskPredictionResponse(BaseModel):
    """Response schema for /predict-risk endpoint"""
    risk_probability: float
    risk_category: str  # "LOW", "MEDIUM", "HIGH"
    decision: str  # "APPROVE" or "DENY"
    explanation: str
    shap_explanations: List[Dict[str, Any]]

class RecommendationResponse(BaseModel):
    """Response schema for /predict-recommendation endpoint"""
    recommended_amount: float
    recommended_term: int
    recommended_rate: float
    feasibility: str  # "HIGH", "MEDIUM", "LOW"
    reasoning: str
    shap_explanations: List[Dict[str, Any]]

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AI Microfinance Loan Risk Engine",
        "version": "1.0.0"
    }

@app.post("/predict-risk", response_model=RiskPredictionResponse)
async def predict_risk(request: LoanRequest):
    """
    Predict loan risk for an applicant.

    Returns:
    - risk_probability: Float between 0 and 1 (0 = low risk, 1 = high risk)
    - risk_category: "LOW", "MEDIUM", or "HIGH"
    - decision: "APPROVE" or "DENY"
    - explanation: Human-readable explanation
    - shap_explanations: Top features influencing the prediction
    """
    try:
        # Preprocess input features
        features = preprocess_input(request)

        # Get recommendation (which includes risk prediction)
        result = get_recommendation(features, custom_plan=None, requested_amount=request.LoanAmount)

        # Extract risk probability
        risk_prob = result["risk_probability"]

        # Determine risk category (uppercase for Spring backend contract)
        if risk_prob < 0.25:
            risk_category = "LOW"
        elif risk_prob <= 0.5:
            risk_category = "MEDIUM"
        else:
            risk_category = "HIGH"

        # Determine decision based on risk category
        # APPROVE if LOW risk, DENY if HIGH risk, APPROVE with caution for MEDIUM
        if risk_category == "LOW":
            decision = "APPROVE"
            explanation = "Applicant has low credit risk. Loan is recommended for approval."
        elif risk_category == "MEDIUM":
            decision = "APPROVE"
            explanation = "Applicant has medium credit risk. Loan can be approved with standard terms."
        else:  # HIGH
            decision = "DENY"
            explanation = "Applicant has high credit risk. Loan is not recommended for approval."

        # Get SHAP explanations
        shap_explanations = result.get("shap_explanations", [])

        response = {
            "risk_probability": round(risk_prob, 4),
            "risk_category": risk_category,
            "decision": decision,
            "explanation": explanation,
            "shap_explanations": shap_explanations
        }

        logger.info(f"Predict-risk request processed: {risk_category} - {decision}")
        return response

    except Exception as e:
        logger.error(f"Error in predict-risk: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")

@app.post("/predict-recommendation", response_model=RecommendationResponse)
async def predict_recommendation(request: LoanRequest):
    """
    Generate AI recommendation for loan amount, term, and interest rate.

    Takes applicant/loan features and optionally RiskScore/RiskLevel.

    Returns:
    - recommended_amount: Recommended loan amount in currency units
    - recommended_term: Recommended term in months
    - recommended_rate: Recommended interest rate as percentage
    - feasibility: "HIGH", "MEDIUM", or "LOW" feasibility
    - reasoning: Human-readable explanation
    - shap_explanations: Top features influencing the recommendation
    """
    try:
        # Preprocess input features
        features = preprocess_input(request)

        # Get recommendation
        result = get_recommendation(features, custom_plan=None, requested_amount=request.LoanAmount)

        # Extract recommendation values
        recommended_amount = result["plan"]["LoanAmount"]
        recommended_term = result["plan"]["LoanTerm"]
        recommended_rate = result["plan"]["InterestRate"]
        status = result["status"]
        risk_prob = result["risk_probability"]

        # Map status to feasibility for Spring backend contract
        # "APPROVED", "RECOMMENDED", "RECOMMENDED_SAFER" -> "HIGH", "MEDIUM", "LOW"
        if status == "APPROVED":
            feasibility = "HIGH"
            reasoning = "Full recommendation approved - applicant qualifies for requested amount."
        elif status == "RECOMMENDED":
            feasibility = "MEDIUM"
            reasoning = "Recommendation available - amount adjusted based on risk profile."
        elif status == "RECOMMENDED_SAFER":
            feasibility = "LOW"
            reasoning = "Conservative recommendation - amount reduced for risk mitigation."
        else:
            feasibility = "MEDIUM"
            reasoning = "Recommendation generated based on applicant profile."

        # Add risk context to reasoning
        if risk_prob < 0.25:
            reasoning += " Applicant profile indicates low risk."
        elif risk_prob <= 0.5:
            reasoning += " Applicant profile indicates medium risk."
        else:
            reasoning += " Applicant profile indicates high risk; conservative terms recommended."

        # Get SHAP explanations
        shap_explanations = result.get("shap_explanations", [])

        response = {
            "recommended_amount": round(recommended_amount, 2),
            "recommended_term": recommended_term,
            "recommended_rate": round(recommended_rate, 2),
            "feasibility": feasibility,
            "reasoning": reasoning,
            "shap_explanations": shap_explanations
        }

        logger.info(f"Predict-recommendation request processed: Amount={recommended_amount}, Term={recommended_term}, Feasibility={feasibility}")
        return response

    except Exception as e:
        logger.error(f"Error in predict-recommendation: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Recommendation failed: {str(e)}")