<?php
require_once __DIR__ . '/../config/bootstrap_session.php';
require_once '../config/database.php';

if (!isset($_SESSION['usuario_id'])) {
    header('Location: ../index.php');
    exit();
}
$database = new Database();
$pdo = $database->conectar();

// Obtener datos del usuario de la sesión
$usuario_id = $_SESSION['usuario_id'];
$usuario_nombres = $_SESSION['nombres'] ?? 'Usuario';
$usuario_correo = $_SESSION['correo'] ?? '';

// CONSULTAR DATOS COMPLETOS DEL USUARIO CON JOIN
try {
    $stmt = $pdo->prepare("
        SELECT
            p.id_persona,
            p.nombres,
            p.apellidos,
            p.telefono,
            p.foto_perfil,
            u.correo,
            u.id_rol
        FROM usuario u
        INNER JOIN persona p ON u.id_persona = p.id_persona
        WHERE u.id_usuario = ?
    ");
    $stmt->execute([$usuario_id]);
    $usuario_data = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($usuario_data) {
        // Actualizar variables con datos completos
        $usuario_nombres = $usuario_data['nombres'];
        $usuario_apellidos = $usuario_data['apellidos'];
        $usuario_telefono = $usuario_data['telefono'] ?? 'No especificado';
        $usuario_correo = $usuario_data['correo'];
        $foto_perfil = $usuario_data['foto_perfil'];

        // Actualizar sesión con datos completos
        $_SESSION['nombres'] = $usuario_nombres;
        $_SESSION['apellidos'] = $usuario_apellidos;
        $_SESSION['telefono'] = $usuario_telefono;
        $_SESSION['correo'] = $usuario_correo;
        $_SESSION['foto_perfil'] = $foto_perfil;
    }
} catch (PDOException $e) {
    // Manejar error sin romper la aplicación
    error_log("Error al cargar datos del usuario: " . $e->getMessage());
    $usuario_apellidos = 'Error al cargar';
    $usuario_telefono = 'Error al cargar';
}

// Determinar la URL base para el iframe - ACTUALIZADO A HTTPS
$baseUrl = 'https://' . $_SERVER['HTTP_HOST'];
if ($_SERVER['HTTP_HOST'] === 'localhost:8080') {
    // Para desarrollo local, mantener HTTP si no tienes SSL configurado
    $baseUrl = 'http://localhost:8080';
}
$mapUrl = $baseUrl . '/views/vermapa.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ojo en la Vía - Inicio</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="styles/mapa.css">
    <link rel="stylesheet" href="styles/panel.css">

    <!-- Pasar variables de sesión a JavaScript -->
    <script>
        // Variables globales con datos del usuario desde PHP
        window.usuarioId = <?php echo json_encode($usuario_id); ?>;
        window.usuarioNombres = <?php echo json_encode($usuario_nombres); ?>;
        window.usuarioApellidos = <?php echo json_encode($usuario_apellidos ?? ''); ?>;
        window.usuarioCorreo = <?php echo json_encode($usuario_correo); ?>;
        window.usuarioTelefono = <?php echo json_encode($usuario_telefono ?? ''); ?>;

        console.log('👤 Usuario cargado:', {
            id: window.usuarioId,
            nombres: window.usuarioNombres,
            apellidos: window.usuarioApellidos,
            correo: window.usuarioCorreo,
            telefono: window.usuarioTelefono
        });
    </script>

    <!-- Forzar HTTPS en producción -->
    <?php if ($_SERVER['HTTP_HOST'] !== 'localhost:8080'): ?>
    <script>
        if (location.protocol !== 'https:') {
            location.replace(`https:${location.href.substring(location.protocol.length)}`);
        }
    </script>
    <?php endif; ?>

    <style>
    /* Estilos para el modal de comentarios - Modo Claro/Oscuro */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .comentarios-modal {
        background: var(--modal-bg, white);
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        color: var(--modal-text, #2c3e50);
    }

    .modal-header {
        padding: 20px;
        border-bottom: 1px solid var(--modal-border, #e9ecef);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h3 {
        margin: 0;
        color: var(--modal-heading, #2c3e50);
        font-size: 1.25rem;
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: var(--modal-close, #6c757d);
        cursor: pointer;
        padding: 5px;
        border-radius: 50%;
        transition: all 0.3s ease;
    }

    .modal-close:hover {
        background: var(--modal-close-hover-bg, #f8f9fa);
        color: var(--modal-close-hover, #e74c3c);
    }

    .modal-body {
        padding: 20px;
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    /* Lista de comentarios */
    .comentarios-list {
        flex: 1;
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid var(--modal-border, #e9ecef);
        border-radius: 8px;
        padding: 15px;
        background: var(--modal-list-bg, transparent);
    }

    .comentario-item {
        padding: 12px;
        border-bottom: 1px solid var(--modal-item-border, #f1f3f4);
        margin-bottom: 10px;
    }

    .comentario-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
    }

    .comentario-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .comentario-usuario {
        font-weight: 600;
        color: var(--modal-user, #2c3e50);
        font-size: 0.9rem;
    }

    .comentario-fecha {
        font-size: 0.8rem;
        color: var(--modal-date, #6c757d);
    }

    .comentario-texto {
        color: var(--modal-text, #495057);
        line-height: 1.4;
        font-size: 0.9rem;
    }

    /* Formulario de comentarios */
    .comentario-form {
        border-top: 1px solid var(--modal-border, #e9ecef);
        padding-top: 20px;
    }

    .comentario-input {
        width: 100%;
        min-height: 100px;
        padding: 12px;
        border: 1px solid var(--modal-input-border, #ddd);
        border-radius: 8px;
        resize: vertical;
        font-family: inherit;
        font-size: 0.9rem;
        transition: border-color 0.3s ease;
        background: var(--modal-input-bg, white);
        color: var(--modal-input-text, #495057);
    }

    .comentario-input:focus {
        outline: none;
        border-color: var(--modal-input-focus, #3498db);
        box-shadow: 0 0 0 2px var(--modal-input-focus-shadow, rgba(52, 152, 219, 0.2));
    }

    .comentario-counter {
        text-align: right;
        font-size: 0.8rem;
        color: var(--modal-counter, #6c757d);
        margin-top: 5px;
    }

    /* Botón del formulario */
    #btnComentario {
        background: var(--modal-button-bg, #3498db);
        color: var(--modal-button-text, white);
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background-color 0.3s ease;
    }

    #btnComentario:hover:not(:disabled) {
        background: var(--modal-button-hover, #2980b9);
    }

    #btnComentario:disabled {
        background: var(--modal-button-disabled, #bdc3c7);
        cursor: not-allowed;
    }

    /* Responsive */
    @media (max-width: 768px) {
        .comentarios-modal {
            width: 95%;
            margin: 10px;
        }

        .modal-header {
            padding: 15px;
        }

        .modal-body {
            padding: 15px;
        }
    }
</style>
</head>
<body>
    <div class="app">
        <!-- Header mejorado -->
        <header class="app-header">
            <div class="logo">
                <i class="fas fa-eye"></i>
                <span>Ojo en la Vía</span>
            </div>
            <div class="user-menu">
                <!--<img id="headerAvatar" class="user-avatar" src="/imagenes/fiveicon.png" alt="Avatar"
                    onclick="document.querySelector('.nav-item[data-target=\"profileView\"]').click()"> -->
            </div>
        </header>

        <!-- CONTENEDOR PRINCIPAL -->
        <div class="main with-visible-nav" id="mainContent">
            <!-- Estados de carga -->
            <div id="loadingState" class="loading" style="display: none;">
                <div class="loading-spinner"></div>
                <p>Cargando...</p>
            </div>

            <!-- FEED DE INICIO - ESTRUCTURA ACTUALIZADA -->
            <div id="feedView">
                <div class="feed-container">
                    <div class="posts-grid" id="postsContainer">
                        <!-- Los reportes se cargarán aquí dinámicamente -->
                    </div>

                    <!-- Estado de carga -->
                    <div id="loadingPosts" class="loading" style="display: none;">
                        <div class="loading-spinner"></div>
                        <p>Cargando reportes...</p>
                    </div>

                    <!-- Estado sin resultados -->
                    <div id="noPosts" class="loading" style="display: none;">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <p>No hay reportes disponibles</p>
                    </div>
                </div>
            </div>

            <!-- Notificaciones -->
            <div id="notificationsView" style="display:none;">
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Cargando notificaciones...</p>
                </div>
            </div>

            <!-- Mapa -->
            <div id="mapView" style="display:none;">
                <iframe
                    src="<?php echo $mapUrl; ?>"
                    title="Mapa de reportes de Ojo en la Vía"
                ></iframe>
                <!-- Botón DENTRO del mapa -->
                <button class="map-floating-button"
                        onclick="window.open('<?php echo $mapUrl; ?>', '_blank')">
                    <i class="fas fa-expand"></i>
                </button>
            </div>

            <!-- Perfil - DENTRO del mainContent -->
            <div id="profileView" style="display:none;">
                <div class="profile-container">
                    <!-- Header Hero -->
                    <div class="profile-hero">
                        <div class="profile-hero-content">
                            <div class="profile-avatar-container">
                                <!--<img id="profileAvatar" class="profile-main-avatar" src="/imagenes/fiveicon.png" alt="Avatar del usuario">-->
                              <!--  <div class="avatar-edit-btn" id="editAvatarBtn" title="Cambiar foto de perfil">
                                    <i class="fas fa-camera"></i>
                                </div>-->
                            </div>
                            <div class="profile-hero-info">
                                <h1 id="profileName"><?php echo htmlspecialchars($usuario_nombres . ' ' . ($usuario_apellidos ?? '')); ?></h1>
                                <div class="profile-hero-stats">
                                    <div class="hero-stat">
                                        <i class="fas fa-envelope"></i>
                                        <span id="profileEmail"><?php echo htmlspecialchars($usuario_correo); ?></span>
                                    </div>
                                    <div class="hero-stat">
                                        <i class="fas fa-phone"></i>
                                        <span id="profilePhone"><?php echo htmlspecialchars($usuario_telefono ?? 'No especificado'); ?></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="profile-content">
                        <!-- Columna Principal -->
                        <div class="profile-main">
                            <!-- Información Personal -->
                            <div class="profile-card">
                                <div class="profile-card-header">
                                    <h3><i class="fas fa-user"></i> Información Personal</h3>
                                </div>
                                <div class="contact-info">
                                    <div class="contact-item">
                                        <div class="contact-icon">
                                            <i class="fas fa-user"></i>
                                        </div>
                                        <div class="contact-details">
                                            <div class="contact-label">Nombres</div>
                                            <div class="contact-value" id="profileNames"><?php echo htmlspecialchars($usuario_nombres); ?></div>
                                        </div>
                                    </div>
                                    <div class="contact-item">
                                        <div class="contact-icon">
                                            <i class="fas fa-user"></i>
                                        </div>
                                        <div class="contact-details">
                                            <div class="contact-label">Apellidos</div>
                                            <div class="contact-value" id="profileLastnames"><?php echo htmlspecialchars($usuario_apellidos ?? 'No especificado'); ?></div>
                                        </div>
                                    </div>
                                    <div class="contact-item">
                                        <div class="contact-icon">
                                            <i class="fas fa-envelope"></i>
                                        </div>
                                        <div class="contact-details">
                                            <div class="contact-label">Correo Electrónico</div>
                                            <div class="contact-value" id="profileEmailCard"><?php echo htmlspecialchars($usuario_correo); ?></div>
                                        </div>
                                    </div>
                                    <div class="contact-item">
                                        <div class="contact-icon">
                                            <i class="fas fa-phone"></i>
                                        </div>
                                        <div class="contact-details">
                                            <div class="contact-label">Teléfono</div>
                                            <div class="contact-value" id="profilePhoneCard"><?php echo htmlspecialchars($usuario_telefono ?? 'No especificado'); ?></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Formulario de Edición (oculto inicialmente) -->
                            <form id="profileForm" style="display:none;" class="profile-card edit-form">
                                <div class="profile-card-header">
                                    <h3><i class="fas fa-edit"></i> Editar Perfil</h3>
                                </div>
                                <input type="file" id="fotoPerfil" name="foto" accept="image/*" style="display: none;">

                                <div class="form-grid">
                                    <div class="form-group">
                                        <label for="inpNombres" class="form-label">Nombres</label>
                                        <input type="text" name="nombres" id="inpNombres" class="form-input" placeholder="Tus nombres" value="<?php echo htmlspecialchars($usuario_nombres); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="inpApellidos" class="form-label">Apellidos</label>
                                        <input type="text" name="apellidos" id="inpApellidos" class="form-input" placeholder="Tus apellidos" value="<?php echo htmlspecialchars($usuario_apellidos ?? ''); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="inpTelefono" class="form-label">Teléfono</label>
                                        <input type="tel" name="telefono" id="inpTelefono" class="form-input" placeholder="Tu teléfono" value="<?php echo htmlspecialchars($usuario_telefono ?? ''); ?>">
                                    </div>
                                </div>

                                <div class="form-actions">
                                    <button type="button" id="btnSaveProfile" class="btn btn-primary">
                                        <i class="fas fa-save"></i> Guardar Cambios
                                    </button>
                                    <button type="button" id="btnCancelProfile" class="btn">
                                        <i class="fas fa-times"></i> Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- Sidebar -->
                        <div class="profile-sidebar">
                            <!-- Estadísticas -->
                            <div class="profile-card">
                                <div class="profile-card-header">
                                    <h3><i class="fas fa-chart-bar"></i> Estadísticas</h3>
                                </div>
                                <div class="stats-grid">
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i class="fas fa-flag"></i>
                                        </div>
                                        <div class="stat-number" id="statReports">0</div>
                                        <div class="stat-label">Reportes</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i class="fas fa-heart"></i>
                                        </div>
                                        <div class="stat-number" id="statLikes">0</div>
                                        <div class="stat-label">Likes</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i class="fas fa-comments"></i>
                                        </div>
                                        <div class="stat-number" id="statComments">0</div>
                                        <div class="stat-label">Comentarios</div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i class="fas fa-eye"></i>
                                        </div>
                                        <div class="stat-number" id="statViews">0</div>
                                        <div class="stat-label">Visitas</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Acciones Rápidas -->
                            <div class="profile-card">
                                <div class="quick-actions">
                                    <button class="quick-action-btn" id="btnEditProfile">
                                        <div class="quick-action-icon">
                                            <i class="fas fa-edit"></i>
                                        </div>
                                        <div class="quick-action-text">
                                            <div class="quick-action-title">Editar Perfil</div>
                                            <div class="quick-action-desc">Actualiza tu información personal</div>
                                        </div>
                                    </button>
                                    <button class="quick-action-btn" onclick="cerrarSesion()">
                                        <div class="quick-action-icon">
                                            <i class="fas fa-sign-out-alt"></i>
                                        </div>
                                        <div class="quick-action-text">
                                            <div class="quick-action-title">Cerrar Sesión</div>
                                            <div class="quick-action-desc">Salir de tu cuenta</div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- FIN del profileView -->

        </div>
        <!-- FIN del mainContent -->

        <!-- Navegación inferior -->
        <nav class="bottom-nav visible">
            <div class="nav-item active" data-target="feedView">
                <i class="fas fa-home"></i>
                <span>Inicio</span>
            </div>
            <div class="nav-item" data-target="notificationsView">
                <i class="fas fa-bell"></i>
                <span>Alertas</span>
            </div>
            <div class="nav-item" data-target="mapView">
                <i class="fas fa-map"></i>
                <span>Mapa</span>
            </div>
            <div class="nav-item" data-target="profileView">
                <i class="fas fa-user"></i>
                <span>Perfil</span>
            </div>
        </nav>
    </div>

    <!-- SECCIÓN DE COMENTARIOS (Modal) -->
    <div id="comentariosSection" class="modal-overlay" style="display: none;">
        <div class="modal-content comentarios-modal">
            <div class="modal-header">
                <h3>Comentarios del Reporte</h3>
                <button class="modal-close" onclick="ComentariosManager.cerrarComentarios()">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="modal-body">
                <!-- Lista de comentarios -->
                <div class="comentarios-list" id="comentariosList">
                    <div class="loading">
                        <div class="loading-spinner"></div>
                        <p>Cargando comentarios...</p>
                    </div>
                </div>

                <!-- Formulario para agregar comentario -->
                <form id="formComentario" class="comentario-form">
                    <input type="hidden" id="comentarioIdReporte" name="id_reporte">
                    <input type="hidden" name="id_usuario" id="comentarioIdUsuario">

                    <div class="form-group">
                        <textarea
                            id="textoComentario"
                            name="comentario"
                            class="comentario-input"
                            placeholder="Escribe tu comentario..."
                            required
                            maxlength="500"
                        ></textarea>
                        <div class="comentario-counter">
                            <span id="comentarioChars">0</span>/500
                        </div>
                    </div>

                    <button type="submit" id="btnComentario" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> Publicar Comentario
                    </button>
                </form>
            </div>
        </div>
    </div>

    <!-- TEMPLATE PARA CADA POST (oculto) -->
    <template id="postTemplate">
    <div class="post" data-post-id="">
        <div class="post-header">
            <img class="avatar" src="/imagenes/default-avatar.png" alt="Avatar del usuario">
            <div class="user-info">
                <div class="user-name"></div>
                <div class="post-meta">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="post-location">Ubicación en mapa</span>
                    <i class="fas fa-clock"></i>
                    <span class="post-time"></span>
                    <i class="fas fa-exclamation-triangle"></i>
                    <span class="post-incident-type"></span>
                </div>
                <div class="post-status">
                    <span class="status-badge"></span>
                </div>
            </div>
        </div>

        <!-- Imágenes del reporte -->
        <div class="post-images">
            <!-- Las imágenes se insertarán aquí dinámicamente -->
        </div>

        <!-- Descripción del reporte -->
        <div class="post-desc"></div>

        <!-- Información adicional -->
        <div class="post-additional-info">
            <div class="info-item">
                <i class="fas fa-road"></i>
                <span class="street-info"></span>
            </div>
            <div class="info-item">
                <i class="fas fa-calendar-day"></i>
                <span class="report-date"></span>
            </div>
        </div>

        <!-- Acciones -->
        <div class="post-actions">
            <button class="btn-small like-btn">
                <i class="fas fa-heart"></i>
                <span class="like-count">0</span>
            </button>
            <button class="btn-small comment-btn">
                <i class="fas fa-comment"></i>
                <span>Comentar</span>
            </button>
            <button class="btn-small view-map-btn">
                <i class="fas fa-map-marker-alt"></i>
                <span>Ver en Mapa</span>
            </button>
        </div>

        <!-- Sección de comentarios (inicialmente oculta) -->
        <div class="post-comments" style="display: none;">
            <div class="comments-container"></div>
            <div class="add-comment">
                <input type="text" placeholder="Escribe un comentario..." class="comment-input">
                <button class="btn-small comment-submit">Enviar</button>
            </div>
        </div>
    </div>
</template>

    <script>
        // Función para cerrar sesión
        function cerrarSesion() {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                window.location.href = '../logout.php';
            }
        }

        // Mejorar la experiencia en móviles
        document.addEventListener('touchstart', function() {}, { passive: true });

        // Variable global con la URL del mapa
        const mapUrl = '<?php echo $mapUrl; ?>';

        // Navegación entre vistas
        document.addEventListener('DOMContentLoaded', function() {
            const navItems = document.querySelectorAll('.nav-item');
            const views = document.querySelectorAll('#feedView, #notificationsView, #mapView, #profileView');

            navItems.forEach(item => {
                item.addEventListener('click', function() {
                    const target = this.getAttribute('data-target');

                    // Remover clase active de todos los items
                    navItems.forEach(nav => nav.classList.remove('active'));
                    // Agregar clase active al item clickeado
                    this.classList.add('active');

                    // Ocultar todas las vistas
                    views.forEach(view => view.style.display = 'none');

                    // Mostrar la vista objetivo
                    const targetView = document.getElementById(target);
                    if (targetView) {
                        targetView.style.display = 'block';
                    }
                });
            });

            // Mostrar feedView por defecto
            document.getElementById('feedView').style.display = 'block';
        });
    </script>

    <script src="components/panel.js"></script>
    <script type="module" src="components/mapa/index.js"></script>
    <script type="module" src="components/formulario/index.js"></script>
    <script src="components/comentarios.js"></script>
    <script src="components/sse-notificaciones.js"></script>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            if (window.SSEManager) {
                window.SSEManager.inicializar();
                console.log('✅ SSE Manager unificado inicializado');
            }
        }, 500);
    });

    window.addEventListener('beforeunload', function() {
        if (window.SSEManager) {
            window.SSEManager.destruir();
        }
    });
</script>
    <script>
    // Detectar modo claro/oscuro del sistema y aplicar estilos
    function aplicarModoColor() {
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (isDarkMode) {
            // Variables CSS para modo oscuro
            document.documentElement.style.setProperty('--modal-bg', '#1a1a1a');
            document.documentElement.style.setProperty('--modal-text', '#e0e0e0');
            document.documentElement.style.setProperty('--modal-heading', '#ffffff');
            document.documentElement.style.setProperty('--modal-border', '#333333');
            document.documentElement.style.setProperty('--modal-close', '#888888');
            document.documentElement.style.setProperty('--modal-close-hover-bg', '#333333');
            document.documentElement.style.setProperty('--modal-close-hover', '#ff6b6b');
            document.documentElement.style.setProperty('--modal-list-bg', '#222222');
            document.documentElement.style.setProperty('--modal-item-border', '#333333');
            document.documentElement.style.setProperty('--modal-user', '#ffffff');
            document.documentElement.style.setProperty('--modal-date', '#aaaaaa');
            document.documentElement.style.setProperty('--modal-input-bg', '#2d2d2d');
            document.documentElement.style.setProperty('--modal-input-text', '#e0e0e0');
            document.documentElement.style.setProperty('--modal-input-border', '#444444');
            document.documentElement.style.setProperty('--modal-input-focus', '#3498db');
            document.documentElement.style.setProperty('--modal-input-focus-shadow', 'rgba(52, 152, 219, 0.3)');
            document.documentElement.style.setProperty('--modal-counter', '#888888');
            document.documentElement.style.setProperty('--modal-button-bg', '#3498db');
            document.documentElement.style.setProperty('--modal-button-text', '#ffffff');
            document.documentElement.style.setProperty('--modal-button-hover', '#2980b9');
            document.documentElement.style.setProperty('--modal-button-disabled', '#555555');
        } else {
            // Variables CSS para modo claro (valores por defecto)
            document.documentElement.style.setProperty('--modal-bg', 'white');
            document.documentElement.style.setProperty('--modal-text', '#2c3e50');
            document.documentElement.style.setProperty('--modal-heading', '#2c3e50');
            document.documentElement.style.setProperty('--modal-border', '#e9ecef');
            document.documentElement.style.setProperty('--modal-close', '#6c757d');
            document.documentElement.style.setProperty('--modal-close-hover-bg', '#f8f9fa');
            document.documentElement.style.setProperty('--modal-close-hover', '#e74c3c');
            document.documentElement.style.setProperty('--modal-list-bg', 'transparent');
            document.documentElement.style.setProperty('--modal-item-border', '#f1f3f4');
            document.documentElement.style.setProperty('--modal-user', '#2c3e50');
            document.documentElement.style.setProperty('--modal-date', '#6c757d');
            document.documentElement.style.setProperty('--modal-input-bg', 'white');
            document.documentElement.style.setProperty('--modal-input-text', '#495057');
            document.documentElement.style.setProperty('--modal-input-border', '#ddd');
            document.documentElement.style.setProperty('--modal-input-focus', '#3498db');
            document.documentElement.style.setProperty('--modal-input-focus-shadow', 'rgba(52, 152, 219, 0.2)');
            document.documentElement.style.setProperty('--modal-counter', '#6c757d');
            document.documentElement.style.setProperty('--modal-button-bg', '#3498db');
            document.documentElement.style.setProperty('--modal-button-text', 'white');
            document.documentElement.style.setProperty('--modal-button-hover', '#2980b9');
            document.documentElement.style.setProperty('--modal-button-disabled', '#bdc3c7');
        }
    }

    // Aplicar modo al cargar y cuando cambie
    document.addEventListener('DOMContentLoaded', function() {
        aplicarModoColor();

        // Escuchar cambios en la preferencia de color
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarModoColor);
    });
</script>
    <script>
        // Inicializar ComentariosManager después de cargar el DOM
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof ComentariosManager !== 'undefined') {
                ComentariosManager.inicializar();
                console.log('✅ ComentariosManager inicializado correctamente');
            } else {
                console.error('❌ ComentariosManager no está definidao');
            }
        });
    </script>
</body>
</html>
