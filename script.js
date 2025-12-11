// ============================================================================
// SISTEMA DE GESTIÓN DE BIBLIOTECA IPN - JAVASCRIPT
// IMPLEMENTACIÓN: ÁRBOL BINARIO DE BÚSQUEDA Y BASE DE DATOS EN TEXTO PLANO
// ============================================================================

/* [CLASE FUNDAMENTAL] - NodoLibro */
class NodoLibro {
    constructor(datosLibro) {
        this.datos = datosLibro;
        this.izquierdo = null;
        this.derecho = null;
    }
}

/* [ESTRUCTURA DE DATOS PRINCIPAL] - ArbolInventario */
class ArbolInventario {
    constructor() {
        this.raiz = null;
    }

    insertar(datosLibro) {
        const nuevoNodo = new NodoLibro(datosLibro);
        if (this.raiz === null) {
            this.raiz = nuevoNodo;
            return;
        }
        this._insertarRecursivo(this.raiz, nuevoNodo);
    }

    _insertarRecursivo(nodoActual, nuevoNodo) {
        if (nuevoNodo.datos.numero < nodoActual.datos.numero) {
            if (nodoActual.izquierdo === null) {
                nodoActual.izquierdo = nuevoNodo;
            } else {
                this._insertarRecursivo(nodoActual.izquierdo, nuevoNodo);
            }
        } else {
            if (nodoActual.derecho === null) {
                nodoActual.derecho = nuevoNodo;
            } else {
                this._insertarRecursivo(nodoActual.derecho, nuevoNodo);
            }
        }
    }

    buscarPorTexto(textoBusqueda) {
        const resultados = [];
        const textoNormalizado = textoBusqueda.toLowerCase().trim();
        this._busquedaRecursiva(this.raiz, textoNormalizado, resultados);
        return resultados;
    }

    _busquedaRecursiva(nodo, texto, acumulador) {
        if (nodo === null) return;

        const libro = nodo.datos;
        const cumpleCriterio =
            libro.titulo.toLowerCase().includes(texto) ||
            libro.autor.toLowerCase().includes(texto) ||
            libro.numero.toString().includes(texto);

        if (cumpleCriterio) {
            acumulador.push(libro);
        }

        this._busquedaRecursiva(nodo.izquierdo, texto, acumulador);
        this._busquedaRecursiva(nodo.derecho, texto, acumulador);
    }

    buscarPorId(idLibro) {
        return this._busquedaPorIdRecursiva(this.raiz, idLibro);
    }

    _busquedaPorIdRecursiva(nodo, idBuscado) {
        if (nodo === null) return null;
        if (nodo.datos.id === idBuscado) return nodo.datos;

        const resultadoIzq = this._busquedaPorIdRecursiva(nodo.izquierdo, idBuscado);
        if (resultadoIzq !== null) return resultadoIzq;

        return this._busquedaPorIdRecursiva(nodo.derecho, idBuscado);
    }

    obtenerListaOrdenada() {
        const listaResultado = [];
        this._recorridoInOrder(this.raiz, listaResultado);
        return listaResultado;
    }

    _recorridoInOrder(nodo, acumulador) {
        if (nodo === null) return;
        this._recorridoInOrder(nodo.izquierdo, acumulador);
        acumulador.push(nodo.datos);
        this._recorridoInOrder(nodo.derecho, acumulador);
    }

    reconstruirDesdeArray(arrayLibros) {
        this.raiz = null;
        arrayLibros.forEach(libro => this.insertar(libro));
    }

    eliminarPorId(idLibro) {
        const listadoActual = this.obtenerListaOrdenada();
        const listadoFiltrado = listadoActual.filter(libro => libro.id !== idLibro);
        this.reconstruirDesdeArray(listadoFiltrado);
    }
}

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

let arbolBiblioteca = new ArbolInventario();
let registroPrestamos = [];
let contadorSecuencial = 1;

const COSTO_MULTA_DIA = 10;
const PREFIJO_STORAGE = 'biblioteca_ipn_';

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarSistema();
});

