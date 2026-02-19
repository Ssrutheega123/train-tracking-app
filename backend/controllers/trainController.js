const axios = require('axios');

// Fetch live status from your Python TrainTrack Microservice
exports.getLiveStatus = async (req, res) => {
    const { trainNo } = req.params;

    try {
        // Call the Python service running on Port 8000
        const response = await axios.get(`http://localhost:8000/train/${trainNo}`);

        const data = response.data;

        if (!data?.events) {
            return res.status(404).json({ message: "Train data not found" });
        }

        // Clean and format the data for the frontend Geolocation logic
        const formattedRoute = data.events.map((stop) => ({
            station: stop.station,
            code: stop.code,
            arrivalTime: stop.arrival || "N/A",
            departureTime: stop.departure || "N/A",
            delay: stop.delay || "00:00",
            // These coordinates will be used by the Haversine formula in React
            lat: stop.lat,
            lng: stop.lon
        }));

        res.status(200).json({
            trainNumber: data.train_number,
            lastUpdated: data.last_update,
            route: formattedRoute
        });

    } catch (error) {
        console.error("Controller Error:", error.message);
        res.status(500).json({ message: "Error connecting to scraper service" });
    }
};
