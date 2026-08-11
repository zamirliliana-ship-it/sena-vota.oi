import { supabase } from './supabase.js';

// ==========================================
// 1. SEGURIDAD Y ACCESO AL PANEL (PASSWORD)
// ==========================================
const PASSWORD_ADMIN = "sena2026*"; // Puedes cambiar la contraseña aquí

function verificarAutenticacion() {
    const estaAutenticado = sessionStorage.getItem('admin_auth');
    const overlayLogin = document.getElementById('admin-login-overlay');

    if (estaAutenticado === 'true') {
        if (overlayLogin) overlayLogin.classList.add('hidden');
        document.body.classList.remove('bloqueado');
        return true;
    } else {
        document.body.classList.add('bloqueado');
        if (overlayLogin) overlayLogin.classList.remove('hidden');
        return false;
    }
}

// Botón para cerrar sesión
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
        sessionStorage.removeItem('admin_auth');
        window.location.reload();
    });
}

// ==========================================
// 2. SELECCIÓN DE ELEMENTOS DEL DOM
// ==========================================
const modalCandidato = document.getElementById('modal-candidato');
const modalJornada = document.getElementById('modal-jornada');
const modalConfirmacion = document.getElementById('modal-confirmacion');
const formCandidato = document.getElementById('form-candidato');
const listaCandidatos = document.getElementById('candidatos-lista');
const selectJornada = document.getElementById('candidato-jornada');
const tituloModalCandidato = document.getElementById('modal-candidato-titulo');

const btnAgregarCandidato = document.getElementById('btn-agregar-candidato');
const btnAgregarJornada = document.getElementById('btn-agregar-jornada');
const botonesCerrar = document.querySelectorAll('[data-close]');

// ==========================================
// 3. LÓGICA DE LAS VENTANAS MODALES
// ==========================================
btnAgregarCandidato.addEventListener('click', () => {
    formCandidato.reset();
    document.getElementById('candidato-id').value = '';
    tituloModalCandidato.textContent = 'Agregar candidato';
    modalCandidato.classList.remove('hidden'); 
});

if (btnAgregarJornada) {
    btnAgregarJornada.addEventListener('click', () => {
        modalJornada.classList.remove('hidden');
    });
}

botonesCerrar.forEach(boton => {
    boton.addEventListener('click', (e) => {
        const idModal = e.currentTarget.getAttribute('data-close');
        const modalParaCerrar = document.getElementById(idModal);
        if (modalParaCerrar) {
            modalParaCerrar.classList.add('hidden');
        }
    });
});

// ==========================================
// 4. LECTURA: CARGAR DATOS INICIALES
// ==========================================
async function cargarJornadasSelect() {
    const { data, error } = await supabase.from('jornadas').select('*');
    if (error) {
        console.error('Error al cargar jornadas:', error);
        return;
    }
    selectJornada.innerHTML = '<option value="">Seleccionar jornada</option>';
    data.forEach(jornada => {
        selectJornada.innerHTML += `<option value="${jornada.id}">${jornada.nombre}</option>`;
    });
}

async function cargarCandidatos() {
    listaCandidatos.innerHTML = '<div class="cargando">Cargando candidatos...</div>';
    
    const { data, error } = await supabase
        .from('candidatos')
        .select(`*, jornadas(nombre)`)
        .order('creado_en', { ascending: false });

    if (error) {
        listaCandidatos.innerHTML = '<p>Error al cargar los datos.</p>';
        return;
    }

    if (data.length === 0) {
        listaCandidatos.innerHTML = '<p>No hay candidatos registrados aún.</p>';
        document.getElementById('total-candidatos').textContent = "0";
        document.getElementById('total-votos').textContent = "0";
        renderizarGrafica();
        return;
    }

    let html = `
        <table class="tabla-admin">
            <thead>
                <tr>
                    <th>Foto</th>
                    <th>Nombre</th>
                    <th>Ficha</th>
                    <th>Programa</th>
                    <th>Jornada</th>
                    <th>Votos</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let totalVotosGeneral = 0;

    data.forEach(candidato => {
        const foto = candidato.foto_url ? `<img src="${candidato.foto_url}" width="40" height="40" style="border-radius:50%; object-fit: cover;" alt="Foto">` : '👤';
        const jornada = candidato.jornadas ? candidato.jornadas.nombre : 'N/A';
        totalVotosGeneral += candidato.votos;
        
        html += `
            <tr>
                <td>${foto}</td>
                <td>${candidato.nombre_completo}</td>
                <td>${candidato.numero_ficha}</td>
                <td>${candidato.programa_formacion}</td>
                <td>${jornada}</td>
                <td><strong>${candidato.votos}</strong></td>
                <td>
                    <button onclick="window.prepararEdicion(${candidato.id})" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;">Modificar</button>
                    <button onclick="window.prepararEliminacion(${candidato.id})" class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem;">Eliminar</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    listaCandidatos.innerHTML = html;
    
    document.getElementById('total-candidatos').textContent = data.length;
    document.getElementById('total-votos').textContent = totalVotosGeneral;

    renderizarGrafica();
}

