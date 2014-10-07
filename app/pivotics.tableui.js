/*global define */
/*global $ */
/*global document */
/*global window */
/*global alert */
/*global console */

define(["pivotics.core", "pivotics.cellrenderer", "pivotics.analytics", "pivotics.dompos"], function (core, renderer, analytics, dompos) {

    "use strict";

    // =========================================================================
    // own package
    // =========================================================================
    var tableui = {};

    tableui.Table = core.createClass({

        init: function (params) {
            this.resultSet = params.resultSet;
            if (params.cellRenderer) {
                this.cellRenderer = params.cellRenderer;
            } else {
                this.cellRenderer = renderer.simple();
            }
            if (params.onUpdate) {
                this.onUpdate = params.onUpdate;
            } else {
                this.onUpdate = this.repaint;
            }
            this.filterToolbarActive = true;
            if (params.hasOwnProperty("filterToolbarActive")) {
                this.filterToolbarActive = params.filterToolbarActive;
            }
            this.filterToolbarMap = {};
            this.initContextMenu();
        },

        initContextMenu: function () {
            var self = this;
            if (!tableui.contextMenuInitialized) {
                tableui.contextMenuInitialized = true;
                $.contextMenu({
                    selector: '.context-menu',
                    callback: function (key, options,data) {
                        switch (key) {
                        case "change":
                            self.contextMenuChange(data.cellData);
                            break;
                        case "create":
                            self.contextMenuCreate(data.cellData);
                            break;
                        case "delete":
                            self.contextMenuDelete(data.cellData);
                            break;
                        }
                    },
                    items: {
                        "create": {
                            name: "Create"
                        },
                        "change": {
                            name: "Change"
                        },
                        "delete": {
                            name: "Delete"
                        }
                    }
                });
            }
        },

        renderId: 0,

        render: function (parentNode) {

            var self = this;
            self.renderId++;
            self.parentNode = parentNode;
            self.tableNode = $("<table class='tableui'></table>");
            var fillSpace = false;
            var col, colIndex, cellData, value;

            for (var rowIndex = 0; rowIndex < self.resultSet.axis1Table.numberTuples + self.resultSet.axis2Table.numberDimensions; ++rowIndex) {
                var row = $("<tr></tr>");
                self.tableNode.append(row);

                if (rowIndex < self.resultSet.axis2Table.numberDimensions) {

                    // uper
                    for (colIndex = 0; colIndex < self.resultSet.axis1Table.numberDimensions + self.resultSet.axis2Table.numberTuples; ++colIndex) {

                        if (colIndex < self.resultSet.axis1Table.numberDimensions) {
                            // left
                            if (!fillSpace) {
                                col = $("<td rowspan=" + self.resultSet.axis2Table.numberDimensions + " colspan=" + self.resultSet.axis1Table.numberDimensions + "></td>");
                                row.append(col);
                                fillSpace = true;
                            }
                        } else {
                            // right
                            cellData = self.resultSet.axis2Table[colIndex - self.resultSet.axis1Table.numberDimensions][rowIndex];
                            if (cellData.changed) {
                                value = cellData.element.dimension.dataType.int2ext(cellData.element.value);
                                col = $("<td tabindex=0 colspan=" + cellData.element.getNumberLeafs() + ">" + value + "</td>");
                                if (cellData.element.dimension.name != "measure" && cellData.element.value !== analytics.sumExtendFieldName) {
                                    col.focusin(self.createClickCellFunction(col, cellData, 'dimension'));
                                }
                                self.assignColClasses(col, rowIndex, colIndex);
                                row.append(col);
                            }
                        }
                    }

                } else {

                    // lower
                    for (colIndex = 0; colIndex < self.resultSet.axis1Table.numberDimensions + self.resultSet.axis2Table.numberTuples; ++colIndex) {
                        if (colIndex < self.resultSet.axis1Table.numberDimensions) {
                            // left
                            cellData = self.resultSet.axis1Table[rowIndex - self.resultSet.axis2Table.numberDimensions][colIndex];
                            if (cellData.changed) {
                                value = cellData.element.dimension.dataType.int2ext(cellData.element.value);
                                col = $("<td tabindex=0 rowspan=" + cellData.element.getNumberLeafs() + ">" + value + "</td>");
                                if (cellData.element.dimension.name != "measure" && cellData.element.value !== analytics.sumExtendFieldName) {
                                    col.focusin(self.createClickCellFunction(col, cellData, 'dimension'));
                                }
                                col.addClass("context-menu");
                                col.data("cellData", cellData);                                
                                col.data("renderId", self.renderId);
                                row.append(col);
                            }
                        } else {
                            // right
                            cellData = self.resultSet.resultSet[rowIndex - self.resultSet.axis2Table.numberDimensions][colIndex - self.resultSet.axis1Table.numberDimensions];
                            col = self.cellRenderer.render({
                                parentNode: row,
                                table: self,
                                cellData: cellData,
                                tableui: tableui,
                                renderId: self.renderId
                            });
                            if (self.cellRenderer.isClickable) {
                                col.focusin(self.createClickCellFunction(col, cellData, 'cell'));
                            }
                            self.assignCellClasses(col, rowIndex, colIndex);
                        }
                    }
                }
            }

            self.parentNode.append(self.tableNode);

            // special logic for firefox: 
            // update cell when focus is lost
            // happens time delayed to give the update handler in createClickCellFunctionFirefox a chance
            // to do the update 
            // (update in createClickCellFunctionFirefox is better because focus is restored)
            self.tableNode.focusout(function (e) {
                if (!self.cellUpdate) return;
                var cellUpdate = self.cellUpdate;
                window.setTimeout(function () {
                    if (self.cellUpdate && cellUpdate === self.cellUpdate) {
                        self.cellUpdate = null;
                        cellUpdate.apply(self, [true]);
                    }
                }, 100);
            });

            self.renderFilterToolbar(self.parentNode);
            return self.tableNode;
        },

        assignColClasses: function (field, rowIndex, colIndex) {
            var self = this;
            var cell = self.resultSet.axis2Table[colIndex - self.resultSet.axis1Table.numberDimensions][0];
            field.addClass("f_" + cell.element.value);
        },

        assignCellClasses: function (field, rowIndex, colIndex) {
            var self = this;
            var cell = self.resultSet.axis2Table[colIndex - self.resultSet.axis1Table.numberDimensions][0];
            field.addClass("f_" + cell.element.value);
        },


        createClickCellFunction: function (col, cellData, cellType) {
            if (core.browserType.indexOf('Firefox') >= 0)
                return this.createClickCellFunctionFirefox(col, cellData, cellType);
            else
                return this.createClickCellFunctionChrome(col, cellData, cellType);
        },

        createClickCellFunctionChrome: function (col, cellData, cellType) {
            var self = this;
            return function () {
                switch (cellType) {
                case 'cell':
                    col.text(cellData.measure.dataType.int2ext(cellData.value, 'edit'));
                    break;
                case 'dimension':
                    col.text(cellData.element.dimension.dataType.int2ext(cellData.element.value, 'edit'));
                    break;
                }
                col.attr('contenteditable', true);
                col.focusout(function (e) {
                    col.attr('contenteditable', false);                    
                    var pos = dompos.getPosition(e.relatedTarget); // store focus 
                    var value = col.html();
                    switch (cellType) {
                    case 'cell':
                        self.changeCell(cellData, value);
                        break;
                    case 'dimension':
                        self.changeDimension(cellData, value);
                        break;
                    }
                    self.onUpdate(); // this redraws the complete pivot table                    
                    if (pos && (cellType === 'dimension' || cellData.tuples.length > 0)) {
                        var elem = dompos.getElement(document.querySelector('table.tableui'), pos);
                        $(elem).focus(); // restore focus after redrawing
                    }
                });
            };
        },

        createClickCellFunctionFirefox: function (col, cellData, cellType) {
            var self = this;
            return function (e) {              

                // special logic for firefox because e.relatedTarget is not supported:
                // - update previous selected cell (redraw pivot table) 
                // - make current cell editable
                // - register current cell for delayed update (happens when next cell is focused)
                                        
                // check if cell update handler is registered 
                if (self.cellUpdate) {
                    var pos = dompos.getPosition(e.currentTarget); // store focus
                    var cellUpdate = self.cellUpdate;
                    self.cellUpdate = null;
                    cellUpdate.apply(self, [true]);  // this redraws the pivot table
                    if (pos && (cellType === 'dimension' || cellData.tuples.length > 0)) {
                        var elem = dompos.getElement(document.querySelector('table.tableui'), pos);
                        $(elem).focus(); // restore the focus
                    }
                    return;
                }

                // fill cell
                switch (cellType) {
                case 'cell':
                    col.text(cellData.measure.dataType.int2ext(cellData.value, 'edit'));
                    break;
                case 'dimension':
                    col.text(cellData.element.dimension.dataType.int2ext(cellData.element.value, 'edit'));
                    break;
                }
                
                // make cell editable
                col.attr('contenteditable', true);

                // register cell update handler (registration is evaluated in createClickCellFunctionFirefox and delayed in render)
                self.cellUpdate = function (flgRepaint) {
                    col.attr('contenteditable', false);
                    var value = col.html();
                    switch (cellType) {
                    case 'cell':
                        self.changeCell(cellData, value);
                        break;
                    case 'dimension':
                        self.changeDimension(cellData, value);
                        break;
                    }
                    if (flgRepaint) self.onUpdate(); // this redraws the complete pivot table         
                };

            };
        },

        createFilterHandler: function (value) {
            var self = this;
            return function () {
                var visible = $(this).is(":checked");
                if (visible) {
                    $(".f_" + value).css("display", "table-cell");
                    self.filterToolbarMap[value] = true;
                } else {
                    $(".f_" + value).css("display", "none");
                    self.filterToolbarMap[value] = false;
                }
            };
        },

        renderFilterToolbar: function (parentNode) {
            var self = this;
            if (!self.filterToolbarActive) {
                return;
            }
            self.filterToolbar = $("<span class='resultset-filter-toolbar' ></span>");
            var number = 0;
            for (var i = 0; i < self.resultSet.axis2Table.numberTuples; ++i) {
                var cell = self.resultSet.axis2Table[i][0];
                if (!cell.changed) {
                    continue;
                }
                var element = $("<span></span>");
                self.filterToolbar.append(element);
                var checked = true;
                if (self.filterToolbarMap.hasOwnProperty(cell.element.value)) {
                    checked = self.filterToolbarMap[cell.element.value];
                }
                var checkbox = null;
                if (checked) {
                    checkbox = $("<input type='checkbox' checked='checked'></input>");
                } else {
                    checkbox = $("<input type='checkbox'></input>");
                    $(".f_" + cell.element.value).css("display", "none");
                }
                checkbox.change(self.createFilterHandler(cell.element.value));
                element.append(checkbox);
                element.append($("<span>" + cell.element.value + "</span>"));
                number++;
            }
            if (number > 1) {
                parentNode.prepend(self.filterToolbar);
            }
        },

        repaint: function () {
            var self = this;
            self.resultSet.calculate();
            self.tableNode.remove();
            self.filterToolbar.remove();
            self.render(self.parentNode);
        },

        getFields: function (cellData) {

            var self = this;
            var fields = [];
            var cellData2;

            // add row dimensions to fields
            for (var col = 0; col < self.resultSet.axis1Table.numberDimensions; ++col) {
                cellData2 = self.resultSet.axis1Table[cellData.row][col];
                if (cellData2.element.dimension.name === 'measure') {
                    continue;
                }
                fields.push({
                    name: cellData2.element.dimension.name,
                    value: cellData2.element.dimension.dataType.int2ext(cellData2.element.value),
                    ext2int: cellData2.element.dimension.dataType.ext2int,
                });
            }

            // add col dimensions to fields
            for (var row = 0; row < self.resultSet.axis2Table.numberDimensions; ++row) {
                cellData2 = self.resultSet.axis2Table[cellData.col][row];
                if (cellData2.element.dimension.name === 'measure') {
                    continue;
                }
                fields.push({
                    name: cellData2.element.dimension.name,
                    value: cellData2.element.dimension.dataType.int2ext(cellData2.element.value),
                    ext2int: cellData2.element.dimension.dataType.ext2int,
                });
            }

            return fields;
        },

        changeDimension: function (cellData, value) {
            var self = this;
            var tuples = cellData.element.getLeafTuples();
            try {
                self.resultSet.changeTuples(tuples, [{
                    name: cellData.element.dimension.name,
                    value: cellData.element.dimension.dataType.ext2int(value)
                }]);
            } catch (error) {
                alert(error);
            }
        },

        changeCell: function (cellData, value) {
            var self = this;
            var tuples = cellData.tuples;
            if (tuples.length > 1) {
                alert("more than one tuple");
                return;
            }
            try {
                value = cellData.measure.dataType.ext2int(value);
                if (tuples.length === 0) {
                    // alert("creation of records not possible");
                    self.changeCellCreate(cellData, value);
                    return;
                } else {
                    self.resultSet.changeTuples(tuples, [{
                        name: 'measure',
                        value: value
                    }]);
                }
            } catch (error) {
                alert(error);
            }
        },

        changeCellCreate: function (cellData, value) {

            var self = this;
            var fields = [];
            var inputDimensions = {};

            // add changed cell to fields
            fields.push({
                name: cellData.measure.name,
                value: value,
                ext2int: cellData.measure.dataType.ext2int,
            });
            inputDimensions[cellData.measure.name] = true;

            // add values from rows and cols to fields
            var tmpFields = self.getFields(cellData);
            for (var i = 0; i < tmpFields.length; ++i) {
                var field = tmpFields[i];
                fields.push(field);
                inputDimensions[field.name] = true;
            }

            // add dimensions from parent pivot table
            if (self.parentTable) {
                tmpFields = self.parentTable.table.getFields(self.parentTable.cellData);
                for (i = 0; i < tmpFields.length; ++i) {
                    var tmpField = tmpFields[i];
                    if (!inputDimensions[tmpField.name]) {
                        fields.push(tmpField);
                        inputDimensions[tmpField.name] = true;
                    }
                }
            }

            // add missing dimensions to input fields
            var missingDimensions = self.determineMissingDimensions(inputDimensions);
            for (i = 0; i < missingDimensions.length; ++i) {
                var dimension = missingDimensions[i];
                fields.push({
                    name: dimension.name,
                    value: dimension.dataType.int2ext(dimension.initialValue),
                    ext2int: dimension.dataType.ext2int
                });
            }

            // dialog
            core.nameValueDialog({
                fields: fields,
                title: 'New'
            }, function () {

                // assemble tuple
                var tuple = {
                    valid: true
                };
                for (var i = 0; i < fields.length; ++i) {
                    var name = fields[i].name;
                    var value = fields[i].ext2int(fields[i].inputField.val());
                    tuple[name] = value;
                }

                // add tuples
                self.resultSet.addTuples([tuple]);

                // on update event
                self.onUpdate();

            });

        },

        contextMenuChange: function (cellData) {
            var self = this;

            if (self.resultSet.measureInfo.measuresOnRows) {
                alert("not possible -> put measures on columns");
                return;
            }
          
            var fields = [];
            for (var col = 0; col <= cellData.col; ++col) {
                var cellData2 = self.resultSet.axis1Table[cellData.row][col];
                fields.push({
                    name: cellData2.element.dimension.name,
                    value: cellData2.element.dimension.dataType.int2ext(cellData2.element.value),
                    ext2int: cellData2.element.dimension.dataType.ext2int
                });
            }
            core.nameValueDialog({
                fields: fields,
                title: 'Change'
            }, function () {
                var tuples = cellData.element.getLeafTuples();
                var values = [];
                for (var i = 0; i < fields.length; ++i) {
                    var value = {
                        name: fields[i].name,
                        value: fields[i].ext2int(fields[i].inputField.val()),
                    };
                    values.push(value);
                }
                self.resultSet.changeTuples(tuples, values);
                self.onUpdate();
            });
        },

        contextMenuCreate: function (cellData) {
            var self = this;
            var measure = null;
            var inputDimensions = {};
            var cellData2;

            if (self.resultSet.measureInfo.measuresOnRows) {
                alert("not possible -> put measures on columns");
                return;
            }

            // assemble row fields
            var fields = [];
            fields.push({
                title: "Rows:"
            });
            for (var col = 0; col < self.resultSet.axis1Table.numberDimensions; ++col) {
                var readonly = false;
                if (self.resultSet.measureInfo.measuresOnRows) {
                    if (col == self.resultSet.measureInfo.indexOnAxis) {
                        readonly = true;
                    }
                }
                cellData2 = self.resultSet.axis1Table[cellData.row][col];
                fields.push({
                    name: cellData2.element.dimension.name,
                    value: cellData2.element.dimension.dataType.int2ext(cellData2.element.value),
                    ext2int: cellData2.element.dimension.dataType.ext2int,
                    readonly: readonly
                });
                inputDimensions[cellData2.element.dimension.name] = true;
            }

            // assemble col fields
            fields.push({
                title: "Columns:"
            });
            for (var i = 0; i < self.resultSet.axis2Table.numberTuples; ++i) {
                if (!self.resultSet.measureInfo.measuresOnRows) {
                    var measureName = (self.resultSet.axis2Table[i][self.resultSet.measureInfo.indexOnAxis]).element.value;
                    measure = self.resultSet.measureInfo.dimension.getMeasure(measureName);
                }
                var name = "";
                var first = true;
                for (var j = 0; j < self.resultSet.axis2Table.numberDimensions; ++j) {
                    if (!first)
                        name += "-";
                    cellData2 = self.resultSet.axis2Table[i][j];
                    var value = cellData2.element.dimension.dataType.int2ext(cellData2.element.value);
                    name += value;
                    first = false;
                    if (cellData2.element.dimension.name !== "measure") {
                        inputDimensions[cellData2.element.dimension.name] = true;
                    } else {
                        inputDimensions[cellData2.element.value] = true;
                    }
                }

                cellData2 = self.resultSet.resultSet[cellData.row][i];
                var cv = null;
                if (cellData2.tuples.length === 0) {
                    cv = measure.dataType.int2ext(measure.initialValue);
                } else {
                    cv = cellData2.value;
                }

                fields.push({
                    name: name,
                    value: cv,
                    ext2int: measure.dataType.ext2int
                });
            }

            // add dimensions from parent pivot table
            if (self.parentTable) {
                fields.push({
                    title: "Parent Table:"
                });
                var tmpFields = self.parentTable.table.getFields(self.parentTable.cellData);
                for (i = 0; i < tmpFields.length; ++i) {
                    var tmpField = tmpFields[i];
                    if (!inputDimensions[tmpField.name]) {
                        fields.push(tmpField);
                        inputDimensions[tmpField.name] = true;
                    }
                }
            }

            // append dimensions which are not in rows or columns or in parent
            // table to dialog
            var missingDimensions = self.determineMissingDimensions(inputDimensions);
            if (missingDimensions.length > 0) {
                fields.push({
                    title: "Not displayed:"
                });
                for (i = 0; i < missingDimensions.length; ++i) {
                    var dimension = missingDimensions[i];
                    fields.push({
                        name: dimension.name,
                        value: dimension.dataType.int2ext(dimension.initialValue),
                        ext2int: dimension.dataType.ext2int
                    });
                }
            }

            // dialog
            core.nameValueDialog({
                fields: fields,
                title: 'New'
            }, function () {

                var field;
                // create base tuple from row key
                var baseTuple = {
                    valid: true,
                };
                for (var i = 1; i < self.resultSet.axis1Table.numberDimensions + 1; ++i) {
                    field = fields[i];
                    baseTuple[field.name] = field.ext2int(field.inputField.val());
                }

                // add values of parent table dimensions or missingDimensions to base tuple
                for (i = self.resultSet.axis1Table.numberDimensions + self.resultSet.axis2Table.numberTuples + 3; i < fields.length; ++i) {
                    field = fields[i];
                    if (field.title) {
                        continue;
                    }
                    baseTuple[field.name] = field.ext2int(field.inputField.val());
                }

                // loop at columns and create tuple for each column
                var tuples = [];
                for (i = 0; i < self.resultSet.axis2Table.numberTuples; ++i) {
                    var tuple = $.extend({}, baseTuple);
                    for (var j = 0; j < self.resultSet.axis2Table.numberDimensions; ++j) {
                        var cellData = self.resultSet.axis2Table[i][j];
                        tuple[cellData.element.dimension.name] = cellData.element.value;
                    }
                    field = fields[self.resultSet.axis1Table.numberDimensions + i + 2];
                    tuple.value = field.ext2int(field.inputField.val());
                    tuples.push(tuple);
                }

                // add tuples
                self.resultSet.addTuples(tuples);

                // on update event
                self.onUpdate();

            });

        },

        contextMenuDelete: function (cellData) {
            var self = this;
            var tuples = cellData.element.getLeafTuples();
            self.resultSet.deleteTuples(tuples);
            self.onUpdate();
        },

        determineMissingDimensions: function (inputDimensions) {
            var dimensions = [];
            for (var i = 0; i < this.resultSet.database.getDimensions().length; ++i) {
                var dimension = this.resultSet.database.getDimensions()[i];
                if (inputDimensions.hasOwnProperty(dimension.name)) {
                    continue;
                }
                dimensions.push(dimension);
            }
            return dimensions;
        }

    });

    return tableui;

});