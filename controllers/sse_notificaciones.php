<?php
// controllers/sse_notificaciones.php - VERSIÓN UNIFICADA

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
    @ob_flush();
    @flush();
}

// Configuración
$max_execution_time = 55; // Railway cierra en 60s
$start_time = time();

// Archivo para notificaciones de admin (reportes nuevos)
$archivoNotificacionAdmin = __DIR__ . '/../temp/ultima_notificacion.json';

try {
    // Conectar a la base de datos
    $database = new Database();
    $db = $database->conectar();

    // Ping inicial
    sendSSE([
        'type' => 'connected',
        'timestamp' => time(),
        'user_id' => $id_usuario,
        'user_role' => $rol_usuario
    ], 'ping');

    $lastCheck = time();
    $lastNotificationCheck = time();
    $lastAdminCheck = time();
    $iteration = 0;

    while (true) {
        $iteration++;

        // Verificar timeout
        if ((time() - $start_time) >= $max_execution_time) {
            sendSSE(['type' => 'timeout', 'message' => 'Reconectando...'], 'ping');
            break;
        }

        // Verificar si el cliente se desconectó
        if (connection_aborted()) {
            break;
        }

        // =============================================
        // 1. NOTIFICACIONES PARA USUARIOS NORMALES (likes, comentarios, etc.)
        // =============================================
        if ((time() - $lastNotificationCheck) >= 3) {
            try {
                // Verificar notificaciones en base de datos para este usuario
                $sql = "SELECT COUNT(*) as total
                        FROM notificacion
                        WHERE id_usuario_destino = ?
                        AND leida = FALSE
                        AND fecha > FROM_UNIXTIME(?)";

                $stmt = $db->prepare($sql);
                $stmt->execute([$id_usuario, $lastNotificationCheck]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($result && $result['total'] > 0) {
                    // Enviar evento de nuevas notificaciones
                    sendSSE([
                        'type' => 'nuevas_notificaciones',
                        'total' => (int)$result['total'],
                        'timestamp' => time(),
                        'for_user' => true
                    ], 'notificacion');

                    error_log("🔔 SSE Usuario: {$result['total']} nuevas notificaciones para usuario $id_usuario");
                }

            } catch (Exception $e) {
                error_log("❌ Error verificando notificaciones usuario: " . $e->getMessage());
            }

            $lastNotificationCheck = time();
        }

        // =============================================
        // 2. NOTIFICACIONES PARA ADMIN (nuevos reportes)
        // =============================================
        if ($rol_usuario == 1 && (time() - $lastAdminCheck) >= 2) {
            try {
                if (file_exists($archivoNotificacionAdmin) && is_readable($archivoNotificacionAdmin)) {
                    $content = file_get_contents($archivoNotificacionAdmin);
                    $data = json_decode($content, true);

                    if ($data && is_array($data) && isset($data['timestamp'])) {
                        // Solo enviar si es más reciente que nuestra última verificación
                        if ($data['timestamp'] > $lastAdminCheck) {
                            error_log("🚀 SSE Admin: Enviando notificación de reporte #" . ($data['id_reporte'] ?? 'unknown'));

                            sendSSE($data, 'nuevo_reporte');
                            $lastAdminCheck = $data['timestamp'];

                            // Pequeño delay y eliminar archivo
                            usleep(500000);
                            @unlink($archivoNotificacionAdmin);
                        }
                    } else {
                        // Archivo corrupto, eliminar
                        @unlink($archivoNotificacionAdmin);
                    }
                }
            } catch (Exception $e) {
                error_log("❌ Error verificando notificaciones admin: " . $e->getMessage());
            }
        }

        // =============================================
        // 3. NOTIFICACIONES GLOBALES (para todos los usuarios)
        // =============================================
        // Aquí puedes agregar notificaciones que deben llegar a todos los usuarios
        // Por ejemplo: anuncios del sistema, mantenimiento, etc.

        // Enviar ping cada 15 segundos para mantener conexión
        if ((time() - $lastCheck) >= 15) {
            sendSSE([
                'type' => 'ping',
                'timestamp' => time(),
                'user_role' => $rol_usuario
            ], 'ping');
            $lastCheck = time();
        }

        sleep(1); // Esperar 1 segundo entre iteraciones
    }

} catch (Exception $e) {
    error_log("💥 EXCEPCIÓN en SSE: " . $e->getMessage());
    sendSSE(['error' => $e->getMessage()], 'error');
}

error_log("🔚 SSE finalizado para usuario $id_usuario (rol: $rol_usuario)");
?>
