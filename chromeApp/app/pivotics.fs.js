define([ "pivotics.core" ], function(core) {

    var fs = null;
    fs = {

        init : function(callback) {
            window.webkitStorageInfo.requestQuota(window.PERSISTENT, 20 * 1024 * 1024, function(grantedBytes) {
                console.log("I was granted " + grantedBytes + " bytes.");
                window.webkitRequestFileSystem(window.PERSISTENT, grantedBytes, function(fileSystem) {
                    fs.fileSystem = fileSystem;
                    callback();
                }, function() {
                    alert("error request filesystem");
                });
            }, function() {
                alert("error request quota");
            });
        },

        save : function(filename, data, callback) {
            if (!fs.fileSystem) {
                fs.init(function() {
                    fs.doSave(filename, data, callback);
                });
            } else {
                fs.doSave(filename, data, callback);
            }
        },

        read : function(filename, callback) {
            if (!fs.fileSystem) {
                fs.init(function() {
                    fs.doRead(filename, callback);
                });
            } else {
                fs.doRead(filename, callback);
            }
        },
        
        doRead : function(filename, callback) {
            fs.fileSystem.root.getFile(filename, {}, function(fileEntry) {

                fileEntry.file(function(file) {
                    
                    var reader = new FileReader();

                    reader.onloadend = function(e) {
                        callback(this.result);
                    };

                    reader.readAsText(file);

                });

            });
        },

        doSave : function(filename, data, callback) {
            fs.fileSystem.root.getFile(filename, {
                create : true
            }, function(fileEntry) {
                fileEntry.createWriter(function(fileWriter) {

                    fileWriter.onwriteend = function(e) {
                        callback();
                    };

                    fileWriter.onerror = function(e) {
                        console.log('Write failed: ' + e.toString());
                    };

                    var blob = new Blob([ data ], {
                        type : 'text/plain'
                    });

                    fileWriter.write(blob);

                });
            });
        },

        onInit : function(fileSys) {

            fileSys.root.getFile("balduin", {
                create : true
            }, function(fileEntry) {

                fileEntry.createWriter(function(fileWriter) {

                    fileWriter.onwriteend = function(e) {
                        console.log('Write completed.');
                    };

                    fileWriter.onerror = function(e) {
                        console.log('Write failed: ' + e.toString());
                    };

                    var blob = new Blob([ 'bladuin' ], {
                        type : 'text/plain'
                    });

                    fileWriter.write(blob);

                });
            });
        },

        onError : function() {
            alert("error");
        }
    };

    return fs;

});