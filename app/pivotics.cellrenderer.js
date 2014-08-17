define([ "pivotics.core", "pivotics.analytics" ], function(core, analytics) {

	var renderer = {};

	renderer.simple = core.createClass({

		isClickable : true,

		init : function() {

		},

		render : function(params) {
			var value = params.cellData.measure.dataType.int2ext(params.cellData.value);
			var col = $("<td tabindex=0>" + value + "</td>");
			params.parentNode.append(col);
			return col;
		}

	});

	renderer.pivotRenderer = core.createClass({

		isClickable : false,

		init : function(rowDimensions, colDimensions, database) {
			this.rowDimensions = rowDimensions;
			this.colDimensions = colDimensions;
			this.database = database;
		},

		render : function(params) {
			if(params.cellData.tuples.length===0){
				var emptyNode = $("<td></td>");
				params.parentNode.append(emptyNode);
				return emptyNode;
			}
			var col = $("<td style='text-align:center;padding:10px;'></td>");
			var database = this.database.createRelatedDatabase(params.cellData.tuples);
			var resultSet = analytics.resultSet([ this.rowDimensions, this.colDimensions ], database);
			var table =params.tableui.Table({
				resultSet : resultSet,
				filterToolbarActive:false,
				onUpdate : function() {
					params.table.repaint();
				}
			});
			table.parentTable = params;
			table.render(col);
			params.parentNode.append(col);
			return col;
		}

	});

	return renderer;
});