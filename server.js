/**
 * server.js
 */
const express = require('express');
// Desde o Express 4.16+, já temos bodyParser embutido:
const cors = require('cors');
const fs = require('fs');
const path = require('path');
// Se estiver em Node 18+ pode usar fetch nativo, senão instale node-fetch
const fetch = require('node-fetch'); 

const app = express();
app.use(cors());
// Substitui bodyParser.json() por express.json()
app.use(express.json());

// Pasta public para servir arquivos estáticos
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Helper para garantir que diretórios existam antes de escrever
const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Carregar employees.json
let employees = [];
try {
  const employeesPath = path.join(__dirname, 'employees.json');
  const fileContent = fs.readFileSync(employeesPath, 'utf-8');
  const parsed = JSON.parse(fileContent);
  employees = parsed.employees; // vem de { "employees": [ ... ] }
  console.log('Employees loaded successfully.');
} catch (err) {
  console.error('Error loading employees.json:', err.message);
}

// Carregar tokens.json (opcional, caso use tokens)
let tokens = {};
try {
  const tokensPath = path.join(__dirname, 'tokens.json');
  tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
  console.log('Tokens loaded successfully.');
} catch (err) {
  console.error('Warning: Could not find tokens.json or error reading it:', err.message);
}

/**
 * Endpoint GET /get-employees
 * Retorna { employees: [...] } se estiver tudo certo,
 * ou erro 500 se não houver dados.
 */
app.get('/get-employees', (req, res) => {
  if (!employees || employees.length === 0) {
    return res.status(500).json({ error: 'Employees data is not available.' });
  }
  res.json({ employees });
});

/**
 * Endpoint GET /resolve-token
 * Espera ?token=xxx e retorna { myId, myName } se for válido
 */
app.get('/resolve-token', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(400).json({ error: 'Token is required.' });
  }

  const myId = tokens[token];
  if (!myId) {
    return res.status(400).json({ error: 'Invalid token.' });
  }

  const myInfo = employees.find((emp) => emp.id === myId);
  if (!myInfo) {
    return res.status(404).json({ error: 'Employee not found for the provided token.', myId });
  }

  res.json({ myId, myName: myInfo.name });
});

// (Opcional) URL do Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxhCf7t1Pl_y5qzJtqO8KbvtZ1_RRuku-ZIMGIop_zVlxoNy4Q3L5a_x8MOH0rKiEBF/exec';

/**
 * Endpoint POST /submit-evaluation
 * Recebe { token, evaluateeId, answers } e salva local + envia ao Google Apps Script
 */
app.post('/submit-evaluation', async (req, res) => {
  const { token, evaluateeId, timestamp, answers } = req.body;

  // Validações básicas
  if (!token || !evaluateeId || !answers) {
    return res.status(400).json({ error: 'Token, evaluateeId, or answers are missing.' });
  }

  const myId = tokens[token];
  if (!myId) {
    return res.status(400).json({ error: 'Invalid token.' });
  }

  // Verificar se evaluatee existe
  const evaluatee = employees.find((emp) => emp.id === evaluateeId);
  if (!evaluatee) {
    return res.status(400).json({ error: 'Invalid evaluateeId.' });
  }

  // Verificar formato de answers
  if (typeof answers !== 'object' || Object.keys(answers).length === 0) {
    return res.status(400).json({ error: 'Answers are missing or invalid.' });
  }

  // Montar objeto evaluation
  const evaluation = {
    evaluatorId: myId,
    evaluateeId,
    timestamp: timestamp || new Date().toISOString(),
    answers,
  };

  // Salvar localmente
  const dataDir = path.join(__dirname, 'data');
  const evalFile = path.join(dataDir, 'evaluations.json');
  ensureDirExists(dataDir);

  let existingData = [];
  if (fs.existsSync(evalFile)) {
    try {
      existingData = JSON.parse(fs.readFileSync(evalFile, 'utf-8'));
    } catch (err) {
      console.error('Error reading evaluations.json:', err.message);
    }
  }

  existingData.push(evaluation);
  fs.writeFileSync(evalFile, JSON.stringify(existingData, null, 2), 'utf-8');

  // (Opcional) Enviar ao Google Apps Script
  if (GOOGLE_SCRIPT_URL) {
    const dataToSend = {
      timestamp: evaluation.timestamp,
      evaluatorId: evaluation.evaluatorId,
      evaluateeId: evaluation.evaluateeId,
      answers: evaluation.answers,
    };

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const responseText = await response.text();
      console.log('Google Apps Script response (raw):', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed Google Apps Script response:', result);
      } catch (err) {
        console.warn('Response is not valid JSON. Raw response:', responseText);
        result = { rawResponse: responseText };
      }

      return res.json({
        message: 'Evaluation successfully sent to Google Sheets!',
        googleScriptResponse: result,
      });
    } catch (err) {
      console.error('Error sending to Google Apps Script:', err.message);

      return res.status(500).json({
        error: 'Evaluation saved locally but failed to send to Google Sheets.',
        details: err.message,
      });
    }
  } else {
    // Se não usar Google Script
    return res.json({
      message: 'Evaluation saved locally!',
    });
  }
});

// Rodar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
