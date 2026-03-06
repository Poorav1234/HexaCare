import React from "react";
import { useParams, Navigate } from "react-router-dom";
import RiskPredictor from "../Components/RiskPredictor";

const configs = {
    heart: {
        title: "Heart Disease",
        inputs: [
            { name: "age", label: "Age", type: "number", placeholder: "e.g. 45" },
            { name: "bloodPressure", label: "Resting Blood Pressure", type: "number", placeholder: "e.g. 120" },
            { name: "cholesterol", label: "Serum Cholesterol (mg/dl)", type: "number", placeholder: "e.g. 200" },
            { name: "maxHeartRate", label: "Maximum Heart Rate Achieved", type: "number", placeholder: "e.g. 150" },
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
