const mongoose = require('mongoose');

const variableSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    key: {
        type: String,
        required: true,
        trim: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    source: {
        type: String, // 'manual' or 'response'
        default: 'manual'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure unique keys per user
variableSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Variable', variableSchema);
