define([ "pivotics.core", "pivotics.analytics", "pivotics.db" ], function(core, analytics, db) {

	"use strict";
	
	var ui = {};

	ui.DimensionTable = core.createClass({

		init : function(properties) {
			this.parentNode = properties.parentNode;
			this.database = properties.database;
			this.container = null;
			this.onApply = properties.onApply;
			this.render();
		},

		render : function() {

			var self = this;
			
			// create updater
			self.updater = db.updater({
				database : self.database
			});
			self.dimensions = self.updater.newDimensions; 

			// setup container
			if (this.container) {
				this.container.remove();
			}
			this.container = $("<div class='dimensionui'></div>");
			this.parentNode.append(this.container);

			// toolbar
			var toolbar = $("<div></div>");
			this.container.append(toolbar);
			var addButton = $("<img src='images/Add.png' class='icon'>");
			addButton.click(function() {
				var dimension = analytics.dimension({
					name : 'new',
					key : false,
					aggregationFunction : analytics.listAggregationFunction
				});
				self.dimensions.push(dimension);
				self.renderDimension(table, dimension);
			});
			toolbar.append(addButton);

			// table for dimensions
			var table = $("<table><tbody></tbody></table>");
			this.container.append(table);

			// table header
			this.renderTableHeader(table);
			
			// create row for each dimensions
			for ( var i = 0; i < this.dimensions.length; ++i) {
				var dimension = this.dimensions[i];
				this.renderDimension(table, dimension);
			}

			// apply button
			var applyButton = $("<button class='button'>Apply</button>");
			this.container.append(applyButton);
			applyButton.click(function() {
				self.updater.update();
				if(self.onApply){
					self.onApply();
				}
				self.render();
			});

		},

		renderTableHeader : function(parentNode){
			parentNode.append("<tr><th>Name</th><th>Key</th><th>Type</th><th>Initial Value</th><th>Aggregration</th><th>Delete</th></tr>");
		},
		
		renderDimension : function(parentNode, dimension) {

			var self = this;

			// row container
			var row = $("<tr></tr>");
			parentNode.append(row);

			// name
			var name = $("<td></td>");
			row.append(name);
			var nameInput = $("<input type='text' value='" + dimension.name + "'>");
			nameInput.keyup(function() {
				dimension.name = $(this).val();
			});
			name.append(nameInput);

			// key
			var key = $("<td></td>");
			row.append(key);
			var keyCheckbox = null;
			if (dimension.key) {
				keyCheckbox = $("<input type='Checkbox' name='dummy'  checked='checked'>");
			} else {
				keyCheckbox = $("<input type='Checkbox' name='dummy'>");
			}
			key.append(keyCheckbox);
			keyCheckbox.click(function() {
				if ($(this).is(':checked')) {
					dimension.key = true;
				} else {
					dimension.key = false;
				}
			});

			// data type
			var dataType = $("<td></td>");
			dataType.append(this.createDropdown({
				entries : analytics.getDataTypes(),
				defaultEntry : dimension.dataType,
				description : function(dataType) {
					return dataType.description;
				},
				change : function(dataType) {
					var extInitialValue = dimension.dataType.int2ext(dimension.initialValue);
					dimension.dataType = dataType;
					dimension.initialValue = dimension.dataType.ext2int(extInitialValue);
					//self.database.convertDataType(dimension);
				}
			}));
			row.append(dataType);

			// initial value
			var initialValue = $("<td></td>");
			row.append(initialValue);
			var extInitialValue = dimension.dataType.int2ext(dimension.initialValue);
			var initialValueInput = $("<input type='text' value='" + extInitialValue + "'>");
			initialValueInput.keyup(function() {
				dimension.initialValue = dimension.dataType.ext2int($(this).val());
			});
			initialValue.append(initialValueInput);

			// aggregation function
			var aggregation = null;
			if (dimension.aggregationFunction) {
				aggregation = $("<td></td>");
				aggregation.append(this.createDropdown({
					entries : analytics.getAggregationFunctions(),
					defaultEntry : dimension.aggregationFunction,
					description : function(aggregationFunction) {
						return aggregationFunction.description;
					},
					change : function(aggregationFunction) {
						dimension.aggregationFunction = aggregationFunction;
					}
				}));
			} else {
				aggregation = $("<td>" + "none" + "</td>");
			}
			row.append(aggregation);

			// delete button
			var del = $("<td></td>");
			row.append(del);
			var delImage = $("<img class='icon' src='images/Delete.png'>");
			delImage.click(function() {
				core.removeElement(self.dimensions, dimension);
				row.remove();
			});
			del.append(delImage);

		},

		createDropdown : function(options) {

			var dropdown = $("<select></select>");
			for ( var i = 0; i < options.entries.length; ++i) {
				var entry = options.entries[i];
				var description = options.description(entry);
				if (entry === options.defaultEntry) {
					dropdown.append("<option selected='selected'>" + description + "</option>");
				} else {
					dropdown.append("<option>" + description + "</option>");
				}
			}
			dropdown.change(function() {
				options.change(options.entries[this.selectedIndex]);
			});
			return dropdown;
		}

	});

	return ui;

});