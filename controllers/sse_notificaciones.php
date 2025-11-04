<?php
// HEADERS PRIMERO - Sin output antes
header('Content-Type: text/event-stream; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');

// Desactivar buffering
while (ob_get_level() > 0) ob_end_clean();
ini_set('output_buffering', 'off');
ini_set('zlib.output_compression', false);
ignore_user_abort(true);
set_time_limit(0);

// Verificar autenticación
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/bootstrap_session.php';

// Verificar que el usuario esté autenticado
if (!isset($_SESSION['usuario_id'])) {
    sendSSE(['error' => 'Usuario no autenticado'], 'error');
    exit();
}

$id_usuario = $_SESSION['usuario_id'];
$rol_usuario = $_SESSION['rol'] ?? null;

// Función para enviar eventos
function sendSSE($data, $event = 'message') {
    echo "event: $event\n";
    echo "data: " . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";

    // Forzar el flush
    if (ob_get_level() > 0) ob_flush();
    flush();

    // Verificar si el cliente se desconectó
    if (connection_aborted()) {
        exit();
    }
}

// Función para verificar conexión del cliente
function isClientConnected() {
    return connection_status() === CONNECTION_NORMAL && !connection_aborted();
}

try {
    // Conectar a la base de datos
    $database = new Database();
    $db = $database->conectar();

    // Enviar conexión establecida
    sendSSE([
        'type' => 'connected',
        'timestamp' => time(),
        'user_id' => $id_usuario,
        'user_role' => $rol_usuario,
        'message' => 'Conexión SSE establecida'
    ], 'connected');

    // Variables de control
    $start_time = time();
    $max_execution_time = 55; // Railway cierra en 60s

    $lastPing = time();
    $lastNotificationCheck = time();
    $lastAdminCheck = time();

    // 🆕 ALMACENAR EL ÚLTIMO ID DE NOTIFICACIÓN CONOCIDO
    $ultimoIdNotificacion = 0;

    // 🆕 OBTENER EL ÚLTIMO ID DE NOTIFICACIÓN AL INICIAR
    try {
        $sqlUltimoId = "SELECT COALESCE(MAX(id_notificacion), 0) as ultimo_id
                       FROM notificacion
                       WHERE id_usuario_destino = ?";
        $stmtUltimoId = $db->prepare($sqlUltimoId);
        $stmtUltimoId->execute([$id_usuario]);
        $resultUltimoId = $stmtUltimoId->fetch(PDO::FETCH_ASSOC);
        $ultimoIdNotificacion = (int)$resultUltimoId['ultimo_id'];

        error_log("🔔 SSE Inicio: Usuario $id_usuario, último ID: $ultimoIdNotificacion");
    } catch (Exception $e) {
        error_log("❌ Error obteniendo último ID: " . $e->getMessage());
    }

    // Archivo para notificaciones de admin
    $archivoNotificacionAdmin = __DIR__ . '/../temp/ultima_notificacion.json';

    // Bucle principal SSE
    while (true) {
        // Verificar timeout
        if ((time() - $start_time) >= $max_execution_time) {
            sendSSE([
                'type' => 'timeout',
                'message' => 'Reconectando...',
                'timestamp' => time()
            ], 'ping');
            break;
        }

        // Verificar si el cliente se desconectó
        if (!isClientConnected()) {
            error_log("🔌 Cliente desconectado: usuario $id_usuario");
            break;
        }

        // =============================================
        // 1. NOTIFICACIONES PARA USUARIOS NORMALES (likes, comentarios, etc.)
        // =============================================
        if ((time() - $lastNotificationCheck) >= 2) { // ✅ Reducido a 2 segundos
            try {
                // 🆕 CORREGIDO: Buscar notificaciones NUEVAS (con ID mayor al último conocido)
                $sql = "SELECT COUNT(*) as total_nuevas,
                               COALESCE(MAX(id_notificacion), 0) as max_id
                        FROM notificacion
                        WHERE id_usuario_destino = ?
                        AND leida = FALSE
                        AND id_notificacion > ?";

                $stmt = $db->prepare($sql);
                $stmt->execute([$id_usuario, $ultimoIdNotificacion]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                $totalNuevas = (int)$result['total_nuevas'];
                $nuevoMaxId = (int)$result['max_id'];

                if ($totalNuevas > 0) {
                    // 🆕 ACTUALIZAR EL ÚLTIMO ID CONOCIDO
                    $ultimoIdNotificacion = $nuevoMaxId;

                    // Obtener detalles de las notificaciones nuevas
                    $sqlDetalles = "SELECT n.id_notificacion, n.tipo, n.mensaje, n.fecha,
                                           COALESCE(CONCAT(p.nombres, ' ', p.apellidos), 'Sistema') as origen_nombres
                                    FROM notificacion n
                                    LEFT JOIN usuario u ON n.id_usuario_origen = u.id_usuario
                                    LEFT JOIN persona p ON u.id_persona = p.id_persona
                                    WHERE n.id_notificacion > ?
                                    AND n.id_usuario_destino = ?
                                    AND n.leida = FALSE
                                    ORDER BY n.id_notificacion DESC
                                    LIMIT 5";

                    $stmtDetalles = $db->prepare($sqlDetalles);
                    $stmtDetalles->execute([$ultimoIdNotificacion - $totalNuevas, $id_usuario]);
                    $detallesNotificaciones = $stmtDetalles->fetchAll(PDO::FETCH_ASSOC);

                    // Enviar evento de nuevas notificaciones
                    sendSSE([
                        'type' => 'nuevas_notificaciones',
                        'total' => $totalNuevas,
                        'detalles' => $detallesNotificaciones,
                        'timestamp' => time(),
                        'for_user' => true,
                        'ultimo_id' => $ultimoIdNotificacion
                    ], 'notificacion');

                    error_log("🔔 SSE Usuario: $totalNuevas nuevas notificaciones para usuario $id_usuario (IDs hasta: $ultimoIdNotificacion)");
                }

            } catch (Exception $e) {
                error_log("❌ Error verificando notificaciones usuario: " . $e->getMessage());

                // Enviar error al cliente
                sendSSE([
                    'type' => 'error',
                    'message' => 'Error verificando notificaciones',
                    'timestamp' => time()
                ], 'error');
            }

            $lastNotificationCheck = time();
        }

        // =============================================
        // 2. NOTIFICACIONES PARA ADMIN (nuevos reportes)
        // =============================================
        if ($rol_usuario == 1 && (time() - $lastAdminCheck) >= 1) { // ✅ Reducido a 1 segundo
            try {
                if (file_exists($archivoNotificacionAdmin) && is_readable($archivoNotificacionAdmin)) {
                    $content = file_get_contents($archivoNotificacionAdmin);
                    $data = json_decode($content, true);

                    if ($data && is_array($data) && isset($data['timestamp'])) {
                        // Solo enviar si es más reciente que nuestra última verificación
                        if ($data['timestamp'] > $lastAdminCheck) {
                            error_log("🚀 SSE Admin: Enviando notificación de reporte #" . ($data['id_reporte'] ?? 'unknown'));

                            // Enriquecer datos del reporte
                            $sqlReporte = "SELECT r.descripcion, ti.nombre as tipo_incidente,
                                                  CONCAT(p.nombres, ' ', p.apellidos) as usuario_reportador
                                           FROM reporte r
                                           INNER JOIN tipo_incidente ti ON r.id_tipo_incidente = ti.id_tipo_incidente
                                           INNER JOIN usuario u ON r.id_usuario = u.id_usuario
                                           INNER JOIN persona p ON u.id_persona = p.id_persona
                                           WHERE r.id_reporte = ?";

                            $stmtReporte = $db->prepare($sqlReporte);
                            $stmtReporte->execute([$data['id_reporte'] ?? 0]);
                            $infoReporte = $stmtReporte->fetch(PDO::FETCH_ASSOC);

                            if ($infoReporte) {
                                $data = array_merge($data, $infoReporte);
                            }

                            sendSSE($data, 'nuevo_reporte');
                            $lastAdminCheck = $data['timestamp'];

                            // Pequeño delay y eliminar archivo
                            usleep(100000); // 100ms
                            @unlink($archivoNotificacionAdmin);

                            error_log("✅ SSE Admin: Notificación enviada y archivo eliminado");
                        }
                    } else {
                        // Archivo corrupto, eliminar
                        @unlink($archivoNotificacionAdmin);
                        error_log("⚠️ SSE Admin: Archivo corrupto eliminado");
                    }
                }
            } catch (Exception $e) {
                error_log("❌ Error verificando notificaciones admin: " . $e->getMessage());
            }

            $lastAdminCheck = time();
        }

        // =============================================
        // 3. PING PARA MANTENER CONEXIÓN
        // =============================================
        if ((time() - $lastPing) >= 10) { // ✅ Ping cada 10 segundos
            sendSSE([
                'type' => 'ping',
                'timestamp' => time(),
                'user_role' => $rol_usuario,
                'ultimo_id_notificacion' => $ultimoIdNotificacion,
                'memory_usage' => memory_get_usage(true)
            ], 'ping');

            $lastPing = time();

            // Limpiar memoria periódicamente
            if (memory_get_usage(true) > 10 * 1024 * 1024) { // 10MB
                gc_collect_cycles();
            }
        }

        // Esperar breve tiempo entre iteraciones
        usleep(500000); // 0.5 segundos
    }

} catch (Exception $e) {
    error_log("💥 EXCEPCIÓN CRÍTICA en SSE: " . $e->getMessage());

    // Intentar enviar error final
    if (isClientConnected()) {
        sendSSE([
            'error' => $e->getMessage(),
            'type' => 'fatal_error',
            'timestamp' => time()
        ], 'error');
    }
}

error_log("🔚 SSE finalizado para usuario $id_usuario (rol: $rol_usuario) - Tiempo ejecución: " . (time() - $start_time) . "s");
?>
