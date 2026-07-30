/* script.js
   Controla la interfaz de usuario, eventos y renderizado de la aplicación.
*/

const recordForm = document.getElementById('recordForm');
const recordDate = document.getElementById('recordDate');
const recordVariety = document.getElementById('recordVariety');
const recordQuantity = document.getElementById('recordQuantity');
const recordReason = document.getElementById('recordReason');
const customReasonContainer = document.getElementById('customReasonContainer');
const customReason = document.getElementById('customReason');
const historyTableBody = document.querySelector('#historyTable tbody');
const quickDate = document.getElementById('quickDate');
const quickVariety = document.getElementById('quickVariety');
const btnQuickSearch = document.getElementById('btnQuickSearch');
const quickResultData = document.getElementById('quickResultData');
const quickDateResult = document.getElementById('quickDateResult');
const quickVarietyResult = document.getElementById('quickVarietyResult');
const quickQuantityResult = document.getElementById('quickQuantityResult');
const quickReasonResult = document.getElementById('quickReasonResult');
const filterButtons = document.querySelectorAll('.filter-btn');
const btnExportExcel = document.getElementById('btnExportExcel');
const btnExportPdf = document.getElementById('btnExportPdf');
const btnCreateBackup = document.getElementById('btnCreateBackup');
const btnImportBackup = document.getElementById('btnImportBackup');
const importFile = document.getElementById('importFile');
const btnClearAll = document.getElementById('btnClearAll');
const toast = document.getElementById('toast');
const currentDate = document.getElementById('currentDate');
const currentTime = document.getElementById('currentTime');
const totalRecords = document.getElementById('totalRecords');
const totalVarieties = document.getElementById('totalVarieties');
const totalStems = document.getElementById('totalStems');
const statTotalFlowers = document.getElementById('statTotalFlowers');
const statByVariety = document.getElementById('statByVariety');
const statByReason = document.getElementById('statByReason');
const statTopVariety = document.getElementById('statTopVariety');
const statTopReason = document.getElementById('statTopReason');
const statTopDailyReason = document.getElementById('statTopDailyReason');
const statTopDailyPercent = document.getElementById('statTopDailyPercent');
const statTopDailyQuantity = document.getElementById('statTopDailyQuantity');
const historySearch = document.getElementById('historySearch');
const remoteStatus = document.getElementById('remoteStatus');

let currentEditId = null;
let currentFilter = 'today';
let currentSearchQuery = '';

/**
 * Genera un identificador único para cada registro.
 * @returns {string}
 */
