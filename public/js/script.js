const socket = io(); // connection to the socket server
let userLocations = {}; // Store user locations to draw the path
let userMarkers = {};
let routePolyline;

// Initialize map centered in Bhopal
const map = L.map("map").setView([23.2599, 77.4126], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "Meetup Point (R&S)"
}).addTo(map);

if (navigator.geolocation) {  
    navigator.geolocation.watchPosition(
        (position) => {
            const latitude = position.coords.latitude;  
            const longitude = position.coords.longitude;
            socket.emit("send-location", { latitude, longitude }); 
        },
        (error) => console.log(error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

socket.on("receive-location", (data) => {
    const { id, latitude, longitude } = data;
    userLocations[id] = { latitude, longitude };

    // Add or update user markers on the map
    if (userMarkers[id]) {
        userMarkers[id].setLatLng([latitude, longitude]);
    } else {
        userMarkers[id] = L.marker([latitude, longitude]).addTo(map).bindPopup(`User ${id}`);
    }

    // Calculate the midpoint and search for nearby places
    const userIds = Object.keys(userLocations);
    if (userIds.length === 2) {
        const [user1, user2] = userIds.map(id => userLocations[id]);
        const midpoint = {
            latitude: (user1.latitude + user2.latitude) / 2,
            longitude: (user1.longitude + user2.longitude) / 2
        };

        // Draw a line between the two users
        if (routePolyline) {
            routePolyline.setLatLngs([
                [user1.latitude, user1.longitude],
                [user2.latitude, user2.longitude]
            ]);
        } else {
            routePolyline = L.polyline([
                [user1.latitude, user1.longitude],
                [user2.latitude, user2.longitude]
            ], { color: "black" }).addTo(map);
        }

        // Find nearby places at the midpoint
        findNearbyPlaces(midpoint.latitude, midpoint.longitude);
    }
});

// Search for nearby places using Nominatim
function findNearbyPlaces(lat, lon) {
    const query = "cafe|restaurant|park|garden"; // Search categories
    const url = `https://nominatim.openstreetmap.org/search?format=json&lat=${lat}&lon=${lon}&radius=2000&q=${query}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Clear existing markers for places
            if (window.placeMarkers) {
                window.placeMarkers.forEach(marker => map.removeLayer(marker));
            }
            window.placeMarkers = [];

            // Add markers for nearby places
            data.forEach(place => {
                const marker = L.marker([place.lat, place.lon]).addTo(map)
                    .bindPopup(`<b>${place.display_name}</b>`);
                window.placeMarkers.push(marker);
            });

            // Zoom to the midpoint to show nearby places
            map.setView([lat, lon], 14);
        })
        .catch(error => console.error("Error fetching nearby places:", error));
}

socket.on("user-disconnected", (id) => {
    if (userMarkers[id]) {
        map.removeLayer(userMarkers[id]);
        delete userMarkers[id];
    }
    if (Object.keys(userLocations).length < 2 && routePolyline) {
        map.removeLayer(routePolyline);
        routePolyline = null;
    }
});
