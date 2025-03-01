const mongoose = require('mongoose');

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'));

const credentials = {
    admin: { username: "admin", password: "edit2025", role: "admin" },
    user: { username: "user", password: "view2025", role: "user" }
};

module.exports = async (req, res) => {
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

    res.status(200).json({ success: valid, role });
};
