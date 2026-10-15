const express = require('express');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 8080;

app.use(cors());

// 🗄️ Increase JSON/URL payload limit to allow Base64 Profile Photo uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// 🗄️ Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://eduardllegado09_db_user:071405kenji@cluster0.iyvnxwh.mongodb.net/?appName=Cluster0')
    .then(() => console.log("🗄️ MongoDB Atlas Connected successfully!"))
    .catch((err) => console.error("MongoDB Connection Error:", err));

// 📝 Schemas & Models
const alertSchema = new mongoose.Schema({
    studentName: String,
    studentNo: String,
    email: String,
    course: String,
    section: String,
    city: String,
    province: String,
    notes: String,
    gwa: Number,
    attendance: Number,
    riskLevel: String,
    confidenceScore: Number,
    interventionStatus: { type: String, default: "Pending Action" },
    
    // External Factors (Supporting both CamelCase and Snake/Pascal keys)
    Mental_Health_Score: Number,
    Financial_Instability: Number,
    Family_Problems: Number,
    Working_Status: Number,
    Commute_Level: Number,
    mentalHealth: Number,
    financial: Number,
    workingStatus: Number,
    commute: Number,
    familyProblems: Number,
    
    answers: { type: Object, default: {} },
    timestamp: { type: Date, default: Date.now }
}, { strict: false });

const Alert = mongoose.model('Alert', alertSchema);

// 📝 User Schema with Admin Profile & Photo Storage
const userSchema = new mongoose.Schema({
    studentNo: String,
    email: String,
    password: String,
    role: String,
    adminName: { type: String, default: "System Administrator" },
    username: { type: String, default: "admin" },
    profilePhoto: { type: String, default: "" }
});
const User = mongoose.model('User', userSchema);

app.use(express.static(path.join(__dirname, '../frontend')));

// 🔐 Login Authentication Endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        
        const user = await User.findOne({ email, role });
        
        if (!user) {
            return res.status(401).json({ success: false, message: "Account not found or incorrect role." });
        }

        if (user.password !== password) {
            return res.status(401).json({ success: false, message: "Incorrect password." });
        }

        res.json({ success: true, message: "Login successful", role: user.role, email: user.email });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// ➕ Admin: Create Student Credential Endpoint
app.post('/api/admin/add-student', async (req, res) => {
    try {
        const { studentNo, email, password } = req.body;

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ success: false, message: "Student email already registered." });
        }

        const existingStudentNo = await User.findOne({ studentNo });
        if (existingStudentNo) {
            return res.status(400).json({ success: false, message: "Student number already exists in the system." });
        }

        const newUser = new User({
            studentNo: studentNo,
            email: email,
            password: password || "UDM2026!",
            role: "student"
        });

        await newUser.save();
        console.log(`✅ Admin created student account: ${email} (${studentNo})`);
        res.json({ success: true, message: "Student account created successfully!" });
    } catch (error) {
        console.error("Error creating student:", error);
        res.status(500).json({ success: false, message: "Server error while creating student." });
    }
});

// 🚀 Prediction & Assessment Upsert Route (Persists all risk factors)
app.post('/api/predict', async (req, res) => {
    try {
        console.log("\n--- 📥 INCOMING FRONTEND DATA ---");
        console.log(req.body); 
        console.log("---------------------------------\n");
        
        const aiResponse = await axios.post('http://127.0.0.1:8000/predict', req.body);
        
        let finalRisk = aiResponse.data.predicted_risk;
        let finalConfidence = aiResponse.data.confidence_score;

        const studentGwa = req.body.GWA_Percentage !== undefined ? req.body.GWA_Percentage : req.body.gwa;
        const studentAttendance = req.body.Attendance_Rate !== undefined ? req.body.Attendance_Rate : req.body.attendance;

        if (studentGwa < 75) {
            finalRisk = "High Risk";
            finalConfidence = 99.9;
            console.log("🚨 Hard Override Triggered: GWA < 75. Forcing High Risk status.");
        }

        const mentalScore = req.body.Mental_Health_Score ?? req.body.mentalHealth ?? 0;
        const financialScore = req.body.Financial_Instability ?? req.body.financial ?? 0;
        const familyScore = req.body.Family_Problems ?? req.body.familyProblems ?? 0;
        const workScore = req.body.Working_Status ?? req.body.workingStatus ?? 0;
        const commuteScore = req.body.Commute_Level ?? req.body.commute ?? 0;
        
        const query = { email: req.body.email };
        const updateData = {
            studentName: req.body.studentName,
            studentNo: req.body.studentNo,
            email: req.body.email,
            course: req.body.course,
            section: req.body.section,
            city: req.body.city || "",
            province: req.body.province || "",
            notes: req.body.notes || "",
            gwa: studentGwa,
            attendance: studentAttendance,
            riskLevel: finalRisk,
            confidenceScore: finalConfidence,
            
            // Persist all factor variables
            Mental_Health_Score: mentalScore,
            Financial_Instability: financialScore,
            Family_Problems: familyScore,
            Working_Status: workScore,
            Commute_Level: commuteScore,
            mentalHealth: mentalScore,
            financial: financialScore,
            familyProblems: familyScore,
            workingStatus: workScore,
            commute: commuteScore,
            
            timestamp: Date.now()
        };

        const updatedAlert = await Alert.findOneAndUpdate(query, updateData, { upsert: true, returnDocument: 'after' });
        console.log(`✅ Successfully upserted record for: ${req.body.email} (${finalRisk})`);

        res.json({
            predicted_risk: finalRisk,
            confidence_score: finalConfidence
        });
        
    } catch (error) {
        console.error("AI Server Error:", error.message);
        res.status(500).json({ error: "Failed to communicate with Akademiko AI brain." });
    }
});

