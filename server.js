const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');  // <-- Import fetch (Node <= 17)

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Caminho para a pasta 'public' (onde está o index.html)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Ler os ficheiros JSON (employees e tokens)
const employees = JSON.parse(fs.readFileSync(path.join(__dirname, 'employees.json'), 'utf-8'));

let tokens = {};
try {
  tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf-8'));
} catch (err) {
  console.log('Aviso: Não foi encontrado tokens.json ou ocorreu erro ao ler tokens.json:', err.message);
  tokens = {};
}

// Rota para servir a lista de employees
app.get('/get-employees', (req, res) => {
  res.json(employees);
});

// Rota para converter token em myId
app.get('/resolve-token', (req, res) => {
  const token = req.query.token;
  const myId = tokens[token];
  if (!myId) {
    return res.json({ myId: null });
  }
  res.json({ myId });
});

// ======================
// URL do Google Apps Script
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkuroNIUzKF5UIEISsgY-8RFzpRfCyVW2AmZrHGLN7eTrl2AC5XVUbuLOKrUFG1G51/exec';
// ======================

// Rota para receber a submissão
app.post('/submit-evaluation', async (req, res) => {
  const { token, evaluateeId, timestamp, answers } = req.body;
  
  if (!token || !evaluateeId) {
    return res.status(400).json({ error: 'Token ou evaluateeId em falta.' });
  }

  const myId = tokens[token];
  if (!myId) {
    return res.status(400).json({ error: 'Token inválido.' });
  }

  // Cria objeto de avaliação para guardar localmente
  const evaluation = {
    evaluatorId: myId,
    evaluateeId,
    timestamp,
    answers
  };

  // ===================================
  // 1) Guardar no ficheiro local data/evaluations.json
  // ===================================
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

  // ===================================
  // 2) Enviar para Google Sheets (via Google Apps Script)
  // ===================================

  // Montamos o objeto que será enviado para a sheet
  // Ajuste conforme o script do Apps Script espera
  const dataToSend = {
    timestamp: timestamp,
    evaluatorId: myId,
    evaluateeId: evaluateeId,
    answers: answers
  };

  try {
    // Fazemos o POST assíncrono para o Google Apps Script
    // (Use await para esperar a resposta)
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSend)
    });
    const result = await response.json();

    console.log('Resposta do Google Apps Script:', result);

    // Retornar sucesso ao cliente
    return res.json({
      message: 'Avaliação recebida e enviada para Google Sheets com sucesso!',
      googleScriptResponse: result
    });
  } catch (err) {
    console.error('Erro ao enviar para Google Sheets:', err);
    return res.status(500).json({
      error: 'Avaliação gravada localmente, mas falhou ao enviar para Google Sheets'
    });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});