function generateId() {
  return `rec-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * Formatea la fecha actual para mostrarla en el dashboard.
 */
function updateClock() {
  const now = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  currentDate.textContent = now.toLocaleDateString('es-ES', dateOptions);
  currentTime.textContent = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Actualiza los elementos del dashboard con los datos actuales.
 * @param {Array<Object>} records
 */
function refreshDashboard(records) {
  totalRecords.textContent = records.length;
  totalVarieties.textContent = new Set(records.map((item) => item.variety.toLowerCase())).size;
  totalStems.textContent = calculateTotalStems(records);
}

/**
 * Muestra una notificación breve.
 * @param {string} message
 */
function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => toast.classList.add('hidden'), 2400);
}

/**
 * Rellena el formulario con la fecha actual.
 */
function setDefaultDate() {
  const today = new Date().toISOString().slice(0, 10);
  recordDate.value = today;
}

/**
 * Filtra registros por el criterio seleccionado.
 * @param {Array<Object>} records
 * @returns {Array<Object>}
 */
function applyDateFilter(records) {
  const today = new Date();
  return records.filter((record) => {
    const recordDateValue = new Date(record.date);
    if (currentFilter === 'today') {
      return recordDateValue.toDateString() === today.toDateString();
    }
    if (currentFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return recordDateValue >= weekAgo && recordDateValue <= today;
    }
    if (currentFilter === 'month') {
      return recordDateValue.getMonth() === today.getMonth() && recordDateValue.getFullYear() === today.getFullYear();
    }
    return true;
  });
}

/**
 * Actualiza la vista del historial de registros.
 * @param {Array<Object>} records
 */
function renderHistory(records) {
  const filtered = applyDateFilter(records).filter((record) => {
    const query = currentSearchQuery.toLowerCase();
    if (!query) return true;
    return [record.date, record.variety, record.reason].some((value) => value.toLowerCase().includes(query));
  });

  if (!filtered.length) {
    historyTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">No se encontraron registros con esos filtros.</td>
      </tr>
    `;
    return;
  }

  historyTableBody.innerHTML = filtered.map((record) => {
    return `
      <tr>
        <td>${record.date}</td>
        <td>${record.variety}</td>
        <td>${record.quantity}</td>
        <td>${record.reason}</td>
        <td>
          <div class="action-group">
            <button class="action-btn edit" data-id="${record.id}"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn delete" data-id="${record.id}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Actualiza las tarjetas de estadísticas con los datos proporcionados.
 * @param {Array<Object>} records
 */
function refreshStats(records) {
  statTotalFlowers.textContent = calculateTotalStems(records);
  const countsByVariety = countByField(records, 'variety');
  const countsByReason = countByField(records, 'reason');
  statByVariety.textContent = Object.keys(countsByVariety).length || '-';
  statByReason.textContent = Object.keys(countsByReason).length || '-';
  statTopVariety.textContent = getMostFrequent(countsByVariety);
  statTopReason.textContent = getMostFrequent(countsByReason);
  const dailyTop = getTopDailyDamage(records);
  statTopDailyReason.textContent = dailyTop.reason;
  statTopDailyPercent.textContent = dailyTop.percent;
  statTopDailyQuantity.textContent = dailyTop.quantity;
  updateCharts(records);
}

/**
 * Carga los datos y actualiza todas las vistas.
 */
function loadAppData() {
  const records = loadRecords();
  refreshDashboard(records);
  renderHistory(records);
  refreshStats(records);
}

/**
 * Calcula el motivo de daño más alto para el día actual.
 * @param {Array<Object>} records
 * @returns {{reason:string,quantity:number,percent:string}}
 */
function getTopDailyDamage(records) {
  const today = new Date().toISOString().slice(0, 10);
  const dailyRecords = records.filter((record) => record.date === today);

  if (!dailyRecords.length) {
    return { reason: '-', quantity: 0, percent: '-' };
  }

  const dailyCounts = dailyRecords.reduce((acc, item) => {
    const value = item.reason || 'Sin motivo';
    acc[value] = (acc[value] || 0) + Number(item.quantity);
    return acc;
  }, {});

  const total = dailyRecords.reduce((sum, item) => sum + Number(item.quantity), 0);
  const [topReason, topAmount] = Object.entries(dailyCounts).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  const percent = total ? `${((topAmount / total) * 100).toFixed(1)}%` : '-';

  return { reason: `${topReason} (${topAmount})`, quantity: total, percent };
}

/**
 * Asigna evento para mostrar u ocultar el campo de motivo de texto libre.
 */
recordReason.addEventListener('change', () => {
  const isOther = recordReason.value === 'Otro';
  customReasonContainer.classList.toggle('hidden', !isOther);
  if (!isOther) customReason.value = '';
});

/**
 * Maneja el envío del formulario para guardar o actualizar un registro.
 */
recordForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const reasonValue = recordReason.value === 'Otro' ? customReason.value.trim() || 'Otro' : recordReason.value;
  if (!reasonValue) {
    showToast('Debes especificar el motivo.');
    return;
  }

  const recordData = {
    id: currentEditId || generateId(),
    date: recordDate.value,
    variety: recordVariety.value.trim(),
    quantity: Number(recordQuantity.value),
    reason: reasonValue,
  };

  if (currentEditId) {
    updateRecord(currentEditId, recordData);
    showToast('Registro actualizado correctamente.');
    currentEditId = null;
  } else {
    addRecord(recordData);
    showToast('Registro guardado exitosamente.');
  }

  recordForm.reset();
  setDefaultDate();
  currentFilter = 'today';
  filterButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.filter === currentFilter));
  loadAppData();
});

/**
 * Maneja las acciones de editar o eliminar en la tabla.
 */
historyTableBody.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  const id = target.dataset.id;
  const records = loadRecords();
  const record = records.find((item) => item.id === id);
  if (!record) return;

  if (target.classList.contains('edit')) {
    currentEditId = id;
    recordDate.value = record.date;
    recordVariety.value = record.variety;
    recordQuantity.value = record.quantity;
    recordReason.value = ['Descabezado','Maltrato','Daño mecánico','Botrytis','Tallo torcido','Flor abierta','Pétalos dañados','Golpe','Tallo corto'].includes(record.reason) ? record.reason : 'Otro';
    if (recordReason.value === 'Otro') {
      customReasonContainer.classList.remove('hidden');
      customReason.value = record.reason;
    }
    showToast('Edita el registro y presiona Guardar.');
  }

  if (target.classList.contains('delete')) {
    if (confirm('¿Eliminar este registro definitivamente?')) {
      deleteRecord(id);
      loadAppData();
      showToast('Registro eliminado.');
    }
  }
});

/**
 * Maneja la búsqueda rápida por fecha y variedad.
 */
btnQuickSearch.addEventListener('click', () => {
  const dateValue = quickDate.value;
  const varietyValue = quickVariety.value.trim().toLowerCase();
  const records = loadRecords();
  const found = records.find((item) => item.date === dateValue && item.variety.toLowerCase() === varietyValue);

  if (found) {
    quickResultData.classList.remove('hidden');
    quickDateResult.textContent = found.date;
    quickVarietyResult.textContent = found.variety;
    quickQuantityResult.textContent = found.quantity;
    quickReasonResult.textContent = found.reason;
    showToast('Resultado encontrado.');
  } else {
    quickResultData.classList.add('hidden');
    showToast('No se encontró ningún registro para esa fecha y variedad.');
  }
});

/**
 * Asigna eventos a los botones de filtro.
 */
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    renderHistory(loadRecords());
  });
});

historySearch.addEventListener('input', () => {
  currentSearchQuery = historySearch.value;
  renderHistory(loadRecords());
});

/**
 * Exporta los datos a un archivo Excel.
 */
btnExportExcel.addEventListener('click', () => {
  const records = loadRecords();
  const worksheet = XLSX.utils.json_to_sheet(records.map(({ id, ...rest }) => rest));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registro');
  XLSX.writeFile(workbook, `rosas_nacionales_${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast('Exportado a Excel.');
});

/**
 * Exporta los datos a un archivo PDF.
 */
btnExportPdf.addEventListener('click', () => {
  const records = loadRecords();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const title = 'Registro Nacional de Rosas';
  doc.setFontSize(16);
  doc.setTextColor('#b11a20');
  doc.text(title, 40, 48);
  doc.setFontSize(10);
  const startY = 80;
  const lineHeight = 18;
  const visibleRecords = records.slice(0, 20);
  visibleRecords.forEach((record, index) => {
    const y = startY + index * lineHeight;
    doc.text([record.date, record.variety, String(record.quantity), record.reason], 40, y, { maxWidth: 520 });
  });
  doc.save(`rosas_nacionales_${new Date().toISOString().slice(0, 10)}.pdf`);
  showToast('Exportado a PDF.');
});

/**
 * Crea un respaldo JSON descargable.
 */
btnCreateBackup.addEventListener('click', () => {
  exportBackup();
  showToast('Respaldo generado.');
});

/**
 * Abre el selector de archivos para importar un respaldo.
 */
btnImportBackup.addEventListener('click', () => {
  importFile.click();
});

/**
 * Procesa el archivo de respaldo importado.
 */
importFile.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    await importBackup(file);
    loadAppData();
    showToast('Respaldo importado correctamente.');
  } catch (error) {
    showToast(error.message);
  } finally {
    importFile.value = '';
  }
});

/**
 * Borra todos los registros con confirmación.
 */
btnClearAll.addEventListener('click', () => {
  if (confirm('¿Estás seguro de borrar todos los registros? Esta acción no se puede deshacer.')) {
    clearAllRecords();
    loadAppData();
    showToast('Todos los registros fueron eliminados.');
  }
});

/**
 * Inicializa la aplicación y sus estados.
 */
async function initApp() {
  setDefaultDate();
  initializeRemoteDatabase();
  await syncRemoteToLocal();
  setRemoteStatus();
  loadAppData();
  updateClock();
  setInterval(updateClock, 1000);
}

function setRemoteStatus() {
  if (typeof remoteEnabled !== 'undefined' && remoteEnabled) {
    remoteStatus.textContent = 'Sincronización remota activa';
    remoteStatus.classList.add('active');
  } else {
    remoteStatus.textContent = 'Sincronización remota no configurada';
    remoteStatus.classList.remove('active');
  }
}

initApp();
