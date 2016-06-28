'use strict';

var map,
    markClusterer,
    elements = {
        NETWORK_NODE : [],
        NETWORK_CLIENT : []
    },
    infoWindow = null,
    actorTypes = {},
    lines = [];

$(document).ready(main);

/**
 * Checks if an edge already exists
 * @author Miguelcldn
 */
function checkEdges() {
    var markers = markClusterer.getMarkers();
    
    for(var i = 0; i < lines.length; i++) {
        if(markers.indexOf(lines[i].client) === -1 || markers.indexOf(lines[i].server) === -1) {
            lines[i].line.setMap(null);
        }
        else {
            lines[i].line.setMap(map);
        }
    }
}

/**
 * Connects two markers with a line
 * @author Miguelcldn
 * @param {object} client Client marker
 * @param {object} server Server marker
 */
function connectMarkers(client, server) {
    
    var clientPos = {
        lat : client.marker.position.lat() + 0,
        lng : client.marker.position.lng()
    };
    var serverPos = {
        lat : server.marker.position.lat() + 0,
        lng : server.marker.position.lng()
    };
    
    var line = new google.maps.Polyline({
        
        path : [clientPos, serverPos],
        strokeColor: '#FF0000',
        strokeOpacity: 0.7,
        strokeWeight: 3,
        map: map
        });

        lines.push({line: line, client: client.marker, server: server.marker});
        checkEdges();
}

/**
 * Draws the control panel
 * @author Miguelcldn
 * @returns {DOMObject} The div of the control panel
 */
function createControlPanel() {
    
    var createFilter = function(id, caption) {
        return '' + 
            '<td onclick="toggleFilter(\'' + id + '\')")"><div id="' + id + '-Filter">' +
            '<img id="' + id + '-logo" src="img/markers/' + id + '.svg"/>' +
            '<span id="' + id + '-caption">' + caption +
            '</span></div></td>';
    };
    
    // Create a div to hold the control.
    var controlDiv = document.createElement('div');

    // Set CSS for the control border
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.border = '2px solid #fff';
    controlUI.style.marginBottom = '22px';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Options';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior
    var controlText = document.createElement('div');
    controlText.style.color = 'rgb(25,25,25)';
    controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlText.style.fontSize = '16px';
    controlText.style.lineHeight = '38px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    
    /*controlText.innerHTML = '<input type="checkbox" value="NETWORK_NODE" checked onChange="toggleFilter(this)">Nodes</input><br>' +
        '<input type="checkbox" value="NETWORK_CLIENT" onChange="toggleFilter(this)">Clients</input><br>' + 
        '<input type="checkbox" value="actors" onChange="toggleFilter(this)">Actors</input>';*/
    
    //Create the filter options
    var options = "<table class='filter'>";
    
    options += "<tr>";
    options += createFilter('NETWORK_NODE', 'Nodes');
    options += createFilter('NETWORK_CLIENT', 'Devices');
    options += "</tr>";
    
    var pair = false;
    for(var i = 0; i < actorTypes.length; i++) {
        
        var actor = actorTypes[i];
        
        if(!pair) options += "<tr>";
        
        options += createFilter(actor.code, actor.label);
        
        if(pair) options += "</tr>";
        
        pair = !pair;
    }
    
    options += "<tr>";
    options += "<td onclick='toggleFilter(\"ALL\")'><div style='padding-left:30px'>All</div></td>";
    options += "<td onclick='toggleFilter(\"NONE\")'><div style='padding-left:30px'>None</div></td>";
    options += "</tr>";
    
    options += "</table>";
    
    controlText.innerHTML = options;
    controlUI.appendChild(controlText);
    
    return controlDiv;
}

/**
 * Draws the vis.js graphic
 * @author Miguelcldn
 * @param {Array} data The data to feed the dataset
 */
function createGraphic(data) {
    
    $("#loadingSpinner").css('display', 'none');
    
    var container = document.getElementById("historyGraphic");
    var groups = new vis.DataSet();
    var items = [];
    
    container.innerHTML = "";
    
    groups.add({id : 0, content: "Nodes"});
    groups.add({id : 1, content: "Devices"});
    
    for(var i = 0; i < data.length; i++) {
        var element = data[i];
        items.push({x: new Date(element.time), y: element.servers, group: 0});
        items.push({x: new Date(element.time), y: element.clients, group: 1});
    }
    
    var dataSet = new vis.DataSet(items);
    var options = {
        //style: 'bar',
        //stack: true,
        start: Date.now() - (3600 * 1000 * 20),
        end: Date.now(),
        drawPoints: false,
        orientation: 'top',
        dataAxis: {
            icons: false,
            left: {
                range: {
                    min: 0
                },
                title: {
                    text: "Connections"
                }
            }
        },
        legend: {
            enabled: true,
            left: {
                position: 'top-right'
            }
        },
        barChart: {
            width: 50,
            align: 'center',
            sideBySide: true
        }
    };
    
    var graph = new vis.Graph2d(container, dataSet, groups, options);
}

