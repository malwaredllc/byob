/**
 *	Neon Charts Scripts
 *
 *	Developed by Arlind Nushi - www.laborator.co
 */

;(function($, window, undefined)
{
	"use strict";
	
	$(document).ready(function()
	{
		
		// Rickshaw Graphs
		if(typeof Rickshaw != 'undefined')
		{
			// Graph 1
			var graph = new Rickshaw.Graph( {
					element: document.querySelector("#chart1"),
					renderer: 'area',
					stroke: true,
					height: 120,
					series: [ {
							data: [ { x: 0, y: 40 }, { x: 1, y: 49 }, {x: 2, y: 33}, {x: 3, y: 57}, {x: 4, y: 68} ],
							color: 'steelblue'
					}, {	
							data: [ { x: 0, y: 40 }, { x: 1, y: 49 }, {x: 2, y: 6}, {x: 3, y: 13}, {x: 4, y: 19} ],
							color: 'lightblue'
					} ]					 
			} );
				 
			graph.render();
		
		
			// Graph 2		
			var seriesData = [ [], [], [], [], [], [], [], [], [] ];
			var random = new Rickshaw.Fixtures.RandomData(150);
			
			for (var i = 0; i < 100; i++) {
				random.addData(seriesData);
			}
			
			var palette = new Rickshaw.Color.Palette( { scheme: 'classic9' } );
			
			
			var graph = new Rickshaw.Graph( {
				element: document.getElementById("chart2"),
				height: 120,
				renderer: 'area',
				stroke: true,
				preserve: true,
				series: [
					{
						color: palette.color(),
						data: seriesData[0],
						name: 'Moscow'
					}, {
						color: palette.color(),
						data: seriesData[1],
						name: 'Shanghai'
					}, {
						color: palette.color(),
						data: seriesData[2],
						name: 'Amsterdam'
					}, {
						color: palette.color(),
						data: seriesData[3],
						name: 'Paris'
					}, {
						color: palette.color(),
						data: seriesData[4],
						name: 'Tokyo'
					}, {
						color: palette.color(),
						data: seriesData[5],
						name: 'London'
					}, {
						color: palette.color(),
						data: seriesData[6],
						name: 'New York'
					}
				]
			} );
			
			graph.render();
		}
		
	
		// Morris.js Graphs
		if(typeof Morris != 'undefined')
		{
			// Bar Charts
			Morris.Bar({
				element: 'chart3',
				axes: true,
				data: [
					{x: '2013 Q1', y: getRandomInt(1,10), z: getRandomInt(1,10), a: getRandomInt(1,10)},
					{x: '2013 Q2', y: getRandomInt(1,10), z: getRandomInt(1,10), a: getRandomInt(1,10)},
					{x: '2013 Q3', y: getRandomInt(1,10), z: getRandomInt(1,10), a: getRandomInt(1,10)},
					{x: '2013 Q4', y: getRandomInt(1,10), z: getRandomInt(1,10), a: getRandomInt(1,10)}
				],
				xkey: 'x',
				ykeys: ['y', 'z', 'a'],
				labels: ['Facebook', 'LinkedIn', 'Google+'],
				barColors: ['#707f9b', '#455064', '#242d3c']
			});
			
			// Stacked Bar Charts
			Morris.Bar({
				element: 'chart4',
				data: [
					{x: '2013 Q1', y: getRandomInt(1,10), z: getRandomInt(1,20), a: getRandomInt(1,20)},
					{x: '2013 Q2', y: getRandomInt(1,11), z: getRandomInt(1,10), a: getRandomInt(1,14)},
					{x: '2013 Q3', y: getRandomInt(1,20), z: getRandomInt(1,20), a: getRandomInt(1,19)},
					{x: '2013 Q4', y: getRandomInt(1,15), z: getRandomInt(1,15), a: getRandomInt(1,11)}
				],
				xkey: 'x',
				ykeys: ['y', 'z', 'a'],
				labels: ['Facebook', 'LinkedIn', 'Google+'],
				stacked: true,
				barColors: ['#ffaaab', '#ff6264', '#d13c3e']
			});
			
			// Donut
			Morris.Donut({
				element: 'chart5',
				data: [
					{label: "Download Sales", value: getRandomInt(10,50)},
					{label: "In-Store Sales", value: getRandomInt(10,50)},
					{label: "Mail-Order Sales", value: getRandomInt(10,50)}
				],
				colors: ['#707f9b', '#455064', '#242d3c']
			});
			
			// Donut Colors
			Morris.Donut({
				element: 'chart6',
				data: [
					{label: "Games", value: getRandomInt(10,50)},
					{label: "Photos", value: getRandomInt(10,50)},
					{label: "Apps", value: getRandomInt(10,50)},
					{label: "Other", value: getRandomInt(10,50)},
				],
				labelColor: '#303641',
				colors: ['#f26c4f', '#00a651', '#00bff3', '#0072bc']
			});
			
			// Donut Formatting
			Morris.Donut({
				element: 'chart7',
				data: [
					{value: 70, label: 'foo', formatted: 'at least 70%' },
					{value: 15, label: 'bar', formatted: 'approx. 15%' },
					{value: 10, label: 'baz', formatted: 'approx. 10%' },
					{value: 5, label: 'A really really long label', formatted: 'at most 5%' }
				],
				formatter: function (x, data) { return data.formatted; },
				colors: ['#b92527', '#d13c3e', '#ff6264', '#ffaaab']
			});
			
			
			// Line Chart
			var day_data = [
				{"elapsed": "I", "value": 34},
				{"elapsed": "II", "value": 24},
				{"elapsed": "III", "value": 3},
				{"elapsed": "IV", "value": 12},
				{"elapsed": "V", "value": 13},
				{"elapsed": "VI", "value": 22},
				{"elapsed": "VII", "value": 5},
				{"elapsed": "VIII", "value": 26},
				{"elapsed": "IX", "value": 12},
				{"elapsed": "X", "value": 19}
			];
			
			Morris.Line({
				element: 'chart8',
				data: day_data,
				xkey: 'elapsed',
				ykeys: ['value'],
				labels: ['value'],
				parseTime: false,
				lineColors: ['#242d3c']
			});
			
			
			
			// Goals
			var decimal_data = [];
			
			for (var x = 0; x <= 360; x += 10) {
				decimal_data.push({
				x: x,
				y: Math.sin(Math.PI * x / 180).toFixed(4)
				});
			}
			
			Morris.Line({
				element: 'chart9',
				data: decimal_data,
				xkey: 'x',
				ykeys: ['y'],
				labels: ['sin(x)'],
				parseTime: false,
				goals: [-1, 0, 1],
				lineColors: ['#d13c3e']
			});
		
			
			// Area Chart
			Morris.Area({
				element: 'chart10',
				data: [
					{ y: '2006', a: getRandomInt(10,100), b: getRandomInt(10,100) },
					{ y: '2007', a: getRandomInt(10,100),  b: getRandomInt(10,100) },
					{ y: '2008', a: getRandomInt(10,100),  b: getRandomInt(10,100) },
					{ y: '2009', a: getRandomInt(10,100),  b: getRandomInt(10,100) },
					{ y: '2010', a: getRandomInt(10,100),  b: getRandomInt(10,100) },
					{ y: '2011', a: getRandomInt(10,100),  b: getRandomInt(10,100) },
					{ y: '2012', a: getRandomInt(10,100), b: getRandomInt(10,100) }
				],
				xkey: 'y',
				ykeys: ['a', 'b'],
				labels: ['Series A', 'Series B']
			});
		}
		
		
		// Peity Graphs
		if($.isFunction($.fn.peity))
		{
			$("span.pie").peity("pie", {colours: ['#0e8bcb', '#57b400'], width: 150, height: 25});
			$(".panel span.line").peity("line", {width: 150});
			$("span.bar").peity("bar", {width: 150});
			
			var updatingChart = $(".updating-chart").peity("line", { width: 150 })

			setInterval(function() 
			{
				var random = Math.round(Math.random() * 10);
				var values = updatingChart.text().split(",");
				
				values.shift()
				values.push(random);
				
				updatingChart.text(values.join(",")).change();
				$("#peity-right-now").text(random + ' user' + (random != 1 ? 's' : ''));
				
			}, 1000)
		}
		
		
	});
	
})(jQuery, window);


			
function data(offset) {
	var ret = [];
	for (var x = 0; x <= 360; x += 10) {
		var v = (offset + x) % 360;
		ret.push({
			x: x,
			y: Math.sin(Math.PI * v / 180).toFixed(4),
			z: Math.cos(Math.PI * v / 180).toFixed(4),
		});
	}
	return ret;
}
 
 
function getRandomInt(min, max) 
{
	return Math.floor(Math.random() * (max - min + 1)) + min;
}