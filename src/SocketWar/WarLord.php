<?php
namespace SocketWar;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class WarLord implements MessageComponentInterface {
    protected $playerConns;

    public function __construct() {
        $this->playerConns = new \SplObjectStorage;
    }

    public function onOpen(ConnectionInterface $connection) {
		// Store the new connection to send messages to later
        $this->playerConns->attach($connection);
        $this->_echo("New connection! ({$connection->resourceId})\n");
    }

    public function onMessage(ConnectionInterface $connection, $message) {
		$action = json_decode($message, true);
		switch($action['action']){
			case 'join':
				$this->_joinPlayer($connection, $action);
				break;
			case 'shot':
				break;
			case 'move':
				$this->_movePlayer($connection, $action);
				break;
		}
    }

    public function onClose(ConnectionInterface $connection) {
		$action = $this->playerConns[$connection];
		$action['action'] = 'leave';
		$this->_notifyOthers($action, $connection);

        // The connection is closed, remove it, as we can no longer send it messages
        $this->playerConns->detach($connection);
        echo "Connection {$connection->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }

	protected function _echo($message){
		echo $message;
	}

	protected function _joinPlayer(ConnectionInterface $connection, array $action){

		$this->playerConns[$connection] = $action;

		//Create a list of the other players in the game.
		$otherPlayers = array();
		foreach ($this->playerConns as $playerConn) {
			if ($connection !== $playerConn) {
				$otherPlayers[] = $this->playerConns[$playerConn];
			}
		}

		//Send the list to the current player so that it can add them to its grid.
		$response = array('action' => 'start', 'otherPlayers' => $otherPlayers);
		$connection->send(json_encode($response));

		$this->_notifyOthers($action, $connection);

	}

	protected function _movePlayer(ConnectionInterface $connection, array $action){
		$current = $this->playerConns[$connection];
		$current['position'] = $action['position'];
		$this->playerConns[$connection] = $current;
		$this->_notifyOthers($action, $connection);
	}

	protected function _notifyOthers(array $action, ConnectionInterface $connection){
		$message = json_encode($action);
		$numRecv = count($this->playerConns) - 1;
        $this->_echo(sprintf('Connection %d sending message "%s" to %d other connection%s' . "\n"
            , $connection->resourceId, $message, $numRecv, $numRecv == 1 ? '' : 's'));

		foreach ($this->playerConns as $playerConn) {
            if ($connection !== $playerConn) {
                // The sender is not the receiver, send to each client connected
                $playerConn->send($message);
            }
        }
	}

}