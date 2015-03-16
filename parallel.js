queue()
  .defer(d3.csv, "data/food.zscore.csv")
  .defer(d3.csv, "data/all_foods.csv")
  .defer(d3.csv, "data/visit_percentage.csv")
  .await(ready);

var width = document.body.clientWidth,
    height = 300,
    timeline_height = 120;

var m = [60, 0, 10, 0],
    w = width - m[1] - m[3],
    h = height - m[0] - m[2],
    margin = {top: 60, right: 0, bottom: 10, left: 0},
    xscale = d3.scale.ordinal().rangePoints([0, w], 1),
    x = d3.scale.ordinal().range([0, w]),
    yscale = {},
    dragging = {},
    line = d3.svg.line(),
    formatPercent = d3.format(".0%"),
    axis = d3.svg.axis().orient("left").ticks(1+height/50),
    data,
    foreground,
    background,
    highlighted,
    dimensions,
    legend,
    subcategories,
    render_speed = 50,
    brush_count = 0,
    excluded_groups = [];

var colors = {
  "Dairy": [27,158,119],
  "Grain": [217,95,2],
  "Meat": [117,112,179],
  "Flavoring/Other": [231,41,138],
  "Fruits and Vegetables": [102,166,30]
};

var subcolors = {
  "Acid": [231,41,138],
  "Cooking oil": [231,41,138],
  "Dairy": [27,158,119],
  "Eggs": [117,112,179],
  "Fish": [117,112,179],
  "Fruit": [102,166,30],
  "Grain": [217,95,2],
  "Honey": [231,41,138],
  "Meat": [117,112,179],
  "Nuts": [102,166,30],
  "nuts": [102,166,30],
  "Olives": [102,166,30],
  "Salt": [231,41,138],
  "Seafood": [117,112,179],
  "Seasoning": [102,166,30],
  "Seeds": [102,166,30],
  "Spice": [231,41,138],
  "Sugar": [231,41,138],
  "Vegetable": [102,166,30]
}

// Scale chart and canvas height
d3.select("#chart")
    .style("height", (h + m[0] + m[2]) + "px");

d3.select("#timeline_chart")
  .style("height", "120px")

d3.selectAll("canvas")
    .attr("width", w)
    .attr("height", h)
    .style("padding", m.join("px ") + "px");

// Foreground canvas for primary view
foreground = document.getElementById('foreground').getContext('2d');
foreground.globalCompositeOperation = "destination-over";
foreground.strokeStyle = "rgba(0,100,160,0.5)";
foreground.lineWidth = 1.7;
foreground.fillText("Loading...",w/2,h/2);

// Highlight canvas for temporary interactions
highlighted = document.getElementById('highlight').getContext('2d');
highlighted.strokeStyle = "rgba(0,100,160,1)";
highlighted.lineWidth = 4;

// Background canvas
background = document.getElementById('background').getContext('2d');
background.strokeStyle = "rgba(0,100,160,0.1)";
background.lineWidth = 1.7;

// SVG for ticks, labels, and interactions
var svg = d3.select("#parallel_svg").append("svg")
    .attr("width", w + m[1] + m[3])
    .attr("height", h + m[0] + m[2])
  .append("g")
    .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

