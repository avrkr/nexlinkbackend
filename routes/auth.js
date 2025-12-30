const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/email');
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const verificationToken = crypto.randomBytes(20).toString('hex');
        const user = await User.create({ name, email, password, verificationToken });

        const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
        const html = `
          <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 800;">NexLink</h1>
              <p style="color: #64748b; font-size: 14px;">API Workflow Builder</p>
            </div>
            <h2 style="color: #0f172a; text-align: center; margin-bottom: 20px;">Welcome to NexLink!</h2>
            <p style="color: #475569; line-height: 1.6;">Hello ${name},</p>
            <p style="color: #475569; line-height: 1.6;">Thanks for signing up! Please verify your email address to get started with building your API workflows.</p>
            <div style="text-align: center; margin: 35px 0;">
              <a href="${verifyUrl}" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">Verify Email Address</a>
            </div>
            <p style="color: #64748b; font-size: 14px; text-align: center;">If the button doesn't work, copy and paste this link in your browser:</p>
            <p style="color: #6366f1; font-size: 13px; text-align: center; word-break: break-all;">${verifyUrl}</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;">
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2024 NexLink. All rights reserved.</p>
          </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Verify your NexLink Account',
                html
            });
            res.status(201).json({
                message: 'Signup successful! Please check your email to verify your account.'
            });
        } catch (err) {
            await User.findByIdAndDelete(user._id);
            return res.status(500).json({ message: 'Verification email could not be sent. Please try again.' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/auth/verify-email/:token
router.get('/verify-email/:token', async (req, res) => {
    try {
        const user = await User.findOne({ verificationToken: req.params.token });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully! You can now login.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.status(401).json({ message: 'Please verify your email address before logging in' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins

        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
        <h2 style="color: #6366f1; text-align: center;">NexLink Password Reset</h2>
        <p>You requested a password reset. Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 10 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #e1e1e1; margin: 20px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2024 NexLink. All rights reserved.</p>
      </div>
    `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'NexLink Password Reset',
                html
            });
            res.json({ message: 'Email sent successfully' });
        } catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT /api/auth/reset-password/:resetToken
router.post('/reset-password/:resetToken', async (req, res) => {
    try {
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
