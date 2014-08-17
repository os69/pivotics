var http = require('http'), url = require('url'), fs = require('fs'), sys = require('sys'), path = require('path'), server = null;
//var async = require('async');

var LOGFILE = '/var/log/node.log';

var MIME_TYPES = {
	'js'   : 'text/javascript',
	'css'  : 'text/css',
	'jpg'  : 'image/jpeg',
	'json' : 'text/json',
	'html' : 'text/html'
};

var getMimeType = function(filename) {
	var extension = filename.substring(filename.lastIndexOf(".") + 1);
	var mimeType = MIME_TYPES[extension];
	if (!mimeType) {
		mimeType = 'text/plain';
	}
	return mimeType;
};

var serveFile = function(response, filename, prefixes, prefixIndex) {
	
	if (prefixIndex >= prefixes.length) {
		sendError(response, "file not found");
		return;
	}
	
	var filepath = path.join(prefixes[prefixIndex], filename);
	fs.readFile(filepath, function(err, data) {

		if (err) {
			console.log("failed: "+filepath+ " ("+prefixes[prefixIndex]+", "+filename+")" );
			serveFile(response, filename, prefixes, prefixIndex + 1);
			return;
		}

        
        console.log("-->"+filepath,prefixes[prefixIndex],filename);
		response.writeHead(200, {
			'Content-Type' : getMimeType(filepath)
		});
		response.write(data);
		response.end();
	});
};

var handleGet = function(request, response) {
	var params = url.parse(request.url, true);
	console.log(request.url);
	console.log(""+JSON.stringify(params));
	var filename = params.pathname;
	var prefixes = config.loadPaths;
	serveFile(response, filename, prefixes, 0);
};

var sendError = function(response, message) {
	sys.puts(message);
	response.writeHead(500);
	response.write(message);
	response.end();
};

var readBody = function(request, callback) {
	var body = '';
	request.on('data', function(data) {
		body += data;
	});
	request.on('end', function() {
		callback(null, body);
	});
};

var handlePost = function(request, response) {

	var params = url.parse(request.url, true);
	var filename = path.join(config.savePath, params.pathname);
	readBody(request,function(err,body){
		fs.writeFile(filename, body, function(err) {
			if (err) {
				sendError(response, err.toString());
				return;
			}
			response.writeHead(200);
			response.end();
		});

	});
};

server = http.createServer(function(request, response) {

	if (request.method === 'GET') {
		handleGet(request, response);
	}
	if (request.method === 'POST') {
		handlePost(request, response);
	}

});

var configString = fs.readFileSync(process.argv[2],"utf8");
eval("var config="+configString);

console.log("Server hostname :",config.address);
console.log("Server port     :",config.port);
server.listen(config.port, config.address);
