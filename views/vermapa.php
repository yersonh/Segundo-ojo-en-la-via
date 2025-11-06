<?php
require_once __DIR__ . '/../config/bootstrap_session.php';
require_once __DIR__ . '/../config/database.php';

if (!isset($_SESSION['usuario_id'])) {
    header("Location: ../../index.php");
    exit();
}

$database = new Database();
$db = $database->conectar();

$query = "SELECT id_tipo_incidente, nombre FROM tipo_incidente ORDER BY nombre";
$stmt = $db->query($query);
$tipos = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Determinar la URL base
$baseUrl = 'https://' . $_SERVER['HTTP_HOST'];
if ($_SERVER['HTTP_HOST'] === 'localhost:8080') {
    $baseUrl = 'http://localhost:8080';
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ojo en la Vía - Reportes</title>
    <link rel="shortcut icon" href="/imagenes/fiveicon.png" type="image/png">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster/dist/MarkerCluster.Default.css" />

    <link rel="stylesheet" href="styles/mapa.css">
    <link rel="stylesheet" href="styles/formulario.css">
</head>
<body>
    <!-- Botón móvil para alternar panel -->
    <button class="mobile-toggle" id="panelToggle">📋 Formulario</button>

    <!-- Contenedor principal -->
    <div class="app-container">
        <!-- Mapa -->
        <div id="map"></div>

        <!-- Panel de formulario -->
        <div id="panel">
            <h2>Registrar Reporte</h2>
            <div class="search-container">
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="🔍 Buscar dirección en Colombia..." autocomplete="off">
                    <button type="button" id="btnBuscar" class="btn-buscar">
                        Buscar
                    </button>
                </div>
                <div id="searchResults" class="search-results"></div>
            </div>

            <div id="alertSuccess" class="alert alert-success"></div>
            <div id="alertError" class="alert alert-error"></div>

            <form id="formReporte" enctype="multipart/form-data" method="POST">
                <label for="tipo">Tipo de incidente:</label>
                <select id="tipo" name="id_tipo_incidente" required>
                    <option value="">Seleccione un tipo...</option>
                    <?php foreach ($tipos as $t): ?>
                        <option value="<?= $t['id_tipo_incidente'] ?>"><?= htmlspecialchars($t['nombre']) ?></option>
                    <?php endforeach; ?>
                </select>

                <label for="descripcion">Descripción:</label>
                <textarea id="descripcion" name="descripcion" rows="3" required></textarea>

                <!-- SECCIÓN DE IMAGEN MEJORADA CON CÁMARA -->
                <div class="campo-imagen">
                    <label for="foto">📸 Fotografía (opcional):</label>

                    <!-- Contenedor de opciones de imagen -->
                    <div class="opciones-imagen">
                        <button type="button" id="btnTomarFoto" class="btn-camara">
                            📸 Tomar Foto
                        </button>
                        <button type="button" id="btnSeleccionarArchivo" class="btn-archivo">
                            📁 Seleccionar Archivo
                        </button>
                    </div>

                    <!-- Input de archivo oculto -->
                    <input type="file" id="foto" name="imagen[]" accept="image/*" multiple style="display: none;">

                    <!-- Previsualización -->
                    <div class="preview">
                        <img id="previewImg" src="" alt="Vista previa" style="display: none;">
                        <div id="sinImagen" class="sin-imagen">
                            📷 No hay imagen seleccionada
                        </div>
                    </div>

                    <!-- Video para la cámara -->
                    <video id="videoCamara" autoplay playsinline style="display: none; width: 100%; border-radius: 8px;"></video>

                    <!-- Controles de cámara -->
                    <div id="controlesCamara" class="controles-camara" style="display: none;">
                        <button type="button" id="btnCapturar" class="btn-capturar">
                            ✅ Capturar Foto
                        </button>
                        <button type="button" id="btnCancelarCamara" class="btn-cancelar">
                            ❌ Cancelar
                        </button>
                    </div>

                    <!-- Canvas oculto para capturar foto -->
                    <canvas id="canvasCaptura" style="display: none;"></canvas>
                </div>

                <label>🗺️ Seleccione ubicación en el mapa:</label>

                <div class="coordenadas">
                    Latitud: <span id="latDisplay">No seleccionada</span><br>
                    Longitud: <span id="lngDisplay">No seleccionada</span>
                </div>

                <input type="hidden" id="latitud" name="latitud">
                <input type="hidden" id="longitud" name="longitud">
                <input type="hidden" id="id_usuario" name="id_usuario" value="<?php echo $_SESSION['usuario_id']; ?>">

                <div class="loading" id="loading">
                    <div class="spinner"></div> Procesando...
                </div>

                <button type="submit" id="submitBtn">Registrar Reporte</button>
            </form>

            <!-- 📝 Sección de Comentarios -->
            <div id="comentariosSection" class="comentarios-section" style="display: none;">
                <h3>💬 Comentarios del Reporte</h3>

                <div class="comentarios-list" id="comentariosList">
                    <!-- Los comentarios se cargarán aquí -->
                </div>

                <form id="formComentario" class="form-comentario">
                    <input type="hidden" id="comentarioIdReporte" name="id_reporte">
                    <input type="hidden" name="id_usuario" value="<?php echo $_SESSION['usuario_id']; ?>">

                    <textarea
                        id="textoComentario"
                        name="comentario"
                        placeholder="Agrega un comentario..."
                        required
                    ></textarea>

                    <button type="submit" id="btnComentario">💬 Comentar</button>
                </form>
            </div>
        </div>
    </div>

<!-- Scripts externos -->
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js"></script>

<!-- Scripts tradicionales -->
<script src="components/ConnectionManager.js"></script>
<!--<script src="components/background-sync-manager.js"></script>-->
<script src="components/Buscador.js"></script>
<script src="components/comentarios.js"></script>

<!-- Módulos ES6 principales -->
<script type="module">
    import { mapaSistema } from './components/mapa/index.js';
    import { formularioSistema } from './components/formulario/index.js';

    window.mapaSistema = mapaSistema;
    window.formularioSistema = formularioSistema;
    window.FormularioManager = formularioSistema;

    document.addEventListener('DOMContentLoaded', async function() {
        try {
            console.log('🚀 Inicializando aplicación con soporte offline...');

            // 1. Inicializar sistema de mapas
            await mapaSistema.inicializar();
            console.log('✅ Sistema de mapas inicializado');

            // 2. Inicializar sistema de formularios
            await formularioSistema.initialize();
            console.log('✅ Sistema de formularios inicializado');

            // 3. Inicializar otros módulos
            if (typeof ComentariosManager !== 'undefined') {
                ComentariosManager.inicializar();
                console.log('✅ ComentariosManager inicializado');
            }

            if (typeof BuscadorManager !== 'undefined') {
                BuscadorManager.inicializar(mapaSistema.getMap());
                console.log('✅ BuscadorManager inicializado');
            }

            // 4. Integrar Connection Manager
            if (window.connectionManager) {
                window.connectionManager.addListener((online) => {
                    formularioSistema.handleConnectionChange(online);
                });
            }

            console.log('🎉 Aplicación completamente inicializada con soporte offline');

        } catch (error) {
            console.error('❌ Error al inicializar la aplicación:', error);

            const alertError = document.getElementById('alertError');
            if (alertError) {
                alertError.textContent = 'Error al cargar la aplicación. Por favor, recarga la página.';
                alertError.style.display = 'block';
            }
        }
    });

</script>

<!-- 🔧 SOLUCIÓN MÍNIMA PARA IMÁGENES HTTPS SOLO EN PRODUCCIÓN -->
<script>
// SOLO corregir imágenes en producción (Railway)
function esProduccion() {
    return window.location.hostname.includes('railway.app') ||
           window.location.hostname.includes('ojo-en-la-via');
}

function corregirImagenesSoloProduccion() {
    // Solo ejecutar en producción
    if (!esProduccion()) {
        console.log('🔧 Modo desarrollo: imágenes sin cambios');
        return;
    }

    console.log('🔧 Corrigiendo imágenes a HTTPS en producción...');

    // Corregir imágenes existentes
    document.querySelectorAll('img').forEach(img => {
        const srcOriginal = img.src;
        if (srcOriginal.startsWith('http://')) {
            img.src = srcOriginal.replace('http://', 'https://');
            console.log('✅ Imagen corregida en producción:', srcOriginal, '→', img.src);
        }
    });

    // Observar cambios futuros solo en producción
    if (esProduccion()) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'IMG' && node.src.startsWith('http://')) {
                            node.src = node.src.replace('http://', 'https://');
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll('img').forEach(img => {
                                if (img.src.startsWith('http://')) {
                                    img.src = img.src.replace('http://', 'https://');
                                }
                            });
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que Leaflet se inicialice
    setTimeout(() => {
        corregirImagenesSoloProduccion();
    }, 1000);
});