/**
 * Hides all markers from the map
 * @author Miguelcldn
 * @param {Array} list The list of elements to hide
 */
function clearMarkers(list) {
    
    if(list === undefined) return;
    
    for(var i = 0; i < list.length; i++) {
        if(list[i].marker !== undefined)
            markClusterer.removeMarker(list[i].marker, true);
    }
    
    markClusterer.resetViewport();
    markClusterer.redraw();
}

/**
 * Creates the differents actor markers
 * @author Miguelcldn
 * @param {Array} actors The list of actors to extract the actors
 */
function createActors(actors) {
    
    var actorsList = {};
    
    var setListener = function(act) {
        act.marker.addListener('click', function() {drawDetails(act);});
    };
    
    for(var i = 0; i < actors.length; i++) {
        
        var actor = actors[i];

        if(actor.location) {

            var actorType = actor.actorType;
            var actorHasMarker = searchActor(actorType) != -1;
            var title = (actorHasMarker) ? actorTypes[searchActor(actorType)].label : actorType;
            var url = "img/markers/";

            if(actorHasMarker) {
                url += actorType;

                url += ".svg";


                var marker = new google.maps.Marker({
                    title : title,
                    position : randomizeLocation(actor.location),
                    icon : {
                        url : url,
                        scaledSize: new google.maps.Size(50, 50),
                        anchor: new google.maps.Point(25,25)
                    }
                });
                
                if(actor.location.latitude === 0 && actor.location.longitude === 0) {
                    marker.setPosition(randomizeLocation(actor.location, 45, 120));
                }
                
                actor.marker = marker;

                var list = (actorHasMarker) ? actorType : "OTHER";
                if(window.elements[list] === undefined) window.elements[list] = [];
                window.elements[list].push(actor);
                setListener(actor);
            }
        }
    }
    
    toggleFilter('ALL');
}

/**
 * Draws the Fermat Nodes
 * @author Miguelcldn
 * @param {Array} list Response from the server
 */
function createMarkers(list, title) {
    
    var newNodes = [];
    
    var setListener = function(node) {
        node.marker.addListener('click', function() {drawDetails(node);});
    };
    
    for(var i = 0; i < list.length; i++) {
        var node = list[i];
		var url = (title === 'Node') ? "NETWORK_NODE.svg" : "NETWORK_CLIENT.svg";
        var location = node.location;
        
        if(location !== undefined && location.latitude !== undefined && location.longitude !== undefined) {
            var marker = new google.maps.Marker({
                title : title,
                position : {lat : location.latitude, lng : location.longitude},
                icon : {
                    url : "img/markers/" + url,
                    scaledSize: new google.maps.Size(50, 50),
                    anchor: new google.maps.Point(25,25)
                },
            });
            
            if(location.latitude === 0 && location.longitude === 0) {
                marker.setPosition(randomizeLocation(location, 45, 120));
            }else {
                marker.setPosition(randomizeLocation(location, 0.1));
            }
            node.marker = marker;
            setListener(node);
        }
        
        
        newNodes.push(node);
    }
    
    return newNodes;
}

/**
 * Draws the node details in the map
 * @author Miguelcldn
 * @param {Object} node The node
 */
