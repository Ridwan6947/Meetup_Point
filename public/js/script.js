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
let routeControl = null; // Store route control for dynamic updates

// Event listener when the server sends location data
socker.on("receive-location", async (data) => {
    const { id, latitude, longitude } = data;
    userLocations[id] = { latitude, longitude };

    const userIds = Object.keys(userLocations);
    if (userIds.length === 2) {
        const user1 = userLocations[userIds[0]];
        const user2 = userLocations[userIds[1]];

        const middlePoint = {
            latitude: (user1.latitude + user2.latitude) / 2,
            longitude: (user1.longitude + user2.longitude) / 2
        };

        // Fetch nearby places from the server
        const response = await fetch(
            `/api/nearby?lat1=${user1.latitude}&lon1=${user1.longitude}&lat2=${user2.latitude}&lon2=${user2.longitude}`
        );
        const data = await response.json();

        // Add markers for cafes and parks
        data.cafes.forEach((place) => {
            L.marker([place.lat, place.lon], { title: place.name })
                .addTo(map)
                .bindPopup(`Cafe: ${place.name}`);
        });

        data.parks.forEach((place) => {
            L.marker([place.lat, place.lon], { title: place.name })
                .addTo(map)
                .bindPopup(`Park: ${place.name}`);
        });

        // Display the middle point
        L.marker([middlePoint.latitude, middlePoint.longitude], { title: "Middle Point" })
            .addTo(map)
            .bindPopup("Middle Point");
    }
});


// Handle user disconnections
socker.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }

    // Remove the route if only one user remains
    if (Object.keys(userLocations).length < 2) {
        if (routeControl) {
            map.removeControl(routeControl);
            routeControl = null;
        }
    }
});
