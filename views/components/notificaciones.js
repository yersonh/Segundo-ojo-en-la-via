// notificaciones.js - VERSIÓN INTEGRADA CON SSE
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

    // ⚙️ CONFIGURAR EVENT LISTENERS (igual que antes)
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

    // ... (el resto de los métodos permanecen igual: mostrarNotificacionesEnDropdown, mostrarNotificacionesEnVista,
    // marcarComoLeida, marcarTodasComoLeidas, verNotificacion, verTodasNotificaciones, crearDropdownNotificaciones,
    // obtenerIconoTipo, obtenerTextoTipo, formatearTiempoRelativo, formatearFechaCompleta, mostrarMensajeExito, escapeHtml)
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
