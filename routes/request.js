const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const History = require('../models/History');
const Variable = require('../models/Variable');

// Helper to resolve variables in a string or object
const resolveVariables = (data, variables) => {
    if (typeof data === 'string') {
        return data.replace(/\{\{(.*?)\}\}/g, (match, key) => {
            return variables[key.trim()] !== undefined ? variables[key.trim()] : match;
        });
    } else if (Array.isArray(data)) {
        return data.map(item => resolveVariables(item, variables));
    } else if (typeof data === 'object' && data !== null) {
        const resolved = {};
        for (const key in data) {
            resolved[key] = resolveVariables(data[key], variables);
        }
        return resolved;
    }
    return data;
};

// @route   POST /api/request/send
router.post('/send', protect, async (req, res) => {
    const startTime = Date.now();
    try {
        const { method, url, headers, params, body, auth } = req.body;

        // Fetch user variables
        const dbVariables = await Variable.find({ userId: req.user._id });
        const variablesMap = {};
        dbVariables.forEach(v => {
            variablesMap[v.key] = v.value;
        });

        // Resolve variables in URL, headers, params, and body
        const resolvedUrl = resolveVariables(url, variablesMap);
        const resolvedHeaders = resolveVariables(headers || {}, variablesMap);
        const resolvedParams = resolveVariables(params || {}, variablesMap);
        const resolvedBody = resolveVariables(body || {}, variablesMap);

        // Prepare Axios config
        const config = {
            method,
            url: resolvedUrl,
            headers: { ...resolvedHeaders },
            params: resolvedParams,
            data: resolvedBody,
            validateStatus: () => true, // Don't throw error on non-2xx status
            timeout: 30000
        };

        // Handle Auth
        if (auth) {
            if (auth.type === 'bearer' && auth.token) {
                config.headers['Authorization'] = `Bearer ${resolveVariables(auth.token, variablesMap)}`;
            } else if (auth.type === 'basic' && auth.username && auth.password) {
                const username = resolveVariables(auth.username, variablesMap);
                const password = resolveVariables(auth.password, variablesMap);
                const creds = Buffer.from(`${username}:${password}`).toString('base64');
                config.headers['Authorization'] = `Basic ${creds}`;
            } else if (auth.type === 'apiKey' && auth.key && auth.value) {
                const key = resolveVariables(auth.key, variablesMap);
                const value = resolveVariables(auth.value, variablesMap);
                if (auth.addTo === 'header') {
                    config.headers[key] = value;
                } else {
                    config.params[key] = value;
                }
            }
        }

        const response = await axios(config);
        const responseTime = Date.now() - startTime;

        // Save to history
        const baseUrl = new URL(resolvedUrl).origin;
        const historyItem = await History.create({
            userId: req.user._id,
            request: {
                method,
                url: resolvedUrl,
                baseUrl,
                headers: resolvedHeaders,
                params: resolvedParams,
                body: resolvedBody,
                auth
            },
            response: {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data,
                responseTime,
                size: JSON.stringify(response.data).length
            }
        });

        res.json({
            historyId: historyItem._id,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            responseTime,
            size: JSON.stringify(response.data).length
        });

    } catch (err) {
        const responseTime = Date.now() - startTime;
        res.status(500).json({
            message: 'Failed to execute request',
            error: err.message,
            responseTime
        });
    }
});

module.exports = router;
