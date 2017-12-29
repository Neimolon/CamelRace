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

var Entity = function(){
    var self = {
        id:"",
        x:250,
        y:250,
        spdX:0,
        spdY:0
    }
    
    self.update = function(){
        self.updatePosition();
    }
    self.updatePosition = function() {
        self.x += self.spdX;
        self.y += self.spdY;
    }
    
    return self;
}

var Player = function(id){
    var self = Entity();
    self.id = id;
    self.number = ""+Math.floor(10 * Math.random());
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false ;
    self.pressingDown = false ;
    self.pressingSpace = false ;
    self.maxSpd = 10 ;
    
    var super_update = self.update;
    
    self.update = function(){
        self.updateSpd();
        super_update();
    }
    
    self.updateSpd = function(){
        if(self.pressingRight)
            self.spdX = self.maxSpd;
        else if(self.pressingLeft)
            self.spdX = -self.maxSpd;
        else
            self.spdX = 0;
        
        if(self.pressingUp)
            self.spdY = -self.maxSpd;
        else if(self.pressingDown)
            self.spdY = self.maxSpd;
        else
            self.spdY = 0;
    }
    Player.list[id] = self;
    return self;
}

Player.list = {} ;
Player.onConnect = function(socket){
    var player = Player(socket.id);
    
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
        }
    });
}

Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
}

Player.update = function(){
    var pack = [];
    
    for(var i in Player.list){
        var player = Player.list[i];
        player.update();
        pack.push({
            x:player.x,
            y:player.y,
            number:player.number,
        });
    }
    
    return pack;
}

var Bullet = function(angle){
    var self = Entity();
    self.id = Math.random();
    self.spdX = Math.cos(angle/180*Math.PI) * 10;
    self.spdY = Math.sin(angle/180*Math.PI) * 10;
    
    self.timer = 0;
    self.toRemove = false;
    
    var super_update = self.update;
    self.update = function(){
        if(self.timer++ >100)
            self.toRemove = true;
        super_update();
    }
    
    Bullet.list[self.id] = self;
    return self;
}

Bullet.list = {};    

Bullet.update = function(){
    if(Math.random() < 0.1){
        Bullet(Math.random() * 360);
    }
    
    var pack = [];
    
    for(var i in Bullet.list){
        var bullet = Bullet.list[i];
        bullet.update();
        pack.push({
            x:bullet.x,
            y:bullet.y
        });
    }
    
    return pack;
}

//Connections
var DEBUG = true;

var io = require("socket.io")(serv,{});
io.sockets.on("connection", function(socket){
    console.log("Socket Connection");    

    socket.id = Math.random(); 
    SOCKET_LIST[socket.id] = socket;
    
    Player.onConnect(socket);
 
    socket.on("disconnect", function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
        
    });
    
    socket.on("sendMsgToServer", function(data){
        var playerName = (""+socket.id).slice(2,7);
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit("addToChat", playerName + ": "+ data);
        }
    });
    
    socket.on("evalServer", function(data){
        if(!DEBUG)
            return;
        
        var res = eval(data);
        socket.emit("evalAnswer", res);
        
        
    });
    
    
    
});    
    
//Loop    
setInterval(function(){
   // console.log("tick");
    var pack = {
        player: Player.update(),
        bullet: Bullet.update()
    } 
    
    
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit("newPosition",pack);
    }
    
},1000/25);
    
    
