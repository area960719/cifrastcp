// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://cqldvxxeplxhfsppyujs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RTmvgTh5XfJcVUw5Vc91HQ_I-O33fiJ';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. ELEMENTOS DEL DOM
// ==========================================
const seccionAuth = document.getElementById('seccion-auth');
const contenidoApp = document.getElementById('contenido-app');
const barraUsuario = document.getElementById('barra-usuario');
const usuarioEmail = document.getElementById('usuario-email');
const formAuth = document.getElementById('form-auth');
const btnEntrar = document.getElementById('btn-entrar');
const btnRegistro = document.getElementById('btn-registro');
const btnSalir = document.getElementById('btn-salir');
const mensajeAuth = document.getElementById('auth-mensaje');

const formMovimiento = document.getElementById('form-movimiento');
const btnGuardarMov = document.getElementById('btn-guardar-mov');
const btnCancelarMov = document.getElementById('btn-cancelar-mov');

const formOnat = document.getElementById('form-onat');
const btnGuardarOnat = document.getElementById('btn-guardar-onat');
const btnCancelarOnat = document.getElementById('btn-cancelar-onat');

const listaRegistros = document.getElementById('lista-registros');
const listaOnat = document.getElementById('lista-onat');
const balanceTotal = document.getElementById('balance-total');
const resumenOnat = document.getElementById('resumen-onat');

// Estado
let usuarioActual = null;
let movimientosCache = [];
let pagosCache = [];
let editandoMovId = null;
let editandoOnatId = null;

// ==========================================
// 3. UTILIDADES
// ==========================================
function escapeHtml(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function formatearFecha(fechaIso) {
    // fechaIso viene como "YYYY-MM-DD"
    if (!fechaIso) return '';
    const [anio, mes, dia] = String(fechaIso).split('T')[0].split('-');
    return `${dia}/${mes}/${anio}`;
}

function formatearFechaHora(timestamp) {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('es');
}

function traducirError(mensaje) {
    const m = (mensaje || '').toLowerCase();
    if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
    if (m.includes('already registered')) return 'Ese correo ya está registrado. Usa "Entrar".';
    if (m.includes('email not confirmed')) return 'Debes confirmar tu correo antes de entrar.';
    if (m.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.';
    if (m.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (m.includes('failed to fetch') || m.includes('network')) return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
    return mensaje;
}

function mostrarMensajeAuth(texto, esError = false) {
    mensajeAuth.textContent = texto;
    mensajeAuth.className = 'text-sm mt-3 text-center ' + (esError ? 'text-red-400' : 'text-green-400');
}

// ==========================================
// 4. AUTENTICACIÓN
// ==========================================
formAuth.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    btnEntrar.disabled = true;
    mostrarMensajeAuth('Entrando...');

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    btnEntrar.disabled = false;
    if (error) {
        mostrarMensajeAuth(traducirError(error.message), true);
    } else {
        mostrarMensajeAuth('');
    }
});

btnRegistro.addEventListener('click', async () => {
    if (!formAuth.reportValidity()) return;

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    btnRegistro.disabled = true;
    mostrarMensajeAuth('Creando cuenta...');

    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    btnRegistro.disabled = false;
    if (error) {
        mostrarMensajeAuth(traducirError(error.message), true);
    } else if (!data.session) {
        mostrarMensajeAuth('Cuenta creada. Revisa tu correo para confirmarla y luego pulsa "Entrar".');
    } else {
        mostrarMensajeAuth('');
    }
});

btnSalir.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
});

function manejarSesion(session) {
    if (session && session.user) {
        const mismoUsuario = usuarioActual && usuarioActual.id === session.user.id;
        usuarioActual = session.user;
        if (mismoUsuario) return; // renovación de token, no recargar

        seccionAuth.classList.add('hidden');
        contenidoApp.classList.remove('hidden');
        barraUsuario.classList.remove('hidden');
        usuarioEmail.textContent = session.user.email;
        cargarDatos();
    } else {
        usuarioActual = null;
        movimientosCache = [];
        pagosCache = [];
        terminarEdicionMov();
        terminarEdicionOnat();
        listaRegistros.innerHTML = '';
        listaOnat.innerHTML = '';
        contenidoApp.classList.add('hidden');
        barraUsuario.classList.add('hidden');
        seccionAuth.classList.remove('hidden');
        formAuth.reset();
    }
}

supabaseClient.auth.onAuthStateChange((_evento, session) => {
    // setTimeout evita bloqueos al llamar a Supabase dentro de este callback
    setTimeout(() => manejarSesion(session), 0);
});

