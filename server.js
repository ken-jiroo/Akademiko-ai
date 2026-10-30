const path = require('path');
try { 
    require('dotenv').config({ path: path.join(__dirname, '.env') }); 
} catch (e) {}

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 8080;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://eduardllegado09_db_user:071405kenji@cluster0.iyvnxwh.mongodb.net/?appName=Cluster0';
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Connect to MongoDB Atlas
mongoose.connect(MONGODB_URI)
    .then(() => console.log("🗄️ MongoDB Atlas Connected successfully!"))
    .catch((err) => console.error("MongoDB Connection Error:", err));

// 🛡️ Security: NoSQL / SQL Injection Sanitizer Middleware
function sanitizeInput(val) {
    if (typeof val === 'string') return val.replace(/^\$/, '').trim();
    if (typeof val === 'object' && val !== null) {
        for (let key in val) {
            if (key.startsWith('$')) delete val[key];
            else val[key] = sanitizeInput(val[key]);
        }
    }
    return val;
}

app.use((req, res, next) => {
    if (req.body) req.body = sanitizeInput(req.body);
    if (req.query) req.query = sanitizeInput(req.query);
    if (req.params) req.params = sanitizeInput(req.params);
    next();
});

function isValidFullName(name) {
    if (!name || typeof name !== 'string') return false;
    const cleanName = name.trim();
    const nameRegex = /^[a-zA-ZÀ-ÿ\s.\-ñÑ]+$/;
    return nameRegex.test(cleanName) && cleanName.length >= 2;
}

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
    gwa: { type: Number, default: 0 },
    attendance: { type: Number, default: 0 },
    riskLevel: { type: String, default: "Low Risk" },
    confidenceScore: { type: Number, default: 0 },
    interventionStatus: { type: String, default: "Pending Action" },
    accountStatus: { type: String, default: "Pending" },
    hasCompletedSurvey: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    archiveReason: { type: String, default: "" },
    archivedAt: { type: Date, default: null },
    riskTrend: { type: String, default: "Stable" },
    projectedGwa: { type: Number, default: null },
    aiNarrative: { type: String, default: "" },
    decisionAudit: { type: Object, default: {} },
    SHS_Strand: { type: String, default: "HUMSS" },
    Employment_Type: { type: String, default: "Not Employed" },
    Mental_Health_Text: { type: String, default: "" },
    Work_Financial_Text: { type: String, default: "" },
    Commute_Text: { type: String, default: "" },
    Family_Text: { type: String, default: "" },
    Health_Text: { type: String, default: "" },
    Course_Mismatch_Text: { type: String, default: "" },
    assessmentHistory: [{
        gwa: Number,
        attendance: Number,
        riskLevel: String,
        confidenceScore: Number,
        term: { type: String, default: "Periodic Assessment" },
        evaluatedAt: { type: Date, default: Date.now }
    }],
    classRecord: {
        quizzes: [{ score: Number, total: Number, date: Date, title: String }],
        activities: [{ score: Number, total: Number, date: Date, title: String }],
        projects: [{ score: Number, total: Number, date: Date, title: String }],
        exams: [{ score: Number, total: Number, term: String }],
        attendanceRate: { type: Number, default: 0 },
        runningAverage: { type: Number, default: 0 }
    },
    counselingNotes: [{
        author: String,
        role: String,
        note: String,
        timestamp: { type: Date, default: Date.now }
    }],
    timestamp: { type: Date, default: Date.now }
}, { strict: false });

const Alert = mongoose.model('Alert', alertSchema);

const userSchema = new mongoose.Schema({
    studentNo: String,
    studentName: { type: String, default: "" },
    email: String,
    password: { type: String, required: true },
    role: String,
    adminName: { type: String, default: "System Administrator" },
    username: { type: String, default: "admin" },
    profilePhoto: { type: String, default: "" },
    department: { type: String, default: "" },
    assignedSection: { type: String, default: "" },
    majorCode: { type: String, default: "" },
    isArchived: { type: Boolean, default: false },
    archiveReason: { type: String, default: "" }
}, { strict: false });

const User = mongoose.model('User', userSchema);

