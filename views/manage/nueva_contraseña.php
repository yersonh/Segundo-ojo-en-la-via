<?php
require_once __DIR__ . '/../../config/database.php';

// Evitar cache
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

$database = new Database();
$db = $database->conectar();

// Variable para mensajes
$mensaje = "";
$tipoMensaje = ""; // success, error, warning

// Validación token
if (!isset($_GET['token']) || empty($_GET['token'])) {
    $mensaje = "Token no proporcionado o inválido.";
    $tipoMensaje = "error";
} else {
    $token = trim($_GET['token']);
    
    // Verificar formato del token (UUID)
    if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i', $token)) {
        $mensaje = "Token con formato inválido.";
        $tipoMensaje = "error";
    } else {
        // Verificar token válido en la base de datos
        try {
            $stmt = $db->prepare("
                SELECT rt.*, u.email, u.estado 
                FROM public.recovery_tokens rt
                JOIN usuario u ON rt.id_usuario = u.id_usuario
                WHERE rt.token = :token 
                  AND rt.expiracion > NOW() 
                  AND rt.usado = FALSE 
                LIMIT 1
            ");
            $stmt->bindParam(':token', $token);
            $stmt->execute();
            $tokenData = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$tokenData) {
                $mensaje = "El enlace de recuperación ha expirado o ya fue utilizado.";
                $tipoMensaje = "error";
            } elseif ($tokenData['estado'] !== 'Activo') {
                $mensaje = "La cuenta asociada a este enlace no está activa.";
                $tipoMensaje = "error";
            }
        } catch (Exception $e) {
            error_log("Error al verificar token: " . $e->getMessage());
            $mensaje = "Error interno del sistema. Por favor intenta más tarde.";
            $tipoMensaje = "error";
        }
    }
}