// ==========================================
// 5. GRÁFICA EN TIEMPO REAL (CHART.JS)
// ==========================================
let myChart = null;

async function renderizarGrafica() {
    const { data, error } = await supabase
        .from('candidatos')
        .select(`votos, jornadas(nombre)`);

    if (error || !data) return;

    const resumen = {};
    data.forEach(c => {
        const nombreJornada = c.jornadas ? c.jornadas.nombre : 'Sin jornada';
        resumen[nombreJornada] = (resumen[nombreJornada] || 0) + c.votos;
    });

    const labels = Object.keys(resumen);
    const valores = Object.values(resumen);

    const canvasElement = document.getElementById('graficaJornadas');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['Sin datos'],
            datasets: [{
                label: 'Total de Votos por Jornada',
                data: valores.length > 0 ? valores : [0],
                backgroundColor: '#39A900',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1 } 
                }
            }
        }
    });
}

// ==========================================
// 6. AGREGAR Y MODIFICAR (CON FOTO)
// ==========================================
formCandidato.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const btnGuardar = document.getElementById('btn-guardar-candidato');
    const textoOriginalBtn = btnGuardar.textContent;
    btnGuardar.textContent = 'Guardando...';
    btnGuardar.disabled = true;

    const id = document.getElementById('candidato-id').value;
    const inputFoto = document.getElementById('candidato-foto');
    
    let fotoUrlFinal = null;

    if (inputFoto.files.length > 0) {
        const archivoFoto = inputFoto.files[0];
        const rutaArchivo = `${Date.now()}_${archivoFoto.name}`;

        const { error: uploadError } = await supabase.storage
            .from('fotos_candidatos')
            .upload(rutaArchivo, archivoFoto);

        if (uploadError) {
            alert('Error al subir la foto: ' + uploadError.message);
            btnGuardar.textContent = textoOriginalBtn;
            btnGuardar.disabled = false;
            return; 
        }

        const { data: urlData } = supabase.storage
            .from('fotos_candidatos')
            .getPublicUrl(rutaArchivo);
            
        fotoUrlFinal = urlData.publicUrl;
    }

    const candidatoData = {
        nombre_completo: document.getElementById('candidato-nombre').value,
        jornada_id: document.getElementById('candidato-jornada').value,
        numero_ficha: document.getElementById('candidato-ficha').value,
        programa_formacion: document.getElementById('candidato-programa').value,
    };

    if (fotoUrlFinal) {
        candidatoData.foto_url = fotoUrlFinal;
    }

    let errorSupabase;

    if (id) {
        const { error } = await supabase.from('candidatos').update(candidatoData).eq('id', id);
        errorSupabase = error;
    } else {
        const { error } = await supabase.from('candidatos').insert([candidatoData]);
        errorSupabase = error;
    }

    btnGuardar.textContent = textoOriginalBtn;
    btnGuardar.disabled = false;

    if (errorSupabase) {
        alert('Hubo un error al guardar: ' + errorSupabase.message);
    } else {
        modalCandidato.classList.add('hidden');
        formCandidato.reset();
        document.getElementById('candidato-id').value = '';
        cargarCandidatos();
    }
});

// ==========================================
// 7. PREPARAR EDICIÓN Y ELIMINACIÓN
// ==========================================
window.prepararEdicion = async (id) => {
    const { data, error } = await supabase.from('candidatos').select('*').eq('id', id).single();
    if (error) {
        alert('Error al buscar el candidato');
        return;
    }
    document.getElementById('candidato-id').value = data.id;
    document.getElementById('candidato-nombre').value = data.nombre_completo;
    document.getElementById('candidato-jornada').value = data.jornada_id;
    document.getElementById('candidato-ficha').value = data.numero_ficha;
    document.getElementById('candidato-programa').value = data.programa_formacion;
    document.getElementById('candidato-foto').value = '';

    tituloModalCandidato.textContent = 'Modificar candidato';
    modalCandidato.classList.remove('hidden');
};

let idCandidatoAEliminar = null;
window.prepararEliminacion = (id) => {
    idCandidatoAEliminar = id;
    modalConfirmacion.classList.remove('hidden');
};

document.getElementById('btn-confirmar-eliminar').addEventListener('click', async () => {
    if (!idCandidatoAEliminar) return;
    const { error } = await supabase.from('candidatos').delete().eq('id', idCandidatoAEliminar);
    if (error) alert('Error al eliminar: ' + error.message);
    else {
        modalConfirmacion.classList.add('hidden');
        idCandidatoAEliminar = null; 
        cargarCandidatos(); 
    }
});

// ==========================================
// 8. TIEMPO REAL
// ==========================================
function activarTiempoReal() {
    supabase
        .channel('cambios-votos')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'candidatos' },
            () => {
                cargarCandidatos();
            }
        )
        .subscribe();
}

