const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

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

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        try {
            const alumni = await Alumni.find().skip(skip).limit(limit);
            const total = await Alumni.countDocuments();
            res.status(200).json({
                alumni,
                total,
                pages: Math.ceil(total / limit)
            });
        } catch (err) {
            res.status(500).json({ success: false, message: "Server error" });
        }
    } else if (req.method === 'POST') {
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
            res.status(200).json({ success: true, alumni });
        } else {
            res.status(400).json({ success: false, message: "Required fields missing" });
        }
    } else if (req.method === 'PUT') {
        const { role, ...updates } = req.body;
        if (role !== 'admin') {
            return res.status(403).json({ success: false, message: "Admin access required" });
        }
        try {
            const alumni = await Alumni.findByIdAndUpdate(req.query.id, updates, { new: true });
            if (alumni) {
                const allAlumni = await Alumni.find();
                res.status(200).json({ success: true, alumni: allAlumni });
            } else {
                res.status(404).json({ success: false, message: "Alumni not found" });
            }
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
