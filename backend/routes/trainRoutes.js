const express = require('express');
const axios = require('axios');
const router = express.Router();

// The address of your Python TrainTrack microservice
// Make sure you have run: uvicorn app.main:app --port 8000
const PYTHON_SERVICE_URL = 'http://localhost:8000';

/**
 * @route   GET /api/train/:trainNo
 * @desc    Fetch live train status from the Python Microservice
 */
router.get('/:trainNo', async (req, res) => {
    const { trainNo } = req.params;

    // Simple validation for 5-digit train numbers
    if (!/^\d{5}$/.test(trainNo)) {
        return res.status(400).json({ error: "Invalid train number. Must be 5 digits." });
    }

    try {
        // Calling the Python FastAPI scraper
        const response = await axios.get(`${PYTHON_SERVICE_URL}/train/${trainNo}`);

        // TrainTrack returns a JSON with { train_number, events, last_update }
        const { train_number, events, last_update } = response.data;

        // Clean up the data for the frontend
        const formattedData = {
            trainNumber: train_number,
            lastUpdated: last_update,
            stations: events.map(event => ({
                name: event.station,
                code: event.code,
                status: event.type, // "Arrived" or "Departed"
                delay: event.delay,
                // These coordinates are crucial for your geolocation alarm!
                latitude: event.lat || null,
                longitude: event.lon || null
            }))
        };

        res.json(formattedData);

    } catch (error) {
        console.error(`Error fetching train ${trainNo}:`, error.message);

        // Specific error if the Python service isn't running
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                error: "Python Scraper (TrainTrack) is offline. Start it on port 8000."
            });
        }

        res.status(500).json({ error: "Failed to fetch train data." });
    }
});

module.exports = router;