function inicializarSistema() {
    cargarDatosPersistentes();
    vincularEventosDOM();
    actualizarTodasLasVistas();
}

function vincularEventosDOM() {
    document.querySelectorAll('.tab-btn').forEach(boton => {
        boton.addEventListener('click', function() {
            cambiarPestana(this.dataset.tab);
        });
    });

    const formRegistro = document.getElementById('formRegistroLibro');
    const formEdicion = document.getElementById('formEditarLibro');
    const formPrestamo = document.getElementById('formPrestamo');

    if (formRegistro) formRegistro.addEventListener('submit', manejarRegistroLibro);
    if (formEdicion) formEdicion.addEventListener('submit', manejarEdicionLibro);
    if (formPrestamo) formPrestamo.addEventListener('submit', manejarRegistroPrestamo);

    const inputBusqueda = document.getElementById('buscarInventario');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', function() {
            aplicarFiltroInventario(this.value);
        });
    }

    vincularImportadores();
}

function vincularImportadores() {
    const importadores = [
        { id: 'importarRegistros', tipo: 'libros' },
        { id: 'importarInventario', tipo: 'libros' },
        { id: 'importarPrestamos', tipo: 'prestamos' }
    ];
    importadores.forEach(({ id, tipo }) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('change', (e) => procesarImportacion(e, tipo));
        }
    });
}

// ============================================================================
// GESTIÓN DE PESTAÑAS
// ============================================================================

function cambiarPestana(idPestana) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(contenido => contenido.classList.remove('active'));

    const botonActivo = document.querySelector(`[data-tab="${idPestana}"]`);
    const contenidoActivo = document.getElementById(idPestana);

    if (botonActivo) botonActivo.classList.add('active');
    if (contenidoActivo) contenidoActivo.classList.add('active');

    actualizarTodasLasVistas();
}

// ============================================================================
// LÓGICA DE NEGOCIO
// ============================================================================

function manejarRegistroLibro(evento) {
    evento.preventDefault();
    const datos = {
        titulo: document.getElementById('tituloRegistro').value.trim(),
        autor: document.getElementById('autorRegistro').value.trim(),
        editorial: document.getElementById('editorialRegistro').value.trim(),
        categoria: document.getElementById('categoriaRegistro').value,
        anio: document.getElementById('anioRegistro').value
    };

    if (!datos.titulo || !datos.autor) {
        mostrarNotificacion('El título y autor son obligatorios', 'error');
        return;
    }

    const libroNuevo = {
        id: generarIdUnico(),
        numero: contadorSecuencial++,
        titulo: datos.titulo,
        autor: datos.autor,
        editorial: datos.editorial,
        categoria: datos.categoria,
        anio: datos.anio,
        estado: 'Disponible',
        fechaRegistro: obtenerFechaActual()
    };

    arbolBiblioteca.insertar(libroNuevo);
    persistirDatos();
    mostrarNotificacion('Libro registrado exitosamente', 'success');
    document.getElementById('formRegistroLibro').reset();
    actualizarTodasLasVistas();
}

function mostrarRegistros() {
    const contenedor = document.getElementById('listaRegistros');
    if (!contenedor) return;
    const librosOrdenados = arbolBiblioteca.obtenerListaOrdenada();

    if (librosOrdenados.length === 0) {
        contenedor.innerHTML = '<p class="empty">No hay libros registrados en el sistema.</p>';
        return;
    }
    contenedor.innerHTML = librosOrdenados.map(libro => generarTarjetaRegistro(libro)).join('');
}

function generarTarjetaRegistro(libro) {
    return `
        <div class="libro-item">
            <div class="libro-numero">#${libro.numero}</div>
            <div class="libro-info">
                <h3>${sanitizarHTML(libro.titulo)}</h3>
                <p><strong>Autor:</strong> ${sanitizarHTML(libro.autor)}</p>
                <p><strong>Editorial:</strong> ${sanitizarHTML(libro.editorial)}</p>
                <p><strong>Categoría:</strong> ${libro.categoria} | <strong>Año:</strong> ${libro.anio}</p>
                <p class="fecha-registro">Fecha registro: ${libro.fechaRegistro}</p>
            </div>
            <div class="libro-estado">
                <span class="badge ${libro.estado === 'Disponible' ? 'badge-success' : 'badge-warning'}">
                    ${libro.estado}
                </span>
            </div>
        </div>
    `;
}

