module.exports = function (RED) {
	"use strict";

  var HTML = String.raw`
  <div id="smxvis_{{$id}}">
  Test
  </div>
  `;

var cache = {};

  var ui = undefined;

	function DashboardNode(config) {
        try {
            var node = this;
            if(ui === undefined) {
                // load Dashboard API
                ui = RED.require("node-red-dashboard")(RED);
            }
            RED.nodes.createNode(this, config);

            var theme = ui.getTheme();

            // create new widget
            var done = ui.addWidget({
                node: node,
                format: HTML,
                templateScope: "local",
                group: config.group,
                order: config.order,
                width: config.width,
                height: config.height,
                emitOnlyNewValues: false,
                forwardInputMessages: false,
                storeFrontEndInputAsState: false,
                persistantFrontEndValue: true,
                convert: function(payload, oldValue, msg, step) {
                    let cached = cache[node.id] ??= {};
                    var toEmit;
                    var toStore;
                    if (msg.topic == "svg")
                    {
                        cached["svg"] = payload;
                        // only emit new SVG
                        toEmit = {
                            "svg": cached["svg"]
                        };
                    }
                    else if (msg.topic == "transition")
                    {
                        cached["transition"] = payload;
                        // only emit transition
                        toEmit = {
                            "transition": cached["transition"]
                        };
                    }

                    // always store the full picture to send it on reconnect
                    toStore = cached;

                    return {
                        newPoint: toEmit, // better names from dasboard's ui.js (after beforeEmit)
                        updatedValues: toStore, // better names from dashboard's ui.js (after beforeEmit)
                        update: true
                    };
                },
                // convertBack: function (value) {
                //     return value;
                // },
                // needs beforeSend to message contents to be sent back to runtime
                // beforeSend: function (msg, orig) {
                //     if (orig) {
                //         return orig.msg;
                //     }
                // },
                beforeEmit: function(msg, value) {
                    // make msg.payload accessible as msg.items in widget
                    // return { msg: { items: value } };
                    return { msg: value};
                },
                // initialize angular scope object
                initController: function($scope, events) {
                    // $scope.value = false;
                    // $scope.click = function (val) {
                    //     $scope.send({payload: val});
                    // };

                    $scope.$watch('msg', function(msg) {
                        debugger;
                      if (!msg) return;
                      if (msg.svg) {
                        let element = document.getElementById("smxvis_"+$scope.$id);
                        if (!element.shadowRoot)
                          element.attachShadow({ mode:"open" });
                        let root = element.shadowRoot;

                        root.innerHTML = msg.svg;
                        root.firstChild.setAttribute("fill", getComputedStyle(element).getPropertyValue('--nr-dashboard-widgetTextColor'));
                        root.querySelector("#graph0 polygon").setAttribute("fill", getComputedStyle(element).getPropertyValue('--nr-dashboard-groupBackgroundColor'));

                        let elements = $('svg g.graph g:not([class="edge"])', root);
                        $(elements).children('*[stroke][stroke!="transparent"][stroke!="none"]').attr('stroke',getComputedStyle(element).getPropertyValue('--nr-dashboard-widgetTextColor'));
                      }
                      if (msg.transition) {
                        // testAnimate(scope.$id, msg.payload, scope);

                        // Recurse into state
                        function getStatepaths(state, parentState) {
                            if( typeof state === "string" ) return [(parentState ? parentState + "." + state : state)];

                            if( !state ) return parentState;

                            let substates = Object.keys(state);

                            let statePaths = [];
                            for( let substate of substates ) {
                                let substatePath = parentState ? parentState + "." + substate : substate;
                                if( state[substate] ) statePaths.push(substatePath);
                                statePaths = statePaths.concat(getStatepaths(state[substate], substatePath));
                            }
                            //console.log(statePaths)
                            return statePaths;
                        }

                        let activeStates = getStatepaths(msg.transition.state.state);

                        let element = document.getElementById("smxvis_"+$scope.$id);
                        let root = element.shadowRoot;

                        // Reset all other states
                        let elements = $('svg g.graph g:not([class="edge"])', root);

                        elements.children('*[stroke][stroke!="transparent"][stroke!="none"]').attr('stroke',getComputedStyle(element).getPropertyValue('--nr-dashboard-widgetTextColor'));

                        // Style active states
                        for( let activeState of activeStates ) {
                            elements
                                .has('title:contains(' + msg.transition.machineId + '.' + activeState + '/)')
                                .has('title:not(:contains(/initial))')
                                .children('*[stroke][stroke!="transparent"][stroke!="none"]')
                                .attr('stroke','#FF0000');
                        }

                        // set background color
                        $("#graph0 polygon", root).attr("fill", getComputedStyle(element).getPropertyValue('--nr-dashboard-groupBackgroundColor'));

                      }
                    });
                }
            });
        }
        catch (e) {
            console.log(e);
        }
        node.on("close", done);
	}
	RED.nodes.registerType('ui_smxvis', DashboardNode);
};


