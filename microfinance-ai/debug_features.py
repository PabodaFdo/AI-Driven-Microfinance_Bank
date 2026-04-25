import joblib
import sys

try:
    selected_features = joblib.load('models/selected_features.pkl')
    print('=== SELECTED FEATURES ===')
    print(f'Type: {type(selected_features)}')
    print(f'Length: {len(selected_features)}')
    print(f'Contents: {selected_features}')
    
    if 'LoanAmount' in selected_features:
        idx = selected_features.index('LoanAmount')
        print(f'\nLoanAmount is at index: {idx}')
    else:
        print('\nLoanAmount is NOT in selected_features (would use fallback: 2)')
        
    if 'InterestRate' in selected_features:
        idx = selected_features.index('InterestRate')
        print(f'InterestRate is at index: {idx}')
    else:
        print('InterestRate is NOT in selected_features (would use fallback: 6)')
        
    if 'LoanTerm' in selected_features:
        idx = selected_features.index('LoanTerm')
        print(f'LoanTerm is at index: {idx}')
    else:
        print('LoanTerm is NOT in selected_features (would use fallback: 7)')
        
    print('\n=== FINAL SCALER INFO ===')
    final_scaler = joblib.load('models/final_scaler.pkl')
    print(f'Scaler type: {type(final_scaler).__name__}')
    print(f'Scale array shape: {final_scaler.scale_.shape}')
    print(f'Mean array shape: {final_scaler.mean_.shape}')
    print(f'Number of features scaled: {len(final_scaler.scale_)}')
    
    # Print each feature's scaler
    for i, feature in enumerate(selected_features):
        print(f'  [{i}] {feature:20s} - scale: {final_scaler.scale_[i]:12.6f}, mean: {final_scaler.mean_[i]:12.6f}')
    
    print('\n=== CHECKING TRAINING TARGET MAPPING ===')
    print('In model_training.py, regressors are trained on:')
    print('  reg_amount target: X_safe[:, selected_features.index("LoanAmount") or fallback 2]')
    print('  reg_rate target:   X_safe[:, selected_features.index("InterestRate") or fallback 6]')
    print('  reg_term target:   X_safe[:, selected_features.index("LoanTerm") or fallback 7]')
    
    print('\nIn explainability_and_recommendation.py, inverse indices are:')
    print('  loan_amount_idx = selected_features.index("LoanAmount") or fallback 2')
    print('  interest_rate_idx = selected_features.index("InterestRate") or fallback 6')
    print('  loan_term_idx = selected_features.index("LoanTerm") or fallback 7')
    
    print('\n=== MISMATCH CHECK ===')
    if 'LoanAmount' in selected_features:
        train_idx = selected_features.index('LoanAmount')
        inverse_idx_if_found = selected_features.index('LoanAmount')
        print(f'LoanAmount: Training uses index {train_idx}, Inverse uses index {inverse_idx_if_found} ✓ MATCH')
    else:
        train_idx = 2
        inverse_idx = 2
        print(f'LoanAmount: Training uses fallback 2, Inverse uses fallback 2')
        print(f'  BUT final_scaler only has {len(final_scaler.scale_)} entries for selected_features')
        if len(final_scaler.scale_) <= 2:
            print(f'  ⚠️  final_scaler.scale_[2] is OUT OF BOUNDS!')
        else:
            print(f'  ⚠️  final_scaler.scale_[2] = {final_scaler.scale_[2]} (3rd feature, not LoanAmount)')
    
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
