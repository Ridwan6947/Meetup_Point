const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 8080;

// Cache cafes and parks data
let cachedCafes = [];
let cachedParks = [];

// Fetch and cache data
async function fetchPlaces() {
    const cafeResponse = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
            format: "json",
            city: "Bhopal",
            country: "India",
            amenity: "cafe",
            polygon_geojson: 1
        }
    });

    const parkResponse = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
            format: "json",
            city: "Bhopal",
            country: "India",
            leisure: "park",
            polygon_geojson: 1
        }
    });

    cachedCafes = cafeResponse.data.map((item) => ({
        name: item.display_name,
        lat: item.lat,
        lon: item.lon
    }));

    cachedParks = parkResponse.data.map((item) => ({
        name: item.display_name,
        lat: item.lat,
        lon: item.lon
    }));
}

// Calculate middle point
function calculateMiddlePoint(lat1, lon1, lat2, lon2) {
    return {
        latitude: (lat1 + lat2) / 2,
        longitude: (lon1 + lon2) / 2
    };
}

// Filter places within a radius
function getPlacesWithinRadius(places, center, radius) {
    const toRadians = (degree) => (degree * Math.PI) / 180;
    const EARTH_RADIUS = 6371; // in kilometers

    return places.filter((place) => {
        const dLat = toRadians(place.lat - center.latitude);
        const dLon = toRadians(place.lon - center.longitude);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(center.latitude)) *
                Math.cos(toRadians(place.lat)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = EARTH_RADIUS * c;

        return distance <= radius;
    });
}

// API to fetch nearby places
app.get("/api/nearby", async (req, res) => {
    const { lat1, lon1, lat2, lon2 } = req.query;

    const center = calculateMiddlePoint(
        parseFloat(lat1),
        parseFloat(lon1),
        parseFloat(lat2),
        parseFloat(lon2)
    );

    const radius = 2; // 2 km
    const nearbyCafes = getPlacesWithinRadius(cachedCafes, center, radius);
    const nearbyParks = getPlacesWithinRadius(cachedParks, center, radius);

    res.json({ cafes: nearbyCafes, parks: nearbyParks, center });
});

// Start the server
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await fetchPlaces(); // Preload data
    console.log("Places data cached.");
});
