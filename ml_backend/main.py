from fastapi import FastAPI, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
import joblib
import pandas as pd
import os

app = FastAPI(title="Disease Risk Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

base_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(base_dir, "models")

# Dictionary to hold artifacts for all disease models
# artifacts["heart"] = {"model": ..., "scaler": ..., "features": ...}
artifacts = {}

@app.on_event("startup")
def load_models():
    if not os.path.exists(models_dir):
        print(f"Models directory not found at {models_dir}")
        return
        
    for model_name in os.listdir(models_dir):
        model_path = os.path.join(models_dir, model_name)
        if os.path.isdir(model_path):
            try:
                model = joblib.load(os.path.join(model_path, "model.pkl"))
                scaler = joblib.load(os.path.join(model_path, "scaler.pkl"))
                features = joblib.load(os.path.join(model_path, "features.pkl"))
                
                artifacts[model_name] = {
                    "model": model,
                    "scaler": scaler,
                    "features": features
                }
                print(f"Successfully loaded ML artifacts for '{model_name}'")
            except Exception as e:
                print(f"Failed to load artifacts for '{model_name}': {e}")

@app.post("/predict/{disease_type}")
def predict_risk(disease_type: str, data: Dict[str, Any]):
    if disease_type not in artifacts:
        raise HTTPException(
            status_code=404, 
            detail=f"Model '{disease_type}' loaded or available yet."
        )

    model_config = artifacts[disease_type]
    model = model_config["model"]
    scaler = model_config["scaler"]
    expected_features = model_config["features"]

    # 1. Parse JSON input into exactly the expected feature map (zero-initialized)
    df_data = {feature: 0.0 for feature in expected_features}

    for key, value in data.items():
        if key in expected_features:
            df_data[key] = float(value)
            
    # 2. Disease-specific Feature Engineering (e.g. one-hot encoding categorical)
    if disease_type == "heart":
        for cat_feat in ["cp", "restecg", "slope", "thal"]:
            if cat_feat in data and int(data[cat_feat]) > 0:
                col_name = f"{cat_feat}_{int(data[cat_feat])}"
                if col_name in expected_features:
                    df_data[col_name] = 1.0
    if disease_type == "diabetes":
        if "gender" in data:
            if data["gender"] == "Male" and "gender_Male" in expected_features:
                df_data["gender_Male"] = 1.0

        if "smoking_history" in data:
            col = f"smoking_history_{data['smoking_history']}"
            if col in expected_features:
                df_data[col] = 1.0            
    # Initialize dataframe natively resolving mapping bounds
    input_df = pd.DataFrame([df_data])[expected_features]
    
    # 3. Dynamic Scaling 
    try:
        if hasattr(scaler, "transform"):
            scaled_input = scaler.transform(input_df)
        else:
            scaled_input = input_df
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scaling error: {str(e)}")

    # 4. Predict
    try:
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(scaled_input)[0]
            probability = float(probs[1]) if len(probs) > 1 else float(probs[0])
            
            # Apply your specific threshold for diabetes
            if disease_type == "diabetes":
                threshold = 0.3  # your tuned value
                prediction = 1 if probability > threshold else 0
            else:
                prediction = int(model.predict(scaled_input)[0])
        else:
            probability = 0.0
            prediction = int(model.predict(scaled_input)[0])
            
        risk_level = "High Risk" if int(prediction) == 1 else "Low Risk"
        
        return {
            "prediction": int(prediction),
            "risk": risk_level,
            "probability": float(probability)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
