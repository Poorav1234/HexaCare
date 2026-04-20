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
            { name: "glucose", label: "Glucose Level", type: "number", placeholder: "e.g. 110" },
            { name: "bmi", label: "BMI", type: "number", placeholder: "e.g. 25.5" },
            { name: "age", label: "Age", type: "number", placeholder: "e.g. 45" },
            { name: "bloodPressure", label: "Blood Pressure", type: "number", placeholder: "e.g. 70" },
        ]
    },
    cancer: {
        title: "Cancer",
        inputs: [
            { name: "age", label: "Age", type: "number", placeholder: "e.g. 45" },
            { name: "smokingHistory", label: "Smoking History", type: "checkbox" },
            { name: "radiationExposure", label: "Radiation Exposure", type: "checkbox" },
            { name: "familyHistory", label: "Family History", type: "checkbox" },
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
