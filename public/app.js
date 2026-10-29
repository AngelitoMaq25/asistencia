let grupoActual = null;
let datosActuales = null;
let sesionSeleccionada = null;
let filtroActivo = 'todos';
let busqueda = '';
let moduloActual = 'resumen';
let filtroCisco = 'todos';
let busquedaCisco = '';
let filtroSeguimiento = 'todos';
let busquedaSeguimiento = '';

// Variables para Login y Mensajes
let sesionActual = null;
let mensajesAdmin = [];

// Metas
const META_ASISTENCIA_PCT = 80;
const META_PARTICIPACION_PCT = 80;
const PTS_POR_SESION = 5;

// ==================== LÓGICA DE LOGIN ====================

async function hacerLogin(ev) {
  ev.preventDefault();
  
  const correo = document.getElementById('login-correo').value.trim();
  const err = document.getElementById('login-error');
  err.textContent = '';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo })
    });
    const data = await res.json();

    if (!res.ok) {
      err.textContent = data.error;
      return;
    }

    sesionActual = data;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';

    if (data.rol === 'admin') {
      document.querySelector('.topbar-right').innerHTML = `
        <button class="grupo-btn" data-grupo="1" onclick="cambiarGrupo(1, this)">PEAD-k</button>
        <button class="grupo-btn" data-grupo="2" onclick="cambiarGrupo(2, this)">PEAD-m</button>
        <button class="btn-agregar" onclick="abrirModalEstudiante()">➕ Agregar estudiante</button>
        <button class="btn-cancelar" onclick="abrirBandejaEntrada()" style="margin-left: 10px; position: relative;">📥 Mensajes <span id="badge-mensajes" style="display: none; position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 10px; font-weight: bold;">0</span></button>
        <button class="btn-cancelar" style="margin-left: 10px;" onclick="cerrarSesion()">Salir</button>
      `;
      cargarMensajesAdmin();
      setInterval(cargarMensajesAdmin, 30000); 
    } else {
      document.querySelector('.topbar-right').innerHTML = `
        <button class="btn-cancelar" onclick="cerrarSesion()">Salir</button>
      `;
      cargarVistaEstudiante(data.estudiante.id);
    }
  } catch (err) {
    err.textContent = 'Error de conexión con el servidor';
  }
}

function cerrarSesion() {
  sesionActual = null;
  location.reload();
}

// ==================== VISTA ESTUDIANTE ====================

