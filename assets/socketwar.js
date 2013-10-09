/**
 * Our SocketWar game controller!
 */
var SocketWar = (function(){
	
	var grid, webSocket, myPlayer, selector;
	
	var init = function(){
		
		if(!Modernizr.websockets){
			alert('Your browser does not support Web Sockets! You have not business here!');
			return;
		}
		
		selector = new SocketWar.CharacterSelector('#playground', startGame);
		
	}
	
	var startGame = function(playerName){
		myPlayer = new SocketWar.Player(playerName);
		initWebSocket();
	}
	
	var initWebSocket = function(){
		webSocket = new WebSocket("ws://localhost:8080");
		
		webSocket.onopen = function(){
			var action;

			grid = new SocketWar.Grid('#playground', 6, 14);
			grid.addPlayer(myPlayer);
			
			action = myPlayer.createAction('join');
			webSocket.send(JSON.stringify(action));

			SocketWar.KeyboardInput.startCapturing(onKeyboardAction);
		};
	
		webSocket.onerror = function(){
			alert('WebSocket connection error!');
		};
		
		webSocket.onmessage = function(e){
			var playerAction = JSON.parse(e.data);
			grid.processPlayerAction(playerAction);
			
			if(playerAction.action === 'shot'){
				if(playerAction.position.x === myPlayer.position.x 
					&& playerAction.position.y === myPlayer.position.y){
					webSocket.close();
				}
			}
		};
		
		webSocket.onclose = function(e){
			showFinalMessage('GAME OVER');
			SocketWar.KeyboardInput.stopCapturing();
		};
		
	}

	var onKeyboardAction = function(action){
		var playerAction;
		if(action === 'shot'){
			playerAction = myPlayer.createAction('shot');
			myPlayer.shot();
		}
		else{
			grid.movePlayer(myPlayer, action);
			playerAction = myPlayer.createAction('move', {direction: action});
		}
		webSocket.send(JSON.stringify(playerAction));
	}
	
	var showFinalMessage = function(message){
		$('#playground').html($('<div>').addClass('error').html(message));
	}
	
	return {
		init: init
	}
	
})();

/**
 * Object that represents the game grid.
 * @param string|jquery playground
 * @param int rows
 * @param int cols
 */
