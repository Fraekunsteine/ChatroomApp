$(function () {
    var socket = io();
    var user;
    $("#msgbar").submit((e) => {
        e.preventDefault();
        let msg = $("#in").val();
        if(msg.startsWith("/")) {
            if(msg.startsWith("/name")) {
                let i = msg.indexOf(" ");
                if(i != 5) {
                    $("#msgbox").append($("<div class='msg-row'>").append($("<div class='server-message'>").html(
                        "To change your name, please use the format \"/name (your name)\"")));
                }
                else {
                    let newname = msg.substring(i + 1);
                    socket.emit("change-name", user.id, newname);
                }         
            }   
            else if(msg.startsWith("/color")) {
                let i = msg.indexOf(" ");
                if(i != 6) {
                    $("#msgbox").append($("<div class='msg-row'>").append($("<div class='server-message'>").html(
                        "To change your name's color, please use the format \"/color (name color in hex code)\"")));
                }
                else {
                    let color = msg.substring(i + 1);
                    socket.emit("change-name-color", user.id, color);
                }
            } 
            else {
                $("#msgbox").append($("<div class='msg-row'>").append($("<div class='server-message'>").html(
                    "Command not recognized. For a list of commands, use \"/help\"")));
            }
        }        
        else {
            if(msg !== "") socket.emit("chat-msg", msg, user);          
        }
        $("#in").val("");
        return false;
    });
    socket.on("connect", () => {
        socket.emit("cookie", document.cookie);
    });
    socket.on("update-user-info", (data) => {   
        user = data; 
        setCookies(user.id, user.username);       
        $("#user-name").html(`Welcome, ${user.username}!`);    
    });
    socket.on("update-online-list", (u_list, list_changed) => {     
        if(list_changed) {
            $(".userlist").html("");
            for (i in u_list) {
                let curr_user = u_list[i];
                if(curr_user.status === "online") {
                    let text = `<span class='user${curr_user.id}'>${curr_user.username}</span>`
                    $(".userlist").append($(`<div class="onlineuser">`).html(text));
                    $(`.user${curr_user.id}`).html(curr_user.username);
                }
            }
        }
        updateAllNameReferences(u_list);
    });
    socket.on("existing-messages", (u_list, msgAry, num) => {
        let len = msgAry.length;
        let index = num < len ? 0 : (num + 1)%len ;    
        for(let i = 0; i < len; i++, index++) {
            let msg = msgAry[index%len]
            let t = msg.substring(msg.indexOf("user") + "user".length);
            let id = t.substring(0, t.indexOf("'"));
            if(user.id == id){
                $("#msgbox").append($("<div class='msg-row'>").append($("<div class='self-message'>").html(msg)));
            }
            else { 
                $("#msgbox").append($("<div class='msg-row'>").append($("<div class='message'>").html(msg)));
            }
        }
        updateAllNameReferences(u_list);
    });
    socket.on("chat-msg", (msg) => {
        let t = msg.substring(msg.indexOf("user") + "user".length);
        let id = t.substring(0, t.indexOf("'"));
        if(user.id == id){
            $("#msgbox").append($("<div class='msg-row'>").append($("<div class='self-message'>").html(msg)));
        }
        else { 
            $("#msgbox").append($("<div class='msg-row'>").append($("<div class='message'>").html(msg)));
        }
    });
    socket.on("server-msg", (msg) => {
        $("#msgbox").append($("<div class='msg-row'>").append($("<div class='server-message'>").html(msg)));
    });

    let scroller = new MutationObserver(() => {
        $("#msgbox").scrollTop($("#msgbox")[0].scrollHeight);
    });
    let node = document.getElementById("msgbox");
    scroller.observe(node, {
        childList: true,
        subtree: true
    });

    function setCookies(id, username) {
        setCookie("id", id);
        setCookie("username", username);
    }
});

function setCookie(name, value, expdays = 30) {
    let expires = "";
    if(expdays > 0) {
        let date = new Date();
        date.setTime(date.getTime() + (expdays*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
function getCookie(name) {
    let param = name + "=";
    let ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1, c.length);
        if (c.indexOf(param) == 0) return c.substring(param.length, c.length);
    }
    return "";
}
function updateAllNameReferences(user_list) {
    for (i in user_list) {
        let user = user_list[i];
        $(`.user${user.id}`).html(user.username);
        if(user.name_color !== undefined) {
            $(`.user${user.id}`).attr("style", "color: " + user.name_color);
        }
    } 
}
