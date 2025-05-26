const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const { MongoClient } = require('mongodb');

const app = express();
const upload = multer({ dest: 'uploads/' });

const MONGO_URI = 'mongodb+srv://ecoalliance33:cXIdVOePhB0RCArx@automatizaciondb.mj72mym.mongodb.net/';
const DB_NAME = 'Automatizacion_lista_productos_res';
const COLLECTION = 'productos';

// CORS solo para la página específica (solo origen de Firebase Hosting)
app.use(cors({
  origin: 'https://mcs-erp-frontend.web.app',
  methods: ['POST'],
}));

// Seguridad: solo permitir POST a /api/carga-directa
app.use((req, res, next) => {
  if (req.method !== 'POST' || req.path !== '/api/carga-directa') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
});

// Endpoint para subir archivo Excel/CSV y cargar a MongoDB
app.post('/api/carga-directa', upload.single('archivoExcelPlain'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
    
    // Leer archivo Excel/CSV
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'No se encontraron datos en el archivo' });
    }
    
    // Insertar en MongoDB
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const result = await db.collection(COLLECTION).insertMany(data);
    await client.close();
    
    res.json({ 
      ok: true, 
      insertedCount: result.insertedCount,
      mensaje: `Se insertaron ${result.insertedCount} registros exitosamente`
    });
  } catch (err) {
    console.error('Error al procesar el archivo:', err);
    res.status(500).json({ 
      ok: false, 
      error: 'Error al procesar el archivo',
      detalles: err.message 
    });
  }
});

// Iniciar servidor (comentado para Firebase Functions)
// app.listen(5001, () => {
//   console.log('API de carga directa ejecutándose en puerto 5001');
// });

// Exportar la aplicación Express para Firebase Functions
exports.api = app; 