function drawDetails(node) {
    
    if(infoWindow !== null) {
        infoWindow.close();
        unSetAllFocus();
    }
    
    var content = "";
    var details = null;
    
    content += "<div id='nsWindow' class='info-window'>";
    
    if(node.marker.title === "Node") {
        content += "<strong>IP:</strong> " + node.lastIP + "<br/>" +
        "<strong>Clients:</strong> " + node.conectedClients + "<br/><br/>";
        
        details = node.networkServices;
        
        if(details) {
            
            content += "<strong>Network Services:</strong><br/>";
            
            content += "<table>";
            for(var ns in details) {
                content += "<tr><td>-" + window.helper.fromMACRO_CASE(ns) + ": " + details[ns] + "</td></tr>";
            }
            content += "</table>";
        }
        
        setClientsFocus(node);
    }
    else if(node.marker.title === "Device") {
        
        /*Don't show ip
        if(node.extra.location.ip)
            content += "<strong>IP:</strong> " + node.extra.location.ip + "<br/>";*/
        
        details = node.networkServices;
        
        if(details && details.length !== 0) {
            
            content += "<strong>Network Services:</strong><br/>";
            
            for(var i = 0; i < details.length; i++) {
                content += "-" + window.helper.fromMACRO_CASE(details[i]) + "<br/>";
            }
        }
        
        setServersFocus(node);
    }
    else if(searchActor(node.marker.title) != -1) {
        content += "<strong>" + node.marker.title + "</strong><br/>";
        
        if(node.profile) {
            if(node.profile.name) content += node.profile.name + "<br/>";
            if(node.profile.phrase) content += "Phrase: " + node.profile.phrase + "<br/>";
            if(node.profile.picture) content += "<img class='profile-pic' src='data:image/png;base64," + node.profile.picture + "'/>";
        }
    }
    else {
        content += "<strong>" + node.marker.title + "</strong><br>No details available";
    }
    
    content += "</div>";
    
    infoWindow = new google.maps.InfoWindow({
        content : content
    });
    //infoWindow.setCloseSrc("img/close_if.png");
    //$("#nsWindow").parent().parent().height()
    infoWindow.addListener('closeclick', unSetAllFocus);
    
    infoWindow.open(map, node.marker);
    
}

/**
 * Draws the Google Map
 * @author Miguelcldn
 */
function drawMap() {
    
    window.map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 14.695393959866866, lng: 9.029051737500042},
        zoom: 2
    });
    
    window.markClusterer = new MarkerClusterer(window.map, [], { gridSize : 50 });
    
    //Load the config file before loading anything else
    $.ajax({
        url: "json/actorTypes.json",
        method: "GET",
        crossDomain: true,
        success: function(list) {
            window.actorTypes = list.actors;
            for(var i = 0; i < actorTypes.length; i++) {
                elements[actorTypes[i].code] = [];
            }
            getNodes();
        },
        error: function(request, error) {
            window.alert("Could not retrieve the data, see console for details.");
            window.console.dir(error);
        }
        
    });
}

/**
 * Gets the actors from a server
 * @author Miguelcldn
 * @param {Array} nodeList The list of servers
 */
function getActors(nodeList) {
    var success = function(list) {
        createActors(list);
    };
    var error = function(request, error) {
        window.alert("Could not retrieve the data, see console for details.");
        window.console.dir(error);
        success([]);
    };
    
    for(var i = 0; i < nodeList.length; i++) {
    
        $.ajax({
            url : window.helper.getAPIUrl("actors", {serv_id : nodeList[i]._id}),
            //url : "json/dummyClients.json",
            method: "GET",
            crossDomain: true,
            success : success,
            error : error
        });
    }
}

/**
 * Based on the nodes IDs, load the clients
 * @author Miguelcldn
 * @param {Array} nodeList Array of nodes to extract the IDs
 */
function getClients(nodeList) {
    
    var success = function(list) {
        window.elements.NETWORK_CLIENT = createMarkers(list, "Device");
    };
    var error = function(request, error) {
        window.alert("Could not retrieve the data, see console for details.");
        window.console.dir(error);
        success([]);
    };
    
    for(var i = 0; i < nodeList.length; i++) {
    
        $.ajax({
            url : window.helper.getAPIUrl("clients", {serv_id : nodeList[i]._id}),
            //url : "json/dummyClients.json",
            method: "GET",
            crossDomain: true,
            success : success,
            error : error
        });
    }

    window.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(createControlPanel());
}

/**
 * Calls the API server for the nodes data
 * @author Miguelcldn
 */
function getNodes() {
    
    $.ajax({
        url : window.helper.getAPIUrl("servers"),
        //url : "json/dummyServrs.json",
        method: "GET",
        crossDomain: true,
        success : function(list) {
            window.elements.NETWORK_NODE = createMarkers(list, "Node");
            getClients(list);
            getActors(list);
            toggleFilter('ALL');
        },
        error : function(request, error) {
            window.alert("Could not retrieve the data, see console for details.");
            window.console.dir(error);
        }
    });
}

/**
 * Entry point
 * @author Miguelcldn
 */
function main() {
    $("#showHistoryBtn").click(showHistory);
}

/**
 * Sets a random position of a point
 * @author Miguelcldn
 * @param   {object} location             The source location
 * @param   {number} [distance=1]         The radious or latitude range
 * @param   {number} [distanceX=distance] The longitude range
 * @returns {object} A LatLng literal
 */
