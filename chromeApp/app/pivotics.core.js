define([], function() {

	"use strict";

	// =========================================================================
	// packages
	// =========================================================================
	var core = {};

	// =========================================================================
	// helper: create object with prototype
	// =========================================================================
	core.object = function(prototype) {
		var TmpFunction = function() {
		};
		TmpFunction.prototype = prototype;
		return new TmpFunction();
	};

	// =========================================================================
	// helper: extend object
	// =========================================================================
	core.extend = function(o1, o2) {
		for ( var key in o2) {
			o1[key] = o2[key];
		}
		return o1;
	};

	// =========================================================================
	// helper: generate constructor function
	// =========================================================================
	var generateConstructorFunction = function() {
		var ConstructorFunction = null;
		ConstructorFunction = function() {
			if (!(this instanceof ConstructorFunction)) {
				return new ConstructorFunction("blub", arguments);
			}
			if (this.init) {
				if (arguments.length == 2 && arguments[0] === "blub") {
					this.init.apply(this, arguments[1]);
				} else {
					this.init.apply(this, arguments);
				}
			}
		};
		return ConstructorFunction;
	};

	// =========================================================================
	// create class
	// =========================================================================
	core.createClass = function(prototype) {
		var Cls = generateConstructorFunction();
		Cls.prototype = prototype;
		return Cls;
	};

	// =========================================================================
	// create derived class
	// =========================================================================
	core.createDerivedClass = function(parentClass, prototype) {
		var Cls = generateConstructorFunction();
		Cls.prototype = core.extend(core.object(parentClass.prototype), prototype);
		return Cls;
	};

	// =========================================================================
	// copy options
	// =========================================================================
	core.copyOptions = function(target, source) {
		for ( var name in source) {
			if (source.hasOwnProperty(name)) {
				target[name] = source[name];
			}
		}
	},

	// =========================================================================
	// get url parameter
	// =========================================================================
	core.getURLParameter = function(name) {
		// var search = decodeURIComponent(location.search.replace(/\+/g, " "));
		// var search = decodeURIComponent(location.search);
		var search = location.search;
		var value = (RegExp(name + '=' + '(.+?)(&|$)').exec(search) || [ , null ])[1];
		if (!value) {
			return value;
		}
		value = decodeURIComponent(value.replace(/\+/g, " "));
		return value;
	};

	// =========================================================================
	// url manager
	// =========================================================================
	core.url = core.createClass({

		init : function() {
			this.load();
		},

		load : function() {
			this.parameters = {};
			var parameterString = window.location.search.substring(1);
			var parameters = parameterString.split("&");
			for ( var i = 0; i < parameters.length; i++) {
				if(parameters[i].length===0){
					continue;
				}
				var pair = parameters[i].split("=");
				var name = this.decode(pair[0]);
				var value = this.decode(pair[1]);
				this.parameters[name] = value;
			}
		},

		parameter : function(name, value) {
			if (arguments.length === 1) {
				return this.parameters[name];
			} else {
				this.parameters[name] = value;
			}
			return this;
		},

		parameterJSON : function(name, value) {
			if (arguments.length === 1) {
				var value2 = this.parameters[name];
				if(typeof value2 === 'undefined'){
					return value2;
				}
				return JSON.parse(value2);
			} else {
				this.parameters[name] = JSON.stringify(value);
			}
			return this;
		},

		submit : function() {
			var parameterString = "";
			var first = true;
			for ( var parameterName in this.parameters) {
				if (first) {
					first = false;
				} else {
					parameterString += "&";
				}
				var nameString = this.encode(parameterName);
				var valueString = this.encode(this.parameters[parameterName]);
				parameterString += nameString + "=" + valueString;
			}
			var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
			newUrl += "?" + parameterString;
			window.history.pushState("dummy", "Title", newUrl);
		},

		encode : function(text) {
			return encodeURIComponent(text);
		},

		decode : function(text) {
			return decodeURIComponent(text.replace(/\+/g, " "));
		}

	});

	// =========================================================================
	// remove list2 elements from list1
	// =========================================================================
	core.removeElements = function(list1, list2) {
		for ( var i = 0; i < list2.length; ++i) {
			var index = $.inArray(list2[i], list1);
			if (index >= 0) {
				list1.splice(index, 1);
			}
		}
	};

	// =========================================================================
	// remove element from list
	// =========================================================================
	core.removeElement = function(list, elementForRemoval) {
		for ( var i = 0; i < list.length; ++i) {
			var element = list[i];
			if (element === elementForRemoval) {
				list.splice(i, 1);
				--i;
			}
		}
	};

	// =========================================================================
	// check whether object is in arrary
	// =========================================================================
	core.include = function(arr, obj) {
	    for(var i=0; i<arr.length; i++) {
	        if (arr[i] == obj) return true;
	    }
	};

	// =========================================================================
	// append list
	// =========================================================================
	core.append = function(list1,list2){
		list1.push.apply(list1,list2);
	};
	
	// =========================================================================
	// name/value dialog
	// =========================================================================
	core.nameValueDialog = function(options, callback) {

		// append title
		var appendTitle = function(parentNode, field) {
			parentNode.append("<td colspan=2><b>" + field.title + "</b></td>");
		};

		// append input field
		var appendInputField = function(parentNode, field) {
			var nameCell = $("<td></td>");
			parentNode.append(nameCell);
			var field = options.fields[i];
			nameCell.append(field.name);
			var valueCell = $("<td></td>");
			parentNode.append(valueCell);
			if (field.readonly) {
				field.inputField = $("<input readonly='readonly' type='text'/>");
			} else {
				field.inputField = $("<input type='text'/>");
			}
			field.inputField.val(field.value);
			valueCell.append(field.inputField);
		};

		// construct html of dialog
		var content = $("<table></table>");
		for ( var i = 0; i < options.fields.length; ++i) {
			var field = options.fields[i];
			var row = $("<tr></tr>");
			content.append(row);
			if (field.title) {
				appendTitle(row, field);
			} else {
				appendInputField(row, field);
			}
		}

		// dialog widget
		content.dialog({
			buttons : [ {
				text : "Ok",
				click : function() {
					$(this).dialog("close");
					callback();
				}
			} ],
			title : options.title,
			width:400
		});
	};

	// =========================================================================
	// endsWith
	// =========================================================================
	core.endsWith = function(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	};

	// =========================================================================
	// startsWith
	// =========================================================================
	core.startsWith = function(str, prefix) {
		return str.indexOf(prefix) === 0;
	};

	// =========================================================================
	// read file
	// =========================================================================
	core.readFile = function(file, statusArea, callback) {

		if (typeof FileReader == "undefined") {
			alert("Your browser doesn't support the HTML 5 File API!");
			return;
		}

		var reader = new FileReader();

		reader.onload = function(evt) {
			statusArea.html("Ready");
			if (typeof callback == "function")
				callback(file, evt);
		};

		reader.onprogress = function(evt) {
			statusArea.html("Processing");
		};

		reader.onerror = function(evt) {
			statusArea.html("Error (" + evt.target.error.code + ")");
		};

		reader.readAsBinaryString(file);
	};

	// =========================================================================
	// load stylesheet
	// =========================================================================
	core.loadStyleSheet = function(name){
		var link = $("<link>");
	    link.attr({
	            type : 'text/css',
	            rel  : 'stylesheet',
	            href : name
	    });
	    $("head").append( link );		
	};

	// =========================================================================
	// check for chrome app
	// =========================================================================
	core.isChromeApp = function(){
		if(!chrome){
			return false;
		}
		var manifest = chrome.runtime.getManifest();
		if(manifest.name.startsWith("Pivotics")){
			return true;
		}else{
			return false;
		}
	};
	
	return core;
});
