
/**
 * Our SocketWar game controller!
 */
var SocketWar = (function(){
	
	var grid, webSocket, player;
	
	var init = function(){
		
		if(!Modernizr.websockets){
			alert('Your browser does not support Web Sockets! You have not business here!');
			return;
		}
		
		var possible = 'abcd';
		var randomLetter = possible.charAt(Math.floor(Math.random() * possible.length));
		var randomNumber = Math.floor(Math.random() * 5)+1;
		
		player = new SocketWar.Player(randomLetter+randomNumber);
		initConnection();
		
	}
	
	var initConnection = function(){
		//With the player selected, let's initialize our WebSocket object. 
		webSocket = new WebSocket("ws://localhost:8080");
		
		webSocket.onopen = function(e){
			
			grid = new SocketWar.Grid('#playground', 6, 14);
			var position = grid.addPlayer(player);
			
			var action = new SocketWar.Action('join', player.getId(), position, player.getName());
			
			var message = {
				playerId: player.getId(),
				action: 'join',
				position: position,
				avatar: player.getName()
			};
			
			webSocket.send(JSON.stringify(message));
			
			SocketWar.KeyboardController.captureKeys(onKeyCapture);
			
		}
		
		webSocket.onmessage = function(e){
			var player, i; 
			var message = JSON.parse(e.data);
			if(message.action === 'join'){
				var newPlayer = new SocketWar.Player(message.avatar, message.playerId);
				grid.addPlayer(newPlayer, message.position)
			}
			else if(message.action === 'leave'){
				grid.removePlayer(message.playerId);
			}
			else if(message.action === 'start'){
				for(i=0; i < message.opponents.length; i++){
					var player = new SocketWar.Player(message.opponents[i].avatar, message.opponents[i].playerId);
					grid.addPlayer(player, message.opponents[i].position);
				}
			}
			else{
				grid.movePlayer(message.playerId, message.action);
			}
			
			console.log(message);
		}
		
		webSocket.onclose = function(e){
			SocketWar.KeyboardController.releaseKeys();
		}
		
		webSocket.onerror = function(e){
			alert('Error connecting! You lose!');
		}
	}
		
	var onKeyCapture = function(action){
		
		var position;
		
		var message = {
			playerId: player.getId(),
			action: action
		};
		
		if(action === 'shot'){
			webSocket.send(JSON.stringify(message));
			return;
		}
		
		if(position = grid.movePlayer(player.getId(), action)){
			message.position = position;
			webSocket.send(JSON.stringify(message));
		}
	}
	
	return {
		init: init
	}
	
})();


SocketWar.Action = function(type, playerId, position, character){this.init(type, playerId, position, character)}
SocketWar.Action.prototype = (function(){
	
	var init = function(type, playerId, position, character){
		
	}
	

	return {
		init: init()
	}
	
})();

SocketWar.Action.fromResponse = function(response){
	var message = JSON.parse(response);
	return new SocketWar.Action();
}

/**
 * Object that represents the game grid.
 * @param string|jquery playground
 * @param int rows
 * @param int cols
 */
