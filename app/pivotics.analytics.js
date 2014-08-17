/* global define */
/* global $ */

define(["pivotics.core.js"], function (core) {

    "use strict";

    // =========================================================================
    // own package
    // =========================================================================
    var analytics = {};

    // =========================================================================
    // aggregation functions
    // =========================================================================

    analytics.sumAggregationFunction = function (elements) {
        if (elements.length < 1) {
            throw "no elements for summing";
        }
        var result = elements[0].value;
        for (var i = 1; i < elements.length; ++i) {
            result += elements[i].value;
        }
        return result;
    };
    analytics.sumAggregationFunction.functionName = "sumAggregationFunction";
    analytics.sumAggregationFunction.description = "Sum";

    analytics.statisticAggregationFunction = function (elements) {
        var value;
        if (elements.length < 1) {
            throw "no elements for summing";
        }
        var valueMap = {};
        for (var i = 0; i < elements.length; ++i) {
            value = elements[i].value + "";
            if (value === "") {
                continue;
            }
            if (valueMap.hasOwnProperty(value)) {
                valueMap[value] += 1;
            } else {
                valueMap[value] = 1;
            }
        }
        var result = "";
        for (value in valueMap) {
            result += value + " (" + valueMap[value] + ") ";
        }
        return result;
    };
    analytics.statisticAggregationFunction.functionName = "statisticAggregationFunction";
    analytics.statisticAggregationFunction.description = "Statistic";

    analytics.listAggregationFunction = function (elements) {
        var elements2 = elements.slice(0);
        elements2.sort(function (a, b) {
            if (a.value > b.value) {
                return 1;
            } else {
                return -1;
            }
        });
        var result = "";
        var first = true;
        for (var i = 0; i < elements2.length; ++i) {
            if (!first) {
                result += "<br>" + elements2[i].value;
            } else {
                first = false;
                result = elements2[i].value;
            }
        }
        return result;
    };
    analytics.listAggregationFunction.functionName = "listAggregationFunction";
    analytics.listAggregationFunction.description = "List";

    analytics.getAggregationFunctions = function () {
        var result = [];
        for (var key in analytics) {
            if (!analytics.hasOwnProperty(key)) {
                continue;
            }
            if (!core.endsWith(key, "AggregationFunction")) {
                continue;
            }
            result.push(analytics[key]);
        }
        return result;
    };

    // =========================================================================
    // comparators
    // =========================================================================

    analytics.numberComparator = function (a, b) {
        return a - b;
    };
    analytics.numberComparator.functionName = "numberComparator";
    analytics.numberComparator.description = "number (asc)";

    analytics.stringComparator = function (a, b) {
        if (a < b) {
            return -1;
        } else {
            if (a === b) {
                return 0;
            } else {
                return 1;
            }
        }
    };
    analytics.stringComparator.functionName = "stringComparator";
    analytics.stringComparator.description = "string (asc)";

    analytics.stringDescComparator = function (a, b) {
        if (a < b) {
            return 1;
        } else {
            if (a === b) {
                return 0;
            } else {
                return -1;
            }
        }
    };
    analytics.stringDescComparator.functionName = "stringDescComparator";
    analytics.stringDescComparator.description = "string (desc)";

    analytics.dummyComparator = function () {};
    analytics.dummyComparator.functionName = "dummyComparator";
    analytics.dummyComparator.description = "no sort";

    analytics.getComparatorFunctions = function () {
        var result = [];
        for (var key in analytics) {
            if (!analytics.hasOwnProperty(key)) {
                continue;
            }
            if (!core.endsWith(key, "Comparator")) {
                continue;
            }
            result.push(analytics[key]);
        }
        return result;
    };

    // =========================================================================
    // data types
    // =========================================================================

    analytics.dataTypeString = {
        id: 'dataTypeString',
        description: 'String',
        comparatorFunction: analytics.stringComparator,
        int2ext: function (value) {
            return value;
        },
        ext2int: function (value) {
            return value;
        }
    };

    analytics.dataTypeInt = {
        id: 'dataTypeInt',
        description: 'Integer',
        comparatorFunction: analytics.numberComparator,
        int2ext: function (value) {
            return value + '';
        },
        ext2int: function (value) {
            var n = parseInt(value, 10);
            return isNaN(n) ? 0 : n;
        }
    };

    analytics.dataTypeFloat = {
        id: 'dataTypeFloat',
        description: 'Float',
        comparatorFunction: analytics.numberComparator,
        int2ext: function (value) {
            return value + '';
        },
        ext2int: function (value) {
            var n = parseFloat(value, 10);
            return isNaN(n) ? 0 : n;
        }
    };

    analytics.dataTypeIcon = {
        id: 'dataTypeIcon',
        description: 'Icon',
        comparatorFunction: analytics.stringComparator,
        int2ext: function (value, type) {
            if (type === 'edit') return value;
            var result = "";
            result = value.replace(/([0-9]+_[a-z]+)/g, "<img style='height:1.5em' src='images/$1.png'>");
            return result;
        },
        ext2int: function (value) {
            return value;
        }
    };

    analytics.getDataTypes = function () {
        var result = [];
        for (var key in analytics) {
            if (!analytics.hasOwnProperty(key)) {
                continue;
            }
            if (!core.startsWith(key, "dataType")) {
                continue;
            }
            result.push(analytics[key]);
        }
        return result;
    };

    // =========================================================================
    // dimension
    // =========================================================================

    analytics.parseDimension = function (data) {
        var properties = {};
        properties.name = data.name;
        properties.key = data.key;
        properties.aggregationFunction = analytics[data.aggregationFunction];
        properties.dataType = analytics[data.dataType];
        if (data.comparatorFunction)
            properties.comparatorFunction = analytics[data.comparatorFunction];
        else
            properties.comparatorFunction = properties.dataType.comparatorFunction;
        properties.initialValue = data.initialValue;
        return analytics.dimension(properties);
    };

    analytics.dimension = core.createClass({

        init: function (properties) {
            var self = this;
            self.name = null;
            self.key = false;
            self.aggregationFunction = analytics.sumAggregationFunction;
            self.extend = null;
            self.dataType = analytics.dataTypeString;
            core.copyOptions(self, properties);
            if (!self.comparatorFunction) self.comparatorFunction = self.dataType.comparatorFunction;
        },

        clone: function () {
            return analytics.dimension({
                name: this.name,
                key: this.key,
                aggregationFunction: this.aggregationFunction,
                comparatorFunction: this.comparatorFunction,
                extend: this.extend,
                dataType: this.dataType,
                initialValue: this.initialValue
            });
        },

        getValue: function (tuple) {
            var self = this;
            return tuple[self.name];
        },

        initialValue: "",

        toJSON: function () {
            return {
                name: this.name,
                key: this.key,
                aggregationFunction: this.aggregationFunction.functionName,
                comparatorFunction: this.comparatorFunction.functionName,
                dataType: this.dataType.id,
                initialValue: this.initialValue
            };
        }

    });

    // =========================================================================
    // measure dimension
    // =========================================================================

    analytics.measureDimension = core.createDerivedClass(analytics.dimension, {

        init: function (measures) {
            var self = this;
            self.name = "measure";

            // measures
            self.measures = measures;
            self.measureMap = {};
            for (var k = 0; k < self.measures.length; ++k) {
                var measure = self.measures[k];
                if (!measure.aggregationFunction) {
                    measure.aggregationFunction = analytics.sumAggreationFunction;
                }
                self.measureMap[measure.name] = measure;
            }

            // help dict for comparator
            self.sortRank = {};
            for (k = 0; k < self.measures.length; ++k) {
                self.sortRank[self.measures[k].name] = k;
            }

            // datatype
            self.dataType = {
                int2ext: function (value) {
                    return value;
                },
                ext2int: function (value) {
                    return value;
                },
                comparatorFunction: function (a, b) {
                    return self.sortRank[a] - self.sortRank[b];
                }
            };

            self.comparatorFunction = function (a, b) {
                return self.sortRank[a] - self.sortRank[b];
            };

            // set extend function
            self.extend = analytics.measuresExtend(self.measures);
        },

        getMeasure: function (name) {
            var self = this;
            return self.measureMap[name];
        },

        unextend: function (tuples) {
            var self = this;
            var tupleMap = {};
            var key;
            for (var i = 0; i < tuples.length; ++i) {
                var tuple = tuples[i];
                key = self.tupleKey(tuple);
                var resultTuple = tupleMap[key];
                if (!resultTuple) {
                    resultTuple = $.extend({}, tuple);
                    delete resultTuple[self.name];
                    delete resultTuple.value;
                    tupleMap[key] = resultTuple;
                }
                resultTuple[tuple[self.name]] = tuple.value;
            }
            var result = [];
            for (key in tupleMap) {
                result.push(tupleMap[key]);
            }
            return result;
        },

        tupleKey: function (tuple) {
            var self = this;
            var key = "";
            for (var name in tuple) {
                if (name === self.name || name == 'value') {
                    continue;
                }
                key += name + ":" + tuple[name];
            }
            return key;
        }

    });

    // =========================================================================
    // dimension sum extend2 function
    // =========================================================================

    analytics.sumExtendFieldName = " SUM";
    analytics.sumExtend = function (numberSumColumns, numberAxis1Dimensions) {
        return function (tuple, dimensions, dimensionIndex) {
            if (!tuple.originalTuple) {
                tuple.originalTuple = tuple;
            }
            var result = [];
            result.push(tuple);
            var modifiedTuple = $.extend({}, tuple);
            for (var j = numberSumColumns; j < numberAxis1Dimensions; ++j) {
                modifiedTuple[dimensions[j].name] = analytics.sumExtendFieldName;
            }
            for (j = numberSumColumns - 1; j >= 0; --j) {
                modifiedTuple = $.extend({}, modifiedTuple);
                modifiedTuple[dimensions[j].name] = analytics.sumExtendFieldName;
                result.push(modifiedTuple);
            }
            return result;
        };
    };

    // =========================================================================
    // dimension measure extend function
    // =========================================================================

    analytics.measuresExtend = function (measures) {
        return function (tuple, dimensions, dimensionIndex) {
            if (!tuple.originalTuple) {
                tuple.originalTuple = tuple;
            }
            var result = [];
            for (var i = 0; i < measures.length; ++i) {
                var newTuple = $.extend({}, tuple);
                newTuple.originalTuple = tuple.originalTuple;
                newTuple.measure = measures[i].name;
                var value = tuple[measures[i].name];
                if (value === undefined || value === null) {
                    value = measures[i].initialValue;
                }
                newTuple.value = value;
                result.push(newTuple);
            }
            return result;
        };
    };

    // =========================================================================
    // loop at data
    // =========================================================================

    analytics.dataLoop = function (data, dimensions, callback) {
        for (var i = 0; i < data.length; ++i) {
            var tuple = data[i];
            if (!tuple.valid) {
                continue;
            }
            var tuples = [tuple];
            for (var j = 0; j < dimensions.length; ++j) {
                var dimension = dimensions[j];
                if (dimension.extend) {
                    var newTupleList = [];
                    for (var p = 0; p < tuples.length; ++p) {
                        newTupleList.push(dimension.extend(tuples[p], dimensions, j));
                    }
                    tuples = [];
                    for (p = 0; p < newTupleList.length; ++p) {
                        tuples.push.apply(tuples, newTupleList[p]);
                    }
                }
            }
            for (var k = 0; k < tuples.length; ++k) {
                callback(tuples[k]);
            }
        }
    };

    // =========================================================================
    // axis
    // =========================================================================

    analytics.axis = core.createClass({

        init: function (dimensions, database) {

            // init
            var self = this;
            self.dimensions = dimensions;
            self.database = database;
            self.maxIndex = null;
            self.rootElement = null;
            self.leafs = null;

        },

        calculate: function () {

            var self = this;

            // init maxindex array
            self.maxIndex = [];
            for (var j = 0; j < self.dimensions.length; ++j) {
                self.maxIndex[j] = 0;
            }

            // check for data
            if (self.database.data.length === 0) {
                return;
            }

            // collect tuples
            self.rootElement = analytics.element(self, -1, null);
            analytics.dataLoop(self.database.data, self.dimensions, function (tuple) {
                self.rootElement.addTuple(tuple);
            });

            // sort according to attribures sequence
            self.sort();

            // collect leafs
            self.collectLeafs();
        },

        collectLeafs: function () {

        },

        sort: function () {
            var self = this;
            self.rootElement.sort();
        },

        generateIndex: function (dimensionIndex) {
            var self = this;
            var index = self.maxIndex[dimensionIndex];
            self.maxIndex[dimensionIndex] = index + 1;
            return index;
        },

        getNumberElements: function () {
            var self = this;
            return self.maxIndex.slice(-1)[0];
        },

        getElement: function (tuple, dimensionIndex) {
            var self = this;
            return self.rootElement.getElement(tuple, dimensionIndex);
        },

        getTable: function () {
            var self = this;
            var table = [];
            var rowIndex = 0;
            for (var itr = self.iterator(); itr.value() !== null; itr.next()) {
                var dimensions = itr.value();
                var row = [];
                for (var i = 0; i < dimensions.length; ++i) {
                    var dimension = dimensions[i];
                    row.push({
                        element: dimension.element,
                        changed: dimension.changed,
                        row: rowIndex,
                        col: i
                    });
                }
                table.push(row);
                rowIndex++;
            }
            table.numberTuples = table.length;
            table.numberDimensions = self.dimensions.length;
            table.dimensions = self.dimensions;
            return table;
        },

        iterator: function () {
            var self = this;
            return analytics.axisIterator(self);
        }

    });

    // =========================================================================
    // axis iterator
    // =========================================================================

    analytics.axisIterator = core.createClass({

        init: function (axis) {
            var self = this;
            self.axis = axis;
            if (!self.axis.rootElement) {
                self.dimensions = null;
                return;
            }
            self.dimensions = new Array(self.axis.dimensions.length);
            var element = self.axis.rootElement;
            for (var i = 0; i < self.dimensions.length; ++i) {
                self.dimensions[i] = {
                    element: element.childElements[0],
                    elementIndex: 0,
                    parentElement: element,
                    changed: true,
                };
                element = element.childElements[0];
            }
        },

        next: function () {
            var self = this;
            for (var i = 0; i < self.dimensions.length; ++i) {
                var j = self.dimensions.length - i - 1;
                var dimension = self.dimensions[j];
                if (dimension.elementIndex + 1 < dimension.parentElement.childElements.length) {
                    self.updateLower(j);
                    self.updateHigher(j);
                    return self.dimensions;
                }
            }
            self.dimensions = null;
            return self.dimensions;
        },

        updateLower: function (j) {
            var self = this;
            var dimension = self.dimensions[j];
            dimension.elementIndex++;
            dimension.element = dimension.parentElement.childElements[dimension.elementIndex];
            dimension.changed = true;
            var element = dimension.element;
            for (var k = j + 1; k < self.dimensions.length; ++k) {
                var dimension2 = self.dimensions[k];
                dimension2.parentElement = element;
                dimension2.elementIndex = 0;
                dimension2.element = element.childElements[0];
                dimension2.changed = true;
                element = element.childElements[0];
            }
        },

        updateHigher: function (j) {
            var self = this;
            for (var i = 0; i < j; ++i) {
                self.dimensions[i].changed = false;
            }
        },

        value: function () {
            return this.dimensions;
        }

    });

    // =========================================================================
    // TupleElement
    // =========================================================================

    analytics.element = core.createClass({

        init: function (axis, dimensionIndex, value) {
            var self = this;
            self.axis = axis;
            self.dimensionIndex = dimensionIndex;
            self.value = value;
            self.index = 0;
            if (self.dimensionIndex >= 0) {
                self.dimension = self.axis.dimensions[self.dimensionIndex];
            } else {
                self.dimension = null;
            }
            if (self.dimensionIndex + 1 < self.axis.dimensions.length) {
                self.childDimension = self.axis.dimensions[self.dimensionIndex + 1];
                self.childElements = [];
                self.childElementsMap = {};
            } else {
                self.childDimension = null;
                self.leafTuples = [];
            }
        },

        addTuple: function (tuple) {
            var self = this;
            if (!self.childDimension) {
                self.leafTuples.push(tuple);
                return;
            }
            var value = self.childDimension.getValue(tuple);
            var childElement = self.childElementsMap[value];
            if (!childElement) {
                childElement = analytics.element(self.axis, self.dimensionIndex + 1, value);
                self.childElements.push(childElement);
                self.childElementsMap[value] = childElement;
            }
            childElement.addTuple(tuple);
        },

        getElement: function (tuple) {
            var self = this;
            if (!self.childDimension) {
                return self;
            }
            var value = self.childDimension.getValue(tuple);
            var childElement = self.childElementsMap[value];
            if (!childElement) {
                throw "Missing child element for value " + value;
            }
            return childElement.getElement(tuple);
        },

        sort: function () {
            var self = this;
            if (!self.childDimension) {
                return;
            }
            if (self.childDimension.comparatorFunction !== analytics.dummyComparator) {
                self.childElements.sort(function (aElement, bElement) {
                    return self.childDimension.comparatorFunction(aElement.value, bElement.value);
                });
            }
            for (var i = 0; i < self.childElements.length; ++i) {
                var childElement = self.childElements[i];
                childElement.index = self.axis.generateIndex(self.dimensionIndex + 1);
                childElement.sort();
            }
        },

        getNumberLeafs: function () {
            var self = this;
            if (!self.childDimension) {
                return 1;
            }
            var sum = 0;
            for (var i = 0; i < self.childElements.length; i++) {
                sum += self.childElements[i].getNumberLeafs();
            }
            return sum;
        },

        getLeafTuples: function () {
            var self = this;
            if (!self.childDimension) {
                return self.leafTuples;
            }
            var result = [];
            for (var i = 0; i < self.childElements.length; i++) {
                var childTuples = self.childElements[i].getLeafTuples();
                result.push.apply(result, childTuples);
            }
            return result;
        }

    });

    // =========================================================================
    // result set
    // =========================================================================

    analytics.resultSet = core.createClass({

        init: function (axes, database) {

            // init
            // data
            var self = this;
            var axis;
            self.axisDimensions = null;
            self.axes = null;
            self.database = database;
            self.resultSet = null;
            self.axis1Table = null;
            self.axis2Table = null;
            self.measureDim = null;
            self.filterToolbarMap = {};

            // axes
            self.axes = [];
            for (var i = 0; i < axes.length; ++i) {
                axis = axes[i];
                self.axes.push(analytics.axis(axis, self.database));
            }

            // collect axis dimensions
            self.axisDimensions = [];
            for (i = 0; i < self.axes.length; ++i) {
                axis = self.axes[i];
                self.axisDimensions.push.apply(self.axisDimensions, axis.dimensions);
            }

            // determine measure dimension
            self.measureInfo = self.getMeasureDimension(self.axes);

            // calculate result set
            self.calculate();

        },

        getMeasureDimension: function (axes) {
            for (var i = 0; i < axes.length; ++i) {
                var axis = axes[i];
                for (var j = 0; j < axis.dimensions.length; ++j) {
                    var dimension = axis.dimensions[j];
                    if (dimension instanceof analytics.measureDimension) {
                        return {
                            axis: axis,
                            measuresOnRows: i === 0 ? true : false,
                            indexOnAxis: j,
                            dimension: dimension,
                        };
                    }
                }
            }
            throw "no measure dimension";
        },

        calculate: function () {

            var self = this;

            // calculate axes
            for (var i = 0; i < self.axes.length; ++i) {
                self.axes[i].calculate();
            }

            // axis tables
            self.axis1Table = self.axes[0].getTable();
            self.axis2Table = self.axes[1].getTable();

            // create empty result set
            self.resultSet = [];
            self.createEmptyResultSet(self.resultSet, self.axes, 0);

            // aggregate1: collect tuples for all cells
            analytics.dataLoop(self.database.data, self.axisDimensions, function (tuple) {
                var resultSet = self.resultSet;
                var rowElement = self.axes[0].getElement(tuple);
                var colElement = self.axes[1].getElement(tuple);
                var cell = resultSet[rowElement.index][colElement.index];
                cell.tuples.push(tuple);
            });

            // aggregate 2: sum tuples fo rall cells
            for (var row = 0; row < self.axes[0].getNumberElements(); ++row) {
                for (var col = 0; col < self.axes[1].getNumberElements(); ++col) {
                    var cell = self.resultSet[row][col];
                    if (cell.tuples.length == 1) {
                        cell.value = cell.tuples[0].value;
                    } else if (cell.tuples.length > 1) {
                        var measure = self.measureInfo.dimension.getMeasure(cell.tuples[0].measure);
                        cell.value = measure.aggregationFunction(cell.tuples);
                    }
                }
            }

        },

        createEmptyResultSet: function (resultSet, axes, axisIndex) {
            var self = this;
            for (var row = 0; row < axes[0].getNumberElements(); ++row) {
                var colList = [];
                resultSet.push(colList);
                for (var col = 0; col < axes[1].getNumberElements(); ++col) {
                    var measureName;
                    if (self.measureInfo.measuresOnRows) {
                        measureName = self.axis1Table[row][self.measureInfo.indexOnAxis].element.value;
                    } else {
                        measureName = self.axis2Table[col][self.measureInfo.indexOnAxis].element.value;
                    }
                    var measure = self.measureInfo.dimension.getMeasure(measureName);
                    colList.push({
                        value: "",
                        tuples: [],
                        row: row,
                        col: col,
                        measure: measure
                    });
                }
            }
        },

        addTuples: function (newTuples) {
            var self = this;
            newTuples = self.measureInfo.dimension.unextend(newTuples);
            self.database.addRecords(newTuples);
        },

        changeTuples: function (tuples, values) {
            var self = this;
            for (var i = 0; i < tuples.length; ++i) {
                var tuple = tuples[i];
                for (var j = 0; j < values.length; ++j) {
                    var value = values[j];
                    if (value.name === 'measure') {
                        self.database.changeRecord(tuple.originalTuple, tuple.measure, value.value);
                    } else {
                        self.database.changeRecord(tuple.originalTuple, value.name, value.value);
                    }
                }
            }
        },

        deleteTuples: function (tuples) {
            var originalTuples = [];
            for (var i = 0; i < tuples.length; ++i) {
                originalTuples.push(tuples[i].originalTuple);
            }
            this.database.removeRecords(originalTuples);
        }

    });

    return analytics;
});