// ==========================================
// 9. EXPORTACIÓN DE REPORTES (PDF Y EXCEL)
// ==========================================
async function obtenerDatosParaReporte() {
    const { data, error } = await supabase
        .from('candidatos')
        .select(`nombre_completo, numero_ficha, programa_formacion, votos, jornadas(nombre)`)
        .order('votos', { ascending: false });

    if (error) return null;
    return data.map(cand => ({
        "Nombre": cand.nombre_completo,
        "Ficha": cand.numero_ficha,
        "Programa": cand.programa_formacion,
        "Jornada": cand.jornadas ? cand.jornadas.nombre : 'N/A',
        "Votos": cand.votos
    }));
}

document.getElementById('btn-exportar-pdf').addEventListener('click', async () => {
    const datos = await obtenerDatosParaReporte();
    if (!datos) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(57, 169, 0); 
    doc.text("Reporte de Votaciones SENA", 14, 22);
    doc.autoTable({
        startY: 35,
        head: [['Nombre', 'Ficha', 'Programa', 'Jornada', 'Total Votos']],
        body: datos.map(d => [d.Nombre, d.Ficha, d.Programa, d.Jornada, d.Votos]),
        headStyles: { fillColor: [57, 169, 0] }
    });
    doc.save("Reporte_Votaciones_SENA.pdf");
});

document.getElementById('btn-exportar-excel').addEventListener('click', async () => {
    const datos = await obtenerDatosParaReporte();
    if (!datos) return;
    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
    XLSX.writeFile(workbook, "Reporte_Votaciones_SENA.xlsx");
});

// ==========================================
// LÓGICA EXCLUSIVA PARA LAS JORNADAS
// ==========================================
const formJornada = document.getElementById('form-jornada');
const listaJornadasHTML = document.getElementById('jornadas-lista');

async function cargarListaJornadas() {
    if (!listaJornadasHTML) return;
    listaJornadasHTML.innerHTML = '<div class="cargando">Cargando jornadas...</div>';

    const { data, error } = await supabase.from('jornadas').select('*').order('id', { ascending: true });

    if (error) {
        listaJornadasHTML.innerHTML = '<p>Error al cargar las jornadas.</p>';
        return;
    }

    if (data.length === 0) {
        listaJornadasHTML.innerHTML = '<p>No hay jornadas creadas. Agrega la primera.</p>';
        return;
    }

    let html = `
        <table class="tabla-admin">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre de la Jornada</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(jornada => {
        html += `
            <tr>
                <td>${jornada.id}</td>
                <td><strong>${jornada.nombre}</strong></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    listaJornadasHTML.innerHTML = html;
}

if (formJornada) {
    formJornada.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const btnGuardar = document.getElementById('btn-guardar-jornada');
        const textoOriginal = btnGuardar.textContent;
        btnGuardar.textContent = 'Guardando...';
        btnGuardar.disabled = true;

        const nombreJornada = document.getElementById('jornada-nombre').value;

        const { error } = await supabase
            .from('jornadas')
            .insert([{ nombre: nombreJornada }]);

        btnGuardar.textContent = textoOriginal;
        btnGuardar.disabled = false;

        if (error) {
            alert('Error al guardar la jornada: ' + error.message);
        } else {
            document.getElementById('modal-jornada').classList.add('hidden');
            formJornada.reset();
            
            cargarListaJornadas();
            cargarJornadasSelect(); 
        }
    });
}

// ==========================================
// REINICIAR VOTACIÓN (PONE LOS VOTOS EN 0)
// ==========================================
const btnReiniciarVotacion = document.getElementById('btn-reiniciar-votacion');

if (btnReiniciarVotacion) {
    btnReiniciarVotacion.addEventListener('click', async () => {
        const confirmacion = confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsta acción pondrá todos los votos de los candidatos en 0 y no se puede deshacer.");
        
        if (!confirmacion) return;

        btnReiniciarVotacion.textContent = 'Reiniciando...';
        btnReiniciarVotacion.disabled = true;

        const { error } = await supabase
            .from('candidatos')
            .update({ votos: 0 })
            .neq('id', 0);

        btnReiniciarVotacion.textContent = '🔄 Reiniciar Votación';
        btnReiniciarVotacion.disabled = false;

        if (error) {
            alert('Error al reiniciar la votación: ' + error.message);
        } else {
            alert('¡La votación ha sido reiniciada con éxito! Todos los contadores están en 0.');
            cargarCandidatos(); 
        }
    });
}

// ==========================================
// 10. INICIALIZAR EL PANEL (CON CONTROL DE LOGIN)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Verificamos si ya inició sesión en esta pestaña
    const autorizado = verificarAutenticacion();

    if (autorizado) {
        cargarJornadasSelect();
        cargarListaJornadas();
        cargarCandidatos();
        activarTiempoReal();
    }

    const formLogin = document.getElementById('form-login-admin');
    const inputPassword = document.getElementById('admin-password');
    const mensajeError = document.getElementById('error-login');

    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (inputPassword.value === PASSWORD_ADMIN) {
                sessionStorage.setItem('admin_auth', 'true');
                mensajeError.style.display = 'none';
                
                verificarAutenticacion();
                
                cargarJornadasSelect();
                cargarListaJornadas();
                cargarCandidatos();
                activarTiempoReal();
            } else {
                mensajeError.style.display = 'block';
                inputPassword.value = '';
                inputPassword.focus();
            }
        });
    }
});