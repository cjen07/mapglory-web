/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/***************************************************************************/

////   Globals

// https://groups.google.com/forum/#!msg/leaflet-js/qXVBcD3juL4/4pZXHTv1baIJ

/***  little hack starts here ***/
L.Map = L.Map.extend({
    openPopup: function(popup){
        //        this.closePopup();  // just comment this
        this._popup = popup;

        return this.addLayer(popup).fire('popupopen', {
            popup: this._popup
        });
    }
}); /***  end of hack ***/

///  Map Init

var map = L.map('map', { zoomControl: false, closePopupOnClick: false}).setView([39.98823, 116.30015], 17);

L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; '+
    '<a href="http://openstreetmap.org">OpenStreetMap</a> contributors, '+
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
    maxZoom: 19
}).addTo(map);

/// Scale

L.control.scale().addTo(map);

/// Global variables

var locateFlag = 0;
var locateMarker;
var locateCircle;
var radius;

var pickMarker;
var pickGeo;
var feature;

var name = "";
var geo = {}; 
var socket = io.connect("http://182.92.159.66");
var popup = {};
var chat = {};
var edit = "";
var attr = "";
var text = "";
var timestamp = 0;

// Add name geo getfromcookie : to be done

var taskFlag = 0; // 0 for no task, 1 for from group button, 2 for from popups
var loginSwich = 0; // 0 for signin, 1 for signup
var searchSwich = 0; // 0 for vacant, 1 for search
var searchResultFlag = 0; // 0 for vacant, 1 for existed
var boardFlag = 0; // 0 for vacant, 1 for existed
var boardContent = ""; // "Login", "PopupList", "ConversationList", "TextList", "EditPopup"


/***************************************************************************/

//// Basic DOMs

/// Title & Search

var title = L.control({position: 'topleft'});
title.onAdd = function (map){
    this._div = L.DomUtil.create('div', 'title');

    this._div.innerHTML = '<h1><i id="title1">Map</i><i id="search"><i class="fa fa-search"></i></i>' +
                            '<input type="hidden" id="searchInput" maxlength="20" style="' +
                            'height: 30px; width: 100px; font-size:20px; text-align:center; vertical-align:middle' +
                            '">' +
                            '<i id="title2">Glory</i></h1>';
    return this._div;
};

title.update = function (){
    document.getElementById('searchInput').onkeypress=function(e){
        if(e.keyCode === 13 && searchSwich === 1){
            document.getElementById('search').click();
        }
    }
}

title.searchSwich = function(){
    searchSwich = 1 - searchSwich;
    if (searchSwich === 0){
        document.getElementById("searchInput").setAttribute("type", "hidden");
        document.getElementById('searchInput').value = "";
    }
    else{
        document.getElementById("searchInput").setAttribute("type", "text");
        document.getElementById("searchInput").focus();
        window.prompt();
    }

}

title.addTo(map);
title.update();

document.getElementById("title1").addEventListener("click", function(){
    title.searchSwich();
});

document.getElementById("title2").addEventListener("click", function(){
    title.searchSwich();
});

/// Search Result

var searchResult = L.control();
searchResult.onAdd = function (map){
    this._div = L.DomUtil.create('div', 'searchResult');
    return this._div;
};

searchResult.update = function (){
    // Disable dragging when user's touch enters the element
    searchResult.getContainer().addEventListener('touchstart', function () {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();

    });

    searchResult.getContainer().addEventListener('touchend', function () {
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();

    });

    // Disable dragging when user's cursor enters the element
    searchResult.getContainer().addEventListener('mouseover', function () {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
    });

    // Re-enable dragging when user's cursor leaves the element
    searchResult.getContainer().addEventListener('mouseout', function () {
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
    });
}

