const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Variable = require('../models/Variable');
const { protect } = require('../middleware/auth');

// @route   GET /api/variables
router.get('/', protect, async (req, res) => {
    try {
        const variables = await Variable.find({ userId: req.user._id }).sort({ key: 1 });
        res.json(variables);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/variables
router.post('/', protect, async (req, res) => {
    try {
        const { key, value, source } = req.body;

        // Upsert variable
        const variable = await Variable.findOneAndUpdate(
            { userId: req.user._id, key },
            { value, source, updatedAt: Date.now() },
            { new: true, upsert: true }
        );

        res.json(variable);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   DELETE /api/variables/:idOrKey
router.delete('/:idOrKey', protect, async (req, res) => {
    try {
        let variable;
        const { idOrKey } = req.params;

        // Try deleting by ID first if it looks like a MongoDB ID
        if (idOrKey.match(/^[0-9a-fA-F]{24}$/)) {
            variable = await Variable.findOneAndDelete({
                userId: req.user._id,
                _id: new mongoose.Types.ObjectId(idOrKey)
            });
        }

        // If not found by ID (or not an ID), try deleting by Key
        if (!variable) {
            variable = await Variable.findOneAndDelete({
                userId: req.user._id,
                key: idOrKey
            });
        }

        if (!variable) return res.status(404).json({ message: 'Variable not found' });
        res.json({ message: 'Variable deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