// Load the data and visualization
// d3.csv("data/food.zscore.csv", function(zscore_data) {
function ready(error, zscore_data, raw_data) {

  if (error) {
    console.log(error);
  }

  // var max = d3.max(zscore_data, function(d) { return d["1657"]; });
  // var min = d3.min(zscore_data, function(d) { return d["1657"]; });
  // console.log(max)
  // console.log(min)

  // Convert quantitative scales to floats
  data = zscore_data.map(function(d) {
    for (var k in d) {
      if (!_.isNaN(zscore_data[0][k] - 0) && k != 'subcategory') {
        d[k] = parseFloat(d[k]) || 0;
      }
    };
    return d;
  });

  // Extract the list of numerical dimensions and create a scale for each
  xscale.domain(dimensions = d3.keys(data[0]).filter(function(k) {
    // Filter out all but the years (_.isNumber) and set the domain for y-axis
      return (_.isNumber(data[0][k])) && (yscale[k] = d3.scale.linear()
    .domain([-2,4])
    .range([h, 0]));
  }).sort());

  // add a group element for each dimension
  var g = svg.selectAll(".dimension")
      .data(dimensions)
    .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + xscale(d) + ")"; });

  // add axis and title
  g.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0,0)")
      .each(function(d) { d3.select(this).call(axis.scale(yscale[d])); })
    .append("text")
      .attr("text-anchor", "middle")
      .attr("y", function(d,i) { return i%2 == 0 ? -14 : -30 } )
      .attr("x", 0)
      .attr("class", "label")
      .text(String);

  // add a brush for each axis
  g.append("g")
      .attr("class", "brush")
      .each(function(d) { d3.select(this).call(yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush)); })
    .selectAll("rect")
      .style("visibility", null)
      .attr("x", -23)
      .attr("width", 36)
      .append("title")
        .text("Click and drag up or down to brush along this axis");

  g.selectAll(".extent")
      .append("title")
        .text("Drag or resize this filter");

  /**
  * Tabulate data
  */
  var columns = ["translation","category","macrocategory","subcategory","unit of measure","min","max","mean","sparkline","1641","1644","1645","1646","1648","1656","1657","1659","1662","1663","1664","1665","1668","1670","1671","1672","1673","1674","1675","1676","1677","1678","1679","1680","1681","1682","1683","1684","1685","1686","1687","1688"]

  var table = d3.select("#foods_table").append("table"),
      thead = table.append("thead"),
      tbody = table.append("tbody");

  thead.append("tr")
    .selectAll("th")
    .data(columns)
  .enter().append("th")
    .text(function(column) { return column; });

  rows = tbody.selectAll("tr")
    .data(zscore_data)
  .enter().append("tr")
    .style("display", null)
    .on("mouseover", table_highlight)
    .on("mouseout", table_unhighlight);

  cells = rows.selectAll("td")
    .data(function(row) {
        return columns.map(function(column) {
          return {column: column, value: row[column]};
        });
      })
  .enter().append("td")
    .html(function(d,i) { return d.value; });

  thead.selectAll("tr").append("th").text('Sparklines');
  rows.selectAll("td.graph")
    .data(function(d,i) { return [d.value]; })
  .enter().append("td")
    .attr("class","graph")
    //.each(sparkline);

  legend = create_legend(colors,brush);
  subcategories = create_subcategories(subcolors, brush);

  brush();
};

function create_legend(colors,brush) {
  // create legend
  var legend_data = d3.select("#legend")
    .html("")
    .selectAll(".legend-row")
    .data( _.keys(colors).sort() )

  // filter by group
  var legend = legend_data
    .enter().append("div")
      .attr("title", "Hide group")
      .on("click", function(d) {
        // toggle food group
        if (_.contains(excluded_groups, d)) {
          d3.select(this).attr("title", "Hide group")
          excluded_groups = _.difference(excluded_groups,[d]);
          brush();
        } else {
          d3.select(this).attr("title", "Show group")
          excluded_groups.push(d);
          brush();
        }
      });

  legend
    .append("span")
    .style("background", function(d,i) { return color(d,0.85)})
    .attr("class", "color-bar");

  legend
    .append("span")
    .attr("class", "tally")
    .text(function(d,i) { return 0});

  legend
    .append("span")
    .text(function(d,i) { return " " + d});

  return legend;
}

function create_subcategories(subcolors,brush) {
  // create legend
  var categories_data = d3.select("#subcategories")
  .html("")
  .selectAll(".subcategory-row")
  .data( _.keys(subcolors).sort() )

  // filter by group
  var subcategorylegend = categories_data
  .enter().append("div")
  .attr("title", "Hide group")
  .on("click", function(d) {
    // toggle food group
    if (_.contains(excluded_groups, d)) {
      d3.select(this).attr("title", "Hide group")
      excluded_groups = _.difference(excluded_groups,[d]);
      brush();
    } else {
      d3.select(this).attr("title", "Show group")
      excluded_groups.push(d);
      brush();
    }
  });

  subcategorylegend
  .append("span")
  .style("background", function(d,i) { return colorsub(d,0.85)})
  // .attr("class", "color-bar"); // turn this back on to turn on the barchart view

  subcategorylegend
  .append("span")
  .attr("class", "tally")
  .text(function(d,i) { return 0});

  subcategorylegend
  .append("span")
  .text(function(d,i) { return " " + d});

  return subcategorylegend;
}

// render polylines i to i+render_speed
function render_range(selection, i, max, opacity) {
  selection.slice(i,max).forEach(function(d) {
    path(d, foreground, color(d.macrocategory,opacity));
  });
};

// Adjusts rendering speed
function optimize(timer) {
  var delta = (new Date()).getTime() - timer;
  render_speed = Math.max(Math.ceil(render_speed * 30 / delta), 8);
  render_speed = Math.min(render_speed, 300);
  return (new Date()).getTime();
}

// Feedback on rendering progress
function render_stats(i,n,render_speed) {
  d3.select("#rendered-count").text(i);
  d3.select("#rendered-bar")
    .style("width", (100*i/n) + "%");
  d3.select("#render-speed").text(render_speed);
}

