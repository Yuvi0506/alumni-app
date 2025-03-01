const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect('mongodb+srv://alum:Password@cluster0.y22vf.mongodb.net/alumniDB?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Alumni Schema
const alumniSchema = new mongoose.Schema({
    name: { type: String, required: true },
    location: { type: String, required: true },
    institute: { type: String, required: true },
    course: { type: String, required: true },
    batchYear: { type: String, required: true },
    currentOrg: { type: String, required: true },
    currentPosition: { type: String, required: true },
    pastExperience: { type: String, default: "None" },
    linkedin: { type: String, default: "Not provided" },
    mobile: { type: String, required: true },
    otherDetails: { type: String, default: "None" }
});

const Alumni = mongoose.model('Alumni', alumniSchema);

// Hardcoded credentials (server-side, secure)
const credentials = {
    admin: { username: "admin", password: "edit2025", role: "admin" },
    user: { username: "user", password: "view2025", role: "user" }
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    let valid = false;
    let role = null;

    for (let key in credentials) {
        if (credentials[key].username === username && credentials[key].password === password) {
            valid = true;
            role = credentials[key].role;
            break;
        }
    }

    res.json({ success: valid, role });
});

// Get alumni data with pagination
app.get('/alumni', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    try {
        const alumni = await Alumni.find().skip(skip).limit(limit);
        const total = await Alumni.countDocuments();
        res.json({
            alumni,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Add alumni (admin only)
app.post('/alumni', async (req, res) => {
    const { name, location, institute, course, batchYear, currentOrg, currentPosition, pastExperience, linkedin, mobile, otherDetails, role } = req.body;
    if (role !== 'admin') {
        return res.status(403).json({ success: false, message: "Admin access required" });
    }
    if (name && location && institute && course && batchYear && currentOrg && currentPosition && mobile) {
        const newAlumni = new Alumni({
            name, location, institute, course, batchYear,
            currentOrg, currentPosition, pastExperience, linkedin, mobile, otherDetails
        });
        await newAlumni.save();
        const alumni = await Alumni.find();
        res.json({ success: true, alumni });
    } else {
        res.status(400).json({ success: false, message: "Required fields missing" });
    }
});

// Update alumni (admin only)
app.put('/alumni/:id', async (req, res) => {
    const { role, ...updates } = req.body;
    if (role !== 'admin') {
        return res.status(403).json({ success: false, message: "Admin access required" });
    }
    try {
        const alumni = await Alumni.findByIdAndUpdate(req.params.id, updates, { new: true });
        if (alumni) {
            const allAlumni = await Alumni.find();
            res.json({ success: true, alumni: allAlumni });
        } else {
            res.status(404).json({ success: false, message: "Alumni not found" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Delete alumni (admin only)
app.delete('/alumni/:id', async (req, res) => {
    const { role } = req.body;
    if (role !== 'admin') {
        return res.status(403).json({ success: false, message: "Admin access required" });
    }
    try {
        const result = await Alumni.findByIdAndDelete(req.params.id);
        if (result) {
            const alumni = await Alumni.find();
            res.json({ success: true, alumni });
        } else {
            res.status(404).json({ success: false, message: "Alumni not found" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
