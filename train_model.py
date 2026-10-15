import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder

# 1. Load the mock data we generated earlier
df = pd.read_csv('ced_mock_students.csv')

# 2. Prep the Data (Features vs Target)
# We drop 'Student_No' and 'Course' because they don't mathematically help predict risk
X = df.drop(columns=['Student_No', 'Course', 'Risk_Level'])
y = df['Risk_Level']

# The neural network only understands numbers, not text. 
# This converts "High Risk", "Moderate Risk", and "Low Risk" into 0, 1, and 2.
encoder = LabelEncoder()
y_encoded = encoder.fit_transform(y)

# Split the data: 80% for training the AI, 20% for testing how smart it got
X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)

# Scale the numbers so everything is on a level playing field (helps the AI learn faster)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 3. Build the Artificial Neural Network (ANN) Architecture
model = tf.keras.Sequential([
    # Input Layer & First Hidden Layer (16 neurons, looking for patterns)
    tf.keras.layers.Dense(16, activation='relu', input_shape=(X_train_scaled.shape[1],)),
    
    # Second Hidden Layer (8 neurons, refining the patterns)
    tf.keras.layers.Dense(8, activation='relu'),
    
    # Output Layer (3 neurons for our 3 risk levels. Softmax gives us a probability percentage for each)
    tf.keras.layers.Dense(3, activation='softmax') 
])

# 4. Compile the model (giving it a brain and a way to measure its mistakes)
model.compile(optimizer='adam', 
              loss='sparse_categorical_crossentropy', 
              metrics=['accuracy'])

# 5. Train the model!
print("🧠 Training Akademiko AI...")
# Epochs = how many times it reads the dataset. 
history = model.fit(X_train_scaled, y_train, epochs=50, batch_size=8, validation_split=0.2)

# 6. Final Exam: Test it on the 20% of data it hasn't seen yet
print("\n--- Final Evaluation ---")
loss, accuracy = model.evaluate(X_test_scaled, y_test)
print(f"Model Accuracy on Test Data: {accuracy * 100:.2f}%")

import joblib

# 7. Save the trained model and preprocessing tools for production
print("\n💾 Saving Akademiko AI model and tools...")
model.save('akademiko_ai_model.keras')
joblib.dump(scaler, 'scaler.pkl')
joblib.dump(encoder, 'encoder.pkl')

print("✔ Model saved as 'akademiko_ai_model.keras'")
print("✔ Preprocessing tools saved as 'scaler.pkl' and 'encoder.pkl'")