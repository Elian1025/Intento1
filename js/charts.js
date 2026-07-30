/* charts.js
   Encapsula la lógica de gráficos con Chart.js para la aplicación.
*/

let varietyChartInstance = null;
let reasonChartInstance = null;

/**
 * Actualiza los gráficos con los datos suministrados.
 * @param {Array<Object>} records Lista de registros.
 */
function updateCharts(records) {
  const varietyCounts = countByField(records, 'variety');
  const reasonCounts = countByField(records, 'reason');

  renderBarChart('varietyChart', varietyCounts, 'Variedad', '#b11a20');
  renderPieChart('reasonChart', reasonCounts, '#d63f45');
}

/**
 * Genera un gráfico de barras.
 * @param {string} canvasId Identificador canvas.
 * @param {Object} data Conteo de valores.
 * @param {string} label Etiqueta del conjunto.
 * @param {string} color Color principal.
 */
function renderBarChart(canvasId, data, label, color) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  const labels = Object.keys(data);
  const values = Object.values(data);

  if (varietyChartInstance) {
    varietyChartInstance.destroy();
  }

  varietyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label,
        data: values,
        backgroundColor: labels.map(() => `${color}bb`),
        borderRadius: 12,
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}` } },
      },
      scales: {
        x: { ticks: { color: '#d5d5d5' }, grid: { display: false } },
        y: { ticks: { color: '#d5d5d5' }, grid: { color: 'rgba(255,255,255,0.08)' }, beginAtZero: true },
      },
    },
  });
}

/**
 * Genera un gráfico circular.
 * @param {string} canvasId Identificador canvas.
 * @param {Object} data Conteo de valores.
 * @param {string} color Color principal.
 */
function renderPieChart(canvasId, data, color) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  const labels = Object.keys(data);
  const values = Object.values(data);

  if (reasonChartInstance) {
    reasonChartInstance.destroy();
  }

  const palette = labels.map((_, index) => {
    const alpha = 0.8 - index * 0.08;
    return `rgba(177, 26, 32, ${Math.max(alpha, 0.35)})`;
  });

  reasonChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette,
        borderColor: '#111',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#d5d5d5' } },
      },
    },
  });
}
