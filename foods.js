queue()
  .defer(d3.csv, "data/foods.joined.csv")
  .defer(d3.csv, "data/foods.cleaned.csv")
  .defer(d3.csv, "data/visit_percentage.csv")
  .await(ready);

// Global variables
//-----------------------------------------------------
var margin = {top: 30, right: 10, bottom: 10, left: 10},
    width = document.body.clientWidth,
    height = 300 - margin.top - margin.bottom;

// Scales
//-----------------------------------------------------
var x = d3.scale.ordinal().rangePoints([0, width], 1),
    y = {};

var line = d3.svg.line(),
    axis = d3.svg.axis().orient("left"),
    background,
    foreground;

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var color = d3.scale.category10();

// Main
//-----------------------------------------------------
function ready(error, zscore_data, raw_data) {
  if (error) { console.log(error); }

  // Extract the list of dimensions and create a scale for each.
  x.domain(dimensions = d3.keys(zscore_data[0]).filter(function(d) {
    return d != "translation" && d != "subcategory" && d != "category" && d != "macrocategory" && d != "1640" && d != "1641" && d != "1642"  && d != "macrocategory"  && d != "1643"  && d != "1644"  && d != "1645"  && d != "1646"  && d != "1647"  && d != "1648"  && d != "1649"  && d != "1650"  && d != "1651"  && d != "1652"  && d != "1653"  && d != "1654"  && d != "1655"  && d != "1656"  && d != "1657"  && d != "1658"  && d != "1659"  && d != "1660"  && d != "1661"  && d != "1662"  && d != "1663"  && d != "1664"  && d != "1665"  && d != "1666"  && d != "1667"  && d != "1668"  && d != "1669"  && d != "1670"  && d != "1671"  && d != "1672"  && d != "1673"  && d != "1674"  && d != "1675"  && d != "1676"  && d != "1677"  && d != "1678"  && d != "1679"  && d != "1680"  && d != "1681"  && d != "1682"  && d != "1683"  && d != "1684"  && d != "1685"  && d != "1686"  && d != "1687"  && d != "1688"  && d != "mean" && d != "max" && d != "min" &&  (y[d] = d3.scale.linear()
        .domain([-2,4])
        .range([height, 0]));
  }));

  // Add grey background lines for context.
  background = svg.append("g")
      .attr("class", "background")
    .selectAll("path")
      .data(zscore_data)
    .enter().append("path")
      .attr("d", path);

  // Add blue foreground lines for focus.
  foreground = svg.append("g")
      .attr("class", "foreground")
    .selectAll("path")
      .data(zscore_data)
    .enter().append("path")
      .attr("class", function(d) { return d.translation; })
      .attr("stroke", function(d) { return color(d.category)} )
      .attr("d", path);

  // Add a group element for each dimension.
  var g = svg.selectAll(".dimension")
      .data(dimensions)
    .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; });

  // Add an axis and title.
  g.append("g")
      .attr("class", "axis")
      .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
    .append("text")
      .style("text-anchor", "middle")
      .attr("y", -9)
      .text(function(d) { return d; });

  // Add and store a brush for each axis.
  g.append("g")
      .attr("class", "brush")
      .each(function(d) { d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brush", brush)); })
    .selectAll("rect")
      .attr("x", -8)
      .attr("width", 16);

  // Table
  //-----------------------------------------------------
  var columns = ["translation","category","macrocategory","subcategory","unit of measure","min","max","mean","1641","1644","1645","1646","1648","1656","1657","1659","1662","1663","1664","1665","1668","1670","1671","1672","1673","1674","1675","1676","1677","1678","1679","1680","1681","1682","1683","1684","1685","1686","1687","1688"]

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
    .attr("class", function(d) { return d.translation; })
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
  
  function table_highlight(d,i) {

  }

  function table_unhighlight(d,i) {

  }

};

// Parallel coordinate functions
//-----------------------------------------------------

// Returns the path for a given data point.
function path(d) {
  return line(dimensions.map(function(p) { return [x(p), y[p](d[p])]; }));
}

// Handles a brush event, toggling the display of foreground lines.
function brush() {
  var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); }),
      extents = actives.map(function(p) { return y[p].brush.extent(); });

  foreground.style("display", function(d) {
    return actives.every(function(p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? null : "none";
  });

  rows.style("display", function(d) {
      return actives.every(function(p ,i) {
        return extents[i][0] <= d[p] && d[p] <= extents[i][1];
      }) ? null : "none";
  })
}

// Timeline
//-----------------------------------------------------

var time_chart_height = 70;

var time_scale_x = d3.scale.ordinal()
     .rangeRoundBands([0, width], .1);

 var time_scale_y = d3.scale.linear()
     .range([time_chart_height, 0]);

 var time_x_axis = d3.svg.axis()
     .scale(time_scale_x)
     .orient("bottom");

 var time_y_axis = d3.svg.axis()
     .scale(time_scale_y)
     .orient("left")
     .ticks(10, "%");

 var chart_svg = d3.select("#timeline").append("svg")
     .attr("width", width)
     .attr("height", 170)
   .append("g")
     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.csv("data/visit_percentage.csv", type, function(error, timechart) {
  time_scale_x.domain(timechart.map(function(d) { return d.year; }));
  time_scale_y.domain([0, d3.max(timechart, function(d) { return d.perc_year; })]);

  chart_svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + time_chart_height + ")")
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
    .attr("dy", ".71em");
    // .style("text-anchor", "end")
    // .text("% of time at court");

  chart_svg.selectAll(".bar")
    .data(timechart)
  .enter().append("rect")
    .attr("class", "bar")
    .attr("x", function(d) { return time_scale_x(d.year); })
    .attr("width", time_scale_x.rangeBand())
    .attr("y", function(d) { return time_scale_y(d.perc_year); })
    .attr("height", function(d) { return time_chart_height - time_scale_y(d.perc_year); })
    .style("fill", "steelblue");
});

function type(d) {
  d.perc_year = +d.perc_year;
  return d;
}
