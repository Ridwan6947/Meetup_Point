const socker = io(); // Connection to the socket server
const userLocations = new Map(); // Use Map instead of object for better performance
const markers = new Map(); // Use Map for markers
let routeControl = null;

// Add these constants at the top
const SEARCH_RADIUS = 2000; // 2km in meters
let midpointMarker = null;
let connectionLine = null;
let poiMarkers = [];

// Initialize map with default Bhopal coordinates
const map = L.map('map').setView([23.2599, 77.4126], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: "Meetup Point (R&S)"
}).addTo(map);

// Watch position only if geolocation is available
if (navigator.geolocation) {
    const watchOptions = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    };

    navigator.geolocation.watchPosition(
        ({ coords: { latitude, longitude }}) => { // Destructure position object
            map?.setView([latitude, longitude], 16);
            socker.emit("send-location", { latitude, longitude });
        },
        console.error, // Direct error logging
        watchOptions
    );
}

// Handle incoming location data
socker.on("receive-location", ({ id, latitude, longitude }) => {
    userLocations.set(id, { latitude, longitude });

    // Update or create marker
    if (markers.has(id)) {
        markers.get(id).setLatLng([latitude, longitude]);
    } else {
        markers.set(id, L.marker([latitude, longitude]).addTo(map));
    }

    // Update route and POIs if exactly 2 users
    if (userLocations.size === 2) {
        const [user1, user2] = [...userLocations.values()];
        
        // Calculate midpoint
        const midpoint = {
            latitude: (user1.latitude + user2.latitude) / 2,
            longitude: (user1.longitude + user2.longitude) / 2
        };

        // Update or create midpoint marker
        if (midpointMarker) {
            midpointMarker.setLatLng([midpoint.latitude, midpoint.longitude]);
        } else {
            midpointMarker = L.marker([midpoint.latitude, midpoint.longitude], {
                icon: L.divIcon({
                    className: 'meeting-point',
                    html: '📍 Meeting Point',
                    iconSize: [100, 20]
                })
            }).addTo(map);
        }

        // Update or create connection line
        const coordinates = [
            [user1.latitude, user1.longitude],
            [user2.latitude, user2.longitude]
        ];
        
        if (connectionLine) {
            connectionLine.setLatLngs(coordinates);
        } else {
            connectionLine = L.polyline(coordinates, {
                color: 'blue',
                weight: 3,
                dashArray: '5, 10'
            }).addTo(map);
        }

        // Search for POIs using Overpass API
        searchPOIs(midpoint.latitude, midpoint.longitude);
    }
});

// Add this new function to search POIs
async function searchPOIs(lat, lon) {
    // Clear existing POI markers
    poiMarkers.forEach(marker => marker.remove());
    poiMarkers = [];

    const query = `
        [out:json][timeout:25];
        (
            node["amenity"~"cafe|restaurant"]["name"](around:${SEARCH_RADIUS},${lat},${lon});
            way["leisure"="park"]["name"](around:${SEARCH_RADIUS},${lat},${lon});
        );
        out body;
        >;
        out skel qt;
    `;

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
        });
        const data = await response.json();

        data.elements.forEach(element => {
            if (element.tags && element.tags.name) {
                const marker = L.marker([element.lat, element.lon], {
                    icon: L.divIcon({
                        className: 'poi-marker',
                        html: getPOIIcon(element.tags.amenity || element.tags.leisure),
                        iconSize: [20, 20]
                    })
                }).bindPopup(`${element.tags.name} (${element.tags.amenity || element.tags.leisure})`);
                
                marker.addTo(map);
                poiMarkers.push(marker);
            }
        });
    } catch (error) {
        console.error('Error fetching POIs:', error);
    }
}

// Add this helper function for POI icons
function getPOIIcon(type) {
    switch(type) {
        case 'cafe': return '☕';
        case 'restaurant': return '🍽️';
        case 'park': return '🌳';
        default: return '📍';
    }
}

// Handle disconnections
socker.on("user-disconnected", (id) => {
    if (markers.has(id)) {
        map.removeLayer(markers.get(id));
        markers.delete(id);
        userLocations.delete(id);
    }

    // Clean up route if less than 2 users
    if (userLocations.size < 2 && routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
    }

    // Clean up additional elements if less than 2 users
    if (userLocations.size < 2) {
        if (midpointMarker) {
            midpointMarker.remove();
            midpointMarker = null;
        }
        if (connectionLine) {
            connectionLine.remove();
            connectionLine = null;
        }
        poiMarkers.forEach(marker => marker.remove());
        poiMarkers = [];
    }
});