const notificationSchema = new mongoose.Schema({
    recipientRole: { type: String, required: true },
    recipientIdentifier: { type: String, required: true },
    studentNo: String,
    studentName: String,
    title: String,
    message: String,
    breakdown: { type: Object, default: {} },
    finalGwa: Number,
    attendance: Number,
    riskLevel: String,
    adviserNotified: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

const auditLogSchema = new mongoose.Schema({
    userEmail: { type: String, default: "System" },
    role: { type: String, default: "Admin" },
    action: { type: String, required: true },
    details: { type: String, required: true },
    target: { type: String, default: "N/A" },
    ipAddress: { type: String, default: "127.0.0.1" },
    timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

async function logAuditEvent(userEmail, role, action, details, target = "N/A", req = null) {
    try {
        const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
        await AuditLog.create({
            userEmail: userEmail || "System",
            role: role || "System",
            action,
            details,
            target,
            ipAddress: String(ip).replace('::ffff:', ''),
            timestamp: new Date()
        });
    } catch (err) {
        console.warn("Audit log warning:", err.message);
    }
}

app.use(express.static(path.join(__dirname, '../frontend')));

function calculateRiskTrend(previousRisk, newRisk) {
    if (!previousRisk) return "Stable";
    const rank = { "Low Risk": 1, "Moderate Risk": 2, "High Risk": 3 };
    const prev = rank[previousRisk] || 1;
    const curr = rank[newRisk] || 1;
    if (curr < prev) return "Improved";
    if (curr > prev) return "Regressed";
    return "Stable";
}

function computeRunningAverage(classRecord, weights) {
    const defaultWeights = { quiz: 20, act: 20, proj: 20, exam: 30, att: 10 };
    const w = weights || defaultWeights;

    let totalWeightUsed = 0;
    let earnedWeight = 0;

    if (classRecord.quizzes && classRecord.quizzes.length > 0 && w.quiz > 0) {
        let qEarned = 0, qTotal = 0;
        classRecord.quizzes.forEach(q => {
            if (q.score !== null && q.total > 0) {
                qEarned += q.score;
                qTotal += q.total;
            }
        });
        if (qTotal > 0) {
            const quizPct = (qEarned / qTotal) * 100;
            earnedWeight += (quizPct * (w.quiz / 100));
            totalWeightUsed += (w.quiz / 100);
        }
    }

    if (classRecord.activities && classRecord.activities.length > 0 && w.act > 0) {
        let aEarned = 0, aTotal = 0;
        classRecord.activities.forEach(a => {
            if (a.score !== null && a.total > 0) {
                aEarned += a.score;
                aTotal += a.total;
            }
        });
        if (aTotal > 0) {
            const actPct = (aEarned / aTotal) * 100;
            earnedWeight += (actPct * (w.act / 100));
            totalWeightUsed += (w.act / 100);
        }
    }

    if (classRecord.projects && classRecord.projects.length > 0 && w.proj > 0) {
        let pEarned = 0, pTotal = 0;
        classRecord.projects.forEach(p => {
            if (p.score !== null && p.total > 0) {
                pEarned += p.score;
                pTotal += p.total;
            }
        });
        if (pTotal > 0) {
            const projPct = (pEarned / pTotal) * 100;
            earnedWeight += (projPct * (w.proj / 100));
            totalWeightUsed += (w.proj / 100);
        }
    }

    if (classRecord.exams && classRecord.exams.length > 0 && w.exam > 0) {
        let eEarned = 0, eTotal = 0;
        classRecord.exams.forEach(e => {
            if (e.score !== null && e.total > 0) {
                eEarned += e.score;
                eTotal += e.total;
            }
        });
        if (eTotal > 0) {
            const examPct = (eEarned / eTotal) * 100;
            earnedWeight += (examPct * (w.exam / 100));
            totalWeightUsed += (w.exam / 100);
        }
    }

    if (classRecord.attendanceRate !== undefined && w.att > 0) {
        earnedWeight += (classRecord.attendanceRate * (w.att / 100));
        totalWeightUsed += (w.att / 100);
    }

    if (totalWeightUsed === 0) return 0.0;
    return parseFloat(((earnedWeight / totalWeightUsed)).toFixed(1));
}

// 🩺 1. AI Health Heartbeat
app.get('/api/health/ai', async (req, res) => {
    try {
        const response = await axios.get(`${FASTAPI_URL}/docs`, { timeout: 1500 });
        if (response.status === 200) {
            return res.json({ success: true, online: true, mode: "FastAPI ANN Deep Learning Brain (Port 8000)" });
        }
        res.json({ success: true, online: false, mode: "Rule-Based Heuristic Fallback" });
    } catch (err) {
        res.json({ success: true, online: false, mode: "Rule-Based Heuristic Fallback" });
    }
});

// 🔬 2. Diagnostics
app.get('/api/admin/diagnostics', async (req, res) => {
    const diagnostics = {
        timestamp: new Date().toISOString(),
        database: { status: "Unknown", latencyMs: null, host: "Cluster0 (Atlas)" },
        aiBrain: { status: "Offline", latencyMs: null, endpoint: FASTAPI_URL, mode: "Rule-Based Heuristic Active" },
        rosterIntegrity: { totalUsers: 0, totalAlerts: 0, missingSectionCount: 0, passingCount: 0, atRiskCount: 0, integrityScore: "100%" },
        notifications: { totalDispatched: 0, unreadCount: 0, adviserAlertsCount: 0 },
        auditLogsCount: 0
    };

    const dbStart = Date.now();
    try {
        await mongoose.connection.db.admin().ping();
        diagnostics.database.latencyMs = Date.now() - dbStart;
        diagnostics.database.status = "Healthy (Connected)";
    } catch (dbErr) {
        diagnostics.database.status = "Degraded / Unreachable";
    }

    const aiStart = Date.now();
    try {
        const aiRes = await axios.get(`${FASTAPI_URL}/docs`, { timeout: 2000 });
        if (aiRes.status === 200) {
            diagnostics.aiBrain.latencyMs = Date.now() - aiStart;
            diagnostics.aiBrain.status = "Online (Ready)";
            diagnostics.aiBrain.mode = "FastAPI ANN Deep Learning Brain";
        }
    } catch (aiErr) {
        diagnostics.aiBrain.status = "Fallback Active (FastAPI Unreachable)";
    }

    try {
        const [users, alerts, notifs, auditCount] = await Promise.all([
            User.find({ role: 'student', isArchived: { $ne: true } }),
            Alert.find({ isArchived: { $ne: true } }),
            Notification.find(),
            AuditLog.countDocuments()
        ]);

        diagnostics.rosterIntegrity.totalUsers = users.length;
        diagnostics.rosterIntegrity.totalAlerts = alerts.length;
        diagnostics.auditLogsCount = auditCount;

        let missingSection = 0, atRisk = 0, passing = 0;
        alerts.forEach(a => {
            if (!a.course || !a.section) missingSection++;
            if (a.riskLevel === "High Risk" || a.riskLevel === "Moderate Risk") atRisk++;
            else passing++;
        });

        diagnostics.rosterIntegrity.missingSectionCount = missingSection;
        diagnostics.rosterIntegrity.passingCount = passing;
        diagnostics.rosterIntegrity.atRiskCount = atRisk;
        diagnostics.rosterIntegrity.integrityScore = (alerts.length > 0 && missingSection === 0) ? "100% Validated" : `${Math.round(((alerts.length - missingSection) / (alerts.length || 1)) * 100)}%`;

        diagnostics.notifications.totalDispatched = notifs.length;
        diagnostics.notifications.unreadCount = notifs.filter(n => !n.read).length;
        diagnostics.notifications.adviserAlertsCount = notifs.filter(n => n.adviserNotified).length;

        res.json({ success: true, diagnostics });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, diagnostics });
    }
});

// 🛡️ 3. Audit Logs Endpoints
app.get('/api/admin/audit-logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(limit);
        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/audit-logs', async (req, res) => {
    try {
        const { userEmail, role, action, details, target } = req.body;
        await logAuditEvent(userEmail, role, action, details, target, req);
        res.json({ success: true, message: "Audit event recorded." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 📊 3b. Model Benchmarking Summary (Panel Defense Table)[cite: 1]
app.get('/api/admin/model-benchmark', async (req, res) => {
    try {
        const benchmarkData = [
            {
                architecture: "Ridge Regression / Logistic (Baseline)",
                type: "Linear Baseline",
                train_rmse: 2.158,
                val_rmse: 2.183,
                test_rmse: 2.183,
                val_acc: 88.89,
                test_acc: 90.00,
                f1: 0.886,
                status: "Linear Baseline Reference"
            },
            {
                architecture: "Random Forest (Ensemble)",
                type: "Non-Linear Ensemble",
                train_rmse: 1.513,
                val_rmse: 3.733,
                test_rmse: 3.680,
                val_acc: 85.56,
                test_acc: 86.11,
                f1: 0.819,
                status: "High Variance / Overfitting"
            },
            {
                architecture: "Artificial Neural Network (ANN / MLP)",
                type: "Deep Learning (32-16 ReLU)",
                train_rmse: 1.875,
                val_rmse: 1.993,
                test_rmse: 1.916,
                val_acc: 91.67,
                test_acc: 87.78,
                f1: 0.872,
                status: "SELECTED PRODUCTION MODEL"
            }
        ];
        res.json({ success: true, benchmarks: benchmarkData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔐 4. Unified Login
app.post('/api/login', async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const role = req.body.role ? String(req.body.role).trim() : null;

        const query = role ? { email, role } : { email };
        const user = await User.findOne(query);

        if (!user) {
            await logAuditEvent(email, role || "Unknown", "LOGIN_FAILED", "User email does not exist.", "Auth", req);
            return res.status(401).json({ success: false, message: "Invalid email, password, or role." });
        }

        if (user.isArchived) {
            await logAuditEvent(email, user.role, "LOGIN_BLOCKED_ARCHIVED", `Archived account attempted login (${user.archiveReason || 'Archived'}).`, "Auth", req);
            return res.status(403).json({ 
                success: false, 
                message: `This account has been archived (${user.archiveReason || 'Graduated / Inactive'}). Please contact your department administrator.` 
            });
        }

        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (user.password === password);
            if (isMatch) {
                user.password = await bcrypt.hash(password, 10);
                await user.save();
            }
        }

        if (!isMatch) {
            await logAuditEvent(email, user.role, "LOGIN_FAILED", "Incorrect password entered.", "Auth", req);
            return res.status(401).json({ success: false, message: "Invalid email, password, or role." });
        }

        let redirectUrl = "../student/student-dashboard.html";
        if (user.role === 'admin') redirectUrl = "../admin/admin-dashboard.html";
        else if (user.role === 'faculty') redirectUrl = "../faculty/faculty-dashboard.html";

        await logAuditEvent(user.email, user.role, "USER_LOGIN_SUCCESS", `Logged in to ${user.role} workspace.`, "Auth", req);

        res.json({
            success: true,
            message: "Login successful",
            role: user.role,
            email: user.email,
            name: user.adminName || user.studentName || "User",
            department: user.department || "",
            assignedSection: user.assignedSection || "3A",
            redirectUrl: redirectUrl
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// ➕ 5. Admin: Create Single Student
app.post('/api/admin/add-student', async (req, res) => {
    try {
        const studentNo = String(req.body.studentNo || "").trim();
        const studentName = String(req.body.studentName || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const course = String(req.body.course || "").trim();
        const section = String(req.body.section || "").trim();
        const rawPassword = req.body.password ? String(req.body.password) : "UDM2026!";
        const adminEmail = req.body.adminEmail || "Admin";

        if (!isValidFullName(studentName)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Student Name. Only alphabetic letters, spaces, and periods (.) are allowed. Numbers and special symbols are strictly rejected."
            });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ success: false, message: "Email is already registered." });

        const existingStudentNo = await User.findOne({ studentNo });
        if (existingStudentNo) return res.status(400).json({ success: false, message: "Student number already exists." });

        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const newUser = new User({
            studentNo,
            studentName,
            email,
            password: hashedPassword,
            role: "student",
            department: course,
            isArchived: false
        });
        await newUser.save();

        const newAlert = new Alert({
            studentName,
            studentNo,
            email,
            course,
            section,
            gwa: 0,
            attendance: 0,
            riskLevel: "Low Risk",
            riskTrend: "Stable",
            confidenceScore: 0,
            interventionStatus: "Pending Action",
            accountStatus: "Pending",
            hasCompletedSurvey: false,
            isArchived: false,
            classRecord: { quizzes: [], activities: [], projects: [], exams: [], attendanceRate: 0, runningAverage: 0 },
            notes: "Newly enrolled student. Awaiting initial wellbeing contextual check-in.",
            timestamp: new Date()
        });
        await newAlert.save();

        await logAuditEvent(
            adminEmail,
            "Admin",
            "STUDENT_ENROLLED",
            `Enrolled ${studentName} (${studentNo}) into ${course} ${section} with default encrypted password.`,
            studentNo,
            req
        );

        res.json({ success: true, message: "Student account created successfully with encrypted credentials!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error creating student." });
    }
});

// 📥 5b. Admin: Batch Add / Enroll Students via CSV[cite: 17, 18]
app.post('/api/admin/batch-add-students', async (req, res) => {
    try {
        const { students, adminEmail } = req.body;
        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ success: false, message: "No student records provided in batch." });
        }

        let enrolledCount = 0;
        const skipped = [];
        const defaultHash = await bcrypt.hash("UDM2026!", 10);

        for (const item of students) {
            const studentNo = String(item.studentNo || "").trim();
            const studentName = String(item.studentName || "").trim();
            const email = String(item.email || "").trim().toLowerCase();
            const course = String(item.course || "BSED - Mathematics").trim();
            const section = String(item.section || "3A").trim();
            const rawPassword = item.password ? String(item.password) : null;

            if (!studentNo || !studentName || !email) {
                skipped.push({ studentNo: studentNo || "Unknown", reason: "Missing required fields (ID, Name, or Email)." });
                continue;
            }

            if (!isValidFullName(studentName)) {
                skipped.push({ studentNo, reason: `Invalid name "${studentName}". Numbers and symbols are prohibited.` });
                continue;
            }

            const existingUser = await User.findOne({ $or: [{ email }, { studentNo }] });
            if (existingUser) {
                skipped.push({ studentNo, reason: `Student No or Email already exists in database.` });
                continue;
            }

            const passwordHash = rawPassword ? await bcrypt.hash(rawPassword, 10) : defaultHash;

            await User.create({
                studentNo,
                studentName,
                email,
                password: passwordHash,
                role: "student",
                department: course,
                assignedSection: section,
                isArchived: false
            });

            await Alert.create({
                studentName,
                studentNo,
                email,
                course,
                section,
                gwa: 0,
                attendance: 0,
                riskLevel: "Low Risk",
                riskTrend: "Stable",
                confidenceScore: 0,
                interventionStatus: "Pending Action",
                accountStatus: "Pending",
                hasCompletedSurvey: false,
                isArchived: false,
                classRecord: { quizzes: [], activities: [], projects: [], exams: [], attendanceRate: 0, runningAverage: 0 },
                notes: "Enrolled via Admin CSV Batch Import. Awaiting initial contextual check-in.",
                timestamp: new Date()
            });

            enrolledCount++;
        }

        await logAuditEvent(
            adminEmail || "Administrator",
            "Admin",
            "BATCH_STUDENTS_ENROLLED",
            `Enrolled ${enrolledCount} new students via CSV Batch Import. (${skipped.length} skipped).`,
            `Cohort Batch (${enrolledCount} accounts)`,
            req
        );

        res.json({
            success: true,
            message: `Successfully enrolled ${enrolledCount} student accounts!`,
            enrolledCount,
            skipped
        });
    } catch (err) {
        console.error("Batch add students error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 📦 6. Admin: Archive Student[cite: 18]
app.patch('/api/admin/archive-student/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const { reason, adminEmail } = req.body;
        const archiveReason = reason || "Graduated / Departed";

        const user = await User.findOneAndUpdate(
            { email },
            { isArchived: true, archiveReason: archiveReason },
            { returnDocument: 'after' }
        );

        const alert = await Alert.findOneAndUpdate(
            { email },
            { isArchived: true, archiveReason: archiveReason, archivedAt: new Date() },
            { returnDocument: 'after' }
        );

        if (!user && !alert) {
            return res.status(404).json({ success: false, message: "Student record not found." });
        }

        await logAuditEvent(
            adminEmail || "Administrator",
            "Admin",
            "STUDENT_ARCHIVED",
            `Archived student ${email}. Reason: ${archiveReason}`,
            email,
            req
        );

        res.json({ success: true, message: `Student successfully archived (${archiveReason}). Data preserved.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔄 7. Admin: Restore / Unarchive Student[cite: 18]
app.patch('/api/admin/unarchive-student/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const { adminEmail } = req.body;

        await User.findOneAndUpdate({ email }, { isArchived: false, archiveReason: "" }, { returnDocument: 'after' });
        await Alert.findOneAndUpdate({ email }, { isArchived: false, archiveReason: "", archivedAt: null }, { returnDocument: 'after' });

        await logAuditEvent(
            adminEmail || "Administrator",
            "Admin",
            "STUDENT_RESTORED",
            `Restored archived student ${email} to active status.`,
            email,
            req
        );

        res.json({ success: true, message: "Student restored to active cohort successfully." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🗑️ 8. Admin: Permanent Delete Student & Reset Assessment Profile[cite: 18]
app.delete('/api/admin/delete-student/:email', async (req, res) => {
    try {
        const email = req.params.email;
        await User.findOneAndDelete({ email });
        await Alert.findOneAndDelete({ email });
        await Notification.deleteMany({ recipientIdentifier: email });
        
        await logAuditEvent("Administrator", "Admin", "STUDENT_ACCOUNT_DELETED", `Permanently deleted account and related academic records for ${email}`, email, req);

        res.json({ success: true, message: "Student account permanently deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

app.delete('/api/admin/reset-profile/:email', async (req, res) => {
    try {
        await Alert.findOneAndDelete({ email: req.params.email });
        await logAuditEvent("Administrator", "Admin", "ASSESSMENT_PROFILE_RESET", `Reset assessment profile data for student email ${req.params.email}`, req.params.email, req);
        res.json({ success: true, message: "Student assessment profile reset successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 📊 9. Admin: Get Students List[cite: 18]
app.get('/api/admin/students-list', async (req, res) => {
    try {
        const includeArchived = req.query.archived === 'true';
        const userQuery = { role: 'student' };
        if (includeArchived) {
            userQuery.isArchived = true;
        } else {
            userQuery.isArchived = { $ne: true };
        }

        const users = await User.find(userQuery).select('-password');
        const alerts = await Alert.find();

        const studentList = users.map(user => {
            const profile = alerts.find(a => a.email === user.email);
            let status = "Pending";
            let studentName = user.studentName || "Not Set Yet";
            let courseSection = "Pending Assignment";
            let gwa = 0, attendance = 0, riskLevel = "N/A", confidenceScore = 0, alertId = null, riskTrend = "Stable";
            let hasCompletedSurvey = false;

            if (profile) {
                studentName = profile.studentName || user.studentName || "Anonymous Student";
                courseSection = (profile.course && profile.section) ? `${profile.course} ${profile.section}` : "N/A";
                riskLevel = profile.riskLevel;
                riskTrend = profile.riskTrend || "Stable";
                confidenceScore = profile.confidenceScore;
                alertId = profile._id;
                
                hasCompletedSurvey = !!profile.hasCompletedSurvey || 
                                     (profile.Mental_Health_Text && profile.Mental_Health_Text.trim().length > 0) ||
                                     (profile.answers && Object.keys(profile.answers).length > 0);

                status = hasCompletedSurvey ? "Active" : "Pending";

                if (status === "Pending") {
                    attendance = 0;
                    gwa = 0;
                } else {
                    attendance = profile.attendance ?? 0;
                    gwa = profile.gwa ?? 0;
                }
            }

            return {
                studentNo: user.studentNo || "Pending",
                email: user.email,
                studentName,
                courseSection,
                gwa,
                attendance,
                riskLevel,
                riskTrend,
                confidenceScore,
                status,
                hasCompletedSurvey,
                isArchived: !!user.isArchived,
                archiveReason: user.archiveReason || "",
                alertId
            };
        });

        res.json({ success: true, students: studentList });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error fetching students." });
    }
});

// ⚡ 10. Capstone Defense Demo: Trigger Midterm Crisis Scenario[cite: 18]
app.post('/api/admin/demo/trigger-risk', async (req, res) => {
    try {
        const { adminEmail } = req.body;
        let targets = await Alert.find({ course: "BSED - Mathematics", isArchived: { $ne: true } }).limit(2);
        if (targets.length === 0) targets = await Alert.find({ isArchived: { $ne: true } }).limit(2);

        if (targets.length === 0) {
            return res.status(404).json({ success: false, message: "No student records available for demo scenario." });
        }

        const modifiedStudents = [];

        for (const student of targets) {
            if (!student.assessmentHistory) student.assessmentHistory = [];
            student.assessmentHistory.unshift({
                gwa: student.gwa || 85.0,
                attendance: student.attendance || 90.0,
                riskLevel: student.riskLevel || "Low Risk",
                confidenceScore: student.confidenceScore || 80.0,
                term: "Pre-Scenario Baseline",
                evaluatedAt: new Date()
            });

            student.gwa = 71.5;
            student.attendance = 72.0;
            student.riskLevel = "High Risk";
            student.confidenceScore = 98.5;
            student.riskTrend = "Regressed";
            student.interventionStatus = "Pending Action";
            student.timestamp = new Date();
            await student.save();

            const recipientKey = `${student.course}_${student.section}`.trim();
            await Notification.create({
                recipientRole: 'faculty',
                recipientIdentifier: recipientKey,
                studentNo: student.studentNo,
                studentName: student.studentName,
                title: `🚨 Defense Demo Crisis: ${student.studentName}`,
                message: `DEMO SCENARIO: GWA dropped to 71.5% and attendance to 72.0%. Flagged as High Risk (Regressed).`,
                riskLevel: "High Risk",
                finalGwa: 71.5,
                attendance: 72.0,
                adviserNotified: true
            });

            modifiedStudents.push({
                studentNo: student.studentNo,
                name: student.studentName,
                section: `${student.course} ${student.section}`,
                gwa: 71.5,
                risk: "High Risk"
            });
        }

        await logAuditEvent(
            adminEmail || "Admin Presenter",
            "Admin",
            "DEMO_SCENARIO_RISK_TRIGGERED",
            `Simulated midterm academic crisis on ${targets.length} students for capstone panel defense.`,
            `Students: ${modifiedStudents.map(s => s.studentNo).join(', ')}`,
            req
        );

        res.json({
            success: true,
            message: `⚡ Simulated academic crisis activated for ${targets.length} students!`,
            modifiedStudents
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🔄 11. Capstone Defense Demo: Restore Baseline State[cite: 18]
app.post('/api/admin/demo/reset-baseline', async (req, res) => {
    try {
        const { adminEmail } = req.body;
        let targets = await Alert.find({ course: "BSED - Mathematics", isArchived: { $ne: true } }).limit(2);
        if (targets.length === 0) targets = await Alert.find({ isArchived: { $ne: true } }).limit(2);

        const restoredStudents = [];

        for (const student of targets) {
            student.gwa = 86.5;
            student.attendance = 92.0;
            student.riskLevel = "Low Risk";
            student.confidenceScore = 85.0;
            student.riskTrend = "Improved";
            student.interventionStatus = "Resolved";
            student.timestamp = new Date();
            await student.save();

            restoredStudents.push({
                studentNo: student.studentNo,
                name: student.studentName,
                gwa: 86.5,
                risk: "Low Risk"
            });
        }

        await logAuditEvent(
            adminEmail || "Admin Presenter",
            "Admin",
            "DEMO_BASELINE_RESTORED",
            `Reset demo students back to clean good standing baseline for defense presentation.`,
            `Students: ${restoredStudents.map(s => s.studentNo).join(', ')}`,
            req
        );

        res.json({
            success: true,
            message: `🔄 Demo records cleanly restored back to passing baseline!`,
            restoredStudents
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 👨‍🏫 12. Faculty: Standard Single Student Grade Update[cite: 18]
app.patch('/api/faculty/update-grade', async (req, res) => {
    try {
        const { studentNo, gwa, attendance, breakdown, facultyEmail } = req.body;
        
        const existingRecord = await Alert.findOne({ studentNo });
        if (!existingRecord) {
            return res.status(404).json({ success: false, message: "Student assessment record not found." });
        }

        let predictedRisk = existingRecord.riskLevel || "Low Risk";
        let confidenceScore = existingRecord.confidenceScore || 80.0;
        let projectedGwa = existingRecord.projectedGwa || parseFloat(gwa);
        let aiNarrative = existingRecord.aiNarrative || "";
        let decisionAudit = existingRecord.decisionAudit || {};

        try {
            const aiPayload = {
                studentName: existingRecord.studentName,
                studentNo: existingRecord.studentNo,
                email: existingRecord.email,
                course: existingRecord.course,
                section: existingRecord.section,
                SHS_Strand: existingRecord.SHS_Strand || "HUMSS",
                Employment_Type: existingRecord.Employment_Type || "Not Employed",
                Mental_Health_Text: existingRecord.Mental_Health_Text || "",
                Work_Financial_Text: existingRecord.Work_Financial_Text || "",
                Commute_Text: existingRecord.Commute_Text || "",
                Family_Text: existingRecord.Family_Text || "",
                Health_Text: existingRecord.Health_Text || "",
                Course_Mismatch_Text: existingRecord.Course_Mismatch_Text || "",
                Attendance_Rate: parseFloat(attendance),
                GWA_Percentage: parseFloat(gwa)
            };

            const aiResponse = await axios.post(`${FASTAPI_URL}/predict`, aiPayload, { timeout: 3000 });
            if (aiResponse.data) {
                predictedRisk = aiResponse.data.predicted_risk;
                confidenceScore = aiResponse.data.confidence_score;
                projectedGwa = aiResponse.data.projected_gwa;
                aiNarrative = aiResponse.data.ai_narrative_explanation;
                decisionAudit = aiResponse.data.decision_audit || {};
            }
        } catch (aiErr) {
            if (parseFloat(gwa) < 75 || parseFloat(attendance) < 75) {
                predictedRisk = "High Risk";
                confidenceScore = 95.0;
            } else if (parseFloat(gwa) < 78 || parseFloat(attendance) < 82) {
                predictedRisk = "Moderate Risk";
                confidenceScore = 78.0;
            } else {
                predictedRisk = "Low Risk";
                confidenceScore = 88.0;
            }
        }

        if (parseFloat(gwa) < 75) {
            predictedRisk = "High Risk";
            confidenceScore = Math.max(confidenceScore || 0, 95.0);
        }

        if (!existingRecord.assessmentHistory) existingRecord.assessmentHistory = [];
        existingRecord.assessmentHistory.unshift({
            gwa: existingRecord.gwa,
            attendance: existingRecord.attendance,
            riskLevel: existingRecord.riskLevel,
            confidenceScore: existingRecord.confidenceScore,
            term: "Previous Evaluation",
            evaluatedAt: existingRecord.timestamp || new Date()
        });

        existingRecord.riskTrend = calculateRiskTrend(existingRecord.riskLevel, predictedRisk);
        existingRecord.gwa = parseFloat(gwa);
        existingRecord.attendance = parseFloat(attendance);
        existingRecord.riskLevel = predictedRisk;
        existingRecord.confidenceScore = confidenceScore;
        existingRecord.projectedGwa = projectedGwa;
        existingRecord.aiNarrative = aiNarrative;
        existingRecord.decisionAudit = decisionAudit;
        existingRecord.timestamp = new Date();

        await existingRecord.save();

        await logAuditEvent(
            facultyEmail || "Faculty Instructor",
            "Faculty",
            "GRADE_MODIFIED_MANUALLY",
            `Updated GWA to ${gwa}%, Attendance to ${attendance}%. Evaluated risk: ${predictedRisk} (${existingRecord.riskTrend}).`,
            existingRecord.studentNo,
            req
        );

        await Notification.create({
            recipientRole: 'student',
            recipientIdentifier: existingRecord.email,
            studentNo: existingRecord.studentNo,
            studentName: existingRecord.studentName,
            title: '📝 Official Grade Recorded',
            message: `Your class adviser has posted your weighted average of ${parseFloat(gwa)}% and attendance of ${parseFloat(attendance)}%. Trajectory status: ${existingRecord.riskTrend}.`,
            breakdown: breakdown || {},
            finalGwa: parseFloat(gwa),
            attendance: parseFloat(attendance),
            riskLevel: predictedRisk,
            adviserNotified: predictedRisk === "High Risk"
        });

        res.json({
            success: true,
            message: "Student academic record updated with longitudinal history!",
            record: existingRecord
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 📂 13. Faculty: Standard Batch Attendance & Grade Import[cite: 18]
app.post('/api/faculty/batch-update-grades', async (req, res) => {
    try {
        const { records, facultyEmail } = req.body;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: "No score records supplied." });
        }

        let updatedCount = 0;
        const errors = [];

        for (const item of records) {
            const studentNo = (item.studentNo || "").trim();
            const gwa = parseFloat(item.gwa);
            const attendance = parseFloat(item.attendance);

            if (!studentNo || isNaN(gwa) || isNaN(attendance)) {
                errors.push(`Invalid record format for ID ${studentNo || 'Unknown'}`);
                continue;
            }

            const existing = await Alert.findOne({ studentNo });
            if (!existing) {
                errors.push(`Student No. ${studentNo} not found in active roster.`);
                continue;
            }

            let predictedRisk = "Low Risk";
            let confidenceScore = 85.0;
            let projectedGwa = gwa;
            let aiNarrative = existing.aiNarrative || "";
            let decisionAudit = existing.decisionAudit || {};

            try {
                const aiPayload = {
                    studentName: existing.studentName,
                    studentNo: existing.studentNo,
                    email: existing.email,
                    course: existing.course,
                    section: existing.section,
                    SHS_Strand: existing.SHS_Strand || "HUMSS",
                    Employment_Type: existing.Employment_Type || "Not Employed",
                    Mental_Health_Text: existing.Mental_Health_Text || "",
                    Work_Financial_Text: existing.Work_Financial_Text || "",
                    Commute_Text: existing.Commute_Text || "",
                    Family_Text: existing.Family_Text || "",
                    Health_Text: existing.Health_Text || "",
                    Course_Mismatch_Text: existing.Course_Mismatch_Text || "",
                    Attendance_Rate: attendance,
                    GWA_Percentage: gwa
                };

                const aiRes = await axios.post(`${FASTAPI_URL}/predict`, aiPayload, { timeout: 2500 });
                if (aiRes.data) {
                    predictedRisk = aiRes.data.predicted_risk;
                    confidenceScore = aiRes.data.confidence_score;
                    projectedGwa = aiRes.data.projected_gwa;
                    aiNarrative = aiRes.data.ai_narrative_explanation;
                    decisionAudit = aiRes.data.decision_audit || {};
                }
            } catch (aiErr) {
                if (gwa < 75 || attendance < 75) {
                    predictedRisk = "High Risk";
                    confidenceScore = 96.0;
                } else if (gwa < 78 || attendance < 82) {
                    predictedRisk = "Moderate Risk";
                    confidenceScore = 80.0;
                } else {
                    predictedRisk = "Low Risk";
                    confidenceScore = 88.0;
                }
            }

            if (gwa < 75) {
                predictedRisk = "High Risk";
                confidenceScore = Math.max(confidenceScore, 99.0);
            }

            if (existing.gwa !== undefined && existing.riskLevel) {
                if (!existing.assessmentHistory) existing.assessmentHistory = [];
                existing.assessmentHistory.unshift({
                    gwa: existing.gwa,
                    attendance: existing.attendance,
                    riskLevel: existing.riskLevel,
                    confidenceScore: existing.confidenceScore,
                    term: "Prior Periodic Evaluation",
                    evaluatedAt: existing.timestamp || new Date()
                });
            }

            existing.riskTrend = calculateRiskTrend(existing.riskLevel, predictedRisk);
            existing.gwa = gwa;
            existing.attendance = attendance;
            existing.riskLevel = predictedRisk;
            existing.confidenceScore = confidenceScore;
            existing.projectedGwa = projectedGwa;
            existing.aiNarrative = aiNarrative;
            existing.decisionAudit = decisionAudit;
            existing.timestamp = new Date();
            await existing.save();

            if (existing.email) {
                await Notification.create({
                    recipientRole: 'student',
                    recipientIdentifier: existing.email,
                    studentNo: existing.studentNo,
                    studentName: existing.studentName,
                    title: '📋 Batch Grade Roster Finalized',
                    message: `Official GWA (${gwa}%) and Attendance (${attendance}%) updated. Trajectory standing: ${existing.riskTrend}.`,
                    breakdown: item.breakdown || {},
                    finalGwa: gwa,
                    attendance: attendance,
                    riskLevel: predictedRisk,
                    adviserNotified: predictedRisk === "High Risk"
                });
            }

            updatedCount++;
        }

        await logAuditEvent(
            facultyEmail || "Faculty Instructor",
            "Faculty",
            "BATCH_CSV_GRADES_IMPORTED",
            `Imported and re-evaluated ${updatedCount} grade records via CSV batch import.`,
            `Cohort Batch (${updatedCount} students)`,
            req
        );

        res.json({
            success: true,
            message: `Successfully batch updated ${updatedCount} student records with longitudinal history.`,
            updatedCount,
            errors
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 📝 14. Student Contextual Check-in & Deep Learning Evaluation
app.post('/api/predict', async (req, res) => {
    try {
        let finalRisk = "Low Risk";
        let finalConfidence = 80.0;
        let finalProjectedGwa = null;
        let finalNarrative = "";
        let finalDecisionAudit = {};

        const studentGwa = parseFloat(req.body.GWA_Percentage !== undefined ? req.body.GWA_Percentage : req.body.gwa) || 0;
        const studentAttendance = parseFloat(req.body.Attendance_Rate !== undefined ? req.body.Attendance_Rate : req.body.attendance) || 0;

        const shsStrand = req.body.SHS_Strand || "HUMSS";
        const employmentType = req.body.Employment_Type || "Not Employed";
        const mentalHealthText = req.body.Mental_Health_Text || "";
        const workFinancialText = req.body.Work_Financial_Text || "";
        const commuteText = req.body.Commute_Text || "";
        const familyText = req.body.Family_Text || "";
        const healthText = req.body.Health_Text || "";
        const courseMismatchText = req.body.Course_Mismatch_Text || "";
        const notes = req.body.notes || "";

        const aiPayload = {
            studentNo: req.body.studentNo || "Pending",
            studentName: req.body.studentName || "Student",
            course: req.body.course || "BSED",
            section: req.body.section || "3A",
            Attendance_Rate: studentAttendance,
            GWA_Percentage: studentGwa,
            SHS_Strand: shsStrand,
            Employment_Type: employmentType,
            Mental_Health_Text: mentalHealthText,
            Work_Financial_Text: workFinancialText,
            Commute_Text: commuteText,
            Family_Text: familyText,
            Health_Text: healthText,
            Course_Mismatch_Text: courseMismatchText,
            notes: notes
        };

        try {
            const aiResponse = await axios.post(`${FASTAPI_URL}/predict`, aiPayload, { timeout: 3500 });
            if (aiResponse.data) {
                finalRisk = aiResponse.data.predicted_risk;
                finalConfidence = aiResponse.data.confidence_score;
                finalProjectedGwa = aiResponse.data.projected_gwa;
                finalNarrative = aiResponse.data.ai_narrative_explanation;
                finalDecisionAudit = aiResponse.data.decision_audit || {};
            }
        } catch (aiErr) {
            console.warn("⚠️ FastAPI unreachable. Executing heuristic fallback.");
            if (studentGwa > 0 && studentGwa < 75) {
                finalRisk = "High Risk";
                finalConfidence = 99.0;
            } else if (studentAttendance > 0 && studentAttendance < 75) {
                finalRisk = "High Risk";
                finalConfidence = 92.0;
            } else if ((studentGwa > 0 && studentGwa < 78) || (studentAttendance > 0 && studentAttendance < 82)) {
                finalRisk = "Moderate Risk";
                finalConfidence = 78.5;
            } else {
                finalRisk = "Low Risk";
                finalConfidence = 88.0;
            }
            finalProjectedGwa = studentGwa || 75.0;
            finalNarrative = `${req.body.studentName || "The student"} is classified as ${finalRisk} under baseline monitoring.`;
        }

        if (studentGwa > 0 && studentGwa < 75) {
            finalRisk = "High Risk";
            finalConfidence = 99.9;
        }

        let existingRecord = await Alert.findOne({
            $or: [
                { studentNo: req.body.studentNo },
                { email: req.body.email }
            ]
        });

        const trend = calculateRiskTrend(existingRecord ? existingRecord.riskLevel : null, finalRisk);

        const updateData = {
            studentName: req.body.studentName,
            studentNo: req.body.studentNo,
            email: req.body.email,
            course: req.body.course,
            section: req.body.section,
            notes: notes,
            gwa: studentGwa,
            attendance: studentAttendance,
            riskLevel: finalRisk,
            riskTrend: trend,
            confidenceScore: finalConfidence,
            projectedGwa: finalProjectedGwa,
            aiNarrative: finalNarrative,
            decisionAudit: finalDecisionAudit,
            accountStatus: "Active",
            hasCompletedSurvey: true,
            SHS_Strand: shsStrand,
            Employment_Type: employmentType,
            Mental_Health_Text: mentalHealthText,
            Work_Financial_Text: workFinancialText,
            Commute_Text: commuteText,
            Family_Text: familyText,
            Health_Text: healthText,
            Course_Mismatch_Text: courseMismatchText,
            timestamp: Date.now()
        };

        const updated = await Alert.findOneAndUpdate(
            { $or: [{ studentNo: req.body.studentNo }, { email: req.body.email }] }, 
            updateData, 
            { upsert: true, returnDocument: 'after' }
        );

        res.json({
            success: true,
            predicted_risk: finalRisk,
            confidence_score: finalConfidence,
            projected_gwa: finalProjectedGwa,
            ai_narrative_explanation: finalNarrative,
            decision_audit: finalDecisionAudit,
            riskTrend: trend,
            record: updated
        });
    } catch (error) {
        console.error("Context evaluation error:", error);
        res.status(500).json({ success: false, error: "Internal server error." });
    }
});

// 📊 15. Granular Class Record: Save Individual Assessment & Early Risk Prediction[cite: 18]
app.post('/api/faculty/save-class-record', async (req, res) => {
    try {
        const { studentNo, classRecord, syllabusWeights, facultyEmail } = req.body;
        const student = await Alert.findOne({ studentNo });
        if (!student) {
            return res.status(404).json({ success: false, message: "Student record not found." });
        }

        const runningAvg = computeRunningAverage(classRecord, syllabusWeights);
        const attendance = (classRecord.attendanceRate !== undefined && !isNaN(classRecord.attendanceRate)) 
            ? parseFloat(classRecord.attendanceRate) 
            : (student.attendance ?? 0);

        let predictedRisk = "Low Risk";
        let confidenceScore = 85.0;

        if (runningAvg > 0 && runningAvg < 75) {
            predictedRisk = "High Risk";
            confidenceScore = 96.0;
        } else if (runningAvg > 0 && runningAvg < 78) {
            predictedRisk = "Moderate Risk";
            confidenceScore = 80.0;
        } else {
            predictedRisk = "Low Risk";
            confidenceScore = 88.0;
        }

        if (student.gwa && student.gwa !== runningAvg) {
            if (!student.assessmentHistory) student.assessmentHistory = [];
            student.assessmentHistory.unshift({
                gwa: student.gwa,
                attendance: student.attendance,
                riskLevel: student.riskLevel,
                confidenceScore: student.confidenceScore,
                term: "Prior Running Score Evaluation",
                evaluatedAt: new Date()
            });
        }

        student.riskTrend = calculateRiskTrend(student.riskLevel, predictedRisk);
        student.gwa = runningAvg;
        student.attendance = attendance;
        student.riskLevel = predictedRisk;
        student.confidenceScore = confidenceScore;
        student.accountStatus = "Active";
        student.hasCompletedSurvey = true;
        student.classRecord = {
            ...classRecord,
            attendanceRate: attendance,
            runningAverage: runningAvg
        };
        student.timestamp = new Date();
        await student.save();

        await logAuditEvent(
            facultyEmail || "Faculty Instructor",
            "Faculty",
            "GRANULAR_CLASS_RECORD_SAVED",
            `Saved formative assessments for ${student.studentName}. GWA: ${runningAvg}%, Attendance: ${attendance}%.`,
            student.studentNo,
            req
        );

        res.json({
            success: true,
            message: `Scores saved! Predicted standing: ${predictedRisk} (${runningAvg}% running average).`,
            runningAverage: runningAvg,
            attendance: attendance,
            predictedRisk: predictedRisk,
            riskTrend: student.riskTrend
        });
    } catch (err) {
        console.error("Save class record error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 📖 16. Fetch Student Granular Class Record[cite: 18]
app.get('/api/student/class-record/:identifier', async (req, res) => {
    try {
        const id = req.params.identifier;
        const student = await Alert.findOne({
            $or: [{ email: id }, { studentNo: id }]
        });

        if (!student) {
            return res.status(404).json({ success: false, message: "Student record not found." });
        }

        const rec = student.classRecord || {};
        const finalAtt = rec.attendanceRate !== undefined ? rec.attendanceRate : (student.attendance ?? 0);
        const finalGwa = rec.runningAverage !== undefined ? rec.runningAverage : (student.gwa ?? 0);

        res.json({
            success: true,
            studentName: student.studentName,
            studentNo: student.studentNo,
            course: student.course,
            section: student.section,
            gwa: finalGwa,
            attendance: finalAtt,
            riskLevel: student.riskLevel,
            classRecord: {
                quizzes: rec.quizzes || [],
                activities: rec.activities || [],
                projects: rec.projects || [],
                exams: rec.exams || [],
                attendanceRate: finalAtt,
                runningAverage: finalGwa
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 17. Fetch Student Profile by Email[cite: 18]
app.get('/api/student/:email', async (req, res) => {
    try {
        const profile = await Alert.findOne({ email: req.params.email });
        if (!profile) return res.status(404).json({ success: false, message: "No profile found." });

        res.json({ success: true, profile });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// 📂 17b. Batch Import Granular Scores[cite: 18]
app.post('/api/faculty/batch-granular-import', async (req, res) => {
    try {
        const { records, syllabusWeights, facultyEmail } = req.body;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: "No batch records supplied." });
        }

        let updated = 0;
        const errors = [];

        for (const item of records) {
            const studentNo = (item.studentNo || "").trim();
            if (!studentNo) continue;

            const student = await Alert.findOne({ studentNo });
            if (!student) {
                errors.push(`Student No. ${studentNo} not found.`);
                continue;
            }

            const rec = student.classRecord || { quizzes: [], activities: [], projects: [], exams: [], attendanceRate: 0 };

            if (item.quizzes) rec.quizzes = item.quizzes;
            if (item.activities) rec.activities = item.activities;
            if (item.projects) rec.projects = item.projects;
            if (item.exams) rec.exams = item.exams;
            if (item.attendanceRate !== undefined && !isNaN(item.attendanceRate)) {
                rec.attendanceRate = parseFloat(item.attendanceRate);
            }

            const runningAvg = computeRunningAverage(rec, syllabusWeights);
            rec.runningAverage = runningAvg;

            let predictedRisk = (runningAvg > 0 && runningAvg < 75) ? "High Risk" : (runningAvg > 0 && runningAvg < 78 ? "Moderate Risk" : "Low Risk");

            student.riskTrend = calculateRiskTrend(student.riskLevel, predictedRisk);
            student.gwa = runningAvg;
            student.attendance = rec.attendanceRate;
            student.riskLevel = predictedRisk;
            student.classRecord = rec;
            await student.save();

            updated++;
        }

        await logAuditEvent(
            facultyEmail || "Faculty Instructor",
            "Faculty",
            "BATCH_GRANULAR_CSV_IMPORTED",
            `Imported granular formative assessments for ${updated} students.`,
            `Cohort Batch (${updated} records)`,
            req
        );

        res.json({
            success: true,
            message: `Successfully processed ${updated} student class records!`,
            updatedCount: updated,
            errors
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 📊 18. Alerts & Profile Routes[cite: 18]
app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await Alert.find({ isArchived: { $ne: true } }).sort({ timestamp: -1 });
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: "Could not retrieve alerts." });
    }
});

app.get('/api/faculty/profile/:email', async (req, res) => {
    try {
        const faculty = await User.findOne({ email: req.params.email, role: "faculty" });
        if (!faculty) {
            return res.status(404).json({ success: false, message: "Faculty record not found." });
        }
        if (!faculty.assignedSection || faculty.assignedSection.trim() === "") {
            faculty.assignedSection = "3A";
            await faculty.save();
        }
        res.json({
            success: true,
            facultyName: faculty.adminName || "Faculty Instructor",
            department: faculty.department || "College of Education",
            assignedSection: faculty.assignedSection,
            profilePhoto: faculty.profilePhoto || ""
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/profile/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: "Not found." });
        res.json({
            success: true,
            adminName: user.adminName || "System Administrator",
            username: user.username || "admin",
            email: user.email,
            profilePhoto: user.profilePhoto || ""
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

app.post('/api/admin/update-settings', async (req, res) => {
    try {
        const { email, adminName, username, profilePhoto, currentPassword, newPassword } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        if (newPassword) {
            let isMatch = false;
            if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
                isMatch = await bcrypt.compare(currentPassword, user.password);
            } else {
                isMatch = (user.password === currentPassword);
            }

            if (!isMatch) {
                return res.status(400).json({ success: false, message: "Current password does not match." });
            }
            user.password = await bcrypt.hash(newPassword, 10);
        }

        if (adminName && isValidFullName(adminName)) user.adminName = adminName;
        if (username) user.username = username;
        if (profilePhoto) user.profilePhoto = profilePhoto;

        await user.save();
        await logAuditEvent(email, "Admin", "SETTINGS_UPDATED", "Updated administrator account credentials.", "Admin Account", req);

        res.json({ success: true, message: "Profile saved successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error." });
    }
});

app.post('/api/admin/notify-adviser', async (req, res) => {
    try {
        const { studentNo, studentName, course, section, riskLevel, gwa, attendance, notes, adminEmail } = req.body;
        const recipientKey = `${course}_${section}`.trim();

        await Notification.create({
            recipientRole: 'faculty',
            recipientIdentifier: recipientKey,
            studentNo,
            studentName,
            title: `Academic Risk Alert: ${studentName}`,
            message: `Administrator flagged ${studentName} (${studentNo}) under ${course} ${section} as ${riskLevel}. Current Running GWA: ${gwa}%, Attendance: ${attendance}%. Protocol: ${notes || "Immediate advising requested."}`,
            riskLevel,
            finalGwa: gwa,
            attendance: attendance,
            adviserNotified: true
        });

        await Alert.findOneAndUpdate({ studentNo }, { interventionStatus: "Under Intervention" }, { returnDocument: 'after' });

        await logAuditEvent(
            adminEmail || "Administrator",
            "Admin",
            "ADVISER_ALERT_DISPATCHED",
            `Dispatched advisory notice for ${studentName} to ${course} ${section}.`,
            studentNo,
            req
        );

        res.json({ success: true, message: "Adviser notified successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/faculty/notifications', async (req, res) => {
    try {
        const { course, section } = req.query;
        let query = { recipientRole: 'faculty' };
        if (course && section) {
            query.recipientIdentifier = `${course.trim()}_${section.trim()}`;
        }
        const notifs = await Notification.find(query).sort({ timestamp: -1 });
        res.json({ success: true, notifications: notifs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/student/notifications/:email', async (req, res) => {
    try {
        const notifs = await Notification.find({
            recipientRole: 'student',
            recipientIdentifier: req.params.email
        }).sort({ timestamp: -1 });
        res.json({ success: true, notifications: notifs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/alerts/:studentNo/notes', async (req, res) => {
    try {
        const { author, role, note } = req.body;
        if (!note || !note.trim()) return res.status(400).json({ success: false, message: "Note text is required." });

        const alertRecord = await Alert.findOne({ studentNo: req.params.studentNo });
        if (!alertRecord) return res.status(404).json({ success: false, message: "Student record not found." });

        if (!alertRecord.counselingNotes) alertRecord.counselingNotes = [];
        alertRecord.counselingNotes.unshift({
            author: author || "Adviser",
            role: role || "Admin",
            note: note.trim(),
            timestamp: new Date()
        });

        if (alertRecord.interventionStatus === "Pending Action") {
            alertRecord.interventionStatus = "Under Intervention";
        }

        await alertRecord.save();
        res.json({ success: true, message: "Note logged!", notes: alertRecord.counselingNotes, status: alertRecord.interventionStatus });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.patch('/api/alerts/:id/status', async (req, res) => {
    try {
        const updatedAlert = await Alert.findByIdAndUpdate(
            req.params.id,
            { interventionStatus: req.body.status },
            { returnDocument: 'after' }
        );
        res.json({ success: true, message: "Status updated.", alert: updatedAlert });
    } catch (error) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 🎲 POPULATE REALISTIC FORMATIVE DUMMY DATA FOR ALL STUDENTS[cite: 18]
app.post('/api/admin/seed-granular-records', async (req, res) => {
    try {
        const students = await Alert.find({ isArchived: { $ne: true } });
        let updatedCount = 0;

        for (const s of students) {
            const isHighRisk = s.riskLevel === "High Risk" || (s.gwa > 0 && s.gwa < 75);
            const isModRisk = s.riskLevel === "Moderate Risk" || (s.gwa >= 75 && s.gwa < 78);

            let q1, q2, q3, q4, a1, a2, a3, a4, p1, mid, att;

            if (isHighRisk) {
                q1 = { score: Math.floor(Math.random() * 4) + 4, total: 20, title: "Quiz 1" };
                q2 = { score: Math.floor(Math.random() * 4) + 5, total: 20, title: "Quiz 2" };
                q3 = { score: Math.floor(Math.random() * 5) + 6, total: 25, title: "Quiz 3" };
                q4 = { score: Math.floor(Math.random() * 6) + 7, total: 30, title: "Quiz 4" };
                a1 = { score: Math.floor(Math.random() * 8) + 24, total: 50, title: "Activity 1" };
                a2 = { score: Math.floor(Math.random() * 8) + 25, total: 50, title: "Activity 2" };
                a3 = { score: Math.floor(Math.random() * 8) + 23, total: 50, title: "Activity 3" };
                a4 = null;
                p1 = { score: Math.floor(Math.random() * 10) + 62, total: 100, title: "Project 1" };
                mid = { score: Math.floor(Math.random() * 10) + 60, total: 100, term: "Midterm Exam" };
                att = Math.floor(Math.random() * 10) + 65;
            } else if (isModRisk) {
                q1 = { score: Math.floor(Math.random() * 3) + 14, total: 20, title: "Quiz 1" };
                q2 = { score: Math.floor(Math.random() * 3) + 13, total: 20, title: "Quiz 2" };
                q3 = { score: Math.floor(Math.random() * 4) + 17, total: 25, title: "Quiz 3" };
                q4 = { score: Math.floor(Math.random() * 4) + 21, total: 30, title: "Quiz 4" };
                a1 = { score: Math.floor(Math.random() * 5) + 37, total: 50, title: "Activity 1" };
                a2 = { score: Math.floor(Math.random() * 5) + 38, total: 50, title: "Activity 2" };
                a3 = { score: Math.floor(Math.random() * 5) + 36, total: 50, title: "Activity 3" };
                a4 = null;
                p1 = { score: Math.floor(Math.random() * 5) + 76, total: 100, title: "Project 1" };
                mid = { score: Math.floor(Math.random() * 5) + 75, total: 100, term: "Midterm Exam" };
                att = Math.floor(Math.random() * 8) + 78;
            } else {
                q1 = { score: Math.floor(Math.random() * 3) + 17, total: 20, title: "Quiz 1" };
                q2 = { score: Math.floor(Math.random() * 3) + 18, total: 20, title: "Quiz 2" };
                q3 = { score: Math.floor(Math.random() * 3) + 22, total: 25, title: "Quiz 3" };
                q4 = { score: Math.floor(Math.random() * 3) + 26, total: 30, title: "Quiz 4" };
                a1 = { score: Math.floor(Math.random() * 5) + 44, total: 50, title: "Activity 1" };
                a2 = { score: Math.floor(Math.random() * 5) + 45, total: 50, title: "Activity 2" };
                a3 = { score: Math.floor(Math.random() * 4) + 46, total: 50, title: "Activity 3" };
                a4 = null;
                p1 = { score: Math.floor(Math.random() * 8) + 88, total: 100, title: "Project 1" };
                mid = { score: Math.floor(Math.random() * 8) + 86, total: 100, term: "Midterm Exam" };
                att = Math.floor(Math.random() * 10) + 89;
            }

            const quizzes = [q1, q2, q3, q4].filter(Boolean);
            const activities = [a1, a2, a3, a4].filter(Boolean);
            const projects = [p1].filter(Boolean);
            const exams = [mid].filter(Boolean);

            const rec = {
                quizzes,
                activities,
                projects,
                exams,
                attendanceRate: att
            };

            const weights = { quiz: 20, act: 20, proj: 20, exam: 30, att: 10 };
            const runningAvg = computeRunningAverage(rec, weights);
            rec.runningAverage = runningAvg;

            let risk = (runningAvg < 75 || att < 75) ? "High Risk" : (runningAvg < 78 ? "Moderate Risk" : "Low Risk");

            s.gwa = runningAvg;
            s.attendance = att;
            s.riskLevel = risk;
            s.accountStatus = "Active";
            s.hasCompletedSurvey = true;
            s.classRecord = rec;
            await s.save();
            updatedCount++;
        }

        await logAuditEvent("System Administrator", "Admin", "DUMMY_CLASS_RECORDS_SEEDED", `Generated itemized formative scores, attendance, and running averages for ${updatedCount} students.`, "Cohort Roster", req);

        res.json({
            success: true,
            message: `Successfully generated realistic dummy grade records and attendance for ${updatedCount} students!`
        });
    } catch (err) {
        console.error("Dummy seeder error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Web Server running live at http://localhost:${PORT}`);
    console.log(`📡 Connected to ML Brain at ${FASTAPI_URL}`);
});