// ==========================================
// 5. MOVIMIENTOS: GUARDAR / EDITAR / BORRAR
// ==========================================
formMovimiento.addEventListener('submit', async (e) => {
    e.preventDefault();

    const datos = {
        tipo: document.getElementById('tipo-mov').value,
        monto: parseFloat(document.getElementById('monto-mov').value),
        descripcion: document.getElementById('desc-mov').value
    };

    btnGuardarMov.disabled = true;
    let error;

    if (editandoMovId !== null) {
        ({ error } = await supabaseClient
            .from('movimientos')
            .update(datos)
            .eq('id', editandoMovId));
    } else {
        ({ error } = await supabaseClient
            .from('movimientos')
            .insert([{ ...datos, user_id: usuarioActual.id }]));
    }

    btnGuardarMov.disabled = false;

    if (error) {
        alert('Error al guardar movimiento: ' + error.message);
        console.error(error);
    } else {
        terminarEdicionMov();
        cargarDatos();
    }
});

function iniciarEdicionMov(id) {
    const mov = movimientosCache.find((m) => String(m.id) === String(id));
    if (!mov) return;

    editandoMovId = mov.id;
    document.getElementById('tipo-mov').value = mov.tipo;
    document.getElementById('monto-mov').value = mov.monto;
    document.getElementById('desc-mov').value = mov.descripcion;
    btnGuardarMov.textContent = 'Actualizar Movimiento';
    btnCancelarMov.classList.remove('hidden');
    formMovimiento.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function terminarEdicionMov() {
    editandoMovId = null;
    formMovimiento.reset();
    btnGuardarMov.textContent = 'Guardar Movimiento';
    btnCancelarMov.classList.add('hidden');
}

btnCancelarMov.addEventListener('click', terminarEdicionMov);

async function borrarMovimiento(id) {
    if (!confirm('¿Seguro que quieres borrar este movimiento?')) return;

    const { error } = await supabaseClient.from('movimientos').delete().eq('id', id);
    if (error) {
        alert('Error al borrar: ' + error.message);
        return;
    }
    if (String(editandoMovId) === String(id)) terminarEdicionMov();
    cargarDatos();
}

// ==========================================
// 6. PAGOS ONAT: GUARDAR / EDITAR / BORRAR
// ==========================================
formOnat.addEventListener('submit', async (e) => {
    e.preventDefault();

    const datos = {
        fecha: document.getElementById('fecha-onat').value,
        deposito: parseFloat(document.getElementById('deposito-onat').value),
        monto: parseFloat(document.getElementById('pago-onat').value)
    };

    btnGuardarOnat.disabled = true;
    let error;

    if (editandoOnatId !== null) {
        ({ error } = await supabaseClient
            .from('pagos_onat')
            .update(datos)
            .eq('id', editandoOnatId));
    } else {
        ({ error } = await supabaseClient
            .from('pagos_onat')
            .insert([{ ...datos, user_id: usuarioActual.id }]));
    }

    btnGuardarOnat.disabled = false;

    if (error) {
        alert('Error al guardar pago ONAT: ' + error.message);
        console.error(error);
    } else {
        terminarEdicionOnat();
        cargarDatos();
    }
});

function iniciarEdicionOnat(id) {
    const pago = pagosCache.find((p) => String(p.id) === String(id));
    if (!pago) return;

    editandoOnatId = pago.id;
    document.getElementById('fecha-onat').value = pago.fecha;
    document.getElementById('deposito-onat').value = pago.deposito;
    document.getElementById('pago-onat').value = pago.monto;
    btnGuardarOnat.textContent = 'Actualizar Pago';
    btnCancelarOnat.classList.remove('hidden');
    formOnat.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function terminarEdicionOnat() {
    editandoOnatId = null;
    formOnat.reset();
    btnGuardarOnat.textContent = 'Registrar Pago';
    btnCancelarOnat.classList.add('hidden');
}

btnCancelarOnat.addEventListener('click', terminarEdicionOnat);

async function borrarPagoOnat(id) {
    if (!confirm('¿Seguro que quieres borrar este pago?')) return;

    const { error } = await supabaseClient.from('pagos_onat').delete().eq('id', id);
    if (error) {
        alert('Error al borrar: ' + error.message);
        return;
    }
    if (String(editandoOnatId) === String(id)) terminarEdicionOnat();
    cargarDatos();
}

// ==========================================
// 7. BOTONES EDITAR / BORRAR (delegación de eventos)
// ==========================================
listaRegistros.addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-accion]');
    if (!boton) return;
    const id = boton.dataset.id;
    if (boton.dataset.accion === 'editar') iniciarEdicionMov(id);
    if (boton.dataset.accion === 'borrar') borrarMovimiento(id);
});

listaOnat.addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-accion]');
    if (!boton) return;
    const id = boton.dataset.id;
    if (boton.dataset.accion === 'editar') iniciarEdicionOnat(id);
    if (boton.dataset.accion === 'borrar') borrarPagoOnat(id);
});

