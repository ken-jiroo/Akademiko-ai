from fastapi import FastAPI
from pydantic import BaseModel
import tensorflow as tf
import joblib
import numpy as np

# Initialize the API
app = FastAPI(title="Akademiko AI Prediction API")

# Load our saved model, scaler, and encoder
model = tf.keras.models.load_model('akademiko_ai_model.keras')
scaler = joblib.load('scaler.pkl')
encoder = joblib.load('encoder.pkl')

# Define the data structure we expect to receive from the frontend
class StudentData(BaseModel):
    Mental_Health_Score: int
    Financial_Instability: int
    Family_Problems: int
    Working_Status: int
    Commute_Level: int
    Attendance_Rate: float
    GWA_Percentage: float

@app.get("/")
def home():
    return {"message": "Akademiko AI API is running! 🚀"}

@app.post("/predict")
def predict_risk(data: StudentData):
    # 1. Extract the data into a numpy array (must match the order of our training data)
    input_features = np.array([[
        data.Mental_Health_Score,
        data.Financial_Instability,
        data.Family_Problems,
        data.Working_Status,
        data.Commute_Level,
        data.Attendance_Rate,
        data.GWA_Percentage
    ]])
    
    # 2. Scale the data using our saved scaler
    scaled_features = scaler.transform(input_features)
    
    # 3. Predict using the neural network
    prediction_probs = model.predict(scaled_features)
    
    # 4. Get the highest probability and decode it back to text
    predicted_class_index = np.argmax(prediction_probs, axis=1)[0]
    predicted_risk_level = encoder.inverse_transform([predicted_class_index])[0]
    
    # Get the confidence score (percentage)
    confidence = float(np.max(prediction_probs)) * 100
    
    return {
        "predicted_risk": predicted_risk_level,
        "confidence_score": round(confidence, 2)
    }