// 📊 Fetch All Alerts for Dashboard, Risk Monitor, and Analytics
app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await Alert.find().sort({ timestamp: -1 });
        res.json(alerts);
    } catch (error) {
        console.error("Database fetch error:", error);
        res.status(500).json({ error: "Could not retrieve student alerts." });
    }
});

// 🔍 Fetch Specific Student Profile by Email
app.get('/api/student/:email', async (req, res) => {
    try {
        const studentEmail = req.params.email;
        const profile = await Alert.findOne({ email: studentEmail });
        
        if (!profile) {
            return res.status(404).json({ success: false, message: "No profile found." });
        }
        
        res.json({ success: true, profile });
    } catch (error) {
        console.error("Error fetching student profile:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 📊 Admin: Get All Students with Lifecycle Status
app.get('/api/admin/students-list', async (req, res) => {
    try {
        const users = await User.find({ role: 'student' });
        const alerts = await Alert.find();

        const studentList = users.map(user => {
            const profile = alerts.find(a => a.email === user.email);

            let status = "Pending";
            let studentName = "Not Set Yet";
            let courseSection = "Pending Assignment";
            let gwa = "N/A";
            let attendance = "N/A";
            let riskLevel = "N/A";
            let confidenceScore = 0;
            let alertId = null;

            if (profile) {
                studentName = profile.studentName || "Anonymous Student";
                courseSection = (profile.course && profile.section) ? `${profile.course} ${profile.section}` : "N/A";
                gwa = profile.gwa;
                attendance = profile.attendance;
                riskLevel = profile.riskLevel;
                confidenceScore = profile.confidenceScore;
                alertId = profile._id;
                status = "Active";
            }

            return {
                studentNo: user.studentNo || "Pending",
                email: user.email,
                studentName,
                courseSection,
                gwa,
                attendance,
                riskLevel,
                confidenceScore,
                status,
                alertId
            };
        });

        res.json({ success: true, students: studentList });
    } catch (error) {
        console.error("Error fetching admin students list:", error);
        res.status(500).json({ success: false, message: "Server error fetching students." });
    }
});

// 🗑️ Option A: Reset Assessment Profile Only
app.delete('/api/admin/reset-profile/:email', async (req, res) => {
    try {
        const studentEmail = req.params.email;
        await Alert.findOneAndDelete({ email: studentEmail });
        console.log(`🧹 Risk profile reset for student: ${studentEmail}`);
        res.json({ success: true, message: "Student assessment profile reset successfully." });
    } catch (error) {
        console.error("Error resetting profile:", error);
        res.status(500).json({ success: false, message: "Server error resetting profile." });
    }
});

// ❌ Option B: Delete Student Account Completely
app.delete('/api/admin/delete-student/:email', async (req, res) => {
    try {
        const studentEmail = req.params.email;
        await User.findOneAndDelete({ email: studentEmail });
        await Alert.findOneAndDelete({ email: studentEmail });
        console.log(`❌ Full account purge executed for: ${studentEmail}`);
        res.json({ success: true, message: "Student account and records deleted completely." });
    } catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ success: false, message: "Server error deleting student." });
    }
});

// 🔄 Update Student Intervention Status
app.patch('/api/alerts/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedAlert = await Alert.findByIdAndUpdate(
            req.params.id,
            { interventionStatus: status },
            { returnDocument: 'after' }
        );

        if (!updatedAlert) {
            return res.status(404).json({ success: false, message: "Alert record not found." });
        }

        res.json({ success: true, message: "Status updated successfully.", alert: updatedAlert });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ success: false, message: "Server error updating status." });
    }
});

// 👤 Admin Profile: Fetch Profile Data & Saved Photo
app.get('/api/admin/profile/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) {
            return res.status(404).json({ success: false, message: "Admin user not found." });
        }

        res.json({
            success: true,
            adminName: user.adminName || "System Administrator",
            username: user.username || "admin",
            email: user.email,
            profilePhoto: user.profilePhoto || ""
        });
    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ success: false, message: "Server error fetching profile." });
    }
});

// ⚙️ Admin Settings: Save Profile Info, Photo, and Password to MongoDB
app.post('/api/admin/update-settings', async (req, res) => {
    try {
        const { email, adminName, username, profilePhoto, currentPassword, newPassword } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "No active session email provided." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User account not found." });
        }

        // Verify old password if a password update is requested
        if (newPassword) {
            if (user.password !== currentPassword) {
                return res.status(400).json({ success: false, message: "Current password does not match our records." });
            }
            user.password = newPassword;
            console.log(`🔑 Password successfully updated for admin: ${email}`);
        }

        if (adminName) user.adminName = adminName;
        if (username) user.username = username;
        if (profilePhoto) user.profilePhoto = profilePhoto;

        await user.save();
        console.log(`✅ Admin settings & profile photo saved to database for: ${email}`);

        res.json({ 
            success: true, 
            message: "Profile and photo saved to MongoDB database successfully!",
            adminName: user.adminName,
            username: user.username,
            profilePhoto: user.profilePhoto
        });
    } catch (error) {
        console.error("Settings update error:", error);
        res.status(500).json({ success: false, message: "Server error updating settings." });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Web Server running live at http://localhost:${PORT}`);
});