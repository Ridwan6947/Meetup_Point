const socker = io(); // Connection to the socket server
let userLocations = {}; // Store user locations to draw the path

// Check if geolocation is available
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const latitude = position.coords.latitude; // Get latitude and longitude
            const longitude = position.coords.longitude;

            // Set the map view to the user's current location
            if (typeof map !== 'undefined') {
                map.setView([latitude, longitude], 16); // Set map to user's location
            }

            socker.emit("send-location", { latitude, longitude }); // Send location to the server
        },
        (error) => {
            console.log(error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

// Initialize map (this will be updated to the user's location once it's retrieved)
// Default to Bhopal coordinates if geolocation is not available
const map = L.map('map').setView([23.2599, 77.4126], 16); // Default to Bhopal
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: "Meetup Point (R&S)"
}).addTo(map);

const markers = {}; // Store user markers
const polylines = {}; // Store polylines to draw paths

// Leaflet Routing Machine setup
let routeControl = null; // Store route control for re-routing

// Event listener when the server sends location data
socker.on("receive-location", (data) => {
    const { id, latitude, longitude } = data;
    userLocations[id] = { latitude, longitude };

    // Create or update the marker for the user
    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]);
    } else {
        markers[id] = L.marker([latitude, longitude]).addTo(map);
    }

    // If two users exist, draw a line between them
    const userIds = Object.keys(userLocations);
    if (userIds.length === 2) {
        const user1 = userLocations[userIds[0]];
        const user2 = userLocations[userIds[1]];

        // Remove previous route if it exists
        if (routeControl) {
            map.removeControl(routeControl);
        }

        // Ensure the map is fully initialized before adding the routing control
        if (map.getZoom() !== null) {
            // Calculate and display the route between the two users
            routeControl = L.Routing.control({
                waypoints: [
                    L.latLng(user1.latitude, user1.longitude),
                    L.latLng(user2.latitude, user2.longitude)
                ],
                routeWhileDragging: true, // Allow dragging to update route
                lineOptions: {
                    styles: [{ color: 'black', weight: 4 }]
                }
            }).addTo(map);
        }
    }
});

// Handle user disconnections
socker.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }

    // Recalculate the route if one user disconnects
    const userIds = Object.keys(userLocations);
    if (userIds.length === 2) {
        const user1 = userLocations[userIds[0]];
        const user2 = userLocations[userIds[1]];

        if (routeControl) {
            map.removeControl(routeControl);
        }

        routeControl = L.Routing.control({
            waypoints: [
                L.latLng(user1.latitude, user1.longitude),
                L.latLng(user2.latitude, user2.longitude)
            ],
            routeWhileDragging: true,
            lineOptions: { styles: [{ color: 'black', weight: 4 }] }
        }).addTo(map);
    }
});
