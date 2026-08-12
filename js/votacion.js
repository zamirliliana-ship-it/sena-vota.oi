import { supabase } from './supabase.js';

const gridCandidatos = document.getElementById('candidatos-grid');
const mensajeSistema = document.getElementById('mensaje-sistema');
const selectFiltroJornada = document.getElementById('filtro-jornada');

let todosLosCandidatos = [];
let jornadaActualSeleccionada = '';

// ==========================================
// 1. CARGAR JORNADAS EN EL SELECTOR DE FILTRO
// ==========================================
async function cargarJornadasFiltro() {
    const { data, error } = await supabase.from('jornadas').select('*');
    if (error) {
        console.error('Error al cargar jornadas:', error);
        return;
    }
    
    selectFiltroJornada.innerHTML = '<option value="">-- Selecciona una jornada --</option>';
    data.forEach(jornada => {
        selectFiltroJornada.innerHTML += `<option value="${jornada.id}">${jornada.nombre}</option>`;
    });
}

// ==========================================
// 2. CARGAR LOS CANDIDATOS DESDE SUPABASE
// ==========================================
async function cargarCandidatosParaVotar() {
    const { data, error } = await supabase
        .from('candidatos')
        .select(`*, jornadas(nombre)`)
        .order('nombre_completo', { ascending: true });

    if (error) {
        gridCandidatos.innerHTML = `<p>Error al cargar los candidatos. Intenta recargar la página.</p>`;
        console.error(error);
        return;
    }

    todosLosCandidatos = data;
    
    if (jornadaActualSeleccionada) {
        mostrarCandidatosFiltrados(jornadaActualSeleccionada);
    } else {
        gridCandidatos.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #555;">Por favor, selecciona tu jornada arriba para ver los candidatos correspondientes.</p>`;
    }
}

// ==========================================
// 3. RENDERIZAR LAS CARTAS SEGÚN EL FILTRO
// ==========================================
function mostrarCandidatosFiltrados(jornadaIdSeleccionada) {
    jornadaActualSeleccionada = jornadaIdSeleccionada;

    if (!jornadaIdSeleccionada) {
        gridCandidatos.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #555;">Por favor, selecciona tu jornada arriba para ver los candidatos correspondientes.</p>`;
        return;
    }

    const candidatosFiltrados = todosLosCandidatos.filter(c => c.jornada_id == jornadaIdSeleccionada);

    if (candidatosFiltrados.length === 0) {
        gridCandidatos.innerHTML = `<p style="grid-column: 1 / -1; text-align: center;">No hay candidatos registrados para esta jornada.</p>`;
        return;
    }

    gridCandidatos.innerHTML = '';

    candidatosFiltrados.forEach(candidato => {
        const jornada = candidato.jornadas ? candidato.jornadas.nombre : 'Sin asignar';
        const fotoUrl = candidato.foto_url ? candidato.foto_url : 'https://via.placeholder.com/150?text=Sin+Foto';

        const tarjetaHTML = `
            <article class="tarjeta-candidato" tabindex="0">
                <img src="${fotoUrl}" alt="Fotografía del candidato ${candidato.nombre_completo}" class="foto-candidato">
                <div class="info-candidato">
                    <h3>${candidato.nombre_completo}</h3>
                    <p><strong>Programa:</strong> ${candidato.programa_formacion}</p>
                    <p><strong>Ficha:</strong> ${candidato.numero_ficha}</p>
                    <p><strong>Jornada:</strong> ${jornada}</p>
                </div>
                <button 
                    id="btn-votar-${candidato.id}"
                    class="btn btn-primary" 
                    style="width: 100%; margin-top: 1rem;"
                    onclick="window.registrarVoto(${candidato.id}, '${candidato.nombre_completo}', ${jornadaIdSeleccionada})"
                    aria-label="Votar por el candidato ${candidato.nombre_completo}">
                    Votar por ${candidato.nombre_completo}
                </button>
            </article>
        `;
        
        gridCandidatos.innerHTML += tarjetaHTML;
    });
}

selectFiltroJornada.addEventListener('change', (e) => {
    mostrarCandidatosFiltrados(e.target.value);
});

// ==========================================
// 4. LÓGICA PARA REGISTRAR EL VOTO (SIN BLOQUEO)
// ==========================================
window.registrarVoto = async (candidatoId, nombreCandidato, jornadaId) => {
    const btnVotar = document.getElementById(`btn-votar-${candidatoId}`);
    if (btnVotar) {
        btnVotar.textContent = 'Registrando...';
        btnVotar.disabled = true;
    }

    const { data: candidatoActual, error: errorLectura } = await supabase
        .from('candidatos')
        .select('votos')
        .eq('id', candidatoId)
        .single();

    if (errorLectura) {
        mostrarMensaje('Error al procesar el voto. Revisa los permisos (RLS) en Supabase.', 'error');
        if (btnVotar) {
            btnVotar.textContent = `Votar por ${nombreCandidato}`;
            btnVotar.disabled = false;
        }
        return;
    }

    const nuevosVotos = candidatoActual.votos + 1;

    const { error: errorActualizacion } = await supabase
        .from('candidatos')
        .update({ votos: nuevosVotos })
        .eq('id', candidatoId);

    if (errorActualizacion) {
        mostrarMensaje('No se pudo guardar el voto. Verifica la seguridad (RLS) en Supabase.', 'error');
        if (btnVotar) {
            btnVotar.textContent = `Votar por ${nombreCandidato}`;
            btnVotar.disabled = false;
        }
    } else {
        mostrarMensaje(`¡Voto registrado exitosamente para ${nombreCandidato}!`, 'exito');
        
        // Recargamos los datos para refrescar la vista manteniendo los botones activos
        cargarCandidatosParaVotar();
    }
};

// ==========================================
// 5. TIEMPO REAL PARA LA VOTACIÓN
// ==========================================
function activarTiempoRealVotacion() {
    supabase
        .channel('cambios-votos-publicos')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'candidatos' },
            () => {
                cargarCandidatosParaVotar();
            }
        )
        .subscribe();
}

// ==========================================
// 6. MOSTRAR MENSAJES
// ==========================================
function mostrarMensaje(texto, tipo) {
    mensajeSistema.textContent = texto;
    mensajeSistema.className = ''; 
    mensajeSistema.classList.add('mensaje', tipo); 
    
    setTimeout(() => {
        mensajeSistema.classList.add('hidden');
    }, 5000);
}

// ==========================================
// 7. INICIALIZAR AL CARGAR LA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    cargarJornadasFiltro();
    cargarCandidatosParaVotar();
    activarTiempoRealVotacion();
});