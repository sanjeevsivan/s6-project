const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your_super_secret_jwt_key_for_academic_project';

// Middleware
app.use(cors());
app.use(express.json());

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

// --- Routes ---

// Register User
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Username already exists.' });
                }
                return res.status(500).json({ error: 'Database error.' });
            }
            res.status(201).json({ message: 'User registered successfully!', userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// Login User
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!user) return res.status(400).json({ error: 'Invalid username or password.' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid username or password.' });

        // Simulate OTP Generation
        const simulatedOTP = Math.floor(1000 + Math.random() * 9000);
        console.log(`[SIMULATED OTP for ${username}]: ${simulatedOTP}`);
        
        // In a real app, we would save this OTP and wait for user to verify.
        // For this prototype, we'll bypass actual OTP verification or just return a token immediately,
        // but let's assume the frontend will pretend to verify it.
        // We will just generate the JWT token here.
        
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ 
            message: 'Login successful!', 
            token, 
            simulatedOTP, // Sending back so frontend can simulate "receiving" it
            user: { id: user.id, username: user.username, balance: user.balance } 
        });
    });
});

// Get User Profile (Dashboard Data)
app.get('/api/user', authenticateToken, (req, res) => {
    db.get('SELECT id, username, balance FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json(user);
    });
});

// Perform Transaction
app.post('/api/transfer', authenticateToken, (req, res) => {
    const { receiverUsername, amount } = req.body;
    const senderId = req.user.id;

    if (!receiverUsername || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid transaction details.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // 1. Check sender balance
        db.get('SELECT balance FROM users WHERE id = ?', [senderId], (err, sender) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Database error fetching sender.' });
            }
            if (!sender || sender.balance < amount) {
                db.run('ROLLBACK');
                return res.status(400).json({ error: 'Insufficient balance.' });
            }

            // 2. Find receiver
            db.get('SELECT id FROM users WHERE username = ?', [receiverUsername], (err, receiver) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Database error fetching receiver.' });
                }
                if (!receiver) {
                    db.run('ROLLBACK');
                    return res.status(404).json({ error: 'Receiver not found.' });
                }
                if (receiver.id === senderId) {
                    db.run('ROLLBACK');
                    return res.status(400).json({ error: 'Cannot transfer to yourself.' });
                }

                // 3. Perform transfer: Deduct from sender, Add to receiver
                db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, senderId], (err) => {
                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error updating sender balance.' }); }
                    
                    db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, receiver.id], (err) => {
                        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error updating receiver balance.' }); }

                        // 4. Record transaction
                        db.run('INSERT INTO transactions (sender_id, receiver_id, amount) VALUES (?, ?, ?)', 
                            [senderId, receiver.id, amount], 
                            function(err) {
                                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Error recording transaction.' }); }
                                
                                db.run('COMMIT', (err) => {
                                    if (err) return res.status(500).json({ error: 'Commit failed.' });
                                    res.json({ message: 'Transaction successful!' });
                                });
                            }
                        );
                    });
                });
            });
        });
    });
});

// Get Transaction History
app.get('/api/transactions', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const query = `
        SELECT t.id, t.amount, t.timestamp,
               s.username as sender, r.username as receiver,
               CASE WHEN t.sender_id = ? THEN 'Sent' ELSE 'Received' END as type
        FROM transactions t
        JOIN users s ON t.sender_id = s.id
        JOIN users r ON t.receiver_id = r.id
        WHERE t.sender_id = ? OR t.receiver_id = ?
        ORDER BY t.timestamp DESC
    `;

    db.all(query, [userId, userId, userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error fetching transactions.' });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
