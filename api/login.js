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

// Verify email transport configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('Email transport verification failed:', error);
    } else {
        console.log('Email transport is ready to send messages');
    }
});

// Password hashing and verification using crypto
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function comparePassword(password, hashedPassword) {
    return hashPassword(password) === hashedPassword;
}

module.exports = async (req, res) => {
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI not set');
        return res.status(500).json({ success: false, message: "MONGO_URI not set" });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('Email credentials missing: EMAIL_USER or EMAIL_PASS not set');
        return res.status(500).json({ success: false, message: "Email credentials missing" });
    }

    if (req.method === 'POST') {
        let { email, password, name, action, token, newPassword } = req.body;

        // Convert email to lowercase for case-insensitive handling
        if (email) email = email.toLowerCase();

        if (action === 'signup') {
            try {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    console.log(`Signup failed: Email ${email} already exists`);
                    return res.status(400).json({ success: false, message: "Email already exists" });
                }

                const verificationToken = crypto.randomBytes(32).toString('hex');
                const hashedPassword = hashPassword(password);

                const newUser = new User({
                    email,
                    name,
                    password: hashedPassword,
                    verificationToken
                });
                await newUser.save();
                console.log(`User ${email} successfully added to database`);

                // Attempt to send verification email using nodemailer
                let emailSent = false;
                const verificationLink = `${req.headers.origin}/html/verify-email.html?token=${verificationToken}&email=${encodeURIComponent(email)}`;
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

                console.log(`Attempting to send verification email to ${email}...`);
                try {
                    const info = await transporter.sendMail(mailOptions);
                    console.log(`Verification email sent to ${email}:`, info.response);
                    emailSent = true;
                } catch (emailErr) {
                    console.error(`Failed to send verification email to ${email}:`, emailErr);
                }

                if (emailSent) {
                    res.status(200).json({ success: true, message: "Signup successful. Please check your email to verify." });
                } else {
                    res.status(200).json({
                        success: true,
                        message: "Signup successful, but failed to send verification email. Please use the 'Resend Verification Email' option on the login page."
                    });
                }
            } catch (err) {
                console.error('Signup error:', err);
                res.status(500).json({ success: false, message: "Server error during signup" });
            }
        } else if (action === 'verify') {
            try {
                console.log(`Verification request received for email: ${email}, token: ${token}`);

                // Find user by email and verification token
                const user = await User.findOne({ email, verificationToken: token });
                if (!user) {
                    console.log(`Verification failed: Invalid token or email - email: ${email}, token: ${token}`);
                    return res.status(400).json({ success: false, message: "Invalid verification token or email" });
                }

                console.log(`User found for verification: ${email}`);

                // Update user verification status
                user.isVerified = true;
                user.verificationToken = undefined;
                await user.save();
                console.log(`Email ${email} verified successfully`);

                res.status(200).json({ success: true, message: "Email verified successfully" });
            } catch (err) {
                console.error('Verification error:', err);
                res.status(500).json({ success: false, message: "Server error during verification" });
            }
        } else if (action === 'forgot-password') {
            try {
                const user = await User.findOne({ email });
                if (!user) {
                    console.log(`Forgot password failed: User not found for email ${email}`);
                    return res.status(404).json({ success: false, message: "User not found" });
                }

                const resetToken = crypto.randomBytes(32).toString('hex');
                user.resetToken = resetToken;
                user.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry
                await user.save();
                console.log(`Reset token generated for ${email}: ${resetToken}`);

                const resetLink = `${req.headers.origin}/html/reset-password.html?token=${resetToken}&email=${email}`;
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

                console.log(`Attempting to send password reset email to ${email}...`);
                try {
                    const info = await transporter.sendMail(mailOptions);
                    console.log(`Password reset email sent to ${email}:`, info.response);
                    res.status(200).json({ success: true, message: "Password reset link sent to your email." });
                } catch (emailErr) {
                    console.error(`Failed to send password reset email to ${email}:`, emailErr);
                    res.status(500).json({ success: false, message: `Failed to send password reset email: ${emailErr.message}` });
                }
            } catch (err) {
                console.error('Forgot password error:', err);
                res.status(500).json({ success: false, message: "Server error during forgot password request" });
            }
        } else if (action === 'reset-password') {
            try {
                const user = await User.findOne({
                    email,
                    resetToken: token,
                    resetTokenExpiry: { $gt: Date.now() }
                });
                if (!user) {
                    console.log(`Password reset failed: Invalid or expired token for email ${email}`);
                    return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
                }

                const hashedPassword = hashPassword(newPassword);
                user.password = hashedPassword;
                user.resetToken = undefined;
                user.resetTokenExpiry = undefined;
                await user.save();
                console.log(`Password reset successfully for ${email}`);

                res.status(200).json({ success: true, message: "Password reset successfully" });
            } catch (err) {
                console.error('Password reset error:', err);
                res.status(500).json({ success: false, message: "Server error during password reset" });
            }
        } else if (action === 'resend-verification') {
            try {
                const user = await User.findOne({ email });
                if (!user) {
                    console.log(`Resend verification failed: User not found for email ${email}`);
                    return res.status(404).json({ success: false, message: "User not found" });
                }
                if (user.isVerified) {
                    console.log(`Resend verification failed: Email ${email} already verified`);
                    return res.status(400).json({ success: false, message: "Email already verified" });
                }

                const verificationToken = crypto.randomBytes(32).toString('hex');
                user.verificationToken = verificationToken;
                await user.save();
                console.log(`New verification token generated for ${email}`);

                const verificationLink = `${req.headers.origin}/html/verify-email.html?token=${verificationToken}&email=${email}`;
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

                console.log(`Attempting to resend verification email to ${email}...`);
                try {
                    const info = await transporter.sendMail(mailOptions);
                    console.log(`Verification email resent to ${email}:`, info.response);
                    res.status(200).json({ success: true, message: "Verification email resent. Please check your inbox." });
                } catch (emailErr) {
                    console.error(`Failed to resend verification email to ${email}:`, emailErr);
                    res.status(500).json({ success: false, message: `Failed to resend verification email: ${emailErr.message}` });
                }
            } catch (err) {
                console.error('Resend verification error:', err);
                res.status(500).json({ success: false, message: "Server error during resend verification" });
            }
        } else {
            try {
                const user = await User.findOne({ email });
                if (!user) {
                    console.log(`Login failed: User not found for email ${email}`);
                    return res.status(401).json({ success: false, message: "Invalid credentials" });
                }

                if (!user.isVerified) {
                    console.log(`Login failed: Email ${email} not verified`);
                    return res.status(403).json({ success: false, message: "Please verify your email before logging in" });
                }

                const isPasswordValid = comparePassword(password, user.password);
                if (!isPasswordValid) {
                    console.log(`Login failed: Incorrect password for email ${email}`);
                    return res.status(401).json({ success: false, message: "Invalid credentials" });
                }

                if (email === "admin" && password === "edit2025") {
                    user.role = 'admin';
                    console.log(`Admin login successful for ${email}`);
                } else if (email === "user" && password === "view2025") {
                    user.role = 'user';
                    console.log(`User login successful for ${email}`);
                } else {
                    console.log(`Regular user login successful for ${email}`);
                }

                res.status(200).json({ success: true, role: user.role, email: user.email, name: user.name });
            } catch (err) {
                console.error('Login error:', err);
                res.status(500).json({ success: false, message: "Server error during login" });
            }
        }
    }
};
