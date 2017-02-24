function createTeamPresentation() {

    var diameter   = 800;
    var rectWidth  = 150;
    var rectHeight = 14;
    var displayDelay = 1000;
    var ease = "elastic";
    var linkWidth = 1.5;

    d3.json( "data.json", function( jsonData ) {
        var members = [];
        var components = [];
        var connections = [];
        var links = [];
        var highlights = {
            node: null,
            connections: []
        };

        for ( name in jsonData["members"] ) {
            var d = jsonData["members"][ name ];
            members.push( { name : name, type: "members" } );
            components.push( d.components );
            connections.push( d.connections );
            d3.merge( [d.components, d.connections ]).forEach( function(o) {
                var inner = name.replace( / /g, "-" );
                var outer = o.replace( / /g, "-" );
                links.push( { id: 'l-' + inner + '-to-' + outer, inner: inner, outer: outer } );
            } );
        }

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

            d3.selectAll("#hash").remove();

            var svg = d3.select("body")
                .append( "div")
                .attr( "id", "mainTree")
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
                if ( e.value.type == "members")
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
                .text(function(d) { return jsonData["members"][ d.value.name ].fullname });

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
            d3.select("#mainTree").remove();
            d3.selectAll("#hash").remove();

            hashDetails = hash.split( "_" );
            if ( !( hashDetails[0] in jsonData ) || !( hashDetails[1] in jsonData[ hashDetails[0]] ) )
                return;

            var root = { name : jsonData[hashDetails[0]][hashDetails[1]].fullname };
            if ( hashDetails[0] == "members" ) {
                var children = [];
                var connections = jsonData[hashDetails[0]][hashDetails[1]].connections;
                for ( key in connections ) {
                    var connectionName = connections[key];
                    if ( connectionName in jsonData["connections"]) {
                        var business = jsonData["connections"][connectionName].business;
                    }
                    else {
                        var business = "unset";
                    }

                    children.push( { name: business, children :
                                        [ { name: connectionName, children : [] } ] } );
                }
                root[ 'children'] = children;
            }

            var i = 0,
            duration = 750;
            R = 110;
            var margin = { top: 20, right: 120, bottom: 20, left: 120 };
            var height = 800 - margin.top - margin.bottom;

            var tree = d3.layout.tree()
                .size([360, diameter / 2 - R])
                .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

            var svg = d3.select("body").append("div")
                                        .attr("id", "hash" )
                                        .append("svg")
                                        .attr("width", diameter )
                                        .attr("height", diameter )
                                        .append("g")
                                        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var source = root;
            var nodes = tree.nodes(root).reverse();
            var links = tree.links(nodes);

            function project(x, y) {
              var angle = (x - 90) / 180 * Math.PI, radius = y;
              return [radius * Math.cos(angle)+300, radius * Math.sin(angle)+300];
            }

//            function project(x, y) {
//                var angle = (x - 90) / 180 * Math.PI, radius = y;
//                return [radius * Math.cos(angle), radius * Math.sin(angle)];
//            }

              var link = svg.selectAll(".link")
                            .data(nodes)
                            .enter().append("path")
                              .attr("class", "link")
                              .attr("d", function(d) {
                                if (d.parent === undefined) {
                                    return "M" + project(d.x, d.y);
                                }

                                return "M" + project(d.x, d.y)
                                    + "C" + project(d.x, (d.y + d.parent.y) / 2)
                                    + " " + project(d.parent.x, (d.y + d.parent.y) / 2)
                                    + " " + project(d.parent.x, d.parent.y);
                              });

            var node = svg.selectAll("g.node")
                .data(nodes)
                .enter().append("g")
                  .attr("class", function(d) { return "node" + (d.children ? " node--internal" : " node--leaf"); })
                  .attr("transform", function(d) { return "translate(" + project(d.x, d.y) + ")"; });

              node.append("circle")
                  .attr("r", function(Z) {
                        if ( Z.parent === undefined ) {
                            return 100
                        } else {
                            return 4.5
                        }
                    });

              node.append("text")
                  .attr("dy", ".31em")
                  .attr("x", function(d) { return d.x < 180 === !d.children ? 6 : -6; })
                  .attr("font-size", function(d) {
                        if (d.parent === undefined) {
                            return 20
                        } else {
                            return 15
                        }
                    })
                  .style("text-anchor", function(d) {
                    if (d.parent === undefined) {
                        return "middle"
                    }
                    return d.x < 180 === !d.children ? "start" : "end"; })
                  .attr("transform", function(d) {
                     if (d.parent === undefined) {
                        return null
                     }
                     return "rotate(" + (d.x < 180 ? d.x - 90 : d.x + 90) + ")"; })
                  .text(function(d) { return d.name; });
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
                showMainTree();
            }
        }
    } );
}