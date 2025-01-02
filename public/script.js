const evaluateeSelect = document.getElementById('evaluateeSelect');
const alertBox = document.getElementById('alertBox');

window.onload = async () => {
  try {
    const response = await fetch('/get-employees');
    if (!response.ok) throw new Error('Failed to fetch employees list.');
    const employees = await response.json();

    // Populate the dropdown
    populateDropdown(employees);
  } catch (error) {
    console.error(error);
    alertBox.textContent = 'Error loading employees. Please try again later.';
  }
};
function populateEvaluateeSelect(employees) {
  const evaluateeSelect = document.getElementById('evaluateeSelect');
  evaluateeSelect.innerHTML = ''; // Clear previous options

  if (!employees || employees.length === 0) {
    document.getElementById('alertBox').innerText = 'No employees available for evaluation.';
    return;
  }

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Escolha um avaliado --';
  evaluateeSelect.appendChild(defaultOption);

  employees.forEach(employee => {
    const option = document.createElement('option');
    option.value = employee.id;
    option.textContent = `${employee.name} (${employee.role})`;
    evaluateeSelect.appendChild(option);
  });
}
