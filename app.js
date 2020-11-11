var express = require("express");
var app = express();
var path = require("path");
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var fs = require("fs");

app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

let msg_num = 0;
let messages = [];
const MESSAGE_LIMIT = 200;
let users;

fs.readFile(__dirname + "/resources/users.json", (err, data) => {
    if(err) throw err;
    users = JSON.parse(data);
});

io.on("connect", (socket) => {   
    let curr_user;
    socket.on("cookie", (msg) => {
        let cookie = decodeURIComponent(msg);   
        let usernum = users.list.length + 1;
        while(users.list.findIndex(user => user.id == usernum) != -1) {
            usernum ++;
        }
        if(cookie === "") {
            curr_user = {id:usernum, username:"user"+usernum, status:"online"};
            users.list.push(curr_user);
        }
        else {
            let i = getCookie(cookie, "id");
            let index = users.list.findIndex(user => user.id == i);
            if(index == -1) {
                curr_user = {id:parseInt(getCookie(cookie, "id")), username:getCookie(cookie, "username"), status:"online"};
                users.list.push(curr_user);
            }
            else {
                users.list[index].status = "online";
                curr_user = users.list[index];
            }           
        }  
        writeJSON(users);
 
        socket.emit("update-user-info", curr_user);    
        io.emit("update-online-list", users.list, true);  

        console.log(`${curr_user.username} connected`);

        if(msg_num > 0) {
            socket.emit("existing-messages", users.list, messages, msg_num - 1);
        }
    });   
    socket.on("disconnect", () => {
        users.list.find(user => user === curr_user).status = "offline";
        writeJSON(users);

        socket.broadcast.emit("update-online-list", users.list, true);
        console.log(`${curr_user.username} disconnected`);
    });
    socket.on("chat-msg", (msg, user) => {
        let d = new Date();
        let txt = emojify(msg);
        ;
        if(user.name_color !== undefined) {
            txt = `<b>[${d.getHours()}:${(d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes())}] <span class='user${user.id}' style='color:${user.name_color}'>${user.username}</span>:</b>  ${txt}`;        
        }
        else {
            txt = `<b>[${d.getHours()}:${(d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes())}] <span class='user${user.id}'>${user.username}</span>:</b>  ${txt}`;        
        }
        messages[msg_num%MESSAGE_LIMIT] = txt;
        msg_num++;

        io.emit("chat-msg", txt);
    });
    socket.on("change-name", (id, newname) => {
        if(users.list.findIndex(user => user.username === newname) == -1) {
            let index = users.list.findIndex(user => user.id == id);
            users.list[index].username = newname;
            curr_user = users.list[index];

            socket.emit("update-user-info", curr_user);    
            io.emit("update-online-list", users.list, false);
        }
        else {
            socket.emit("server-msg", `The name ${newname} has already been taken, please choose a new one.`);
        }
    });
    socket.on("change-name-color", (id, color) => {
        let index = users.list.findIndex(user => user.id == id)
        users.list[index].name_color = color;
        curr_user = users.list[index];

        io.emit("update-online-list", users.list, false);
    });
});
server.listen(3000, () => {
    console.log("listening on port: 3000");
});

function getCookie(cookie, name) {
    let param = name + "=";
    let ca = cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1, c.length);
        if (c.indexOf(param) == 0) return c.substring(param.length, c.length);
    }
    return "";
}
function writeJSON(data, file = __dirname + "/resources/users.json") {
    let json = JSON.stringify(data);
    fs.writeFile(file, json, (err) => {
        if(err) throw err;
    });
}
function emojify(txt) {
    txt = txt.replace(":)", "&#x1F642");
    txt = txt.replace(":|", "&#x1F610");
    txt = txt.replace(":(", "&#x1F641");
    txt = txt.replace(":p", "&#x1F60B");
    txt = txt.replace(":o", "&#x1F62E");
    txt = txt.replace(":D", "&#x1F600");
    return txt;
}
function handle(signal) {
    writeJSON(users);
    console.log(`Received ${signal}. About to exit...`);
}
process.on('SIGINT', handle);
process.on('SIGTERM', handle);
process.on('SIGHUP', handle);