// También corregir cuando se cargan reportes en producción
if (window.mapaSistema && esProduccion()) {
    const originalRecargarReportes = window.mapaSistema.recargarReportes;
    if (originalRecargarReportes) {
        window.mapaSistema.recargarReportes = async function() {
            await originalRecargarReportes.call(this);
            setTimeout(corregirImagenesSoloProduccion, 500);
        };
    }
}
</script>

<!-- 🚀 SISTEMA DE ACTUALIZACIÓN DEL SERVICE WORKER -->
<script>
class SWManager {
    static async init() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                console.log('🔍 Monitoreando actualizaciones del SW...');

                // Verificar actualizaciones periódicamente
                setInterval(() => {
                    registration.update();
                }, 5 * 60 * 1000); // Cada 5 minutos

                // Detectar cuando hay nueva versión
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 Nueva versión del Service Worker disponible');
                    const newWorker = registration.installing;

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            this.showUpdateNotification();
                        }
                    });
                });

            } catch (error) {
                console.log('⚠️ No se pudo monitorear actualizaciones:', error);
            }
        }
    }

    static showUpdateNotification() {
        // Notificación discreta - No modal intrusivo
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 10px;
                right: 10px;
                background: #3b82f6;
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 10000;
                font-family: Arial;
                font-size: 14px;
                max-width: 300px;
            ">
                <strong>🔄 Actualización disponible</strong>
                <p style="margin: 5px 0; font-size: 12px;">La aplicación se ha actualizado</p>
                <button onclick="location.reload()" style="
                    background: white;
                    color: #3b82f6;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    margin-right: 5px;
                ">Actualizar</button>
                <button onclick="this.parentElement.remove()" style="
                    background: transparent;
                    color: white;
                    border: 1px solid white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">Cerrar</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-ocultar después de 30 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 30000);
    }
}