function chooseAddr(lat1, lng1, lat2, lng2, osm_type) {
    var loc1 = new L.LatLng(lat1, lng1);
    var loc2 = new L.LatLng(lat2, lng2);
    var bounds = new L.LatLngBounds(loc1, loc2);

    if (feature) {
        map.removeLayer(feature);
    }
    if (osm_type == "node") {
        feature = L.circle( loc1, 25, {color: 'green', fill: false}).addTo(map);
        map.fitBounds(bounds);
        map.setZoom(18);
    } else {
        var loc3 = new L.LatLng(lat1, lng2);
        var loc4 = new L.LatLng(lat2, lng1);

        feature = L.polyline( [loc1, loc4, loc2, loc3, loc1], {color: 'red'}).addTo(map);
        map.fitBounds(bounds);
    }
}

searchResult.search = function(items){
    if (items.length != 0) {
        this._div.innerHTML = "";
        this._div.innerHTML += '<p>Search results:</p>' +
                                '<ul>';
        for (var i = 0; i < items.length; i++){
            this._div.innerHTML += items[i];
        }
        this._div.innerHTML += '</ul>' +
                                '<button type="button" id="closeSearch">' + 
                                '<i class="fa fa-times"></i></button>';
    }
    else{
        this._div.innerHTML = "";
        this._div.innerHTML += '<p>No results.</p>' +
                                '<button type="button" id="closeSearch">' + 
                                '<i class="fa fa-times"></i></button>';
    }
    document.getElementById("closeSearch").addEventListener("click", function(){
        searchResultFlag = 0;
        searchResult.removeFrom(map);
    });
    
}

document.getElementById("search").addEventListener("click", function(){
    if (searchSwich === 0){
        title.searchSwich();
        return;
    }
    var searchContent = document.getElementById('searchInput').value;
    if (searchContent === "")
        return;
    if (searchResultFlag === 1){
        searchResult.removeFrom(map);
    }
    searchResult.addTo(map);
    searchResult.update();
    searchResultFlag = 1
    $.getJSON('http://nominatim.openstreetmap.org/search?format=json&limit=5&q=' + searchContent, function(data) {
        var items = [];
        $.each(data, function(key, val) {
            bb = val.boundingbox;
            items.push("<li><a href='#' onclick='chooseAddr(" + bb[0] + ", " + bb[2] + ", " + bb[1] + ", " + bb[3]  + ", \"" + val.osm_type + "\");return false;'>" + val.display_name + '</a></li>');
        });
        searchResult.search(items);        
    });
    
});

/// Nav

var nav = L.control({position: 'topleft'});
nav.onAdd = function (map){
    this._div = L.DomUtil.create('div', 'nav');

    this._div.innerHTML = '<br>'+
                    '<p id="plus"><i class="fa fa-plus-square-o fa-3x"></i></p>'+
                    '<p id="minus"><i class="fa fa-minus-square-o fa-3x"></i></p>'+
                    '<p id="locate"><i class="fa fa-street-view fa-3x"></i></p>'+
                    '<p id="group"><i class="fa fa-user-secret fa-3x"></i></p>'+                 
                    '<p id="friend"><i class="fa fa-tree fa-3x"></i></p>'+
                    '<p id="share"><i class="fa fa-external-link fa-3x"></i></p>'; 
    return this._div;
};
nav.addTo(map);

/// Info

// Control that shows state info on hover

var info = L.control();
info.onAdd = function (map){
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};
info.update = function (props){
    this._div.innerHTML =  (props ?
        '<h4>' + props.title + '</h4>' + '<b>' + props.brief + '</b>'
        : '<h4>Notice</h4>' + 'Have a great adventure!');
};
info.addTo(map);

/***************************************************************************/

//// Entrances

/// Entrance 0: from group button

document.getElementById("group").addEventListener("click", function(){
    taskFlag = 1;
    socket.emit("signIn", {name: name, geo: geo});
});

geoDistance = function(geo1, geo2){
    return Math.abs(geo1.lat - geo2.lat) +
            Math.abs(geo1.lng - geo2.lng);
}

