const express = require('express');
const https = require('https');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

app.use(cors());
app.use(express.json());

function generateMockRoute() {
    const route = [
        { name: 'Chennai Central',     code: 'MAS',  lat: 13.0827, lon: 80.2707, arr: 'Origin', dep: '07:10' },
        { name: 'Chengalpattu',        code: 'CGL',  lat: 12.6921, lon: 79.9765, arr: '08:18',  dep: '08:20' },
        { name: 'Villupuram Junction', code: 'VM',   lat: 11.9393, lon: 79.4924, arr: '09:48',  dep: '09:53' },
        { name: 'Cuddalore Port',      code: 'CUPJ', lat: 11.7447, lon: 79.7678, arr: '10:22',  dep: '10:24' },
        { name: 'Chidambaram',         code: 'CDM',  lat: 11.3993, lon: 79.6934, arr: '11:05',  dep: '11:07' },
        { name: 'Mayiladuthurai Jn',   code: 'MV',   lat: 11.1034, lon: 79.6508, arr: '11:55',  dep: '12:00' },
        { name: 'Thanjavur Junction',  code: 'TJ',   lat: 10.7870, lon: 79.1378, arr: '13:00',  dep: '13:05' },
        { name: 'Trichy Junction',     code: 'TPJ',  lat: 10.8155, lon: 78.6877, arr: '14:05',  dep: '14:15' },
        { name: 'Dindigul Junction',   code: 'DG',   lat: 10.3673, lon: 77.9803, arr: '15:18',  dep: '15:20' },
        { name: 'Madurai Junction',    code: 'MDU',  lat: 9.9252,  lon: 78.1198, arr: '16:30',  dep: '16:40' },
        { name: 'Virudhunagar Jn',     code: 'VPT',  lat: 9.5810,  lon: 77.9624, arr: '17:28',  dep: '17:30' },
        { name: 'Tirunelveli Jn',      code: 'TEN',  lat: 8.7139,  lon: 77.7567, arr: '18:55',  dep: '19:00' },
        { name: 'Nagercoil Junction',  code: 'NCJ',  lat: 8.1833,  lon: 77.4119, arr: '19:55',  dep: '20:00' },
        { name: 'Kanyakumari',         code: 'CAPE', lat: 8.0883,  lon: 77.5385, arr: '20:30',  dep: 'Terminus' },
    ];

    return route.map((s, i) => ({
        index: i,
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

function fetchLiveTrainStatus(trainNo, startDay = 0) {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            hostname: 'irctc-train-api.p.rapidapi.com',
            port: null,
            path: `/api/v1/live-train-status?trainNo=${trainNo}&startDay=${startDay}`,
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': 'irctc-train-api.p.rapidapi.com',
            },
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                try {
                    const body = Buffer.concat(chunks).toString();
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    reject(new Error('Failed to parse RapidAPI response'));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

app.get('/api/health', (req, res) => {
    res.json({
        status: 'Backend running',
        rapidapi: RAPIDAPI_KEY ? 'configured' : 'missing',
    });
});

app.get('/api/demo/:trainNo', (req, res) => {
    const stations = generateMockRoute();
    res.json({
        success: true,
        trainNumber: req.params.trainNo,
        trainName: 'Chennai Kanyakumari Cape Express',
        lastUpdated: new Date().toISOString(),
        isDemo: true,
        stations: stations,
    });
});

app.get('/api/train/:trainNo', async (req, res) => {
    const { trainNo } = req.params;

    if (!/^\d{5}$/.test(trainNo)) {
        return res.status(400).json({ success: false, error: 'Train number must be 5 digits.' });
    }

    if (!RAPIDAPI_KEY) {
        return res.status(503).json({ success: false, error: 'No RapidAPI key configured.' });
    }

    try {
        const { status, data } = await fetchLiveTrainStatus(trainNo);
        console.log('Raw RapidAPI response:', JSON.stringify(data, null, 2));

        const stops = data?.data?.stations || data?.data?.stationList || data?.stations || data?.stationList || [];

        if (!stops.length) {
            return res.status(404).json({ success: false, error: `No data for train ${trainNo}.`, raw: data });
        }

        res.json({
            success: true,
            trainNumber: trainNo,
            trainName: data?.data?.trainName || `Train ${trainNo}`,
            lastUpdated: new Date().toISOString(),
            stations: stops.map((s, i) => ({
                index: i,
                name: s.stationName || s.stnName || 'Unknown',
                code: s.stationCode || s.stnCode || '???',
                arrivalTime: s.arrivalTime || s.schArrival || 'N/A',
                departureTime: s.departureTime || s.schDeparture || 'N/A',
                delay: s.delayInArrival || '0',
                latitude: parseFloat(s.lat || s.latitude) || null,
                longitude: parseFloat(s.lng || s.lon || s.longitude) || null,
            })),
        });

    } catch (err) {
        console.error('RapidAPI error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});
app.get('/api/debug/:trainNo', async (req, res) => {
    const { trainNo } = req.params;
    try {
        const { status, data } = await fetchLiveTrainStatus(trainNo);
        res.json({ status, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`RapidAPI: ${RAPIDAPI_KEY ? 'configured' : 'NOT configured'}`);
});
