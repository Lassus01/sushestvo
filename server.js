const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- In-Memory Data Storage ---
const users = new Map(); // username -> { password, rank }

const RANKS = ["Неофит", "Адепт", "Жрец"];

function determineRank() {
    // Simple random rank assignment for demo purposes
    const rand = Math.random();
    if (rand > 0.9) return RANKS[2]; // Жрец (10%)
    if (rand > 0.5) return RANKS[1]; // Адепт (40%)
    return RANKS[0]; // Неофит (50%)
}

// --- Game Data ---
let scores = []; // Array of { username, score }

// --- Auth Endpoints ---
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required.' });
    }
    if (users.has(username)) {
        return res.status(409).json({ error: 'Username already exists.' });
    }
    const rank = determineRank();
    users.set(username, { password, rank });
    res.json({ message: 'Registration successful', username, rank });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.get(username);
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }
    res.json({ message: 'Login successful', username, rank: user.rank });
});

// --- Game Endpoints ---
app.post('/api/score', (req, res) => {
    const { username, score } = req.body;
    if (!username || typeof score !== 'number') {
        return res.status(400).json({ error: 'Username and numeric score required.' });
    }

    // Add new score
    scores.push({ username, score });

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);

    // Keep only top 100 to avoid memory leak, top 10 returned
    if (scores.length > 100) {
        scores = scores.slice(0, 100);
    }

    res.json({ message: 'Score saved successfully.' });
});

app.get('/api/leaderboard', (req, res) => {
    res.json({ leaderboard: scores.slice(0, 10) }); // Return top 10
});

// --- Socket.io Chat ---
io.on('connection', (socket) => {
    console.log('Cultist connected:', socket.id);

    // Join a specific room if needed, or broadcast globally
    socket.on('chat message', (data) => {
        // data: { username, message }
        console.log('Message received:', data);
        // Broadcast the message to everyone
        io.emit('chat message', data);
    });

    socket.on('disconnect', () => {
        console.log('Cultist disconnected:', socket.id);
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Temple server running on port ${PORT}`);
});
