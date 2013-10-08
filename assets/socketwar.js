/**
/**
 * Our SocketWar game controller!
 */
var SocketWar = (function(){
	
	var _grid = null, _webSocket, _myPlayer;
	
	var _init = function(){
			
		if(!Modernizr.websockets){
			alert('Your browser does not support Web Sockets! You have not business here!');
			return;
		}
	
		//Let's initialize our WebSocket object. This does not open the connection.
		_webSocket = new WebSocket("ws://localhost:8080");
		
		_myPlayer = new SocketWar.Player('c5');
		_grid = new SocketWar.Grid('#playground', 6, 14);
		_grid.addPlayer(_myPlayer);
		
		SocketWar.KeyboardController.bindMove(_onMove);
		
	}
		
	var _onMove = function(direction){
		var offsetMap = {
			left: {x:-1, y:0},
			right: {x:1, y:0},
			top: {x:0, y:-1},
			down: {x:0, y:1}
		};
		_grid.movePlayer(_myPlayer, offsetMap[direction]);
	}
	
	return {
		init: _init
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

	var _obj, _players, _cellDimension, _rows, _cols, _playground;
	
	var _init = function(playground, rows, cols){
		
		_rows = rows;
		_cols = cols;
		_playground = $(playground);
		_players = {};
		
		//Create the grid of the specified size.
		_obj = $('<div>').addClass('grid');
		for(var i = 0; i < rows; i++){
			for(var j = 0; j < cols; j++){
				_obj.append($('<div>').addClass('cell'));
			}
		}
		_playground.html(_obj);
		
	};
	
	/**
	 * Adds a new player to the list
	 * @param SocketWar.Player player
	 * @param Array position
	 * @returns Array
	 */
	var _addPlayer = function(player, pos){
		//Generates random position if not found.
		var position = pos || {x:Math.floor(Math.random() * _cols), y:Math.floor(Math.random() * _rows)}
		
		//Prevent out of range positions.
		if(position.x >= _cols || position.y >= _rows){
			position = {x:0, y: 0}
		}
		
		//Adds player to the list, if there is no position specified, generate a random one
		_players[player.getId()] = {
			player: player,
			position: position
		}
		
		var domCell = _obj.children().first();
		var domPlayer = player.getDomObject();
		var cellWidth =  domCell.width() + parseInt(domCell.css('border-left-width')) + parseInt(domCell.css('border-right-width'));
		var cellHeight = domCell.height() + parseInt(domCell.css('border-top-width')) + parseInt(domCell.css('border-bottom-width'))
		
		_playground.append(domPlayer);
			
		domPlayer.css('left', cellWidth * position.x + (cellWidth - domPlayer.width())/2);
		domPlayer.css('top', cellHeight * position.y + (cellHeight - domPlayer.height())/2);
		
		return position;
	}
	
	var _removePlayer = function(player){_playerPosition[i*rows + j]
		if(typeof _players[player.getId()] === 'undefined'){
			return;
		}
		//Removes dom object
		player.getDomObject();
		//Removes player from the list
		delete _players[player.getId()];
	}
	
	var _movePlayer = function(player, offset){
		
	}
	
	return {
		init: _init,
		addPlayer: _addPlayer,
		removePlayer: _removePlayer
	};
})();

/**
 * Object that represents each player.
 */
SocketWar.Player = function(cssClass){this.init(cssClass);};
SocketWar.Player.prototype = (function(){

	var _obj, _id;

	var _init = function(cssClass){
		_obj = $('<div>').addClass('player').addClass(cssClass);
		_id = ++SocketWar.Player.Count;
	}
	
	var _getId = function(){
		return _id;
	}
	
	var _getDomObject = function(){
		return _obj;
	}
	
	return {
		init: _init,
		getId: _getId,
		getDomObject: _getDomObject
	}
	
})();

SocketWar.Player.Count = 0;

SocketWar.KeyboardController = (function(){
	//Prevents holding a key to trigger the event very fast.
	var _whichKeyDown = false, 
		_callback = null,
		_keyMap = {
			37: 'left',
			38: 'up',
			39: 'right',
			40: 'down'
		}
	/**
	 * Let's start the game
	 */
	var _bindMove = function(callback){
		$(document).keydown(_onKeyDown).keyup(_onKeyUp);
		_callback = callback;
	}

	var _onKeyDown = function(e){
		//Prevents two keys pressed at the same time or one key held down.
		if(_whichKeyDown !== false){
			return;
		}
		_whichKeyDown = e.which;
		if(typeof _keyMap[e.which] !== 'undefined' && _callback){
			_callback(_keyMap[e.which]);
			e.preventDefault();
		}
	}
	
	var _onKeyUp = function(e){
		//Release the key only if it's the same initial pressed key
		if(_whichKeyDown == e.which){
			_whichKeyDown = false;
			e.preventDefault();
		}
	}
	
	return {
		bindMove: _bindMove,
	}
})();


//Initializes the game whent the document is ready!
$(SocketWar.init);


/*
			var conn = new WebSocket('ws://localhost:8080');
			conn.onopen = function(e) {
				console.log("Connection established!");
			};

			conn.onmessage = function(e) {
				console.log(e.data);
			};

*/