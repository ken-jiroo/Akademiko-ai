"""
AkademikoAI: Dataset Enrichment Generator
Expands ced_mock_students.csv to 1,200 records with qualitative & formative dimensions
satisfying panel requirements: SHS strand, employment shifts, commute, and classroom behavior.
"""

import pandas as pd
import numpy as np

def generate_enriched_dataset(output_filename="ced_mock_students_v2.csv", target_rows=1200, seed=42):
    np.random.seed(seed)
    
    courses = [
        "BSED English 3A", "BSED English 3B", "BSED English 3C",
        "BSED Math 3A", "BSED Math 3B", "BSED Math 3C",
        "BSED Science 3A", "BSED Science 3B", "BSED Science 3C",
        "BEED 3A", "BEED 3B", "BEED 3C"
    ]
    
    shs_strands = ["HUMSS", "STEM", "GAS", "TVL", "ABM"]
    employment_types = [
        "Not Employed",
        "Part-time Day Shift",
        "Part-time Night Shift",
        "Full-time BPO / Service"
    ]
    commute_brackets = [
        "<30 mins",
        "30-60 mins",
        "1-2 hours",
        ">2 hours (Provincial Transit)"
    ]
    participation_obs = [
        "Highly Engaged & Active",
        "Consistent & Attentive",
        "Passive / Seldom Participates",
        "Frequently Inattentive / Distracted"
    ]
    
    records = []
    
    for i in range(1, target_rows + 1):
        student_no = f"2024-{i:04d}"
        course = np.random.choice(courses)
        
        # Qualitative / Contextual Features
        # Match HUMSS/STEM higher probability for Education majors
        strand = np.random.choice(shs_strands, p=[0.40, 0.25, 0.15, 0.10, 0.10])
        employment = np.random.choice(employment_types, p=[0.55, 0.20, 0.15, 0.10])
        commute = np.random.choice(commute_brackets, p=[0.25, 0.35, 0.25, 0.15])
        participation = np.random.choice(participation_obs, p=[0.25, 0.40, 0.22, 0.13])
        
        # 5-Pillar Wellbeing Numeric Scales (0 to 3) for model backward compatibility
        mental_health = int(np.random.choice([0, 1, 2, 3], p=[0.25, 0.35, 0.25, 0.15]))
        financial_strain = int(np.random.choice([0, 1, 2, 3], p=[0.20, 0.35, 0.30, 0.15]))
        family_problems = int(np.random.choice([0, 1, 2, 3], p=[0.30, 0.35, 0.22, 0.13]))
        working_status_num = 0 if employment == "Not Employed" else (1 if "Part-time" in employment else 2)
        commute_level_num = commute_brackets.index(commute)
        
        # Quantitative Formative Assessments (Quizzes, Activities, Attendance)
        formative_quiz = np.random.uniform(52, 98)
        formative_act = np.random.uniform(55, 99)
        attendance = np.random.uniform(62, 100)
        
        # Contextual modifiers on academic trajectory
        work_penalty = 8.5 if "Night" in employment or "Full-time" in employment else (3.0 if "Part-time" in employment else 0.0)
        commute_penalty = 5.0 if commute == ">2 hours (Provincial Transit)" else (2.0 if commute == "1-2 hours" else 0.0)
        strand_mismatch = 4.0 if strand in ["TVL", "ABM"] else 0.0
        part_modifier = 3.5 if participation == "Highly Engaged & Active" else (-4.5 if participation == "Frequently Inattentive / Distracted" else 0.0)
        mental_penalty = mental_health * 2.2
        fin_penalty = financial_strain * 1.8
        
        # Projected Running GWA (%)
        raw_gwa = (formative_quiz * 0.35) + (formative_act * 0.35) + (attendance * 0.30)
        penalties = work_penalty + commute_penalty + strand_mismatch + mental_penalty + fin_penalty
        actual_gwa = np.clip(raw_gwa - penalties + part_modifier + np.random.normal(0, 1.8), 55.0, 98.5)
        
        # Classification Risk Level Target
        if actual_gwa < 75.0 or attendance < 75.0:
            risk_level = "High Risk"
        elif actual_gwa < 78.5 or (work_penalty + commute_penalty >= 9.0):
            risk_level = "Moderate Risk"
        else:
            risk_level = "Low Risk"
            
        # Qualitative Contextual Statement
        notes_parts = []
        if "Night" in employment or "Full-time" in employment:
            notes_parts.append(f"Employed as {employment}")
        if commute in [">2 hours (Provincial Transit)", "1-2 hours"]:
            notes_parts.append(f"Commuting {commute}")
        if mental_health >= 2:
            notes_parts.append("Reported elevated emotional fatigue")
        if financial_strain >= 2:
            notes_parts.append("Facing financial strain for academic materials")
        if participation == "Frequently Inattentive / Distracted":
            notes_parts.append("Faculty observed class inattentiveness")
            
        subjective_notes = "; ".join(notes_parts) if notes_parts else "Consistent attendance with regular study routine."
        
        records.append({
            "Student_No": student_no,
            "Course": course,
            "SHS_Strand": strand,
            "Employment_Type": employment,
            "Commute_Bracket": commute,
            "Participation_Obs": participation,
            "Mental_Health_Score": mental_health,
            "Financial_Instability": financial_strain,
            "Family_Problems": family_problems,
            "Working_Status": working_status_num,
            "Commute_Level": commute_level_num,
            "Formative_Quiz_Avg": round(formative_quiz, 2),
            "Formative_Act_Avg": round(formative_act, 2),
            "Attendance_Rate": round(attendance, 2),
            "GWA_Percentage": round(actual_gwa, 2),
            "Risk_Level": risk_level,
            "Subjective_Notes": subjective_notes
        })
        
    df = pd.DataFrame(records)
    df.to_csv(output_filename, index=False)
    print(f"Enriched dataset successfully generated: '{output_filename}' ({len(df)} rows, {len(df.columns)} columns)")
    print("Risk Level Breakdown:")
    print(df['Risk_Level'].value_counts())
    return df

if __name__ == "__main__":
    generate_enriched_dataset()