function randomizeLocation(location, distance, distanceX) {
    
    distance = distance || 1;
    distanceX = distanceX || distance;
    
    return {
        lat : location.latitude + ((Math.random() * distance * 2- (distance))),
        lng : location.longitude + ((Math.random() * distanceX * 2 - (distanceX)))
    };
}

/**
 * Looks for an actor in the actors list
 * @author Miguelcldn
 * @param   {string} actorType The actor type code
 * @returns {number} The position of the actor in the list or -1 if not found
 */
function searchActor(actorType) {
    for(var p = 0; p < actorTypes.length; p++) {
        if(actorTypes[p].code === actorType || actorTypes[p].label === actorType) {
            return p;
        }
    }

    return -1;
}

/**
 * Links the clients with the server
 * @author Miguelcldn
 * @param {object} node The server to use as center
 */
function setClientsFocus(node) {
    for(var i = 0; i < elements.NETWORK_CLIENT.length; i++) {
        var client = elements.NETWORK_CLIENT[i];
        
        //if(client.marker && client._serv_id !== node._id) client.marker.setOpacity(0.5);
        if(client.marker && client._serv_id === node._id) {
            connectMarkers(client, node);
        }
        
    }
}

/**
 * Links the servers with the client
 * @author Miguelcldn
 * @param {object} client The client to use as center
 */
function setServersFocus(client) {
    for(var i = 0; i < elements.NETWORK_NODE.length; i++) {
        var server = elements.NETWORK_NODE[i];
        
        //if(server.marker && server._id !== client._serv_id) server.marker.setOpacity(0.5);
        if(server.marker && server._id === client._serv_id) {
            connectMarkers(client, server);
        }
    }
}

/**
 * Gets and shows the nodes history
 * @author Miguelcldn
 */
function showHistory() {
    
    $("#loadingSpinner").css('display', 'block');
    
    $.ajax({
        url: window.helper.getAPIUrl("history"),
        method: "GET",
        crossDomain: true,
        success: createGraphic,
        error: function(r, error) {
            window.alert("Could not retrieve the data, see console for details.");
            window.console.dir(error);
        }
    });
}

/**
 * Shows the markers in the map
 * @author Miguelcldn
 * @param {Array} list The list of elements to show
 */
function showMarkers(list) {
    
    if(list === undefined) return;
    
    for(var i = 0; i < list.length; i++) {
        if(list[i].marker !== undefined && markClusterer.getMarkers().indexOf(list[i].marker) === -1)
            markClusterer.addMarker(list[i].marker, true);
    }
    
    markClusterer.resetViewport();
    markClusterer.redraw();
}

/**
 * Hides or shows the nodes (Event)
 * @author Miguelcldn
 * @param {string}  id            The ID of the filter to toggle
 * @param {boolean} [forcedState] If provided, the forced state about enable/disable
 */
function toggleFilter(id, forcedState) {
    
    var list, caption, logo, enable, action, iterator;
    
    switch(id) {
        case 'ALL':
            
            for(iterator in window.elements) {
                toggleFilter(iterator, true);
            }
            break;
            
        case 'NONE':
            
            for(iterator in window.elements) {
                toggleFilter(iterator, false);
            }
            break;
            
        default:
            
            list = window.elements[id];
            caption = $('#' + id + '-caption');
            logo = $('#' + id + '-logo');
            enable = (forcedState === undefined) ? caption.hasClass('disabled') : forcedState;

            action = (enable) ? showMarkers : clearMarkers;
            var classOperation = '';

            if(forcedState === true) classOperation = 'removeClass';
            else if(forcedState === false) classOperation = 'addClass';
            else classOperation = 'toggleClass';
            
            caption[classOperation]('disabled');
            logo[classOperation]('disabled');

            action(list);
    }
    
    checkEdges();
}

/**
 * Unlinks all nodes
 * @author Miguelcldn
 */
function unSetAllFocus() {
    //unSetClientsFocus();
    //unSetServersFocus();
    
    for(var i = 0; i < lines.length; i++) lines[i].line.setMap(null);
    
    lines = [];
}

/**
 * Unlinks the clients
 * @author Miguelcldn
 */
function unSetClientsFocus() {
    for(var i = 0; i < elements.NETWORK_CLIENT.length; i++) {
        var client = elements.NETWORK_CLIENT[i];
        
        if(client.marker) client.marker.setOpacity(1);
    }
    
}

/**
 * Unlinks the servers
 * @author Miguelcldn
 */
function unSetServersFocus() {
    for(var i = 0; i < elements.NETWORK_NODE.length; i++) {
        var server = elements.NETWORK_NODE[i];
        
        if(server.marker) server.marker.setOpacity(1);
    }
}
