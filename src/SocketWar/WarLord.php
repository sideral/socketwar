<?php
namespace SocketWar;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class WarLord implements MessageComponentInterface {
    protected $clients;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
    }

    public function onOpen(ConnectionInterface $connection) {
		// Store the new connection to send messages to later
        $this->clients->attach($connection);
        echo "New connection! ({$connection->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $jsonMessage) {
        $numRecv = count($this->clients) - 1;
        echo sprintf('Connection %d sending message "%s" to %d other connection%s' . "\n"
            , $from->resourceId, $jsonMessage, $numRecv, $numRecv == 1 ? '' : 's');

		$message = json_decode($jsonMessage, true);

		if($message['action'] == 'join'){
			echo "Heelo";
			unset($message['action']);
			$this->clients[$from] = $message;

			$response = array(
				'action' => 'start',
				'opponents' => array()
			);

			foreach ($this->clients as $client) {
				if ($from !== $client) {
					$response['opponents'][] = $this->clients[$client];
				}
			}

			$from->send(json_encode($response));

		}
		elseif($message['action'] == 'shot'){

		}
		else{
			$this->clients[$from]['position'] = $message['position'];
		}

        foreach ($this->clients as $client) {
            if ($from !== $client) {
                // The sender is not the receiver, send to each client connected
                $client->send($jsonMessage);
            }
        }
    }

    public function onClose(ConnectionInterface $connection) {

		$message = $this->clients[$connection];
		$message['action'] = 'leave';

		foreach ($this->clients as $client) {
            if ($connection !== $client) {
                // The sender is not the receiver, send to each client connected
                $client->send(json_encode($message));
            }
        }

        // The connection is closed, remove it, as we can no longer send it messages
        $this->clients->detach($connection);
        echo "Connection {$connection->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }
}