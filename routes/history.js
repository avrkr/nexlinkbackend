const express = require('express');
const router = express.Router();
const History = require('../models/History');
const { protect } = require('../middleware/auth');

// @route   GET /api/history
router.get('/', protect, async (req, res) => {
    try {
        const { search, baseUrl } = req.query;
        const query = { userId: req.user._id };

        if (baseUrl) {
            query['request.baseUrl'] = baseUrl;
        }

        if (search) {
            query['$or'] = [
                { 'request.url': { $regex: search, $options: 'i' } },
                { 'request.method': { $regex: search, $options: 'i' } }
            ];
        }

        const history = await History.find(query).sort({ timestamp: -1 }).limit(100);
        res.json(history);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/history/urls
router.get('/urls', protect, async (req, res) => {
    try {
        const urls = await History.distinct('request.baseUrl', { userId: req.user._id });
        res.json(urls);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   DELETE /api/history/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        const history = await History.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!history) return res.status(404).json({ message: 'History item not found' });
        res.json({ message: 'History item deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