socket.on("signIn", function(data){
    // data: {result: bool, name: name, geo: geo}
    if (data.result){
        if (boardFlag === 1){
            info.update({title: "Notice", brief: "Success: sign in"});
            document.getElementById("close" + boardContent).click();
        }       
        name = data.name;
        geo = data.geo;
        switch (taskFlag){
            case 0:
                break;
            case 1: // Entrance 0 
                board.popupListPage();
                break;
            case 2: 
                if (geoDistance(geo, popup.name) === 0){
                    // Entrance 1: popup
                    taskFlag = 1;
                    board.conversationListPage();
                }
                else{
                    // Entrance 2: chat
                    taskFlag = 3;
                    chat = {name: popup.geo, geo: geo};
                    board.textListPage();
                }                
                break;
            case 3:
                board.friendListPage();
                break;
        }
    }
    else{
        if (boardFlag === 0){
            // no board before -> no messages
            // notice: please sign in or sign up
            info.update({title: "Notice", brief: "Please sign in or sign up"});
            boardFlag = 1;
            boardContent = "Login";
            board.addTo(map);
            board.update();
            board.loginPage();
        }
        else{
            // messages
            // notice: invalid signin
            info.update({title: "Notice", brief: "Invalid: " + data.msg});
            if (boardContent != "Login"){
                document.getElementById("close" + boardContent).click();
                boardFlag = 1;
                boardContent = "Login";
                board.addTo(map);
                board.update();
                board.loginPage();
            }            
        }
    }
});

/// Entrance 1: from popup by owner

/// Entrance 2: from popup by helper

// Popups

socket.on("popups", function (popups){
    // popups: [{name, geo, attr, text}]
    var indexArray = [];
    // data -> view
    for (var i = 0; i < popups.length; i ++){
        var item = L.popup({closeButton: false})
                    .setLatLng(popups[i].geo)
                    .setContent('<p id="popup' + 
                                i.toString() + 
                                '"><i class="fa ' +
                                popups[i].attr +
                                ' fa-2x"></i></p>')
                    .openOn(map);
        indexArray.push(i); 
    }
    // view -> onclicklistener
    indexArray.forEach(function(entry) {
        document.getElementById("popup" + entry).addEventListener("click", function (){
            clickPopup({
                name: popups[entry].name,
                geo: popups[entry].geo,
                attr: popups[entry].attr,
                text: popups[entry].text
            });
        });
    }); 
});
clickPopup = function (data){
    popup = data;
    taskFlag = 2;
    socket.emit("signIn", {name: name, geo: geo});
}

socket.emit('getPopups');

// notice ?

/// Entrance 3: from friend button

document.getElementById("friend").addEventListener("click", function(){
    taskFlag = 3;
    socket.emit("signIn", {name: name, geo: geo});
});


/***************************************************************************/

//// Dynamic DOMs: Board Interfaces

var board = L.control();
board.onAdd = function (map){
    this._div = L.DomUtil.create('div', 'board');
    return this._div;
}

board.update = function(){
    // Disable dragging when user's touch enters the element
    board.getContainer().addEventListener('touchstart', function () {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();

    });

    board.getContainer().addEventListener('touchend', function () {
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();

    });

    // Disable dragging when user's cursor enters the element
    board.getContainer().addEventListener('mouseover', function () {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();

    });

    // Re-enable dragging when user's cursor leaves the element
    board.getContainer().addEventListener('mouseout', function () {
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
    });
}

/// Login Interface

board.getPickGeo = function(){
    return '<b>Geo:</b>' + 
            (Math.round(pickGeo.lat * 100000) / 100000) +
            ', ' +
            (Math.round(pickGeo.lng * 100000) / 100000) +
            '<br>';
}

board.getLoginName = function(){
    return '<b>Name:</b>' +
            '<input type="text" id="nameInput" maxlength="20" onclick="board.getFocus()" value=' +
            name +
            '>' +
            '<br>';
            
}

