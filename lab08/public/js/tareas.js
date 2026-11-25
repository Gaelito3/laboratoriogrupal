console.log("tareas.js cargado correctamente");

// ==========================================
// 1. LÓGICA DEL POMODORO Y GUARDADO EN BD
// ==========================================
let tiempo = 25 * 60;
let timerInterval = null;
let corriendo = false;
let minutosSeleccionados = 25;
const tituloOriginal = document.title;

// Escuchar cambios en el input de minutos
const inputMinutos = document.getElementById('minutosConfig');
if (inputMinutos) {
    inputMinutos.addEventListener('change', (e) => {
        if (corriendo) {
            alert("Pausa el temporizador para cambiar el tiempo.");
            e.target.value = minutosSeleccionados;
            return;
        }
        minutosSeleccionados = parseInt(e.target.value) || 25;
        tiempo = minutosSeleccionados * 60;
        actualizarDisplay();
    });
}

function actualizarDisplay() {
    const min = String(Math.floor(tiempo / 60)).padStart(2, '0');
    const seg = String(tiempo % 60).padStart(2, '0');
    const timerElement = document.getElementById('timer');
    if (timerElement) timerElement.textContent = `${min}:${seg}`;
}

function sonarAlarma() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.connect(ctx.destination);
        osc.start();
        setTimeout(() => osc.stop(), 800);
    } catch (e) {
        console.log("Audio no soportado");
    }
}

async function guardarPomodoroEnBD(duracion) {
    try {
        const response = await fetch('/api/pomodoros', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duracion: duracion })
        });
        if (response.ok) {
            console.log("Pomodoro guardado en la base de datos");
        }
    } catch (error) {
        console.error("Error guardando pomodoro", error);
    }
}

const btnStart = document.getElementById('btnStart');
if (btnStart) {
    btnStart.addEventListener('click', async () => {
        if (corriendo) {
            clearInterval(timerInterval);
            document.title = tituloOriginal;
            
            // Si se pausa antes de tiempo, calculamos cuánto tiempo pasó
            const tiempoRestante = tiempo;
            const tiempoTranscurrido = (minutosSeleccionados * 60) - tiempoRestante;
            const minutosTranscurridos = Math.round(tiempoTranscurrido / 60);
            
            if (minutosTranscurridos > 0) {
                await guardarPomodoroEnBD(minutosTranscurridos);
                alert(`Has trabajado ${minutosTranscurridos} minutos. ¡Progreso guardado!`);
            }
            
            // Reiniciar el tiempo
            tiempo = minutosSeleccionados * 60;
            actualizarDisplay();

        } else {
            timerInterval = setInterval(async () => {
                if (tiempo <= 0) { 
                    clearInterval(timerInterval); 
                    corriendo = false;
                    sonarAlarma();
                    alert(`¡Tiempo completado! Has terminado un Pomodoro de ${minutosSeleccionados} minutos.`);
                    document.title = tituloOriginal;
                    
                    // Guardar en la base de datos
                    await guardarPomodoroEnBD(minutosSeleccionados);
                    
                    tiempo = minutosSeleccionados * 60;
                    actualizarDisplay();
                    return; 
                }
                tiempo--;
                actualizarDisplay();
                document.title = `⏱️ ${document.getElementById('timer').textContent} - Enfoque`;
            }, 1000);
        }
        corriendo = !corriendo;
    });
}

// ==========================================
// 2. LÓGICA DEL TO-DO LIST Y BARRA PROGRESO
// ==========================================
const formTarea = document.getElementById('formTarea');
const listaTareas = document.getElementById('listaTareas');

async function cargarTareas() {
    if (!listaTareas) return;
    
    try {
        const response = await fetch('/api/tareas', { credentials: 'same-origin' });
        
        if (response.status === 401) return window.location.href = 'login.html';
        if (!response.ok) throw new Error('Error en el servidor');

        const tareas = await response.json();
        listaTareas.innerHTML = '';

        // CÁLCULO DE LA BARRA DE PROGRESO
        const total = tareas.length;
        const completadas = tareas.filter(t => t.completada).length;
        const porcentaje = total === 0 ? 0 : Math.round((completadas / total) * 100);
        
        const barra = document.getElementById('barraProgreso');
        const texto = document.getElementById('textoProgreso');
        if(barra && texto) {
            barra.style.width = `${porcentaje}%`;
            texto.textContent = `${porcentaje}% (${completadas}/${total})`;
        }

        if (tareas.length === 0) {
            listaTareas.innerHTML = '<p>No hay tareas pendientes. ¡A trabajar!</p>';
            return;
        }

        tareas.forEach(tarea => {
            const div = document.createElement('div');
            div.className = 'tarea-item';
            div.innerHTML = `
                <span class="${tarea.completada ? 'completada' : ''}">${tarea.titulo}</span>
                <div>
                    <button class="btn-accion btn-completar" onclick="completarTarea(${tarea.id}, '${tarea.titulo.replace(/'/g, "\\'")}', ${tarea.completada})">
                        ${tarea.completada ? 'Deshacer' : 'Completar'}
                    </button>
                    <button class="btn-accion btn-eliminar" onclick="eliminarTarea(${tarea.id})">X</button>
                </div>
            `;
            listaTareas.appendChild(div);
        });
    } catch (error) {
        console.error("Error:", error);
        listaTareas.innerHTML = `<p style="color:red;">Error al cargar: ${error.message}</p>`;
    }
}

if (formTarea) {
    formTarea.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titulo = document.getElementById('titulo').value;
        try {
            const response = await fetch('/api/tareas', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo: titulo })
            });
            if (response.ok) {
                document.getElementById('titulo').value = '';
                cargarTareas();
                cargarEstadisticas();
            }
        } catch (error) { alert("Error al guardar la tarea"); }
    });
}

async function completarTarea(id, titulo, estadoActual) {
    await fetch(`/api/tareas/${id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo, completada: !estadoActual })
    });
    cargarTareas();
    cargarEstadisticas();
}

async function eliminarTarea(id) {
    if (!confirm('¿Seguro que deseas eliminar esta tarea?')) return;
    await fetch(`/api/tareas/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    cargarTareas();
    cargarEstadisticas();
}

// ==========================================
// 3. LÓGICA DEL DASHBOARD (CHART.JS)
// ==========================================
let miGrafico = null; 

async function cargarEstadisticas() {
    const canvas = document.getElementById('graficoTareas');
    if (!canvas) return; // Si no estamos en la página que tiene el gráfico, no hacer nada

    try {
        const response = await fetch('/api/tareas/estadisticas', { credentials: 'same-origin' });
        if (!response.ok) return;
        
        const data = await response.json();

        document.getElementById('statTotal').textContent = data.total;
        document.getElementById('statCompletadas').textContent = data.completadas;
        document.getElementById('statPendientes').textContent = data.total - data.completadas;

        const etiquetas = data.porDia.map(item => item.dia);
        const valores = data.porDia.map(item => item.cantidad);

        const ctx = canvas.getContext('2d');
        
        if (miGrafico) {
            miGrafico.destroy();
        }

        miGrafico = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: etiquetas,
                datasets: [{
                    label: 'Tareas completadas por día',
                    data: valores,
                    backgroundColor: 'rgba(37, 99, 235, 0.6)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    } catch (error) {
        console.error("Error al cargar estadísticas:", error);
    }
}

// ==========================================
// 4. CERRAR SESIÓN E INICIALIZACIÓN
// ==========================================
const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        window.location.href = 'login.html';
    });
}

// Iniciar todo al cargar la página
cargarTareas();
cargarEstadisticas();
