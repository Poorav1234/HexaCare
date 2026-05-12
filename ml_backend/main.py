from fastapi import FastAPI, HTTPException, Path, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
from report_parser import extract_text_from_file, parse_report_and_route
import joblib
import pandas as pd
import os
import re

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
            elif data["gender"] == "Other" and "gender_Other" in expected_features:
                df_data["gender_Other"] = 1.0

        if "smoking_history" in data:
            col = f"smoking_history_{data['smoking_history']}"
            if col in expected_features:
                df_data[col] = 1.0

    # Lung cancer: all features are numeric (1=No, 2=Yes except GENDER=1/0, AGE=integer)
    # No encoding needed — values come directly from frontend selects.
    if disease_type == "lung":
        for key, value in data.items():
            if key in df_data:
                df_data[key] = float(value)

    # Initialize dataframe natively resolving mapping bounds
    input_df = pd.DataFrame([df_data])[expected_features]
    
    # 3. Dynamic Scaling 
    try:
        if hasattr(scaler, "transform"):
            if hasattr(scaler, "feature_names_in_"):
                scaled_feats = scaler.transform(input_df[scaler.feature_names_in_])
                input_df = input_df.copy()
                input_df[scaler.feature_names_in_] = scaled_feats
                scaled_input = input_df
            else:
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

REQUIRED_FEATURES = {
    "heart": ["age", "sex", "cp", "trestbps", "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"],
    "diabetes": ["age", "gender", "hypertension", "heart_disease", "bmi", "HbA1c_level", "blood_glucose_level", "smoking_history"],
    "lung": ["GENDER", "AGE", "SMOKING", "YELLOW_FINGERS", "ANXIETY", "PEER_PRESSURE", "CHRONIC DISEASE", "FATIGUE ", "ALLERGY ", "WHEEZING", "ALCOHOL CONSUMING", "COUGHING", "SHORTNESS OF BREATH", "SWALLOWING DIFFICULTY", "CHEST PAIN"]
}

@app.post("/upload_report")
async def upload_report(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        text = extract_text_from_file(contents, file.filename)
        
        if not text or len(text.strip()) < 10:
            return {
                "success": False,
                "message": "This report does not contain sufficient or relevant data for disease prediction.",
                "text_extracted": text
            }
            
        scores, extracted_data = parse_report_and_route(text)
        
        best_disease = None
        best_score = 0
        for d, s in scores.items():
            if s > best_score:
                best_score = s
                best_disease = d
        
        if best_score < 1:
            return {
                "success": False,
                "message": "This report does not contain sufficient or relevant data for disease prediction.",
                "scores": scores,
                "extracted_data": extracted_data
            }
            
        required_fields = REQUIRED_FEATURES.get(best_disease, [])
        missing_fields = []
        
        for field in required_fields:
            # We can do a case-insensitive check or check if key exists
            if field not in extracted_data:
                missing_fields.append(field)
                
        ready = len(missing_fields) == 0
        
        confidence = round(min(best_score / len(required_fields) * 2, 0.99), 2) if required_fields else 0.9
        
        # If ready, we could optionally run prediction here, but to keep the flow consistent, 
        # we'll just return the required structure so frontend handles it uniformly.
        
        return {
            "success": True,
            "detectedDisease": best_disease,
            "confidence": confidence,
            "extractedFields": extracted_data,
            "missingFields": missing_fields,
            "readyForPrediction": ready,
            "message": "Report analyzed successfully."
        }
        
    except Exception as e:
        return {"success": False, "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
