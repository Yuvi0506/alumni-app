const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

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

// User schema for signup
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' }, // Default role for new users
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String }
});

const User = mongoose.model('User', userSchema);

// Nodemailer setup (using Gmail for demo; replace with your email service in production)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail email (set in .env)
        pass: process.env.EMAIL_PASS  // Your Gmail app password (set in .env)
    }
});

module.exports = async (req, res) => {
    if (!process.env.MONGO_URI) {
        return res.status(500).json({ success: false, message: "MONGO_URI not set" });
    }

    if (req.method === 'POST') {
        const { email, password, name, action } = req.body;

        if (action === 'signup') {
            // Handle user signup
            try {
                // Check if user already exists
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ success: false, message: "Email already exists" });
                }

                // Generate verification token
                const verificationToken = crypto.randomBytes(32).toString('hex');

                // Create new user
                const newUser = new User({
                    email,
                    name,
                    password, // In production, hash the password using bcrypt
                    verificationToken
                });
                await newUser.save();

                // Send verification email
                const verificationLink = `${req.headers.origin}/verify-email?token=${verificationToken}&email=${email}`;
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Verify Your Email - Loyola Alumni Network',
                    html: `
                        <h3>Welcome to Loyola Alumni Network, ${name}!</h3>
                        <p>Please verify your email by clicking the link below:</p>
                        <a href="${verificationLink}">Verify Email</a>
                        <p>If you did not sign up, please ignore this email.</p>
                    `
                };
                await transporter.sendMail(mailOptions);

                res.status(200).json({ success: true, message: "Signup successful. Please check your email to verify." });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error during signup" });
            }
        } else if (action === 'verify') {
            // Handle email verification
            const { email, token } = req.body;
            try {
                const user = await User.findOne({ email, verificationToken: token });
                if (!user) {
                    return res.status(400).json({ success: false, message: "Invalid verification token" });
                }

                user.isVerified = true;
                user.verificationToken = undefined;
                await user.save();

                res.status(200).json({ success: true, message: "Email verified successfully" });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error during verification" });
            }
        } else {
            // Handle login
            try {
                const user = await User.findOne({ email });
                if (!user) {
                    return res.status(401).json({ success: false, message: "Invalid credentials" });
                }

                if (!user.isVerified) {
                    return res.status(403).json({ success: false, message: "Please verify your email before logging in" });
                }

                if (user.password !== password) { // In production, compare hashed passwords
                    return res.status(401).json({ success: false, message: "Invalid credentials" });
                }

                // Check for admin credentials separately (for existing admin logic)
                if (email === "admin" && password === "edit2025") {
                    user.role = 'admin';
                } else if (email === "user" && password === "view2025") {
                    user.role = 'user';
                }

                res.status(200).json({ success: true, role: user.role, email: user.email, name: user.name });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error during login" });
            }
        }
    }
};
