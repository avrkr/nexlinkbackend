const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    request: {
        method: String,
        url: String,
        endpoint: String,
        baseUrl: String,
        headers: Object,
        params: Object,
        auth: Object,
        body: mongoose.Schema.Types.Mixed
    },
    response: {
        status: Number,
        statusText: String,
        headers: Object,
        data: mongoose.Schema.Types.Mixed,
        responseTime: Number,
        size: Number
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for better search/filter
historySchema.index({ userId: 1, timestamp: -1 });
historySchema.index({ userId: 1, 'request.baseUrl': 1 });

module.exports = mongoose.model('History', historySchema);
