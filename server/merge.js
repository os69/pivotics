/* global exports */

exports.Records = function () {
    this.init.apply(this, arguments);
};

exports.Records.prototype = {

    init: function (data, keyFields) {
        this.data = data;
        this.keyFields = keyFields;
        this.createIndex();
    },

    createIndex: function () {
        this.index = {};
        for (var i = 0; i < this.data.length; ++i) {
            var record = this.data[i];
            this.index[this.getKey(record)] = record;
        }
    },

    getKey: function (record) {
        var keyValues = [];
        for (var i = 0; i < this.keyFields; ++i) {
            var keyField = this.keyFields[i];
            keyValues.push(record[keyField]);
        }
        return keyValues.join('__');
    },

    getByKey: function (key) {
        return this.index[key];
    },

    diff: function (records) {
        var diffRecords = [];
        var record1, record2;
        for (var i = 0; i < this.data.length; ++i) {
            record1 = this.data[i];
            record2 = records.getByKey(this.getKey(record1));
            if (record2 === undefined) {
                diffRecords.push({
                    status: '+',
                    record: record1
                });
            } else {
                var diffRecord = this.compareRecord(record1, record2);
                if (diffRecord) diffRecords.push(diffRecord);
            }
        }
        for (i = 0; i < records.data.length; ++i) {
            record2 = records.data[i];
            record1 = this.getByKey(this.getKey(record2));
            if (record1 === undefined) {
                diffRecords.push({
                    status: '-',
                    record: record2
                });
            }
        }
        return diffRecords;
    }

};

exports.Merger = function () {
    this.init.apply(this, arguments);
};

exports.Merger.prototype = {

    init: function (myData, baseData, otherData) {
        var keyFields = this.extractKeyFields(myData.dimensions);
        var myRecords = new exports.Records(myData.data);
        var baseRecords = new exports.Records(baseData.data);
        var otherRecords = new exports.Records(otherData.data);
    },

    merge: function () {

    },

    extractKeyFields: function (dimensions) {
        var keyFields = [];
        for (var i = 0; i < dimensions.length; ++i) {
            var dimension = dimensions[i];
            if (dimension.key) keyFields.push(dimension.name);
        }
        return keyFields;
    }

};