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

    clone: function () {
        var data = JSON.parse(JSON.stringify(this.data));
        var keyFields = JSON.parse(JSON.stringify(this.keyFields));
        return new exports.Records(data, keyFields);
    },

    createIndex: function () {
        this.index = {};
        for (var i = 0; i < this.data.length; ++i) {
            var record = this.data[i];
            this.index[this.getKey(record)] = record;
        }
    },

    getData: function () {
        return this.data;
    },

    getKey: function (record) {
        var keyValues = [];
        for (var i = 0; i < this.keyFields.length; ++i) {
            var keyField = this.keyFields[i];
            keyValues.push(record[keyField]);
        }
        return keyValues.join('__');
    },

    getByKey: function (key) {
        return this.index[key];
    },

    compareRecord: function (record1, record2) {
        var diffFields = [];
        var fieldMap = [];
        var compare = function (fieldCatalog) {
            for (var fieldName in fieldCatalog) {
                if (fieldMap[fieldName]) continue;
                fieldMap[fieldName] = true;
                var value1 = record1[fieldName];
                var value2 = record2[fieldName];
                if (value1 !== value2) {
                    diffFields.push({
                        fieldName: fieldName,
                        valueNew: value1,
                        valueOld: value2
                    });
                }
            }
        };
        compare(record1);
        compare(record2);
        if (diffFields.length > 0) {
            return {
                status: '!=',
                diffFields: diffFields
            };
        } else {
            return null;
        }
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
                if (diffRecord) {
                    diffRecord.key = this.getKey(record1);
                    diffRecords.push(diffRecord);
                }
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
    },

    applyDiff: function (diffRecords) {
        var record;
        var resultRecords = this.clone();
        for (var i = 0; i < diffRecords.length; ++i) {
            var diffRecord = diffRecords[i];
            switch (diffRecord.status) {
            case '+':
                resultRecords.addRecord(diffRecord.record, true);
                break;
            case '-':
                record = resultRecords.getByKey(resultRecords.getKey(diffRecord.record));
                if (!record) continue;
                resultRecords.deleteRecord(record);
                break;
            case '!=':
                record = resultRecords.getByKey(diffRecord.key);
                for (var j = 0; j < diffRecord.diffFields.length; ++j) {
                    var diffField = diffRecord.diffFields[j];
                    record[diffField.fieldName] = diffField.valueNew;
                }
                break;
            }
        }
        return resultRecords;
    },

    addRecord: function (newRecord, flgOverwrite) {
        var key = this.getKey(newRecord);
        var record = this.getByKey(key);
        if (record && !flgOverwrite) return;
        this.deleteRecord(record);
        this.index[key] = newRecord;
        this.data.push(newRecord);
    },

    deleteRecord: function (record) {
        // delete from index
        var key = this.getKey(record);
        delete this.index[key];
        // delete from data
        for (var i = 0; i < this.data.length; ++i) {
            if (this.data[i] === record) {
                this.data.splice(i, 1);
                return;
            }
        }
    }

};

exports.merge = function (myData, baseData, otherData, keyFields) {

    var myRecords = new exports.Records(myData, keyFields);
    var baseRecords = new exports.Records(baseData, keyFields);
    var otherRecords = new exports.Records(otherData, keyFields);

    var diff = myRecords.diff(baseRecords);
    var mergedRecords = otherRecords.applyDiff(diff);
    return mergedRecords.getData();

};
