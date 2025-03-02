const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
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
    role: { type: String, default: 'user' },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date }
});

const User = mongoose.model('User', userSchema);

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

module.exports = async (req, res) => {
    if (!process.env.MONGO_URI) {
        return res.status(500).json({ success: false, message: "MONGO_URI not set" });
    }

    if (req.method === 'POST') {
        const { email, password, name, action, token, newPassword } = req.body;

        if (action === 'signup') {
            // Handle user signup
            try {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ success: false, message: "Email already exists" });
                }

                const verificationToken = crypto.randomBytes(32).toString('hex');
                const hashedPassword = await bcrypt.hash(password, 10);

                const newUser = new User({
                    email,
                    name,
                    password: hashedPassword,
                    verificationToken
                });
                await newUser.save();

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
        } else if (action === 'forgot-password') {
            // Handle forgot password request
            try {
                const user = await User.findOne({ email });
                if (!user) {
                    return res.status(404).json({ success: false, message: "User not found" });
                }

                const resetToken = crypto.randomBytes(32).toString('hex');
                user.resetToken = resetToken;
                user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
                await user.save();

                const resetLink = `${req.headers.origin}/reset-password?token=${resetToken}&email=${email}`;
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Reset Your Password - Loyola Alumni Network',
                    html: `
                        <h3>Password Reset Request</h3>
                        <p>You requested to reset your password. Click the link below to set a new password:</p>
                        <a href="${resetLink}">Reset Password</a>
                        <p>This link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
                    `
                };
                await transporter.sendMail(mailOptions);

                res.status(200).json({ success: true, message: "Password reset link sent to your email." });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error during forgot password request" });
            }
        } else if (action === 'reset-password') {
            // Handle password reset
            try {
                const user = await User.findOne({
                    email,
                    resetToken: token,
                    resetTokenExpiry: { $gt: Date.now() }
                });
                if (!user) {
                    return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
                }

                const hashedPassword = await bcrypt.hash(newPassword, 10);
                user.password = hashedPassword;
                user.resetToken = undefined;
                user.resetTokenExpiry = undefined;
                await user.save();

                res.status(200).json({ success: true, message: "Password reset successfully" });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error during password reset" });
            }
        } else if (action === 'resend-verification') {
            // Handle resend verification email
            try {
                const user = await User.findOne({ email });
                if (!user) {
                    return res.status(404).json({ success: false, message: "User not found" });
                }
                if (user.isVerified) {
                    return res.status(400).json({ success: false, message: "Email already verified" });
                }

                const verificationToken = crypto.randomBytes(32).toString('hex');
                user.verificationToken = verificationToken;
                await user.save();

                const verificationLink = `${req.headers.origin}/verify-email?token=${verificationToken}&email=${email}`;
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Verify Your Email - Loyola Alumni Network',
                    html: `
                        <h3>Welcome to Loyola Alumni Network, ${user.name}!</h3>
                        <p>Please verify your email by clicking the link below:</p>
                        <a href="${verificationLink}">Verify Email</a>
                        <p>If you did not sign up, please ignore this email.</p>
                    `
                };
                await transporter.sendMail(mailOptions);

                res.status(200).json({ success: true, message: "Verification email resent. Please check your inbox." });
            } catch (err) {
                res.status(500).json({ success: false, message: "Server error during resend verification" });
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

                const isPasswordValid = await bcrypt.compare(password, user.password);
                if (!isPasswordValid) {
                    return res.status(401).json({ success: false, message: "Invalid credentials" });
                }

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
