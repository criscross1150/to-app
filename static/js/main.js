// TO APP - JavaScript principal con Supabase

// ===== REGISTRO SERVICE WORKER (PWA) =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/static/sw.js');
            console.log('Service Worker registrado:', registration.scope);
        } catch (error) {
            console.log('Service Worker no registrado:', error);
        }
    });
}

// ===== CONFIGURACIÓN SUPABASE =====
const SUPABASE_URL = 'https://ysptvhsvvlftfpoghobi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzcHR2aHN2dmxmdGZwb2dob2JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjY2MzIsImV4cCI6MjA3OTk0MjYzMn0.lfOm5mR3n1oSDyy51qLIh0KLDpqiBSa_9i-tgr3BXQk';

let supabase;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('TO APP iniciada correctamente');
    
    // Inicializar Supabase
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase conectado');
    
    // Elementos del DOM
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const cameraInput = document.getElementById('cameraInput');
    const btnCamera = document.getElementById('btnCamera');
    const btnGallery = document.getElementById('btnGallery');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const btnCambiar = document.getElementById('btnCambiar');
    const btnProcesar = document.getElementById('btnProcesar');
    const loading = document.getElementById('loading');
    
    let selectedFile = null;
    let pacientesData = [];
    
    // ===== FUNCIONES SUPABASE =====
    
    async function guardarPacienteDB(paciente) {
        try {
            const { data, error } = await supabase
                .from('pacientes')
                .upsert({
                    id: paciente.id,
                    fecha: getFechaISO(),
                    habitacion: paciente.habitacion,
                    nombre: paciente.nombre,
                    edad: paciente.edad,
                    diagnostico: paciente.diagnostico,
                    clasificacion: paciente.clasificacion,
                    indicaciones: paciente.indicaciones,
                    sesiones_realizadas: paciente.sesionesRealizadas,
                    sesiones_rce: paciente.sesionesRCE,
                    horas_sesion: paciente.horasSesion
                }, { onConflict: 'id' })
                .select();
            
            if (error) throw error;
            console.log('Paciente guardado en Supabase:', paciente.nombre);
            return data;
        } catch (e) {
            console.error('Error guardando en Supabase:', e);
            guardarLocalStorage();
        }
    }
    
    async function cargarPacientesDB() {
        try {
            const fechaHoy = getFechaISO();
            const { data, error } = await supabase
                .from('pacientes')
                .select('*')
                .eq('fecha', fechaHoy)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                console.log('Pacientes cargados de Supabase:', data.length);
                return data.map(p => ({
                    id: p.id,
                    habitacion: p.habitacion,
                    nombre: p.nombre,
                    edad: p.edad,
                    diagnostico: p.diagnostico,
                    clasificacion: p.clasificacion,
                    indicaciones: p.indicaciones,
                    sesionesRealizadas: p.sesiones_realizadas || [false],
                    sesionesRCE: p.sesiones_rce || [false],
                    horasSesion: p.horas_sesion || [null]
                }));
            }
            return null;
        } catch (e) {
            console.error('Error cargando de Supabase:', e);
            return cargarLocalStorage();
        }
    }
    
    async function eliminarPacienteDB(pacienteId) {
        try {
            const { error } = await supabase
                .from('pacientes')
                .delete()
                .eq('id', pacienteId);
            
            if (error) throw error;
            console.log('Paciente eliminado de Supabase');
        } catch (e) {
            console.error('Error eliminando de Supabase:', e);
        }
    }
    
    async function limpiarPacientesDB() {
        try {
            const fechaHoy = getFechaISO();
            const { error } = await supabase
                .from('pacientes')
                .delete()
                .eq('fecha', fechaHoy);
            
            if (error) throw error;
            console.log('Pacientes del día eliminados de Supabase');
        } catch (e) {
            console.error('Error limpiando Supabase:', e);
        }
    }
    
    // ===== FALLBACK LOCALSTORAGE =====
    const STORAGE_KEY = 'to_app_pacientes';
    
    function guardarLocalStorage() {
        const dataToSave = {
            pacientes: pacientesData,
            fecha: getFechaActual(),
            timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
    
    function cargarLocalStorage() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                if (data.fecha === getFechaActual()) {
                    return data.pacientes;
                }
            }
        } catch (e) {
            console.error('Error cargando localStorage:', e);
        }
        return null;
    }
    
    // ===== FUNCIONES AUXILIARES =====
    
    function getFechaISO() {
        const hoy = new Date();
        return hoy.toISOString().split('T')[0];
    }
    
    function getFechaActual() {
        const hoy = new Date();
        return `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`;
    }
    
    function getHoraActual() {
        const ahora = new Date();
        return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    }
    
    function generarUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // ===== LIMPIAR DATOS =====
    
    async function limpiarDatosGuardados() {
        if (confirm('¿Está seguro que desea borrar todos los pacientes?\n\nEsta acción no se puede deshacer.')) {
            await limpiarPacientesDB();
            localStorage.removeItem(STORAGE_KEY);
            pacientesData = [];
            document.getElementById('upcList').innerHTML = '';
            document.getElementById('mqList').innerHTML = '';
            document.getElementById('patientsSection').style.display = 'none';
            uploadArea.style.display = 'block';
            actualizarEstadisticas();
            console.log('Datos borrados');
        }
    }
    
    window.limpiarDatos = limpiarDatosGuardados;
    
    // ===== CARGAR DATOS AL INICIO =====
    
    const datosGuardados = await cargarPacientesDB();
    if (datosGuardados && datosGuardados.length > 0) {
        mostrarPacientesGuardados(datosGuardados);
    }
    
    // ===== EVENT LISTENERS =====
    
    // Botón de cámara - abre cámara directamente
    btnCamera.addEventListener('click', (e) => {
        e.stopPropagation();
        cameraInput.click();
    });
    
    // Botón de galería - abre selector de archivos
    btnGallery.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    
    // Input de cámara
    cameraInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type.startsWith('image/')) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
    
    function handleFile(file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            uploadArea.style.display = 'none';
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
    
    btnCambiar.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        cameraInput.value = '';
        previewContainer.style.display = 'none';
        uploadArea.style.display = 'block';
    });
    
    btnProcesar.addEventListener('click', async () => {
        if (!selectedFile) return;
        
        previewContainer.style.display = 'none';
        loading.style.display = 'block';
        
        const formData = new FormData();
        formData.append('image', selectedFile);
        
        try {
            const response = await fetch('/procesar', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.success) {
                await mostrarPacientes(data.pacientes);
            } else {
                alert('Error: ' + data.error);
                loading.style.display = 'none';
                previewContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar la imagen');
            loading.style.display = 'none';
            previewContainer.style.display = 'block';
        }
    });
    
    // ===== ICONOS DE DIAGNÓSTICO =====
    
    function getIconoDiagnostico(diagnostico) {
        const iconos = {
            'Neumonía': '🫁', 'Cir abdominal laparoscópica': '🔬', 'Cir abdominal laparotomía': '🔪',
            'Cir tórax': '🫀', 'ITU': '💧', 'Trauma raquimedular': '🦴', 'Trombosis': '🩸',
            'Sepsis': '🦠', 'ACV': '🧠', 'Neuroquirúrgico': '🧠', 'Hipoxia perinatal': '👶',
            'SBO ped': '👶', 'ATL': '🦵', 'Cardiológico': '❤️', 'Cáncer': '🎗️',
            'Prótesis de cadera': '🦿', 'Prótesis de rodilla': '🦿', 'Otro': '📋',
            'Plastia de cadera': '🦴', 'Plastia de rodilla': '🦴', 'TEC': '🤕', 'PTM': '🦴',
            'Paratiroidectomía': '🦋', 'Cir plástica': '✨', 'EPOC/Resp crónico': '🫁',
            'RNPT': '👶', 'CX Columna': '🦴', 'Síndrome convulsivo': '⚡', 'Falla renal': '🫘',
            'Traumatológico': '🩹', 'Psiquiatría': '🧩'
        };
        return iconos[diagnostico] || '🏥';
    }
    
    // ===== ESTADO DEL PACIENTE (SEMÁFORO) =====
    
    function obtenerEstadoPaciente(paciente) {
        if (paciente.indicaciones === 0) return 'complete';
        
        const totalCheckboxes = paciente.indicaciones * 2;
        const sesionesChecked = paciente.sesionesRealizadas.filter(s => s).length;
        const rceChecked = paciente.sesionesRCE.filter(r => r).length;
        const totalChecked = sesionesChecked + rceChecked;
        
        if (totalChecked === 0) return 'none';
        if (totalChecked < totalCheckboxes) return 'partial';
        return 'complete';
    }
    
    function actualizarEstadoPaciente(pacienteId) {
        const paciente = pacientesData.find(p => p.id === pacienteId);
        if (paciente) {
            const statusDot = document.getElementById(`status-${pacienteId}`);
            if (statusDot) statusDot.className = `status-dot ${obtenerEstadoPaciente(paciente)}`;
        }
    }
    
    function actualizarEstadisticas() {
        const pacientesUPC = pacientesData.filter(p => p.clasificacion === 'UPC');
        const pacientesMQ = pacientesData.filter(p => p.clasificacion === 'MQ');
        const totalAtenciones = pacientesData.reduce((sum, p) => sum + p.indicaciones, 0);
        const sesionesRealizadas = pacientesData.reduce((sum, p) => sum + p.sesionesRealizadas.filter(s => s).length, 0);
        
        document.getElementById('statSummary').textContent = 
            `${pacientesData.length} pacientes | ${totalAtenciones} atenciones | UPC: ${pacientesUPC.length} · MQ: ${pacientesMQ.length}`;
        
        const porcentaje = totalAtenciones > 0 ? Math.round((sesionesRealizadas / totalAtenciones) * 100) : 0;
        document.getElementById('progressFill').style.width = `${porcentaje}%`;
        document.getElementById('progressText').textContent = `${sesionesRealizadas}/${totalAtenciones} (${porcentaje}%)`;
    }
    
    // ===== MOSTRAR PACIENTES =====
    
    async function mostrarPacientes(pacientes) {
        loading.style.display = 'none';
        
        pacientesData = pacientes.map((p) => ({
            ...p,
            id: generarUUID(),
            sesionesRealizadas: new Array(p.indicaciones).fill(false),
            sesionesRCE: new Array(p.indicaciones).fill(false),
            horasSesion: new Array(p.indicaciones).fill(null)
        }));
        
        // Guardar todos en Supabase
        for (const paciente of pacientesData) {
            await guardarPacienteDB(paciente);
        }
        
        renderizarPacientes();
    }
    
    function mostrarPacientesGuardados(pacientes) {
        pacientesData = pacientes;
        uploadArea.style.display = 'none';
        renderizarPacientes();
    }
    
    function renderizarPacientes() {
        const patientsSection = document.getElementById('patientsSection');
        const upcList = document.getElementById('upcList');
        const mqList = document.getElementById('mqList');
        
        upcList.innerHTML = '';
        mqList.innerHTML = '';
        
        const pacientesUPC = pacientesData.filter(p => p.clasificacion === 'UPC');
        const pacientesMQ = pacientesData.filter(p => p.clasificacion === 'MQ');
        
        actualizarEstadisticas();
        
        pacientesUPC.forEach(p => upcList.appendChild(crearTarjetaPaciente(p, 'upc')));
        pacientesMQ.forEach(p => mqList.appendChild(crearTarjetaPaciente(p, 'mq')));
        
        patientsSection.style.display = 'block';
        
        // Aplicar vista guardada (sin re-renderizar)
        const savedView = localStorage.getItem('to_app_view') || 'compact';
        const container = document.querySelector('.patients-container');
        container.classList.remove('compact-view', 'detailed-view');
        container.classList.add(`${savedView}-view`);
        
        // Actualizar botones
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === savedView);
        });
    }
    
    // ===== VISTAS =====
    let vistaActual = 'compact';
    
    function aplicarVista(vista) {
        vistaActual = vista;
        const container = document.querySelector('.patients-container');
        container.classList.remove('compact-view', 'detailed-view');
        container.classList.add(`${vista}-view`);
        
        // Actualizar botones
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === vista);
        });
        
        // Guardar preferencia
        localStorage.setItem('to_app_view', vista);
    }
    
    // Event listeners para toggle de vista
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => aplicarVista(btn.dataset.view));
    });
    
    // ===== CREAR TARJETA DE PACIENTE =====
    
    function crearTarjetaPaciente(paciente, tipo) {
        const card = document.createElement('div');
        card.className = `patient-card ${tipo}`;
        card.id = `patient-${paciente.id}`;
        
        // Generar checkboxes inline para vista compacta
        let inlineChecksHTML = '';
        for (let i = 0; i < paciente.indicaciones; i++) {
            const checkedSesion = paciente.sesionesRealizadas[i] ? 'checked' : '';
            const checkedRCE = paciente.sesionesRCE[i] ? 'checked' : '';
            inlineChecksHTML += `
                <label class="mini-check sesion ${checkedSesion}" onclick="event.stopPropagation()">
                    <input type="checkbox" ${checkedSesion} onchange="window.marcarSesion('${paciente.id}', ${i}, this.checked); this.parentElement.classList.toggle('checked', this.checked)">
                    S${i+1}
                </label>
                <label class="mini-check rce ${checkedRCE ? 'checked' : ''}" onclick="event.stopPropagation()">
                    <input type="checkbox" ${checkedRCE} onchange="window.marcarRCE('${paciente.id}', ${i}, this.checked); this.parentElement.classList.toggle('checked', this.checked)">
                    R${i+1}
                </label>
            `;
        }
        
        // Generar sesiones para vista detallada
        let sesionesHTML = '';
        for (let i = 0; i < paciente.indicaciones; i++) {
            const checkedSesion = paciente.sesionesRealizadas[i] ? 'checked' : '';
            const checkedRCE = paciente.sesionesRCE[i] ? 'checked' : '';
            const horaSesion = paciente.horasSesion[i] || '';
            const horaDisplay = horaSesion ? 'inline' : 'none';
            sesionesHTML += `
                <div class="s-item" id="session-row-${paciente.id}-${i}">
                    <span class="s-num">${i + 1}</span>
                    <label class="s-cb"><input type="checkbox" ${checkedSesion} onchange="window.marcarSesion('${paciente.id}', ${i}, this.checked)"><span>Sesión</span></label>
                    <span class="s-hora" id="hora-${paciente.id}-${i}" style="display: ${horaDisplay}">${horaSesion}</span>
                    <label class="r-cb"><input type="checkbox" ${checkedRCE} onchange="window.marcarRCE('${paciente.id}', ${i}, this.checked)"><span>RCE</span></label>
                    <span class="s-del" onclick="event.stopPropagation(); window.eliminarSesion('${paciente.id}', ${i})">✕</span>
                </div>
            `;
        }
        
        const mostrarBtnAgregar = paciente.indicaciones < 2;
        const diagCorto = paciente.diagnostico.length > 12 ? paciente.diagnostico.substring(0, 12) + '...' : paciente.diagnostico;
        
        card.innerHTML = `
            <div class="row-main" onclick="window.toggleExpand('${paciente.id}')">
                <div class="col-room ${tipo}">${paciente.habitacion}</div>
                <div class="col-data">
                    <span class="d-name">${paciente.nombre}</span>
                    <span class="d-sub">${paciente.edad}a · ${getIconoDiagnostico(paciente.diagnostico)} ${diagCorto}</span>
                </div>
                <div class="inline-checks" onclick="event.stopPropagation()">
                    ${inlineChecksHTML}
                </div>
                <div class="quick-actions">
                    <button class="quick-btn" onclick="event.stopPropagation(); window.editarPaciente('${paciente.id}')" title="Editar">✏️</button>
                </div>
                <div class="col-status">
                    <span class="status-dot ${obtenerEstadoPaciente(paciente)}" id="status-${paciente.id}"></span>
                </div>
            </div>
            <div class="row-expand" id="expand-${paciente.id}">
                <div class="expand-sessions" id="sessions-${paciente.id}">
                    ${sesionesHTML}
                </div>
                <div class="expand-actions">
                    ${mostrarBtnAgregar ? `<button class="btn-mini add" id="btn-add-${paciente.id}" onclick="event.stopPropagation(); window.agregarSesion('${paciente.id}')">+ Sesión</button>` : ''}
                    <button class="btn-mini edit" onclick="event.stopPropagation(); window.editarPaciente('${paciente.id}')">✏️ Editar</button>
                    <button class="btn-mini del" onclick="event.stopPropagation(); window.eliminarPaciente('${paciente.id}')">🗑️ Eliminar</button>
                </div>
            </div>
        `;
        
        return card;
    }
    
    // ===== FUNCIONES GLOBALES =====
    
    window.toggleExpand = function(pacienteId) {
        const expandRow = document.getElementById(`expand-${pacienteId}`);
        const card = document.getElementById(`patient-${pacienteId}`);
        
        if (expandRow.classList.contains('open')) {
            expandRow.classList.remove('open');
            card.classList.remove('expanded');
        } else {
            document.querySelectorAll('.row-expand.open').forEach(el => el.classList.remove('open'));
            document.querySelectorAll('.patient-card.expanded').forEach(el => el.classList.remove('expanded'));
            expandRow.classList.add('open');
            card.classList.add('expanded');
        }
    };
    
    window.marcarSesion = async function(pacienteId, sesionIndex, checked) {
        const paciente = pacientesData.find(p => p.id === pacienteId);
        if (paciente) {
            paciente.sesionesRealizadas[sesionIndex] = checked;
            const horaSpan = document.getElementById(`hora-${pacienteId}-${sesionIndex}`);
            
            if (checked) {
                paciente.horasSesion[sesionIndex] = getHoraActual();
                if (horaSpan) {
                    horaSpan.textContent = paciente.horasSesion[sesionIndex];
                    horaSpan.style.display = 'inline';
                }
            } else {
                paciente.horasSesion[sesionIndex] = null;
                if (horaSpan) {
                    horaSpan.textContent = '';
                    horaSpan.style.display = 'none';
                }
            }
            
            actualizarEstadoPaciente(pacienteId);
            actualizarEstadisticas();
            await guardarPacienteDB(paciente);
        }
    };
    
    window.marcarRCE = async function(pacienteId, sesionIndex, checked) {
        const paciente = pacientesData.find(p => p.id === pacienteId);
        if (paciente) {
            paciente.sesionesRCE[sesionIndex] = checked;
            actualizarEstadoPaciente(pacienteId);
            await guardarPacienteDB(paciente);
        }
    };
    
    window.agregarSesion = async function(pacienteId) {
        const paciente = pacientesData.find(p => p.id === pacienteId);
        if (paciente && paciente.indicaciones < 2) {
            paciente.indicaciones++;
            paciente.sesionesRealizadas.push(false);
            paciente.sesionesRCE.push(false);
            paciente.horasSesion.push(null);
            
            const sessionsList = document.getElementById(`sessions-${pacienteId}`);
            const newIndex = paciente.indicaciones - 1;
            const newSession = document.createElement('div');
            newSession.className = 's-item';
            newSession.id = `session-row-${pacienteId}-${newIndex}`;
            newSession.innerHTML = `
                <span class="s-num">${paciente.indicaciones}</span>
                <label class="s-cb"><input type="checkbox" onchange="window.marcarSesion('${pacienteId}', ${newIndex}, this.checked)"><span>Sesión</span></label>
                <span class="s-hora" id="hora-${pacienteId}-${newIndex}" style="display: none"></span>
                <label class="r-cb"><input type="checkbox" onchange="window.marcarRCE('${pacienteId}', ${newIndex}, this.checked)"><span>RCE</span></label>
                <span class="s-del" onclick="event.stopPropagation(); window.eliminarSesion('${pacienteId}', ${newIndex})">✕</span>
            `;
            sessionsList.appendChild(newSession);
            
            if (paciente.indicaciones >= 2) {
                const btnAdd = document.getElementById(`btn-add-${pacienteId}`);
                if (btnAdd) btnAdd.style.display = 'none';
            }
            
            actualizarEstadoPaciente(pacienteId);
            actualizarEstadisticas();
            await guardarPacienteDB(paciente);
        }
    };
    
    window.eliminarSesion = async function(pacienteId, sesionIndex) {
        const paciente = pacientesData.find(p => p.id === pacienteId);
        if (paciente && paciente.indicaciones > 1) {
            paciente.sesionesRealizadas.splice(sesionIndex, 1);
            paciente.sesionesRCE.splice(sesionIndex, 1);
            paciente.horasSesion.splice(sesionIndex, 1);
            paciente.indicaciones--;
            
            refrescarTarjetaPaciente(pacienteId);
            actualizarEstadisticas();
            await guardarPacienteDB(paciente);
        } else if (paciente && paciente.indicaciones === 1) {
            alert('Debe haber al menos 1 sesión');
        }
    };
    
    window.eliminarPaciente = async function(pacienteId) {
        const paciente = pacientesData.find(p => p.id === pacienteId);
        if (!paciente) return;
        
        if (confirm(`¿Está seguro que desea eliminar a ${paciente.nombre} de la lista?`)) {
            await eliminarPacienteDB(pacienteId);
            pacientesData = pacientesData.filter(p => p.id !== pacienteId);
            const card = document.getElementById(`patient-${pacienteId}`);
            if (card) card.remove();
            actualizarEstadisticas();
        }
    };
    
    function refrescarTarjetaPaciente(pacienteId) {
        const paciente = pacientesData.find(p => p.id === pacienteId);
        if (!paciente) return;
        
        const oldCard = document.getElementById(`patient-${pacienteId}`);
        if (oldCard) {
            const tipo = paciente.clasificacion === 'UPC' ? 'upc' : 'mq';
            const newCard = crearTarjetaPaciente(paciente, tipo);
            oldCard.replaceWith(newCard);
        }
    }
    
    // ===== EDITAR / AGREGAR PACIENTE =====
    
    window.editarPaciente = function(pacienteId) {
        const paciente = pacientesData.find(p => p.id === pacienteId);
        if (!paciente) return;
        mostrarModalPaciente(paciente, false);
    };
    
    window.agregarNuevoPaciente = function() {
        const nuevoPaciente = {
            id: generarUUID(),
            habitacion: '',
            nombre: '',
            edad: '',
            diagnostico: 'Otro',
            indicaciones: 1,
            clasificacion: 'MQ',
            sesionesRealizadas: [false],
            sesionesRCE: [false],
            horasSesion: [null]
        };
        mostrarModalPaciente(nuevoPaciente, true);
    };
    
    function mostrarModalPaciente(paciente, esNuevo) {
        const diagnosticos = [
            'Neumonía', 'Cir abdominal laparoscópica', 'Cir abdominal laparotomía', 'Cir tórax',
            'ITU', 'Trauma raquimedular', 'Trombosis', 'Sepsis', 'ACV', 'Neuroquirúrgico',
            'Hipoxia perinatal', 'SBO ped', 'ATL', 'Cardiológico', 'Cáncer', 'Prótesis de cadera',
            'Prótesis de rodilla', 'Otro', 'Plastia de cadera', 'Plastia de rodilla', 'TEC', 'PTM',
            'Paratiroidectomía', 'Cir plástica', 'EPOC/Resp crónico', 'RNPT', 'CX Columna',
            'Síndrome convulsivo', 'Falla renal', 'Traumatológico', 'Psiquiatría'
        ];
        
        let optionsDiag = diagnosticos.map(d => 
            `<option value="${d}" ${paciente.diagnostico === d ? 'selected' : ''}>${d}</option>`
        ).join('');
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modalPaciente';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${esNuevo ? 'Nuevo Paciente' : 'Editar Paciente'}</h3>
                <div class="form-group">
                    <label>Habitación</label>
                    <input type="text" id="inputHabitacion" value="${paciente.habitacion}" placeholder="Ej: 201, UCIA">
                </div>
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" id="inputNombre" value="${paciente.nombre}" placeholder="APELLIDO NOMBRE">
                </div>
                <div class="form-group">
                    <label>Edad</label>
                    <input type="number" id="inputEdad" value="${paciente.edad}" placeholder="Años">
                </div>
                <div class="form-group">
                    <label>Diagnóstico</label>
                    <select id="inputDiagnostico">${optionsDiag}</select>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="window.cerrarModal()">Cancelar</button>
                    <button class="btn btn-primary" onclick="window.guardarPaciente('${paciente.id}', ${esNuevo})">Guardar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    window.cerrarModal = function() {
        const modal = document.getElementById('modalPaciente');
        if (modal) modal.remove();
    };
    
    window.guardarPaciente = async function(pacienteId, esNuevo) {
        const habitacion = document.getElementById('inputHabitacion').value.trim().toUpperCase();
        const nombre = document.getElementById('inputNombre').value.trim().toUpperCase();
        const edad = parseInt(document.getElementById('inputEdad').value) || 0;
        const diagnostico = document.getElementById('inputDiagnostico').value;
        
        if (!habitacion || !nombre || !edad) {
            alert('Complete todos los campos');
            return;
        }
        
        // Clasificar habitación
        const habUPC = ['201','202','203','204','205','206','207','208','209','210','211','212','UCIA','UCIB','UCIC','UCID','UCIE','UCIF'];
        const clasificacion = habUPC.includes(habitacion) ? 'UPC' : 'MQ';
        
        if (esNuevo) {
            const nuevoPaciente = {
                id: pacienteId,
                habitacion, nombre, edad, diagnostico, clasificacion,
                indicaciones: 1,
                sesionesRealizadas: [false],
                sesionesRCE: [false],
                horasSesion: [null]
            };
            pacientesData.push(nuevoPaciente);
            await guardarPacienteDB(nuevoPaciente);
            
            const lista = clasificacion === 'UPC' ? document.getElementById('upcList') : document.getElementById('mqList');
            lista.appendChild(crearTarjetaPaciente(nuevoPaciente, clasificacion.toLowerCase()));
            
            document.getElementById('patientsSection').style.display = 'block';
        } else {
            const paciente = pacientesData.find(p => p.id === pacienteId);
            if (paciente) {
                const oldClasificacion = paciente.clasificacion;
                paciente.habitacion = habitacion;
                paciente.nombre = nombre;
                paciente.edad = edad;
                paciente.diagnostico = diagnostico;
                paciente.clasificacion = clasificacion;
                
                await guardarPacienteDB(paciente);
                
                if (oldClasificacion !== clasificacion) {
                    const oldCard = document.getElementById(`patient-${pacienteId}`);
                    if (oldCard) oldCard.remove();
                    
                    const lista = clasificacion === 'UPC' ? document.getElementById('upcList') : document.getElementById('mqList');
                    lista.appendChild(crearTarjetaPaciente(paciente, clasificacion.toLowerCase()));
                } else {
                    refrescarTarjetaPaciente(pacienteId);
                }
            }
        }
        
        actualizarEstadisticas();
        window.cerrarModal();
    };
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-overlay')) {
            window.cerrarModal();
        }
    });
    
    // ===== EXPORTAR A EXCEL =====
    
    window.exportarExcel = function() {
        if (pacientesData.length === 0) {
            alert('No hay pacientes para exportar');
            return;
        }
        
        // Preparar datos para Excel
        const datosExcel = pacientesData.map(p => {
            const sesionesCompletadas = p.sesionesRealizadas.filter(s => s).length;
            const rceCompletados = p.sesionesRCE.filter(r => r).length;
            const horasRealizadas = p.horasSesion.filter(h => h).join(', ') || '-';
            
            return {
                'Habitación': p.habitacion,
                'Nombre': p.nombre,
                'Edad': p.edad,
                'Diagnóstico': p.diagnostico,
                'Unidad': p.clasificacion,
                'Indicaciones': p.indicaciones,
                'Sesiones Realizadas': sesionesCompletadas,
                'RCE Completados': rceCompletados,
                'Horas': horasRealizadas,
                'Estado': sesionesCompletadas === p.indicaciones && rceCompletados === p.indicaciones ? 'Completo' : 'Pendiente'
            };
        });
        
        // Crear libro de Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(datosExcel);
        
        // Ajustar anchos de columna
        ws['!cols'] = [
            { wch: 10 }, // Habitación
            { wch: 30 }, // Nombre
            { wch: 6 },  // Edad
            { wch: 25 }, // Diagnóstico
            { wch: 8 },  // Unidad
            { wch: 12 }, // Indicaciones
            { wch: 18 }, // Sesiones
            { wch: 15 }, // RCE
            { wch: 15 }, // Horas
            { wch: 10 }  // Estado
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Pacientes TO');
        
        // Generar nombre de archivo con fecha
        const fecha = getFechaActual().replace(/-/g, '');
        const nombreArchivo = `TO_Pacientes_${fecha}.xlsx`;
        
        // Descargar
        XLSX.writeFile(wb, nombreArchivo);
        console.log('Excel exportado:', nombreArchivo);
    };
    
    // ===== COMPARTIR POR WHATSAPP =====
    
    window.compartirWhatsApp = function() {
        if (pacientesData.length === 0) {
            alert('No hay pacientes para compartir');
            return;
        }
        
        const fecha = getFechaActual();
        const pacientesUPC = pacientesData.filter(p => p.clasificacion === 'UPC');
        const pacientesMQ = pacientesData.filter(p => p.clasificacion === 'MQ');
        const totalSesiones = pacientesData.reduce((sum, p) => sum + p.indicaciones, 0);
        const sesionesRealizadas = pacientesData.reduce((sum, p) => sum + p.sesionesRealizadas.filter(s => s).length, 0);
        
        // Construir mensaje
        let mensaje = `🏥 *REPORTE TO - ${fecha}*\n`;
        mensaje += `━━━━━━━━━━━━━━━━━\n\n`;
        mensaje += `📊 *RESUMEN*\n`;
        mensaje += `• Total pacientes: ${pacientesData.length}\n`;
        mensaje += `• UPC: ${pacientesUPC.length} | MQ: ${pacientesMQ.length}\n`;
        mensaje += `• Sesiones: ${sesionesRealizadas}/${totalSesiones}\n\n`;
        
        // Lista UPC
        if (pacientesUPC.length > 0) {
            mensaje += `🏥 *UPC (${pacientesUPC.length})*\n`;
            pacientesUPC.forEach(p => {
                const estado = p.sesionesRealizadas.filter(s => s).length === p.indicaciones ? '✅' : '⏳';
                const horas = p.horasSesion.filter(h => h).join(', ') || '';
                mensaje += `${estado} ${p.habitacion} - ${p.nombre} (${p.edad}a)\n`;
                mensaje += `   ${p.diagnostico}${horas ? ' • ' + horas : ''}\n`;
            });
            mensaje += `\n`;
        }
        
        // Lista MQ
        if (pacientesMQ.length > 0) {
            mensaje += `🏨 *MQ (${pacientesMQ.length})*\n`;
            pacientesMQ.forEach(p => {
                const estado = p.sesionesRealizadas.filter(s => s).length === p.indicaciones ? '✅' : '⏳';
                const horas = p.horasSesion.filter(h => h).join(', ') || '';
                mensaje += `${estado} ${p.habitacion} - ${p.nombre} (${p.edad}a)\n`;
                mensaje += `   ${p.diagnostico}${horas ? ' • ' + horas : ''}\n`;
            });
        }
        
        mensaje += `\n━━━━━━━━━━━━━━━━━\n`;
        mensaje += `_Clínica Alemana Temuco - TO_`;
        
        // Codificar mensaje para URL
        const mensajeCodificado = encodeURIComponent(mensaje);
        
        // Abrir WhatsApp
        const urlWhatsApp = `https://wa.me/?text=${mensajeCodificado}`;
        window.open(urlWhatsApp, '_blank');
    };
});
