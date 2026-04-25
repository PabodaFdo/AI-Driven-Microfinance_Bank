import optuna
import xgboost as xgb
import joblib
from sklearn.model_selection import cross_val_score

print("=== GROUP MEMBER 4: TASK 4 - Hyperparameter Tuning with Optuna ===")

X_train_res, _, y_train_res, _ = joblib.load("data/preprocessed_data.pkl")

def objective(trial):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 100, 400),
        "max_depth": trial.suggest_int("max_depth", 4, 10),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3),
        "subsample": trial.suggest_float("subsample", 0.7, 1.0),
        "colsample_bytree": trial.suggest_float("colsample_bytree", 0.7, 1.0),
        "reg_alpha": trial.suggest_float("reg_alpha", 0, 10),
        "reg_lambda": trial.suggest_float("reg_lambda", 0, 10),
    }
    model = xgb.XGBClassifier(**params, random_state=42, eval_metric="auc")
    score = cross_val_score(model, X_train_res, y_train_res, cv=5, scoring="roc_auc", n_jobs=-1).mean()
    return score

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=30)

best_params = study.best_params
print("Best params found:", best_params)

best_clf = xgb.XGBClassifier(**best_params, random_state=42, eval_metric="auc")
best_clf.fit(X_train_res, y_train_res)

joblib.dump(best_clf, "models/best_risk_classifier.pkl")
joblib.dump(best_params, "models/best_params.pkl")

print("TASK 4 COMPLETE")