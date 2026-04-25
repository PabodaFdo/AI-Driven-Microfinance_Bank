"""
Test script to validate AI service contract matches Spring backend expectations.
Uses urllib instead of requests to avoid external dependencies.
"""

import urllib.request
import json
import sys

# API endpoint base URL
API_BASE_URL = "http://localhost:8000"

# Test sample data matching Spring backend request format
SAMPLE_REQUEST = {
    "Age": 35,
    "Income": 75000,
    "LoanAmount": 50000,
    "CreditScore": 720,
    "MonthsEmployed": 60,
    "NumCreditLines": 3,
    "InterestRate": 8.5,
    "LoanTerm": 36,
    "DTIRatio": 0.35,
    "Education": "Bachelor",
    "EmploymentType": "Full-time",
    "MaritalStatus": "Married",
    "HasMortgage": "Yes",
    "HasDependents": "Yes",
    "LoanPurpose": "Home Improvement",
    "HasCoSigner": "No"
}

def make_request(method, url, data=None):
    """Make HTTP request"""
    req = urllib.request.Request(url, method=method)
    req.add_header('Content-Type', 'application/json')

    if data:
        req.data = json.dumps(data).encode('utf-8')

    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))
    except Exception as e:
        raise Exception(f"Request failed: {str(e)}")

def test_health_endpoint():
    """Test /health endpoint"""
    print("\n" + "="*60)
    print("Testing GET /health")
    print("="*60)
    try:
        status, data = make_request('GET', f"{API_BASE_URL}/health")
        print(f"Status: {status}")
        print(f"Response: {json.dumps(data, indent=2)}")
        assert status == 200
        assert data["status"] == "healthy"
        print("PASS: Health check passed")
        return True
    except Exception as e:
        print(f"FAIL: Health check failed: {e}")
        return False

def test_predict_risk_endpoint():
    """Test /predict-risk endpoint against Spring backend contract"""
    print("\n" + "="*60)
    print("Testing POST /predict-risk")
    print("="*60)

    try:
        status, data = make_request('POST', f"{API_BASE_URL}/predict-risk", SAMPLE_REQUEST)
        print(f"Status: {status}")
        print(f"Response: {json.dumps(data, indent=2)}")

        # Validate response contract
        assert status == 200, f"Expected 200, got {status}"
        assert "risk_probability" in data, "Missing 'risk_probability'"
        assert "risk_category" in data, "Missing 'risk_category'"
        assert "decision" in data, "Missing 'decision'"
        assert "explanation" in data, "Missing 'explanation'"
        assert "shap_explanations" in data, "Missing 'shap_explanations'"

        # Validate field values
        assert 0 <= data["risk_probability"] <= 1, "risk_probability must be between 0 and 1"
        assert data["risk_category"] in ["LOW", "MEDIUM", "HIGH"], f"risk_category must be LOW/MEDIUM/HIGH, got {data['risk_category']}"
        assert data["decision"] in ["APPROVE", "DENY"], f"decision must be APPROVE/DENY, got {data['decision']}"
        assert isinstance(data["explanation"], str), "explanation must be string"
        assert isinstance(data["shap_explanations"], list), "shap_explanations must be list"

        print("\nPASS: /predict-risk contract validation passed")
        print(f"  - risk_probability: {data['risk_probability']}")
        print(f"  - risk_category: {data['risk_category']}")
        print(f"  - decision: {data['decision']}")
        print(f"  - Top SHAP features: {len(data['shap_explanations'])} features")
        return True

    except AssertionError as e:
        print(f"\nFAIL: Contract validation failed: {e}")
        return False
    except Exception as e:
        print(f"\nFAIL: Request failed: {e}")
        return False

def test_predict_recommendation_endpoint():
    """Test /predict-recommendation endpoint against Spring backend contract"""
    print("\n" + "="*60)
    print("Testing POST /predict-recommendation")
    print("="*60)

    try:
        status, data = make_request('POST', f"{API_BASE_URL}/predict-recommendation", SAMPLE_REQUEST)
        print(f"Status: {status}")
        print(f"Response: {json.dumps(data, indent=2)}")

        # Validate response contract
        assert status == 200, f"Expected 200, got {status}"
        assert "recommended_amount" in data, "Missing 'recommended_amount'"
        assert "recommended_term" in data, "Missing 'recommended_term'"
        assert "recommended_rate" in data, "Missing 'recommended_rate'"
        assert "feasibility" in data, "Missing 'feasibility'"
        assert "reasoning" in data, "Missing 'reasoning'"
        assert "shap_explanations" in data, "Missing 'shap_explanations'"

        # Validate field values
        assert isinstance(data["recommended_amount"], (int, float)), "recommended_amount must be numeric"
        assert isinstance(data["recommended_term"], int), "recommended_term must be integer"
        assert isinstance(data["recommended_rate"], (int, float)), "recommended_rate must be numeric"
        assert data["feasibility"] in ["HIGH", "MEDIUM", "LOW"], f"feasibility must be HIGH/MEDIUM/LOW, got {data['feasibility']}"
        assert isinstance(data["reasoning"], str), "reasoning must be string"
        assert isinstance(data["shap_explanations"], list), "shap_explanations must be list"

        print("\nPASS: /predict-recommendation contract validation passed")
        print(f"  - recommended_amount: {data['recommended_amount']}")
        print(f"  - recommended_term: {data['recommended_term']} months")
        print(f"  - recommended_rate: {data['recommended_rate']}%")
        print(f"  - feasibility: {data['feasibility']}")
        print(f"  - Top SHAP features: {len(data['shap_explanations'])} features")
        return True

    except AssertionError as e:
        print(f"\nFAIL: Contract validation failed: {e}")
        return False
    except Exception as e:
        print(f"\nFAIL: Request failed: {e}")
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("AI SERVICE SPRING BACKEND CONTRACT VALIDATION")
    print("="*60)
    print(f"API Base URL: {API_BASE_URL}")

    results = []

    # Test health
    results.append(("Health Check", test_health_endpoint()))

    # Test endpoints
    results.append(("Predict Risk", test_predict_risk_endpoint()))
    results.append(("Predict Recommendation", test_predict_recommendation_endpoint()))

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for test_name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"{status}: {test_name}")

    all_passed = all(result[1] for result in results)
    print("="*60)
    if all_passed:
        print("All tests passed! AI service is ready for Spring backend.")
        return 0
    else:
        print("Some tests failed. Check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
