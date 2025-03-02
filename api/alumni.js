const mongoose = require('mongoose');

// Load environment variables locally
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// Connect to MongoDB (only once)
if (mongoose.connection.readyState === 0) {
    mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
    }).then(() => console.log('Connected to MongoDB'))
      .catch(err => console.error('MongoDB connection error:', err));
}

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
    email: { type: String, required: true },
    otherDetails: { type: String, default: "None" }
});

const Alumni = mongoose.model('Alumni', alumniSchema);

module.exports = async (req, res) => {
    if (!process.env.MONGO_URI) {
        return res.status(500).json({ success: false, message: "MONGO_URI not set" });
    }

    if (req.method === 'GET') {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const search = req.query.search || '';
        const userEmail = req.query.userEmail || '';
        const skip = (page - 1) * limit;

        try {
            const searchQuery = search ? {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { location: { $regex: search, $options: 'i' } },
                    { institute: { $regex: search, $options: 'i' } },
                    { course: { $regex: search, $options: 'i' } },
                    { batchYear: { $regex: search, $options: 'i' } },
                    { currentOrg: { $regex: search, $options: 'i' } },
                    { currentPosition: { $regex: search, $options: 'i' } },
                    { pastExperience: { $regex: search, $options: 'i' } },
                    { linkedin: { $regex: search, $options: 'i' } },
                    { mobile: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } },
                    { otherDetails: { $regex: search, $options: 'i' } }
                ]
            } : {};

            if (userEmail && req.query.action === 'getUserRecord') {
                // Fetch the user's own record for editing
                const userRecord = await Alumni.findOne({ email: userEmail });
                return res.status(200).json({ success: true, userRecord });
            }

            const alumni = await Alumni.find(searchQuery).skip(skip).limit(limit);
            const total = await Alumni.countDocuments(searchQuery);
            res.status(200).json({
                alumni,
                total,
                pages: Math.ceil(total / limit)
            });
        } catch (err) {
            res.status(500).json({ success: false, message: "Server error" });
        }
    } else if (req.method === 'POST') {
        const { name, location, institute, course, batchYear, currentOrg, currentPosition, pastExperience, linkedin, mobile, email, otherDetails, role } = req.body;
        if (role !== 'admin') {
            return res.status(403).json({ success: false, message: "Admin access required to add new alumni" });
        }
        if (name && location && institute && course && batchYear && currentOrg && currentPosition && mobile && email) {
            const newAlumni = new Alumni({
                name, location, institute, course, batchYear,
                currentOrg, currentPosition, pastExperience, linkedin, mobile, email, otherDetails
            });
            await newAlumni.save();
            const alumni = await Alumni.find();
            res.status(200).json({ success: true, alumni });
        } else {
            res.status(400).json({ success: false, message: "Required fields missing" });
        }
    } else if (req.method === 'PUT') {
        const { role, email, ...updates } = req.body;
        const id = req.query.id;

        try {
            const alumni = await Alumni.findById(id);
            if (!alumni) {
                return res.status(404).json({ success: false, message: "Alumni not found" });
            }

            // Admin can edit any record, users can only edit their own record
            if (role === 'admin') {
                await Alumni.findByIdAndUpdate(id, updates, { new: true });
            } else if (role === 'user') {
                if (alumni.email !== email) {
                    return res.status(403).json({ success: false, message: "You can only edit your own record" });
                }
                await Alumni.findByIdAndUpdate(id, updates, { new: true });
            } else {
                return res.status(403).json({ success: false, message: "Unauthorized" });
            }

            const allAlumni = await Alumni.find();
            res.status(200).json({ success: true, alumni: allAlumni });
        } catch (err) {
            res.status(500).json({ success: false, message: "Server error" });
        }
    } else if (req.method === 'DELETE') {
        const { role } = req.body;
        if (role !== 'admin') {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }
        try {
            const result = await Alumni.findByIdAndDelete(req.query.id);
            if (result) {
                const alumni = await Alumni.find();
                res.status(200).json({ success: true, alumni });
            } else {
                res.status(404).json({ success: false, message: "Alumni not found" });
            }
        } catch (err) {
            res.status(500).json({ success: false, message: "Server error" });
        }
    }
};
