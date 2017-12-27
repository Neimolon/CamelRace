/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var express = require("express");
var app = express();
var serv = require("http").Server(app);

app.get("/",function(req, res){
    res.sendFile( __dirname + "/client/index.html");
});
app.use("/client",express.static(__dirname + "/client"));

serv.listen(10001); 
console.log("Server Started");

var SOCKET_LIST = {};
var PLAYER_LIST = {};

var Player = function(id){
    var self = {
        x:250,
        y:250,
        id:id,
        number: ""+Math.floor(10 * Math.random()),
        pressingRight:false,
        pressingLeft:false,
        pressingUp:false,
        pressingDown:false,
        pressingSpace:false,
        maxSpd:10,
    }
    
    
    self.updatePosition = function(){
        if(self.pressingRight)
            self.x += self.maxSpd;
        if(self.pressingLeft)
            self.x -= self.maxSpd;
        if(self.pressingUp)
            self.y -= self.maxSpd;
        if(self.pressingDown)
            self.y += self.maxSpd;
    }
    
    return self;
}

//Connections
var io = require("socket.io")(serv,{});
io.sockets.on("connection", function(socket){
    console.log("Socket Connection");
    
    socket.id = Math.random(); 
    SOCKET_LIST[socket.id] = socket;
    
    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;
    
    socket.on("disconnect", function(){
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
    });
    
    socket.on("KeyPress", function(data){
        
        switch(data.inputId){
            case "left":
                player.pressingLeft = data.state;
            break;
            case "right":
                player.pressingRight = data.state;
            break;
            case "up":
                player.pressingUp = data.state;
            break;
            case "down":
                player.pressingDown = data.state;
            break;
        default:
            console.log("Received keyPress on server");
            
        }
    });
});    
    
//Loop    
setInterval(function(){
   // console.log("tick");
    var pack = [];
    
    for(var i in PLAYER_LIST){
        var player = PLAYER_LIST[i];
        player.updatePosition();
        pack.push({
            x:player.x,
            y:player.y,
            number:player.number,
        });
    }
    
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit("newPosition",pack);
    }
    
},1000/25);
    
    
