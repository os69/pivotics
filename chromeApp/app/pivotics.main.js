define([ "pivotics.core", "pivotics.analytics", "pivotics.db", "pivotics.dimensionui", "pivotics.tableoptionsui", "pivotics.tableui", "pivotics.htmlloader",
		"pivotics.cellrenderer", "pivotics.fs" ], function(core, analytics, db, dimensionui, tableoptionsui, tableui, htmlloader, cellrenderer, fs) {

	var main = {};

	var database = null;

	// =========================================================================
	// create dimensions
	// =========================================================================
	var createDimensions = function(data) {
		var dimensions = [];
		for (name in data) {
			var dimension = analytics.dimension({
				name : name,
				key : true
			});
			dimensions.push(dimension);
		}
		return dimensions;
	};

	// =========================================================================
	// init import
	// =========================================================================
	main.initImport = function() {

		$("#importButton").click(function() {

			var file = $("#importInput")[0].files[0];

			core.readFile(file, $("#importStatus"), function(file, evt) {

				// convert csv to objects
				var dataRaw = evt.target.result;
				var data = $.csv.toObjects(dataRaw);
				if (data.length === 0) {
					alert("No data!");
					return;
				}

				// create dimensions
				var dimensions = createDimensions(data[0]);

				// create database
				database = db.database({
					data : data,
					dimensions : dimensions,
					name : $("#databaseInput").val(),
					onSuccess : function(database) {
						$("#importStatus").text(database.data.length + " records imported");
					}
				});

			});

		});

	};

	// =========================================================================
	// init configure
	// =========================================================================
	main.initConfigure = function() {
		$("#dimensionui").empty();
		if (!database) {
			return;
		}
		$("#dbtitle").val(database.title());
		$("#dbsubtitle").val(database.subtitle());
		$("#dblink").val(database.link());
		dimensionui.DimensionTable({
			parentNode : $("#dimensionui"),
			database : database,
			onApply : function() {
				database.title($("#dbtitle").val());
				database.subtitle($("#dbsubtitle").val());
				database.link($("#dblink").val());
				main.setHeader(database.title(), database.subtitle(), database.link());
				$("#tabs").tabs('select', 2);
			}
		});
	};

	// =========================================================================
	// init analyze
	// =========================================================================
	main.initAnalyze = function() {
		if (!database) {
			return;
		}
		main.analyzer();
	};

	// =========================================================================
	// init export
	// =========================================================================
	main.initExport = function() {
		if (!database) {
			return;
		}
		var csv = database.exportCsv();
		var URL = window.URL || window.webkitURL;
		var blob = new Blob([ csv ], {
			'type' : 'text\/plain'
		});
		document.location = URL.createObjectURL(blob);
	};

	// =========================================================================
	// analyzer
	// =========================================================================
	main.analyzer = core.createClass({

		init : function() {

			// fields
			var self = this;
			self.measureDimension = analytics.measureDimension([]);
			self.rowDimensions = [];
			self.colDimensions = [];

			self.measureDimension2 = analytics.measureDimension([]);
			self.rowDimensions2 = [];
			self.colDimensions2 = [];

			self.filterCondition = true;
			self.sumFields = 0;
			self.pivotInPivot = false;

			var allDimensions = database.dimensions.slice();
			allDimensions.push(self.measureDimension);
			self.dimensionsMap = self.createDimensionsMap(allDimensions);

			allDimensions = database.dimensions.slice();
			allDimensions.push(self.measureDimension2);
			self.dimensionsMap2 = self.createDimensionsMap(allDimensions);

			// by default all data is valid
			database.filter(function() {
				return true;
			});

			// deserialize url
			self.deserializeFromUrl();

			// toggle for complete options dialog
			$("#tableoptions_toggle").click(function() {
				$("#tableoptions").slideToggle();
			});

			// create table option dialog
			$("#tableoptions1").empty();
			self.tabledialog = tableoptionsui.Dialog({
				parentNode : $("#tableoptions1"),
				dimensions : database.dimensions,
				measureDimension : self.measureDimension,
				rowDimensions : self.rowDimensions,
				colDimensions : self.colDimensions,
				applyButtonActive : false
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
			$("#pinp").click(function() {
				self.pivotInPivot = $("#pinp").is(":checked");
				$("#tableoptions2").slideToggle();
			});

			// table option dialog for sub pivot table
			$("#tableoptions2").empty();
			self.tabledialog2 = tableoptionsui.Dialog({
				parentNode : $("#tableoptions2"),
				dimensions : database.dimensions,
				measureDimension : self.measureDimension2,
				rowDimensions : self.rowDimensions2,
				colDimensions : self.colDimensions2,
				applyButtonActive : false
			});

			// callback for apply button
			$("#tableoptions_button").click(function() {
				self.apply();
			});

			// auto apply
			self.apply();
		},

		setSumExtendFunctions : function() {
			var self = this;
			for ( var i = 0; i < database.dimensions.length; ++i) {
				database.dimensions[i].extend = null;
			}
			if (self.sumFields > 0) {
				self.rowDimensions[0].extend = analytics.sumExtend(self.sumFields, self.rowDimensions.length);
			}
		},

		createDimensionsMap : function(dimensions) {
			var map = {};
			for ( var i = 0; i < dimensions.length; ++i) {
				var dimension = dimensions[i];
				map[dimension.name] = dimension;
			}
			return map;
		},

		apply : function() {

			// apply filter
			var filterCondition = this.filterCondition = $("#filterarea").val();
			var evalFunction = function() {
				return eval(filterCondition);
			};
			database.filter(evalFunction);

			// apply for table options dialog
			this.tabledialog.apply();
			this.tabledialog2.apply();

			// sum fields
			this.sumFields = parseInt($("#sumfields").val());
			this.setSumExtendFunctions();

			// close complete options dialog
			//$("#tableoptions").slideToggle();

			// serialize
			this.serializeToUrl();

			// create result set
			var self = this;
			var resultSet = analytics.resultSet([ self.rowDimensions, self.colDimensions ], database);

			// draw result set
			$("#pivot").empty();
			if (self.pivotInPivot) {
				var renderer = cellrenderer.pivotRenderer(self.rowDimensions2, self.colDimensions2, database);
				tableui.Table({
					resultSet : resultSet,
					cellRenderer : renderer
				}).render($("#pivot"));
			} else {
				tableui.Table({
					resultSet : resultSet
				}).render($("#pivot"));
			}

		},

		serializeDimensions : function(dimensions) {
			var result = []
			for ( var i = 0; i < dimensions.length; ++i) {
				var dimension = dimensions[i];
				result.push(dimension.name);
			}
			return result;
		},

		serializeToUrl : function() {
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

		deserializeDimensions : function(dimensionsMap, dimensionNames) {
			var result = [];
			if (!dimensionNames) {
				return result;
			}
			for ( var i = 0; i < dimensionNames.length; ++i) {
				var name = dimensionNames[i];
				var dimension = dimensionsMap[name];
				if (dimension) {
					result.push(dimension);
				}
			}
			return result;
		},

		deserializeFromUrl : function() {

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
	main.setHeader = function(title, subtitle, link) {
		$("#header_dbtitle").text(title);
		$("#header_dbsubtitle").text(subtitle);
		$("#header_dbsubtitle").attr("href", link);
	};

	// =========================================================================
	// start
	// =========================================================================
	main.start = function() {

		//fs.save("balduin","dataxxxyxx",function(){
		alert("saved");
		fs.read("balduin", function(data) {
			alert("read:" + data);
		});
		//});

		var styleSheet = core.url().parameter('css');
		if (!styleSheet) {
			styleSheet = 'black.css';
		}
		core.loadStyleSheet(styleSheet);

		$("#saveButton").click(function() {
			var databaseName = $("#databaseInput").val();
			core.url().parameter('db', databaseName).submit();
			database.name(databaseName);
			database.save(function(ok, error) {
				if (ok) {
					alert("ok");
				} else {
					alert("error when saving:" + error.statusText);
				}
			});
		});
		$("#loadButton").click(function() {
			var databaseName = $("#databaseInput").val();
			core.url().parameter('db', databaseName).submit();
			database = db.database({
				name : databaseName,
				onSuccess : function(database) {
					main.setHeader(database.title(), database.subtitle(), database.link());
					alert(database.data.length + " records loaded");
				}
			});

		});

		var databaseName = core.url().parameter('db');
		if (databaseName) {
			$("#databaseInput").val(databaseName);
			database = db.database({
				name : databaseName,
				onSuccess : function(database) {
					main.setHeader(database.title(), database.subtitle(), database.link());
					htmlloader.load('#main', 'analyze.html');
				}
			});
		} else {
			htmlloader.load('#main', 'import.html');
		}

	};

	return main;

});