// 🛠️ COMANDOS DEBUG - Para forzar actualización cuando hay problemas
window.forceSWUpdate = async function() {
    if ('serviceWorker' in navigator) {
        console.log('🔄 Forzando actualización del Service Worker...');
        const registrations = await navigator.serviceWorker.getRegistrations();

        for (let registration of registrations) {
            await registration.unregister();
            console.log('🗑️ SW eliminado:', registration.scope);
        }

        console.log('✅ Todos los SW eliminados. Recargando...');
        // Limpiar caches también
        if (window.caches) {
            const cacheNames = await window.caches.keys();
            await Promise.all(cacheNames.map(name => window.caches.delete(name)));
        }

        setTimeout(() => {
            location.reload(true); // Forzar recarga sin cache
        }, 1000);
    } else {
        console.log('❌ Service Worker no soportado');
    }
};

// Comando alternativo para recarga forzada
window.hardReload = function() {
    console.log('🔄 Recarga forzada sin cache...');
    location.reload(true);
};

// Inicializar el sistema de actualización cuando la página cargue
document.addEventListener('DOMContentLoaded', () => {
    SWManager.init();
});
</script>

<!-- ============================================= -->
<!-- RECEPTOR DE MENSAJES DESDE PANELINICIO - VERSIÓN MEJORADA -->
<!-- ============================================= -->
<script>
// Agregar estilos dinámicamente para los marcadores temporales
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }

    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
    }

    @keyframes pulse-ring {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
    }

    @keyframes pulseHighlight {
        0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7); }
        70% { box-shadow: 0 0 0 20px rgba(255, 215, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
    }

    @keyframes bounceMarker {
        0%, 20%, 50%, 80%, 100% { transform: scale(1.2) translateY(0); }
        40% { transform: scale(1.3) translateY(-10px); }
        60% { transform: scale(1.25) translateY(-5px); }
    }

    @keyframes slideInPopup {
        0% { opacity: 0; transform: translateY(10px) scale(0.95); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    .report-marker-highlight {
        animation: pulse 1s infinite;
        filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8));
    }

    .temporary-marker-highlight {
        animation: bounce 2s infinite;
        filter: drop-shadow(0 0 10px gold);
        z-index: 10000 !important;
    }

    .temporary-marker-highlight-enhanced {
        z-index: 20000 !important;
    }

    .pulse-ring {
        position: absolute;
        top: -10px;
        left: -10px;
        width: 60px;
        height: 60px;
        border: 3px solid gold;
        border-radius: 50%;
        animation: pulse-ring 2s infinite;
        pointer-events: none;
    }

    .pulse-container {
        position: relative;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .main-pin {
        font-size: 30px;
        filter: drop-shadow(0 0 10px gold);
        z-index: 10;
        position: relative;
    }

    .pulse-ring-1, .pulse-ring-2, .pulse-ring-3 {
        position: absolute;
        top: 0;
        left: 0;
        width: 60px;
        height: 60px;
        border: 3px solid #ffd700;
        border-radius: 50%;
        animation: pulseRing 2s infinite;
    }

    .pulse-ring-2 { animation-delay: 0.66s; }
    .pulse-ring-3 { animation-delay: 1.33s; }

    @keyframes pulseRing {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
    }

    .report-popup-highlight {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 15px;
        border-radius: 10px;
        max-width: 250px;
    }

    .report-popup-highlight h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
    }

    .report-popup-highlight p {
        margin: 4px 0;
        font-size: 12px;
        line-height: 1.3;
    }

    .temporary-popup {
        background: linear-gradient(135deg, #f093fb, #f5576c);
        color: white;
        padding: 15px;
        border-radius: 10px;
        max-width: 250px;
    }

    .temporary-popup h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
    }

    .temporary-popup p {
        margin: 4px 0;
        font-size: 12px;
        line-height: 1.3;
    }

    .temporary-popup em {
        font-size: 11px;
        opacity: 0.9;
    }

    .temporary-popup-enhanced {
        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
        color: white;
        border-radius: 12px;
        max-width: 280px;
    }

    .temporary-popup-enhanced .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 15px;
        border-bottom: 1px solid rgba(255,255,255,0.3);
    }

    .temporary-popup-enhanced .popup-header h4 {
        margin: 0;
        font-size: 16px;
    }

    .badge-temporal {
        background: rgba(255,255,255,0.3);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
    }

    .temporary-popup-enhanced .popup-content {
        padding: 15px;
    }

    .temporary-popup-enhanced .info-note {
        background: rgba(255,255,255,0.2);
        padding: 8px;
        border-radius: 6px;
        margin-top: 10px;
    }

    .highlighted-popup {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 15px;
        border-radius: 10px;
        max-width: 280px;
    }
