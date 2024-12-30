const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Caminho para a pasta 'public' (onde está o index.html)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Ler os ficheiros JSON (employees e tokens)
const employees = JSON.parse(fs.readFileSync(path.join(__dirname, 'employees.json'), 'utf-8'));
let tokens = {};
// Carrega tokens.json, se existir
try {
  tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'tokens.json'), 'utf-8'));
} catch (err) {
  console.log('Aviso: Não foi encontrado tokens.json ou ocorreu erro a ler tokens.json');
  tokens = {};
}

// Rota para servir a lista de employees
app.get('/get-employees', (req, res) => {
  res.json(employees);
});

// Rota para converter token em myId
app.get('/resolve-token', (req, res) => {
  const token = req.query.token;
  // Ver se existe esse token no tokens.json
  const myId = tokens[token];
  if (!myId) {
    return res.json({ myId: null });
  }
  res.json({ myId });
});

// Rota para receber a submissão
app.post('/submit-evaluation', (req, res) => {
  const { token, evaluateeId, timestamp, answers } = req.body;
  if (!token || !evaluateeId) {
    return res.status(400).json({ error: 'Token ou evaluateeId em falta.' });
  }

  const myId = tokens[token];
  if (!myId) {
    return res.status(400).json({ error: 'Token inválido.' });
  }

  // Cria objeto de avaliação para guardar
  const evaluation = {
    evaluatorId: myId,
    evaluateeId,
    timestamp,
    answers
  };

  // Guardar no ficheiro data/evaluations.json
  const dataDir = path.join(__dirname, 'data');
  const evalFile = path.join(dataDir, 'evaluations.json');

  // Se a pasta data não existir, cria
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  let existingData = [];
  if (fs.existsSync(evalFile)) {
    existingData = JSON.parse(fs.readFileSync(evalFile, 'utf-8'));
  }

  existingData.push(evaluation);

  fs.writeFileSync(evalFile, JSON.stringify(existingData, null, 2), 'utf-8');

  res.json({ message: 'Avaliação recebida com sucesso' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});
