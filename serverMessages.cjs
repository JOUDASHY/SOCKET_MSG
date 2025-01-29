const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

// Créer un serveur express
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware pour traiter les requêtes POST (cURL)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Stocker les clients connectés, associés à leur userId
let clients = {};

// Lorsqu'un client se connecte, on associe sa connexion à un ID utilisateur
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (data) => {
        const parsedData = JSON.parse(data);
        if (parsedData.userId) {
            // Associe la connexion WebSocket à un userId
            clients[parsedData.userId] = ws;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        // Supprimer la connexion de l'objet clients à la déconnexion
        Object.keys(clients).forEach(userId => {
            if (clients[userId] === ws) {
                delete clients[userId];
            }
        });
    });
});

// Route pour recevoir les messages depuis Laravel via cURL et les diffuser
app.post('/broadcast', (req, res) => {
    const { sender_id, receiver_id, message,attachment,created_at } = req.body;

    // Créer le format du message en JSON
    const fullMessage = JSON.stringify({
        sender_id: sender_id,
        receiver_id: receiver_id,
        message: message,
        created_at: created_at,
        attachment: attachment,
    });

    console.log('Broadcasting message:', fullMessage); // Affiche le message avant de l'envoyer

    // Vérifie si la connexion WebSocket du récepteur est présente et envoie le message
    if (clients[receiver_id]) {
        clients[receiver_id].send(fullMessage);
        console.log(`Message sent to user: ${receiver_id}`);
    } else {
        console.log(`Receiver ${receiver_id} not connected`);
    }

    res.status(200).send('Message broadcasted');
});

// Démarrer le serveur sur le port 80
server.listen(80, () => {
    console.log('WebSocket server for messages started on http://localhost:80');
});
