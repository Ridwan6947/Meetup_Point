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
const map = L.map('map').setView([0,0], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: "Meetup Point (R&S)"
}).addTo(map);

const markers = {};