function mostrarInventario() {
    const contenedor = document.getElementById('listaInventario');
    const contadorTotal = document.getElementById('totalInventario');
    if (!contenedor) return;

    const todosLosLibros = arbolBiblioteca.obtenerListaOrdenada();
    if (contadorTotal) contadorTotal.textContent = todosLosLibros.length;

    if (todosLosLibros.length === 0) {
        contenedor.innerHTML = '<p class="empty">El inventario está vacío.</p>';
        return;
    }
    renderizarListaInventario(todosLosLibros, contenedor);
}

function aplicarFiltroInventario(textoBusqueda) {
    const contenedor = document.getElementById('listaInventario');
    if (!contenedor) return;

    let librosResultado;
    if (!textoBusqueda || textoBusqueda.trim() === '') {
        librosResultado = arbolBiblioteca.obtenerListaOrdenada();
    } else {
        librosResultado = arbolBiblioteca.buscarPorTexto(textoBusqueda);
    }

    if (librosResultado.length === 0) {
        contenedor.innerHTML = '<p class="empty">No se encontraron resultados para la búsqueda.</p>';
        return;
    }
    renderizarListaInventario(librosResultado, contenedor);
}

function renderizarListaInventario(listaLibros, contenedor) {
    contenedor.innerHTML = listaLibros.map(libro => generarTarjetaInventario(libro)).join('');
}

function generarTarjetaInventario(libro) {
    return `
        <div class="inventario-item">
            <div class="inventario-numero">#${libro.numero}</div>
            <div class="inventario-info">
                <h3>${sanitizarHTML(libro.titulo)}</h3>
                <p><strong>Autor:</strong> ${sanitizarHTML(libro.autor)} | <strong>Editorial:</strong> ${sanitizarHTML(libro.editorial)}</p>
                <p><strong>Categoría:</strong> ${libro.categoria} | <strong>Año:</strong> ${libro.anio}</p>
            </div>
            <div class="inventario-estado">
                <span class="badge ${libro.estado === 'Disponible' ? 'badge-success' : 'badge-warning'}">
                    ${libro.estado}
                </span>
            </div>
            <div class="inventario-acciones">
                <button onclick="abrirModalEdicion('${libro.id}')" class="btn btn-sm btn-edit">Editar</button>
                <button onclick="confirmarEliminacion('${libro.id}')" class="btn btn-sm btn-danger">Eliminar</button>
            </div>
        </div>
    `;
}

// ============================================================================
// EDICIÓN Y ELIMINACIÓN
// ============================================================================

function abrirModalEdicion(idLibro) {
    const libro = arbolBiblioteca.buscarPorId(idLibro);
    if (!libro) return;

    document.getElementById('editarId').value = libro.id;
    document.getElementById('editarNumero').value = libro.numero;
    document.getElementById('editarTitulo').value = libro.titulo;
    document.getElementById('editarAutor').value = libro.autor;
    document.getElementById('editarEditorial').value = libro.editorial;
    document.getElementById('editarCategoria').value = libro.categoria;
    document.getElementById('editarAnio').value = libro.anio;

    const modal = document.getElementById('modalEditar');
    if (modal) modal.style.display = 'flex';
}

function cerrarModal() {
    const modal = document.getElementById('modalEditar');
    if (modal) modal.style.display = 'none';
}

function manejarEdicionLibro(evento) {
    evento.preventDefault();
    const idLibro = document.getElementById('editarId').value;
    const libro = arbolBiblioteca.buscarPorId(idLibro);

    if (!libro) return;

    libro.titulo = document.getElementById('editarTitulo').value.trim();
    libro.autor = document.getElementById('editarAutor').value.trim();
    libro.editorial = document.getElementById('editarEditorial').value.trim();
    libro.categoria = document.getElementById('editarCategoria').value;
    libro.anio = document.getElementById('editarAnio').value;

    persistirDatos();
    cerrarModal();
    mostrarNotificacion('Información actualizada correctamente', 'success');
    actualizarTodasLasVistas();
}

