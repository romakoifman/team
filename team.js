function createTeamPresentation() {

    var diameter   = 800;
    var rectWidth  = 150;
    var rectHeight = 14;
    var displayDelay = 1000;
    var ease = "elastic";
    var linkWidth = 1.5;

    d3.json( "data.json", function( data ) {
        var members = [];
        var components = [];
        var connections = [];
        var links = [];
        var highlights = {
            node: null,
            connections: []
        };

        data["members"].forEach( function( d ) {
            members.push( { name : d.name, type: "member", details: d } );
            components.push( d.components );
            connections.push( d.connections );
            d3.merge( [d.components, d.connections ]).forEach( function(o) {
                var inner = d.name.replace( / /g, "-" );
                var outer = o.replace( / /g, "-" );
                links.push( { id: 'l-' + inner + '-to-' + outer, inner: inner, outer: outer } );
            } );
        } );

        // Component&Connection nodes

        components = d3.set( d3.merge( components ) ).values().map( function(d) { return { name:d, type: "component" } } );
        connections = d3.set( d3.merge( connections ) ).values().map( function(d) { return { name:d, type: "connection "} } );

        var components_x = d3.scale.linear()
            .domain([0, components.length ])
            .range([-130 , -40]);

        var connections_x = d3.scale.linear()
            .domain([0, connections.length ])
            .range([130 , 40]);

        components = components.map(function(d, i) {
            d.x = components_x(i);
            d.y = diameter/3;
            return d;
        });

        connections = connections.map(function(d, i) {
            d.x = connections_x(i);
            d.y = diameter/3;
            return d;
        });

        onodesMap = d3.map( d3.merge( [ components, connections ]), function(d) { return d.name.replace( / /g, "-" ) } );

        // Members nodes

        var members_y = d3.scale.linear()
            .domain([0, members.length])
            .range([-(members.length * rectHeight)/2, (members.length * rectHeight)/2]);

        members = members.map( function(d, i) {
            d.x = -(rectWidth / 2);
            d.y = members_y(i) + 2*i;
            return d;
        });

        members = d3.map( members, function(d) { return d.name.replace( / /g, "-" ); } );

        // Visualization

        function showMainTree() {

            var svg = d3.select("#mainTree")
                .append("svg")
                .attr("width", diameter)
                .attr("height", diameter)
                .append("g")
                .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

            var onode = svg.append('g').selectAll(".outer_node")
                .data( onodesMap.entries() )
                .enter().append("g")
                .attr("class", "outer_node")
                .attr("transform", function(d) { return "rotate(" + ( d.value.x - 90 ) + ")translate(" + d.value.y + ")"; })
                .on("mouseover", mouseover)
                .on("mouseout", mouseout);

            onode.append("circle")
                .attr("class", "outer_node")
                .attr("id", function(d) { return d.key })
                .attr("r", 4.5);

            onode.append("circle")
                .attr('r', 20)
                .attr('visibility', 'hidden');

            onode.append("text")
                .attr('id', function(d) { return d.key + '-txt'; })
                .attr("dy", ".31em")
                .attr("text-anchor", function(d) { return d.value.x > 0 ? "start" : "end"; })
                .attr("transform", function(d) { return d.value.x > 0 ? "translate(8)" : "rotate(180)translate(-8)"; })
                .text(function(d) { return d.value.name; });



            function setHighlight( value ) {
                highlights.connections.forEach( function(h) {
                    d3.select( "#" + h ).classed('highlight', value);
                })
            }


            function highlight() {
                setHighlight( true );
            }

            function unhighlight() {
                setHighlight( false );
                highlights = {
                    node: null,
                    connections: []
                };
            }

            function mouseclick(e) {
                window.location.hash = e.value.type + "_" + e.key;
            }

            function mouseout(e) {
                unhighlight();
            }

            function mouseover(e) {
                if (highlights.node === e.key) {
                    return
                }

                unhighlight();
                highlights.node = e;
                highlights.connections = [ e.key ];
                if ( e.value.type == "member")
                    re = "l-" + e.key + "-to-(.*)";
                else
                    re = "l-(.*)-to-" + e.key + "$";

                links.forEach( function(l) {
                    reRes = l.id.match( re );
                    if ( reRes ) {
                        highlights.connections.push( l.id );
                        highlights.connections.push( reRes[1] );
                    }
                })

                highlight();
            }

            var memberNode = svg.append('g').selectAll(".member_node")
                .data(members.entries())
                .enter().append("g")
                .attr("class", "member_node")
    //            .transition().duration( displayDelay ).ease(ease).attr("x", function(Z) {
    //                 return Z.x
    //            }).attr("y", function(Z) {
    //                return Z.y
    //            });
                .attr("transform", function(d, i) { return "translate(" + d.value.x + "," + d.value.y + ")"})
                .on("mouseover", mouseover)
                .on("mouseout", mouseout)
                .on("click", mouseclick);

            memberNode.append('rect')
                .attr('width', rectWidth)
                .attr('height', rectHeight)
                .attr("class", "member_node")
                .attr('id', function(d) { return d.key; })
                .attr('name', function(d) { return d.value.name; });

            memberNode.append("text")
                .attr('text-anchor', 'middle')
                .attr("transform", "translate(" + rectWidth/2 + ", " + rectHeight * .75 + ")")
                .text(function(d) { return d.value.name; });

            // Links

            function projectX(x)
            {
                return ((x - 90) / 180 * Math.PI) - (Math.PI/2);
            }

            var diagonal = d3.svg.diagonal()
                .source(function(d) { return {"x": onodesMap.get( d.outer ).y * Math.cos(projectX(onodesMap.get( d.outer ).x)),
                                              "y": -onodesMap.get( d.outer ).y * Math.sin(projectX(onodesMap.get( d.outer ).x))}; })
                .target(function(d) { return {"x": members.get( d.inner ).y + rectHeight/2,
                                              "y": onodesMap.get( d.outer ).x < 0 ? members.get( d.inner ).x : members.get( d.inner ).x + rectWidth}; })
                .projection(function(d) { return [d.y, d.x]; } );

            var link = svg.append('g').attr('class', 'links').selectAll(".link")
                                      .data(links)
                                      .enter().append("g")
                                      .attr('class', 'link')
                                      .append('path')
                                      .attr('id', function(d) { return d.id })
                                      .attr("d", diagonal);
        }

        function showHashed( hash ) {
            d3.select("#mainTree").style("opacity", 0);
            d3.selectAll("#hash").remove();

            hashDetails = hash.split( "_" );
            console.log( members );

            if ( hashDetails[0] == "members" ) {
                hashElement = members.get( hashDetails[1] )
                root = {}
            }



            var i = 0,
            duration = 750;
            R = 110;
            var margin = { top: 20, right: 120, bottom: 20, left: 120 };
            var height = 800 - margin.top - margin.bottom;

            var tree = d3.layout.tree()
                .size([360, 500])
                .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });


//            var tree = d3.layout.tree().size( [360, diameter / 2 - R] );

            var svg = d3.select("body").append("div")
                                        .attr("id", "hash" )
                                        .append("svg")
                                        .attr("width", diameter )
                                        .attr("height", diameter )
                                        .append("g")
                                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            root = {
                 "name": "flare",
                 "children": [
                    {
                   "name": "analytics2",
                   "children": [
                        {
                   "name": "analytics2-1",
                   "children": [

                        ]
                    },
                   ]
                   },
                   {
                   "name": "analytics3",
                   "children": []
                   },
                   {
                   "name": "analytics4",
                   "children": []
                   },
                   {
                   "name": "analytics5",
                   "children": []
                   },
                   {
                   "name": "analytics6",
                   "children": []
                   },
                  {
                   "name": "analytics",
                   "children": [
//                    {
//                     "name": "cluster",
//                     "children": [
//                      {"name": "AgglomerativeCluster", "size": 3938},
//                      {"name": "CommunityStructure", "size": 3812},
//                      {"name": "MergeEdge", "size": 743}
//                     ]
//                    },
//                    {
//                     "name": "graph",
//                     "children": [
//                      {"name": "BetweennessCentrality", "size": 3534},
//                      {"name": "LinkDistance", "size": 5731}
//                     ]
//                    }
                   ]
                  }
                 ]
                }

            root.x0 = height / 2;
            root.y0 = 0;

            var source = root;
            var nodes = tree.nodes(root).reverse();
            var links = tree.links(nodes);

function project(x, y) {
  var angle = (x - 90) / 180 * Math.PI, radius = y;
  return [radius * Math.cos(angle)+300, radius * Math.sin(angle)+300];
}

var node = svg.selectAll("g.node")
    .data(nodes)
    .enter().append("g")
      .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
      .attr("transform", function(d) { return "translate(" + project(d.x, d.y) + ")"; });

  node.append("circle")
      .attr("r", 4.5);

  node.append("text")
      .attr("dy", ".31em")
      .attr("x", function(d) { return d.x < 180 === !d.children ? 6 : -6; })
      .style("text-anchor", function(d) { return d.x < 180 === !d.children ? "start" : "end"; })
      .attr("transform", function(d) { return "rotate(" + (d.x < 180 ? d.x - 90 : d.x + 90) + ")"; })
      .text(function(d) { return d.name; });







            // Normalize for fixed-depth.
//          nodes.forEach(function(d) { d.y = d.depth * 180; });


//var X = E.selectAll(".node").data(X, u);
//        var Y = X.enter().append("g").attr("transform", function(aa) {
//            var Z = aa.parent ? aa.parent : {
//                xOffset: 0,
//                x: 0,
//                y: 0
//            };
//            return "translate(" + Z.xOffset + ",0)rotate(" + (Z.x - 90) + ")translate(" + Z.y + ")"
//        }).attr("class", "node")


//          // Update the nodes…
//          var node = svg.selectAll("g.node")
//              .data(nodes, function(d) { return d.id || (d.id = ++i); });
//            function click() {}
//          // Enter any new nodes at the parent's previous position.
//          var nodeEnter = node.enter().append("g")
//              .attr("class", "node")
////              .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
//.attr("transform", function(aa) {
//            var Z = aa.parent ? aa.parent : {
//                xOffset: 0,
//                x: 0,
//                y: 0
//            };
//            return "translate(" + 0 + ",0)rotate(" + (Z.x - 90) + ")translate(" + Z.y + ")"
//        })
//              .on("click", click);
//
//          nodeEnter.append("circle")
//              .attr("r", 1e-6)
//              .style("fill", function(d) { return d._children ? "lightsteelblue" : "#000"; });
//
//          nodeEnter.append("text")
//              .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
//              .attr("dy", ".35em")
//              .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
//              .text(function(d) { return d.name; })
//              .style("fill-opacity", 1e-6);
//
//
//        var nodeUpdate = node.transition()
//      .duration(duration);
////      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });
//
//  nodeUpdate.select("circle")
//      .attr("r", 4.5)
//      .style("fill", function(d) { return d._children ? "lightsteelblue" : "#000"; });
//
//  nodeUpdate.select("text")
//      .style("fill-opacity", 1);
//
//var diagonal = d3.svg.diagonal()
//    .projection(function(d) { return [d.y, d.x]; });
//
////var diagonal = d3.svg.diagonal.radial().projection(function(X) {
////        return [X.y, X.x / 180 * Math.PI]
////    });
//
////    var v = d3.svg.line().x(function(X) {
////        return X[0]
////    }).y(function(X) {
////        return X[1]
////    }).interpolate("bundle").tension(0.5);
//
//// Transition exiting nodes to the parent's new position.
//  var nodeExit = node.exit().transition()
//      .duration(duration)
//      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
//      .remove();
//
//  nodeExit.select("circle")
//      .attr("r", 1e-6);
//
//  nodeExit.select("text")
//      .style("fill-opacity", 1e-6);
//
//  // Update the links…
//  var link = svg.selectAll("path.link")
//      .data(links, function(d) { return d.target.id; });
//
//  // Enter any new links at the parent's previous position.
//  link.enter().insert("path", "g")
//      .attr("class", "link")
//      .attr("d", function(d) {
//        var o = {x: source.x0, y: source.y0};
//        return diagonal({source: o, target: o});
//      });
//
//  // Transition links to their new position.
//  link.transition()
//      .duration(duration)
//      .attr("d", diagonal);
//
//  // Transition exiting nodes to the parent's new position.
//  link.exit().transition()
//      .duration(duration)
//      .attr("d", function(d) {
//        var o = {x: source.x, y: source.y};
//        return diagonal({source: o, target: o});
//      })
//      .remove();
//
//  // Stash the old positions for transition.
//  nodes.forEach(function(d) {
//    d.x0 = d.x;
//    d.y0 = d.y;
//  });


        }



        var hash = window.location.hash.substring(1);
        if ( hash ) {
            showHashed( hash );
        } else
            showMainTree();

        window.onhashchange = function() {
            var hash = window.location.hash.substring(1);
            if ( hash )
                showHashed( hash );
            else
            {
                d3.selectAll("#mainTree").style("opacity", 1);
                d3.selectAll("#hash").remove();
            }
        }
    } );
}