// Procesar el formulario (POST) solo si el token es válido
if ($_SERVER['REQUEST_METHOD'] === 'POST' && empty($mensaje)) {
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';
    $token = $_POST['token'] ?? '';

    // Validaciones de contraseña
    if (empty($password) || empty($confirm_password)) {
        $mensaje = "Por favor completa todos los campos.";
        $tipoMensaje = "error";
    } elseif (strlen($password) < 8) {
        $mensaje = "La contraseña debe tener al menos 8 caracteres.";
        $tipoMensaje = "error";
    } elseif (!preg_match('/[A-Z]/', $password)) {
        $mensaje = "La contraseña debe contener al menos una letra mayúscula.";
        $tipoMensaje = "error";
    } elseif (!preg_match('/[a-z]/', $password)) {
        $mensaje = "La contraseña debe contener al menos una letra minúscula.";
        $tipoMensaje = "error";
    } elseif (!preg_match('/[0-9]/', $password)) {
        $mensaje = "La contraseña debe contener al menos un número.";
        $tipoMensaje = "error";
    } elseif (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) {
        $mensaje = "La contraseña debe contener al menos un carácter especial.";
        $tipoMensaje = "error";
    } elseif ($password !== $confirm_password) {
        $mensaje = "Las contraseñas no coinciden.";
        $tipoMensaje = "error";
    } else {
        try {
            // Hashear la nueva contraseña
            $nuevaContrasena = password_hash($password, PASSWORD_DEFAULT);

            // Iniciar transacción
            $db->beginTransaction();

            // Actualizar contraseña del usuario
            $stmtUpdate = $db->prepare("
                UPDATE usuario 
                SET contrasena = :contrasena 
                WHERE id_usuario = :id_usuario
            ");
            $stmtUpdate->bindParam(':contrasena', $nuevaContrasena);
            $stmtUpdate->bindParam(':id_usuario', $tokenData['id_usuario']);
            $stmtUpdate->execute();

            // Marcar token como usado
            $stmtUsed = $db->prepare("
                UPDATE public.recovery_tokens 
                SET usado = TRUE 
                WHERE id = :id
            ");
            $stmtUsed->bindParam(':id', $tokenData['id']);
            $stmtUsed->execute();

            // Confirmar transacción
            $db->commit();

            // Registrar el cambio
            error_log("Contraseña restablecida para usuario: " . $tokenData['email']);

            // Mostrar mensaje de éxito
            $mensaje = "✅ Contraseña cambiada correctamente. Serás redirigido al inicio de sesión en 3 segundos...";
            $tipoMensaje = "success";
            
            // Redirigir después de 3 segundos
            header("refresh:3;url=/index.php");
            
        } catch (Exception $e) {
            // Revertir transacción en caso de error
            $db->rollBack();
            error_log("Error al actualizar contraseña: " . $e->getMessage());
            $mensaje = "Error al procesar la solicitud. Por favor intenta nuevamente.";
            $tipoMensaje = "error";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer Contraseña - Ojo en la Vía</title>
    <link rel="icon" href="/imagenes/fiveicon.png" type="image/png">
    <link rel="shortcut icon" href="/imagenes/fiveicon.png" type="image/png">

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;

            /* 🔹 Imagen de fondo */
            background-image: url("/imagenes/hola.jpg");
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            background-attachment: fixed;
        }

        .container {
            /* 🔹 Fondo semitransparente tipo "vidrio" */
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.2);

            padding: 2rem;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
            text-align: center;
            color: #fff;
        }

        h2 {
            margin-bottom: 1.5rem;
            color: #fff;
            font-size: 1.5rem;
            font-weight: 600;
        }

        .form-group {
            margin-bottom: 1.2rem;
            text-align: left;
        }

        label {
            font-weight: 600;
            display: block;
            margin-bottom: 0.5rem;
            color: #fff;
            font-size: 0.9rem;
        }

        input[type="password"] {
            width: 100%;
            padding: 0.9rem 1.2rem;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50px;
            outline: none;
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
            font-size: 0.95rem;
            transition: all 0.3s ease;
        }

        input[type="password"]:focus {
            border-color: #007BFF;
            background: rgba(255, 255, 255, 0.25);
        }

        input[type="password"]::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }

        button {
            width: 100%;
            background: linear-gradient(135deg, #007BFF, #0056b3);
            color: white;
            border: none;
            padding: 1rem;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 0.5rem;
            font-weight: 600;
            font-size: 1rem;
            box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
        }

        button:active {
            transform: translateY(0);
        }

        .message {
            padding: 1rem;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            font-weight: 600;
            text-align: center;
        }

        .message.success {
            background: rgba(40, 167, 69, 0.2);
            border: 1px solid rgba(40, 167, 69, 0.5);
            color: #d4edda;
        }

        .message.error {
            background: rgba(220, 53, 69, 0.2);
            border: 1px solid rgba(220, 53, 69, 0.5);
            color: #f8d7da;
        }

        .message.warning {
            background: rgba(255, 193, 7, 0.2);
            border: 1px solid rgba(255, 193, 7, 0.5);
            color: #fff3cd;
        }

        .password-requirements {
            background: rgba(255, 255, 255, 0.1);
            padding: 1rem;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            text-align: left;
            font-size: 0.8rem;
        }

        .password-requirements h4 {
            margin-bottom: 0.5rem;
            color: #fff;
            font-size: 0.9rem;
        }

        .password-requirements ul {
            list-style: none;
            padding-left: 0;
        }

        .password-requirements li {
            margin-bottom: 0.3rem;
            color: rgba(255, 255, 255, 0.8);
        }

        .password-requirements li.valid {
            color: #28a745;
        }

        .password-requirements li.invalid {
            color: #dc3545;
        }

        /* Responsive para móviles */
        @media (max-width: 480px) {
            body {
                padding: 15px;
                align-items: flex-start;
                padding-top: 40px;
            }

            .container {
                padding: 1.5rem;
                border-radius: 15px;
                max-width: 100%;
            }

            h2 {
                font-size: 1.3rem;
                margin-bottom: 1.2rem;
            }

            input[type="password"] {
                padding: 0.8rem 1rem;
                font-size: 0.9rem;
            }

            button {
                padding: 0.9rem;
                font-size: 0.95rem;
            }

            .password-requirements {
                padding: 0.8rem;
                font-size: 0.75rem;
            }
        }

        @media (max-width: 320px) {
            .container {
                padding: 1rem;
            }

            h2 {
                font-size: 1.2rem;
            }
        }

        /* Estilos para landscape en móviles */
        @media (max-height: 500px) and (orientation: landscape) {
            body {
                align-items: flex-start;
                padding-top: 20px;
                padding-bottom: 20px;
            }

            .container {
                max-width: 90%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <?php if ($mensaje): ?>
            <div class="message <?php echo $tipoMensaje; ?>">
                <?php echo $mensaje; ?>
            </div>
            <?php if ($tipoMensaje === 'success'): ?>
                <p style="color: rgba(255,255,255,0.8); margin-top: 1rem;">
                    Redirigiendo al inicio de sesión...
                </p>
            <?php endif; ?>
        <?php else: ?>
            <h2>Restablecer Contraseña</h2>
            
            <div class="password-requirements">
                <h4>Requisitos de la contraseña:</h4>
                <ul>
                    <li id="req-length">• Mínimo 8 caracteres</li>
                    <li id="req-uppercase">• Al menos una mayúscula</li>
                    <li id="req-lowercase">• Al menos una minúscula</li>
                    <li id="req-number">• Al menos un número</li>
                    <li id="req-special">• Al menos un carácter especial</li>
                </ul>
            </div>

            <form method="POST" action="" id="passwordForm">
                <input type="hidden" name="token" value="<?php echo htmlspecialchars($token); ?>">
                
                <div class="form-group">
                    <label for="password">Nueva contraseña:</label>
                    <input type="password" name="password" id="password" required minlength="8" 
                           placeholder="Ingresa tu nueva contraseña">
                </div>

                <div class="form-group">
                    <label for="confirm_password">Confirmar contraseña:</label>
                    <input type="password" name="confirm_password" id="confirm_password" required 
                           placeholder="Confirma tu contraseña">
                </div>

                <button type="submit" id="submitBtn">Cambiar contraseña</button>
            </form>
        <?php endif; ?>
    </div>

    <script>
        // Validación en tiempo real de la contraseña
        document.addEventListener('DOMContentLoaded', function() {
            const passwordInput = document.getElementById('password');
            const confirmInput = document.getElementById('confirm_password');
            const form = document.getElementById('passwordForm');
            
            if (passwordInput) {
                passwordInput.addEventListener('input', validatePassword);
                confirmInput.addEventListener('input', validateConfirmPassword);
            }

            function validatePassword() {
                const password = passwordInput.value;
                const requirements = {
                    length: password.length >= 8,
                    uppercase: /[A-Z]/.test(password),
                    lowercase: /[a-z]/.test(password),
                    number: /[0-9]/.test(password),
                    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
                };

                // Actualizar indicadores visuales
                document.getElementById('req-length').className = requirements.length ? 'valid' : 'invalid';
                document.getElementById('req-uppercase').className = requirements.uppercase ? 'valid' : 'invalid';
                document.getElementById('req-lowercase').className = requirements.lowercase ? 'valid' : 'invalid';
                document.getElementById('req-number').className = requirements.number ? 'valid' : 'invalid';
                document.getElementById('req-special').className = requirements.special ? 'valid' : 'invalid';
            }

            function validateConfirmPassword() {
                const password = passwordInput.value;
                const confirm = confirmInput.value;
                
                if (confirm && password !== confirm) {
                    confirmInput.style.borderColor = '#dc3545';
                } else {
                    confirmInput.style.borderColor = password ? '#28a745' : 'rgba(255, 255, 255, 0.3)';
                }
            }

            // Validación antes del envío
            form.addEventListener('submit', function(e) {
                const password = passwordInput.value;
                const confirm = confirmInput.value;
                
                if (password !== confirm) {
                    e.preventDefault();
                    alert('Las contraseñas no coinciden. Por favor verifica.');
                    confirmInput.focus();
                }
            });
        });
    </script>
</body>
</html>