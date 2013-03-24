(function(global){
	
	global.comments = {};
	
	comments.parse = function(response){
		comments.response = response;
	};
	
	comments.render = function(parentNode){
		for(var i=0;i<comments.response.data.length;++i){
			var comment = comments.response.data[i];
			comments.renderComment(parentNode,comment);
		}
	};
	
	comments.renderComment = function(parentNode,comment){
		
		var container = $("<div class = 'comment-container'></div>");
		parentNode.append(container);
		
		var header = $("<div class = 'comment-header'></div>");
		container.append(header);
		
		var gravatar = $("<img class = 'comment-gravatar' >");
		gravatar.attr("src",comment.user.avatar_url);
		header.append(gravatar);
		
		var id = $("<span class = 'comment-id comment-link'></span>");
		header.append(id);
		var idLink = $("<a></a>");
		id.append(idLink);
		idLink.attr("href","https://www.github.com/" + comment.user.login);
		idLink.text(comment.user.login);
		
		var date = $("<span class='comment-date comment-link'></span>");
		header.append(date);
		var dateLink = $("<a></a>");
		dateLink.text(new Date(comment.created_at).toString());
		var commentlink = "https://github.com/os69/pivotics/issues/1#issuecomment-" + comment.url.substring(comment.url.lastIndexOf("/")+1);
		dateLink.attr("href",commentlink);
		date.append(dateLink);
	      
		var body = $("<div class= 'comment-body'></div>");
		body.text(comment.body);
		container.append(body);
		
	};
	
	
})(window);