function confirmarEliminacion(idLibro) {
    const libro = arbolBiblioteca.buscarPorId(idLibro);
    if (!libro) return;

    if (libro.estado === 'Prestado') {
        mostrarNotificacion('No se puede eliminar un libro que está actualmente prestado', 'error');
        return;
    }

    if (confirm(`¿Está seguro de eliminar "${libro.titulo}" del catálogo?`)) {
        arbolBiblioteca.eliminarPorId(idLibro);
        persistirDatos();
        mostrarNotificacion('Libro eliminado del sistema', 'success');
        actualizarTodasLasVistas();
    }
}

// ============================================================================
// GESTIÓN DE PRÉSTAMOS
// ============================================================================

function manejarRegistroPrestamo(evento) {
    evento.preventDefault();
    const idLibro = document.getElementById('libroSelectPrestamo').value;
    const libro = arbolBiblioteca.buscarPorId(idLibro);

    if (!libro) {
        mostrarNotificacion('Error: libro no seleccionado o no encontrado', 'error');
        return;
    }

    const nuevoPrestamo = {
        id: generarIdUnico(),
        libroId: libro.id,
        libroNumero: libro.numero,
        libroTitulo: libro.titulo,
        nombreUsuario: document.getElementById('nombreUsuario').value.trim(),
        diasPrestamo: parseInt(document.getElementById('diasPrestamo').value),
        cuotaInicial: parseFloat(document.getElementById('cuotaInicial').value) || 0,
        fechaInicio: new Date().toISOString(),
        estado: 'Activo',
        multaTotal: 0
    };

    // Calcular devolución
    const fechaDev = new Date();
    fechaDev.setDate(fechaDev.getDate() + nuevoPrestamo.diasPrestamo);
    nuevoPrestamo.fechaDevolucion = fechaDev.toISOString();

    registroPrestamos.push(nuevoPrestamo);
    libro.estado = 'Prestado';

    persistirDatos();
    mostrarNotificacion('Préstamo registrado exitosamente', 'success');
    document.getElementById('formPrestamo').reset();
    actualizarTodasLasVistas();
}

function mostrarPrestamos() {
    const contenedor = document.getElementById('listaPrestamos');
    const contador = document.getElementById('totalPrestamos');
    if (!contenedor) return;

    const prestamosActivos = registroPrestamos.filter(p => p.estado === 'Activo');
    if (contador) contador.textContent = prestamosActivos.length;

    if (prestamosActivos.length === 0) {
        contenedor.innerHTML = '<p class="empty">No hay préstamos activos.</p>';
        return;
    }
    contenedor.innerHTML = prestamosActivos.map(p => generarTarjetaPrestamo(p)).join('');
    actualizarSelectorLibros();
}

