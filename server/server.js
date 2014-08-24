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
            var filepath = path.join('.', params.pathname);
            fs.readFile(filepath, function (err, fileData) {

                if (err) {
                    console.log("ERROR read file: " + err.toString());
                    response.writeHead(500, {});
                    response.end();
                    return;
                }

                // merge data
                fileData = JSON.parse(fileData);
                var mergeResult = self.merge(newData, oldData, fileData);

                // save merged data
                fs.writeFile(filepath, JSON.stringify(mergeResult.mergedData), function (err) {

                    if (err) {
                        console.log("ERROR write file: " + err.toString());
                        response.writeHead(500, err.toString(), {});
                        response.end();
                        return;
                    }

                    response.writeHead(200);
                    response.end();
                    console.log("save file:" + filepath);

                });

            });


        });
    },

    merge: function (myData, baseData, otherData) {
        //var merger = new merge.Merger(myData,baseData,otherData);
        return {
            mergedData: myData,
            changed: false
        };
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
    }

};

// main
// ===========================================================================
new Server('localhost', 51000);