`;
document.head.appendChild(style);

// En vermapa.php, agregar este código para recibir mensajes desde panelInicio
window.addEventListener('message', function(event) {
    // Verificar que el mensaje viene de nuestro dominio (opcional, por seguridad)
    // if (event.origin !== '<?php echo $baseUrl; ?>') return;

    const message = event.data;
    console.log('📨 Mensaje recibido en mapa:', message);

    if (message.type === 'SHOW_REPORT') {
        mostrarReporteEnMapaDesdePanel(message);
    }
});

// Función para mostrar el reporte en el mapa cuando viene del panel
function mostrarReporteEnMapaDesdePanel(message) {
    console.log('📍 Activando reporte en mapa:', message);

    if (!message.coordinates || !message.coordinates.lat || !message.coordinates.lng) {
        console.error('❌ Coordenadas inválidas');
        return;
    }

    const lat = message.coordinates.lat;
    const lng = message.coordinates.lng;
    const reportId = message.reportId;
    const reportData = message.reportData;

    console.log(`🎯 Objetivo: Reporte ${reportId} en [${lat}, ${lng}]`);

    // Obtener el mapa
    let map = null;
    if (typeof window.mapaSistema !== 'undefined' && window.mapaSistema.getMap) {
        map = window.mapaSistema.getMap();
    } else if (typeof L !== 'undefined' && window.map) {
        map = window.map;
    }

    if (!map) {
        console.error('❌ No hay mapa disponible');
        return;
    }

    // Estrategia PRINCIPAL: Buscar y activar el marcador REAL
    resaltarMarcadorReporte(reportId, lat, lng, reportData);
}

// FUNCIÓN MEJORADA PARA RESALTAR MARCADORES CON SOPORTE PARA CLUSTERS
function resaltarMarcadorReporte(reportId, lat, lng, reportData) {
    console.log('🎯 BUSCANDO REPORTE EN SISTEMA:', reportId);

    let map = null;
    if (typeof window.mapaSistema !== 'undefined' && window.mapaSistema.getMap) {
        map = window.mapaSistema.getMap();
    } else if (typeof L !== 'undefined' && window.map) {
        map = window.map;
    }

    if (!map) {
        console.error('❌ No se pudo obtener el mapa');
        return;
    }

    // PRIMERO: Centrar el mapa en la ubicación
    map.setView([lat, lng], 16);
    console.log('📍 Mapa centrado en:', lat, lng);

    // BUSCAR EL MARCADOR ESPECÍFICO
    let marcadorEncontrado = null;
    let clusterContenedor = null;

    // ESTRATEGIA 1: Buscar en la estructura del MarkerManager
    if (window.mapaSistema && window.mapaSistema.markerManager) {
        const markerManager = window.mapaSistema.markerManager;

        // Buscar en el array de marcadores
        if (markerManager.markers && Array.isArray(markerManager.markers)) {
            for (let item of markerManager.markers) {
                if (item.data && item.data.id_reporte == reportId) {
                    console.log('✅ Marcador encontrado en MarkerManager:', item);
                    marcadorEncontrado = item.marker;
                    break;
                }
            }
        }

        // Si no se encontró, buscar en el markerCluster
        if (!marcadorEncontrado && markerManager.markerCluster) {
            const layers = markerManager.markerCluster.getLayers();
            for (let layer of layers) {
                if (layer.options && layer.options.reportId == reportId) {
                    console.log('✅ Marcador encontrado en markerCluster:', layer);
                    marcadorEncontrado = layer;
                    clusterContenedor = markerManager.markerCluster;
                    break;
                }
            }
        }
    }

    // ESTRATEGIA 2: Buscar en todas las capas del mapa
    if (!marcadorEncontrado) {
        console.log('🔍 Buscando en todas las capas del mapa...');
        const targetLatLng = L.latLng(lat, lng);

        map.eachLayer((layer) => {
            if (marcadorEncontrado) return;

            if (layer instanceof L.Marker) {
                // Buscar por reportId
                if (layer.options && layer.options.reportId == reportId) {
                    console.log('✅ Marcador encontrado por reportId:', layer);
                    marcadorEncontrado = layer;
                    return;
                }

                // Buscar por coordenadas exactas
                const layerLatLng = layer.getLatLng();
                if (layerLatLng) {
                    const distance = targetLatLng.distanceTo(layerLatLng);
                    if (distance < 2) { // Solo 2 metros de tolerancia
                        console.log('✅ Marcador encontrado por coordenadas exactas:', layer);
                        marcadorEncontrado = layer;
                        return;
                    }
                }
            }

            // Buscar en clusters
            if (layer instanceof L.MarkerClusterGroup) {
                console.log('🔍 Examinando cluster group...');
                const layersEnCluster = layer.getLayers();

                for (let clusterLayer of layersEnCluster) {
                    if (clusterLayer.options && clusterLayer.options.reportId == reportId) {
                        console.log('✅ Marcador encontrado en cluster group:', clusterLayer);
                        marcadorEncontrado = clusterLayer;
                        clusterContenedor = layer;
                        return;
                    }
                }
            }
        });
    }

    // ACTIVAR EL MARCADOR ENCONTRADO
    if (marcadorEncontrado) {
        if (clusterContenedor) {
            // Si está en un cluster, expandirlo primero
            console.log('📂 Expandiendo cluster...');
            clusterContenedor.zoomToShowLayer(marcadorEncontrado, function() {
                console.log('✅ Cluster expandido, activando marcador...');
                setTimeout(() => {
                    activarMarcadorConEfectos(marcadorEncontrado, map, reportData);
                }, 800); // Dar tiempo a que se expanda el cluster
            });
        } else {
            // Si no está en cluster, activar directamente
            setTimeout(() => {
                activarMarcadorConEfectos(marcadorEncontrado, map, reportData);
            }, 300);
        }
    } else {
        console.log('❌ Marcador no encontrado en el sistema');
        crearMarcadorTemporalMejorado(lat, lng, reportData, map);
    }
}

// FUNCIÓN MEJORADA PARA ACTIVAR MARCADORES
function activarMarcadorConEfectos(marker, map, reportData) {
    console.log('🎯 ACTIVANDO MARCADOR CON EFECTOS:', marker);

    // 1. Obtener coordenadas exactas
    const markerLatLng = marker.getLatLng();
    if (!markerLatLng) {
        console.error('❌ No se pudieron obtener coordenadas del marcador');
        return;
    }

    // 2. Centrar el mapa con zoom adecuado
    map.setView(markerLatLng, 18); // Zoom más cercano
    console.log('📍 Mapa centrado en marcador con zoom 18');

    // 3. Resaltar visualmente el marcador
    if (marker.setZIndexOffset) {
        marker.setZIndexOffset(10000);
    }

    // 4. Aplicar efectos de animación
    const element = marker.getElement();
    if (element) {
        // Remover cualquier animación previa
        element.style.animation = '';
        element.style.transition = 'all 0.5s ease';

        // Aplicar nueva animación
        element.style.animation = 'pulseHighlight 2s infinite, bounceMarker 1s 3';
        element.style.boxShadow = '0 0 0 8px rgba(255, 215, 0, 0.4), 0 0 20px 10px rgba(255, 165, 0, 0.6)';
        element.style.zIndex = '10000';
        element.style.transform = 'scale(1.2)';

        // Restaurar después de 5 segundos
        setTimeout(() => {
            element.style.animation = '';
            element.style.boxShadow = '';
            element.style.zIndex = '';
            element.style.transform = '';

            if (marker.setZIndexOffset) {
                marker.setZIndexOffset(0);
            }
        }, 5000);
    }

    // 5. Abrir popup con retardo estratégico
    setTimeout(() => {
        if (marker.openPopup) {
            // Forzar que el popup se abra incluso si está en cluster
            marker.openPopup();
            console.log('✅ Popup abierto forzadamente');

            // Asegurarse de que el popup esté visible
            setTimeout(() => {
                const popup = marker.getPopup();
                if (popup && popup.getElement) {
                    const popupElement = popup.getElement();
                    if (popupElement) {
                        popupElement.style.animation = 'slideInPopup 0.5s ease';
                        popupElement.style.zIndex = '10001';
                    }
                }
            }, 100);
        } else if (marker.bindPopup) {
            // Si no tiene popup, crear uno temporal
            const popupContent = `
                <div class="highlighted-popup">
                    <h4>${reportData?.tipo_incidente || 'Reporte'}</h4>
                    <p><strong>Estado:</strong> ${reportData?.estado || 'No especificado'}</p>
                    <p><strong>Descripción:</strong> ${reportData?.descripcion || 'Sin descripción'}</p>
                    <p><em>📍 Navegado desde el feed</em></p>
                </div>
            `;
            marker.bindPopup(popupContent).openPopup();
        }
    }, 1000); // Mayor retardo para asegurar que el cluster esté expandido
}

// FUNCIÓN MEJORADA PARA MARCADOR TEMPORAL
function crearMarcadorTemporalMejorado(lat, lng, reportData, map) {
    console.log('📍 Creando marcador temporal mejorado...');

    // Crear marcador con estilo muy destacado
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'temporary-marker-highlight-enhanced',
            html: `
                <div class="pulse-container">
                    <div class="main-pin">📍</div>
                    <div class="pulse-ring-1"></div>
                    <div class="pulse-ring-2"></div>
                    <div class="pulse-ring-3"></div>
                </div>
            `,
            iconSize: [60, 60],
            iconAnchor: [30, 60]
        }),
        zIndexOffset: 20000
    }).addTo(map);

    // Popup informativo
    const popupContent = `
        <div class="temporary-popup-enhanced">
            <div class="popup-header">
                <h4>${reportData?.tipo_incidente || 'Reporte'}</h4>
                <span class="badge-temporal">TEMPORAL</span>
            </div>
            <div class="popup-content">
                <p><strong>Estado:</strong> ${reportData?.estado || 'No especificado'}</p>
                <p><strong>Descripción:</strong> ${reportData?.descripcion || 'Sin descripción'}</p>
                <p><strong>Usuario:</strong> ${reportData?.usuario || 'Anónimo'}</p>
                <div class="info-note">
                    <small>⚠️ Este es un marcador temporal. El reporte real podría estar agrupado con otros.</small>
                </div>
            </div>
        </div>
    `;

    marker.bindPopup(popupContent).openPopup();

    // Centrar mapa en el marcador temporal
    map.setView([lat, lng], 16);

    // Auto-eliminar después de 10 segundos
    setTimeout(() => {
        if (map && marker) {
            map.removeLayer(marker);
            console.log('🗑️ Marcador temporal eliminado');
        }
    }, 10000);
}

// Función auxiliar para buscar marcador en el mapa
function buscarMarcadorEnMapa(map, reportId, lat, lng, reportData) {
    let marcadorEncontrado = false;

    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            const layerLat = layer.getLatLng().lat;
            const layerLng = layer.getLatLng().lng;

            // Verificar si es el marcador que buscamos (con tolerancia)
            if (Math.abs(layerLat - lat) < 0.0001 && Math.abs(layerLng - lng) < 0.0001) {
                // Resaltar el marcador
                if (layer.setZIndexOffset) {
                    layer.setZIndexOffset(1000);
                }

                // Agregar animación
                const element = layer.getElement();
                if (element) {
                    element.style.animation = 'pulse 1s infinite';
                }

                // Abrir popup si existe
                if (layer.openPopup) {
                    layer.openPopup();
                }

                console.log('✅ Marcador resaltado:', reportId);
                marcadorEncontrado = true;
            }
        }
    });
}

// Función para manejar parámetros URL (fallback)
function procesarParametrosURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const reportId = urlParams.get('reportId');

    if (lat && lng) {
        console.log('📍 Procesando parámetros URL:', { lat, lng, reportId });

        if (typeof window.mapaSistema !== 'undefined' && window.mapaSistema.getMap) {
            const map = window.mapaSistema.getMap();
            if (map) {
                map.setView([parseFloat(lat), parseFloat(lng)], 16);

                if (reportId) {
                    setTimeout(() => {
                        resaltarMarcadorReporte(reportId, parseFloat(lat), parseFloat(lng), {});
                    }, 1000);
                }
            }
        }
    }
}

// Ejecutar al cargar la página para procesar parámetros URL
document.addEventListener('DOMContentLoaded', function() {
    console.log('🗺️ Mapa listo para recibir mensajes del panel');
    procesarParametrosURL();

    // Exponer funciones globalmente para que el panel pueda usarlas
    window.mostrarReporteEnMapa = mostrarReporteEnMapaDesdePanel;
    window.centrarMapaEnCoordenadas = function(lat, lng) {
        if (typeof window.mapaSistema !== 'undefined' && window.mapaSistema.getMap) {
            window.mapaSistema.getMap().setView([lat, lng], 16);
        } else if (typeof L !== 'undefined' && window.map) {
            window.map.setView([lat, lng], 16);
        }
    };
});

// Función auxiliar para debug
window.debugMapa = function() {
    console.log('🔍 Estado del mapa:');
    console.log('- mapaSistema:', window.mapaSistema);
    console.log('- Leaflet:', typeof L);
    console.log('- map:', window.map);
    console.log('- Funciones disponibles:', {
        mostrarReporteEspecifico: typeof window.mostrarReporteEspecifico,
        centrarMapaEnCoordenadas: typeof window.centrarMapaEnCoordenadas,
        resaltarReporte: typeof window.mapaSistema?.resaltarReporte
    });
};

// Función de debug para ver todos los marcadores
window.debugMarcadores = function() {
    console.log('🔍 INICIANDO DEBUG DE MARCADORES');

    let map = null;
    if (typeof window.mapaSistema !== 'undefined' && window.mapaSistema.getMap) {
        map = window.mapaSistema.getMap();
        console.log('✅ Mapa obtenido de mapaSistema');
    } else if (typeof L !== 'undefined' && window.map) {
        map = window.map;
        console.log('✅ Mapa obtenido de window.map');
    } else {
        console.error('❌ No hay mapa disponible');
        return;
    }

    console.log('🗺️ Estado del mapa:', map);
    console.log('📍 Buscando marcadores...');

    let count = 0;
    let markerCount = 0;
    let circleCount = 0;
    let clusterCount = 0;

    map.eachLayer((layer) => {
        count++;

        if (layer instanceof L.Marker) {
            markerCount++;
            const latLng = layer.getLatLng();
            console.log(`📍 Marcador ${markerCount}:`, {
                tipo: 'Marker',
                coordenadas: latLng ? `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}` : 'No disponible',
                reportId: layer.options?.reportId || 'No definido',
                tienePopup: !!layer._popup,
                popupContent: layer._popup?._content ? layer._popup._content.substring(0, 100) + '...' : 'Sin popup',
                enCluster: !!layer.__parent
            });
        }
        else if (layer instanceof L.CircleMarker) {
            circleCount++;
            const latLng = layer.getLatLng();
            console.log(`⭕ CircleMarker ${circleCount}:`, {
                tipo: 'CircleMarker',
                coordenadas: latLng ? `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}` : 'No disponible',
                reportId: layer.options?.reportId || 'No definido'
            });
        }
        else if (layer instanceof L.MarkerClusterGroup) {
            clusterCount++;
            const markers = layer.getLayers();
            console.log(`👥 Cluster Group ${clusterCount}:`, {
                marcadores: markers.length,
                bounds: layer.getBounds()
            });

            // Mostrar marcadores dentro del cluster
            markers.forEach((marker, index) => {
                const markerLatLng = marker.getLatLng();
                console.log(`   └─ Marcador ${index + 1} en cluster:`, {
                    coordenadas: markerLatLng ? `${markerLatLng.lat.toFixed(6)}, ${markerLatLng.lng.toFixed(6)}` : 'No disponible',
                    reportId: marker.options?.reportId || 'No definido'
                });
            });
        }
    });

    console.log(`📊 RESUMEN: ${count} capas totales, ${markerCount} marcadores, ${circleCount} circle markers, ${clusterCount} clusters`);

    // También verificar si hay algún almacenamiento interno
    if (window.mapaSistema && window.mapaSistema._markers) {
        console.log('🗂️ Marcadores en mapaSistema._markers:', Object.keys(window.mapaSistema._markers).length);
    } else {
        console.log('ℹ️ No hay mapaSistema._markers');
    }
};

// Función de debug mejorada para el sistema
window.debugSistemaMapa = function() {
    console.log('🔍 DEBUG COMPLETO DEL SISTEMA DE MAPAS');

    // 1. Información del sistema principal
    console.log('📋 mapaSistema:', window.mapaSistema);

    // 2. Información del MarkerManager
    if (window.mapaSistema && window.mapaSistema.getManager) {
        try {
            const markerManager = window.mapaSistema.getManager('markers');
            console.log('📍 MarkerManager:', markerManager);

            if (markerManager && markerManager._markers) {
                console.log('🗂️ Marcadores en MarkerManager:');
                Object.entries(markerManager._markers).forEach(([id, marker]) => {
                    const latLng = marker.getLatLng();
                    console.log(`   📍 ${id}:`, {
                        coordenadas: latLng ? `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}` : 'N/A',
                        reportId: marker.options?.reportId,
                        idReporte: marker.options?.idReporte,
                        tienePopup: !!marker._popup
                    });
                });
            }
        } catch (error) {
            console.log('⚠️ Error accediendo a MarkerManager:', error);
        }
    }

    // 3. Información del mapa
    let map = window.mapaSistema?.getMap() || window.map;
    if (map) {
        console.log('🗺️ Mapa:', map);
        debugMarcadores(); // Ejecutar el debug original también
    }
};
</script>

</body>
</html>
