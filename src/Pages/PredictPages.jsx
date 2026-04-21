import React from "react";
import { useParams, Navigate } from "react-router-dom";
import RiskPredictor from "../Components/RiskPredictor";

const configs = {
    heart: {
        title: "Heart Disease",
        inputs: [
            { name: "age", label: "Age", type: "number", placeholder: "e.g. 45", min: 1, max: 120 },
            { name: "sex", label: "Sex", type: "select", options: [{label: "Female", value: 0}, {label: "Male", value: 1}] },
            { name: "cp", label: "Chest Pain Type", type: "select", options: [{label: "Severe/Typical chest pain", value: 0}, {label: "Mild/Atypical chest pain", value: 1}, {label: "Non-heart related pain", value: 2}, {label: "No chest pain", value: 3}] },
            { name: "trestbps", label: "Resting Blood Pressure", type: "number", placeholder: "e.g. 120", min: 1 },
            { name: "restecg", label: "Resting Heart Rhythm (ECG)", type: "select", options: [{label: "Normal", value: 0}, {label: "Minor Irregularity", value: 1}, {label: "Enlarged Heart Muscle", value: 2}] },
            { name: "thalach", label: "Maximum Heart Rate during exercise", type: "number", placeholder: "e.g. 150", min: 1 },
            { name: "exang", label: "Chest Pain caused by exercise", type: "select", options: [{label: "No", value: 0}, {label: "Yes", value: 1}] },
            { name: "oldpeak", label: "Heart Stress from Exercise", type: "number", step: "0.1", placeholder: "e.g. 1.0" },
            { name: "slope", label: "Heart response to peak exercise", type: "select", options: [{label: "Improving", value: 0}, {label: "Flat", value: 1}, {label: "Declining", value: 2}] },
            { name: "ca", label: "Number of blocked Blood Vessels", type: "select", options: [{label: "0", value: 0}, {label: "1", value: 1}, {label: "2", value: 2}, {label: "3", value: 3}] },
            { name: "thal", label: "Blood Disorder Type (Thalassemia)", type: "select", options: [{label: "Normal", value: 1}, {label: "Minor defect", value: 2}, {label: "Major defect", value: 3}] },
        ]
    },
    diabetes: {
        title: "Diabetes",
        inputs: [
            { name: "age", label: "Age", type: "number", placeholder: "e.g. 45", min: 0, max: 120 },
            { name: "gender", label: "Gender", type: "select", options: [{label: "Female", value: "Female"}, {label: "Male", value: "Male"}, {label: "Other", value: "Other"}] },
            { name: "hypertension", label: "Do you have high blood pressure?", type: "select", options: [{label: "No", value: 0}, {label: "Yes", value: 1}] },
            { name: "heart_disease", label: "Do you have a history of heart disease?", type: "select", options: [{label: "No", value: 0}, {label: "Yes", value: 1}] },
            { name: "bmi", label: "Body Mass Index (BMI)", type: "number", step: "0.1", placeholder: "e.g. 25.5" },
            { name: "HbA1c_level", label: "Hemoglobin A1c (HbA1c) Level", type: "number", step: "0.1", placeholder: "e.g. 5.5" },
            { name: "blood_glucose_level", label: "Blood Glucose Level", type: "number", placeholder: "e.g. 100" },
            { name: "smoking_history", label: "Smoking History", type: "select", options: [
                {label: "Never Smoked", value: "never"},
                {label: "Currently Smoking", value: "current"},
                {label: "Former Smoker", value: "former"},
                {label: "Smoked in the past", value: "ever"},
                {label: "Not Currently Smoking", value: "not current"},
                {label: "Prefer not to say / No Info", value: "No Info"}
            ] },
        ]
    },
    lung: {
        title: "Lung Cancer Risk",
        inputs: [
            { name: "GENDER", label: "Gender", type: "select", options: [{label: "Male", value: 1}, {label: "Female", value: 0}] },
            { name: "AGE", label: "Age", type: "number", placeholder: "e.g. 60", min: 1, max: 120 },
            { name: "SMOKING", label: "Do you smoke?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "YELLOW_FINGERS", label: "Yellow Fingers?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "ANXIETY", label: "Do you experience anxiety?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "PEER_PRESSURE", label: "Do you experience peer pressure?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "CHRONIC DISEASE", label: "Do you have a chronic disease?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "FATIGUE ", label: "Do you experience fatigue?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "ALLERGY ", label: "Do you have an allergy?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "WHEEZING", label: "Do you experience wheezing?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "ALCOHOL CONSUMING", label: "Do you consume alcohol?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "COUGHING", label: "Do you experience coughing?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "SHORTNESS OF BREATH", label: "Shortness of breath?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "SWALLOWING DIFFICULTY", label: "Swallowing Difficulty?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
            { name: "CHEST PAIN", label: "Do you have chest pain?", type: "select", options: [{label: "No", value: 1}, {label: "Yes", value: 2}] },
        ]
    },
    overall: {
        title: "Overall Health",
        inputs: [
            { name: "age", label: "Age", type: "number", placeholder: "e.g. 45" },
            { name: "bmi", label: "BMI", type: "number", placeholder: "e.g. 25" },
            { name: "sleepHours", label: "Average Sleep Hours", type: "number", placeholder: "e.g. 7" },
            { name: "activeMinutes", label: "Daily Active Minutes", type: "number", placeholder: "e.g. 45" },
        ]
    }
};

const PredictPages = ({ user }) => {
    const { type } = useParams();

    const config = configs[type];

    if (!config) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <RiskPredictor
            title={config.title}
            type={type}
            user={user}
            inputsConfig={config.inputs}
        />
    );
};

export default PredictPages;