SocketWar.Grid = function(playground, rows, cols){this.init(playground,rows,cols);}
SocketWar.Grid.prototype = (function(){

	var init = function(playground, rows, cols){
		
		this.rows = rows;
		this.cols = cols;
		this.playground = $(playground);
		this.players = {};
		
		//Create the grid of the specified size.
		this.obj = $('<div>').addClass('grid');
		for(var i = 0; i < rows; i++){
			for(var j = 0; j < cols; j++){
				this.obj.append($('<div>').addClass('cell'));
			}
		}
		this.playground.html(this.obj);
		
	};
	
	/**
	 * Adds a new player to the list
	 * @param SocketWar.Player player
	 * @param Array position
	 * @returns Array
	 */
	var addPlayer = function(player, pos){

		//Generates random position if not found.
		var position = pos || {x:Math.floor(Math.random() * this.cols), y:Math.floor(Math.random() * this.rows)}
		
		//Prevent out of range positions.
		if(position.x >= this.cols || position.y >= this.rows){
			position = {x:0, y: 0}
		}
		
		//Adds player to the list, if there is no position specified, generate a random one
		this.players[player.getId()] = {
			player: player,
			position: position
		}

		this.playground.append(player.getDomObject());
		return positionatePlayer.call(this, player, position);
		
	}
	
	var removePlayer = function(playerId){
		if(typeof this.players[playerId] === 'undefined'){
			return;
		}
		//Removes dom object
		this.playground.remove(this.players[playerId].player.getDomObject());
		//Removes player from the list
		delete this.players[playerId];
	}
	
	/**
	 * 
	 * @param SocketWar.Player player
	 * @param String offset
	 * @returns {undefined}
	 */
	var movePlayer = function(playerId, direction){
		
		if(typeof this.players[playerId] === 'undefined'){
			return;
		}
		
		var offsetMap = {left: {x:-1, y:0}, right: {x:1, y:0}, up: {x:0, y:-1}, down: {x:0, y:1}};
		var offset = offsetMap[direction];
		
		var currentPosition = this.players[playerId].position;
		var newPosition = {
			x: currentPosition.x + offset.x,
			y: currentPosition.y + offset.y
		}
		
		//Check boudaries
		if(newPosition.x === this._cols || newPosition.x < 0 || newPosition.y === this._rows || newPosition.y < 0){
			return false;
		}
		
		this.players[playerId].position = newPosition;
		
		return positionatePlayer.call(this, this.players[playerId].player, newPosition);
		
	}
	
	var positionatePlayer = function(player, position){
		var domCell = this.obj.children().first();
		var domPlayer = player.getDomObject();
		var cellWidth =  domCell.width() + parseInt(domCell.css('border-left-width')) + parseInt(domCell.css('border-right-width'));
		var cellHeight = domCell.height() + parseInt(domCell.css('border-top-width')) + parseInt(domCell.css('border-bottom-width'))

		domPlayer.css('left', cellWidth * position.x + (cellWidth - domPlayer.width())/2);
		domPlayer.css('top', cellHeight * position.y + (cellHeight - domPlayer.height())/2);
		
		return position;
	}
	
	return {
		init: init,
		addPlayer: addPlayer,
		removePlayer: removePlayer,
		movePlayer: movePlayer
	};
})();

/**
 * Object that represents each player.
 */
SocketWar.Player = function(name, id){this.init(name, id);};
SocketWar.Player.prototype = (function(){

	var init = function(name, id){
		this.obj = $('<div>').addClass('player').addClass(name);
		this.id = id || new Date().getTime();
		this.name = name;
		if(!id){
			this.obj.addClass('myself');
		}
	}
	
	var getId = function(){
		return this.id;
	}
	
	var getDomObject = function(){
		return this.obj;
	}
	
	var getName = function(){
		return this.name;
	}
	
	return {
		init: init,
		getId: getId,
		getDomObject: getDomObject,
		getName: getName
	}
	
})();

SocketWar.KeyboardController = (function(){
	//Prevents holding a key to trigger the event very fast.
	var whichKeyDown = false, 
		callback = null,
		keyMap = {
			37: 'left',
			38: 'up',
			39: 'right',
			40: 'down',
			65: 'left',
			83: 'down',
			68: 'right',
			87: 'up',
			74: 'left',
			73: 'up',
			76: 'right',
			75: 'down',
			77: 'shot',
			88: 'shot'
		}
	/**
	 * Let's start the game
	 */
	var captureKeys = function(handler){
		$(document).keydown(onKeyDown).keyup(onKeyUp);
		callback = handler;
	}
	
	var releaseKeys = function(){
		callback = null;
		$(document).off('keydown keyup');
	}

	var onKeyDown = function(e){
		//Prevents two keys pressed at the same time or one key held down.
		if(whichKeyDown !== false){
			return;
		}
		whichKeyDown = e.which;
		if(typeof keyMap[e.which] !== 'undefined' && callback){
			callback(keyMap[e.which]);
			e.preventDefault();
		}
	}
	
	var onKeyUp = function(e){
		//Release the key only if it's the same initial pressed key
		if(whichKeyDown == e.which){
			whichKeyDown = false;
			e.preventDefault();
		}
	}
	
	return {
		captureKeys: captureKeys,
		releaseKeys: releaseKeys
	}
})();


//Initializes the game whent the document is ready!
$(SocketWar.init);