board.getLoginSwitch = function(){
    return '<b>Type:</b>' +
            (loginSwich === 0 ? 'SignIn' : 'SignUp') +
            '<br>' +
            '<button type="button" id="loginButton">' + 
            '<i class="fa fa-paper-plane-o"></i></button>' +
            '<button type="button" id="loginSwich">' + 
            '<i class="fa fa-exchange"></i></button>' +
            '<button type="button" id="closeLogin">' + 
            '<i class="fa fa-times"></i></button>';
}

board.getFocus = function(){
    document.getElementById("nameInput").focus();
    window.prompt();
}

board.updateLoginPage = function(){
    this._div.innerHTML =  board.getPickGeo() + 
                            board.getLoginName() +
                            board.getLoginSwitch();
    document.getElementById("loginButton").addEventListener("click", function(){
        geo.lat = (Math.round(pickGeo.lat * 100000) / 100000);
        geo.lng = (Math.round(pickGeo.lng * 100000) / 100000);
        name = document.getElementById('nameInput').value;
        socket.emit((loginSwich === 0 ? 'signIn' : 'signUp'), {name: name, geo: geo});
    });
    document.getElementById("loginSwich").addEventListener("click", function(){
        loginSwich = 1 - loginSwich;
        name = document.getElementById('nameInput').value;
        board.updateLoginPage();
    });
    document.getElementById("closeLogin").addEventListener("click", function(){
        board.removeFrom(map);
        map.removeLayer(pickMarker);
        boardFlag = 0;
        boardContent = "";
        // to activate the map
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
    });
}

board.loginPage = function(){// main function of the interface
    pickMarker = L.marker(map.getCenter(), {draggable: true}).addTo(map);
    pickMarker.on('drag', function(event){
        pickGeo = pickMarker.getLatLng();
        name = document.getElementById('nameInput').value;
        board.updateLoginPage(); 
    });
    pickGeo = pickMarker.getLatLng();
    board.updateLoginPage();                          
}

/// PopupList Interface

board.popupListPage = function(){// main function of the interface
    socket.emit('getPopupList', {geo: geo});
}

socket.on('popupList', function(data, err){
    boardFlag = 1;
    boardContent = "PopupList";
    board.addTo(map);
    board.update(); 
    board.getPopupListPage(data);
});

board.getPopupListPage = function(popupList){
    // popupList = [{name, geo, attr, text}]
    var indexArray = [];
    // popupList -> view
    this._div.innerHTML = "";
    if (popupList.length === 0){
        this._div.innerHTML += '<p>You have no popups.</p>'
    }

    for (var i = 0; i < popupList.length; i ++){
        this._div.innerHTML += '<p id="plist' + 
                                i.toString() + 
                                '"><i class="fa ' +
                                popupList[i].attr +
                                ' fa-2x"></i>' +
                                popupList[i].text +
                                '</p>';
        indexArray.push(i); 
    }   

    // new logout close    
    this._div.innerHTML += '<button type="button" id="newButton">' + 
                            '<i class="fa fa-file-text-o"></i></button>' +
                            '<button type="button" id="logoutButton">' + 
                            '<i class="fa fa-sign-out"></i></button>' +
                            '<button type="button" id="closePopupList">' + 
                            '<i class="fa fa-times"></i></button>';

    // view -> onclicklistener
    document.getElementById('newButton').addEventListener("click", function(){
        document.getElementById('closePopupList').click();
        edit = "newPopup";
        board.editPopupPage();
    });
    document.getElementById('logoutButton').addEventListener("click", function(){
        // logout and close
        name = "";
        geo = {};
        popup = {};
        chat = {};

        info.update({title: "Notice", brief: "Success: log out"});
        document.getElementById('closePopupList').click();
    });
    document.getElementById('closePopupList').addEventListener("click", function(){
        board.removeFrom(map);
        boardFlag = 0;
        boardContent = "";
        // to activate the map
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
    });
    indexArray.forEach(function(entry) {
        document.getElementById('plist' + entry).addEventListener("click", function (){
            document.getElementById('closePopupList').click();
            clickPlist({
                name: popupList[entry].name,
                geo: popupList[entry].geo,
                attr: popupList[entry].attr,
                text: popupList[entry].text
            });
        });
    });
}

