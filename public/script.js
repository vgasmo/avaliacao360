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

function populateDropdown(employees) {
  if (!Array.isArray(employees) || employees.length === 0) {
    alertBox.textContent = 'No employees available for evaluation.';
    return;
  }

  employees.forEach(employee => {
    const option = document.createElement('option');
    option.value = employee.id;
    option.textContent = `${employee.name} (${employee.role})`;
    evaluateeSelect.appendChild(option);
  });
}
