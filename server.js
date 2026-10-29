const express = require('express');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// Lógica para leer las llaves de Firebase (Local vs Vercel)
let serviceAccount;
if (process.env.FIREBASE_KEYS) {
  // Si estamos en Vercel (lee las variables de entorno)
  serviceAccount = JSON.parse(process.env.FIREBASE_KEYS);
} else {
  // Si estamos en tu PC (lee el archivo local)
  serviceAccount = require('./firebase-keys.json');
}

// Inicializar Firebase
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://asistenciacanva-default-rtdb.firebaseio.com"
});
const db = getDatabase();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static('public'));

// ==================== LOGIN ====================
app.post('/api/login', async (req, res) => {
  try {
    const { correo } = req.body;
    const input = correo.trim().toLowerCase();

    if (input === 'docentecanva25') {
      return res.json({ ok: true, rol: 'admin', nombre: 'Docente' });
    }

    // 1. Traemos TODOS los estudiantes de Firebase
    const snapshot = await db.ref('estudiantes').once('value');
    const estudiantesData = snapshot.val() || {};
    
    let estudianteEncontrado = null;
    let idEncontrado = null;

    // 2. Buscamos manualmente comparando en minúsculas
    for (const id in estudiantesData) {
      const est = estudiantesData[id];
      // Si el correo de Firebase (en minúsculas) coincide con lo que escribió el usuario
      if (est.correo && est.correo.toLowerCase() === input) {
        estudianteEncontrado = est;
        idEncontrado = id;
        break; // Lo encontramos, dejamos de buscar
      }
    }

    // 3. Si lo encontramos, devolvemos sus datos
    if (estudianteEncontrado) {
      return res.json({ 
        ok: true, 
        rol: 'estudiante', 
        estudiante: { id: idEncontrado, ...estudianteEncontrado } 
      });
    }

    return res.status(404).json({ error: 'Correo no registrado en el sistema' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== VISTA ESTUDIANTE ====================
app.get('/api/estudiante/:id/notas', async (req, res) => {
  try {
    const estudianteId = req.params.id;
    
    const estSnap = await db.ref(`estudiantes/${estudianteId}`).once('value');
    if (!estSnap.exists()) return res.status(404).json({ error: 'No encontrado' });
    const estudiante = { id: estudianteId, ...estSnap.val() };

    const sesSnap = await db.ref('sesiones').orderByChild('grupo_id').equalTo(estudiante.grupo_id).once('value');
    const sesionesData = sesSnap.val() || {};
    const sesiones = Object.keys(sesionesData).map(id => ({ 
      id: parseInt(id), 
      ...sesionesData[id] 
    })).sort((a,b) => a.numero_sesion - b.numero_sesion);

    const asisSnap = await db.ref(`asistencias/${estudianteId}`).once('value');
    const asistenciasData = asisSnap.val() || {};
    const asistencias = Object.keys(asistenciasData).map(sesion_id => ({ 
      sesion_id: parseInt(sesion_id), 
      ...asistenciasData[sesion_id] 
    }));

    const partSnap = await db.ref(`participaciones/${estudianteId}`).once('value');
    const participacionesData = partSnap.val() || {};
    const participaciones = Object.keys(participacionesData).map(sesion_id => ({ 
      sesion_id: parseInt(sesion_id), 
      ...participacionesData[sesion_id] 
    }));

    const certSnap = await db.ref(`certificados/${estudianteId}`).once('value');
    const certData = certSnap.val() || {};
    const certificados = Object.keys(certData).map(num => ({ 
      certificado_numero: parseInt(num), 
      subido: certData[num].subido ? 1 : 0 
    }));

    res.json({ estudiante, sesiones, asistencias, participaciones, certificados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== VISTA ADMIN ====================
app.get('/api/grupos/:id/matriz', async (req, res) => {
  try {
    const grupoId = parseInt(req.params.id);
    
    const gSnap = await db.ref(`grupos/${grupoId}`).once('value');
    const grupo = gSnap.val();

    const estSnap = await db.ref('estudiantes').orderByChild('grupo_id').equalTo(grupoId).once('value');
    const estData = estSnap.val() || {};
    const estudiantesBase = Object.keys(estData).map(id => ({ id: parseInt(id), ...estData[id] })).sort((a,b) => a.apellidos.localeCompare(b.apellidos));

    const sesSnap = await db.ref('sesiones').orderByChild('grupo_id').equalTo(grupoId).once('value');
    const sesData = sesSnap.val() || {};
    const sesiones = Object.keys(sesData).map(id => ({ id: parseInt(id), ...sesData[id] })).sort((a,b) => a.numero_sesion - b.numero_sesion);

    const asisSnap = await db.ref('asistencias').once('value');
    const asisData = asisSnap.val() || {};
    
    const partSnap = await db.ref('participaciones').once('value');
    const partData = partSnap.val() || {};

    const certSnap = await db.ref('certificados').once('value');
    const certData = certSnap.val() || {};

    let asistencias = [];
    let participaciones = [];
    let certificadosCisco = [];

    estudiantesBase.forEach(e => {
      if (asisData[e.id]) {
        Object.keys(asisData[e.id]).forEach(sesId => {
          asistencias.push({ estudiante_id: e.id, sesion_id: parseInt(sesId), estado: asisData[e.id][sesId].estado });
        });
      }
      if (partData[e.id]) {
        Object.keys(partData[e.id]).forEach(sesId => {
          participaciones.push({ estudiante_id: e.id, sesion_id: parseInt(sesId), puntaje: partData[e.id][sesId].puntaje });
        });
      }
      if (certData[e.id]) {
        Object.keys(certData[e.id]).forEach(num => {
          certificadosCisco.push({ estudiante_id: e.id, certificado_numero: parseInt(num), subido: certData[e.id][num].subido ? 1 : 0 });
        });
      }
    });

    const totalSes = sesiones.length;
    const resumen = estudiantesBase.map(e => {
      const asis = asistencias.filter(a => a.estudiante_id === e.id);
      const presentes = asis.filter(a => a.estado === 'presente').length;
      const tardes = asis.filter(a => a.estado === 'tarde').length;
      const justificadas = asis.filter(a => a.estado === 'justificado').length;
      
      const particip = participaciones.filter(p => p.estudiante_id === e.id);
      const totalPuntos = particip.reduce((s, p) => s + (parseInt(p.puntaje, 10) || 0), 0);
      const pct = totalSes > 0 ? Math.round(((presentes + tardes) / totalSes) * 100) : 0;

      return { ...e, presentes, tardes, justificadas, ausentes: totalSes - presentes - tardes - justificadas, asistencia_pct: pct, puntaje_total: totalPuntos, aprueba: pct >= 80 };
    });

    res.json({ grupo, estudiantes: resumen, sesiones, asistencias, participaciones, certificadosCisco, totalSesiones: totalSes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== ACCIONES (GUARDAR) ====================
app.post('/api/asistencias', async (req, res) => {
  try {
    const { estudiante_id, sesion_id, estado } = req.body;
    await db.ref(`asistencias/${estudiante_id}/${sesion_id}`).set({ estado });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/participaciones', async (req, res) => {
  try {
    const { estudiante_id, sesion_id, puntaje } = req.body;
    await db.ref(`participaciones/${estudiante_id}/${sesion_id}`).set({ puntaje: parseInt(puntaje, 10) || 0 });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/certificados-cisco', async (req, res) => {
  try {
    const { estudiante_id, certificado_numero, subido } = req.body;
    await db.ref(`certificados/${estudiante_id}/${certificado_numero}`).set({ subido });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/estudiantes', async (req, res) => {
  try {
    const { nombre, apellidos, correo, grupo_id } = req.body;
    const existe = await db.ref('estudiantes').orderByChild('correo').equalTo(correo.toLowerCase()).once('value');
    if (existe.exists()) return res.status(400).json({ error: 'El correo ya existe' });
    
    const ref = db.ref('estudiantes').push();
    const nuevoId = ref.key; 

    await ref.set({ nombre, apellidos, correo: correo.toLowerCase(), grupo_id });
    res.json({ ok: true, id: nuevoId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== SISTEMA DE MENSAJES ====================

// Estudiante envía mensaje al docente
app.post('/api/mensajes', async (req, res) => {
  try {
    const { estudiante_id, nombre, grupo, mensaje, tipo } = req.body;
    const ref = db.ref('mensajes').push();
    await ref.set({
      estudiante_id,
      nombre,
      grupo, 
      mensaje,
      tipo,
      fecha: new Date().toISOString(),
      leido: false,
      respuesta_docente: null // 🟢 Nuevo campo para guardar tu respuesta
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Docente obtiene todos los mensajes
app.get('/api/mensajes', async (req, res) => {
  try {
    const snapshot = await db.ref('mensajes').orderByChild('fecha').once('value');
    const data = snapshot.val() || {};
    const mensajes = Object.keys(data).map(id => ({ id, ...data[id] })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json(mensajes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Docente marca como leído
app.post('/api/mensajes/leer', async (req, res) => {
  try {
    const { id } = req.body;
    await db.ref(`mensajes/${id}`).update({ leido: true });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 🟢 Docente responde
app.post('/api/mensajes/responder', async (req, res) => {
  try {
    const { id, respuesta } = req.body;
    await db.ref(`mensajes/${id}`).update({ respuesta_docente: respuesta });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 🟢 Estudiante ve sus mensajes y respuestas
app.get('/api/estudiante/:id/mensajes', async (req, res) => {
  try {
    const estudianteId = req.params.id;
    const snapshot = await db.ref('mensajes').orderByChild('estudiante_id').equalTo(estudianteId).once('value');
    const data = snapshot.val() || {};
    const mensajes = Object.keys(data).map(id => ({ id, ...data[id] })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.json(mensajes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(port, () => {
  console.log(`✅ Servidor conectado a Firebase Realtime Database en http://localhost:${port}`);
});