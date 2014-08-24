/* global define */
/* global $ */

define([ "pivotics.core.js", "pivotics.analytics" ], function(core, analytics) {

	"use strict";

	// =========================================================================
	// own package
	// =========================================================================
	var tableoptionsui = {};

	tableoptionsui.Dialog = core.createClass({

		dummyText : "dummy",

		init : function(options) {

			var self = this;
			self.parentNode = options.parentNode;
			self.dimensions = options.dimensions;
			self.rowDimensions = options.rowDimensions;
			self.colDimensions = options.colDimensions;
			self.measureDimension = options.measureDimension;
			var allDimensions = this.dimensions.slice();
			allDimensions.push(this.measureDimension);
			self.dimensionsMap = self.determineDimensionsMap(allDimensions);
			self.createDefaultConfiguration();
			self.availableDimensions = self.determineAvailableDimensions(allDimensions, [ self.rowDimensions, self.colDimensions, self.measureDimension.measures ]);
			self.applyButtonActive = true;
			if (options.hasOwnProperty("applyButtonActive")) {
				self.applyButtonActive = options.applyButtonActive;
			}
			self.onApply = null;
			if (options.onApply) {
				self.onApply = options.onApply;
			}

			var table = $("<table class='tableoptionsui'></table>");
			self.parentNode.append(table);

			var tbody = $("<tbody></tbody>");
			table.append(tbody);

			var row1 = $("<tr></tr>");
			tbody.append(row1);

			var cell1 = $("<td></td>");
			row1.append(cell1);
			self.createLeftCell(cell1);

			var cell2 = $("<td></td>");
			row1.append(cell2);
			self.createRightCell(cell2);

			if (self.applyButtonActive) {
				var button = $("<button class='button'>Apply</button>");
				self.parentNode.append(button);
				button.click(function() {
					self.apply();
				});
			}

		},

		createDefaultConfiguration : function() {
			// create list with dimensions not used in rows, cols or measures
			var usedDimensions = [];
			usedDimensions.push.apply(usedDimensions, this.colDimensions);
			usedDimensions.push.apply(usedDimensions, this.rowDimensions);
			usedDimensions.push.apply(usedDimensions, this.measureDimension.measures);
			var unusedDimensions = this.dimensions.slice();
			core.removeElements(unusedDimensions, usedDimensions);
			var index = 0;
			// check for measure dimension
			var measureOK = false;
			if (core.include(this.rowDimensions, this.measureDimension) || core.include(this.colDimensions, this.measureDimension)) {
				measureOK = true;
			}
			// add measure dimension to cols if needed
			if (!measureOK) {
				this.colDimensions.push(this.measureDimension);
			}
			// add col dimensions if needed
			if (this.colDimensions.length === 0) {
				if (index < unusedDimensions.length) {
					this.colDimensions.push(unusedDimensions[index]);
					index++;
				} else {
					throw "default configuration failed for cols";
				}
			}
			// add row dimensions if needed
			if (this.rowDimensions.length === 0) {
				if (index < unusedDimensions.length) {
					this.rowDimensions.push(unusedDimensions[index]);
					index++;
				} else {
					throw "default configuration failed for rows";
				}
			}
			// add measure if needed
			if (this.measureDimension.measures.length === 0) {
				if (index < unusedDimensions.length) {
					this.measureDimension.measures.push(unusedDimensions[index]);
					index++;
				} else {
					throw "default configuration failed for measures";
				}
			}
		},

		readDimensions : function(cell) {
			var dimensionCells = cell.find("td");
			var dimensions = [];
			for ( var i = 0; i < dimensionCells.length; ++i) {
				var dimensionCell = dimensionCells[i];
				dimensions.push(this.dimensionsMap[$(dimensionCell).text()]);
			}
			return dimensions;
		},

		apply : function() {

			this.rowDimensions.length = 0;
			this.rowDimensions.push.apply(this.rowDimensions, this.readDimensions(this.rowDimensionsCell));

			this.colDimensions.length = 0;
			this.colDimensions.push.apply(this.colDimensions, this.readDimensions(this.colDimensionsCell));

			this.measureDimension.init(this.readDimensions(this.measureDimensionsCell));

			if (this.onApply) {
				this.onApply();
			}

		},

		determineAvailableDimensions : function(dimensions, dimensionsToBeRemovedList) {
			var result = dimensions.slice();
			for ( var i = 0; i < dimensionsToBeRemovedList.length; ++i) {
				var dimensionsToBeRemoved = dimensionsToBeRemovedList[i];
				core.removeElements(result, dimensionsToBeRemoved);
			}
			return result;
		},

		determineMeasureDimension : function(dimensions) {
			for ( var i = 0; i < dimensions.length; ++i) {
				var dimension = dimensions[i];
				if (dimension instanceof analytics.measureDimension) {
					return dimension;
				}
			}
			throw "No Measure Dimensions";
		},

		determineDimensionsMap : function(dimensions) {
			var map = {};
			for ( var i = 0; i < dimensions.length; ++i) {
				var dimension = dimensions[i];
				map[dimension.name] = dimension;
			}
			return map;
		},

		createLeftCell : function(parentNode) {
			this.createSubTable(parentNode, this.availableDimensions);
		},

		createRightCell : function(parentNode) {

			var self = this;

			var table = $("<table></table>");
			parentNode.append(table);

			var tbody = $("<tbody></tbody>");
			table.append(tbody);

			var row1 = $("<tr></tr>");
			tbody.append(row1);

			var dummyCell = $("<td></td>");
			row1.append(dummyCell);

			var colDimensionsCell = this.colDimensionsCell = $("<td></td>");
			row1.append(colDimensionsCell);
			this.createSubTable(colDimensionsCell, self.colDimensions);

			var row2 = $("<tr></tr>");
			tbody.append(row2);

			var rowDimensionsCell = this.rowDimensionsCell = $("<td></td>");
			row2.append(rowDimensionsCell);
			this.createSubTable(rowDimensionsCell, self.rowDimensions);

			var measureDimensionsCell = this.measureDimensionsCell = $("<td></td>");
			row2.append(measureDimensionsCell);
			this.createSubTable(measureDimensionsCell, self.measureDimension.measures);

		},

		createSubTable : function(parentNode, dimensions) {

			var self = this;
            var row, cell;

			var table = $("<table></table>");
			parentNode.append(table);

			var tbody = $("<tbody class='connectedSortable'></tbody>");
			table.append(tbody);

			for ( var i = 0; i < dimensions.length; ++i) {

				var dimension = dimensions[i];

				row = $("<tr></tr>");
				tbody.append(row);

				cell = $("<td class='tableoptionsui_leaf'>" + dimension.name + "</td>");
				row.append(cell);

			}
			if (dimensions.length === 0) {
				row = $("<tr></tr>");
				tbody.append(row);

				cell = $("<td class='tableoptionsui_leaf'>" + self.dummyText + "</td>");
				row.append(cell);

			}

			tbody.sortable({
				connectWith : ".connectedSortable",
				receive : function(event, ui) {
					self.receive(event, ui);
				}
			});

		},

		receive : function(event, ui) {
			if (ui.item.find("td").filter(":contains('" + this.dummyText + "')").length > 0) {
				$(ui.sender).sortable('cancel');
				return;
			}
			$(event.target).find("td").filter(":contains('" + this.dummyText + "')").remove();
			if (ui.sender.find("td").length === 0) {
				var cell = $("<tr><td class='tableoptionsui_leaf'>" + this.dummyText + "</td></tr>");
				ui.sender.append(cell);
			}
		}

	});

	return tableoptionsui;

});