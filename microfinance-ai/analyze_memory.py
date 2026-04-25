import os
import pandas as pd

print("=== MEMORY ANALYSIS FOR 8GB RAM LAPTOP ===\n")

# Check file sizes
print("MODEL FILE SIZES:")
model_files = [f for f in os.listdir('models') if f.endswith(('.pkl', '.joblib'))]
total_model_size = 0
for f in model_files:
    size_mb = os.path.getsize(os.path.join('models', f)) / (1024*1024)
    total_model_size += size_mb
    print(f"  {f}: {size_mb:.2f} MB")

print(f"\nTotal model size: {total_model_size:.2f} MB")

print("\nDATA FILE SIZES:")
data_files = [f for f in os.listdir('data') if f.endswith(('.csv', '.pkl'))]
total_data_size = 0
for f in data_files:
    size_mb = os.path.getsize(os.path.join('data', f)) / (1024*1024)
    total_data_size += size_mb
    print(f"  {f}: {size_mb:.2f} MB")

print(f"\nTotal data size: {total_data_size:.2f} MB")

# Check dataset dimensions
try:
    df = pd.read_csv('data/Loan_default.csv')
    memory_mb = df.memory_usage(deep=True).sum() / (1024*1024)
    print(f"\nDATASET INFO:")
    print(f"  Shape: {df.shape}")
    print(f"  Memory when loaded: {memory_mb:.2f} MB")
except Exception as e:
    print(f"Error loading dataset: {e}")

print(f"\nESTIMATED TOTAL MEMORY USAGE:")
print(f"  Models + Data: {total_model_size + total_data_size:.2f} MB")
print(f"  + Python overhead: ~500-800 MB")
print(f"  + Libraries (pandas, sklearn, xgboost): ~200-400 MB")
print(f"  TOTAL ESTIMATED: ~{total_model_size + total_data_size + 1000:.0f} MB")

if total_model_size + total_data_size + 1000 < 4000:
    print("✅ LIKELY SAFE for 8GB RAM")
elif total_model_size + total_data_size + 1000 < 6000:
    print("⚠️  MODERATE RISK for 8GB RAM")
else:
    print("❌ HIGH RISK for 8GB RAM")