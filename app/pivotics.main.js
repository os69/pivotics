/* global $ */
/* global define */
/* global alert */
/* global window */
/* global document */
/* global Blob */

define(["pivotics.core",
        "pivotics.analytics",
        "pivotics.db",
        "pivotics.dimensionui",
        "pivotics.tableoptionsui",
        "pivotics.tableui",
        "pivotics.htmlloader",
        "pivotics.cellrenderer",
        "pivotics.fs",
        "pivotics.htmlloader"], function (core, analytics, db, dimensionui, tableoptionsui, tableui, htmlloader,
    cellrenderer, fs, loader) {

    var main = {};

    var database = null;

    // =========================================================================
    // create dimensions
    // =========================================================================
    var createDimensions = function (data) {
        var dimensions = [];
        for (var name in data) {
            var dimension = analytics.dimension({
                name: name,
                key: true
            });
            dimensions.push(dimension);
        }
        return dimensions;
    };

    // =========================================================================
    // init import tab
    // =========================================================================
    main.initImport = function () {

        $("#importButton").click(function () {
            var file = $("#importInput")[0].files[0];
            core.readFile(file, $("#importStatus"), function (file, evt) {
                if (core.endsWith(file.name.toLowerCase(), ".csv")) {
                    main.importCsv(evt.target.result);
                } else {
                    main.importJSON(evt.target.result);
                }
                $("#importStatus").text(database.getLength() + " records imported to memory");
                main.setHeader(database.title(), database.subtitle(), database.link());
                core.url().parameter('db', database.name()).submit();
                $("#databaseInput").val(database.name());
            });
        });

        $("#loadBuiltinTestData").click(
            function () {
                database = db.database({
                    name: 'pivotics_test',
                    onSuccess: function (database) {
                        main.setHeader(database.title(), database.subtitle(), database.link());
                        core.url().parameter('db', 'pivotics_test').parameterJSON('rows', ['backlogitem', 'task']).parameterJSON('cols', ['type', 'measure'])
                            .parameterJSON('measures', ['prio', 'icon']).submit();
                        $("#databaseInput").val(database.name());
                        alert(database.getLength() + " records loaded");
                    },
                    onError: function (e) {
                        alert(e.statusText);
                    }
                });
            });

    };

    // =========================================================================
    // import csv
    // =========================================================================
    main.importCsv = function (dataRaw) {

        // convert csv to objects
        var data = $.csv.toObjects(dataRaw);
        if (data.length === 0) {
            alert("No data!");
            return;
        }

        // create dimensions
        var dimensions = createDimensions(data[0]);

        // create database
        database = db.database({
            data: data,
            dimensions: dimensions,
            name: 'import'
        });

    };

    // =========================================================================
    // import json
    // =========================================================================
    main.importJSON = function (dataRaw) {

        // convert json string to json object
        if (dataRaw.length === 0) {
            alert("No data!");
            return;
        }
        var importDb = JSON.parse(dataRaw);

        // create database from json object
        database = db.database({
            name: 'import',
            data: []
        });
        database.fromJSON(importDb);

    };
    // =========================================================================
    // init configure tab
    // =========================================================================
    main.initConfigure = function () {
        $("#dimensionui").empty();
        if (!database) {
            return;
        }
        $("#dbtitle").val(database.title());
        $("#dbsubtitle").val(database.subtitle());
        $("#dblink").val(database.link());
        dimensionui.DimensionTable({
            parentNode: $("#dimensionui"),
            database: database,
            onApply: function () {
                database.title($("#dbtitle").val());
                database.subtitle($("#dbsubtitle").val());
                database.link($("#dblink").val());
                main.setHeader(database.title(), database.subtitle(), database.link());
                alert("ok");
            }
        });
    };

    // =========================================================================
    // init analyze tab
    // =========================================================================
    main.initAnalyze = function () {
        if (!database) {
            return;
        }
        main.analyzer({
            database: database,
            rowDimensions: [],
            colDimensions: ['']
        });
    };

    // =========================================================================
    // init export tab
    // =========================================================================
    main.initExport = function () {
        if (!database) {
            return;
        }
        $("#exportButton").click(function () {

            var data = null;
            var exportFormat = $("input[name='export']:checked").val();

            switch (exportFormat) {
            case 'JSON':
                data = JSON.stringify(database.toJSON());
                break;
            case 'CSV':
                data = database.exportCsv();
                break;
            }

            var URL = window.URL || window.webkitURL;
            var blob = new Blob([data], {
                //'type': 'text\/plain'
                'type': 'application\/octet-stream'
            });
            document.location = URL.createObjectURL(blob);

        });
    };

    // =========================================================================
    // analyzer
    // =========================================================================
    main.analyzer = core.createClass({

        init: function (properties) {

            // fields
            var self = this;

            self.database = properties.database;

            self.measureDimension = analytics.measureDimension([]);
            self.rowDimensions = [];
            self.colDimensions = [];

            self.measureDimension2 = analytics.measureDimension([]);
            self.rowDimensions2 = [];
            self.colDimensions2 = [];

            self.filterCondition = true;
            self.sumFields = 0;
            self.pivotInPivot = false;

            var allDimensions = self.database.getDimensions().slice();
            allDimensions.push(self.measureDimension);
            self.dimensionsMap = self.createDimensionsMap(allDimensions);

            allDimensions = self.database.getDimensions().slice();
            allDimensions.push(self.measureDimension2);
            self.dimensionsMap2 = self.createDimensionsMap(allDimensions);

            // by default all data is valid
            self.database.filter(function () {
                return true;
            });

            // deserialize url
            self.deserializeFromUrl();

            // toggle for complete options dialog
            $("#tableoptions_toggle").click(function () {
                $("#tableoptions").slideToggle();
            });

            // create table option dialog
            $("#tableoptions1").empty();
            self.tabledialog = tableoptionsui.Dialog({
                parentNode: $("#tableoptions1"),
                dimensions: self.database.getDimensions(),
                measureDimension: self.measureDimension,
                rowDimensions: self.rowDimensions,
                colDimensions: self.colDimensions,
                applyButtonActive: false
            });

            // filter area
            $("#filterarea").val(self.filterCondition);

            // number sum fields
            $("#sumfields").val(self.sumFields);

            // pivot in pivot checkbox
            $("#pinp").attr('checked', self.pivotInPivot);
            if (!self.pivotInPivot) {
                $("#tableoptions2").hide();
            }
            $("#pinp").click(function () {
                self.pivotInPivot = $("#pinp").is(":checked");
                $("#tableoptions2").slideToggle();
            });

            // table option dialog for sub pivot table
            $("#tableoptions2").empty();
            self.tabledialog2 = tableoptionsui.Dialog({
                parentNode: $("#tableoptions2"),
                dimensions: self.database.getDimensions(),
                measureDimension: self.measureDimension2,
                rowDimensions: self.rowDimensions2,
                colDimensions: self.colDimensions2,
                applyButtonActive: false
            });

            // callback for apply button
            $("#tableoptions_button").click(function () {
                self.apply();
            });

            // auto apply
            self.apply();
        },

        setSumExtendFunctions: function () {
            var self = this;
            for (var i = 0; i < self.database.getDimensions().length; ++i) {
                self.database.getDimensions()[i].extend = null;
            }
            if (self.sumFields > 0) {
                self.rowDimensions[0].extend = analytics.sumExtend(self.sumFields, self.rowDimensions.length);
            }
        },

        createDimensionsMap: function (dimensions) {
            var map = {};
            for (var i = 0; i < dimensions.length; ++i) {
                var dimension = dimensions[i];
                map[dimension.name] = dimension;
            }
            return map;
        },

        apply: function () {

            var self = this;

            // apply filter
            var filterCondition = this.filterCondition = $("#filterarea").val();
            var evalFunction = function () {
                return eval(filterCondition); // jshint ignore:line
            };
            self.database.filter(evalFunction);

            // apply for table options dialog
            this.tabledialog.apply();
            this.tabledialog2.apply();

            // sum fields
            this.sumFields = parseInt($("#sumfields").val());
            this.setSumExtendFunctions();

            // serialize
            this.serializeToUrl();

            // create result set
            self = this;
            var resultSet = analytics.resultSet([self.rowDimensions, self.colDimensions], self.database);

            // draw result set
            $("#pivot").empty();
            if (self.pivotInPivot) {
                var renderer = cellrenderer.pivotRenderer(self.rowDimensions2, self.colDimensions2, self.database);
                tableui.Table({
                    resultSet: resultSet,
                    cellRenderer: renderer
                }).render($("#pivot"));
            } else {
                tableui.Table({
                    resultSet: resultSet
                }).render($("#pivot"));
            }

        },

        serializeDimensions: function (dimensions) {
            var result = [];
            for (var i = 0; i < dimensions.length; ++i) {
                var dimension = dimensions[i];
                result.push(dimension.name);
            }
            return result;
        },

        serializeToUrl: function () {
            var url = core.url();
            url.parameterJSON('rows', this.serializeDimensions(this.rowDimensions));
            url.parameterJSON('cols', this.serializeDimensions(this.colDimensions));
            url.parameterJSON('measures', this.serializeDimensions(this.measureDimension.measures));
            url.parameterJSON('rows2', this.serializeDimensions(this.rowDimensions2));
            url.parameterJSON('cols2', this.serializeDimensions(this.colDimensions2));
            url.parameterJSON('measures2', this.serializeDimensions(this.measureDimension2.measures));
            url.parameter('sum', this.sumFields);
            url.parameter('filter', this.filterCondition);
            url.parameter('pinp', this.pivotInPivot);
            url.submit();
        },

        deserializeDimensions: function (dimensionsMap, dimensionNames) {
            var result = [];
            if (!dimensionNames) {
                return result;
            }
            for (var i = 0; i < dimensionNames.length; ++i) {
                var name = dimensionNames[i];
                var dimension = dimensionsMap[name];
                if (dimension) {
                    result.push(dimension);
                }
            }
            return result;
        },

        deserializeFromUrl: function () {

            var url = core.url();

            this.colDimensions.length = 0;
            core.append(this.colDimensions, this.deserializeDimensions(this.dimensionsMap, url.parameterJSON('cols')));

            this.rowDimensions.length = 0;
            core.append(this.rowDimensions, this.deserializeDimensions(this.dimensionsMap, url.parameterJSON('rows')));

            this.measureDimension.init(this.deserializeDimensions(this.dimensionsMap, url.parameterJSON('measures')));

            this.colDimensions2.length = 0;
            core.append(this.colDimensions2, this.deserializeDimensions(this.dimensionsMap2, url.parameterJSON('cols2')));

            this.rowDimensions2.length = 0;
            core.append(this.rowDimensions2, this.deserializeDimensions(this.dimensionsMap2, url.parameterJSON('rows2')));

            this.measureDimension2.init(this.deserializeDimensions(this.dimensionsMap2, url.parameterJSON('measures2')));

            var sum = url.parameter('sum');
            if (sum) {
                this.sumFields = parseInt(sum);
            }

            var filter = url.parameter('filter');
            if (filter) {
                this.filterCondition = filter;
            }

            var pinp = url.parameter('pinp');
            if (pinp === 'true') {
                this.pivotInPivot = true;
            } else {
                this.pivotInPivot = false;
            }

        }

    });

    // =========================================================================
    // set header
    // =========================================================================
    main.setHeader = function (title, subtitle, link) {
        $("#header_dbtitle").text(title);
        $("#header_dbsubtitle").text(subtitle);
        $("#header_dbsubtitle").attr("href", link);
    };

    // =========================================================================
    // start
    // =========================================================================
    main.start = function () {

        $("#n_import").click(function () {
            loader.load("#main", "import.html");
        });
        $("#n_configure").click(function () {
            loader.load("#main", "configure.html");
        });
        $("#n_analyze").click(function () {
            loader.load("#main", "analyze.html");
        });
        $("#n_export").click(function () {
            loader.load("#main", "export.html");
        });

        var styleSheet = core.url().parameter('css');
        if (!styleSheet) {
            styleSheet = 'black.css';
        }
        core.loadStyleSheet(styleSheet);

        $("#saveButton").click(function () {
            var databaseName = $("#databaseInput").val();
            if (databaseName.length === 0) {
                alert("enter db name");
                return;
            }
            core.url().parameter('db', databaseName).submit();
            database.name(databaseName);
            database.save(function (flgMerged) {
                htmlloader.load('#main', 'analyze.html');
                if (flgMerged)
                    alert("ok, data was merged");
                else
                    alert("ok");
            }, function (error) {
                alert("error when saving:" + error.statusText);
            });
        });

        $("#loadButton").click(function () {
            var databaseName = $("#databaseInput").val();
            core.url().parameter('db', databaseName).submit();
            database = db.database({
                name: databaseName,
                onSuccess: function (database) {
                    main.setHeader(database.title(), database.subtitle(), database.link());
                    htmlloader.load('#main', 'analyze.html');
                    alert(database.getLength() + " records loaded");
                },
                onError: function (e) {
                    alert("load error:" + e.statusText);
                }
            });

        });

        var databaseName = core.url().parameter('db');
        if (databaseName) {
            $("#databaseInput").val(databaseName);
            database = db.database({
                name: databaseName,
                onSuccess: function (database) {
                    main.setHeader(database.title(), database.subtitle(), database.link());
                    htmlloader.load('#main', 'analyze.html');
                },
                onError: function (e) {
                    alert("load error:" + e.statusText);
                }
            });
        } else {
            htmlloader.load('#main', 'import.html');
        }

    };

    // =========================================================================
    // start application
    // =========================================================================
    main.start();
    return main;

});