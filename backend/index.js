const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json());

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend bridge is running', port: PORT });
});

// ─── GET LIVE TRAIN STATUS ───────────────────────────────────────────────────
app.get('/api/train/:trainNo', async (req, res) => {
    const { trainNo } = req.params;

    if (!/^\d{5}$/.test(trainNo)) {
        return res.status(400).json({ error: 'Invalid train number. Must be 5 digits.' });
    }

    try {
        const response = await axios.get(`${SCRAPER_URL}/train/${trainNo}`, { timeout: 15000 });
        const data = response.data;

        const stations = (data.events || []).map((stop, index) => ({
            index,
            name: stop.station || 'Unknown Station',
            code: stop.code || '???',
            arrivalTime: stop.arrival || 'N/A',
            departureTime: stop.departure || 'N/A',
            delay: stop.delay || '00:00',
            latitude: parseFloat(stop.lat) || null,
            longitude: parseFloat(stop.lon) || null,
            status: stop.type || null,
        }));

        res.json({
            success: true,
            trainNumber: data.train_number || trainNo,
            trainName: data.train_name || `Train ${trainNo}`,
            lastUpdated: data.last_update || new Date().toISOString(),
            stations,
        });

    } catch (error) {
        console.error(`Error fetching train ${trainNo}:`, error.message);

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                error: 'Python TrainTrack scraper is offline. Start it on port 8000.',
                fallback: true,
            });
        }

        if (error.response?.status === 404) {
            return res.status(404).json({ success: false, error: `Train ${trainNo} not found.` });
        }

        res.status(500).json({ success: false, error: 'Failed to fetch train data.' });
    }
});

// ─── DEMO MODE: Return mock data for testing without Python service ───────────
app.get('/api/demo/:trainNo', (req, res) => {
    const { trainNo } = req.params;
    const mockStations = generateMockRoute(trainNo);
    res.json({
        success: true,
        trainNumber: trainNo,
        trainName: `Chennai Kanyakumari Cape Express (${trainNo})`,
        lastUpdated: new Date().toISOString(),
        stations: mockStations,
        isDemo: true,
    });
});

function generateMockRoute(trainNo) {
    // Real Indian train route: Chennai → Kanyakumari (Train 12661 Cape Express)
    const route = [
        { name: 'Chennai Central',     code: 'MAS',  lat: 13.0827, lon: 80.2707, arr: 'Origin', dep: '07:10' },
        { name: 'Chengalpattu',        code: 'CGL',  lat: 12.6921, lon: 79.9765, arr: '08:18', dep: '08:20' },
        { name: 'Villupuram Junction', code: 'VM',   lat: 11.9393, lon: 79.4924, arr: '09:48', dep: '09:53' },
        { name: 'Cuddalore Port',      code: 'CUPJ', lat: 11.7447, lon: 79.7678, arr: '10:22', dep: '10:24' },
        { name: 'Chidambaram',         code: 'CDM',  lat: 11.3993, lon: 79.6934, arr: '11:05', dep: '11:07' },
        { name: 'Mayiladuthurai Jn',   code: 'MV',   lat: 11.1034, lon: 79.6508, arr: '11:55', dep: '12:00' },
        { name: 'Thanjavur Junction',  code: 'TJ',   lat: 10.7870, lon: 79.1378, arr: '13:00', dep: '13:05' },
        { name: 'Trichy Junction',     code: 'TPJ',  lat: 10.8155, lon: 78.6877, arr: '14:05', dep: '14:15' },
        { name: 'Dindigul Junction',   code: 'DG',   lat: 10.3673, lon: 77.9803, arr: '15:18', dep: '15:20' },
        { name: 'Madurai Junction',    code: 'MDU',  lat: 9.9252,  lon: 78.1198, arr: '16:30', dep: '16:40' },
        { name: 'Virudhunagar Jn',     code: 'VPT',  lat: 9.5810,  lon: 77.9624, arr: '17:28', dep: '17:30' },
        { name: 'Tirunelveli Jn',      code: 'TEN',  lat: 8.7139,  lon: 77.7567, arr: '18:55', dep: '19:00' },
        { name: 'Nagercoil Junction',  code: 'NCJ',  lat: 8.1833,  lon: 77.4119, arr: '19:55', dep: '20:00' },
        { name: 'Kanyakumari',         code: 'CAPE', lat: 8.0883,  lon: 77.5385, arr: '20:30', dep: 'Terminus' },
    ];

    return route.map((s, index) => ({
        index,
        name: s.name,
        code: s.code,
        arrivalTime: s.arr,
        departureTime: s.dep,
        delay: '00:00',
        latitude: s.lat,
        longitude: s.lon,
        status: null,
    }));
}

app.listen(PORT, () => {
    console.log(`🚀 Backend bridge running on http://localhost:${PORT}`);
    console.log(`📡 Connecting to TrainTrack scraper at ${SCRAPER_URL}`);
});