// Feedback on selection
// function selection_stats(opacity, n, total) {
//   // d3.select("#data-count").text(total);
//   // d3.select("#selected-count").text(n);
//   // d3.select("#selected-bar").style("width", (100*n/total) + "%");
//   d3.select("#opacity").text((""+(opacity*100)).slice(0,4) + "%");
// }

// Highlighting/unlighting lines
function highlight(d) {
  d3.select("#foreground").style("opacity", "0.25");
  d3.selectAll(".legend-row").style("opacity", function(p) { return (d.macrocategory == p) ? null : "0.3" });
  path(d, highlighted, color(d.macrocategory,1));
  d3.selectAll(".legend-row").style("opacity", function(p) { return (d.category == p) ? null : "0.3" });
  path(d, highlighted, color(d.category,1));
}

function unhighlight() {
  d3.select("#foreground").style("opacity", null);
  d3.selectAll(".legend-row").style("opacity", null);
  highlighted.clearRect(0,0,w,h);
}

function table_highlight(d) {
  d3.select("#foreground").style("opacity", "0.25");
  path(d, highlighted, color(d.macrocategory,1));
  path(d, highlighted, color(d.category,1));
}

function table_unhighlight() {
  d3.select("#foreground").style("opacity", null);
  highlighted.clearRect(0,0,w,h);
}

function path(d, ctx, color) {
  if (color) ctx.strokeStyle = color;
  ctx.beginPath();
  var x0 = xscale(0)-15,
      y0 = yscale[dimensions[0]](d[dimensions[0]]);   // left edge
  ctx.moveTo(x0,y0);
  dimensions.map(function(p,i) {
    var x = xscale(p),
        y = yscale[p](d[p]);
    var cp1x = x - 0.88*(x-x0);
    var cp1y = y0;
    var cp2x = x - 0.12*(x-x0);
    var cp2y = y;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    x0 = x;
    y0 = y;
  });
  ctx.lineTo(x0+15, y0);                               // right edge
  ctx.stroke();
}

function color(d,a) {
  var c = colors[d];
  return ["rgba(",c[0],",",c[1],",",c[2],",",a,")"].join("");
}

function colorsub(d,a) {
  var c = subcolors[d];
  return ["rgba(",c[0],",",c[1],",",c[2],",",a,")"].join("");
}

// Brush, toggling the display of foreground lines
function brush() {
  brush_count++;
  var actives = dimensions.filter(function(p) { return !yscale[p].brush.empty(); }),
      extents = actives.map(function(p) { return yscale[p].brush.extent(); });

  // bold dimensions with label
  d3.selectAll('.label')
    .style("font-weight", function(dimension) {
      if (_.include(actives, dimension)) return "bold";
      return null;
  });

  // get lines within extents
  var selected = [];
  data
    .filter(function(d) {
      return !_.contains(excluded_groups, d.macrocategory);
    })
    .map(function(d) {
      return actives.every(function(p, dimension) {
        return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
      }) ? selected.push(d) : null;
    });

  // free text search
  var query = d3.select("#search")[0][0].value;
  if (query.length > 0) {
    selected = search(selected, query);
  }

  // update table on brush
  rows
    .style("display", function(d) {
      return actives.every(function(p ,i) {
        return extents[i][0] <= d[p] && d[p] <= extents[i][1];
      }) ? null : "none";
    })

  // total by food group
  var tallies = _(selected)
    .groupBy(function(d) { return d.macrocategory; })

  var subcategoryTallies = _(selected)
    .groupBy(function(d) { return d.category; })

  // include empty groups
  _(colors).each(function(v,k) { tallies[k] = tallies[k] || []; });
  _(subcolors).each(function(v,k) { subcategoryTallies[k] = subcategoryTallies[k] || []; });

  legend
    .attr("class", function(d) {
      return (tallies[d].length > 0)
           ? "legend-row"
           : "legend-row off";
    });

  legend.selectAll(".color-bar")
    .style("width", "8px"); //function(d) {
      // return Math.ceil(400 * tallies[d].length / data.length) + "px"
    // });

  legend.selectAll(".tally")
    .text(function(d,i) { return tallies[d].length });

  subcategories
    .attr("class", function(d) {
      return (subcategoryTallies[d].length > 0)
      ? "legend-row"
      : "legend-row off";
    });

  subcategories.selectAll(".color-bar")
    .style("width", "8px"); //function(d) {
      // return Math.ceil(600*subcategoryTallies[d].length/data.length) + "px"
    // });

  subcategories.selectAll(".tally")
    .text(function(d,i) { return subcategoryTallies[d].length });

  // render selected lines
  paths(selected, foreground, brush_count, true);

  // console.log(selected);
}

