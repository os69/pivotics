define([ "pivotics.core" ], function(core) {

	var fs = null;
	fs = {

		init : function(onSuccess, onError) {
			if (!onError) {
				onError = fs.onError;
			}
			window.webkitStorageInfo.requestQuota(window.PERSISTENT, 20 * 1024 * 1024, function(grantedBytes) {
				window.webkitRequestFileSystem(window.PERSISTENT, grantedBytes, function(fileSystem) {
					fs.fileSystem = fileSystem;
					onSuccess();
				}, onError);
			}, onError);
		},

		save : function(filename, data, onSuccess, onError) {
			if (!onError) {
				onError = fs.onError;
			}
			if (!fs.fileSystem) {
				fs.init(function() {
					fs.doSave(filename, data, onSuccess, onError);
				}, onError);
			} else {
				fs.doSave(filename, data, onSuccess, onError);
			}
		},

		read : function(filename, onSuccess, onError) {
			if (!onError) {
				onError = fs.onError;
			}
			if (!fs.fileSystem) {
				fs.init(function() {
					fs.doRead(filename, onSuccess, onError);
				}, onError);
			} else {
				fs.doRead(filename, onSuccess, onError);
			}
		},

		doRead : function(filename, onSuccess, onError) {
			if (!onError) {
				onError = fs.onError;
			}
			fs.fileSystem.root.getFile(filename, {}, function(fileEntry) {

				fileEntry.file(function(file) {

					var reader = new FileReader();
					reader.onloadend = function(e) {
						onSuccess(this.result);
					};
					reader.readAsText(file);

				}, onError);

			}, onError);
		},

		doSave : function(filename, data, onSuccess, onError) {
			if (!onError) {
				onError = fs.onError;
			}
			fs.fileSystem.root.getFile(filename, {
				create : true
			}, function(fileEntry) {
				fileEntry.createWriter(function(fileWriter) {

					fileWriter.onwriteend = function(e) {
						onSuccess();
					};

					fileWriter.onerror = function(e) {
						onError(e);
					};

					var blob = new Blob([ data ], {
						type : 'text/plain'
					});

					fileWriter.write(blob);

				}, onError);
			}, onError);
		},

		onError : function(e) {
			var msg = '';

			switch (e.code) {
			case FileError.QUOTA_EXCEEDED_ERR:
				msg = 'QUOTA_EXCEEDED_ERR';
				break;
			case FileError.NOT_FOUND_ERR:
				msg = 'NOT_FOUND_ERR';
				break;
			case FileError.SECURITY_ERR:
				msg = 'SECURITY_ERR';
				break;
			case FileError.INVALID_MODIFICATION_ERR:
				msg = 'INVALID_MODIFICATION_ERR';
				break;
			case FileError.INVALID_STATE_ERR:
				msg = 'INVALID_STATE_ERR';
				break;
			default:
				msg = 'Unknown Error';
				break;
			}
			console.log('Error: ' + msg);
		}
	};

	return fs;

});