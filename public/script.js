// script.js
let myId = null;      // ID de quem está avaliando
let myName = null;    // Nome de quem está avaliando (opcional, só pra exibir se quiser)
let employees = [];   // Lista de todos os empregados carregados via /get-employees

// Referências aos elementos do DOM
const alertBox = document.getElementById('alertBox');
const evaluateeSelect = document.getElementById('evaluateeSelect');
const technicalSection = document.getElementById('technicalSection');
const behavioralSection = document.getElementById('behavioralSection');
const submitBtn = document.getElementById('submitBtn');

// Ao carregar a página, inicia o fluxo
window.onload = async () => {
  try {
    // 1) Obter token da query string: ?token=ABC
    const token = getTokenFromQueryString();
    if (!token) {
      alertBox.textContent = 'Token não fornecido na URL. Ex: ?token=ABC';
      return;
    }

    // 2) Chamar /resolve-token para descobrir quem sou
    await resolveToken(token);

    // 3) Chamar /get-employees para obter todos os funcionários
    await loadEmployees();

    // 4) Preencher o select
    populateEvaluateeSelect(employees);

    // 5) Escutar mudança no select
    evaluateeSelect.addEventListener('change', (e) => onEvaluateeChanged(e, token));

    // 6) Se quiser, também já tratar clique no botão de "Submeter Avaliação"
    submitBtn.addEventListener('click', () => onSubmitEvaluation(token));

  } catch (error) {
    console.error('Erro na inicialização:', error);
    alertBox.textContent = 'Falha ao inicializar a página. Ver console.';
  }
};

/**
 * Pega o token da query string (se a URL for .../index.html?token=ABC)
 */
function getTokenFromQueryString() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('token');
}

/**
 * Chama /resolve-token?token=XYZ e obtém { myId, myName }
 */
async function resolveToken(token) {
  const res = await fetch(`/resolve-token?token=${token}`);
  if (!res.ok) {
    throw new Error(`Token inválido ou não encontrado (HTTP ${res.status})`);
  }
  const data = await res.json();
  myId = data.myId;
  myName = data.myName; // se quiser usar
  console.log('Token resolvido:', { myId, myName });
}

/**
 * Carrega employees chamando /get-employees e atualiza variável global "employees"
 */
async function loadEmployees() {
  const res = await fetch('/get-employees');
  if (!res.ok) {
    throw new Error(`Erro ao carregar /get-employees (HTTP ${res.status})`);
  }
  const data = await res.json(); // { employees: [ ... ] }
  employees = data.employees;
  console.log('Funcionários carregados:', employees);
}

/**
 * Preenche o <select id="evaluateeSelect"> com os funcionários
 */
function populateEvaluateeSelect(employeesArray) {
  // Limpar qualquer opção anterior
  evaluateeSelect.innerHTML = '';

  // Opção padrão
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Escolha um avaliado --';
  evaluateeSelect.appendChild(defaultOption);

  // Criar <option> para cada funcionário
  for (const emp of employeesArray) {
    const option = document.createElement('option');
    option.value = emp.id;
    option.textContent = `${emp.name} (${emp.role})`;
    evaluateeSelect.appendChild(option);
  }
}

/**
 * Quando o usuário escolhe um avaliado no select
 */
function onEvaluateeChanged(event, token) {
  const selectedId = event.target.value;

  // Se não escolheu ninguém, ou voltou à opção vazia, esconde tudo
  if (!selectedId) {
    hideSections();
    return;
  }

  // Achar o empregado correspondente
  const evaluatee = employees.find((emp) => emp.id === selectedId);
  if (!evaluatee) {
    hideSections();
    return;
  }

  // Verifica se posso avaliar tecnicamente
  const canEvaluateTechnical =
    evaluatee.managerId === myId ||            // Sou gestor direto?
    evaluatee.technicalPeers.includes(myId);   // Estou na lista de pares técnicos?

  // Verifica se posso avaliar comportamentalmente
  const canEvaluateBehavioral =
    evaluatee.behavioralPeers.includes(myId);  // Estou na lista de pares comportamentais?

  // Exibir ou ocultar seções
  if (canEvaluateTechnical) {
    technicalSection.classList.remove('hidden');
  } else {
    technicalSection.classList.add('hidden');
  }

  if (canEvaluateBehavioral) {
    behavioralSection.classList.remove('hidden');
  } else {
    behavioralSection.classList.add('hidden');
  }
}

/**
 * Esconde seções
 */
function hideSections() {
  technicalSection.classList.add('hidden');
  behavioralSection.classList.add('hidden');
}

/**
 * Exemplo de função para submeter a avaliação (quando clica no botão "Submeter Avaliação")
 * Aqui você coleta as respostas e manda via POST /submit-evaluation
 */
async function onSubmitEvaluation(token) {
  // Precisamos saber quem está sendo avaliado
  const evaluateeId = evaluateeSelect.value;
  if (!evaluateeId) {
    alertBox.textContent = 'Selecione alguém para avaliar.';
    return;
  }

  // Montar objeto answers (exemplo)
  const answers = {
    q1: document.getElementById('q1').value,
    q2: document.getElementById('q2').value,
    q3: document.getElementById('q3').value,
    q4: document.getElementById('q4').value,
    techComment: document.getElementById('techComment').value,
    q5: document.getElementById('q5').value,
    q6: document.getElementById('q6').value,
    q7: document.getElementById('q7').value,
    q8: document.getElementById('q8').value,
    behavioralComment: document.getElementById('behavioralComment').value
  };

  // Chamar POST /submit-evaluation
  try {
    const res = await fetch('/submit-evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        evaluateeId,
        answers
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || `Erro ao enviar avaliação (HTTP ${res.status})`);
    }

    const result = await res.json();
    console.log('Avaliação enviada com sucesso:', result);
    alertBox.textContent = 'Avaliação enviada com sucesso!';
  } catch (err) {
    console.error(err);
    alertBox.textContent = `Erro ao enviar avaliação: ${err.message}`;
  }
}
