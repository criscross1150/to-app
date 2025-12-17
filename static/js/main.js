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
    
    // Obtener usuario actual
    const currentUserId = window.currentUserId || 'default';
    const isAdmin = window.isAdmin || false;
    
    // Exponer pacientesData globalmente para el selector de dictado
    window.pacientesData = pacientesData;
    
    // ===== FUNCIONES SUPABASE =====
    
    async function guardarPacienteDB(paciente) {
        try {
            const { data, error } = await supabase
                .from('pacientes')
                .upsert({
                    id: paciente.id,
                    user_id: currentUserId,
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
            let query = supabase
                .from('pacientes')
                .select('*')
                .eq('fecha', fechaHoy);
            
            // Si no es admin, filtrar por usuario
            if (!isAdmin) {
                query = query.eq('user_id', currentUserId);
            }
            
            const { data, error } = await query.order('created_at', { ascending: true });
            
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
                    horasSesion: p.horas_sesion || [null],
                    userId: p.user_id
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
    // Clave única por usuario
    const STORAGE_KEY = `to_app_pacientes_${currentUserId}`;
    
    function guardarLocalStorage() {
        const dataToSave = {
            pacientes: pacientesData,
            fecha: getFechaActual(),
            timestamp: Date.now(),
            userId: currentUserId
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
            // Guardar inmediatamente la imagen para poder ampliarla después
            window.lastProcessedImageSrc = e.target.result;
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
        
        // Mostrar la imagen procesada
        const processedImageContainer = document.getElementById('processedImageContainer');
        const processedImage = document.getElementById('processedImage');
        const imagePreview = document.getElementById('imagePreview');
        
        if (processedImageContainer && processedImage && imagePreview.src) {
            processedImage.src = imagePreview.src;
            processedImageContainer.style.display = 'block';
            // Guardar la URL de la imagen para uso posterior
            window.lastProcessedImageSrc = imagePreview.src;
        }
        
        pacientesData = pacientes.map((p) => ({
            ...p,
            id: generarUUID(),
            reposo: p.reposo || 'no',
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
        
        // Actualizar referencia global y selector de pacientes para dictado
        window.pacientesData = pacientesData;
        if (typeof populatePatientSelector === 'function') {
            populatePatientSelector();
        }
        
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
        
        // Indicador de reposo
        let reposoHTML = '';
        if (paciente.reposo && paciente.reposo !== 'no') {
            const reposoClass = paciente.reposo === 'absoluto' ? 'reposo-absoluto' : 'reposo-relativo';
            const reposoLabel = paciente.reposo === 'absoluto' ? 'R.Abs' : 'R.Rel';
            reposoHTML = `<span class="reposo-badge ${reposoClass}">${reposoLabel}</span>`;
        }
        
        card.innerHTML = `
            <div class="row-main" onclick="window.toggleExpand('${paciente.id}')">
                <div class="col-room ${tipo}">${paciente.habitacion}</div>
                <div class="col-data">
                    <span class="d-name">${paciente.nombre} ${reposoHTML}</span>
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
            window.pacientesData = pacientesData;
            const card = document.getElementById(`patient-${pacienteId}`);
            if (card) card.remove();
            actualizarEstadisticas();
            // Actualizar selector de pacientes para dictado
            if (typeof populatePatientSelector === 'function') {
                populatePatientSelector();
            }
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
            reposo: 'no',
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
        
        const reposoActual = paciente.reposo || 'no';
        
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
                <div class="form-group">
                    <label>Indicación de Reposo</label>
                    <select id="inputReposo">
                        <option value="no" ${reposoActual === 'no' ? 'selected' : ''}>Sin indicación</option>
                        <option value="relativo" ${reposoActual === 'relativo' ? 'selected' : ''}>Reposo Relativo</option>
                        <option value="absoluto" ${reposoActual === 'absoluto' ? 'selected' : ''}>Reposo Absoluto</option>
                    </select>
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
        const reposo = document.getElementById('inputReposo').value;
        
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
                habitacion, nombre, edad, diagnostico, clasificacion, reposo,
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
                paciente.reposo = reposo;
                
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
        // Actualizar referencia global y selector de pacientes para dictado
        window.pacientesData = pacientesData;
        if (typeof populatePatientSelector === 'function') {
            populatePatientSelector();
        }
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
    
    // ===== AMPLIAR IMAGEN =====
    
    window.ampliarImagen = function() {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('imageModalImg');
        const processedImage = document.getElementById('processedImage');
        const imagePreview = document.getElementById('imagePreview');
        
        // Buscar la mejor fuente de imagen disponible
        let imgSrc = null;
        
        if (window.lastProcessedImageSrc) {
            imgSrc = window.lastProcessedImageSrc;
        } else if (processedImage && processedImage.src && !processedImage.src.endsWith('/')) {
            imgSrc = processedImage.src;
        } else if (imagePreview && imagePreview.src && !imagePreview.src.endsWith('/')) {
            imgSrc = imagePreview.src;
        }
        
        console.log('Ampliar imagen - src:', imgSrc);
        
        if (imgSrc && modal && modalImg) {
            modalImg.src = imgSrc;
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            console.log('No se pudo ampliar: modal=', modal, 'modalImg=', modalImg, 'imgSrc=', imgSrc);
            alert('No hay imagen para mostrar');
        }
    };
    
    window.cerrarImagenAmpliada = function() {
        const modal = document.getElementById('imageModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restaurar scroll
        }
    };
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            window.cerrarImagenAmpliada();
        }
    });
    
    // ===== DICTADO DE VOZ (Speech Recognition) =====
    initVoiceDictation();
});

// Función de inicialización del dictado de voz (fuera del DOMContentLoaded para evitar errores si no existen los elementos)
function initVoiceDictation() {
    const btnRecord = document.getElementById('btnRecord');
    const recordStatus = document.getElementById('recordStatus');
    const transcriptionText = document.getElementById('transcriptionText');
    const btnClearEvolution = document.getElementById('btnClearEvolution');
    const btnPreviewEvolution = document.getElementById('btnPreviewEvolution');
    const btnCopyPreview = document.getElementById('btnCopyPreview');
    
    if (!btnRecord) return; // Si no existe la sección de dictado, salir
    
    // Verificar soporte de Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        recordStatus.textContent = 'Tu navegador no soporta dictado por voz';
        btnRecord.disabled = true;
        btnRecord.style.opacity = '0.5';
        // Continuar para inicializar otros botones
    }
    
    let recognition = null;
    let isRecording = false;
    let shouldRestart = false;
    let accumulatedText = '';
    
    function createRecognition() {
        if (!SpeechRecognition) return null;
        const rec = new SpeechRecognition();
        rec.lang = 'es-CL';
        rec.continuous = false; // Sesiones cortas para mayor precisión
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        return rec;
    }
    
    function startRecognition() {
        recognition = createRecognition();
        
        recognition.onresult = (event) => {
            let finalText = '';
            let interimText = '';
            
            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interimText += result[0].transcript;
                }
            }
            
            // Si hay texto final, agregarlo al acumulado
            if (finalText) {
                accumulatedText += finalText.trim() + ' ';
            }
            
            // Mostrar texto acumulado + texto interim actual
            transcriptionText.value = (accumulatedText + interimText).trim();
            transcriptionText.scrollTop = transcriptionText.scrollHeight;
        };
        
        recognition.onstart = () => {
            isRecording = true;
            btnRecord.classList.add('recording');
            btnRecord.innerHTML = '<i data-lucide="mic-off" class="icon-xs"></i>';
            recordStatus.textContent = 'Escuchando...';
            recordStatus.classList.add('active');
            if (window.lucide) lucide.createIcons();
        };
        
        recognition.onend = () => {
            // Si debe continuar, reiniciar automáticamente
            if (shouldRestart && isRecording) {
                setTimeout(() => {
                    if (shouldRestart) {
                        try {
                            startRecognition();
                        } catch (e) {
                            console.log('Reinicio cancelado');
                        }
                    }
                }, 100);
            } else {
                isRecording = false;
                btnRecord.classList.remove('recording');
                btnRecord.innerHTML = '<i data-lucide="mic" class="icon-xs"></i>';
                recordStatus.textContent = 'Toca el micrófono para dictar';
                recordStatus.classList.remove('active');
                if (window.lucide) lucide.createIcons();
            }
        };
        
        recognition.onerror = (event) => {
            console.error('Error:', event.error);
            
            // Si es error de no-speech, reiniciar silenciosamente
            if (event.error === 'no-speech' && shouldRestart) {
                return; // Se reiniciará en onend
            }
            
            if (event.error === 'aborted' && shouldRestart) {
                return;
            }
            
            let errorMsg = 'Error de grabación';
            let askRetry = false;
            
            if (event.error === 'not-allowed') {
                errorMsg = 'Permiso de micrófono denegado';
                shouldRestart = false;
            } else if (event.error === 'network') {
                errorMsg = 'Error de red';
                askRetry = true;
            } else if (event.error === 'audio-capture') {
                errorMsg = 'No se detectó micrófono';
                askRetry = true;
            } else {
                askRetry = true;
            }
            
            shouldRestart = false;
            isRecording = false;
            btnRecord.classList.remove('recording');
            btnRecord.innerHTML = '<i data-lucide="mic" class="icon-xs"></i>';
            recordStatus.classList.remove('active');
            if (window.lucide) lucide.createIcons();
            
            if (askRetry) {
                recordStatus.textContent = errorMsg;
                setTimeout(() => {
                    if (confirm(`${errorMsg}. ¿Deseas intentar grabar de nuevo?`)) {
                        accumulatedText = transcriptionText.value ? transcriptionText.value.trim() + ' ' : '';
                        shouldRestart = true;
                        startRecognition();
                    } else {
                        recordStatus.textContent = 'Presiona para grabar';
                    }
                }, 100);
            } else {
                recordStatus.textContent = errorMsg;
                setTimeout(() => {
                    recordStatus.textContent = 'Presiona para grabar';
                }, 3000);
            }
        };
        
        try {
            recognition.start();
        } catch (e) {
            console.error('Error iniciando reconocimiento:', e);
        }
    }
    
    function stopRecognition() {
        shouldRestart = false;
        isRecording = false;
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.log('Ya detenido');
            }
        }
        btnRecord.classList.remove('recording');
        btnRecord.innerHTML = '<i data-lucide="mic" class="icon-xs"></i>';
        recordStatus.textContent = 'Toca el micrófono para dictar';
        recordStatus.classList.remove('active');
        if (window.lucide) lucide.createIcons();
    }
    
    // Botón de grabar
    btnRecord.addEventListener('click', () => {
        const patientSelect = document.getElementById('patientSelect');
        if (!patientSelect || patientSelect.value === '') {
            alert('Selecciona un paciente antes de grabar');
            return;
        }
        
        if (isRecording) {
            stopRecognition();
        } else {
            // Preservar texto existente
            accumulatedText = transcriptionText.value ? transcriptionText.value.trim() + ' ' : '';
            shouldRestart = true;
            startRecognition();
        }
    });
    
    // Botón de limpiar formulario completo
    if (btnClearEvolution) {
        btnClearEvolution.addEventListener('click', clearEvolutionForm);
    }
    
    // Botón de vista previa
    if (btnPreviewEvolution) {
        btnPreviewEvolution.addEventListener('click', showEvolutionPreview);
    }
    
    // Botón copiar vista previa
    if (btnCopyPreview) {
        btnCopyPreview.addEventListener('click', copyEvolutionPreview);
    }
    
    // Botón generar con IA
    const btnGenerateAI = document.getElementById('btnGenerateAI');
    if (btnGenerateAI) {
        btnGenerateAI.addEventListener('click', generateEvolutionWithAI);
    }
    
    // Poblar selector de pacientes
    const patientSelect = document.getElementById('patientSelect');
    if (patientSelect && window.pacientesData && window.pacientesData.length > 0) {
        populatePatientSelector();
    }
    
    // Inicializar historial de evoluciones
    initEvolutionHistory();
    
    // Botón guardar evolución
    const btnSaveEvolution = document.getElementById('btnSaveEvolution');
    if (btnSaveEvolution) {
        btnSaveEvolution.addEventListener('click', saveCurrentEvolution);
    }
    
    // Botones de compartir todas las evoluciones
    const btnShareAllWhatsApp = document.getElementById('btnShareAllWhatsApp');
    if (btnShareAllWhatsApp) {
        btnShareAllWhatsApp.addEventListener('click', shareAllViaWhatsApp);
    }
    
    const btnShareAllGmail = document.getElementById('btnShareAllGmail');
    if (btnShareAllGmail) {
        btnShareAllGmail.addEventListener('click', shareAllViaEmail);
    }
    
    // Botón limpiar historial
    const btnClearHistory = document.getElementById('btnClearHistory');
    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', clearEvolutionHistory);
    }
}

// ===== HISTORIAL DE EVOLUCIONES =====

// Almacenamiento de evoluciones
let evolutionHistory = [];

// Clave de localStorage por usuario
function getEvolutionStorageKey() {
    const userId = window.currentUserId || 'default';
    return `to_evolution_history_${userId}`;
}

function initEvolutionHistory() {
    // Cargar del localStorage si existe (por usuario)
    const saved = localStorage.getItem(getEvolutionStorageKey());
    if (saved) {
        try {
            evolutionHistory = JSON.parse(saved);
            renderEvolutionHistory();
        } catch (e) {
            evolutionHistory = [];
        }
    }
}

function saveEvolutionHistory() {
    localStorage.setItem(getEvolutionStorageKey(), JSON.stringify(evolutionHistory));
}

// ===== FUNCIONES DE FORMULARIO ESTRUCTURADO =====

// Obtener datos del formulario estructurado
function getEvolutionFormData() {
    return {
        conciencia: document.querySelector('input[name="conciencia"]:checked')?.value || '',
        colaboracion: document.querySelector('input[name="colaboracion"]:checked')?.value || '',
        orientacion: document.querySelector('input[name="orientacion"]:checked')?.value || '',
        animo: document.querySelector('input[name="animo"]:checked')?.value || '',
        posicion: document.querySelector('input[name="posicion"]:checked')?.value || '',
        movilidad: document.querySelector('input[name="movilidad"]:checked')?.value || '',
        cognicion: document.querySelector('input[name="cognicion"]:checked')?.value || '',
        intervenciones: Array.from(document.querySelectorAll('input[name="intervencion"]:checked')).map(cb => cb.value),
        sesionConjunta: Array.from(document.querySelectorAll('input[name="sesion_conjunta"]:checked')).map(cb => cb.value),
        observaciones: document.getElementById('transcriptionText')?.value?.trim() || ''
    };
}

// Generar texto formateado de la evolución
function formatEvolutionText(data, paciente) {
    let texto = `EVOLUCIÓN T.O.\n`;
    texto += `Paciente: ${paciente.habitacion} - ${paciente.nombre}\n\n`;
    
    // Características Generales
    const caracteristicas = [];
    if (data.conciencia) caracteristicas.push(data.conciencia);
    if (data.colaboracion) caracteristicas.push(data.colaboracion);
    if (data.orientacion) caracteristicas.push(data.orientacion);
    if (data.animo) caracteristicas.push(`Ánimo ${data.animo.toLowerCase()}`);
    if (data.posicion) caracteristicas.push(`Intervención ${data.posicion.toLowerCase()}`);
    if (data.movilidad) caracteristicas.push(`Movilidad ${data.movilidad.toLowerCase()}`);
    if (data.cognicion) caracteristicas.push(`Función cognitiva ${data.cognicion.toLowerCase()}`);
    
    if (caracteristicas.length > 0) {
        texto += `Estado: ${caracteristicas.join(', ')}.\n\n`;
    }
    
    // Intervenciones realizadas
    if (data.intervenciones.length > 0) {
        texto += `Intervención: ${data.intervenciones.join(', ')}.\n\n`;
    }
    
    // Sesión conjunta
    if (data.sesionConjunta && data.sesionConjunta.length > 0) {
        texto += `Sesión conjunta con: ${data.sesionConjunta.join(' y ')}.\n\n`;
    }
    
    // Observaciones
    if (data.observaciones) {
        texto += `Observaciones: ${data.observaciones}`;
    }
    
    return texto.trim();
}

// Limpiar formulario completo
function clearEvolutionForm() {
    // Limpiar radios
    document.querySelectorAll('input[name="conciencia"]').forEach(r => r.checked = false);
    document.querySelectorAll('input[name="colaboracion"]').forEach(r => r.checked = false);
    document.querySelectorAll('input[name="orientacion"]').forEach(r => r.checked = false);
    document.querySelectorAll('input[name="animo"]').forEach(r => r.checked = false);
    document.querySelectorAll('input[name="movilidad"]').forEach(r => r.checked = false);
    
    // Limpiar checkboxes
    document.querySelectorAll('input[name="intervencion"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="sesion_conjunta"]').forEach(cb => cb.checked = false);
    
    // Limpiar textarea
    const transcription = document.getElementById('transcriptionText');
    if (transcription) transcription.value = '';
    
    // Limpiar selector de paciente
    const patientSelect = document.getElementById('patientSelect');
    if (patientSelect) patientSelect.value = '';
    
    // Ocultar vista previa
    const preview = document.getElementById('evolutionPreview');
    if (preview) preview.style.display = 'none';
}

// Mostrar vista previa
function showEvolutionPreview() {
    const patientSelect = document.getElementById('patientSelect');
    
    if (!patientSelect || patientSelect.value === '') {
        alert('Selecciona un paciente');
        return;
    }
    
    const paciente = window.pacientesData[parseInt(patientSelect.value)];
    if (!paciente) {
        alert('Error: paciente no encontrado');
        return;
    }
    
    const formData = getEvolutionFormData();
    const texto = formatEvolutionText(formData, paciente);
    
    const previewContent = document.getElementById('previewContent');
    const evolutionPreview = document.getElementById('evolutionPreview');
    
    if (previewContent && evolutionPreview) {
        previewContent.textContent = texto;
        evolutionPreview.style.display = 'block';
        evolutionPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Generar evolución con IA
async function generateEvolutionWithAI() {
    const patientSelect = document.getElementById('patientSelect');
    const transcriptionText = document.getElementById('transcriptionText');
    const btnGenerateAI = document.getElementById('btnGenerateAI');
    const recordStatus = document.getElementById('recordStatus');
    
    if (!patientSelect || patientSelect.value === '') {
        alert('Selecciona un paciente primero');
        return;
    }
    
    const paciente = window.pacientesData[parseInt(patientSelect.value)];
    if (!paciente) {
        alert('Error: paciente no encontrado');
        return;
    }
    
    const formData = getEvolutionFormData();
    
    // Verificar que hay al menos algo seleccionado
    const hayDatos = formData.conciencia || formData.colaboracion || formData.orientacion || 
                     formData.animo || formData.posicion || formData.movilidad || formData.cognicion ||
                     formData.intervenciones.length > 0;
    
    if (!hayDatos) {
        alert('Marca al menos una característica o intervención para generar la evolución');
        return;
    }
    
    // Mostrar estado de carga
    btnGenerateAI.classList.add('generating');
    recordStatus.textContent = 'Generando evolución con IA...';
    recordStatus.classList.add('active');
    
    try {
        const response = await fetch('/generar-evolucion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paciente: {
                    habitacion: paciente.habitacion,
                    nombre: paciente.nombre
                },
                formData: formData
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Agregar el texto generado al textarea
            const textoActual = transcriptionText.value.trim();
            if (textoActual) {
                transcriptionText.value = textoActual + '\n\n' + result.texto;
            } else {
                transcriptionText.value = result.texto;
            }
            transcriptionText.scrollTop = transcriptionText.scrollHeight;
            recordStatus.textContent = '✓ Evolución generada con IA';
            
            setTimeout(() => {
                recordStatus.textContent = 'Toca el micrófono para dictar o ✨ para generar con IA';
                recordStatus.classList.remove('active');
            }, 3000);
        } else {
            alert('Error: ' + result.error);
            recordStatus.textContent = 'Error al generar';
            setTimeout(() => {
                recordStatus.textContent = 'Toca el micrófono para dictar o ✨ para generar con IA';
                recordStatus.classList.remove('active');
            }, 2000);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión al generar evolución');
        recordStatus.textContent = 'Error de conexión';
        setTimeout(() => {
            recordStatus.textContent = 'Toca el micrófono para dictar o ✨ para generar con IA';
            recordStatus.classList.remove('active');
        }, 2000);
    } finally {
        btnGenerateAI.classList.remove('generating');
    }
}

// Copiar vista previa
async function copyEvolutionPreview() {
    const previewContent = document.getElementById('previewContent');
    const btnCopyPreview = document.getElementById('btnCopyPreview');
    
    if (!previewContent || !previewContent.textContent.trim()) {
        alert('No hay texto para copiar');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(previewContent.textContent);
        
        // Feedback visual
        const originalText = btnCopyPreview.innerHTML;
        btnCopyPreview.innerHTML = '<i data-lucide="check" class="icon-xs"></i> ¡Copiado!';
        btnCopyPreview.style.background = 'var(--verde-primario)';
        
        if (window.lucide) lucide.createIcons();
        
        setTimeout(() => {
            btnCopyPreview.innerHTML = originalText;
            btnCopyPreview.style.background = '';
            if (window.lucide) lucide.createIcons();
        }, 2000);
        
    } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = previewContent.textContent;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Texto copiado al portapapeles');
    }
}

function saveCurrentEvolution() {
    const patientSelect = document.getElementById('patientSelect');
    
    if (!patientSelect || patientSelect.value === '') {
        alert('Selecciona un paciente');
        return;
    }
    
    const paciente = window.pacientesData[parseInt(patientSelect.value)];
    if (!paciente) {
        alert('Error: paciente no encontrado');
        return;
    }
    
    // Obtener datos estructurados
    const formData = getEvolutionFormData();
    
    // Verificar que hay al menos algo seleccionado
    const hayDatos = formData.conciencia || formData.colaboracion || formData.orientacion || 
                     formData.animo || formData.posicion || formData.movilidad || formData.cognicion ||
                     formData.intervenciones.length > 0 || formData.observaciones;
    
    if (!hayDatos) {
        alert('Completa al menos un campo antes de guardar');
        return;
    }
    
    // Generar texto formateado
    const textoFormateado = formatEvolutionText(formData, paciente);
    
    // Crear registro de evolución
    const evolution = {
        id: Date.now(),
        habitacion: paciente.habitacion,
        nombre: paciente.nombre,
        // Guardar datos estructurados para poder editar después
        formData: formData,
        // Guardar texto formateado para mostrar
        texto: textoFormateado,
        fecha: new Date().toLocaleDateString('es-CL'),
        hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    };
    
    evolutionHistory.push(evolution);
    saveEvolutionHistory();
    renderEvolutionHistory();
    
    // Limpiar el formulario
    clearEvolutionForm();
    
    // Feedback visual
    const btnSave = document.getElementById('btnSaveEvolution');
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<i data-lucide="check" class="icon-xs"></i> ¡Guardado!';
    if (window.lucide) lucide.createIcons();
    
    setTimeout(() => {
        btnSave.innerHTML = originalText;
        if (window.lucide) lucide.createIcons();
    }, 2000);
}

function renderEvolutionHistory() {
    const historySection = document.getElementById('evolutionHistory');
    const historyList = document.getElementById('historyList');
    const historyCount = document.getElementById('historyCount');
    
    if (!historySection || !historyList) return;
    
    if (evolutionHistory.length === 0) {
        historySection.style.display = 'none';
        return;
    }
    
    historySection.style.display = 'block';
    historyCount.textContent = evolutionHistory.length;
    
    historyList.innerHTML = evolutionHistory.map(evo => {
        // Mostrar resumen compacto de las intervenciones si existen
        let resumen = '';
        if (evo.formData && evo.formData.intervenciones && evo.formData.intervenciones.length > 0) {
            resumen = `<div class="history-tags">${evo.formData.intervenciones.map(i => 
                `<span class="history-tag">${i}</span>`
            ).join('')}</div>`;
        }
        
        return `
        <div class="history-item" data-id="${evo.id}">
            <div class="history-item-header">
                <span class="history-patient">${evo.habitacion} - ${evo.nombre}</span>
                <span class="history-time">${evo.fecha} ${evo.hora}</span>
            </div>
            ${resumen}
            <div class="history-text" id="text-${evo.id}">${evo.texto}</div>
            <div class="history-item-actions">
                <button class="btn-edit-item" onclick="editEvolution(${evo.id})">
                    <i data-lucide="pencil" class="icon-xs"></i> Editar
                </button>
                <button class="btn-delete-item" onclick="deleteEvolution(${evo.id})">
                    <i data-lucide="trash-2" class="icon-xs"></i> Eliminar
                </button>
            </div>
        </div>
    `}).join('');
    
    if (window.lucide) lucide.createIcons();
}

function editEvolution(id) {
    const evolution = evolutionHistory.find(e => e.id === id);
    if (!evolution) return;
    
    const textElement = document.getElementById(`text-${id}`);
    const currentText = evolution.texto;
    
    // Crear textarea para edición
    const editContainer = document.createElement('div');
    editContainer.className = 'edit-container';
    editContainer.innerHTML = `
        <textarea class="edit-textarea" id="edit-${id}" rows="4">${currentText}</textarea>
        <div class="edit-actions">
            <button class="btn-save-edit" onclick="saveEditEvolution(${id})">
                <i data-lucide="check" class="icon-xs"></i> Guardar
            </button>
            <button class="btn-cancel-edit" onclick="cancelEditEvolution(${id}, '${encodeURIComponent(currentText)}')">
                <i data-lucide="x" class="icon-xs"></i> Cancelar
            </button>
        </div>
    `;
    
    textElement.innerHTML = '';
    textElement.appendChild(editContainer);
    
    // Ocultar botones de acción
    const actionsDiv = textElement.parentElement.querySelector('.history-item-actions');
    if (actionsDiv) actionsDiv.style.display = 'none';
    
    if (window.lucide) lucide.createIcons();
    
    // Focus en el textarea
    document.getElementById(`edit-${id}`).focus();
}

function saveEditEvolution(id) {
    const textarea = document.getElementById(`edit-${id}`);
    if (!textarea) return;
    
    const newText = textarea.value.trim();
    if (!newText) {
        alert('El texto no puede estar vacío');
        return;
    }
    
    const evolution = evolutionHistory.find(e => e.id === id);
    if (evolution) {
        evolution.texto = newText;
        evolution.editado = true;
        saveEvolutionHistory();
        renderEvolutionHistory();
    }
}

function cancelEditEvolution(id, encodedText) {
    renderEvolutionHistory();
}

function deleteEvolution(id) {
    if (confirm('¿Eliminar esta evolución?')) {
        evolutionHistory = evolutionHistory.filter(e => e.id !== id);
        saveEvolutionHistory();
        renderEvolutionHistory();
    }
}

function clearEvolutionHistory() {
    if (confirm('¿Eliminar TODAS las evoluciones registradas?')) {
        evolutionHistory = [];
        saveEvolutionHistory();
        renderEvolutionHistory();
    }
}

function shareAllViaWhatsApp() {
    if (evolutionHistory.length === 0) {
        alert('No hay evoluciones para compartir');
        return;
    }
    
    let message = `*EVOLUCIONES TERAPIA OCUPACIONAL*\n`;
    message += `*Fecha:* ${new Date().toLocaleDateString('es-CL')}\n`;
    message += `*Total:* ${evolutionHistory.length} evoluciones\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    evolutionHistory.forEach((evo, index) => {
        message += `*${index + 1}. ${evo.habitacion} - ${evo.nombre}*\n`;
        message += `${evo.texto}\n\n`;
    });
    
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

function shareAllViaEmail() {
    if (evolutionHistory.length === 0) {
        alert('No hay evoluciones para compartir');
        return;
    }
    
    const fecha = new Date().toLocaleDateString('es-CL');
    const subject = `Evoluciones T.O. - ${fecha} (${evolutionHistory.length} pacientes)`;
    
    let body = `EVOLUCIONES TERAPIA OCUPACIONAL\n`;
    body += `Fecha: ${fecha}\n`;
    body += `Total: ${evolutionHistory.length} evoluciones\n\n`;
    body += `════════════════════════════════\n\n`;
    
    evolutionHistory.forEach((evo, index) => {
        body += `${index + 1}. HABITACIÓN ${evo.habitacion} - ${evo.nombre}\n`;
        body += `   Hora: ${evo.hora}\n`;
        body += `   Evolución:\n`;
        body += `   ${evo.texto}\n\n`;
        body += `────────────────────────────────\n\n`;
    });
    
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    window.location.href = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
}

// Función para poblar el selector de pacientes
function populatePatientSelector() {
    const patientSelect = document.getElementById('patientSelect');
    if (!patientSelect || !window.pacientesData) return;
    
    // Limpiar opciones existentes excepto la primera
    patientSelect.innerHTML = '<option value="">-- Seleccionar paciente --</option>';
    
    // Agregar cada paciente (habitación + nombre)
    window.pacientesData.forEach((paciente, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${paciente.habitacion} - ${paciente.nombre}`;
        patientSelect.appendChild(option);
    });
}
