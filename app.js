//imports
require("dotenv").config();
const express = require("express");
const socketio = require("socket.io");
const path = require("path");

// global creations
const app = express();
const PORT = process.env.PORT
const http = require("http"); //to run socketIO an http server is required
app.set("view engine" , "ejs"); // setup ejs
app.use(express.static(path.join(__dirname , "public"))); // setup static folder

// socket io setup
const server = http.createServer(app);
const io = socketio(server);
io.on("connection" , function(socket){
    socket.on("send-location" , function(data){   // accept location from backend script.js
        io.emit("receive-location" , { id:socket.id, ...data });    // send location to all connected users
    })
    socket.on("disconnect" , function(){
        io.emit("user-disconnected" , socket.id);
    });
})


//Routes
app.get("/" , function(req , res){
    res.render("index");
});

//server listening
server.listen(PORT , function(){
    console.log("Server is running on port " + PORT);
});
