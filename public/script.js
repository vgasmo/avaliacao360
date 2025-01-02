const alertBox = document.getElementById('alertBox');

window.onload = async () => {
  try {
    const response = await fetch('/get-employees');
    if (!response.ok) throw new Error('Failed to fetch employees list.');
    
    // O servidor retorna algo como { employees: [ ... ] }
    const data = await response.json();  
    // Pegue o array de funcionários
    const employees = data.employees;
    
    // Popule o dropdown
    populateEvaluateeSelect(employees);
  } catch (error) {
    console.error(error);
    alertBox.textContent = 'Error loading employees. Please try again later.';
  }
};

function populateEvaluateeSelect(employees) {
  const evaluateeSelect = document.getElementById('evaluateeSelect');
  // Limpa opções anteriores
  evaluateeSelect.innerHTML = '';

  if (!employees || employees.length === 0) {
    alertBox.innerText = 'No employees available for evaluation.';
    return;
  }

  // Opção padrão
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Escolha um avaliado --';
  evaluateeSelect.appendChild(defaultOption);

  // Cria <option> para cada funcionário
  employees.forEach(employee => {
    const option = document.createElement('option');
    option.value = employee.id;
    option.textContent = `${employee.name} (${employee.role})`;
    evaluateeSelect.appendChild(option);
  });
}
