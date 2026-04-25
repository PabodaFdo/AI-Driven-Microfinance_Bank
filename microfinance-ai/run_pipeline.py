import subprocess
import os

print("=" * 80)
print("STARTING FULL AI MICROFINANCE LOAN RISK PREDICTION PIPELINE")
print("=" * 80)
print("6-Group Member Pipeline (Balanced Workload)")
print("=" * 80)

files = [
    "src/data_preparation.py",
    "src/feature_engineering.py",
    "src/model_training.py",
    "src/hyperparameter_tuning.py",
    "src/model_evaluation.py",
    "src/explainability_and_recommendation.py"
]

success = True

for idx, f in enumerate(files, 1):
    print(f"\n{'='*80}")
    print(f"STEP {idx}/6 -> RUNNING: {f}")
    print(f"{'='*80}")
    
    if not os.path.exists(f):
        print(f"ERROR: File {f} not found!")
        success = False
        break
    
    result = subprocess.run(["python", f], capture_output=True, text=True)
    
    if result.stdout:
        print(result.stdout.strip())
    if result.stderr:
        print("WARNING / ERROR:\n", result.stderr.strip())
    
    if result.returncode != 0:
        print(f"FAILED at Step {idx} -> {f}")
        success = False
        break
    else:
        print(f"SUCCESS: Step {idx} completed -> {f}")

print("\n" + "="*80)
if success:
    print("FULL PIPELINE COMPLETED SUCCESSFULLY!")
    print("All 6 group members' tasks executed in order.")
    print("Models saved in: models/")
    print("Visualizations saved in: visualizations/")
    print("\nNow start the FastAPI server:")
    print("   cd api")
    print("   uvicorn main:app --reload")
    print("\nYour web app can now call: POST /predict-risk")
else:
    print("Pipeline stopped due to error. Please fix the failed step.")
print("="*80)