clickPlist = function(data){
    popup = data;      
    board.conversationListPage();
}

/// ConversationList Interface

board.conversationListPage = function(){// main function of the interface
    socket.emit('getConversationList', {popup: popup});
}

socket.on('conversationList', function(data, err){
    boardFlag = 1;
    boardContent = "ConversationList";
    board.addTo(map);
    board.update(); 
    board.getConversationListPage(data);
});

board.getConversationListPage = function(conversationList){
    // conversationList = [{name, geo, text}]
    var indexArray = [];
    // conversationList -> view
    this._div.innerHTML = "";
    if (conversationList.length === 0){
        this._div.innerHTML += '<p>You have no interactions.</p>'
    }
    
    for (var i = 0; i < conversationList.length; i ++){
        this._div.innerHTML += '<p id="clist' + 
                                i.toString() + 
                                '">' +                                
                                conversationList[i].text +
                                '</p>';
        indexArray.push(i); 
    }    

    // edit remove back close
    this._div.innerHTML += '<button type="button" id="editButton">' + 
                            '<i class="fa fa-pencil-square-o"></i></button>' +
                            '<button type="button" id="removeButton">' + 
                            '<i class="fa fa-trash-o"></i></button>' +
                            '<button type="button" id="backConversationList">' + 
                            '<i class="fa fa-undo"></i></button>' +
                            '<button type="button" id="closeConversationList">' + 
                            '<i class="fa fa-times"></i></button>';

    // view -> onclicklistener
    document.getElementById('editButton').addEventListener("click", function(){
        document.getElementById('closeConversationList').click();
        edit = "updatePopup";
        board.editPopupPage();
    });
    document.getElementById('removeButton').addEventListener("click", function(){
        document.getElementById('closeConversationList').click();
        board.removePage();
    });
    document.getElementById('backConversationList').addEventListener("click", function(){
        document.getElementById('closeConversationList').click();
        board.popupListPage();     
    });
    document.getElementById('closeConversationList').addEventListener("click", function(){
        board.removeFrom(map);
        boardFlag = 0;
        boardContent = "";
        // to activate the map
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
    });
    indexArray.forEach(function(entry) {
        document.getElementById("clist" + entry).addEventListener("click", function (){
            document.getElementById('closeConversationList').click();
            clickClist({
                name: conversationList[entry].name,
                geo: conversationList[entry].geo
            });
        });
    });
}

clickClist = function(data){
    chat = data;
    board.textListPage();
}

/// TextList Interface

board.textListPage = function(){// main function of the interface
    socket.emit('getTextList', {chat: chat});
}

socket.on('textList', function(data, err){
    boardFlag = 1;
    boardContent = "TextList";
    board.addTo(map);
    board.update(); 
    board.getTextListPage(data);
});

