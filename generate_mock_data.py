import pandas as pd
import random
import numpy as np

# Set a seed for reproducibility
random.seed(42)
np.random.seed(42)

# Define our constants based on CED programs
courses = ['BEED', 'BSED Math', 'BSED English', 'BSED Science']
sections = ['3A', '3B', '3C']
total_students = 100

data = []

for i in range(1, total_students + 1):
    student_no = f"2024-{str(i).zfill(4)}"
    course = random.choice(courses)
    section = random.choice(sections)
    
    # Generate external factors (0 = Low impact, 3 = Severe impact)
    mental_health = random.randint(0, 3)
    financial_instability = random.randint(0, 3)
    family_problems = random.randint(0, 3)
    working_student = random.randint(0, 2) # 0=None, 1=Part-time, 2=Full-time
    commute_time = random.randint(0, 3)
    
    # Calculate a base "stress index" to logically influence grades and attendance
    stress_index = (mental_health + financial_instability + family_problems + working_student) 
    
    # Generate Attendance (Base 95%, drops based on stress)
    attendance = max(50, 95 - (stress_index * random.uniform(1.5, 3.5)))
    
    # Generate GWA (Base 1.5, drops based on stress and attendance - Note: Lower GWA is better in PH system, but let's use percentage grades (75-99) for easier neural net processing as shown in your UI)
    gwa_percentage = max(65, 92 - (stress_index * random.uniform(1.0, 2.5)) - ((100 - attendance) * 0.3))
    
    # Determine Risk Level based on a logical threshold for our mock data
    # The neural network will eventually learn these patterns itself
    if gwa_percentage < 75 or attendance < 75:
        risk_level = "High Risk"
    elif gwa_percentage < 82 or attendance < 85 or stress_index > 6:
        risk_level = "Moderate Risk"
    else:
        risk_level = "Low Risk"
        
    data.append({
        "Student_No": student_no,
        "Course": f"{course} {section}",
        "Mental_Health_Score": mental_health,
        "Financial_Instability": financial_instability,
        "Family_Problems": family_problems,
        "Working_Status": working_student,
        "Commute_Level": commute_time,
        "Attendance_Rate": round(attendance, 2),
        "GWA_Percentage": round(gwa_percentage, 2),
        "Risk_Level": risk_level
    })

# Create a DataFrame and export to CSV
df = pd.DataFrame(data)
df.to_csv('ced_mock_students.csv', index=False)

print(f"Successfully generated {total_students} mock student records in 'ced_mock_students.csv'!")
print(df['Risk_Level'].value_counts())