SocketWar.Grid = function(playground, rows, cols){this.init(playground,rows,cols);}
SocketWar.Grid.prototype = (function(){

	var cellSize = {width:0, height:0};

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
		
		var domCell = this.obj.children().first();	
		cellSize.width =  domCell.width() + parseInt(domCell.css('border-left-width')) + parseInt(domCell.css('border-right-width'));
		cellSize.height = domCell.height() + parseInt(domCell.css('border-top-width')) + parseInt(domCell.css('border-bottom-width'))
		
	};
	
	var getPlayer = function(playerId){
		if(typeof this.players[playerId] !== 'undefined'){
			return this.players[playerId];
		}
		return false;
	}
	
	/**
	 * Adds a new player to the list
	 * @param SocketWar.Player player
	 * @param Array position
	 * @returns Array
	 */
	var addPlayer = function(player, pos){

		if(typeof this.players[player.getId()] !== 'undefined'){
			if(typeof pos === 'undefined'){
				pos = player.getPosition();
			}
			this.removePlayer(player);
		}
		
		//Generates random position if not found.
		var position = pos || {x:Math.floor(Math.random() * this.cols), y:Math.floor(Math.random() * this.rows)}
		
		//Prevent out of range positions.
		if(position.x >= this.cols || position.y >= this.rows){
			position = {x:0, y: 0}
		}
		
		player.setPosition(position);
		
		//Adds player to the list, if there is no position specified, generate a random one
		this.players[player.getId()] = player;

		this.playground.append(player.getDomObject());
		
		return positionatePlayer(player);

	}
	
	/**
	 * 
	 * @param SocketWar.Player player
	 * @param String offset
	 * @returns {undefined}
	 */
	var movePlayer = function(player, direction){
		
		var offsetMap = {left: {x:-1, y:0}, right: {x:1, y:0}, up: {x:0, y:-1}, down: {x:0, y:1}};
		var offset = offsetMap[direction];
		
		var currentPosition = player.getPosition();
		var newPosition = {
			x: currentPosition.x + offset.x,
			y: currentPosition.y + offset.y
		}
		
		//Check boudaries
		if(newPosition.x === this.cols || newPosition.x < 0 || newPosition.y === this.rows || newPosition.y < 0){
			return false;
		}
		
		player.setPosition(newPosition);
		return positionatePlayer(player);
		
	}
	
	var positionatePlayer = function(player){
		var position = player.getPosition();
		var domPlayer = player.getDomObject();
		domPlayer.css('left', cellSize.width * position.x + (cellSize.width - domPlayer.width())/2);
		domPlayer.css('top', cellSize.height * position.y + (cellSize.height - domPlayer.height())/2);
		return position
	}
		
	var removePlayer = function(player){
		//Removes dom object
		player.getDomObject().remove();
		//Removes the reference
		delete this.players[player.getId()];
	}
	
	var processPlayerAction = function(playerAction){
		
		if(typeof playerAction.playerId !== 'undefined'){
			var player = this.getPlayer(playerAction.playerId);
			if(!player){
				player = new SocketWar.Player(playerAction.name, playerAction.playerId);
				this.addPlayer(player, playerAction.position);
			}
		}
	
		switch(playerAction.action){
			case 'start':
				initialSetup.call(this, playerAction.otherPlayers);
				break;
			case 'move':
				this.movePlayer(player, playerAction.details.direction);
				break;
			case 'shot':
				player.shot();
				break;
			case 'leave':
				this.removePlayer(player);
				break;		
		}

	}
	
	var initialSetup = function(players){
		var player, i;
		for(i=0; i < players.length; i++){
			player = new SocketWar.Player(players[i].name, players[i].playerId);
			this.addPlayer(player, players[i].position);
		}
	}
	
	return {
		init: init,
		addPlayer: addPlayer,
		removePlayer: removePlayer,
		movePlayer: movePlayer,
		getPlayer: getPlayer,
		processPlayerAction: processPlayerAction
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
	
	var createAction = function(action, details){
		return {
			playerId: this.id,
			action: action,
			position: this.position,
			name: this.name,
			details: details
		};
	}
	
	var setPosition = function(position){
		this.position = position;
	}
	
	var getPosition = function(){
		return this.position;
	}
	
	var shot = function(){
		this.obj.addClass('shot');
		var self = this.obj;
		setTimeout(function(){self.removeClass('shot');}, 90);
	}
	
	return {
		init: init,
		getId: getId,
		getDomObject: getDomObject,
		getName: getName,
		createAction: createAction,
		setPosition: setPosition,
		getPosition: getPosition,
		shot: shot
	}
	
})();

SocketWar.CharacterSelector = function(playground, callback){this.init(playground, callback);}
SocketWar.CharacterSelector.prototype = (function(){
	
	var obj, callback;
	
	var init = function(playground, handler){
		var character;
		
		obj = $('<div>').addClass('character-selector');
		
		obj.append($('<h2>Select your Warrior</h2>'));
		
		var rows = ['a','b','c','d'];
		
		for(var i=0; i < rows.length; i++){
			for(var j=1; j <= 5; j++){
				character = $('<div>').addClass('player').addClass(rows[i]+j).data('name',rows[i]+j).on('click', function(){
					$(this).addClass('selected');
					$(this).siblings().addClass('disabled').off('click');
					$(this).parent().append($('<a href="#" class="start">START</a>').click(startGame));
				});
				obj.append(character);
			}
		}
		
		$(playground).html(obj);
		
		callback = handler;
		
	}
	
	var startGame = function(e){
		e.preventDefault();
		obj.fadeOut(600, function(){
			var playerName = $('.player.selected').data('name');
			callback(playerName);
		});
	}
	
	return {
		init: init
	};
})();

SocketWar.KeyboardInput = (function(){
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
	var startCapturing = function(handler){
		$(document).keydown(onKeyDown).keyup(onKeyUp);
		callback = handler;
	}
	
	var stopCapturing = function(){
		$(document).off('keydown keyup');
		callback = null;
	}

	var onKeyDown = function(e){
		//Prevents two keys pressed at the same time or one key held down.
		if(whichKeyDown !== false){
			return;
		}
		whichKeyDown = e.which;
		if(typeof keyMap[e.which] !== 'undefined'){
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
		startCapturing: startCapturing,
		stopCapturing: stopCapturing
	}
})();


//Initializes the game whent the document is ready!
$(SocketWar.init);