board.getTextListPage = function(textList){
    // textList = [{name, geo, turn, text, date}]
    // textList -> view
    this._div.innerHTML = "";
    // add popup description
    this._div.innerHTML += '<p><i class="fa fa-quote-left fa-2x"></i>' +
                            popup.text +
                            '</p>';
    for (var i = 0; i < textList.length; i ++){
        if (textList[i].turn === 0){
            this._div.innerHTML += '<p><i class="fa fa-quote-left fa-2x"></i>' +
                                    textList[i].text +
                                    '</p>';
        }
        else{ // === 1
            this._div.innerHTML += '<p>' +
                                    textList[i].text +
                                    '<i class="fa fa-quote-right fa-2x"></i></p>';
        }    
    }

    // send back close
    this._div.innerHTML += '<input type="text" id="chatInput" maxlength="20">' +
                            '<button type="button" id="sendButton">' + 
                            '<i class="fa fa-paper-plane-o"></i></button>' +
                            '<button type="button" id="backTextList">' + 
                            '<i class="fa fa-undo"></i></button>' +
                            '<button type="button" id="closeTextList">' + 
                            '<i class="fa fa-times"></i></button>';

    document.getElementById('sendButton').addEventListener("click", function(){
        var msg = document.getElementById('chatInput').value;
        socket.emit('newText', {userGeo: geo, chat: chat, msg: msg});
    });
    document.getElementById('backTextList').addEventListener("click", function(){
        document.getElementById('closeTextList').click();
        if (taskFlag === 3){
            board.friendListPage();
        }
        else{// === 1
            board.conversationListPage();
        }        
    });
    document.getElementById('closeTextList').addEventListener("click", function(){
        board.removeFrom(map);
        boardFlag = 0;
        boardContent = "";
        // to activate the map
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
    });
}

socket.on('text', function(data){
    if (data.result){
        info.update({title: "Notice", brief: "Success: " + data.msg});
    }
});

/// FriendList Interface

board.friendListPage = function(){// main function of the interface
    socket.emit('getFriendList', {geo: geo});   
}

socket.on('friendList', function(data, err){
    boardFlag = 1;
    boardContent = "FriendList";
    board.addTo(map);
    board.update();
    board.getFriendListPage(data);
});

board.getFriendListPage = function(friendList){
    // friendList = [{name, geo, text}]
    var indexArray = [];
    // friendList -> view
    this._div.innerHTML = "";
    if (friendList.length === 0){
        this._div.innerHTML += '<p>You have no interactions.</p>'
    }

    for (var i = 0; i < friendList.length; i ++){
        this._div.innerHTML += '<p id="flist' + 
                                i.toString() + 
                                '">' +                                
                                friendList[i].text +
                                '</p>';
        indexArray.push(i); 
    }    

    // edit remove back close
    this._div.innerHTML += '<button type="button" id="closeFriendList">' + 
                            '<i class="fa fa-times"></i></button>';

    // view -> onclicklistener
    document.getElementById('closeFriendList').addEventListener("click", function(){
        board.removeFrom(map);
        boardFlag = 0;
        boardContent = "";
        // to activate the map
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
    });
    indexArray.forEach(function(entry) {
        document.getElementById("flist" + entry).addEventListener("click", function (){
            document.getElementById('closeFriendList').click();
            clickFlist({
                name: friendList[entry].name,
                geo: friendList[entry].geo
            });
        });
    });
}

clickFlist = function(data){
    chat = data;
    // Fixx init popup
    board.textListPage();
}

/// Edit Popup Interface

board.editPopupPage = function(){
    boardFlag = 1;
    boardContent = "EditPopup";
    board.addTo(map);
    board.update();
    board.getEditPage();
}

board.getEditAttr = function(){
    return '<b>Attr:</b>' +
            '<select id="attrList" class="fontawesome-select">' +
            '<option value="fa-bicycle">&#xf206;</option>' +
            '<option value="fa-shopping-cart">&#xf07a;</option>' +
            '<option value="fa-building-o"">&#xf0f7;</option>' +
            '<option value="fa-medkit">&#xf0fa;</option>' +
            '<option value="fa-credit-card">&#xf09d;</option>' +
            '<option value="fa-plug">&#xf1e6;</option>' +
            '<option value="fa-print">&#xf02f;</option>' +
            '<option value="fa-umbrella">&#xf0e9;</option>' +
            '<option value="fa-envelope-o">&#xf003;</option>' +
            '<option value="fa-bug">&#xf188;</option>' +
            '<option value="fa-truck">&#xf0d1;</option>' +
            '<option value="fa-wrench">&#xf0ad;</option>' +
            '<option value="fa-beer">&#xf0fc;</option>' +
            '<option value="fa-cutlery">&#xf0f5;</option>' +
            '<option value="fa-compass">&#xf14e;</option>' +
            '</select>' +
            '<br>';
            
}

