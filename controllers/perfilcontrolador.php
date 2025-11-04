<?php
require_once __DIR__ . '/../config/bootstrap_session.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';

$action = $_GET['action'] ?? '';

try {
    $database = new Database();
    $db = $database->conectar();

    // Verificar sesión
    $id_usuario = $_SESSION['usuario_id'] ?? null;

    switch ($action) {
        // 🔔 Obtener nuevas notificaciones para el usuario actual
        case 'obtener_nuevas':
            if (!$id_usuario) {
                echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
                break;
            }

            $ultima_verificacion = $_GET['ultima_verificacion'] ?? null;

            $sql = "SELECT n.*,
                        COALESCE(CONCAT(p.nombres, ' ', p.apellidos), 'Sistema') as origen_nombres,
                        r.descripcion as reporte_descripcion
                    FROM notificacion n
                    LEFT JOIN usuario uo ON n.id_usuario_origen = uo.id_usuario
                    LEFT JOIN persona p ON uo.id_persona = p.id_persona
                    LEFT JOIN reporte r ON n.id_reporte = r.id_reporte
                    WHERE n.id_usuario_destino = :id_usuario
                    AND n.leida = FALSE";

            $params = [':id_usuario' => $id_usuario];

            if ($ultima_verificacion) {
                $sql .= " AND n.fecha > FROM_UNIXTIME(:ultima_verificacion)";
                $params[':ultima_verificacion'] = $ultima_verificacion;
            }

            $sql .= " ORDER BY n.fecha DESC LIMIT 10";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $notificaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $sqlCount = "SELECT COUNT(*) as total FROM notificacion
                        WHERE id_usuario_destino = :id_usuario AND leida = FALSE";
            $stmtCount = $db->prepare($sqlCount);
            $stmtCount->execute([':id_usuario' => $id_usuario]);
            $total = $stmtCount->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'notificaciones' => $notificaciones,
                'total_nuevas' => $total['total']
            ]);
            break;

        // ✅ Marcar una notificación como leída
        case 'marcar_leida':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                echo json_encode(['success' => false, 'error' => 'Método no permitido']);
                break;
            }

            $id_notificacion = $_POST['id_notificacion'] ?? null;

            if (!$id_notificacion || !is_numeric($id_notificacion)) {
                echo json_encode(['success' => false, 'error' => 'ID de notificación requerido']);
                break;
            }

            // Verificar que la notificación pertenece al usuario
            if ($id_usuario) {
                $sqlCheck = "SELECT id_notificacion FROM notificacion
                           WHERE id_notificacion = :id_notif AND id_usuario_destino = :id_usuario";
                $stmtCheck = $db->prepare($sqlCheck);
                $stmtCheck->execute([':id_notif' => $id_notificacion, ':id_usuario' => $id_usuario]);

                if (!$stmtCheck->fetch()) {
                    echo json_encode(['success' => false, 'error' => 'Notificación no encontrada']);
                    break;
                }
            }

            $sql = "UPDATE notificacion SET leida = TRUE
                    WHERE id_notificacion = :id_notificacion";
            $stmt = $db->prepare($sql);
            $stmt->execute([':id_notificacion' => $id_notificacion]);

            echo json_encode(['success' => true, 'mensaje' => 'Notificación marcada como leída']);
            break;

        // ✅ Marcar todas como leídas
        case 'marcar_todas_leidas':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                echo json_encode(['success' => false, 'error' => 'Método no permitido']);
                break;
            }

            if (!$id_usuario) {
                echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
                break;
            }

            $sql = "UPDATE notificacion SET leida = TRUE
                    WHERE id_usuario_destino = :id_usuario AND leida = FALSE";
            $stmt = $db->prepare($sql);
            $stmt->execute([':id_usuario' => $id_usuario]);

            echo json_encode(['success' => true, 'mensaje' => 'Todas las notificaciones marcadas como leídas']);
            break;

        // 📋 LISTAR NOTIFICACIONES PARA EL USUARIO
        case 'listar':
            if (!$id_usuario) {
                echo json_encode(['success' => false, 'error' => 'Usuario no autenticado']);
                break;
            }

            $query = "
                SELECT
                    n.id_notificacion,
                    n.tipo,
                    n.mensaje,
                    n.leida,
                    n.fecha,
                    n.id_reporte,
                    COALESCE(CONCAT(po.nombres, ' ', po.apellidos), 'Sistema') as origen_nombres,
                    r.descripcion as reporte_descripcion
                FROM notificacion n
                LEFT JOIN usuario uo ON n.id_usuario_origen = uo.id_usuario
                LEFT JOIN persona po ON uo.id_persona = po.id_persona
                LEFT JOIN reporte r ON n.id_reporte = r.id_reporte
                WHERE n.id_usuario_destino = :id_usuario
                ORDER BY n.fecha DESC
                LIMIT 50
            ";

            $stmt = $db->prepare($query);
            $stmt->execute([':id_usuario' => $id_usuario]);
            $notificaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode($notificaciones);
            break;

        // 🔢 CONTAR NOTIFICACIONES NO LEÍDAS
        case 'contar_no_leidas':
            try {
                if (!$id_usuario) {
                    echo json_encode(['success' => true, 'total_no_leidas' => 0]);
                    break;
                }

                $sql = "SELECT COUNT(*) as total_no_leidas
                        FROM notificacion
                        WHERE id_usuario_destino = ? AND leida = FALSE";
                $stmt = $db->prepare($sql);
                $stmt->execute([$id_usuario]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'total_no_leidas' => (int)$result['total_no_leidas']
                ]);

            } catch (PDOException $e) {
                error_log("Error contando notificaciones no leídas: " . $e->getMessage());
                echo json_encode([
                    'success' => false,
                    'total_no_leidas' => 0,
                    'error' => 'Error del servidor'
                ]);
            }
            break;

        // ❤️ NOTIFICAR LIKE
        case 'notificar_like':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                echo json_encode(['success' => false, 'error' => 'Método no permitido']);
                break;
            }

            $id_reporte = $_POST['id_reporte'] ?? null;
            $id_usuario_origen = $_POST['id_usuario_origen'] ?? null;
            $id_usuario_destino = $_POST['id_usuario_destino'] ?? null;

            if (!$id_reporte || !$id_usuario_origen || !$id_usuario_destino) {
                echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
                break;
            }

            // Evitar auto-notificaciones
            if ($id_usuario_origen == $id_usuario_destino) {
                echo json_encode(['success' => true, 'mensaje' => 'No se notifica like propio']);
                break;
            }

            try {
                // Obtener información del reporte
                $sqlReporte = "SELECT descripcion FROM reporte WHERE id_reporte = ?";
                $stmtReporte = $db->prepare($sqlReporte);
                $stmtReporte->execute([$id_reporte]);
                $reporte = $stmtReporte->fetch(PDO::FETCH_ASSOC);

                // Obtener nombre del usuario que dio like
                $sqlUsuario = "SELECT p.nombres, p.apellidos
                              FROM usuario u
                              INNER JOIN persona p ON u.id_persona = p.id_persona
                              WHERE u.id_usuario = ?";
                $stmtUsuario = $db->prepare($sqlUsuario);
                $stmtUsuario->execute([$id_usuario_origen]);
                $usuario = $stmtUsuario->fetch(PDO::FETCH_ASSOC);

                $nombre_usuario = $usuario ? trim($usuario['nombres'] . ' ' . $usuario['apellidos']) : 'Alguien';
                $descripcion_corta = $reporte ? (strlen($reporte['descripcion']) > 50 ?
                    substr($reporte['descripcion'], 0, 50) . '...' : $reporte['descripcion']) : 'tu reporte';

                $mensaje = "👍 {$nombre_usuario} le dio like a tu reporte: \"{$descripcion_corta}\"";

                $sqlInsert = "INSERT INTO notificacion
                            (id_usuario_destino, id_usuario_origen, id_reporte, tipo, mensaje)
                            VALUES (?, ?, ?, 'like', ?)";
                $stmtInsert = $db->prepare($sqlInsert);
                $stmtInsert->execute([$id_usuario_destino, $id_usuario_origen, $id_reporte, $mensaje]);

                echo json_encode(['success' => true, 'mensaje' => 'Notificación de like creada']);

            } catch (Exception $e) {
                error_log("Error notificando like: " . $e->getMessage());
                echo json_encode(['success' => false, 'error' => 'Error creando notificación']);
            }
            break;

        // 💬 NOTIFICAR COMENTARIO
        case 'notificar_comentario':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                echo json_encode(['success' => false, 'error' => 'Método no permitido']);
                break;
            }

            $id_reporte = $_POST['id_reporte'] ?? null;
            $id_usuario_origen = $_POST['id_usuario_origen'] ?? null;
            $id_usuario_destino = $_POST['id_usuario_destino'] ?? null;

            if (!$id_reporte || !$id_usuario_origen || !$id_usuario_destino) {
                echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
                break;
            }

            // Evitar auto-notificaciones
            if ($id_usuario_origen == $id_usuario_destino) {
                echo json_encode(['success' => true, 'mensaje' => 'No se notifica comentario propio']);
                break;
            }

            try {
                // Obtener información del reporte
                $sqlReporte = "SELECT descripcion FROM reporte WHERE id_reporte = ?";
                $stmtReporte = $db->prepare($sqlReporte);
                $stmtReporte->execute([$id_reporte]);
                $reporte = $stmtReporte->fetch(PDO::FETCH_ASSOC);

                // Obtener nombre del usuario que comentó
                $sqlUsuario = "SELECT p.nombres, p.apellidos
                            FROM usuario u
                            INNER JOIN persona p ON u.id_persona = p.id_persona
                            WHERE u.id_usuario = ?";
                $stmtUsuario = $db->prepare($sqlUsuario);
                $stmtUsuario->execute([$id_usuario_origen]);
                $usuario = $stmtUsuario->fetch(PDO::FETCH_ASSOC);

                $nombre_usuario = $usuario ? trim($usuario['nombres'] . ' ' . $usuario['apellidos']) : 'Alguien';
                $descripcion_corta = $reporte ? (strlen($reporte['descripcion']) > 50 ?
                    substr($reporte['descripcion'], 0, 50) . '...' : $reporte['descripcion']) : 'tu reporte';

                $mensaje = "💬 {$nombre_usuario} comentó en tu reporte: \"{$descripcion_corta}\"";

                $sqlInsert = "INSERT INTO notificacion
                            (id_usuario_destino, id_usuario_origen, id_reporte, tipo, mensaje)
                            VALUES (?, ?, ?, 'comentario', ?)";
                $stmtInsert = $db->prepare($sqlInsert);
                $stmtInsert->execute([$id_usuario_destino, $id_usuario_origen, $id_reporte, $mensaje]);

                echo json_encode(['success' => true, 'mensaje' => 'Notificación de comentario creada']);

            } catch (Exception $e) {
                error_log("Error notificando comentario: " . $e->getMessage());
                echo json_encode(['success' => false, 'error' => 'Error creando notificación']);
            }
            break;

        // 📢 NOTIFICAR NUEVO REPORTE A OTROS USUARIOS
        case 'notificar_nuevo_reporte_usuario':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                echo json_encode(['success' => false, 'error' => 'Método no permitido']);
                break;
            }

            $id_reporte = $_POST['id_reporte'] ?? null;
            $id_usuario_origen = $_POST['id_usuario_origen'] ?? null;

            if (!$id_reporte || !$id_usuario_origen) {
                echo json_encode(['success' => false, 'error' => 'Datos incompletos']);
                break;
            }

            try {
                // Obtener información del reporte
                $sqlReporte = "SELECT r.descripcion, ti.nombre as tipo_incidente
                            FROM reporte r
                            INNER JOIN tipo_incidente ti ON r.id_tipo_incidente = ti.id_tipo_incidente
                            WHERE r.id_reporte = ?";
                $stmtReporte = $db->prepare($sqlReporte);
                $stmtReporte->execute([$id_reporte]);
                $reporte = $stmtReporte->fetch(PDO::FETCH_ASSOC);

                // Obtener nombre del usuario que creó el reporte
                $sqlUsuario = "SELECT p.nombres, p.apellidos
                            FROM usuario u
                            INNER JOIN persona p ON u.id_persona = p.id_persona
                            WHERE u.id_usuario = ?";
                $stmtUsuario = $db->prepare($sqlUsuario);
                $stmtUsuario->execute([$id_usuario_origen]);
                $usuario = $stmtUsuario->fetch(PDO::FETCH_ASSOC);

                $nombre_usuario = $usuario ? trim($usuario['nombres'] . ' ' . $usuario['apellidos']) : 'Un usuario';
                $tipo_incidente = $reporte['tipo_incidente'] ?? 'incidente';
                $descripcion_corta = $reporte ? (strlen($reporte['descripcion']) > 50 ?
                    substr($reporte['descripcion'], 0, 50) . '...' : $reporte['descripcion']) : 'nuevo reporte';

                $mensaje = "📢 {$nombre_usuario} reportó un {$tipo_incidente}: \"{$descripcion_corta}\"";

                // Notificar a todos los usuarios activos (excepto al que creó el reporte)
                $sqlUsuarios = "SELECT id_usuario FROM usuario WHERE id_estado = 1 AND id_usuario != ?";
                $stmtUsuarios = $db->prepare($sqlUsuarios);
                $stmtUsuarios->execute([$id_usuario_origen]);
                $usuarios = $stmtUsuarios->fetchAll(PDO::FETCH_ASSOC);

                $notificaciones_creadas = 0;

                foreach ($usuarios as $usuario_destino) {
                    $sqlInsert = "INSERT INTO notificacion
                                (id_usuario_destino, id_usuario_origen, id_reporte, tipo, mensaje)
                                VALUES (?, ?, ?, 'nuevo_reporte_usuario', ?)";
                    $stmtInsert = $db->prepare($sqlInsert);
                    $stmtInsert->execute([
                        $usuario_destino['id_usuario'],
                        $id_usuario_origen,
                        $id_reporte,
                        $mensaje
                    ]);
                    $notificaciones_creadas++;
                }

                echo json_encode([
                    'success' => true,
                    'mensaje' => "{$notificaciones_creadas} notificaciones creadas para usuarios"
                ]);

            } catch (Exception $e) {
                error_log("Error notificando nuevo reporte: " . $e->getMessage());
                echo json_encode(['success' => false, 'error' => 'Error creando notificaciones']);
            }
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Acción no válida']);
    }

} catch (Exception $e) {
    error_log("❌ Error en notificacion_controlador: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error interno del servidor']);
}
?>
