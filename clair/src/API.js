/**
 * Static object with help functions commonly used
 */
function API() {

    var self = this;

    this.listDevs = {};

    this.getCompsUser = function(callback){

        var url = "";

        var list = {};

        var param;

        //window.session.useTestData();

        if(window.session.getIsLogin() && !window.disconnected){

            var usr = window.helper.clone(window.session.getUserLogin());

            url = window.helper.SERVER + "/v1/repo/usrs/"+usr._id+"/";

            param = {
                env : window.API_ENV,
                axs_key : usr.axs_key
            };

            var port = window.helper.buildURL('', param);

            callAjax('comps', port, function(route, res){

               list[route] = res;

                callAjax('layers', port,function(route, res){

                    list[route] = res;

                    callAjax('platfrms', port,function(route, res){

                        list[route] = res;

                        callAjax('suprlays', port,function(route, res){

                            list[route] = res;

                            url = self.getAPIUrl("user");

                            callAjax('', '',function(route, res){

                                self.listDevs = res;

                                callback(list);

                            });
                        });
                    });
                });
            });
        }
        else{

            if(!window.disconnected)
                url = self.getAPIUrl("comps");
            else
                url = 'json/testData/comps.json';

            callAjax('', '',function(route, res){

                list = res;

                if(!window.disconnected)
                    url = self.getAPIUrl("user");
                else
                    url = 'json/testData/devs.json';

                callAjax('', '',function(route, res){

                    self.listDevs = res;

                    callback(list);

                });
            });
        }

        function callAjax(route, port, callback){

            var URL = url + route + port;

            if(window.disconnected)
                URL = url;

            $.ajax({
                url: URL,
                method: "GET"
            }).success (
                function (res) {

                    if(typeof(callback) === 'function')
                        callback(route, res);

                });
        }

    };

    this.postRoutesEdit = function(type, route, params, data, doneCallback, failCallback){

        var method = "",
            setup = {},
            usr = window.helper.clone(window.session.getUserLogin()),
            param,
            url;

        param = {
                usrs : usr._id,
                env : window.API_ENV,
                axs_key : usr.axs_key
            };

        for(var i in data)
            param[i] = data[i];

        route = type + " " + route;

        if(route.match('insert'))
            method = "POST";
        else if(route.match('update'))
            method = "PUT";
        else
            method = "DELETE";

        setup.method = method;
        setup.url = self.getAPIUrl(route, param);
        setup.headers = {
            "Content-Type": "application/json"
             };

        if(params)
            setup.data = params;

        makeCorsRequest(setup.url, setup.method, setup.data,
            function(res){

                switch(route) {

                    case "tableEdit insert":

                        if(res){

                            if(res._id){

                                if(typeof(doneCallback) === 'function')
                                    doneCallback(res);
                            }
                            else{

                                window.alert('There is already a component with that name in this group and layer, please use another one');

                                if(typeof(failCallback) === 'function')
                                    failCallback(res);
                            }
                        }
                        else{

                            if(typeof(failCallback) === 'function')
                                    failCallback(res);
                        }

                        break;
                    case "tableEdit update":

                        if(!exists("[component]")){

                            if(typeof(doneCallback) === 'function')
                                doneCallback(res);
                        }
                        else{

                            var name = document.getElementById('imput-Name').value;

                            if(window.fieldsEdit.actualTile.name.toLowerCase() === name.toLowerCase()){

                                if(typeof(doneCallback) === 'function')
                                    doneCallback(res);
                            }
                            else{

                                window.alert('There is already a component with that name in this group and layer, please use another one');

                                if(typeof(failCallback) === 'function')
                                    failCallback(res);
                            }
                        }

                        break;
                    case "wolkFlowEdit insert":

                        if(res){

                            if(res._id){

                                if(typeof(doneCallback) === 'function')
                                    doneCallback(res);
                            }
                            else{

                                if(typeof(failCallback) === 'function')
                                    failCallback(res);
                            }
                        }
                        else{
                            
                            if(typeof(failCallback) === 'function')
                                    failCallback(res);
                        }

                        break;
                    case "wolkFlowEdit update":

                            doneCallback(res);
                        
                        break;

                    default:
                            if(typeof(doneCallback) === 'function')
                                    doneCallback(res);
                        break;
                }

            },
            function(res){

                if(typeof(failCallback) === 'function')
                    failCallback(res);
            }
        );

    };

    this.postValidateLock = function(route, data, doneCallback, failCallback){

        var msj = "Component",
            usr = window.helper.clone(window.session.getUserLogin()),
            param = {};

        if(route === "wolkFlowEdit")
            msj = "WolkFlow";

        param = {
                usrs : usr._id,
                env : window.API_ENV,
                axs_key : usr.axs_key
            };

        for(var i in data)
            param[i] = data[i];

        route = route + " get";

        $.ajax({
            url:  self.getAPIUrl(route, param),
            method: 'GET',
            dataType: 'json',
            success:  function (res) {

                if(res._id)
                    doneCallback();
                else
                    failCallback();
            },
            error: function(res){

                if(res.status === 423){
                    window.alert("This " + msj + " is currently being modified by someone else, please try again in about 3 minutes");
                }
                else if(res.status === 404){
                    window.alert(msj + " not found");
                }
            }
        });
    };

    var makeCorsRequest = function(url, method, params, success, error) {

        //TODO: DELETE THIS IF
        if((method === "PUT" || method === "POST") && !url.match("/comps-devs/") && exists("[Component]")) {
            error();
        }
        else {
            var xhr = createCORSRequest(url, method);

            xhr.setRequestHeader('Content-type','application/json; charset=utf-8');

              if(!xhr) {
                window.alert('CORS not supported');
                return;
              }

            xhr.onload = function() {

                var res = null;

                if(method !== 'DELETE'){
                    
                    //if(xhr.responseText.match("_id[a-z0-9-A-Z0-9]*"))
                        res = JSON.parse(xhr.responseText);
                    /*else 
                        window.alert(xhr.responseText);*/
                }

                
                success(res);

            };

            xhr.onerror = function() {

                error(arguments);

            };

            if(typeof params !== 'undefined'){

                var data = JSON.stringify(params);

                xhr.send(data);
            }
            else
                xhr.send();
        }

        function createCORSRequest(url, method) {

            var xhr = new XMLHttpRequest();

            if("withCredentials" in xhr)
                xhr.open(method, url, true);
            else
                xhr = null;

            return xhr;
        }
    };

    /**
     * Returns the route of the API server
     * @author Miguel Celedon
     * @param   {string} route The name of the route to get
     * @returns {string} The URL related to the requested route
     */
    this.getAPIUrl = function(route, params) {
        return window.helper.getAPIUrl(route, params);
    };

    /**
     * @author Miguelcldn
     * @lastmodifiedBy Ricardo Delgado
     * @param {Object} data Post Data
     */
    function exists() { 

        if(window.actualView === 'table'){ 
        
            var group = $("#select-Group").val();
            var layer = $("#select-layer").val();
            var name = $("#imput-Name").val().toLowerCase();
            var type = $("#select-Type").val();
            var location;

            if(!window.TABLE[group].layers[layer])
                return false;
            else
                location = window.TABLE[group].layers[layer].objects;
            

            if(window.fieldsEdit.actualTile){ 

                if(window.fieldsEdit.actualTile.name.toLowerCase() === name.toLowerCase()) 
                    return false;
            }
            
            for(var i = 0; i < location.length; i++) {

                if(location[i].data.name.toLowerCase() === name.toLowerCase() && location[i].data.type === type) {
                    return true;
                }
            }
            
            return false;
        } 
        else{

            return false;
        }
    }
}