board.getEditText = function(){
    return '<b>Text:</b>' +
            '<input type="text" id="editInput" maxlength="80" value="">' +
            '<br>' +
            '<button type="button" id="confirmButton">' + 
            '<i class="fa fa-check"></i></button>' +
            '<button type="button" id="backEditPopup">' + 
            '<i class="fa fa-undo"></i></button>' +
            '<button type="button" id="closeEditPopup">' + 
            '<i class="fa fa-times"></i></button>';
}

board.updateEditPage = function(){
    this._div.innerHTML =  board.getPickGeo() + 
                            board.getEditAttr() +
                            board.getEditText();
    document.getElementById('attrList').value = attr;
    document.getElementById('editInput').value = text;
    document.getElementById("confirmButton").addEventListener("click", function(){
        popupGeo = {};
        popupGeo.lat = (Math.round(pickGeo.lat * 100000) / 100000);
        popupGeo.lng = (Math.round(pickGeo.lng * 100000) / 100000);
        attr = document.getElementById('attrList').value;
        text = document.getElementById('editInput').value;
        if (edit === "newPopup"){
            socket.emit(edit, {userGeo: geo, popupGeo: popupGeo, attr: attr, text: text});
        }
        else{// === "updatePopup"
            socket.emit(edit, {userGeo: geo, popupOldGeo: popup.geo, popupNewGeo: popupGeo, attr: attr, text: text});
        }        
    });
    document.getElementById("backEditPopup").addEventListener("click", function(){
        document.getElementById("closeEditPopup").click();
        if (edit === "newPopup"){
            board.popupListPage();
        }
        else{// === "updatePopup"
            board.conversationListPage();
        }        
    });
    document.getElementById("closeEditPopup").addEventListener("click", function(){
        board.removeFrom(map);
        map.removeLayer(pickMarker);
        boardFlag = 0;
        boardContent = "";
        // to activate the map
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
    });
}

board.getEditPage = function(){// main function of the interface
    if (edit === "newPopup"){
        attr = "";
        text = "";
        pickMarker = L.marker(map.getCenter(), {draggable: true}).addTo(map);        
    }
    else{// === "updatePopup"
        attr = popup.attr;
        text = popup.text;
        pickMarker = L.marker(map.getCenter(), {draggable: true}).addTo(map);
    }    
    pickGeo = pickMarker.getLatLng();
    board.updateEditPage();
    pickMarker.on('drag', function(event){
        pickGeo = pickMarker.getLatLng();
        text = document.getElementById('editInput').value;
        attr = document.getElementById('attrList').value;
        board.updateEditPage(); 
    });
}

// Remove

board.removePage = function(){
    boardFlag = 1;
    boardContent = "RemovePopup";
    board.addTo(map);
    board.update();
    board.getRemovePage();
}

board.getRemovePage = function(){
    this._div.innerHTML = '<b>Warning:</b>' +
                            '<p>Do you really want to remove this popup?</p>' +
                            '<button type="button" id="confirmRemove">' + 
                            '<i class="fa fa-check"></i></button>' +
                            '<button type="button" id="donateButton">' + 
                            '<i class="fa fa-money"></i></button>' +
                            '<button type="button" id="closeRemovePopup">' + 
                            '<i class="fa fa-times"></i></button>';
    document.getElementById("confirmRemove").addEventListener("click", function(){
        document.getElementById("closeRemovePopup").click();
        socket.emit('removePopup', {popup: popup});      
    });
    document.getElementById("donateButton").addEventListener("click", function(){

    });
    document.getElementById("closeRemovePopup").addEventListener("click", function(){
        board.removeFrom(map);
        boardFlag = 0;
        boardContent = "";
        // to activate the map
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
    });
}

