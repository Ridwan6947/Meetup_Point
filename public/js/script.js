const socker = io(); //c onnection to the socket server

if(navigator.geolocation){  //check if geolocation is available
    navigator.geolocation.watchPosition(
    (position) =>{
        const latitude = position.coords.latitude;  //get latitude and longitude
        const longitude = position.coords.longitude;
        socker.emit("send-location", {latitude , longitude}); //send location to the server
    }, 
    (error) =>{
        console.log(error);
    },
    {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    }
);
}
const map = L.map('map').setView([0,0], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: "Meetup Point (R&S)"
}).addTo(map);

const markers = {};

socker.on("receive-location", (data) => {
    const { id, latitude, longitude } = data;
    userLocations[id] = { latitude, longitude };

    // Create or update the marker for the user
    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]);
    } else {
        markers[id] = L.marker([latitude, longitude]).addTo(map);
    }

    // If two users exist, draw a line between them and find the meeting point
    const userIds = Object.keys(userLocations); // Get the user IDs
    if (userIds.length === 2) {
        const user1 = userLocations[userIds[0]]; // Get the locations of the two users
        const user2 = userLocations[userIds[1]];
        const latLngs = [                           // Create the polyline coordinates
            [user1.latitude, user1.longitude],
            [user2.latitude, user2.longitude]
        ];

        if (polylines[userIds.join("-")]) {
            polylines[userIds.join("-")].setLatLngs(latLngs); // Update the polyline
        } else {
            polylines[userIds.join("-")] = L.polyline(latLngs, { color: 'black' }).addTo(map); // Draw a new polyline
        }

        // // Find and add the meeting point
        // const meetingPoint = findClosestMeetingPoint(userLocations);
        // if (meetingPoint) {
        //     L.marker([meetingPoint.lat, meetingPoint.lon])
        //         .addTo(map)
        //         .bindPopup(meetingPoint.name)
        //         .openPopup();
        // }
    }
});


socker.on("user-disconnected" , (id)=>{  // delete user when app closes
    if(markers[id]){
        map.removeLayer(markers[id]);
        delete markers[id];
    }
})