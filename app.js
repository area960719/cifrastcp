// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE
// ==========================================
// REEMPLAZA ESTOS TEXTOS CON TUS DATOS REALES DE SUPABASE:
const SUPABASE_URL = 'https://cqldvxxeplxhfsppyujs.supabase.co
'; 
const SUPABASE_KEY = 'sb_publishable_RTmvgTh5XfJcVUw5Vc91HQ_I-O33fiJ
';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 2. ELEMENTOS DEL DOM
// ==========================================
const formMovimiento = document.getElementById('form-movimiento');
const formOnat = document.getElementById('form-onat');
const listaRegistros = document.getElementById('lista-registros');
const balanceTotal = document.getElementById('balance-total');

// ==========================================
// 3. LÓGICA PARA GUARDAR MOVIMIENTOS
// ==========================================
formMovimiento.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const tipo = document.getElementById('tipo-mov').value;
    const monto = parseFloat(document.getElementById('monto-mov').value);
    const descripcion = document.getElementById('desc-mov').value;

    const { error } = await supabaseClient
        .from('movimientos')
        .insert([{ tipo: tipo, monto: monto, descripcion: descripcion }]);

    if (error) {
        alert('Error al guardar movimiento: ' + error.message);
        console.error(error);
    } else {
        alert('¡Movimiento guardado con éxito!');
        formMovimiento.reset();
        cargarDatos(); // Actualiza la lista y el balance
    }
});

// ==========================================
// 4. LÓGICA PARA GUARDAR PAGO ONAT
// ==========================================
formOnat.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fecha = document.getElementById('fecha-onat').value;
    const deposito = parseFloat(document.getElementById('deposito-onat').value);
    // AQUÍ ESTABA EL ERROR: Capturamos el ID 'pago-onat' y lo enviamos a la columna 'monto'
    const monto = parseFloat(document.getElementById('pago-onat').value); 

    const { error } = await supabaseClient
        .from('pagos_onat')
        .insert([{ 
            fecha: fecha, 
            deposito: deposito, 
            monto: monto 
        }]);

    if (error) {
        alert('Error al guardar pago ONAT: ' + error.message);
        console.error(error);
    } else {
        alert('¡Pago ONAT registrado con éxito!');
        formOnat.reset();
        cargarDatos();
    }
});

// ==========================================
// 5. CARGAR DATOS Y CALCULAR BALANCE
// ==========================================
async function cargarDatos() {
    // 1. Traer los movimientos de la base de datos
    const { data: movimientos, error } = await supabaseClient
        .from('movimientos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al cargar datos:', error);
        return;
    }

    // 2. Calcular el balance total
    let balance = 0;
    movimientos.forEach(mov => {
        if (mov.tipo === 'ingreso') {
            balance += Number(mov.monto);
        } else if (mov.tipo === 'gasto') {
            balance -= Number(mov.monto);
        }
    });
    
    // Mostrar balance en pantalla
    balanceTotal.textContent = balance.toFixed(2) + ' CUP';
    
    // Cambiar color del balance (verde si es positivo, rojo si es negativo)
    if (balance < 0) {
        balanceTotal.className = 'text-3xl font-bold text-red-500';
    } else {
        balanceTotal.className = 'text-3xl font-bold text-green-400';
    }

    // 3. Renderizar la lista de últimos registros
    listaRegistros.innerHTML = ''; // Limpiar la lista

    if (movimientos.length === 0) {
        listaRegistros.innerHTML = '<p class="text-gray-500 text-center">No hay movimientos aún.</p>';
        return;
    }

    movimientos.forEach(mov => {
        const esIngreso = mov.tipo === 'ingreso';
        const colorTexto = esIngreso ? 'text-green-400' : 'text-red-400';
        const signo = esIngreso ? '+' : '-';
        
        // Crear el HTML para cada registro
        const div = document.createElement('div');
        div.className = 'bg-slate-800 p-3 rounded-lg flex justify-between items-center border border-slate-700';
        div.innerHTML = `
            <div>
                <p class="font-bold text-white">${mov.descripcion}</p>
                <p class="text-xs text-gray-400">${mov.tipo.toUpperCase()}</p>
            </div>
            <div class="text-right">
                <p class="${colorTexto} font-bold">${signo} ${Number(mov.monto).toFixed(2)} CUP</p>
            </div>
        `;
        listaRegistros.appendChild(div);
    });
}

// ==========================================
// 6. INICIALIZACIÓN
// ==========================================
// Cargar los datos apenas se abre la página
cargarDatos();

// (Opcional) Lógica simple para el botón de notificaciones
document.getElementById('btn-notificaciones').addEventListener('click', () => {
    alert('Función de recordatorios en desarrollo.');
});