function generarTarjetaPrestamo(prestamo) {
    const diasRetraso = calcularDiasRetraso(prestamo.fechaDevolucion);
    const montoMulta = diasRetraso > 0 ? diasRetraso * COSTO_MULTA_DIA : 0;
    const totalAPagar = prestamo.cuotaInicial + montoMulta;
    const estaAtrasado = diasRetraso > 0;

    return `
        <div class="prestamo-item ${estaAtrasado ? 'prestamo-atrasado' : ''}">
            <div class="prestamo-header">
                <h3>Libro #${prestamo.libroNumero}: ${sanitizarHTML(prestamo.libroTitulo)}</h3>
                <span class="badge ${estaAtrasado ? 'badge-danger' : 'badge-success'}">
                    ${estaAtrasado ? 'ATRASADO' : 'A TIEMPO'}
                </span>
            </div>
            <div class="prestamo-info">
                <p><strong>Usuario:</strong> ${sanitizarHTML(prestamo.nombreUsuario)}</p>
                <p><strong>Inicio:</strong> ${formatearFechaLegible(prestamo.fechaInicio)}</p>
                <p><strong>Devolución prevista:</strong> ${formatearFechaLegible(prestamo.fechaDevolucion)}</p>
                ${estaAtrasado ? `<p class="text-danger"><strong>Días de retraso:</strong> ${diasRetraso}</p>` : ''}
            </div>
            <div class="prestamo-cobro">
                ${prestamo.cuotaInicial > 0 ? `<p><strong>Cuota inicial:</strong> $${prestamo.cuotaInicial.toFixed(2)}</p>` : ''}
                ${montoMulta > 0 ? `<p class="text-danger"><strong>Multa por retraso:</strong> $${montoMulta.toFixed(2)}</p>` : ''}
                ${totalAPagar > 0 ? `<p class="total"><strong>TOTAL A PAGAR:</strong> $${totalAPagar.toFixed(2)}</p>` : '<p class="text-success">Sin adeudo pendiente</p>'}
            </div>
            <button onclick="procesarDevolucion('${prestamo.id}')" class="btn btn-success btn-block">
                Registrar Devolución ${totalAPagar > 0 ? '($' + totalAPagar.toFixed(2) + ')' : ''}
            </button>
        </div>
    `;
}

function mostrarHistorial() {
    const contenedor = document.getElementById('listaHistorial');
    if (!contenedor) return;
    const historial = registroPrestamos.filter(p => p.estado === 'Devuelto');

    if (historial.length === 0) {
        contenedor.innerHTML = '<p class="empty">No hay historial de devoluciones.</p>';
        return;
    }
    contenedor.innerHTML = historial.map(p => generarTarjetaHistorial(p)).join('');
}

function generarTarjetaHistorial(prestamo) {
    return `
        <div class="historial-item">
            <div class="historial-info">
                <h4>Libro #${prestamo.libroNumero}: ${sanitizarHTML(prestamo.libroTitulo)}</h4>
                <p><strong>Usuario:</strong> ${sanitizarHTML(prestamo.nombreUsuario)}</p>
                <p><strong>Período:</strong> ${formatearFechaLegible(prestamo.fechaInicio)} - ${formatearFechaLegible(prestamo.fechaDevolucionReal)}</p>
                ${prestamo.multaTotal > 0
        ? `<p><strong>Total pagado:</strong> $${prestamo.multaTotal.toFixed(2)}</p>`
        : '<p class="text-success">Sin cargos adicionales</p>'}
            </div>
        </div>
    `;
}

function procesarDevolucion(idPrestamo) {
    const prestamo = registroPrestamos.find(p => p.id === idPrestamo);
    if (!prestamo) return;

    const libro = arbolBiblioteca.buscarPorId(prestamo.libroId);

    const diasRetraso = calcularDiasRetraso(prestamo.fechaDevolucion);
    const montoMulta = diasRetraso > 0 ? diasRetraso * COSTO_MULTA_DIA : 0;
    const totalPagar = prestamo.cuotaInicial + montoMulta;

    if (confirm(`¿Confirmar devolución? Total a cobrar: $${totalPagar.toFixed(2)}`)) {
        prestamo.estado = 'Devuelto';
        prestamo.fechaDevolucionReal = new Date().toISOString();
        prestamo.multaTotal = totalPagar;
        if (libro) libro.estado = 'Disponible';

        persistirDatos();
        mostrarNotificacion('Devolución registrada correctamente', 'success');
        actualizarTodasLasVistas();
    }
}

function actualizarSelectorLibros() {
    const selector = document.getElementById('libroSelectPrestamo');
    if (!selector) return;

    const librosDisponibles = arbolBiblioteca.obtenerListaOrdenada().filter(l => l.estado === 'Disponible');

    selector.innerHTML = '<option value="">Seleccione un libro disponible...</option>' +
        librosDisponibles.map(l =>
            `<option value="${l.id}">#${l.numero} - ${sanitizarHTML(l.titulo)}</option>`
        ).join('');
}

// ============================================================================
// IMPORTAR Y EXPORTAR COMO ARCHIVO DE TEXTO PLANO (.TXT)
// ============================================================================

