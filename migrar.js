const pool = require('./db');
// Importamos de la forma correcta para las versiones nuevas de Firebase
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const serviceAccount = require('./firebase-keys.json');

// Inicializamos Firebase con la sintaxis moderna
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://asistenciacanva-default-rtdb.firebaseio.com" 
});

const db = getDatabase();

async function migrar() {
  console.log('🚀 Iniciando migración a Realtime Database...');

  try {
    // 1. Migrar Grupos
    const [grupos] = await pool.query('SELECT * FROM grupos');
    for (const g of grupos) {
      await db.ref(`grupos/${g.id}`).set({ nombre: g.nombre });
    }
    console.log(`✅ ${grupos.length} grupos migrados.`);

    // 2. Migrar Sesiones
    const [sesiones] = await pool.query('SELECT * FROM sesiones');
    for (const s of sesiones) {
      await db.ref(`sesiones/${s.id}`).set({ 
        grupo_id: s.grupo_id, 
        numero_sesion: s.numero_sesion 
      });
    }
    console.log(`✅ ${sesiones.length} sesiones migradas.`);

    // 3. Migrar Estudiantes
    const [estudiantes] = await pool.query('SELECT * FROM estudiantes');
    for (const e of estudiantes) {
      await db.ref(`estudiantes/${e.id}`).set({
        nombre: e.nombre, 
        apellidos: e.apellidos, 
        correo: e.correo, 
        grupo_id: e.grupo_id
      });
    }
    console.log(`✅ ${estudiantes.length} estudiantes migrados.`);

    // 4. Migrar Asistencias
    const [asistencias] = await pool.query('SELECT * FROM asistencias');
    for (const a of asistencias) {
      await db.ref(`asistencias/${a.estudiante_id}/${a.sesion_id}`).set({
        estado: a.estado
      });
    }
    console.log(`✅ ${asistencias.length} asistencias migradas.`);

    // 5. Migrar Participaciones
    const [participaciones] = await pool.query('SELECT * FROM participaciones');
    for (const p of participaciones) {
      await db.ref(`participaciones/${p.estudiante_id}/${p.sesion_id}`).set({
        puntaje: p.puntaje
      });
    }
    console.log(`✅ ${participaciones.length} participaciones migradas.`);

    // 6. Migrar Certificados
    const [certificados] = await pool.query('SELECT * FROM certificados_cisco');
    for (const c of certificados) {
      await db.ref(`certificados/${c.estudiante_id}/${c.certificado_numero}`).set({
        subido: c.subido === 1
      });
    }
    console.log(`✅ ${certificados.length} certificados migrados.`);

    console.log('🎉 ¡Migración a Realtime Database completada con éxito!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

migrar();