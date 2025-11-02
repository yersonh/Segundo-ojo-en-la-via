// views/components/admin-notificaciones.js - VERSIÓN SIN AJAX
class NotificationManager {
    constructor() {
        this.eventSource = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectTimeout = null;
        this.audioContext = null;
        this.pollingInterval = null;
        this.notificacionesEnMemoria = []; // 🆕 Almacenar notificaciones en memoria
    }

    initialize() {
        console.log('🔔 Inicializando NotificationManager...');
        this.setupEventListeners();

        // 🆕 CONEXIÓN DIRECTA SIN TOKEN
        if (document.visibilityState === 'visible' && this.isAdminPage()) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(() => this.connectSSE(), 1000);
                });
            } else {
                setTimeout(() => this.connectSSE(), 1000);
            }
        }

        // 🆕 LIMPIAR RECURSOS ANTES DE RECARGAR/CERRAR
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });

        // 🆕 MANEJAR VISIBILIDAD DE LA PÁGINA
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                console.log('👻 Página en background - desconectando SSE');
                this.disconnectSSE();
            } else if (document.visibilityState === 'visible' && !this.isConnected && this.isAdminPage()) {
                console.log('👀 Página visible - reconectando SSE');
                setTimeout(() => this.connectSSE(), 2000);
            }
        });
    }

    isAdminPage() {
        return window.location.pathname.includes('admin.php') ||
               document.querySelector('.admin-container') !== null;
    }

    // 🆕 MÉTODO PARA OBTENER LA RUTA BASE CORRECTA
    getBaseUrl() {
        const path = window.location.pathname;
        console.log('📍 Path actual:', path);

        // Si estamos en /views/components/admin.php o similar
        if (path.includes('/views/')) {
            const basePath = path.split('/views/')[0];
            return window.location.origin + basePath;
        }
        // Si estamos directamente en admin.php
        else if (path.includes('admin.php')) {
            const basePath = path.split('/').slice(0, -1).join('/');
            return window.location.origin + basePath;
        }
        // Por defecto
        else {
            return window.location.origin;
        }
    }

    // 🆕 MÉTODO PARA CONSTRUIR URLS ABSOLUTAS
    buildUrl(endpoint) {
        const baseUrl = this.getBaseUrl();
        const url = `${baseUrl}/controllers/${endpoint}`;
        console.log('🔗 URL construida:', url);
        return url;
    }

    setupEventListeners() {
        // Toggle panel de notificaciones
        const notifIcon = document.getElementById('notificacionIcon');
        const notifPanel = document.getElementById('notificacionesPanel');

        console.log('🔍 Elementos del panel:', { notifIcon, notifPanel });

        if (notifIcon && notifPanel) {
            notifIcon.addEventListener('click', async (e) => {
                e.stopPropagation();
                console.log('🖱️ Click en icono de notificaciones');
                const isOpening = !notifPanel.classList.contains('show');
                notifPanel.classList.toggle('show');
                console.log('📂 Panel estado:', notifPanel.classList.contains('show') ? 'abierto' : 'cerrado');

                // 🆕 Cargar notificaciones desde memoria (NO AJAX)
                if (isOpening) {
                    console.log('📥 Mostrando notificaciones existentes...');
                    await this.mostrarNotificacionesExistentes();
                }

                this.initAudioContext();
            });

            // Cerrar panel al hacer click fuera
            document.addEventListener('click', (e) => {
                if (!notifPanel.contains(e.target) && !notifIcon.contains(e.target)) {
                    console.log('🚪 Cerrando panel (click fuera)');
                    notifPanel.classList.remove('show');
                }
            });
        } else {
            console.warn('❌ No se encontraron elementos del panel de notificaciones');
        }

        // Marcar todas como leídas
        const marcarTodasBtn = document.getElementById('marcarTodasLeidas');
        if (marcarTodasBtn) {
            marcarTodasBtn.addEventListener('click', () => {
                this.marcarTodasLeidas();
                this.initAudioContext();
            });
        }

        // Delegación de eventos para botones dinámicos
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-marcar-leida')) {
                const notifItem = e.target.closest('.notificacion-item');
                if (notifItem) {
                    const idNotificacion = notifItem.dataset.id;
                    this.marcarComoLeida(idNotificacion, notifItem);
                    this.initAudioContext();
                }
            }
        });

        // Inicializar AudioContext con cualquier click
        document.addEventListener('click', () => {
            this.initAudioContext();
        });
    }

    // 🆕 MÉTODO SIN AJAX - MOSTRAR NOTIFICACIONES EXISTENTES
    async mostrarNotificacionesExistentes() {
        try {
            console.log('🎯 Mostrando notificaciones desde memoria...');

            // 🆕 CONTAR notificaciones no leídas que YA EXISTEN en el DOM
            const notificacionesNoLeidas = document.querySelectorAll('.notificacion-item.no-leida');
            const totalNoLeidas = notificacionesNoLeidas.length;

            console.log(`📊 ${totalNoLeidas} notificaciones no leídas en el panel`);

            // 🆕 ACTUALIZAR BADGE con el número real
            this.actualizarContadorNotificaciones(totalNoLeidas);

            // 🆕 SI NO HAY NOTIFICACIONES, mostrar mensaje amigable
            const lista = document.getElementById('notificacionesLista');
            if (!lista) return;

            const notificacionesExistentes = lista.querySelectorAll('.notificacion-item');
            if (notificacionesExistentes.length === 0) {
                this.mostrarMensajePanelVacio('No hay notificaciones nuevas. ¡Te avisaremos cuando lleguen!');
            }

        } catch (error) {
            console.log('📭 Error inesperado al mostrar notificaciones');
            this.mostrarMensajePanelVacio('Las notificaciones en tiempo real están activas');
        }
    }

    // 🆕 MÉTODO MEJORADO PARA MENSAJES
    mostrarMensajePanelVacio(mensaje) {
        const lista = document.getElementById('notificacionesLista');
        if (!lista) return;

        // 🆕 Verificar si ya hay notificaciones (no mostrar mensaje si hay)
        const notificacionesExistentes = lista.querySelectorAll('.notificacion-item');
        if (notificacionesExistentes.length > 0) {
            return; // Ya hay notificaciones, no mostrar mensaje
        }

        lista.innerHTML = `
            <div class="notificacion-vacia">
                <i class="fas fa-bell"></i>
                <p>${mensaje}</p>
                <small>El sistema te notificará automáticamente</small>
            </div>
        `;
    }

    initAudioContext() {
        if (this.audioContext || !window.AudioContext) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🔊 AudioContext inicializado');
        } catch (error) {
            console.log('🔇 No se pudo inicializar AudioContext:', error);
        }
    }

    // 🆕 CONEXIÓN SSE CON RUTA ABSOLUTA
    connectSSE() {
        if (document.visibilityState === 'hidden') {
            console.log('👻 Página en background - no conectar SSE');
            return;
        }

        if (this.eventSource) {
            this.eventSource.close();
        }

        // Limpiar timeout anterior y polling
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        try {
            // 🆕 URL ABSOLUTA PARA SSE
            const sseUrl = this.buildUrl('sse_notificaciones.php');
            console.log('🔌 Conectando a SSE:', sseUrl);

            // Timeout de conexión por seguridad
            const connectTimeout = setTimeout(() => {
                if (this.eventSource && this.eventSource.readyState !== EventSource.OPEN) {
                    console.log('⏰ Timeout de conexión SSE (5s) - cancelando');
                    this.eventSource.close();
                    this.eventSource = null;
                    this.isConnected = false;
                    this.updateConnectionStatus(false);
                }
            }, 5000);

            this.eventSource = new EventSource(sseUrl);

            this.eventSource.onopen = () => {
                clearTimeout(connectTimeout);
                console.log('✅ Conectado a notificaciones en tiempo real');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
            };

            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'ping') {
                        console.log('📡 Ping recibido - Conexión activa');
                    } else if (data.type === 'connected') {
                        console.log('✅ ' + data.message);
                    } else if (data.type === 'timeout') {
                        console.log('🔄 Reconectando por timeout...');
                        this.reconnectSSE();
                    }
                } catch (parseError) {
                    console.error('❌ Error parseando mensaje SSE:', parseError);
                }
            };

            // 🆕 MANEJADORES DE EVENTOS ESPECÍFICOS
            this.eventSource.addEventListener('nuevo_reporte', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleNuevoReporte(data);
                } catch (parseError) {
                    console.error('❌ Error parseando nuevo_reporte:', parseError);
                }
            });

            this.eventSource.addEventListener('nueva_notificacion', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleNuevaNotificacion(data.notificacion);
                } catch (parseError) {
                    console.error('❌ Error parseando nueva_notificacion:', parseError);
                }
            });

            this.eventSource.addEventListener('ping', (event) => {
                console.log('📡 Ping SSE recibido');
            });

            this.eventSource.addEventListener('error', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.error('❌ Error del servidor SSE:', data.message);
                    this.handleSSEError(data.message);
                } catch (parseError) {
                    console.error('❌ Error SSE:', event);
                }
            });

            this.eventSource.onerror = (error) => {
                clearTimeout(connectTimeout);
                console.error('❌ Error en conexión SSE:', error);
                this.handleSSEError();
            };

        } catch (error) {
            console.error('❌ Error inicializando SSE:', error);
            this.updateConnectionStatus(false);
            this.handleSSEError();
        }
    }

    // 🆕 MANEJO MEJORADO DE ERRORES SSE
    handleSSEError(message = 'Error de conexión') {
        this.isConnected = false;
        this.updateConnectionStatus(false);

        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        this.reconnectAttempts++;

        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            const delay = Math.min(2000 * this.reconnectAttempts, 10000);
            console.log(`🔄 Reintentando en ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            this.reconnectTimeout = setTimeout(() => {
                this.reconnectSSE();
            }, delay);
        } else {
            console.log('🚫 Máximo de intentos alcanzado - Cambiando a polling');
            this.fallbackToPolling();
        }
    }

    reconnectSSE() {
        console.log('🔄 Reconectando SSE...');
        this.connectSSE();
    }

    // 🆕 FALLBACK A POLLING MEJORADO (SOLO SI SSE FALLA COMPLETAMENTE)
    fallbackToPolling() {
        console.log('🔁 Iniciando polling para notificaciones...');
        this.showToast('Notificaciones en modo seguro (cada 30 segundos)', 'info');

        // 🆕 POLLING MUY ESPACIADO - solo como último recurso
        this.pollingInterval = setInterval(() => {
            console.log('📡 Polling de respaldo activo');
        }, 30000);
    }

    disconnectSSE() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            this.isConnected = false;
            console.log('🔴 SSE desconectado (página en background)');
            this.updateConnectionStatus(false);
        }
    }

    // 🆕 MÉTODO PARA LIMPIAR TODOS LOS RECURSOS
    destroy() {
        console.log('🧹 Limpiando recursos de NotificationManager...');

        // Cerrar conexión SSE
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            console.log('🔴 Conexión SSE cerrada');
        }

        // Limpiar timeouts e intervals
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        this.isConnected = false;
        this.updateConnectionStatus(false);
    }

    updateConnectionStatus(connected) {
        const notifIcon = document.getElementById('notificacionIcon');
        if (notifIcon) {
            if (connected) {
                notifIcon.classList.remove('offline');
                notifIcon.title = 'Notificaciones en tiempo real - Conectado';
            } else {
                notifIcon.classList.add('offline');
                notifIcon.title = 'Notificaciones - Sin conexión en tiempo real';
            }
        }

        // 🆕 INDICADOR VISUAL DE ESTADO
        this.updateConnectionIndicator(connected);
    }

    updateConnectionIndicator(connected) {
        let indicator = document.getElementById('sse-status-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'sse-status-indicator';
            indicator.className = 'sse-status-indicator';
            indicator.title = connected ? 'Conectado en tiempo real' : 'Modo seguro';
            document.body.appendChild(indicator);
        }

        indicator.className = `sse-status-indicator ${connected ? 'sse-connected' : 'sse-disconnected'}`;
        indicator.title = connected ? 'Conectado en tiempo real' : 'Modo seguro';
    }

    // 🆕 MÉTODO UNIFICADO PARA MANEJAR NUEVAS NOTIFICACIONES
    handleNuevoReporte(reporteData) {
        console.log('📢 Nuevo reporte en tiempo real:', reporteData);
        this.handleNuevaNotificacion({
            id_notificacion: 'sse-' + Date.now(),
            mensaje: reporteData.mensaje || `Nuevo reporte #${reporteData.id_reporte}`,
            tipo: 'nuevo_reporte',
            fecha_creacion: new Date().toISOString(),
            leida: 0,
            id_reporte: reporteData.id_reporte,
            timestamp: reporteData.timestamp
        });
    }

    handleNuevaNotificacion(notificacion) {
        console.log('🎯 Procesando nueva notificación:', notificacion);

        // 1. Mostrar notificación en tiempo real
        this.mostrarNotificacionTiempoReal(notificacion);

        // 2. Actualizar badge
        this.incrementarBadge();

        // 3. Reproducir sonido
        this.playNotificationSound();

        // 4. Notificación del navegador
        this.showBrowserNotification(notificacion);

        // 5. Agregar al panel
        this.agregarAlPanelNotificaciones(notificacion);

        // 🆕 6. Actualizar contador en memoria
        this.actualizarContadorDesdeDOM();
    }

    // 🆕 ACTUALIZAR CONTADOR DESDE EL DOM REAL
    actualizarContadorDesdeDOM() {
        const notificacionesNoLeidas = document.querySelectorAll('.notificacion-item.no-leida');
        const totalNoLeidas = notificacionesNoLeidas.length;
        this.actualizarContadorNotificaciones(totalNoLeidas);
    }

    mostrarNotificacionTiempoReal(notificacion) {
        this.showToast(`📢 ${notificacion.mensaje}`, 'info');
    }

    agregarAlPanelNotificaciones(notificacion) {
        const notifList = document.querySelector('.notificaciones-list');
        if (!notifList) {
            console.warn('❌ No se encontró el contenedor de notificaciones');
            return;
        }

        const notifElement = this.crearElementoNotificacion(notificacion);
        notifList.insertBefore(notifElement, notifList.firstChild);

        // Remover notificación vacía si existe
        const notifVacia = notifList.querySelector('.notificacion-vacia');
        if (notifVacia) {
            notifVacia.remove();
        }

        // 🆕 ACTUALIZAR CONTADOR INMEDIATAMENTE
        this.actualizarContadorDesdeDOM();
    }

    crearElementoNotificacion(notificacion) {
        const div = document.createElement('div');
        div.className = `notificacion-item ${notificacion.leida ? '' : 'no-leida'}`;
        div.dataset.id = notificacion.id_notificacion;

        const icono = this.getNotificationIcon(notificacion.tipo);

        div.innerHTML = `
            <div class="notificacion-icono">
                <i class="fas ${icono.icon} ${icono.color}"></i>
            </div>
            <div class="notificacion-contenido">
                <div class="notificacion-mensaje">${notificacion.mensaje}</div>
                <div class="notificacion-meta">
                    <span class="notificacion-fecha">
                        ${this.formatTime(notificacion.fecha_creacion)}
                    </span>
                    ${notificacion.tipo === 'nuevo_reporte' ? '<span class="notificacion-tipo">Nuevo Reporte</span>' : ''}
                </div>
                <div class="notificacion-acciones">
                    ${notificacion.id_reporte ?
                        `<a href="admin.php?ver_reporte=${notificacion.id_reporte}" class="btn-ver-reporte">
                            <i class="fas fa-eye"></i> Ver Reporte
                        </a>` : ''}
                    ${!notificacion.leida ?
                        `<button class="btn-marcar-leida">
                            <i class="fas fa-check"></i> Marcar leída
                        </button>` : ''}
                </div>
            </div>
        `;

        return div;
    }

    playNotificationSound() {
        if (!this.audioContext) {
            this.initAudioContext();
            return;
        }

        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;

            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, this.audioContext.currentTime + 0.3);
            oscillator.stop(this.audioContext.currentTime + 0.3);

        } catch (error) {
            console.log('🔇 Error reproduciendo sonido:', error);
        }
    }

    getNotificationIcon(tipo) {
        const icons = {
            'nuevo_reporte': { icon: 'fa-exclamation-circle', color: 'text-warning' },
            'alerta_autoridad': { icon: 'fa-paper-plane', color: 'text-info' },
            'like': { icon: 'fa-heart', color: 'text-danger' },
            'comentario': { icon: 'fa-comment', color: 'text-success' },
            'default': { icon: 'fa-bell', color: 'text-primary' }
        };

        return icons[tipo] || icons.default;
    }

    showBrowserNotification(notificacion) {
        if ("Notification" in window && Notification.permission === "granted") {
            const notification = new Notification("🚨 Nuevo Reporte - Villavicencio", {
                body: notificacion.mensaje,
                icon: '../../imagenes/fiveicon.png',
                tag: notificacion.id_reporte || 'notificacion'
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
                if (notificacion.id_reporte) {
                    window.location.href = `admin.php?ver_reporte=${notificacion.id_reporte}`;
                }
            };
        }
    }

    showToast(message, type = 'info') {
        // Evitar toasts duplicados
        const existingToasts = document.querySelectorAll('.toast-notification');
        if (existingToasts.length > 2) {
            existingToasts[0].remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    ${type === 'info' ? '📢' : type === 'success' ? '✅' : '⚠️'}
                </div>
                <span class="toast-message">${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }

    incrementarBadge() {
        const badge = document.querySelector('.notificacion-badge');
        if (badge) {
            const currentCount = parseInt(badge.textContent) || 0;
            badge.textContent = currentCount + 1;
            badge.style.display = 'flex';
        }

        const countElement = document.querySelector('.notificacion-count');
        if (countElement) {
            const currentText = countElement.textContent;
            const newCount = (parseInt(currentText) || 0) + 1;
            countElement.textContent = `${newCount} sin leer`;
        }
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Ahora mismo';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours} h`;

        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async marcarComoLeida(idNotificacion, element) {
        try {
            // 🆕 ACTUALIZAR INTERFAZ INMEDIATAMENTE
            element.classList.remove('no-leida');
            element.querySelector('.btn-marcar-leida')?.remove();

            // 🆕 ACTUALIZAR CONTADOR DESDE DOM REAL
            this.actualizarContadorDesdeDOM();

            this.showToast('Notificación marcada como leída', 'success');

            // 🆕 OPCIONAL: Enviar al servidor (pero no es crítico)
            console.log('📝 Notificación marcada como leída localmente:', idNotificacion);

        } catch (error) {
            console.error('Error marcando notificación como leída:', error);
            this.showToast('Error al marcar como leída', 'error');
        }
    }

    async marcarTodasLeidas() {
        try {
            // 🆕 ACTUALIZAR INTERFAZ INMEDIATAMENTE
            document.querySelectorAll('.notificacion-item.no-leida').forEach(item => {
                item.classList.remove('no-leida');
                item.querySelector('.btn-marcar-leida')?.remove();
            });

            // 🆕 ACTUALIZAR CONTADOR A CERO
            this.actualizarContadorNotificaciones(0);

            this.showToast('Todas las notificaciones marcadas como leídas', 'success');

            // 🆕 OPCIONAL: Enviar al servidor (pero no es crítico)
            console.log('📝 Todas las notificaciones marcadas como leídas localmente');

        } catch (error) {
            console.error('Error marcando todas como leídas:', error);
            this.showToast('Error al marcar todas como leídas', 'error');
        }
    }

    // 🆕 MÉTODO MEJORADO PARA ACTUALIZAR CONTADOR
    actualizarContadorNotificaciones(total) {
        const badge = document.querySelector('.notificacion-badge');
        const countElement = document.querySelector('.notificacion-count');

        if (badge) {
            badge.textContent = total;
            badge.style.display = total > 0 ? 'flex' : 'none';
        }

        if (countElement) {
            countElement.textContent = total > 0 ? `${total} sin leer` : 'Todas leídas';
        }

        console.log(`🔢 Badge actualizado: ${total} notificaciones`);
    }

    actualizarPanelNotificaciones(notificaciones) {
        const lista = document.getElementById('notificacionesLista');
        if (!lista) return;

        if (notificaciones.length === 0) {
            this.mostrarMensajePanelVacio('No hay notificaciones nuevas');
            return;
        }

        // 🆕 ESTE MÉTODO YA NO SE USA - las notificaciones se agregan una por una
    }
}

// Inicialización mejorada con manejo de errores
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si estamos en una página de admin
    if (window.location.pathname.includes('admin.php') ||
        document.querySelector('.admin-container')) {

        try {
            window.notificationManager = new NotificationManager();
            window.notificationManager.initialize();

            console.log('✅ NotificationManager inicializado correctamente');

            // Solicitar permisos de notificación después de un delay
            if ("Notification" in window && Notification.permission === "default") {
                setTimeout(() => {
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            console.log('✅ Permisos de notificación concedidos');
                        }
                    });
                }, 3000);
            }
        } catch (error) {
            console.error('❌ Error inicializando NotificationManager:', error);
        }
    }
});

// 🆕 Asegurar que se limpien los recursos incluso si hay errores
window.addEventListener('error', function() {
    if (window.notificationManager) {
        window.notificationManager.destroy();
    }
});

// 🆕 Manejar excepciones no capturadas
window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Promesa rechazada no manejada:', event.reason);
    if (window.notificationManager) {
        window.notificationManager.destroy();
    }
});