function exportarRegistros() { exportarTexto(arbolBiblioteca.obtenerListaOrdenada(), 'BD_biblioteca'); }
function exportarInventario() { exportarTexto(arbolBiblioteca.obtenerListaOrdenada(), 'inventario'); }
function exportarPrestamos() { exportarTexto(registroPrestamos, 'BD_prestamos'); }

function exportarTexto(data, name) {
    // Convertimos la estructura a texto plano
    const textoPlano = JSON.stringify(data, null, 2);
    // Creamos un Blob de tipo text/plain
    const blob = new Blob([textoPlano], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Forzamos la extensión .txt
    a.download = `${name}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
}

function procesarImportacion(e, tipo) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            // Leemos el contenido del archivo de texto
            const contenidoTexto = event.target.result;
            // Parseamos el texto para convertirlo a estructura de datos
            const data = JSON.parse(contenidoTexto);

            if (tipo === 'libros') {
                if(confirm('¿Cargar base de datos de libros (.txt)? Se reemplazarán los datos actuales.')) {
                    arbolBiblioteca.reconstruirDesdeArray(data);
                    contadorSecuencial = (data.length > 0 ? Math.max(...data.map(l=>l.numero)) : 0) + 1;
                    persistirDatos();
                    actualizarTodasLasVistas();
                    mostrarNotificacion('Base de datos cargada correctamente', 'success');
                }
            } else {
                if(confirm('¿Cargar base de datos de préstamos (.txt)?')) {
                    registroPrestamos = data;
                    persistirDatos();
                    actualizarTodasLasVistas();
                    mostrarNotificacion('Base de datos de préstamos cargada', 'success');
                }
            }
        } catch(err) {
            console.error(err);
            mostrarNotificacion('Error: El archivo de texto no tiene el formato correcto', 'error');
        }
    };
    // Leemos el archivo como texto plano
    reader.readAsText(file);
    e.target.value = '';
}

// ============================================================================
// PERSISTENCIA Y UTILIDADES
// ============================================================================

function persistirDatos() {
    localStorage.setItem(PREFIJO_STORAGE + 'libros', JSON.stringify(arbolBiblioteca.obtenerListaOrdenada()));
    localStorage.setItem(PREFIJO_STORAGE + 'prestamos', JSON.stringify(registroPrestamos));
    localStorage.setItem(PREFIJO_STORAGE + 'contador', contadorSecuencial.toString());
}

function cargarDatosPersistentes() {
    try {
        const l = JSON.parse(localStorage.getItem(PREFIJO_STORAGE + 'libros'));
        if (l) arbolBiblioteca.reconstruirDesdeArray(l);

        const p = JSON.parse(localStorage.getItem(PREFIJO_STORAGE + 'prestamos'));
        if (p) registroPrestamos = p;

        const c = localStorage.getItem(PREFIJO_STORAGE + 'contador');
        if (c) contadorSecuencial = parseInt(c);
    } catch (e) { console.error('Error cargando datos', e); }
}

function actualizarTodasLasVistas() {
    mostrarRegistros();
    mostrarInventario();
    mostrarPrestamos();
    mostrarHistorial();
}

function calcularDiasRetraso(fechaDev) {
    const hoy = new Date();
    const dev = new Date(fechaDev);
    hoy.setHours(0,0,0,0); dev.setHours(0,0,0,0);
    const diff = Math.floor((hoy - dev) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

function generarIdUnico() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
function obtenerFechaActual() { return new Date().toLocaleDateString('es-MX'); }
function formatearFechaLegible(iso) {
    if(!iso) return '-';
    return new Date(iso).toLocaleDateString('es-MX', {year:'numeric', month:'short', day:'numeric'});
}
function sanitizarHTML(str) {
    const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
}
function mostrarNotificacion(msg, tipo) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = `toast ${tipo} show`;
    setTimeout(() => t.className = t.className.replace('show', ''), 3000);
}

window.onclick = function(e) { if(e.target === document.getElementById('modalEditar')) cerrarModal(); }