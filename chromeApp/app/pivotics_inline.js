require([ "pivotics.main", "pivotics.htmlloader" ], function(main, loader) {
	window.loader = loader;

	$("#n_import").click(function() {
		loader.load("#main", "import.html");
	});
	$("#n_configure").click(function() {
		loader.load("#main", "configure.html");
	});
	$("#n_analyze").click(function() {
		loader.load("#main", "analyze.html");
	});
	$("#n_export").click(function() {
		loader.load("#main", "export.html");
	});

	main.start();
});