socket.on('edit', function(data){
    if (data.result){
        info.update({title: "Notice", brief: "Success: " + data.msg});
    }
    else{
        info.update({title: "Notice", brief: "Invalid: " + data.msg});
    }
});

/***************************************************************************/

//// Flash Mechanism

setInterval(function(){
    socket.emit('flash', {name: name, geo: geo, timestamp: timestamp});
}, 5000);

socket.on('flash', function(data){
    // data.timestamp <= timestamp pass
    // data.timestamp > timestamp change
        // if data.result = null pass
        // else change data flash data
            // if boardflag === 0
            // if boardflag === 1
                // switch boardContent
                    // "Login", "PopupList", "ConversationList", 
                    // "TextList", "EditPopup", "RemovePopup"
                        // flash and notice
});

/***************************************************************************/

//// Basic Handlers

/// Map Event Handler

// Locate

function onMouseClickCircle(){
    info.update({title: "Locate", brief: "Within " + radius.toString() + 
        " meters from here, reclick the button to erase."});
}

function onLocationFound(e){
    radius = e.accuracy/2;
    locateMarker = L.marker(e.latlng).addTo(map);
    locateCircle = L.circle(e.latlng, radius).on('click', onMouseClickCircle).addTo(map);
    onMouseClickCircle();
}
map.on('locationfound', onLocationFound);

function onLocationError(e){
    alert(e.message);
}
map.on('locationerror', onLocationError);

// Zoom

function onZoomEnd (e){
    var zoomNow = map.getZoom();
    var zoomMin = map.getMinZoom();
    var zoomMax = map.getMaxZoom();
    if (locateFlag != 1){
        if(zoomNow === zoomMin)
            info.update({title: "Zoom", brief: "Level: " + zoomNow.toString() + " (Min)"});
        else if(zoomNow === zoomMax)
            info.update({title: "Zoom", brief: "Level: " + zoomNow.toString() + " (Max)"});
        else
            info.update({title: "Zoom", brief: "Level: " + zoomNow.toString()});      
    }
    else{
        locateFlag = 2;
    }

}
map.on('zoomend', onZoomEnd);

// Drag

function onMapDrag(e){
    info.update();
}
map.on('drag', onMapDrag);

/// Control Event handler

function handlePlus(){
    map.zoomIn();    
}

function handleMinus(){
    map.zoomOut();    
}

function handleLocate(){
    if(locateFlag === 0){
        map.locate({setView: true});
        if (map.getZoom() === map.getMaxZoom())
            locateFlag = 2;
        else
            locateFlag = 1;
    }
    else{
        map.removeLayer(locateMarker);
        map.removeLayer(locateCircle);
        locateFlag = 0;
        info.update();
    }    
}

function handleShare(){
    // Redirect to my github
}

/// Control DOM

document.getElementById("plus").addEventListener("click", handlePlus, false);
document.getElementById("minus").addEventListener("click", handleMinus, false);
document.getElementById("locate").addEventListener("click", handleLocate, false);
document.getElementById("share").addEventListener("click", handleShare, false);

/***************************************************************************/

//// Others

/// Cookie

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}

/// Html Dom Feature

var htmlDoms = [title, nav, info];
htmlDoms.forEach(function(entry) {
    // Disable dragging when user's touch enters the element
    entry.getContainer().addEventListener('touchstart', function () {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();

    });

    entry.getContainer().addEventListener('touchend', function () {
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();

    });

    // Disable dragging when user's cursor enters the element
    entry.getContainer().addEventListener('mouseover', function () {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
    });

    // Re-enable dragging when user's cursor leaves the element
    entry.getContainer().addEventListener('mouseout', function () {
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
    });
});

