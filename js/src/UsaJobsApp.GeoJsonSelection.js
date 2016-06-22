(function () {

    angular.module('UsaJobsApp').service('usStatesGeoJsonSetup', usStatesGeoJsonSetup);
    angular.module('UsaJobsApp').constant('stateSelectStyles', stateSelectStyles());

    usStatesGeoJsonSetup.$inject = ['leaflet', 'eventService', 'usStatesGeoJson', 'stateSelectStyles'];
    function usStatesGeoJsonSetup(leaflet, events, usStates, stateSelectStyles) {
        return function (mapRef) {
            // closure reference for iterators and callbacks
            var map = mapRef,
                statesGeoJson = this.states = leaflet.geoJson(usStates, {
                    style: stateSelectStyles.default,
                    onEachFeature: featureConfig
                });
            statesGeoJson.addTo(map);
            statesGeoJson.bringToBack();

            statesGeoJson.selectedState = '';

            // Remove state features where there are no job results
            events.jobs.onAvailable(function (e, data) {
                var states = [];
                angular.forEach(data.states, function (state) {
                    states.push(state.name);
                });
                removeOtherStates(states);
            });

            // Clear state selection when filter is cleared
            events.filters.onClear(function () {
                statesGeoJson.selectedState = '';
                stateSelectStyles.onClearFn(statesGeoJson._layers);
            });

            // focus on state when selected from dropdown list
            events.filters.onStateSelectionFromDropdown(function (e, state) {
                if (state === null) {
                    statesGeoJson.selectedState = '';
                    stateSelectStyles.onClearFn(statesGeoJson._layers);
                    map.resetMapView();
                } else {
                    statesGeoJson.selectedState = state.name;
                    stateSelectStyles.clickFn(statesGeoJson._layers,
                        statesGeoJson.selectedState);
                    angular.forEach(statesGeoJson._layers, function (layer) {
                        if (layer.name === statesGeoJson.selectedState) {
                            map.fitBounds(layer.getBounds());
                        }
                    });
                }
            });

            // remove state features after zooming out past level 3
            // intended to reduce visual clutter and difficult-to-select features
            map.on('zoomend', function (e) {
                if (e.target.getZoom() < 3) {
                    map.removeLayer(statesGeoJson);
                } else if (!map.hasLayer(statesGeoJson)) {
                    statesGeoJson.addTo(map);
                }
            });

            /**
             * Set initial State feature settings and style, set interaction
             * events.
             * @param feature
             * @param layer
             */
            function featureConfig(feature, layer) {
                // scope reference for iterator Fns
                var self = layer;
                // attach state name to feature layer
                layer.name = feature.properties.NAME;

                layer.feature = feature;

                // set default style
                layer.setStyle(stateSelectStyles.default);

                // set layer click event
                layer.on('click', function (evt) {
                    // trigger `State` filter change
                    events.filters.setStateFilter(evt.target.name);
                    // set selected state
                    statesGeoJson.selectedState = evt.target.name;
                    // run `Click` styling function
                    stateSelectStyles.clickFn(statesGeoJson._layers,
                        statesGeoJson.selectedState);
                    // move state into view
                    map.fitBounds(self.getBounds());

                });

                // set layer hover event
                layer.on('mouseover', function (evt) {
                    stateSelectStyles.mouseOverFn(evt.target, statesGeoJson.selectedState);
                });
                layer.on('mouseout', function (evt) {
                    stateSelectStyles.mouseOutFn(evt.target, statesGeoJson.selectedState);
                });
            }

            /**
             * @public
             * Remove any state whose name is NOT in the provided array.
             * Intended to remove states with no job results.
             * @param stateNameArr
             */
            function removeOtherStates(stateNameArr) {
                angular.forEach(statesGeoJson._layers, function (layer) {
                    if (stateNameArr.indexOf(layer.name) === -1) {
                        statesGeoJson.removeLayer(layer);
                    }
                });


            }
        }
    }

    /**
     * Return feature style info and behavior to Constant service
     * @returns {{default: {color: string, weight: number, opacity: number, fillOpacity: number, fillColor: string}, selected: {color: string, weight: number, opacity: number, fillColor: string, fillOpacity: number}, hover: {color: string, weight: number, opacity: number, fillOpacity: number, fillColor: string}, clickFn: clickFn, mouseOverFn: mouseOverFn, mouseOutFn: mouseOutFn, onClearFn: onClearFn}}
     */
    function stateSelectStyles() {
        return {
            default: {
                color: "#C4721F",
                weight: 0.25,
                opacity: 0.25,
                fillOpacity: 0.1,
                fillColor: '#C4721F'
            },
            selected: {
                color: "#267FCA",
                weight: 4,
                opacity: 1,
                fillColor: "#267FCA",
                fillOpacity: 0.07
            },
            hover: {
                color: "#C4721F",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.1,
                fillColor: '#C4721F'
            },
            clickFn: function (layers, selectedName) {
                var self = this;
                angular.forEach(layers, function (layer) {
                    if (layer.name !== selectedName) {
                        layer.setStyle(self.default)
                    } else if (layer.name === selectedName) {
                        layer.setStyle(self.selected)
                    }
                });
            },
            mouseOverFn: function (layer, selectedName) {
                if (layer.name !== selectedName) layer.setStyle(this.hover);
            },
            mouseOutFn: function (layer, selectedName) {
                if (layer.name !== selectedName) layer.setStyle(this.default);
            },
            onClearFn: function (layers) {
                var self = this;
                angular.forEach(layers, function (layer) {
                    layer.setStyle(self.default)
                });
            }
        }
    }

})();

