/* global require */
/* global console */

var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var merge = require('./merge');

// mime types
// ===========================================================================

var MIME_TYPES = {
    'js': 'text/javascript',
    'css': 'text/css',
    'jpg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'json': 'text/json',
    'html': 'text/html'
};

var getMimeType = function (filename) {
    var extension = filename.substring(filename.lastIndexOf(".") + 1);
    var mimeType = MIME_TYPES[extension];
    if (!mimeType) {
        mimeType = 'text/plain';
    }
    return mimeType;
};

// server
// ===========================================================================

var Server = function () {
    this.init.apply(this, arguments);
};

Server.prototype = {

    init: function (host, port) {
        var self = this;
        console.log('Starting server ' + host + ':' + port);
        this.server = http.createServer(function () {
            self.handleRequest.apply(self, arguments);
        });
        this.server.listen(port, host);
    },

    handleRequest: function (request, response) {

        var params = url.parse(request.url, true);
        //console.log(request.url);
        //console.log("" + JSON.stringify(params));

        if (request.method === 'GET')
            this.handleGet(params, request, response);
        if (request.method === 'POST')
            this.handlePost(params, request, response);
    },

    handleGet: function (params, request, response) {
        this.serveFile(response, params.pathname);
    },

    handlePost: function (params, request, response) {
        this.saveFile(params, request, response);
    },

    readBody: function (request, callback) {
        var body = '';
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function () {
            callback(null, body);
        });
    },

    saveFile: function (params, request, response) {

        var self = this;

        this.readBody(request, function (err, data) {

            // error handling
            if (err) {
                console.log("ERROR read request body: " + err.toString());
                response.writeHead(500, {});
                response.end();
                return;
            }

            // client sends old and new (changed) data
            data = JSON.parse(data);
            var newData = data.newData;
            var oldData = data.oldData;

            // read data from file 
            var filePath = path.join('.', params.pathname);
            fs.readFile(filePath, function (err, fileData) {

                // write data without merge if
                //  (1) no existing file on filesystem
                //  (2) version=1 : new database to be initalized 
                if (err || newData.header.version===1) {
                    console.log("file does not exist -> write without merge");
                    self.writeFile(response, filePath, newData);
                    return;
                }

                // merge data
                fileData = JSON.parse(fileData);
                var mergeResult = self.merge(newData, oldData, fileData);

                // save merged data
                self.writeFile(response, filePath, mergeResult.data);

                // send back merged data to client
                if (mergeResult.merged) {
                    var responseData = JSON.stringify(mergeResult.data);
                    response.writeHead(200, {
                        'Content-Length': responseData.length,
                        'Content-Type': MIME_TYPES.json
                    });
                    response.write(responseData);
                }
                response.end();

            });


        });
    },

    writeFile: function (response, filePath, data) {
        fs.writeFile(filePath, JSON.stringify(data), function (err) {
            if (err) {
                console.log("ERROR write file: " + err.toString());
                response.writeHead(500, err.toString(), {});
                response.end();
                return;
            }
            response.writeHead(200);
            response.end();
            console.log("save file:" + filePath);
        });
    },

    merge: function (myData, baseData, otherData) {
        if (baseData.header.version === otherData.header.version) {
            // no merge necessary
            return {
                merged: false,
                data: myData
            };
        } else {
            // merge
            var keyFields = this.extractKeyFields(myData.dimensions);
            var mergedData = new merge.merge(myData.data, baseData.data, otherData.data, keyFields);
            myData.header.version = otherData.header.version+1;
            return {
                merged: true,
                data: {
                    dimensions: myData.dimensions,
                    data: mergedData,
                    header: myData.header
                }
            };
        }
    },

    serveFile: function (response, pathname) {
        var filepath = path.join('.', pathname);
        fs.readFile(filepath, function (err, data) {
            if (err) {
                console.log("ERROR file not found: " + filepath);
                response.writeHead(404, {});
                response.end();
                return;
            }
            console.log("file:" + filepath);
            response.writeHead(200, {
                'Content-Length': data.length,
                'Content-Type': getMimeType(filepath)
            });
            response.write(data);
            response.end();
        });
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

// main
// ===========================================================================
new Server('localhost', 51000);
