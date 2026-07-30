/* database.js
   Maneja el almacenamiento persistente en LocalStorage para los registros de flores nacionales.
*/

const STORAGE_KEY = 'rosas_nacionales_records';
const REMOTE_CONFIG_KEY = 'rosas_nacionales_remote_config';
let remoteEnabled = false;
let firestoreDb = null;

/**
 * Lee la configuración remota guardada en LocalStorage.
 * @returns {Object|null}
 */
function loadRemoteConfig() {
  const data = localStorage.getItem(REMOTE_CONFIG_KEY);
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Guarda la configuración remota en LocalStorage.
 * @param {Object} config
 */
function saveRemoteConfig(config) {
  localStorage.setItem(REMOTE_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Inicializa Firebase Firestore si se configura correctamente.
 */
function initializeRemoteDatabase() {
  const config = loadRemoteConfig();
  const isConfigured = config && config.apiKey && config.projectId && config.appId;
  if (!isConfigured || typeof firebase === 'undefined') {
    remoteEnabled = false;
    return;
  }

  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(config);
    }
    firestoreDb = firebase.firestore();
    remoteEnabled = true;
  } catch (error) {
    console.warn('No se pudo inicializar Firebase:', error);
    remoteEnabled = false;
  }
}

/**
 * Obtiene los registros guardados en LocalStorage.
 * @returns {Array<Object>} Lista de registros.
 */
function loadRecords() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Carga los registros remotos de Firestore y los guarda en local.
 * @returns {Promise<void>}
 */
async function syncRemoteToLocal() {
  if (!remoteEnabled || !firestoreDb) return;

  try {
    const snapshot = await firestoreDb.collection('rosas_nacionales').get();
    const records = snapshot.docs.map((doc) => doc.data());
    saveRecords(records);
  } catch (error) {
    console.warn('Error sincronizando datos remotos:', error);
  }
}

/**
 * Sincroniza todos los registros locales hacia Firestore.
 * @param {Array<Object>} records Lista de registros.
 * @returns {Promise<void>}
 */
async function syncLocalToRemote(records) {
  if (!remoteEnabled || !firestoreDb) return;

  try {
    const collectionRef = firestoreDb.collection('rosas_nacionales');
    const snapshot = await collectionRef.get();
    const batch = firestoreDb.batch();
    const remoteIds = snapshot.docs.map((doc) => doc.id);

    records.forEach((record) => {
      const docRef = collectionRef.doc(record.id);
      batch.set(docRef, record);
    });

    remoteIds.forEach((id) => {
      if (!records.some((record) => record.id === id)) {
        batch.delete(collectionRef.doc(id));
      }
    });

    await batch.commit();
  } catch (error) {
    console.warn('Error sincronizando datos locales a remoto:', error);
  }
}

/**
 * Guarda la lista de registros en LocalStorage.
 * @param {Array<Object>} records Lista de registros.
 */
function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  if (remoteEnabled) {
    syncLocalToRemote(records);
  }
}

/**
 * Agrega un nuevo registro.
 * @param {Object} record Registro a guardar.
 */
function addRecord(record) {
  const records = loadRecords();
  records.unshift(record);
  saveRecords(records);
}

/**
 * Actualiza un registro existente.
 * @param {string} id Identificador del registro.
 * @param {Object} updated Registro actualizado.
 */
function updateRecord(id, updated) {
  const records = loadRecords();
  const index = records.findIndex((item) => item.id === id);
  if (index !== -1) {
    records[index] = updated;
    saveRecords(records);
  }
}

/**
 * Elimina un registro por ID.
 * @param {string} id Identificador del registro.
 */
function deleteRecord(id) {
  const records = loadRecords().filter((item) => item.id !== id);
  saveRecords(records);
}

/**
 * Borra todos los registros.
 */
function clearAllRecords() {
  saveRecords([]);
}

/**
 * Crea una copia de seguridad en formato JSON descargable.
 */
function exportBackup() {
  const data = loadRecords();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `respaldo_rosas_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Importa un respaldo JSON y lo guarda en LocalStorage.
 * @param {File} file Archivo JSON seleccionado.
 * @returns {Promise<void>}
 */
function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) {
          reject(new Error('El respaldo debe contener un arreglo de registros.'));
          return;
        }
        saveRecords(imported);
        resolve();
      } catch (error) {
        reject(new Error('No se pudo leer el archivo JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Error leyendo el archivo.'));
    reader.readAsText(file);
  });
}

/**
 * Calcula el total de tallos a partir de los registros.
 * @param {Array<Object>} records Lista de registros.
 * @returns {number} Total de tallos.
 */
function calculateTotalStems(records) {
  return records.reduce((sum, item) => sum + Number(item.quantity), 0);
}

/**
 * Devuelve la cantidad de registros por campo clave.
 * @param {Array<Object>} records Lista de registros.
 * @param {string} field Nombre del campo.
 * @returns {Object} Conteo de valores.
 */
function countByField(records, field) {
  return records.reduce((acc, item) => {
    const value = item[field] || 'Sin especificar';
    acc[value] = (acc[value] || 0) + Number(item.quantity);
    return acc;
  }, {});
}

/**
 * Obtiene el valor más frecuente por cantidad.
 * @param {Object} counts Conteo de valores.
 * @returns {string} Valor más frecuente.
 */
function getMostFrequent(counts) {
  const entries = Object.entries(counts);
  if (!entries.length) return '-';
  const [top] = entries.sort((a, b) => b[1] - a[1]);
  return `${top[0]} (${top[1]})`;
}
