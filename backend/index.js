
import { connectDB } from 'D:\train tracking app\backend\config\db.js';

dotenv.config();
connectDB();

const express = require('express');
const axios = require('axios');
const app = express();

// Your Python service is running on port 8000
const SCRAPER_URL = 'http://localhost:8000';
const dotenv=require('dotenv');
const cors = require('cors');

dotenv.config();
app.use(cors());
app.use(express.json());

app.get('/api/train-alert/:trainNo', async (req, res) => {
    const { trainNo } = req.params;

    try {
        // 1. Call the Python TrainTrack service
        const response = await axios.get(`${SCRAPER_URL}/train/${trainNo}`);

        // 2. Extract the 'events' (arrivals/departures)
        const trainData = response.data;

        // 3. Send the clean JSON back to your React Frontend
        res.json({
            success: true,
            train_number: trainData.train_number,
            stops: trainData.events, // This contains the station names and delay info
            last_update: trainData.last_update
        });

    } catch (error) {
        console.error("Scraper Error:", error.message);
        res.status(502).json({
            success: false,
            message: "Could not connect to the TrainTrack service. Is it running on port 8000?"
        });
    }
});

app.listen(5000, () => console.log('🚀 Backend Bridge running on Port 5000'));