// render polylines on canvas
function paths(selected, ctx, count) {
  var n = selected.length,
      i = 0,
      opacity = d3.min([2/Math.pow(n,0.3),1]),
      timer = (new Date()).getTime();

  // selection_stats(opacity, n, data.length)

  shuffled_data = _.shuffle(selected);

  // data_table(shuffled_data.slice(0,25));

  ctx.clearRect(0,0,w+1,h+1);

  // render all lines until finished or a new brush event
  function animloop(){
    if (i >= n || count < brush_count) return true;
    var max = d3.min([i+render_speed, n]);
    render_range(shuffled_data, i, max, opacity);
    render_stats(max,n,render_speed);
    i = max;
    timer = optimize(timer);  // adjust render_speed
  };

  d3.timer(animloop);
}

// rescale to new dataset domain
function rescale() {
  // reset yscales, preserving inverted state
  dimensions.forEach(function(d,i) {
    if (yscale[d].inverted) {
      yscale[d] = d3.scale.linear()
          .domain(d3.extent(data, function(p) { return +p[d]; }))
          .range([0, h]);
      yscale[d].inverted = true;
    } else {
      yscale[d] = d3.scale.linear()
          .domain(d3.extent(data, function(p) { return +p[d]; }))
          .range([h, 0]);
    }
  });

  // update_ticks();

  // Render selected data
  paths(data, foreground, brush_count);
}

// grab polylines in extents
function actives() {
  var actives = dimensions.filter(function(p) { return !yscale[p].brush.empty(); }),
      extents = actives.map(function(p) { return yscale[p].brush.extent(); });

  // filter extents
  var selected = [];
  data
    .filter(function(d) {
      return !_.contains(excluded_groups, d.macrocategory);
    })
    .filter(function(d) {
      return !_.contains(excluded_groups, d.category);
    })
    .map(function(d) {
    return actives.every(function(p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? selected.push(d) : null;
  });

  // free text search
  var query = d3.select("#search")[0][0].value;
  if (query > 0) {
    selected = search(selected, query);
  }

  return selected;
}

d3.select("#search").on("keyup", brush);

function search(selection,str) {
  pattern = new RegExp(str,"i")
  return _(selection).filter(function(d) { return pattern.exec(d.translation); });
}

function resetFoods(d) {
  d3.selectAll(".legend-row").attr("Show group");
  excluded_groups.push(d);
  brush();
}
/*
function sparkline(fooddata) {
  var width = 100,
      height = 20;

  var data= [];
  for (i = 0; i < fooddata.length; i++) {
    data[i] = {
      'x': i,
      'y': +fooddata[i]
    }
  }

  var x = d3.scale.linear()
    .range([0, width - 10])
    .domain([0,5]);

  var y = d3.scale.linear()
    .range([height, 0])
    .domain([0,10]);

  var line = d3.svg.line()
    .x(function(d) { return x(d.x)})
    .y(function(d) { return y(d.y)});

  d3.select(this).append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('path')
    .attr('class', 'line')
  .datum(zscore_data)
    .attr('d', line);
}
*/

/*
 * Timeline
 */

var time_scale_x = d3.scale.ordinal()
     .rangeRoundBands([0, width], .1);

 var time_scale_y = d3.scale.linear()
     .range([height, 0]);

 var time_x_axis = d3.svg.axis()
     .scale(time_scale_x)
     .orient("bottom");

 var time_y_axis = d3.svg.axis()
     .scale(time_scale_y)
     .orient("left")
     .ticks(10, "%");

 var chart_svg = d3.select("#timeline").append("svg")
     .attr("width", width + margin.left + margin.right)
     .attr("height", timeline_height + margin.top + margin.bottom)
   .append("g")
     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.csv("data/visit_percentage.csv", type, function(error, timechart) {
  time_scale_x.domain(timechart.map(function(d) { return d.year; }));
  time_scale_y.domain([0, d3.max(timechart, function(d) { return d.perc_year; })]);

  chart_svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(time_x_axis)
    .selectAll("text")
      .attr("y", 0)
      .attr("x", 9)
      .attr("dy", ".35em")
      .attr("transform", "rotate(90)")
      .style("text-anchor", "start");

  chart_svg.append("g")
    .attr("class", "y axis")
  .call(time_y_axis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("% of time at court");

  chart_svg.selectAll(".bar")
    .data(timechart)
  .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return time_scale_x(d.year); })
    .attr("width", time_scale_x.rangeBand())
    .attr("y", function(d) { return time_scale_y(d.perc_year); })
    .attr("height", function(d) { return height - time_scale_y(d.perc_year); })
    .style("fill", "steelblue");
});

function type(d) {
  d.perc_year = +d.perc_year;
  return d;
}