// ==========================================
// 8. CARGAR DATOS Y MOSTRAR
// ==========================================
async function cargarDatos() {
    if (!usuarioActual) return;

    const [resMov, resOnat] = await Promise.all([
        supabaseClient.from('movimientos').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('pagos_onat').select('*').order('fecha', { ascending: false })
    ]);

    if (resMov.error) {
        console.error('Error al cargar movimientos:', resMov.error);
        listaRegistros.innerHTML =
            '<p class="text-red-400 text-center">Error al cargar: ' + escapeHtml(resMov.error.message) + '</p>';
    } else {
        movimientosCache = resMov.data;
        mostrarMovimientos();
    }

    if (resOnat.error) {
        console.error('Error al cargar pagos ONAT:', resOnat.error);
        listaOnat.innerHTML =
            '<p class="text-red-400 text-center">Error al cargar: ' + escapeHtml(resOnat.error.message) + '</p>';
    } else {
        pagosCache = resOnat.data;
        mostrarPagosOnat();
    }
}

const ESTILO_BOTON_EDITAR = 'bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-lg';
const ESTILO_BOTON_BORRAR = 'bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-lg';

function mostrarMovimientos() {
    // Balance
    let balance = 0;
    movimientosCache.forEach((mov) => {
        if (mov.tipo === 'ingreso') balance += Number(mov.monto);
        else if (mov.tipo === 'gasto') balance -= Number(mov.monto);
    });

    balanceTotal.textContent = balance.toFixed(2) + ' CUP';
    balanceTotal.className = balance < 0
        ? 'text-3xl font-bold text-red-500'
        : 'text-3xl font-bold text-green-400';

    // Lista
    listaRegistros.innerHTML = '';

    if (movimientosCache.length === 0) {
        listaRegistros.innerHTML = '<p class="text-gray-500 text-center">No hay movimientos aún.</p>';
        return;
    }

    movimientosCache.forEach((mov) => {
        const esIngreso = mov.tipo === 'ingreso';
        const colorTexto = esIngreso ? 'text-green-400' : 'text-red-400';
        const signo = esIngreso ? '+' : '-';

        const div = document.createElement('div');
        div.className = 'bg-slate-800 p-3 rounded-lg border border-slate-700';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-bold text-white">${escapeHtml(mov.descripcion)}</p>
                    <p class="text-xs text-gray-400">${escapeHtml(String(mov.tipo).toUpperCase())} · ${formatearFechaHora(mov.created_at)}</p>
                </div>
                <p class="${colorTexto} font-bold">${signo} ${Number(mov.monto).toFixed(2)} CUP</p>
            </div>
            <div class="flex justify-end gap-2 mt-2">
                <button data-accion="editar" data-id="${escapeHtml(mov.id)}" class="${ESTILO_BOTON_EDITAR}">Editar</button>
                <button data-accion="borrar" data-id="${escapeHtml(mov.id)}" class="${ESTILO_BOTON_BORRAR}">Borrar</button>
            </div>
        `;
        listaRegistros.appendChild(div);
    });
}

function mostrarPagosOnat() {
    const totalDepositado = pagosCache.reduce((suma, p) => suma + Number(p.deposito), 0);
    const totalPagado = pagosCache.reduce((suma, p) => suma + Number(p.monto), 0);

    resumenOnat.textContent = pagosCache.length === 0
        ? ''
        : `Depositado: ${totalDepositado.toFixed(2)} CUP · Pagado: ${totalPagado.toFixed(2)} CUP`;

    listaOnat.innerHTML = '';

    if (pagosCache.length === 0) {
        listaOnat.innerHTML = '<p class="text-gray-500 text-center">No hay pagos ONAT registrados.</p>';
        return;
    }

    pagosCache.forEach((pago) => {
        const div = document.createElement('div');
        div.className = 'bg-slate-800 p-3 rounded-lg border border-slate-700 border-l-4 border-l-purple-500';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-bold text-white">${formatearFecha(pago.fecha)}</p>
                    <p class="text-xs text-gray-400">Depósito: ${Number(pago.deposito).toFixed(2)} CUP</p>
                </div>
                <p class="text-purple-400 font-bold">${Number(pago.monto).toFixed(2)} CUP</p>
            </div>
            <div class="flex justify-end gap-2 mt-2">
                <button data-accion="editar" data-id="${escapeHtml(pago.id)}" class="${ESTILO_BOTON_EDITAR}">Editar</button>
                <button data-accion="borrar" data-id="${escapeHtml(pago.id)}" class="${ESTILO_BOTON_BORRAR}">Borrar</button>
            </div>
        `;
        listaOnat.appendChild(div);
    });
}

// ==========================================
// 9. NOTIFICACIONES (pendiente)
// ==========================================
document.getElementById('btn-notificaciones').addEventListener('click', () => {
    alert('Función de recordatorios en desarrollo.');
});
