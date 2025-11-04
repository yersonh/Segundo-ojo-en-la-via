// notificaciones.js - VERSIÓN COMPLETA INTEGRADA CON SSE
const NotificacionesManager = {
    inicializado: false,
    intervaloActualizacion: null,
    ultimaVerificacion: null,
    sseManager: null,

    // 🚀 INICIALIZAR SISTEMA
    inicializar() {
        if (this.inicializado) {
            console.log('⚠️ NotificacionesManager ya estaba inicializado');
            return;
        }

        console.log('🔔 Inicializando sistema de notificaciones con SSE...');

        this.configurarEventos();
        this.iniciarSSE();
        this.inicializado = true;

        console.log('✅ NotificacionesManager inicializado con SSE');
    },

    // ⚡ INICIAR SSE EN LUGAR DE POLLING
    iniciarSSE() {
        // Verificar si existe el SSE Manager global
        if (window.SSEManager && typeof window.SSEManager.inicializar === 'function') {
            this.sseManager = window.SSEManager;

            // Configurar nuestros manejadores personalizados en el SSE Manager
            this.configurarManejadoresSSE();

            // Inicializar SSE
            this.sseManager.inicializar();

            console.log('⚡ SSE integrado con NotificacionesManager');
        } else {
            console.warn('⚠️ SSE Manager no disponible, usando polling como fallback');
            this.iniciarPollingFallback();
        }
    },

    // 🎛️ CONFIGURAR MANEJADORES PERSONALIZADOS PARA SSE
    configurarManejadoresSSE() {
        // Sobrescribir el manejador de notificaciones de usuario
        const originalManejarNotificaciones = this.sseManager.manejarNuevasNotificacionesUsuario;

        this.sseManager.manejarNuevasNotificacionesUsuario = (data) => {
            console.log('🔔 Notificación SSE recibida en NotificacionesManager:', data);

            // Ejecutar el manejador original si existe
            if (originalManejarNotificaciones) {
                originalManejarNotificaciones.call(this.sseManager, data);
            }

            // Nuestro manejo personalizado
            this.manejarNotificacionSSE(data);
        };

        // Sobrescribir el manejador de toast
        const originalMostrarToast = this.sseManager.mostrarToastNotificacion;

        this.sseManager.mostrarToastNotificacion = (cantidad, tipo = 'usuario') => {
            // Usar nuestro toast personalizado
            this.mostrarNotificacionPush(`Tienes ${cantidad} nueva(s) notificación(es)`);
        };
    },

    // 🎯 MANEJAR NOTIFICACIONES SSE
    manejarNotificacionSSE(data) {
        // Actualizar contador inmediatamente
        this.actualizarContadorNotificaciones();

        // Si el dropdown está abierto, actualizar las notificaciones
        const dropdown = document.getElementById('notificationsDropdown');
        if (dropdown && dropdown.style.display === 'block') {
            this.obtenerNuevasNotificaciones();
        }

        // Mostrar notificación push
        if (!this.estaEnVistaNotificaciones()) {
            this.mostrarNotificacionPush('Tienes nuevas notificaciones');
        }
    },

    // 🛡️ POLLING DE FALLBACK (por si SSE falla)
    iniciarPollingFallback() {
        console.log('🔄 Iniciando polling de fallback cada 30 segundos');

        // Cargar contador inicial
        this.actualizarContadorNotificaciones();

        // Actualizar cada 30 segundos
        this.intervaloActualizacion = setInterval(() => {
            this.actualizarContadorNotificaciones();
        }, 30000);
    },

    // ⚙️ CONFIGURAR EVENT LISTENERS
    configurarEventos() {
        // Evento para abrir/cerrar dropdown de notificaciones
        const notificationIcon = document.querySelector('.nav-item[data-target="notificationsView"]');
        if (notificationIcon) {
            notificationIcon.addEventListener('click', (e) => {
                if (!e.target.closest('.notification-badge')) {
                    this.toggleDropdownNotificaciones();
                }
            });
        }

        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('notificationsDropdown');
            const icon = document.querySelector('.nav-item[data-target="notificationsView"]');

            if (dropdown && dropdown.style.display === 'block' &&
                !dropdown.contains(e.target) &&
                !icon.contains(e.target)) {
                this.cerrarDropdownNotificaciones();
            }
        });

        // Reconectar SSE cuando la página se vuelve visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.sseManager && !this.sseManager.isConnected) {
                console.log('🔄 Página visible - reconectando SSE');
                this.sseManager.reconectar();
            }
        });
    },

    // 🔢 ACTUALIZAR CONTADOR DE NOTIFICACIONES (compatible con SSE)
    async actualizarContadorNotificaciones() {
        try {
            const resp = await fetch('../../controllers/notificacion_controlador.php?action=contar_no_leidas', {
                method: 'GET',
                credentials: 'include'
            });

            if (!resp.ok) {
                throw new Error(`Error HTTP: ${resp.status}`);
            }

            const data = await resp.json();
            this.actualizarBadgeUI(data.total_no_leidas || 0);

            return data.total_no_leidas || 0;

        } catch (error) {
            console.error('❌ Error actualizando contador:', error);
            this.actualizarBadgeUI(0);
            return 0;
        }
    },

    // 🎨 ACTUALIZAR BADGE EN UI
    actualizarBadgeUI(totalNoLeidas) {
        const badge = document.getElementById('notificationBadge');

        if (badge) {
            if (totalNoLeidas > 0) {
                badge.textContent = totalNoLeidas > 99 ? '99+' : totalNoLeidas;
                badge.style.display = 'flex';
                this.animarNuevaNotificacion();
            } else {
                badge.style.display = 'none';
            }
        }
    },

    // ✨ ANIMAR NUEVA NOTIFICACIÓN
    animarNuevaNotificacion() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;

        badge.classList.add('nueva-notificacion');
        setTimeout(() => {
            badge.classList.remove('nueva-notificacion');
        }, 3000);
    },

    // 📩 OBTENER NOTIFICACIONES NUEVAS (para dropdown)
    async obtenerNuevasNotificaciones() {
        try {
            const params = new URLSearchParams();
            if (this.ultimaVerificacion) {
                params.append('ultima_verificacion', Math.floor(this.ultimaVerificacion / 1000));
            }

            const resp = await fetch(`../../controllers/notificacion_controlador.php?action=obtener_nuevas&${params}`, {
                credentials: 'include'
            });

            if (!resp.ok) throw new Error(`Error HTTP: ${resp.status}`);

            const data = await resp.json();

            if (data.success && data.notificaciones.length > 0) {
                this.mostrarNotificacionesEnDropdown(data.notificaciones);
                this.ultimaVerificacion = Date.now();
            }

            return data.notificaciones || [];

        } catch (error) {
            console.error('❌ Error obteniendo nuevas notificaciones:', error);
            return [];
        }
    },

    // 📋 CARGAR TODAS LAS NOTIFICACIONES (para vista completa)
    async cargarTodasNotificaciones() {
        try {
            const notificationsView = document.getElementById('notificationsView');
            if (!notificationsView) return;

            notificationsView.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Cargando notificaciones...</p>
                </div>
            `;

            const resp = await fetch('../../controllers/notificacion_controlador.php?action=listar', {
                credentials: 'include'
            });

            if (!resp.ok) throw new Error(`Error HTTP: ${resp.status}`);

            const notificaciones = await resp.json();

            this.mostrarNotificacionesEnVista(notificaciones, notificationsView);
            this.actualizarContadorNotificaciones();

        } catch (error) {
            console.error('❌ Error cargando notificaciones:', error);
            const notificationsView = document.getElementById('notificationsView');
            if (notificationsView) {
                notificationsView.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error al cargar notificaciones</p>
                    </div>
                `;
            }
        }
    },

    // 🎪 TOGGLE DROPDOWN DE NOTIFICACIONES
    toggleDropdownNotificaciones() {
        const dropdown = document.getElementById('notificationsDropdown');

        if (!dropdown) {
            this.crearDropdownNotificaciones();
            return this.toggleDropdownNotificaciones();
        }

        if (dropdown.style.display === 'block') {
            this.cerrarDropdownNotificaciones();
        } else {
            this.abrirDropdownNotificaciones();
        }
    },

    // 📤 ABRIR DROPDOWN
    abrirDropdownNotificaciones() {
        const dropdown = document.getElementById('notificationsDropdown');
        if (!dropdown) return;

        dropdown.style.display = 'block';
        this.obtenerNuevasNotificaciones();
    },

    // 📥 CERRAR DROPDOWN
    cerrarDropdownNotificaciones() {
        const dropdown = document.getElementById('notificationsDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    },

    // 🔔 MOSTRAR NOTIFICACIÓN PUSH (mejorada)
    mostrarNotificacionPush(mensaje, tipo = 'info') {
        // Solo mostrar si la página está visible y no está en vista de notificaciones
        if (document.hidden || this.estaEnVistaNotificaciones()) return;

        const toast = document.createElement('div');
        toast.className = `notification-toast toast-${tipo}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-bell"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${this.escapeHtml(mensaje)}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(toast);

        // Animación de entrada
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);

        // Reproducir sonido si no está en modo silencioso
        if (!this.estaEnModoSilencioso()) {
            this.reproducirSonidoNotificacion();
        }
    },

    // 🔇 REPRODUCIR SONIDO DE NOTIFICACIÓN
    reproducirSonidoNotificacion() {
        try {
            // Crear un sonido simple usando Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('🔇 No se pudo reproducir sonido de notificación');
        }
    },

    // 🏠 VERIFICAR SI ESTÁ EN VISTA DE NOTIFICACIONES
    estaEnVistaNotificaciones() {
        const notificationsView = document.getElementById('notificationsView');
        return notificationsView && notificationsView.style.display !== 'none';
    },

    // 🔕 VERIFICAR MODO SILENCIOSO
    estaEnModoSilencioso() {
        return localStorage.getItem('modo_silencioso') === 'true';
    },

    // 📦 MOSTRAR NOTIFICACIONES EN DROPDOWN
    mostrarNotificacionesEnDropdown(notificaciones) {
        const dropdown = document.getElementById('notificationsDropdown');
        if (!dropdown) return;

        const content = dropdown.querySelector('.notifications-dropdown-content');
        if (!content) return;

        if (notificaciones.length === 0) {
            content.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No hay notificaciones nuevas</p>
                </div>
            `;
            return;
        }

        content.innerHTML = notificaciones.map(notif => `
            <div class="notification-item ${notif.leida ? 'leida' : 'no-leida'}"
                 data-id="${notif.id_notificacion}">
                <div class="notification-icon">
                    ${this.obtenerIconoTipo(notif.tipo)}
                </div>
                <div class="notification-content">
                    <div class="notification-message">${this.escapeHtml(notif.mensaje)}</div>
                    <div class="notification-meta">
                        <span class="notification-time">${this.formatearTiempoRelativo(notif.fecha)}</span>
                        ${notif.origen_nombres ? `<span class="notification-from">• ${this.escapeHtml(notif.origen_nombres)}</span>` : ''}
                    </div>
                </div>
                <div class="notification-actions">
                    ${!notif.leida ? `
                        <button class="btn-mark-read" onclick="NotificacionesManager.marcarComoLeida(${notif.id_notificacion}, this)">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Agregar botón para ver todas
        const verTodasBtn = document.createElement('div');
        verTodasBtn.className = 'notifications-footer';
        verTodasBtn.innerHTML = `
            <button class="btn-view-all" onclick="NotificacionesManager.verTodasNotificaciones()">
                <i class="fas fa-list"></i> Ver todas las notificaciones
            </button>
        `;
        content.appendChild(verTodasBtn);
    },

    // 📄 MOSTRAR NOTIFICACIONES EN VISTA COMPLETA
    mostrarNotificacionesEnVista(notificaciones, container) {
        if (!container) return;

        if (!Array.isArray(notificaciones) || notificaciones.length === 0) {
            container.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash" style="font-size: 3rem; opacity: 0.5; margin-bottom: 1rem;"></i>
                    <p>No tienes notificaciones</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="notifications-header">
                <h3>Tus Notificaciones</h3>
                <button class="btn-mark-all-read" onclick="NotificacionesManager.marcarTodasComoLeidas()">
                    <i class="fas fa-check-double"></i> Marcar todas como leídas
                </button>
            </div>
            <div class="notifications-list">
                ${notificaciones.map(notif => `
                    <div class="notification-card ${notif.leida ? 'leida' : 'no-leida'}"
                         data-id="${notif.id_notificacion}">
                        <div class="notification-card-header">
                            <div class="notification-type">
                                ${this.obtenerIconoTipo(notif.tipo)}
                                <span>${this.obtenerTextoTipo(notif.tipo)}</span>
                            </div>
                            <div class="notification-date">
                                ${this.formatearFechaCompleta(notif.fecha)}
                            </div>
                        </div>
                        <div class="notification-card-body">
                            <div class="notification-message">${this.escapeHtml(notif.mensaje)}</div>
                            ${notif.origen_nombres ? `
                                <div class="notification-from">
                                    <i class="fas fa-user"></i>
                                    De: ${this.escapeHtml(notif.origen_nombres)}
                                </div>
                            ` : ''}
                        </div>
                        <div class="notification-card-actions">
                            ${notif.id_reporte ? `
                                <button class="btn-small btn-primary"
                                        onclick="NotificacionesManager.verNotificacion(${notif.id_notificacion}, ${notif.id_reporte})">
                                    <i class="fas fa-eye"></i> Ver Reporte
                                </button>
                            ` : ''}
                            ${!notif.leida ? `
                                <button class="btn-small btn-secondary"
                                        onclick="NotificacionesManager.marcarComoLeida(${notif.id_notificacion}, this)">
                                    <i class="fas fa-check"></i> Marcar como leída
                                </button>
                            ` : `
                                <span class="badge-leida">Leída</span>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ✅ MARCAR COMO LEÍDA
    async marcarComoLeida(id_notificacion, elementoBtn = null) {
        try {
            const formData = new FormData();
            formData.append('id_notificacion', id_notificacion);

            const resp = await fetch('../../controllers/notificacion_controlador.php?action=marcar_leida', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const data = await resp.json();

            if (data.success) {
                // Actualizar UI
                if (elementoBtn) {
                    const notificationItem = elementoBtn.closest('.notification-item, .notification-card');
                    if (notificationItem) {
                        notificationItem.classList.remove('no-leida');
                        notificationItem.classList.add('leida');

                        if (elementoBtn.classList.contains('btn-mark-read')) {
                            elementoBtn.remove();
                        } else if (elementoBtn.classList.contains('btn-small')) {
                            elementoBtn.outerHTML = '<span class="badge-leida">Leída</span>';
                        }
                    }
                }

                // Actualizar contador
                this.actualizarContadorNotificaciones();
                this.mostrarMensajeExito('Notificación marcada como leída');
            } else {
                throw new Error(data.error || 'Error al marcar como leída');
            }
        } catch (error) {
            console.error('❌ Error marcando notificación como leída:', error);
            alert('Error al marcar como leída: ' + error.message);
        }
    },

    // ✅ MARCAR TODAS COMO LEÍDAS
    async marcarTodasComoLeidas() {
        try {
            const resp = await fetch('../../controllers/notificacion_controlador.php?action=marcar_todas_leidas', {
                method: 'POST',
                credentials: 'include'
            });

            const data = await resp.json();

            if (data.success) {
                // Actualizar todas las notificaciones en la UI
                document.querySelectorAll('.notification-item, .notification-card').forEach(item => {
                    item.classList.remove('no-leida');
                    item.classList.add('leida');

                    const btn = item.querySelector('.btn-mark-read, .btn-small');
                    if (btn) {
                        if (btn.classList.contains('btn-mark-read')) {
                            btn.remove();
                        } else {
                            btn.outerHTML = '<span class="badge-leida">Leída</span>';
                        }
                    }
                });

                // Actualizar contador
                this.actualizarContadorNotificaciones();
                this.mostrarMensajeExito('Todas las notificaciones marcadas como leídas');
            } else {
                throw new Error(data.error || 'Error al marcar todas como leídas');
            }
        } catch (error) {
            console.error('❌ Error marcando todas como leídas:', error);
            alert('Error al marcar todas como leídas: ' + error.message);
        }
    },

    // 👁️ VER NOTIFICACIÓN (navegar al reporte)
    verNotificacion(id_notificacion, id_reporte) {
        // Primero marcar como leída si no lo está
        this.marcarComoLeida(id_notificacion);

        // Navegar al reporte usando el sistema de comentarios
        if (typeof ComentariosManager !== 'undefined' && ComentariosManager.abrirComentarios) {
            ComentariosManager.abrirComentarios(id_reporte);
        } else {
            console.warn('Sistema de comentarios no disponible');
            alert('Función de comentarios no disponible');
        }

        // Cerrar dropdown si está abierto
        this.cerrarDropdownNotificaciones();
    },

    // 📋 VER TODAS LAS NOTIFICACIONES (navegar a vista completa)
    verTodasNotificaciones() {
        // Navegar a la vista de notificaciones
        const navItem = document.querySelector('.nav-item[data-target="notificationsView"]');
        if (navItem) {
            navItem.click();
        }

        // Cerrar dropdown
        this.cerrarDropdownNotificaciones();
    },

    // 🏗️ CREAR DROPDOWN DE NOTIFICACIONES
    crearDropdownNotificaciones() {
        const existingDropdown = document.getElementById('notificationsDropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        const dropdown = document.createElement('div');
        dropdown.id = 'notificationsDropdown';
        dropdown.className = 'notifications-dropdown';
        dropdown.style.display = 'none';

        dropdown.innerHTML = `
            <div class="notifications-dropdown-header">
                <h4>Notificaciones</h4>
                <button class="btn-close-dropdown" onclick="NotificacionesManager.cerrarDropdownNotificaciones()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="notifications-dropdown-content">
                <div class="loading-notifications">
                    <div class="loading-spinner-small"></div>
                    <p>Cargando notificaciones...</p>
                </div>
            </div>
        `;

        document.body.appendChild(dropdown);
        return dropdown;
    },

    // 🎯 OBTENER ICONO SEGÚN TIPO
    obtenerIconoTipo(tipo) {
        const iconos = {
            'like': '👍',
            'comentario': '💬',
            'nuevo_reporte_usuario': '📢',
            'sistema': '🔔',
            'admin': '⚡'
        };
        return iconos[tipo] || '🔔';
    },

    // 📝 OBTENER TEXTO SEGÚN TIPO
    obtenerTextoTipo(tipo) {
        const textos = {
            'like': 'Like',
            'comentario': 'Comentario',
            'nuevo_reporte_usuario': 'Nuevo Reporte',
            'sistema': 'Sistema',
            'admin': 'Administración'
        };
        return textos[tipo] || 'Notificación';
    },

    // ⏰ FORMATEAR TIEMPO RELATIVO
    formatearTiempoRelativo(fechaString) {
        const fecha = new Date(fechaString);
        const ahora = new Date();
        const diffMs = ahora - fecha;
        const diffSeg = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSeg / 60);
        const diffHoras = Math.floor(diffMin / 60);
        const diffDias = Math.floor(diffHoras / 24);

        if (diffSeg < 60) return 'ahora';
        if (diffMin < 60) return `hace ${diffMin} min`;
        if (diffHoras < 24) return `hace ${diffHoras} h`;
        if (diffDias < 7) return `hace ${diffDias} d`;

        return fecha.toLocaleDateString('es-ES');
    },

    // 📅 FORMATEAR FECHA COMPLETA
    formatearFechaCompleta(fechaString) {
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // ✅ MOSTRAR MENSAJE DE ÉXITO
    mostrarMensajeExito(mensaje) {
        // Puedes implementar un sistema de toasts más sofisticado aquí
        console.log('✅ ' + mensaje);
    },

    // 🔒 ESCAPAR HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 🧹 DESTRUIR INSTANCIA
    destruir() {
        if (this.intervaloActualizacion) {
            clearInterval(this.intervaloActualizacion);
        }

        if (this.sseManager) {
            this.sseManager.destruir();
        }

        this.inicializado = false;
        console.log('🔔 NotificacionesManager destruido');
    }
};

// 🎯 INICIALIZACIÓN MEJORADA
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco para asegurar que SSE Manager esté disponible
    setTimeout(() => {
        NotificacionesManager.inicializar();
    }, 100);
});

// 🎯 INTEGRACIÓN CON NAVEGACIÓN EXISTENTE
document.addEventListener('DOMContentLoaded', function() {
    // Sobrescribir la función de carga de notificaciones en panel.js
    if (typeof window.cargarNotificacionesSuave === 'function') {
        const originalCargarNotificaciones = window.cargarNotificacionesSuave;
        window.cargarNotificacionesSuave = function() {
            NotificacionesManager.cargarTodasNotificaciones();
        };
    }
});

// 🎯 EXPORTAR PARA USO GLOBAL
window.NotificacionesManager = NotificacionesManager;
