const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { MongoClient } = require('mongodb');

const app = express();
const upload = multer({ dest: 'uploads/' });

const MONGO_URI = 'mongodb+srv://ecoalliance33:cXIdVOePhB0RCArx@automatizaciondb.mj72mym.mongodb.net/';
const DB_NAME = 'Automatizacion_lista_productos_res';
const COLLECTION = 'productos';

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

// Exportar la aplicación Express para Firebase Functions
exports.api = app; 