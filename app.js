// --- 1. CONFIGURACIÓN DE SUPABASE ---
const supabaseUrl = 'https://cqldvxxeplxhfsppyujs.supabase.co';

const supabaseKey = 'sb_publishable_RTmvgTh5XfJcVUw5Vc91HQ_I-O33fiJ';
const db = supabase.createClient(supabaseUrl, supabaseKey);

// --- 2. LÓGICA DEL FORMULARIO DE MOVIMIENTOS (Ingresos/Gastos) ---
document.getElementById('form-movimiento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('tipo-mov').value;
    const monto = parseFloat(document.getElementById('monto-mov').value);
    const descripcion = document.getElementById('desc-mov').value;

    const { error } = await db.from('movimientos').insert([{ tipo, monto, descripcion }]);

    if (error) {
        alert('❌ Error: ' + error.message);
    } else {
        alert('✅ Movimiento guardado');
        document.getElementById('form-movimiento').reset();
        cargarRegistros(); // Actualiza la lista
    }
});

// --- 3. LÓGICA DEL FORMULARIO DE LA ONAT ---
document.getElementById('form-onat').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fecha = document.getElementById('fecha-onat').value;
    const deposito = parseFloat(document.getElementById('deposito-onat').value);
    const impuesto = parseFloat(document.getElementById('pago-onat').value);

    const { error } = await db.from('pagos_onat').insert([{ fecha, deposito, impuesto }]);

    if (error) {
        alert('❌ Error: ' + error.message);
    } else {
        alert('✅ Pago ONAT registrado');
        document.getElementById('form-onat').reset();
        cargarRegistros(); // Actualiza la lista
    }
});

// --- 4. MOSTRAR HISTORIAL Y CALCULAR BALANCE ---
async function cargarRegistros() {
    // Traer movimientos
    const { data: movs } = await db.from('movimientos').select('*').order('id', { ascending: false }).limit(5);
    // Traer pagos ONAT
    const { data: onats } = await db.from('pagos_onat').select('*').order('id', { ascending: false }).limit(5);
    
    const lista = document.getElementById('lista-registros');
    lista.innerHTML = '';

    let totalIngresos = 0;
    let totalGastos = 0;

    if (movs) {
        movs.forEach(m => {
            if(m.tipo === 'ingreso') totalIngresos += m.monto;
            if(m.tipo === 'gasto') totalGastos += m.monto;
            
            const color = m.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400';
            const signo = m.tipo === 'ingreso' ? '+' : '-';
            lista.innerHTML += `
                <div class="bg-slate-800 p-3 rounded-lg flex justify-between items-center shadow">
                    <div>
                        <p class="font-bold text-sm">${m.descripcion}</p>
                        <p class="text-xs text-gray-400">Movimiento</p>
                    </div>
                    <p class="${color} font-bold">${signo} ${m.monto} CUP</p>
                </div>`;
        });
    }

    if (onats) {
        onats.forEach(o => {
            lista.innerHTML += `
                <div class="bg-purple-900 p-3 rounded-lg flex justify-between items-center shadow border border-purple-500">
                    <div>
                        <p class="font-bold text-sm">Pago ONAT</p>
                        <p class="text-xs text-purple-200">Fecha: ${o.fecha}</p>
                    </div>
                    <p class="text-white font-bold text-sm">Dep: ${o.deposito} | Imp: ${o.impuesto}</p>
                </div>`;
        });
    }

    document.getElementById('balance-total').innerText = (totalIngresos - totalGastos).toFixed(2) + ' CUP';
}

// --- 5. SISTEMA DE NOTIFICACIONES (Días 17, 18, 19 y 20) ---
document.getElementById('btn-notificaciones').addEventListener('click', () => {
    if (!("Notification" in window)) {
        alert("Tu teléfono no soporta notificaciones.");
    } else if (Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                alert("¡Recordatorios activados! Te avisaremos los días 17, 18, 19 y 20.");
                programarNotificacion();
            }
        });
    } else {
        alert("Ya tienes las notificaciones activadas.");
    }
});

function programarNotificacion() {
    const ahora = new Date();
    const dia = ahora.getDate();
    
    // Si hoy es 17, 18, 19 o 20, lanza la notificación
    if (dia >= 17 && dia <= 20) {
        new Notification("📊 CifrasTCP - Aviso Importante", {
            body: "¡Es periodo de pago de impuestos a la ONAT! No olvides registrar tu pago en la app.",
            icon: "https://cdn-icons-png.flaticon.com/512/2489/2489756.png"
        });
    }
}

// Cargar datos al abrir la app
cargarRegistros();
setInterval(cargarRegistros, 5000); // Actualiza cada 5 segundos (opcional)
