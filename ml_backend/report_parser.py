import re
import fitz  # PyMuPDF
try:
    import pytesseract
    from PIL import Image
    import io
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    ext = filename.split(".")[-1].lower()
    text = ""
    
    if ext == "pdf":
        try:
            doc = fitz.open("pdf", file_bytes)
            for page in doc:
                text += page.get_text() + "\n"
        except Exception as e:
            print(f"Error reading PDF: {e}")
            
    elif ext in ["png", "jpg", "jpeg"]:
        if OCR_AVAILABLE:
            try:
                image = Image.open(io.BytesIO(file_bytes))
                text = pytesseract.image_to_string(image)
            except Exception as e:
                print(f"OCR Error: {e}")
        else:
            text = "OCR not available to process image."
            
    elif ext in ["txt", "csv"]:
        try:
            text = file_bytes.decode("utf-8")
        except:
            text = str(file_bytes)
            
    return text.lower()

def parse_report_and_route(text: str):
    # Features for models
    diabetes_features = ["glucose", "hba1c", "blood sugar", "bmi", "insulin"]
    heart_features = ["cholesterol", "blood pressure", "bp", "heart rate", "ecg", "chest pain", "thalach", "trestbps"]
    lung_features = ["smoking", "cough", "lung", "tumor", "shortness of breath", "chest pain", "wheezing"]

    # Simple count logic
    scores = {"diabetes": 0, "heart": 0, "lung": 0}
    
    # Simple regex based matching for features
    extracted_data = {}
    
    # 1. Evaluate Diabetes
    if re.search(r'glucose[\s:=]+(\d+\.?\d*)', text):
        scores["diabetes"] += 1
        extracted_data["blood_glucose_level"] = float(re.search(r'glucose[\s:=]+(\d+\.?\d*)', text).group(1))
    elif re.search(r'blood sugar[\s:=]+(\d+\.?\d*)', text):
        scores["diabetes"] += 1
        extracted_data["blood_glucose_level"] = float(re.search(r'blood sugar[\s:=]+(\d+\.?\d*)', text).group(1))
        
    if re.search(r'hba1c[\s:=]+(\d+\.?\d*)', text):
        scores["diabetes"] += 1
        extracted_data["HbA1c_level"] = float(re.search(r'hba1c[\s:=]+(\d+\.?\d*)', text).group(1))
        
    if re.search(r'bmi[\s:=]+(\d+\.?\d*)', text):
        scores["diabetes"] += 0.5 # Optional
        extracted_data["bmi"] = float(re.search(r'bmi[\s:=]+(\d+\.?\d*)', text).group(1))

    # 2. Evaluate Heart
    if re.search(r'cholesterol[\s:=]+(\d+\.?\d*)', text):
        scores["heart"] += 1
        extracted_data["chol"] = float(re.search(r'cholesterol[\s:=]+(\d+\.?\d*)', text).group(1))
        
    if re.search(r'(?:blood pressure|bp)[\s:=]+(\d{2,3})[/\\](\d{2,3})', text):
        scores["heart"] += 1
        match = re.search(r'(?:blood pressure|bp)[\s:=]+(\d{2,3})[/\\](\d{2,3})', text)
        extracted_data["trestbps"] = float(match.group(1)) # Systolic
        
    if re.search(r'heart rate[\s:=]+(\d+\.?\d*)', text):
        scores["heart"] += 1
        extracted_data["thalach"] = float(re.search(r'heart rate[\s:=]+(\d+\.?\d*)', text).group(1))

    # 3. Evaluate Lung
    if re.search(r'smok(?:ing|er)[\s:=]*(yes|no|history|current|former|never)', text):
        scores["lung"] += 1
        val = re.search(r'smok(?:ing|er)[\s:=]*(yes|no|history|current|former|never)', text).group(1)
        extracted_data["smoking_history"] = val
        extracted_data["SMOKING"] = 2 if val in ["yes", "current", "history", "former"] else 1
        
    if re.search(r'tumor', text) or re.search(r'lesion', text):
        scores["lung"] += 1
        
    if re.search(r'shortness of breath', text):
        scores["lung"] += 1
        extracted_data["SHORTNESS OF BREATH"] = 2
        
    if re.search(r'coughing|cough', text):
        scores["lung"] += 1
        extracted_data["COUGHING"] = 2

    # Generic
    if re.search(r'age[\s:=]+(\d+)', text):
        age = float(re.search(r'age[\s:=]+(\d+)', text).group(1))
        extracted_data["age"] = age
        extracted_data["AGE"] = age
        
    if re.search(r'gender[\s:=]+(male|female|m|f)', text):
        gender_str = re.search(r'gender[\s:=]+(male|female|m|f)', text).group(1)
        if gender_str in ["male", "m"]:
            extracted_data["gender"] = "Male"
            extracted_data["sex"] = 1
            extracted_data["GENDER"] = 1
        else:
            extracted_data["gender"] = "Female"
            extracted_data["sex"] = 0
            extracted_data["GENDER"] = 0

    return scores, extracted_data
