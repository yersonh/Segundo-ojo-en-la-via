<?php
// controllers/sse_notificaciones.php - VERSIÓN CON LOGGING

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

// Verificar token de autenticación
$token = $_GET['token'] ?? '';
if (!$token) {
    sendSSE(['error' => 'Token de autenticación requerido'], 'error');
    exit();
}

// Validar token usando tu estructura existente
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/session_manager.php';

try {
    $usuario = SessionManager::validateSSEToken($token);

    if (!$usuario || $usuario['id_rol'] != 1) {
        sendSSE(['error' => 'No autorizado o token expirado'], 'error');
        exit();
    }

    $id_usuario = $usuario['id_usuario'];

} catch (Exception $e) {
    sendSSE(['error' => 'Error de autenticación: ' . $e->getMessage()], 'error');
    exit();
}

// Función para enviar eventos
function sendSSE($data, $event = 'message') {
    echo "event: $event\n";
    echo "data: " . json_encode($data) . "\n\n";
    @ob_flush();
    @flush();
}

// Configuración para producción
$archivoNotificacion = __DIR__ . '/../temp/ultima_notificacion.json';
$max_execution_time = 55; // Railway cierra en 60s
$start_time = time();

// 🆕 LOGGING INICIAL
error_log("🚀 SSE INICIADO - Archivo: " . $archivoNotificacion);
error_log("📁 Existe archivo: " . (file_exists($archivoNotificacion) ? 'SÍ' : 'NO'));

if (file_exists($archivoNotificacion)) {
    error_log("📁 Permisos archivo: " . substr(sprintf('%o', fileperms($archivoNotificacion)), -4));
    error_log("📁 Legible: " . (is_readable($archivoNotificacion) ? 'SÍ' : 'NO'));
    error_log("📁 Contenido tamaño: " . filesize($archivoNotificacion));
}

try {
    // Ping inicial
    sendSSE(['type' => 'connected', 'timestamp' => time(), 'user_id' => $id_usuario], 'ping');

    $lastCheck = time();
    $iteration = 0;

    while (true) {
        $iteration++;

        // Verificar timeout
        if ((time() - $start_time) >= $max_execution_time) {
            error_log("⏰ SSE Timeout después de " . (time() - $start_time) . " segundos");
            sendSSE(['type' => 'timeout', 'message' => 'Reconectando...'], 'ping');
            break;
        }

        // Verificar si el cliente se desconectó
        if (connection_aborted()) {
            error_log("📞 Cliente desconectado");
            break;
        }

        // Verificar nuevas notificaciones cada 2 segundos
        if ((time() - $lastCheck) >= 2) {
            error_log("🔄 Iteración $iteration - Verificando notificaciones...");

            if (file_exists($archivoNotificacion)) {
                error_log("📖 Archivo de notificación ENCONTRADO");
                error_log("📖 Tamaño: " . filesize($archivoNotificacion) . " bytes");
                error_log("📖 Legible: " . (is_readable($archivoNotificacion) ? 'SÍ' : 'NO'));

                if (!is_readable($archivoNotificacion)) {
                    error_log("❌ ERROR: Archivo no es legible para PHP");
                    $lastCheck = time();
                    sleep(1);
                    continue;
                }

                $content = file_get_contents($archivoNotificacion);
                error_log("📄 Contenido crudo: " . $content);

                $data = json_decode($content, true);

                if ($data && is_array($data)) {
                    error_log("✅ JSON parseado correctamente");
                    error_log("📊 Datos: " . print_r($data, true));

                    if (isset($data['timestamp'])) {
                        error_log("⏰ Timestamp archivo: " . $data['timestamp'] . " vs último check: " . $lastCheck);

                        // Solo enviar si es más reciente que nuestra última verificación
                        if ($data['timestamp'] > $lastCheck) {
                            error_log("🚀 ENVIANDO NOTIFICACIÓN SSE - Reporte #" . ($data['id_reporte'] ?? 'unknown'));
                            sendSSE($data, 'nuevo_reporte');
                            $lastCheck = $data['timestamp'];

                            // Pequeño delay para evitar race conditions, luego eliminar
                            usleep(500000); // 0.5 segundos

                            if (@unlink($archivoNotificacion)) {
                                error_log("🗑️ Archivo de notificación eliminado");
                            } else {
                                error_log("❌ Error eliminando archivo de notificación");
                                $error = error_get_last();
                                error_log("📝 Error details: " . ($error['message'] ?? 'Unknown'));
                            }
                        } else {
                            error_log("ℹ️ Notificación antigua - ignorando");
                        }
                    } else {
                        error_log("❌ JSON no tiene timestamp");
                    }
                } else {
                    error_log("❌ Error parseando JSON: " . json_last_error_msg());
                    // Intentar eliminar archivo corrupto
                    @unlink($archivoNotificacion);
                }
            } else {
                error_log("📭 No hay archivo de notificación");
            }

            $lastCheck = time();
        }

        // Enviar ping cada 25 segundos para mantener conexión
        if ((time() % 25) == 0) {
            error_log("📡 Enviando ping de mantenimiento");
            sendSSE(['type' => 'ping', 'timestamp' => time()], 'ping');
        }

        sleep(1); // Esperar 1 segundo entre iteraciones
    }

} catch (Exception $e) {
    error_log("💥 EXCEPCIÓN en SSE: " . $e->getMessage());
    sendSSE(['error' => $e->getMessage()], 'error');
}

// Limpiar token al desconectar
SessionManager::invalidateToken($token);
error_log("🔚 SSE finalizado");
?>
