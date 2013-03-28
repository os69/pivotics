define([ ], function() {

	var loader = {};
	
	loader.load = function(node,path){
		$.get(path,function(content){
			$(node).empty();
			$(node).append(content);
		});
	};
	
	return loader;
});