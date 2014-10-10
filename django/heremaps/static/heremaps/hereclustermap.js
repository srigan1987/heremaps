// Custom view tutorial
define(function(require, exports, module) {
    // Load requirements
    var _ = require('underscore');
    var mvc = require('splunkjs/mvc');
    var SimpleSplunkView = require('splunkjs/mvc/simplesplunkview');
    var Messages = require("splunkjs/mvc/messages");
    var utils = require('splunkjs/mvc/utils');
    
    Messages.messages['map-error']={icon: "warning-sign",level: "error",message: _("Map loading failed").t()};

    // Define the custom view class
    var HereClusterMap = SimpleSplunkView.extend({
        className: "hereclustermap",
        outputMode: 'json',
        svgMarkup: '<svg width="26" height="26" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg"><circle opacity="0.9" id="svg_1" r="12" cy="13" cx="13" stroke-width="2" stroke="#333333" fill="#f5f5f5"/><text xml:space="preserve" text-anchor="middle" id="svg_2" y="18.5" x="13" stroke-width="0" font-size="10pt" font-weight="bold" font-family="Roboto" stroke="#000000" fill="#000000">${TEXT}</text></svg>',
        
        options: {
            center: "0,0",
            zoom: 2,
            height: "400px",
            app_id:"",
            app_code:"",
            min_weight: 1,
            eps: 32,
            theme: undefined
        },
        
        initialize: function(){
            
            this.configure();

            this.$el.html(
                    '<div class="heremapwrapper" style="height:'+this.options.height+'">'+
                    '<div id="'+this.id+'-msg"></div>'+
                    '<div style="height: '+this.options.height+'; min-height:'+this.options.height+'; min-width:100%;" id="'+this.id+'-map" class="mapcontainer"></div>'+
                    '</div>')
                    
            this.message = this.$('#'+this.id+'-msg');

            this._get_app_id();
            
            this._viz = null;
            this._data = null;
            this.bindToComponentSetting('managerid', this._onManagerChange, this);
            
            // If we don't have a manager by this point, then we're going to
            // kick the manager change machinery so that it does whatever is
            // necessary when no manager is present.
            if (!this.manager) {
                this._onManagerChange(mvc.Components, null);
            }
        },
        
        createView: function(){
            return this;
        },
        
        updateView: function(viz, data) {
            if(this.map){
                this.clearView();

                var noiseSvg = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" width="20px"><circle cx="5px" cy="5px" r="5px" fill="green" /></svg>';
                var noiseIcon = new H.map.Icon(noiseSvg, {size: { w: 20, h: 20 }, anchor: { x: 10, y: 10}});

                // Create an SVG template for the cluster icon:
                var clusterSvgTemplate =  '<svg xmlns="http://www.w3.org/2000/svg" height="50px" width="50px"><circle cx="25px" cy="25px" r="{radius}" fill="red" /></svg>';

                var dataPoints = [];
                for(var i=0;i<data.length;i++){
                    dataPoints.push(new H.clustering.DataPoint(data[i]["lat"],data[i]["lng"],1,data[i]));
                }

                var options={clusteringOptions: {
                        minWeight: this.min_weight,
                        eps: this.eps
                    }}
                if(this.options.theme){
                    options["theme"]=this.options.theme
                }
                var clusteringProvider = new H.clustering.Provider(dataPoints, options);

                //clustering should be used with ObjectLayer
                var clusteringLayer = new H.map.layer.ObjectLayer(clusteringProvider);
                this.map.addLayer(clusteringLayer);
            }
            this._clearMessage();
        },
        
        displayMessage: function(info){
            Messages.render(info, this.message);
            this.message.show();
            return this;
        },
        
        createMap: function(){
            try {
                var platform = new H.service.Platform({
                    app_id: this.options.app_id,
                    app_code: this.options.app_code
                });
                // Obtain the default map types from the platform object:
                var defaultLayers = platform.createDefaultLayers();
                // Instantiate (and display) a map object:
                var center={lat:0,lng:0};
                try{
                    center={lat:this.options.center.split(",")[0],lng:this.options.center.split(",")[1]}
                }catch(err){
                    console.error("Could not parse center lat,lng combination")
                }
                this.map = new H.Map(document.getElementById(this.id+'-map'),defaultLayers.terrain.map,{zoom:this.options.zoom,center:center});
                
                var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));
                var ui=H.ui.UI.createDefault(this.map,defaultLayers)
                ui.removeControl('mapsettings');
                
                var aerialMapTileService = platform.getMapTileService({type: 'aerial'});
                var terrainMap = aerialMapTileService.createTileLayer('maptile','terrain.day',256,'png8');
                this.map.setBaseLayer(terrainMap);
            }catch(err){
                this._errorMessage();
                console.error("Error loading map components")
                console.error(err.stack)
            }
        },

        _get_app_id: function(){
            var map=this;
            mvc.createService().get("/servicesNS/nobody/heremaps/configs/conf-setup/heremaps",{},function(err,response) {
                if(err){
                    console.error("Error fetching app_id");
                    return;
                }
                content=response.data.entry[0].content;

                if(content.app_id.trim()=="" || content.app_code.trim()==""){
                    console.error("No app_id & app_code found, make sure to set on in the heremaps setup screen");
                    map._errorMessage();
                }else{
                    map.options.app_id=content.app_id.trim();
                    map.options.app_code=content.app_code.trim();
                    map.createMap();
                }
            });
        },

        _clearMessage: function(){
            if(this.map){
                this.message.hide();
            }else{
                this._errorMessage();
            }
        },
        
        _errorMessage: function(){
            Messages.render('map-error',this.message);
            this.message.show();
        },
        
        _getSvgMarker: function(result){
            var value=("value" in result) ? result["value"] : ""
            return this.svgMarkup.replace('${TEXT}',value)
        },

        clearView: function(){
            if(this.map){
                this.map.removeObjects(this.map.getObjects());
            }
        },
        
    });

    return HereClusterMap;
});