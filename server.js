const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Ensure node-fetch is installed

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Path to the public folder (optional, for serving static files)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Load employees and tokens JSON files
const employees = JSON.parse(fs.readFileSync(path.join(__dirname, 'employees.json'), 'utf-8'));

let tokens = {};
try {
  tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf-8'));
} catch (err) {
  console.log('Warning: Could not find tokens.json or error reading it:', err.message);
  tokens = {};
}

// Serve employees list, showing their name
app.get('/get-employees', (req, res) => {
  res.json(employees);
});

// Resolve token to get the evaluator's ID and name
app.get('/resolve-token', (req, res) => {
  const token = req.query.token;
  const myId = tokens[token];
  if (!myId) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  // Find the user's name from their ID
  const myInfo = employees.find(emp => emp.id === myId);

  res.json({ myId, myName: myInfo ? myInfo.name : 'Unknown' });
});

// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwCxkcZkva47VEPhEBBo3d5rgF2Tzp7Weag8eS0TcNSW3HU5-Xm7w8YehIorPuUcZcS/exec';

// Handle evaluation submission
app.post('/submit-evaluation', async (req, res) => {
  const { token, evaluateeId, timestamp, answers } = req.body;

  // Validate input
  if (!token || !evaluateeId || !answers) {
    return res.status(400).json({ error: 'Token, evaluateeId, or answers are missing.' });
  }

  const myId = tokens[token];
  if (!myId) {
    return res.status(400).json({ error: 'Invalid token.' });
  }

  // Create evaluation object
  const evaluation = {
    evaluatorId: myId,
    evaluateeId,
    timestamp: timestamp || new Date().toISOString(),
    answers
  };

  // Save locally in data/evaluations.json
  const dataDir = path.join(__dirname, 'data');
  const evalFile = path.join(dataDir, 'evaluations.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  let existingData = [];
  if (fs.existsSync(evalFile)) {
    existingData = JSON.parse(fs.readFileSync(evalFile, 'utf-8'));
  }

  existingData.push(evaluation);
  fs.writeFileSync(evalFile, JSON.stringify(existingData, null, 2), 'utf-8');

  // Send data to Google Apps Script
  const dataToSend = {
    timestamp: evaluation.timestamp,
    evaluatorId: evaluation.evaluatorId,
    evaluateeId: evaluation.evaluateeId,
    answers: evaluation.answers
  };

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend)
    });

    const responseText = await response.text(); // Read raw response (for debugging)
    console.log('Google Apps Script response (raw):', responseText);

    // Parse the response if it’s valid JSON
    const result = JSON.parse(responseText);
    console.log('Parsed Google Apps Script response:', result);

    return res.json({
      message: 'Evaluation successfully sent to Google Sheets!',
      googleScriptResponse: result
    });
  } catch (err) {
    console.error('Error sending to Google Apps Script:', err.message);

    return res.status(500).json({
      error: 'Evaluation saved locally but failed to send to Google Sheets.',
      details: err.message
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
