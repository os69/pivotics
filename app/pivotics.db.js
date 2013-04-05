define([ "pivotics.core", "pivotics.analytics", "pivotics.fs" ], function(core, analytics, fs) {

    "use strict";

    // =========================================================================
    // packages
    // =========================================================================
    var db = {};

    // =========================================================================
    // database updater
    // =========================================================================
    db.updater = core.createClass({

        init : function(properties) {
            this.database = properties.database;
            this.oldDimensions = this.database.dimensions;
            this.newDimensions = this.copyDimensions(this.oldDimensions);
        },

        update : function() {

            // switch to new dimensions in database
            this.database.dimensions = this.newDimensions;

            // determine added/deleted/changed dimensions
            var delta = this.determineDelta(this.oldDimensions, this.newDimensions);

            // apply delta to data of database
            this.applyDelta(delta, this.database);

            // create new index
            this.database.createIndex();

        },

        copyDimensions : function(dimensions) {
            var result = [];
            for ( var i = 0; i < dimensions.length; ++i) {
                var dimension = dimensions[i];
                var clonedDimension = dimension.clone();
                dimension.specialKey = dimension.name;
                clonedDimension.specialKey = dimension.name;
                result.push(clonedDimension);
            }
            return result;
        },

        applyDelta : function(delta, database) {
            for ( var i = 0; i < database.data.length; ++i) {
                var record = database.data[i];
                this.applyDeltaRecord(delta, record);
            }
        },

        applyDeltaRecord : function(delta, record) {
            // delete
            for ( var i = 0; i < delta.deleted.length; ++i) {
                var deletedDimension = delta.deleted[i];
                delete record[deletedDimension.name];
            }
            // change
            for ( var i = 0; i < delta.changed.length; ++i) {
                var changedDimension = delta.changed[i];
                if (changedDimension.dataTypeChanged) {
                    this.convertDataType(record, changedDimension.newDimension);
                }
                if (changedDimension.nameChanged) {
                    this.convertName(record, changedDimension);
                }
            }
            // add
            for ( var i = 0; i < delta.added.length; ++i) {
                var addedDimension = delta.added[i];
                record[addedDimension.name] = addedDimension.initialValue;
            }
        },

        determineDelta : function(oldDimensions, newDimensions) {

            var addedDimensions = [];
            var deletedDimensions = [];
            var changedDimensions = [];

            var newDimensionsMap = this.createMap(newDimensions);
            for ( var i = 0; i < oldDimensions.length; ++i) {
                var oldDimension = oldDimensions[i];
                var newDimension = newDimensionsMap[oldDimension.specialKey];
                if (newDimension) {
                    var changedDimension = this.determineDimensionChanges(oldDimension, newDimension);
                    if (changedDimension) {
                        changedDimensions.push(changedDimension);
                    }
                } else {
                    deletedDimensions.push(oldDimension);
                }
            }

            var oldDimensionsMap = this.createMap(oldDimensions);
            for ( var i = 0; i < newDimensions.length; ++i) {
                var newDimension = newDimensions[i];
                var oldDimension = oldDimensionsMap[newDimension.specialKey];
                if (!oldDimension) {
                    addedDimensions.push(newDimension);
                }
            }

            return {
                added : addedDimensions,
                deleted : deletedDimensions,
                changed : changedDimensions
            };
        },

        determineDimensionChanges : function(oldDimension, newDimension) {
            var changedDimension = {};
            changedDimension.oldDimension = oldDimension;
            changedDimension.newDimension = newDimension;
            changedDimension.dataTypeChanged = false;
            changedDimension.nameChanged = false;
            var changed = false;
            if (oldDimension.dataType !== newDimension.dataType) {
                changedDimension.dataTypeChanged = true;
                changed = true;
            }
            if (oldDimension.name !== newDimension.name) {
                changedDimension.nameChanged = true;
                changed = true;
            }
            if (changed) {
                return changedDimension;
            } else {
                return false;
            }

        },

        createMap : function(dimensions) {
            var map = {};
            for ( var i = 0; i < dimensions.length; ++i) {
                var dimension = dimensions[i];
                map[dimension.specialKey] = dimension;
            }
            return map;
        },

        convertName : function(record, changedDimension) {
            var value = record[changedDimension.oldDimension.name];
            delete record[changedDimension.oldDimension.name];
            record[changedDimension.newDimension.name] = value;
        },

        convertDataType : function(record, dimension) {
            var value = record[dimension.name];
            value = "" + dimension.dataType.int2ext(value);
            record[dimension.name] = dimension.dataType.ext2int(value);
        },

    });

    // =========================================================================
    // database
    // =========================================================================
    db.database = core.createClass({

        init : function(properties) {
            var self = this;
            self.pathPrefix = "../data/";
            self.filename = properties.name;
            if (!properties.onError) {
                properties.onError = function(e) {
                    alert(e);
                };
            }
            if (properties.data) {
                if(properties.data.length===0){
                    return;
                }
                self.dimensions = properties.dimensions;
                self.data = properties.data;
                self.header = {
                    version : 0,
                    title : 'New DB',
                    subtitle : 'new db',
                    link : 'http://www.google.com'
                };
                self.createIndex();
                if (properties.onSuccess) {
                    properties.onSuccess(self);
                }
            } else {
                self.dimensions = [];
                self.data = null;
                self.header = null;
                self.load(function() {
                    self.createIndex();
                    if (properties.onSuccess) {
                        properties.onSuccess(self);
                    }
                }, properties.onError);
            }
        },

        name : function() {
            if (arguments.length === 0) {
                return this.filename;
            } else {
                var filename = arguments[0];
                if (this.filename !== filename) {
                    this.filename = filename;
                    this.header.version = 0;
                }
            }
        },

        title : function() {
            if (arguments.length === 0) {
                return this.header.title;
            } else {
                this.header.title = arguments[0];
            }
        },

        subtitle : function() {
            if (arguments.length === 0) {
                return this.header.subtitle;
            } else {
                this.header.subtitle = arguments[0];
            }
        },

        link : function() {
            if (arguments.length === 0) {
                return this.header.link;
            } else {
                this.header.link = arguments[0];
            }
        },

        createRelatedDatabase : function(visibleData) {
            return db.relatedDatabase(this, visibleData);
        },

        getKeyDimensions : function(dimensions) {
            var result = [];
            for ( var i = 0; i < dimensions.length; ++i) {
                var dimension = dimensions[i];
                if (dimension.name === 'measure') {
                    continue;
                }
                if (dimension.key) {
                    result.push(dimension);
                }
            }
            return result;
        },

        getDataDimensions : function(dimensions) {
            var result = [];
            for ( var i = 0; i < dimensions.length; ++i) {
                var dimension = dimensions[i];
                if (dimension.name === 'measure') {
                    continue;
                }
                if (!dimension.key) {
                    result.push(dimension);
                }
            }
            return result;
        },

        load : function(onSuccess, onError) {
            var self = this;
            var tmpOnSuccess = function(data) {
                self.fromJSON(data);
                if (onSuccess) {
                    onSuccess();
                }
            };
            var tmpOnError = function(error) {
                if (onError) {
                    onError(error);
                }
            };
            if (core.isChromeApp() && self.filename!=='pivotics_test') {
                fs.read(self.filename + ".json", tmpOnSuccess, tmpOnError);
            } else {
                $.ajax({
                    type : "GET",
                    url : self.pathPrefix + self.filename + ".json",
                    async : true,
                    success : tmpOnSuccess,
                    error : tmpOnError
                });
            }
        },

        fromJSON : function(data) {
            var self = this;
            var responseJson = null;
            if (typeof data === 'string') {
                responseJson = JSON.parse(data);
            } else {
                responseJson = data;
            }
            self.data = responseJson.data;
            self.header = responseJson.header;
            if (responseJson.dimensions) {
                self.dimensions = responseJson.dimensions.map(function(dimJSON) {
                    return analytics.parseDimension(dimJSON);
                });
            } else {
                self.dimensions = self.generateDimensions(self.data);
            }
        },

        generateDimensions : function(data) {
            if (data.length === 0) {
                return [];
            }
            var dimensions = [];
            var record = data[0];
            for ( var attribute in record) {
                dimensions.push(analytics.dimension({
                    name : attribute,
                    key : true
                }));
            }
            return dimensions;
        },

        createIndex : function() {
            var self = this;
            self.keyDimensions = self.getKeyDimensions(self.dimensions);
            self.dataDimensions = self.getDataDimensions(self.dimensions);
            self.index = {};
            for ( var i = 0; i < self.data.length; ++i) {
                var record = self.data[i];
                var key = self.getKey(record);
                if (self.index.hasOwnProperty(key)) {
                    throw "inconsistend db" + key;
                }
                self.index[key] = record;
            }
        },

        getKey : function(record) {
            var self = this;
            var key = "";
            for ( var i = 0; i < self.keyDimensions.length; ++i) {
                key += "/" + record[self.keyDimensions[i].name];
            }
            return key;
        },

        filter : function(isValidFunction) {
            var self = this;
            for ( var i = 0; i < self.data.length; i++) {
                if (isValidFunction.apply(self.data[i])) {
                    self.data[i].valid = true;
                } else {
                    self.data[i].valid = false;
                }
            }
        },

        changeRecord : function(record, name, value) {
            var self = this;

            // determine new and old key
            var keyOld = self.getKey(record);
            var recordNew = $.extend({}, record);
            recordNew[name] = value;
            var keyNew = self.getKey(recordNew);

            if (keyOld !== keyNew) {
                // key change
                if (self.index.hasOwnProperty(keyNew)) {
                    throw "duplicate key when changing records:" + keyNew;
                }
                delete self.index[keyOld];
                self.index[keyNew] = record;
                record[name] = value;
            } else {
                // no key change -> change record
                record[name] = value;
            }

        },

        addRecords : function(records) {
            var self = this;
            for ( var i = 0; i < records.length; ++i) {
                self.addRecord(records[i]);
            }
        },

        addRecord : function(record) {
            var self = this;
            self.setKeyDefaultValues(record);
            var key = self.getKey(record);
            if (self.index.hasOwnProperty(key)) {
                alert("duplicate key when adding record:" + key);
                return;
            }
            self.setDataDefaultValues(record);
            self.data.push(record);
            self.index[key] = record;
        },

        setKeyDefaultValues : function(record) {
            var self = this;
            for ( var i = 0; i < self.keyDimensions.length; ++i) {
                var dimension = self.keyDimensions[i];
                if (!record.hasOwnProperty(dimension.name)) {
                    record[dimension.name] = dimension.initialValue;
                }
            }
        },

        setDataDefaultValues : function(record) {
            var self = this;
            for ( var i = 0; i < self.dataDimensions.length; ++i) {
                var dimension = self.dataDimensions[i];
                if (!record.hasOwnProperty(dimension.name)) {
                    record[dimension.name] = dimension.initialValue;
                }
            }
        },

        removeRecords : function(records) {
            var self = this;
            for ( var i = 0; i < records.length; ++i) {
                self.removeRecord(records[i]);
            }
        },

        removeRecord : function(record) {
            var self = this;
            var key = self.getKey(record);
            delete self.index[key];
            var index = $.inArray(record, self.data);
            if (index >= 0) {
                self.data.splice(index, 1);
            }
        },

        toJSON : function(){
            
            // assemble saveData from self.data
            var self = this;
            var saveData = [];
            for ( var i = 0; i < self.data.length; ++i) {
                var record = $.extend({}, self.data[i]);
                delete record.originalTuple;
                delete record.measure;
                delete record.value;
                delete record.valid;
                saveData.push(record);
            }

            // serialize dimensions
            var dimensions = self.dimensions.map(function(dimension) {
                return dimension.toJSON();
            });
          
            // return JSON
            return{
                data : saveData,
                header : self.header,
                dimensions : dimensions
            };
            
        },
        
        save : function(onSuccess, onError) {

            var self = this;
            
            // increase version
            self.header.version++;
  
            // assemble string with json data
            var saveDataString = JSON.stringify(self.toJSON());

            // success handler
            var tmpOnSuccess = function() {
                if (onSuccess) {
                    onSuccess();
                }
            };

            // error handler
            var tmpOnError = function(error) {
                self.header.version--; // undo version increment
                if (onError) {
                    onError(error);
                }
            };

            // post
            if (core.isChromeApp()) {
                fs.save(self.filename + ".json", saveDataString, tmpOnSuccess, tmpOnError);
            } else {
                $.ajax({
                    type : 'POST',
                    url : self.pathPrefix + self.filename + ".json",
                    data : saveDataString,
                    processData : false,
                    dataType : 'json'
                }).error(tmpOnError).success(tmpOnSuccess);
            }

        },

        exportCsv : function() {
            var result = "";
            for ( var i = 0; i < this.dimensions.length; ++i) {
                var dimension = this.dimensions[i];
                result += '"' + dimension.name + '"';
                if (i < this.dimensions.length - 1) {
                    result += ",";
                }
            }
            result += "\n";
            for ( var i = 0; i < this.data.length; ++i) {
                var record = this.data[i];
                for ( var j = 0; j < this.dimensions.length; ++j) {
                    var dimension = this.dimensions[j];
                    result += '"' + record[dimension.name] + '"';
                    if (j < this.dimensions.length - 1) {
                        result += ",";
                    } else {
                        result += "\n";
                    }
                }

            }

            return result;
        }

    });

    // =========================================================================
    // related database
    // =========================================================================
    db.relatedDatabase = core.createClass({

        init : function(mainDatabase, visibleData) {
            this.mainDatabase = mainDatabase;
            this.data = visibleData;
            this.dimensions = mainDatabase.dimensions;
        },

        changeRecord : function(record, name, value) {
            this.mainDatabase.changeRecord(record, name, value);
        },

        addRecords : function(records) {
            this.mainDatabase.addRecords(records);
        },
        
        removeRecords : function(records) {
            this.mainDatabase.removeRecords(records);
        },


    });

    return db;
});
