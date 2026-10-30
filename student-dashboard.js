/* ========================== MINI PROFILE DISPLAY ========================== */
const fullNameInput = document.getElementById("fullName");
const studentNoInput = document.getElementById("studentNo");

function updateMiniProfile() {
  const name = fullNameInput.value.trim();
  const sid = studentNoInput.value.trim();

  document.getElementById("miniName").innerText = name || "No name set";
  document.getElementById("miniId").innerText = sid || "No student no.";

  const initials = name
    ? name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")
    : "--";

  document.getElementById("avatarInitials").innerText = initials;
}

/* ========================== DATA COLLECTION ========================== */
function collectData() {
  return {
    fullName: document.getElementById("fullName").value.trim(),
    studentNo: document.getElementById("studentNo").value.trim(),
    email: document.getElementById("email").value.trim(),
    course: (document.getElementById("courseInput") ? document.getElementById("courseInput").value : "").trim(),
    section: (document.getElementById("sectionInput") ? document.getElementById("sectionInput").value : "").trim(),
    shsStrand: (document.getElementById("shsStrandInput") ? document.getElementById("shsStrandInput").value : "HUMSS"),
    employmentType: (document.getElementById("employmentTypeInput") ? document.getElementById("employmentTypeInput").value : "Not Employed"),
    mentalHealthText: (document.getElementById("mentalHealthText") ? document.getElementById("mentalHealthText").value.trim() : ""),
    workFinancialText: (document.getElementById("workFinancialText") ? document.getElementById("workFinancialText").value.trim() : ""),
    commuteText: (document.getElementById("commuteText") ? document.getElementById("commuteText").value.trim() : ""),
    familyText: (document.getElementById("familyText") ? document.getElementById("familyText").value.trim() : ""),
    healthText: (document.getElementById("healthText") ? document.getElementById("healthText").value.trim() : ""),
    courseMismatchText: (document.getElementById("courseMismatchText") ? document.getElementById("courseMismatchText").value.trim() : ""),
    notes: (document.getElementById("notes") ? document.getElementById("notes").value.trim() : ""),
    attendance: parseFloat(document.getElementById("attendanceInput").value) || 0,
    gwa: parseFloat(document.getElementById("gwaInput").value) || 0,
    savedAt: new Date().toISOString()
  };
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (msg) toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

/* ========================== LOCK CONTROLLER ========================== */
function applyFormLock(isLocked, savedTimestamp) {
  const banner = document.getElementById("submissionLockBanner");
  const saveBtn = document.getElementById("saveBtn");
  const voicePanel = document.getElementById("voicePanel");
  const subText = document.getElementById("surveyLockSubtitle");

  if (isLocked) {
    if (banner) banner.style.display = "flex";
    if (savedTimestamp && subText) {
      subText.innerText = `Recorded on ${new Date(savedTimestamp).toLocaleDateString()} for 1st Semester SY 2026–2027. Your section adviser has your wellbeing baseline on file.`;
    }
    if (saveBtn) {
      saveBtn.innerText = "✓ Information Active";
      saveBtn.style.opacity = "0.75";
      saveBtn.disabled = true;
      saveBtn.style.cursor = "not-allowed";
    }
    if (voicePanel) {
      voicePanel.style.pointerEvents = "none";
      voicePanel.style.opacity = "0.85";
    }
  } else {
    if (banner) banner.style.display = "none";
    if (saveBtn) {
      saveBtn.innerText = "💾 Save Information";
      saveBtn.style.opacity = "1";
      saveBtn.disabled = false;
      saveBtn.style.cursor = "pointer";
    }
    if (voicePanel) {
      voicePanel.style.pointerEvents = "auto";
      voicePanel.style.opacity = "1";
    }
  }
}

/* ========================== SAVE TO BACKEND ========================== */
async function handleSaveProfile() {
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.innerText = "Saving to AI Engine...";
  saveBtn.disabled = true;

  const data = collectData();
  const loggedInEmail = localStorage.getItem("akademiko_email") || data.email;

  const payload = {
    studentName: data.fullName || "Anonymous Student",
    studentNo: data.studentNo || "Pending ID",
    email: loggedInEmail,
    course: data.course || "N/A",
    section: data.section || "N/A",
    notes: data.notes || "",
    SHS_Strand: data.shsStrand,
    Employment_Type: data.employmentType,
    Mental_Health_Text: data.mentalHealthText,
    Work_Financial_Text: data.workFinancialText,
    Commute_Text: data.commuteText,
    Family_Text: data.familyText,
    Health_Text: data.healthText,
    Course_Mismatch_Text: data.courseMismatchText,
    Attendance_Rate: data.attendance,
    GWA_Percentage: data.gwa
  };

  try {
    const response = await fetch('http://localhost:8080/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    const now = new Date();
    document.getElementById("updatedDate").innerText = "Saved: " + now.toLocaleTimeString();

    const badge = document.getElementById("levelBadge");
    const scoreVal = document.getElementById("scoreValue");
    const risk = result.predicted_risk || "Low Risk";
    const score = result.confidence_score || 85;

    badge.innerText = `${risk} (${score}%)`;
    scoreVal.innerText = result.projected_gwa ? `${result.projected_gwa}%` : `${data.gwa}%`;

    if (risk === "High Risk") {
      badge.style.background = "#ff5c6333";
      badge.style.color = "#ff7378";
      scoreVal.className = "red";
    } else if (risk === "Moderate Risk") {
      badge.style.background = "#ffb22d33";
      badge.style.color = "#ffbc3b";
      scoreVal.className = "orange";
    } else {
      badge.style.background = "#38d88933";
      badge.style.color = "#38d889";
      scoreVal.className = "green";
    }

    applyFormLock(true, now);
    showToast("✔ Profile and Contextual Voice saved successfully!");
  } catch (error) {
    console.error("Failed to save profile:", error);
    alert("Error communicating with the backend server.");
    saveBtn.innerText = "💾 Save Information";
    saveBtn.disabled = false;
  }
}

/* ========================== LOAD INITIAL DATA ========================== */
async function loadData() {
  if (localStorage.getItem("akademiko_logged_in") !== "true") {
    window.location.href = "../auth/login.html";
    return;
  }

  const userEmail = localStorage.getItem("akademiko_email");
  if (!userEmail) return;

  const emailField = document.getElementById("email");
  emailField.value = userEmail;

  try {
    const response = await fetch(`http://localhost:8080/api/student/${encodeURIComponent(userEmail)}`);
    const result = await response.json();

    if (!result.success || !result.profile) return;

    const saved = result.profile;

    document.getElementById("fullName").value = saved.studentName || "";
    document.getElementById("studentNo").value = saved.studentNo || "";
    if (document.getElementById("courseInput")) document.getElementById("courseInput").value = saved.course || "";
    if (document.getElementById("sectionInput")) document.getElementById("sectionInput").value = saved.section || "";
    if (document.getElementById("notes")) document.getElementById("notes").value = saved.notes || "";
    document.getElementById("attendanceInput").value = saved.attendance !== undefined ? `${saved.attendance}%` : "";
    document.getElementById("gwaInput").value = saved.gwa !== undefined ? `${saved.gwa}%` : "";

    if (saved.SHS_Strand && document.getElementById("shsStrandInput")) {
      document.getElementById("shsStrandInput").value = saved.SHS_Strand;
    }
    if (saved.Employment_Type && document.getElementById("employmentTypeInput")) {
      document.getElementById("employmentTypeInput").value = saved.Employment_Type;
    }

    if (saved.Mental_Health_Text && document.getElementById("mentalHealthText")) {
      document.getElementById("mentalHealthText").value = saved.Mental_Health_Text;
    }
    if (saved.Work_Financial_Text && document.getElementById("workFinancialText")) {
      document.getElementById("workFinancialText").value = saved.Work_Financial_Text;
    }
    if (saved.Commute_Text && document.getElementById("commuteText")) {
      document.getElementById("commuteText").value = saved.Commute_Text;
    }
    if (saved.Family_Text && document.getElementById("familyText")) {
      document.getElementById("familyText").value = saved.Family_Text;
    }
    if (saved.Health_Text && document.getElementById("healthText")) {
      document.getElementById("healthText").value = saved.Health_Text;
    }
    if (saved.Course_Mismatch_Text && document.getElementById("courseMismatchText")) {
      document.getElementById("courseMismatchText").value = saved.Course_Mismatch_Text;
    }

    if (saved.riskLevel) {
      const badge = document.getElementById("levelBadge");
      const scoreVal = document.getElementById("scoreValue");
      badge.innerText = `${saved.riskLevel} (${saved.confidenceScore || 0}%)`;
      scoreVal.innerText = saved.projectedGwa ? `${saved.projectedGwa}%` : (saved.gwa ? `${saved.gwa}%` : "--");

      if (saved.riskLevel === "High Risk") {
        badge.style.background = "#ff5c6333";
        badge.style.color = "#ff7378";
        scoreVal.className = "red";
      } else if (saved.riskLevel === "Moderate Risk") {
        badge.style.background = "#ffb22d33";
        badge.style.color = "#ffbc3b";
        scoreVal.className = "orange";
      }
    }

    if (saved.timestamp) {
      document.getElementById("updatedDate").innerText =
        "Saved: " + new Date(saved.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    updateMiniProfile();

    if (saved.hasCompletedSurvey) {
      applyFormLock(true, saved.timestamp);
    }

  } catch (error) {
    console.warn("No existing profile found yet:", error);
  }
}

/* ========================== EVENT LISTENERS ========================== */
document.addEventListener("DOMContentLoaded", () => {
  fullNameInput.addEventListener("input", updateMiniProfile);
  studentNoInput.addEventListener("input", updateMiniProfile);
  document.getElementById("saveBtn").addEventListener("click", handleSaveProfile);

  const unlockBtn = document.getElementById("btnUnlockSurvey");
  if (unlockBtn) {
    unlockBtn.addEventListener("click", () => {
      applyFormLock(false);
      const firstArea = document.getElementById("mentalHealthText");
      if (firstArea) firstArea.focus();
    });
  }

  document.getElementById("logoutBtn").addEventListener("click", function (e) {
    e.preventDefault();
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("akademiko_logged_in");
      localStorage.removeItem("akademiko_email");
      window.location.href = "../auth/login.html";
    }
  });

  loadData();
});