async function cargarVistaEstudiante(id) {
  const res = await fetch(`/api/estudiante/${id}/notas`);
  const data = await res.json();
  const app = document.getElementById('app');
  
  const totalSes = data.sesiones.length || 0;
  const asistenciasValidas = data.asistencias.filter(a => a.estado === 'presente' || a.estado === 'tarde').length;
  const participacionObtenida = data.participaciones.reduce((sum, p) => sum + p.puntaje, 0);
  
  const certsSubidos = data.certificados.filter(c => c.subido === 1);
  const cert1 = certsSubidos.some(c => c.certificado_numero === 1);
  const cert2 = certsSubidos.some(c => c.certificado_numero === 2);
  const cert3 = certsSubidos.some(c => c.certificado_numero === 3);
  const certsFaltantes = [1,2,3].filter(num => !certsSubidos.some(c => c.certificado_numero === num));

  app.innerHTML = `
    <div style="padding: 40px; max-width: 1100px; margin: 0 auto;">
      
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #0f172a;">Hola, ${data.estudiante.nombre.split(' ')[0]} 👋</h1>
        <p style="color: #64748b; margin-top: 8px; font-size: 16px;">Este es tu panel personal. Aquí puedes revisar qué te falta para terminar el curso.</p>
      </div>

      <div style="text-align: center; margin-bottom: 40px;">
        <button onclick="abrirMisMensajes('${id}')" style="background: white; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-weight: 600; color: #334155; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
          📩 Ver mis mensajes y respuestas
        </button>
      </div>

      ${certsFaltantes.length > 0 ? `
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 16px; padding: 24px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <h3 style="margin: 0 0 10px; color: #92400e; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">⚠️</span> ¡Atención! Te faltan tareas por subir
          </h3>
          <p style="margin: 0; color: #b45309; font-size: 15px;">
            Aún no has subido el certificado: <strong>${certsFaltantes.map(n => 'Cisco ' + n).join(', ')}</strong>. Por favor, súbelo al aula virtual a la brevedad.
          </p>
        </div>
      ` : `
        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 16px; padding: 24px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <h3 style="margin: 0; color: #166534; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">🎉</span> ¡Felicidades! Has subido todos tus certificados Cisco.
          </h3>
        </div>
      `}

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px;">
        <div class="stat" style="text-align: left; padding: 24px; border-radius: 16px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div class="stat-label" style="font-size: 14px; font-weight: 600; color: #64748b;">Mis Asistencias</div>
          <div class="stat-value" style="font-size: 32px; font-weight: 800; color: #4f46e5; margin-top: 8px;">
            ${asistenciasValidas} <small style="font-size: 16px; font-weight: 500; color: #64748b;">/ ${totalSes} clases</small>
          </div>
        </div>

        <div class="stat" style="text-align: left; padding: 24px; border-radius: 16px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div class="stat-label" style="font-size: 14px; font-weight: 600; color: #64748b;">Mis Puntos</div>
          <div class="stat-value" style="font-size: 32px; font-weight: 800; color: #16a34a; margin-top: 8px;">
            ${participacionObtenida} <small style="font-size: 16px; font-weight: 500; color: #64748b;">pts</small>
          </div>
        </div>

        <div class="stat" style="text-align: left; padding: 24px; border-radius: 16px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div class="stat-label" style="font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 12px;">Mis Certificados Cisco</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
              <span>Certificado 1</span>
              <span style="font-weight: 700; color: ${cert1 ? '#16a34a' : '#dc2626'}">${cert1 ? '✅ Subido' : '❌ Falta'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
              <span>Certificado 2</span>
              <span style="font-weight: 700; color: ${cert2 ? '#16a34a' : '#dc2626'}">${cert2 ? '✅ Subido' : '❌ Falta'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
              <span>Certificado 3</span>
              <span style="font-weight: 700; color: ${cert3 ? '#16a34a' : '#dc2626'}">${cert3 ? '✅ Subido' : '❌ Falta'}</span>
            </div>
          </div>
        </div>
      </div>

      <h3 style="margin-bottom: 15px; color: #1e293b;">Detalle de tus clases</h3>
      <div style="background: white; border-radius: 14px; overflow: hidden; border: 1px solid var(--border); box-shadow: var(--shadow);">
        <table class="tabla-modulo" style="width: 100%;">
          <thead><tr><th>Clase</th><th>Asistencia</th><th>Puntos de Participación</th></tr></thead>
          <tbody>
            ${data.sesiones.map(s => {
              const a = data.asistencias.find(x => x.sesion_id === s.id);
              const p = data.participaciones.find(x => x.sesion_id === s.id);
              let estadoTxt = '—';
              if (a) {
                if (a.estado === 'presente') estadoTxt = '✅ Presente';
                else if (a.estado === 'tarde') estadoTxt = '🟠 Tarde';
                else if (a.estado === 'justificado') estadoTxt = '🔵 Justificado';
                else estadoTxt = '❌ Ausente';
              }
              return `
                <tr>
                  <td>Sesión ${s.numero_sesion}</td>
                  <td>${estadoTxt}</td>
                  <td><strong>${p ? p.puntaje : 0}</strong> pts</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- BOTÓN FLOTANTE DE MENSAJE -->
    <button onclick="abrirModalReclamo()" style="position: fixed; bottom: 30px; right: 30px; background: #4f46e5; color: white; border: none; border-radius: 50px; padding: 15px 25px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4); display: flex; align-items: center; gap: 10px; z-index: 1000; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
      <span style="font-size: 20px;">💬</span> Enviar mensaje al docente
    </button>

    <!-- MODAL DE RECLAMO -->
    <div id="modal-reclamo" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1001; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
      <div style="background: white; padding: 30px; border-radius: 20px; width: 100%; max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
        <h2 style="margin-top: 0; color: #0f172a;">Enviar mensaje al docente</h2>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">Selecciona el motivo y escribe tu mensaje. El docente lo revisará a la brevedad.</p>
        
        <div style="margin-bottom: 15px;">
          <label style="font-weight: 600; font-size: 14px; color: #334155; display: block; margin-bottom: 5px;">Motivo del mensaje:</label>
          <select id="reclamo-tipo" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit;">
            <option value="asistencia">Me falta marcar una asistencia</option>
            <option value="certificado">Ya subí un certificado</option>
            <option value="otro">Otro motivo</option>
          </select>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="font-weight: 600; font-size: 14px; color: #334155; display: block; margin-bottom: 5px;">Tu mensaje:</label>
          <textarea id="reclamo-mensaje" rows="4" placeholder="Ej: Docente, asistí a la sesión 5 pero me salió como falta. Por favor, revíselo." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; resize: vertical;"></textarea>
        </div>

        <div id="reclamo-error" style="color: #ef4444; font-size: 13px; margin-bottom: 15px;"></div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="cerrarModalReclamo()" style="padding: 10px 20px; border: 1px solid #cbd5e1; background: white; color: #64748b; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: inherit;">Cancelar</button>
          <button onclick="enviarReclamo('${id}')" style="padding: 10px 20px; border: none; background: #4f46e5; color: white; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: inherit;">Enviar mensaje</button>
        </div>
      </div>
    </div>
  `;
}

function abrirModalReclamo() {
  document.getElementById('modal-reclamo').style.display = 'flex';
  document.getElementById('reclamo-mensaje').value = '';
  document.getElementById('reclamo-error').textContent = '';
}

function cerrarModalReclamo() {
  document.getElementById('modal-reclamo').style.display = 'none';
}

async function enviarReclamo(estudianteId) {
  const tipo = document.getElementById('reclamo-tipo').value;
  const mensaje = document.getElementById('reclamo-mensaje').value.trim();
  const err = document.getElementById('reclamo-error');

  if (!mensaje) {
    err.textContent = 'Por favor, escribe un mensaje antes de enviar.';
    return;
  }

  const nombreGrupo = sesionActual.estudiante.grupo_id == 1 ? 'PEAD-k' : 'PEAD-m';

  try {
    const res = await fetch('/api/mensajes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estudiante_id: estudianteId,
        nombre: sesionActual.estudiante.nombre + ' ' + sesionActual.estudiante.apellidos,
        grupo: nombreGrupo,
        mensaje: mensaje,
        tipo: tipo
      })
    });

    if (res.ok) {
      cerrarModalReclamo();
      alert('¡Mensaje enviado con éxito! El docente lo revisará pronto.');
    } else {
      err.textContent = 'Error al enviar el mensaje. Intenta de nuevo.';
    }
  } catch (e) {
    err.textContent = 'Error de conexión.';
  }
}

// ==================== VISTA DE MENSAJES DEL ESTUDIANTE ====================

async function abrirMisMensajes(estudianteId) {
  let modal = document.getElementById('modal-mis-mensajes');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-mis-mensajes';
    modal.style = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1002; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);';
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 20px; width: 100%; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #0f172a;">Mis mensajes</h2>
          <button onclick="document.getElementById('modal-mis-mensajes').style.display='none'" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">&times;</button>
        </div>
        <div id="lista-mis-mensajes">Cargando...</div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  
  const res = await fetch(`/api/estudiante/${estudianteId}/mensajes`);
  const mensajes = await res.json();
  const contenedor = document.getElementById('lista-mis-mensajes');

  if (mensajes.length === 0) {
    contenedor.innerHTML = '<p style="text-align:center; color:#64748b;">No has enviado ningún mensaje aún.</p>';
    return;
  }

  contenedor.innerHTML = mensajes.map(m => `
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 15px; background: #f8fafc;">
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 5px;">Tú enviaste: ${new Date(m.fecha).toLocaleString()}</div>
      <p style="margin: 0 0 10px; font-size: 14px; color: #334155;">"${m.mensaje}"</p>
      
      ${m.respuesta_docente ? `
        <div style="background: #e0e7ff; border-left: 4px solid #4f46e5; padding: 10px; border-radius: 0 8px 8px 0; margin-top: 10px;">
          <div style="font-size: 12px; color: #3730a3; font-weight: bold; margin-bottom: 4px;">Respuesta del docente:</div>
          <p style="margin: 0; font-size: 14px; color: #1e1b4b;">"${m.respuesta_docente}"</p>
        </div>
      ` : `
        <div style="font-size: 12px; color: #d97706; font-style: italic; background: #fffbeb; padding: 8px; border-radius: 6px;">⏳ Esperando respuesta del docente...</div>
      `}
    </div>
  `).join('');
}

// ==================== BANDEJA DE ENTRADA (ADMIN) ====================

async function cargarMensajesAdmin() {
  try {
    const res = await fetch('/api/mensajes');
    mensajesAdmin = await res.json();
    actualizarBadgeMensajes();
    if (document.getElementById('modal-bandeja')?.style.display === 'flex') {
      renderBandejaEntrada();
    }
  } catch(e) { console.log('Error cargando mensajes'); }
}

function actualizarBadgeMensajes() {
  const noLeidos = mensajesAdmin.filter(m => !m.leido).length;
  const badge = document.getElementById('badge-mensajes');
  if (badge) {
    if (noLeidos > 0) {
      badge.style.display = 'block';
      badge.textContent = noLeidos;
    } else {
      badge.style.display = 'none';
    }
  }
}

function abrirBandejaEntrada() {
  let modal = document.getElementById('modal-bandeja');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-bandeja';
    modal.style = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1001; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);';
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 20px; width: 100%; max-width: 600px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #0f172a;">Mensajes de Estudiantes</h2>
          <button onclick="document.getElementById('modal-bandeja').style.display='none'" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">&times;</button>
        </div>
        <div id="lista-mensajes"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  cargarMensajesAdmin(); 
}

function renderBandejaEntrada() {
  const contenedor = document.getElementById('lista-mensajes');
  if (!contenedor) return;

  if (mensajesAdmin.length === 0) {
    contenedor.innerHTML = '<p style="text-align:center; color:#64748b; padding: 20px;">No hay mensajes nuevos por ahora.</p>';
    return;
  }

  contenedor.innerHTML = mensajesAdmin.map(m => `
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 15px; background: ${m.leido ? '#f8fafc' : 'white'}; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div>
          <strong style="color: #1e293b; font-size: 15px;">${m.nombre}</strong>
          <span style="display: inline-block; margin-left: 8px; font-size: 11px; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 10px; font-weight: 700;">
            ${m.grupo || 'Sin grupo'}
          </span>
        </div>
        <span style="font-size: 11px; background: ${m.tipo === 'asistencia' ? '#fef3c7' : m.tipo === 'certificado' ? '#d1fae5' : '#e5e7eb'}; color: ${m.tipo === 'asistencia' ? '#92400e' : m.tipo === 'certificado' ? '#166534' : '#374151'}; padding: 2px 8px; border-radius: 10px; font-weight: 600; text-transform: uppercase;">
          ${m.tipo}
        </span>
      </div>

      <p style="margin: 0 0 10px; font-size: 14px; color: #334155; line-height: 1.4;">"${m.mensaje}"</p>
      
      <!-- 🟢 SECCIÓN DE RESPUESTA -->
      <div style="background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0;">
        ${m.respuesta_docente ? `
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px; font-weight: 600;">Tu respuesta:</div>
          <p style="margin: 0 0 8px; font-size: 13px; color: #1e293b;">"${m.respuesta_docente}"</p>
          <button onclick="editarRespuesta('${m.id}', '${m.respuesta_docente.replace(/'/g, "\\'")}')" style="background: none; border: none; color: #4f46e5; font-size: 12px; font-weight: bold; cursor: pointer; padding: 0;">Editar respuesta</button>
        ` : `
          <div style="display: flex; gap: 8px;">
            <input type="text" id="resp-${m.id}" placeholder="Escribe una respuesta..." style="flex: 1; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-family: inherit; font-size: 13px;">
            <button onclick="responderMensaje('${m.id}')" style="background: #4f46e5; color: white; border: none; border-radius: 6px; padding: 8px 15px; font-size: 13px; font-weight: bold; cursor: pointer;">Responder</button>
          </div>
        `}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; color: #94a3b8;">${new Date(m.fecha).toLocaleString()}</span>
        ${!m.leido ? `<button onclick="marcarMensajeLeido('${m.id}')" style="background: #10b981; color: white; border: none; border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: bold; cursor: pointer;">Marcar como leído</button>` : '<span style="color: #10b981; font-size: 12px; font-weight: bold;">✓ Leído</span>'}
      </div>

    </div>
  `).join('');
}

async function marcarMensajeLeido(id) {
  try {
    await fetch('/api/mensajes/leer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    cargarMensajesAdmin(); 
  } catch (e) {
    alert('Error al marcar como leído');
  }
}

async function responderMensaje(id) {
  const input = document.getElementById(`resp-${id}`);
  const texto = input.value.trim();
  if (!texto) return alert('Escribe una respuesta antes de enviar.');

  try {
    await fetch('/api/mensajes/responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, respuesta: texto })
    });
    cargarMensajesAdmin();
  } catch (e) {
    alert('Error al responder');
  }
}

async function editarRespuesta(id, textoActual) {
  const nuevaRespuesta = prompt('Edita tu respuesta:', textoActual);
  if (nuevaRespuesta === null || nuevaRespuesta.trim() === '') return;
  
  try {
    await fetch('/api/mensajes/responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, respuesta: nuevaRespuesta.trim() })
    });
    cargarMensajesAdmin();
  } catch (e) {
    alert('Error al editar la respuesta');
  }
}

// ==================== LÓGICA DE ADMINISTRADOR (RESTANTE) ====================

async function cambiarGrupo(id, btn) {
  grupoActual = id;
  document.querySelectorAll('.grupo-btn').forEach(b => b.classList.remove('activo'));
  btn.classList.add('activo');
  filtroActivo = 'todos';
  busqueda = '';
  filtroCisco = 'todos';
  busquedaCisco = '';
  filtroSeguimiento = 'todos';
  busquedaSeguimiento = '';
  await recargar();
  sesionSeleccionada = datosActuales.sesiones[0]?.id || null;
  render();
}

async function recargar() {
  const res = await fetch(`/api/grupos/${grupoActual}/matriz`);
  datosActuales = await res.json();
}

function contarAsistencias(estudiante_id) {
  let presentes = 0, tardes = 0;
  datosActuales.asistencias
    .filter(a => a.estudiante_id === estudiante_id)
    .forEach(a => {
      if (a.estado === 'presente') presentes++;
      else if (a.estado === 'tarde') tardes++;
    });
  return { presentes, tardes };
}

function totalSesionesSeguras() {
  return Number(datosActuales.totalSesiones) || datosActuales.sesiones.length || 16;
}

function calcularAvanceParticipacion(estudianteId) {
  const puntosPosibles = totalSesionesSeguras() * PTS_POR_SESION;
  const puntosObtenidos = datosActuales.participaciones
    .filter(p => p.estudiante_id === estudianteId)
    .reduce((totalPuntos, p) => totalPuntos + (parseInt(p.puntaje, 10) || 0), 0);
  const porcentaje = puntosPosibles > 0
    ? Math.min(100, Math.round((puntosObtenidos / puntosPosibles) * 100))
    : 0;

  return { porcentaje };
}

function aplicarFiltros(estudiantes, asisMap, partMap, metaAsist, metaPart) {
  return estudiantes.filter(e => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const texto = `${e.nombre} ${e.apellidos} ${e.correo}`.toLowerCase();
      if (!texto.includes(q)) return false;
    }
    const est = asisMap[e.id] || 'ausente';
    const puntosSesion = Number(partMap[e.id]) || 0;
    const { presentes, tardes } = contarAsistencias(e.id);
    const validas = presentes + tardes;
    const cumpleAsist = validas >= metaAsist;
    const cumplePart = (e.puntaje_total || 0) >= metaPart;
    const aprueba = cumpleAsist && cumplePart;

    switch (filtroActivo) {
      case 'presente':      return est === 'presente';
      case 'tarde':         return est === 'tarde';
      case 'justificado':   return est === 'justificado';
      case 'ausente':       return est === 'ausente';
      case 'participaron':  return puntosSesion > 0;
      case 'noparticiparon':return puntosSesion === 0;
      case 'aprueba':       return aprueba;
      case 'riesgo':        return !aprueba;
      case 'todos':
      default:              return true;
    }
  });
}

function render() {
  if (!datosActuales) return;
  const app = document.getElementById('app');
  const { estudiantes, sesiones } = datosActuales;
  const totalSes = totalSesionesSeguras();

  const metaAsist = Math.ceil(totalSes * META_ASISTENCIA_PCT / 100);
  const maxPts = totalSes * PTS_POR_SESION;
  const metaPart = Math.ceil(maxPts * META_PARTICIPACION_PCT / 100);

  const total = estudiantes.length;
  const aprobados = estudiantes.filter(e => e.aprueba).length;
  const riesgo = total - aprobados;
  const conMinPart = estudiantes.filter(e => (e.puntaje_total || 0) >= metaPart).length;
  
  const certificados = datosActuales.certificadosCisco || [];
  const certificadosPorEstudiante = {};
  certificados.forEach(certificado => {
    if (!certificadosPorEstudiante[certificado.estudiante_id]) {
      certificadosPorEstudiante[certificado.estudiante_id] = {};
    }
    certificadosPorEstudiante[certificado.estudiante_id][certificado.certificado_numero] =
      Number(certificado.subido) === 1;
  });
  const certificadosCompletos = estudiantes.filter(e =>
    [1, 2, 3].every(numero => certificadosPorEstudiante[e.id]?.[numero])
  ).length;
  
  const resumenCisco = estudiantes.map(e => {
    const entregados = certificadosPorEstudiante[e.id] || {};
    return {
      estudiante: e,
      entregados,
      cantidad: [1, 2, 3].filter(numero => entregados[numero]).length
    };
  });
  const conteosCisco = {
    todos: resumenCisco.length,
    pendientes: resumenCisco.filter(item => item.cantidad < 3).length,
    completos: resumenCisco.filter(item => item.cantidad === 3).length,
    '0': resumenCisco.filter(item => item.cantidad === 0).length,
    '1': resumenCisco.filter(item => item.cantidad === 1).length,
    '2': resumenCisco.filter(item => item.cantidad === 2).length,
    '3': resumenCisco.filter(item => item.cantidad === 3).length
  };
  const busquedaCiscoNormalizada = busquedaCisco.trim().toLocaleLowerCase('es');
  const estudiantesCiscoVisibles = resumenCisco.filter(item => {
    const { estudiante, cantidad } = item;
    const textoEstudiante = `${estudiante.nombre} ${estudiante.apellidos} ${estudiante.correo}`.toLocaleLowerCase('es');
    if (busquedaCiscoNormalizada && !textoEstudiante.includes(busquedaCiscoNormalizada)) return false;
    if (filtroCisco === 'pendientes') return cantidad < 3;
    if (filtroCisco === 'completos') return cantidad === 3;
    if (['0', '1', '2', '3'].includes(filtroCisco)) return cantidad === Number(filtroCisco);
    return true;
  });
  
  const seguimientoAsistencia = estudiantes.map(e => {
    const { presentes, tardes } = contarAsistencias(e.id);
    const justificadas = datosActuales.asistencias.filter(a => a.estudiante_id === e.id && a.estado === 'justificado').length;
    const asistidas = presentes + tardes;
    return { estudiante: e, asistidas, justificadas, faltas: Math.max(0, sesiones.length - asistidas - justificadas) };
  }).filter(item => item.asistidas <= 2 && sesiones.length > 0)
    .sort((a, b) => a.asistidas - b.asistidas || b.faltas - a.faltas || a.estudiante.apellidos.localeCompare(b.estudiante.apellidos, 'es'));
  
  const conteosSeguimiento = {
    todos: seguimientoAsistencia.length,
    '0': seguimientoAsistencia.filter(item => item.asistidas === 0).length,
    '1': seguimientoAsistencia.filter(item => item.asistidas === 1).length,
    '2': seguimientoAsistencia.filter(item => item.asistidas === 2).length
  };
  const busquedaSeguimientoNormalizada = busquedaSeguimiento.trim().toLocaleLowerCase('es');
  const seguimientoVisible = seguimientoAsistencia.filter(item => {
    const { estudiante, asistidas } = item;
    const textoEstudiante = `${estudiante.nombre} ${estudiante.apellidos} ${estudiante.correo}`.toLocaleLowerCase('es');
    if (busquedaSeguimientoNormalizada && !textoEstudiante.includes(busquedaSeguimientoNormalizada)) return false;
    return filtroSeguimiento === 'todos' || asistidas === Number(filtroSeguimiento);
  });

  const sesion = sesiones.find(s => s.id === sesionSeleccionada) || sesiones[0] || { id: null, numero_sesion: '—' };
  const asisMap = {};
  datosActuales.asistencias.filter(a => a.sesion_id === sesion.id).forEach(a => asisMap[a.estudiante_id] = a.estado);
  const partMap = {};
  datosActuales.participaciones.filter(p => p.sesion_id === sesion.id).forEach(p => partMap[p.estudiante_id] = p.puntaje);
  const totalParticiparonEstaSesion = Object.values(partMap).filter(v => v > 0).length;

  const presentesSesion = estudiantes.filter(e => asisMap[e.id] === 'presente').length;
  const tardesSesion    = estudiantes.filter(e => asisMap[e.id] === 'tarde').length;
  const justSesion      = estudiantes.filter(e => asisMap[e.id] === 'justificado').length;
  const ausentesSesion  = estudiantes.filter(e => !asisMap[e.id] || asisMap[e.id] === 'ausente').length;
  const noPartSesion    = estudiantes.filter(e => !Number(partMap[e.id])).length;
  const visibles = aplicarFiltros(estudiantes, asisMap, partMap, metaAsist, metaPart);

  app.innerHTML = `
    <section class="dashboard-heading">
      <div><span>Panel principal</span><h2>¿Qué deseas consultar?</h2><p>Elige un módulo para ver y gestionar la información del grupo.</p></div>
      <span class="dashboard-grupo">${datosActuales.grupo?.nombre || datosActuales.grupo?.nombre_grupo || `Grupo ${grupoActual}`}</span>
    </section>
    <nav class="dashboard-modulos" aria-label="Módulos del grupo">
      <button class="modulo-card modulo-resumen ${moduloActual === 'resumen' ? 'activo' : ''}" aria-pressed="${moduloActual === 'resumen'}" onclick="cambiarModulo('resumen')">
        <span class="modulo-icono">📊</span>
        <span class="modulo-texto"><strong>Resumen</strong><small>Indicadores generales del grupo</small></span>
        <span class="modulo-cifra">${total}<small> estudiantes</small></span>
        <span class="modulo-abrir">Ver resumen <b>→</b></span>
      </button>
      <button class="modulo-card modulo-asistencia ${moduloActual === 'asistencia' ? 'activo' : ''}" aria-pressed="${moduloActual === 'asistencia'}" onclick="cambiarModulo('asistencia')">
        <span class="modulo-icono">📝</span>
        <span class="modulo-texto"><strong>Asistencia y participación</strong><small>Registra la sesión y los puntajes</small></span>
        <span class="modulo-cifra">${sesiones.length}<small> sesiones</small></span>
        <span class="modulo-abrir">Abrir módulo <b>→</b></span>
      </button>
      <button class="modulo-card modulo-seguimiento ${moduloActual === 'seguimiento' ? 'activo' : ''}" aria-pressed="${moduloActual === 'seguimiento'}" onclick="cambiarModulo('seguimiento')">
        <span class="modulo-icono">⚠️</span>
        <span class="modulo-texto"><strong>Pocas asistencias</strong><small>Estudiantes con 0, 1 o 2 clases</small></span>
        <span class="modulo-cifra">${seguimientoAsistencia.length}<small> por revisar</small></span>
        <span class="modulo-abrir">Ver seguimiento <b>→</b></span>
      </button>
      <button class="modulo-card modulo-estudiantes ${moduloActual === 'estudiantes' ? 'activo' : ''}" aria-pressed="${moduloActual === 'estudiantes'}" onclick="cambiarModulo('estudiantes')">
        <span class="modulo-icono">👥</span>
        <span class="modulo-texto"><strong>Listado de estudiantes</strong><small>Consulta asistencia y participación</small></span>
        <span class="modulo-cifra">${total}<small> registrados</small></span>
        <span class="modulo-abrir">Ver listado <b>→</b></span>
      </button>
      <button class="modulo-card modulo-cisco ${moduloActual === 'cisco' ? 'activo' : ''}" aria-pressed="${moduloActual === 'cisco'}" onclick="cambiarModulo('cisco')">
        <span class="modulo-icono">🎓</span>
        <span class="modulo-texto"><strong>Certificados Cisco</strong><small>Marca las entregas del aula virtual</small></span>
        <span class="modulo-cifra">${certificadosCompletos}<small> de ${total} completos</small></span>
        <span class="modulo-abrir">Revisar certificados <b>→</b></span>
      </button>
    </nav>

    <section class="stats module-panel ${moduloActual === 'resumen' ? 'visible' : ''}" data-module-panel="resumen">
      <div class="stat">
        <div class="stat-label">Total estudiantes</div>
        <div class="stat-value">${total}</div>
      </div>
      <div class="stat verde">
        <div class="stat-label">Aprueban (asist. + particip.)</div>
        <div class="stat-value" data-stat="aprobados">${aprobados} <small>de ${total}</small></div>
      </div>
      <div class="stat rojo">
        <div class="stat-label">En riesgo</div>
        <div class="stat-value" data-stat="riesgo">${riesgo}</div>
      </div>
      <div class="stat azul">
        <div class="stat-label">Con ≥ ${metaPart} pts participación</div>
        <div class="stat-value" data-stat="conpart">${conMinPart} <small>de ${total}</small></div>
      </div>
    </section>

    <section class="seguimiento module-panel ${moduloActual === 'seguimiento' ? 'visible' : ''}" data-module-panel="seguimiento">
      <div class="seguimiento-cabecera">
        <div>
          <h2>Seguimiento de asistencia</h2>
          <p>Estudiantes que asistieron a 0, 1 o 2 clases de ${sesiones.length}.</p>
        </div>
        <span class="seguimiento-total">${seguimientoVisible.length} de ${seguimientoAsistencia.length} estudiante${seguimientoAsistencia.length === 1 ? '' : 's'}</span>
      </div>
      <div class="cisco-herramientas seguimiento-herramientas">
        <label class="cisco-buscador" for="buscadorSeguimiento">
          <span aria-hidden="true">🔎</span>
          <input type="search" id="buscadorSeguimiento" placeholder="Buscar por nombre, apellido o correo..." value="${busquedaSeguimiento}" oninput="setBusquedaSeguimiento(this.value)">
        </label>
        <div class="cisco-filtros" aria-label="Filtrar estudiantes por asistencias">
          <button class="cisco-filtro seguimiento-filtro ${filtroSeguimiento === 'todos' ? 'activo' : ''}" onclick="setFiltroSeguimiento('todos')">Todos <span>${conteosSeguimiento.todos}</span></button>
          <button class="cisco-filtro seguimiento-filtro ${filtroSeguimiento === '0' ? 'activo' : ''}" onclick="setFiltroSeguimiento('0')">Sin asistencias <span>${conteosSeguimiento['0']}</span></button>
          <button class="cisco-filtro seguimiento-filtro ${filtroSeguimiento === '1' ? 'activo' : ''}" onclick="setFiltroSeguimiento('1')">1 asistencia <span>${conteosSeguimiento['1']}</span></button>
          <button class="cisco-filtro seguimiento-filtro ${filtroSeguimiento === '2' ? 'activo' : ''}" onclick="setFiltroSeguimiento('2')">2 asistencias <span>${conteosSeguimiento['2']}</span></button>
        </div>
        <div class="cisco-resultado">Mostrando <strong>${seguimientoVisible.length}</strong> de ${seguimientoAsistencia.length} estudiantes con pocas asistencias</div>
      </div>
      ${sesiones.length === 0 ? `
        <div class="seguimiento-vacio">Todavía no hay clases registradas para este grupo.</div>
      ` : seguimientoVisible.length === 0 ? `
        <div class="seguimiento-vacio">${seguimientoAsistencia.length === 0 ? 'No hay estudiantes con tan pocas asistencias.' : 'No hay estudiantes que coincidan con la búsqueda y el filtro.'}</div>
      ` : `
        <div class="seguimiento-tabla-contenedor">
          <table class="seguimiento-tabla">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Clases asistidas</th>
                <th>Faltas</th>
                <th>Justificadas</th>
                <th>Asistencia</th>
              </tr>
            </thead>
            <tbody>
              ${seguimientoVisible.map(item => `
                <tr>
                  <td class="seguimiento-estudiante">${item.estudiante.apellidos}, ${item.estudiante.nombre}<small>${item.estudiante.correo}</small></td>
                  <td><strong>${item.asistidas}</strong> de ${sesiones.length}</td>
                  <td>${item.faltas}</td>
                  <td>${item.justificadas}</td>
                  <td><span class="seguimiento-badge">${item.asistidas === 0 ? 'Sin asistencias' : `${item.asistidas} ${item.asistidas === 1 ? 'asistencia' : 'asistencias'}`}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </section>

    <section class="lista-estudiantes module-panel ${moduloActual === 'estudiantes' ? 'visible' : ''}" data-module-panel="estudiantes">
      <div class="modulo-cabecera">
        <div><h2>Listado de estudiantes</h2><p>${total} estudiante${total === 1 ? '' : 's'} en este grupo.</p></div>
      </div>
      <div class="tabla-scroll">
        <table class="tabla-modulo">
          <thead><tr><th>#</th><th>Estudiante</th><th>Correo</th><th>Asistencia</th><th>Participación</th><th>Estado</th></tr></thead>
          <tbody>
            ${estudiantes.length === 0 ? '<tr><td colspan="6" class="tabla-vacia">Aún no hay estudiantes registrados.</td></tr>' : estudiantes.map((e, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><strong>${e.apellidos}, ${e.nombre}</strong></td>
                <td>${e.correo}</td>
                <td>${e.presentes + e.tardes}/${totalSes}</td>
                <td>${e.puntaje_total || 0}/${maxPts} pts</td>
                <td><span class="badge ${e.aprueba ? 'ok' : 'mal'}">${e.aprueba ? 'APRUEBA' : 'EN RIESGO'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <section class="certificados module-panel ${moduloActual === 'cisco' ? 'visible' : ''}" data-module-panel="cisco">
      <div class="modulo-cabecera">
        <div><h2>Seguimiento de certificados Cisco</h2><p>Marca cada certificado cuando verifiques que fue entregado en el aula virtual. Cada estudiante puede tener de 0 a 3.</p></div>
        <span class="seguimiento-total">${certificadosCompletos} de ${total} completos</span>
      </div>
      <div class="cisco-herramientas">
        <label class="cisco-buscador" for="buscadorCisco">
          <span aria-hidden="true">🔎</span>
          <input type="search" id="buscadorCisco" placeholder="Buscar por nombre, apellido o correo..." value="${busquedaCisco}" oninput="setBusquedaCisco(this.value)">
        </label>
        <div class="cisco-filtros" aria-label="Filtrar estudiantes por certificados">
          <button class="cisco-filtro ${filtroCisco === 'todos' ? 'activo' : ''}" onclick="setFiltroCisco('todos')">Todos <span>${conteosCisco.todos}</span></button>
          <button class="cisco-filtro ${filtroCisco === 'pendientes' ? 'activo' : ''}" onclick="setFiltroCisco('pendientes')">Pendientes <span>${conteosCisco.pendientes}</span></button>
          <button class="cisco-filtro ${filtroCisco === 'completos' ? 'activo' : ''}" onclick="setFiltroCisco('completos')">Completos <span>${conteosCisco.completos}</span></button>
          ${[0, 1, 2, 3].map(cantidad => `
            <button class="cisco-filtro ${filtroCisco === String(cantidad) ? 'activo' : ''}" onclick="setFiltroCisco('${cantidad}')">${cantidad} de 3 <span>${conteosCisco[cantidad]}</span></button>
          `).join('')}
        </div>
        <div class="cisco-resultado">Mostrando <strong>${estudiantesCiscoVisibles.length}</strong> de ${total} estudiantes</div>
      </div>
      <div class="tabla-scroll">
        <table class="tabla-modulo tabla-cisco">
          <thead><tr><th>Estudiante</th><th>Certificado Cisco 1</th><th>Certificado Cisco 2</th><th>Certificado Cisco 3</th><th>Progreso</th></tr></thead>
          <tbody>
            ${estudiantesCiscoVisibles.length === 0 ? `<tr><td colspan="5" class="tabla-vacia">${total === 0 ? 'Aún no hay estudiantes registrados.' : 'No hay estudiantes que coincidan con la búsqueda y el filtro.'}</td></tr>` : estudiantesCiscoVisibles.map(item => {
              const { estudiante: e, entregados, cantidad } = item;
              return `
                <tr>
                  <td class="seguimiento-estudiante">${e.apellidos}, ${e.nombre}<small>${e.correo}</small></td>
                  ${[1, 2, 3].map(numero => `
                    <td><label class="certificado-check">
                      <input type="checkbox" ${entregados[numero] ? 'checked' : ''}
                        onchange="marcarCertificado(${e.id}, ${numero}, this.checked)">
                      <span>${entregados[numero] ? 'Entregado' : 'Pendiente'}</span>
                    </label></td>
                  `).join('')}
                  <td><span class="seguimiento-badge ${cantidad === 3 ? 'certificado-completo' : ''}">${cantidad}/3</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <div class="module-panel ${moduloActual === 'asistencia' ? 'visible' : ''}" data-module-panel="asistencia">
    <section class="sesion-selector">
      <label for="sesionSel">📅 Sesión que estás registrando:</label>
      <select id="sesionSel" onchange="cambiarSesion(this.value)">
        ${sesiones.map(s => `
          <option value="${s.id}" ${s.id === sesion.id ? 'selected' : ''}>
            Sesión ${s.numero_sesion}
          </option>`).join('')}
      </select>
      <span style="color:#64748b; font-size:13px">
        ${totalParticiparonEstaSesion} estudiante${totalParticiparonEstaSesion === 1 ? '' : 's'} participaron en esta sesión
      </span>
    </section>

    <section class="filtros">
      <div class="filtros-botones">
        <button class="filtro-btn ${filtroActivo==='todos'?'activo':''}"       onclick="setFiltro('todos')">Todos <span class="filtro-count">${total}</span></button>
        <button class="filtro-btn ${filtroActivo==='presente'?'activo':''}"     onclick="setFiltro('presente')">🟢 Presentes <span class="filtro-count">${presentesSesion}</span></button>
        <button class="filtro-btn ${filtroActivo==='tarde'?'activo':''}"         onclick="setFiltro('tarde')">🟠 Tarde <span class="filtro-count">${tardesSesion}</span></button>
        <button class="filtro-btn ${filtroActivo==='justificado'?'activo':''}"   onclick="setFiltro('justificado')">🔵 Justificados <span class="filtro-count">${justSesion}</span></button>
        <button class="filtro-btn ${filtroActivo==='ausente'?'activo':''}"       onclick="setFiltro('ausente')">🔴 Ausentes <span class="filtro-count">${ausentesSesion}</span></button>
        <button class="filtro-btn ${filtroActivo==='participaron'?'activo':''}"  onclick="setFiltro('participaron')">🎤 Participaron <span class="filtro-count">${totalParticiparonEstaSesion}</span></button>
        <button class="filtro-btn ${filtroActivo==='noparticiparon'?'activo':''}" onclick="setFiltro('noparticiparon')">🚫 Sin participación <span class="filtro-count">${noPartSesion}</span></button>
        <button class="filtro-btn ${filtroActivo==='aprueba'?'activo':''}"       onclick="setFiltro('aprueba')">✅ Aprueban <span class="filtro-count">${aprobados}</span></button>
        <button class="filtro-btn ${filtroActivo==='riesgo'?'activo':''}"         onclick="setFiltro('riesgo')">⚠️ En riesgo <span class="filtro-count">${riesgo}</span></button>
      </div>
      <div class="filtros-busqueda">
        <input type="text" id="buscador" placeholder="🔎 Buscar por nombre o correo..."
          value="${busqueda}" oninput="setBusqueda(this.value)">
      </div>
    </section>

    <section class="leyenda">
      <div class="leyenda-item"><span class="leyenda-color verde"></span> <b>P</b> = Presente</div>
      <div class="leyenda-item"><span class="leyenda-color ambar"></span> <b>T</b> = Tarde (sí cuenta)</div>
      <div class="leyenda-item"><span class="leyenda-color azul"></span>  <b>J</b> = Justificado</div>
      <div class="leyenda-item"><span class="leyenda-color rojo"></span>  <b>A</b> = Ausente</div>
      <div class="leyenda-item" style="margin-left:auto;color:#475569">
        <b>Metas:</b> Asistencia ≥ ${metaAsist}/${totalSes} · Participación ≥ ${metaPart}/${maxPts} pts (cada sesión vale ${PTS_POR_SESION}). La asistencia es solo registro; participación aporta el 40% de la nota general. El avance considera todo el curso y llega a 100% al alcanzar la meta de participación.
      </div>
    </section>

    <section class="lista">
      <div class="lista-header">
        <div>#</div>
        <div>Estudiante</div>
        <div>Asistencia — Sesión ${sesion.numero_sesion}</div>
        <div>Pts. sesión (0-${PTS_POR_SESION})</div>
        <div style="text-align:center">Asistencias</div>
        <div style="text-align:center">Pts. acumulados</div>
        <div style="text-align:center">Estado</div>
        <div style="text-align:center">Participación</div>
      </div>
      ${visibles.length === 0 ? `
        <div class="sin-resultados">
          <div style="font-size:32px;margin-bottom:8px">🔍</div>
          <div>No hay estudiantes que coincidan con el filtro o la búsqueda.</div>
        </div>
      ` : visibles.map((e, i) => {
        const est = asisMap[e.id] || 'ausente';
        const puntosSesion = partMap[e.id] ?? '';
        const { presentes, tardes } = contarAsistencias(e.id);
        const validas = presentes + tardes;
        const ptsTot = e.puntaje_total || 0;
        const avance = calcularAvanceParticipacion(e.id);

        const cumpleAsist = validas >= metaAsist;
        const cumplePart = ptsTot >= metaPart;
        const aprueba = cumpleAsist && cumplePart;

        const puntosNum = Number(puntosSesion) || 0;
        let claseInput = '';
        if (puntosNum >= PTS_POR_SESION) claseInput = 'lleno';
        else if (puntosNum > 0) claseInput = 'medio';

        let claseBadgePart = 'mal';
        if (cumplePart) claseBadgePart = 'ok';
        else if (ptsTot > 0) claseBadgePart = 'medio';

        return `
          <div class="fila" data-est="${e.id}">
            <div class="num">${i + 1}</div>
            <div class="nombre">
              ${e.apellidos}, ${e.nombre}
              <small>${e.correo}</small>
            </div>
            <div class="asistencia">
              <button class="asist-btn p ${est==='presente'?'activo':''}"     onclick="marcarAsis(${e.id}, ${sesion.id}, 'presente', this)">P</button>
              <button class="asist-btn t ${est==='tarde'?'activo':''}"         onclick="marcarAsis(${e.id}, ${sesion.id}, 'tarde', this)">T</button>
              <button class="asist-btn j ${est==='justificado'?'activo':''}"   onclick="marcarAsis(${e.id}, ${sesion.id}, 'justificado', this)">J</button>
              <button class="asist-btn a ${est==='ausente'?'activo':''}"       onclick="marcarAsis(${e.id}, ${sesion.id}, 'ausente', this)">A</button>
            </div>
            <div class="part-box">
              <input type="number" min="0" max="${PTS_POR_SESION}" step="1" value="${puntosSesion}" placeholder="0"
                class="${claseInput}"
                onchange="marcarPart(${e.id}, ${sesion.id}, this)">
              <span>/${PTS_POR_SESION}</span>
            </div>
            <div class="mini-badge ${cumpleAsist ? 'ok' : 'mal'}" data-asist-badge
                 title="Asistió ${validas} de ${totalSes} sesiones (meta: ${metaAsist})">
              ${validas}/${totalSes}
            </div>
            <div class="mini-badge ${claseBadgePart}" data-part-badge
                 title="Puntaje acumulado: ${ptsTot} de ${maxPts} pts (meta: ${metaPart})">
              ${ptsTot}/${maxPts}
            </div>
            <div class="estado-final" data-estado>
              <span class="badge ${aprueba ? 'ok' : 'mal'}">
                ${aprueba ? 'APRUEBA' : (!cumpleAsist && !cumplePart ? 'EN RIESGO' : (cumpleAsist ? 'FALTA PARTICIP.' : 'FALTA ASIST.'))}
              </span>
            </div>
            <div class="avance-estudiante ${avance.porcentaje === 100 ? 'completo' : ''}"
                 data-avance-badge
                 title="Participación en todo el curso: ${avance.porcentaje}% del componente (meta: ${metaPart}/${maxPts} pts)">
              <strong>${avance.porcentaje}%</strong>
            </div>
          </div>
        `;
      }).join('')}
    </section>
    </div>
  `;
}

function cambiarModulo(modulo) {
  moduloActual = modulo;
  render();
}

function setFiltroCisco(filtro) {
  filtroCisco = filtro;
  render();
  const input = document.getElementById('buscadorCisco');
  if (input && busquedaCisco) {
    input.focus();
    input.setSelectionRange(busquedaCisco.length, busquedaCisco.length);
  }
}

function setBusquedaCisco(valor) {
  busquedaCisco = valor;
  const input = document.getElementById('buscadorCisco');
  const inicio = input ? input.selectionStart : null;
  const fin = input ? input.selectionEnd : null;
  render();
  const nuevoInput = document.getElementById('buscadorCisco');
  if (nuevoInput) {
    nuevoInput.focus();
    if (inicio !== null && fin !== null) nuevoInput.setSelectionRange(inicio, fin);
  }
}

function setFiltroSeguimiento(filtro) {
  filtroSeguimiento = filtro;
  render();
  const input = document.getElementById('buscadorSeguimiento');
  if (input && busquedaSeguimiento) {
    input.focus();
    input.setSelectionRange(busquedaSeguimiento.length, busquedaSeguimiento.length);
  }
}

function setBusquedaSeguimiento(valor) {
  busquedaSeguimiento = valor;
  const input = document.getElementById('buscadorSeguimiento');
  const inicio = input ? input.selectionStart : null;
  const fin = input ? input.selectionEnd : null;
  render();
  const nuevoInput = document.getElementById('buscadorSeguimiento');
  if (nuevoInput) {
    nuevoInput.focus();
    if (inicio !== null && fin !== null) nuevoInput.setSelectionRange(inicio, fin);
  }
}

async function marcarCertificado(estudianteId, numero, subido) {
  try {
    const response = await fetch('/api/certificados-cisco', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estudiante_id: estudianteId,
        certificado_numero: numero,
        subido
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo guardar el certificado');

    const certificados = datosActuales.certificadosCisco || (datosActuales.certificadosCisco = []);
    const existente = certificados.find(certificado =>
      certificado.estudiante_id === estudianteId &&
      Number(certificado.certificado_numero) === numero
    );
    if (existente) existente.subido = subido ? 1 : 0;
    else certificados.push({
      estudiante_id: estudianteId,
      certificado_numero: numero,
      subido: subido ? 1 : 0
    });
    render();
    toast('✓ Estado del certificado guardado', 'success');
  } catch (err) {
    toast(`✗ ${err.message}`, 'error');
    render();
  }
}

function setFiltro(f) {
  filtroActivo = f;
  render();
}

function setBusqueda(v) {
  busqueda = v;
  const input = document.getElementById('buscador');
  const pos = input ? input.selectionStart : null;
  render();
  const nuevo = document.getElementById('buscador');
  if (nuevo) {
    nuevo.focus();
    if (pos !== null) nuevo.setSelectionRange(pos, pos);
  }
}

function cambiarSesion(id) {
  sesionSeleccionada = parseInt(id, 10);
  render();
}

async function marcarAsis(estudiante_id, sesion_id, estado, btn) {
  const fila = btn.closest('.fila');
  fila.querySelectorAll('.asist-btn').forEach(b => b.classList.remove('activo'));
  btn.classList.add('activo');

  const idx = datosActuales.asistencias.findIndex(a => a.estudiante_id === estudiante_id && a.sesion_id === sesion_id);
  if (idx >= 0) datosActuales.asistencias[idx].estado = estado;
  else datosActuales.asistencias.push({ estudiante_id, sesion_id, estado });

  recalcularEstudiante(estudiante_id);
  recalcularStatsGlobales();
  render();

  try {
    await fetch('/api/asistencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estudiante_id, sesion_id, estado })
    });
    toast('✓ Asistencia guardada', 'success');
  } catch (err) {
    toast('✗ Error al guardar', 'error');
  }
}

async function marcarPart(estudiante_id, sesion_id, input) {
  const valor = input.value === '' ? 0 : Math.max(0, Math.min(PTS_POR_SESION, parseInt(input.value, 10) || 0));
  input.value = valor;

  input.classList.remove('lleno', 'medio');
  if (valor >= PTS_POR_SESION) input.classList.add('lleno');
  else if (valor > 0) input.classList.add('medio');

  const idx = datosActuales.participaciones.findIndex(p => p.estudiante_id === estudiante_id && p.sesion_id === sesion_id);
  if (idx >= 0) datosActuales.participaciones[idx].puntaje = valor;
  else datosActuales.participaciones.push({ estudiante_id, sesion_id, puntaje: valor });

  recalcularEstudiante(estudiante_id);
  recalcularStatsGlobales();

  try {
    await fetch('/api/participaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estudiante_id, sesion_id, puntaje: valor })
    });
    toast('✓ Participación guardada', 'success');
  } catch (err) {
    toast('✗ Error al guardar', 'error');
  }
}

function recalcularEstudiante(estudiante_id) {
  const e = datosActuales.estudiantes.find(x => x.id === estudiante_id);
  if (!e) return;

  const totalSes = totalSesionesSeguras();
  const metaAsist = Math.ceil(totalSes * META_ASISTENCIA_PCT / 100);
  const maxPts = totalSes * PTS_POR_SESION;
  const metaPart = Math.ceil(maxPts * META_PARTICIPACION_PCT / 100);

  const { presentes, tardes } = contarAsistencias(estudiante_id);
  const validas = presentes + tardes;

  const parts = datosActuales.participaciones.filter(p => p.estudiante_id === estudiante_id);
  const totalPuntos = parts.reduce((s, p) => s + (parseInt(p.puntaje, 10) || 0), 0);
  e.puntaje_total = totalPuntos;

  const cumpleAsist = validas >= metaAsist;
  const cumplePart = totalPuntos >= metaPart;
  const aprueba = cumpleAsist && cumplePart;
  e.aprueba = aprueba;

  const fila = document.querySelector(`.fila[data-est="${estudiante_id}"]`);
  if (fila) {
    const bAsist = fila.querySelector('[data-asist-badge]');
    if (bAsist) {
      bAsist.className = 'mini-badge ' + (cumpleAsist ? 'ok' : 'mal');
      bAsist.textContent = `${validas}/${totalSes}`;
    }
    const bPart = fila.querySelector('[data-part-badge]');
    if (bPart) {
      let clase = 'mal';
      if (cumplePart) clase = 'ok';
      else if (totalPuntos > 0) clase = 'medio';
      bPart.className = 'mini-badge ' + clase;
      bPart.textContent = `${totalPuntos}/${maxPts}`;
    }
    const bAvance = fila.querySelector('[data-avance-badge]');
    if (bAvance) {
      const avance = calcularAvanceParticipacion(estudiante_id);
      bAvance.className = `avance-estudiante ${avance.porcentaje === 100 ? 'completo' : ''}`;
      bAvance.innerHTML = `<strong>${avance.porcentaje}%</strong>`;
      bAvance.title = `Participación en todo el curso: ${avance.porcentaje}% del componente`;
    }
    const bEstado = fila.querySelector('[data-estado] .badge');
    if (bEstado) {
      bEstado.className = 'badge ' + (aprueba ? 'ok' : 'mal');
      if (aprueba) bEstado.textContent = 'APRUEBA';
      else if (!cumpleAsist && cumplePart) bEstado.textContent = 'FALTA ASIST.';
      else if (cumpleAsist && !cumplePart) bEstado.textContent = 'FALTA PARTICIP.';
      else bEstado.textContent = 'EN RIESGO';
    }
  }
}

function recalcularStatsGlobales() {
  const totalSes = totalSesionesSeguras();
  const maxPts = totalSes * PTS_POR_SESION;
  const metaPart = Math.ceil(maxPts * META_PARTICIPACION_PCT / 100);

  const total = datosActuales.estudiantes.length;
  const aprobados = datosActuales.estudiantes.filter(x => x.aprueba).length;
  const riesgo = total - aprobados;
  const conMinPart = datosActuales.estudiantes.filter(x => (x.puntaje_total || 0) >= metaPart).length;

  const elAp = document.querySelector('[data-stat="aprobados"]');
  const elRi = document.querySelector('[data-stat="riesgo"]');
  const elCp = document.querySelector('[data-stat="conpart"]');
  if (elAp) elAp.innerHTML = `${aprobados} <small>de ${total}</small>`;
  if (elRi) elRi.textContent = riesgo;
  if (elCp) elCp.innerHTML = `${conMinPart} <small>de ${total}</small>`;
}

let toastTimer = null;
function toast(msg, tipo = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = 'toast ' + tipo, 1500);
}

/* ==================== MODAL AGREGAR ESTUDIANTE ==================== */

function abrirModalEstudiante() {
  document.getElementById('modal-estudiante').classList.add('show');
  document.getElementById('form-estudiante').reset();
  document.getElementById('form-error').textContent = '';
  if (grupoActual) {
    document.getElementById('f-grupo').value = grupoActual;
  }
  setTimeout(() => document.getElementById('f-nombre').focus(), 100);
}

function cerrarModalEstudiante() {
  document.getElementById('modal-estudiante').classList.remove('show');
}

async function guardarEstudiante(ev) {
  ev.preventDefault();
  const errEl = document.getElementById('form-error');
  errEl.textContent = '';

  const datos = {
    nombre: document.getElementById('f-nombre').value.trim(),
    apellidos: document.getElementById('f-apellidos').value.trim(),
    correo: document.getElementById('f-correo').value.trim(),
    grupo_id: parseInt(document.getElementById('f-grupo').value, 10)
  };

  try {
    const res = await fetch('/api/estudiantes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const json = await res.json();

    if (!res.ok) {
      errEl.textContent = json.error || 'Error al guardar';
      return;
    }

    toast('✓ Estudiante agregado', 'success');
    cerrarModalEstudiante();

    if (grupoActual === datos.grupo_id) {
      await recargar();
      render();
    } else {
      const btn = document.querySelector(`.grupo-btn[data-grupo="${datos.grupo_id}"]`);
      if (btn) cambiarGrupo(datos.grupo_id, btn);
    }
  } catch (err) {
    errEl.textContent = 'Error de conexión con el servidor';
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarModalEstudiante();
});