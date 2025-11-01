class AdminManager {
    constructor() {
        this.map = null;
        this.mapInitialized = false;
        this.markers = [];
        this.init();
    }

    init() {
        console.log('🚀 Inicializando AdminManager...');
        this.fixScrollIssues();
        this.setupNavigation();
        this.setupEventListeners();
        this.setupLogoutHandler(); // ¡IMPORTANTE! Llamar directamente
        this.initializeMapIfNeeded();
    }

    // SOLUCIÓN PARA EL SCROLL
    fixScrollIssues() {
        console.log('🔓 Aplicando fix para scroll...');
        
        const elementsToFix = [
            document.documentElement,
            document.body,
            document.querySelector('.admin-container'),
            document.querySelector('.main-content'),
            document.querySelector('.tab-content'),
            document.querySelector('.dashboard-content')
        ];
        
        elementsToFix.forEach(element => {
            if (element) {
                element.style.overflow = '';
                element.style.overflowX = '';
                element.style.overflowY = '';
                element.style.height = '';
                element.style.maxHeight = '';
                element.style.minHeight = '';
                element.style.position = '';
            }
        });
        
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        document.documentElement.style.overflow = 'auto';
        document.documentElement.style.height = 'auto';
        
        console.log('✅ Fix de scroll aplicado');
    }

    // Navegación entre pestañas
    setupNavigation() {
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            // Excluir el logout de la navegación normal
            if (link.id === 'logoutLink' || link.classList.contains('logout-item')) {
                return;
            }
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                
                link.classList.add('active');
                const tabId = link.getAttribute('data-tab');
                const selectedTab = document.getElementById(tabId);
                
                if (selectedTab) {
                    selectedTab.classList.add('active');
                    
                    if (tabId === 'dashboard') {
                        setTimeout(() => this.initializeMapIfNeeded(), 100);
                    } else {
                        this.safeCleanupMap();
                    }
                }
            });
        });
    }

    // CONFIGURACIÓN DEL LOGOUT - MÉTODO MEJORADO
    setupLogoutHandler() {
        console.log('🔍 Configurando logout handler...');
        
        // Buscar el enlace de logout de múltiples formas
        let logoutLink = document.getElementById('logoutLink');
        
        if (!logoutLink) {
            logoutLink = document.querySelector('.logout-item');
        }
        
        if (!logoutLink) {
            logoutLink = document.querySelector('a[href*="logout"]');
        }
        
        if (!logoutLink) {
            // Buscar por texto
            const allLinks = document.querySelectorAll('a');
            logoutLink = Array.from(allLinks).find(link => 
                link.textContent.toLowerCase().includes('cerrar sesión') || 
                link.textContent.toLowerCase().includes('logout') ||
                link.textContent.toLowerCase().includes('salir')
            );
        }
        
        console.log('✅ Logout link encontrado:', logoutLink);
        
        if (logoutLink) {
            // Remover cualquier event listener previo
            const newLogoutLink = logoutLink.cloneNode(true);
            logoutLink.parentNode.replaceChild(newLogoutLink, logoutLink);
            
            // Agregar el event listener
            newLogoutLink.addEventListener('click', (e) => {
                console.log('🖱️ Click en logout detectado!');
                e.preventDefault();
                e.stopPropagation();
                this.showLogoutModal();
            });
            
            console.log('✅ Event listener de logout agregado correctamente');
        } else {
            console.error('❌ No se pudo encontrar el enlace de logout');
        }
    }

    // MOSTRAR MODAL DE LOGOUT
    showLogoutModal() {
        console.log('🎯 Mostrando modal de logout...');
        
        // Crear el modal
        const modal = document.createElement('div');
        modal.className = 'logout-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</h3>
                </div>
                <div class="modal-body">
                    <p>¿Estás seguro de que quieres cerrar sesión?</p>
                    <div class="logout-warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Serás redirigido a la página de inicio de sesión.</span>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancelLogout">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn btn-danger" id="confirmLogout">
                        <i class="fas fa-sign-out-alt"></i> Sí, Cerrar Sesión
                    </button>
                </div>
            </div>
        `;
        
        // Agregar al DOM
        document.body.appendChild(modal);
        
        // Forzar reflow y luego mostrar
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        // Configurar event listeners del modal
        this.setupModalEvents(modal);
    }

    // CONFIGURAR EVENTOS DEL MODAL
    setupModalEvents(modal) {
        // Botón Cancelar
        const cancelBtn = modal.querySelector('#cancelLogout');
        cancelBtn.addEventListener('click', () => {
            this.closeLogoutModal(modal);
        });
        
        // Botón Confirmar
        const confirmBtn = modal.querySelector('#confirmLogout');
        confirmBtn.addEventListener('click', () => {
            this.performLogout(confirmBtn);
        });
        
        // Cerrar al hacer clic fuera
        const overlay = modal.querySelector('.modal-overlay');
        overlay.addEventListener('click', () => {
            this.closeLogoutModal(modal);
        });
        
        // Cerrar con ESC
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                this.closeLogoutModal(modal);
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
        
        // Guardar referencia para limpiar
        modal._keydownHandler = handleKeydown;
    }

    // CERRAR MODAL
    closeLogoutModal(modal) {
        modal.classList.remove('show');
        document.removeEventListener('keydown', modal._keydownHandler);
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    // EJECUTAR LOGOUT
    performLogout(button) {
        console.log('🔐 Ejecutando logout...');
        
        // Mostrar estado de loading
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cerrando sesión...';
        button.disabled = true;
        
        // Redirigir después de un breve delay
        setTimeout(() => {
            window.location.href = '../../controllers/logoutcontrolador.php';
        }, 1000);
    }

    // ... (el resto de tus métodos del mapa se mantienen igual)
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'refreshMapBtn' || e.target.closest('#refreshMapBtn')) {
                this.refreshMap();
            }
            
            if (e.target.classList.contains('eliminar-reporte')) {
                const idReporte = e.target.getAttribute('data-id');
                AdminManager.eliminarReporte(idReporte);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('cambiar-estado')) {
                const idReporte = e.target.getAttribute('data-id');
                const nuevoEstado = e.target.value;
                AdminManager.cambiarEstadoReporte(idReporte, nuevoEstado);
            }
            
            if (e.target.classList.contains('cambiar-estado-usuario')) {
                const idUsuario = e.target.getAttribute('data-id');
                const nuevoEstado = e.target.value;
                AdminManager.cambiarEstadoUsuario(idUsuario, nuevoEstado);
            }
            
            if (e.target.id === 'filtroEstado') {
                this.filterReportesByEstado(e.target.value);
            }
        });
    }

    initializeMapIfNeeded() {
        if (this.mapInitialized) {
            console.log('ℹ️ Mapa ya inicializado');
            return;
        }

        const mapContainer = document.getElementById('adminMap');
        if (!mapContainer) {
            console.error('❌ Contenedor adminMap no encontrado');
            return;
        }

        if (!this.isContainerReady(mapContainer)) {
            console.error('❌ Contenedor no está listo');
            return;
        }

        this.initializeMap(mapContainer);
    }

    isContainerReady(container) {
        if (!container || !container.getBoundingClientRect) return false;
        const rect = container.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && document.body.contains(container);
    }

    initializeMap(container) {
        try {
            console.log('🗺️ Inicializando mapa...');
            this.cleanContainer(container);

            this.map = L.map('adminMap', {
                zoomControl: true,
                attributionControl: true,
                preferCanvas: true,
                scrollWheelZoom: false,
                dragging: true,
                doubleClickZoom: true,
                boxZoom: true,
                keyboard: false
            }).setView([4.142, -73.626], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            this.preventMapScrollInterference();
            this.mapInitialized = true;
            console.log('✅ Mapa inicializado correctamente');
            this.cargarReportesEnMapa();

        } catch (error) {
            console.error('💥 Error inicializando mapa:', error);
            this.handleMapError();
        }
    }

    preventMapScrollInterference() {
        if (!this.map) return;
        this.map.scrollWheelZoom.disable();
        
        const mapContainer = this.map.getContainer();
        mapContainer.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: false });

        mapContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.stopPropagation();
            }
        }, { passive: false });
    }

    async cargarReportesEnMapa() {
        if (!this.map || !this.mapInitialized) {
            console.log('❌ Mapa no disponible para cargar reportes');
            return;
        }

        console.log('📊 Cargando reportes...');

        try {
            const response = await fetch('../../controllers/reportecontrolador.php?action=listar');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const reportes = await response.json();
            console.log(`📊 ${reportes.length} reportes cargados desde BD`);

            this.clearMarkers();

            const validReportes = reportes.filter(reporte => 
                reporte.latitud && reporte.longitud &&
                !isNaN(parseFloat(reporte.latitud)) && !isNaN(parseFloat(reporte.longitud))
            );

            console.log(`📍 ${validReportes.length} reportes con coordenadas válidas`);

            validReportes.forEach(reporte => {
                try {
                    const lat = parseFloat(reporte.latitud);
                    const lng = parseFloat(reporte.longitud);
                    
                    const marker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'custom-marker',
                            html: '📍',
                            iconSize: [30, 30],
                            iconAnchor: [15, 30]
                        })
                    }).addTo(this.map);
                    
                    marker.bindPopup(this.createPopupContent(reporte));
                    this.markers.push(marker);
                    
                } catch (markerError) {
                    console.error('Error creando marcador:', markerError);
                }
            });

            if (this.markers.length > 0) {
                const group = L.featureGroup(this.markers);
                this.map.fitBounds(group.getBounds().pad(0.1));
                console.log('🎯 Vista ajustada a los marcadores');
            } else {
                console.log('ℹ️ No hay marcadores para mostrar');
                this.showMapMessage('No hay reportes con coordenadas válidas para mostrar', 'info');
            }

        } catch (error) {
            console.error('❌ Error cargando reportes:', error);
            this.showMapMessage('Error al cargar reportes: ' + error.message, 'error');
        }
    }

    clearMarkers() {
        console.log(`🧹 Limpiando ${this.markers.length} marcadores...`);
        this.markers.forEach(marker => {
            if (this.map) {
                this.map.removeLayer(marker);
            }
        });
        this.markers = [];
        console.log('✅ Marcadores limpiados');
    }

    cleanContainer(container) {
        try {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            if (container._leaflet_id) {
                delete container._leaflet_id;
            }
        } catch (error) {
            console.error('Error limpiando contenedor:', error);
        }
    }

    refreshMap() {
        console.log('🔁 Refrescando mapa y reportes...');
        
        if (this.map && this.mapInitialized) {
            this.cargarReportesEnMapa();
        } else {
            this.safeCleanupMap();
            setTimeout(() => {
                this.initializeMapIfNeeded();
            }, 500);
        }
    }

    safeCleanupMap() {
        this.clearMarkers();
        if (this.map) {
            try {
                this.map.remove();
            } catch (error) {
                console.error('Error removiendo mapa:', error);
            }
            this.map = null;
        }
        this.mapInitialized = false;
    }

    showMapMessage(mensaje, tipo = 'info') {
        const mapContainer = document.getElementById('adminMap');
        if (mapContainer) {
            const color = tipo === 'error' ? '#dc3545' : 
                         tipo === 'warning' ? '#f39c12' : '#007bff';
            const icon = tipo === 'error' ? 'exclamation-triangle' : 
                        tipo === 'warning' ? 'exclamation-circle' : 'info-circle';
            
            mapContainer.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100%; background: #f8f9fa; color: ${color}; text-align: center; padding: 20px;">
                    <div>
                        <i class="fas fa-${icon}" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p style="margin: 0; font-weight: bold;">${mensaje}</p>
                        <button onclick="window.adminManager.refreshMap()" 
                                style="padding: 8px 16px; background: ${color}; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                            Reintentar
                        </button>
                    </div>
                </div>
            `;
        }
    }

    createPopupContent(reporte) {
        const statusColor = this.getStatusColor(reporte.estado);
        return `
            <div style="min-width: 250px; max-width: 300px;">
                <h4 style="margin: 0 0 8px 0; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                    ${reporte.tipo_incidente || 'Incidente'}
                </h4>
                <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.4;">
                    ${reporte.descripcion || 'Sin descripción'}
                </p>
                <div style="font-size: 12px; color: #666; line-height: 1.4;">
                    <strong>Usuario:</strong> ${reporte.correo || reporte.usuario || 'Anónimo'}<br>
                    <strong>Fecha:</strong> ${new Date(reporte.fecha_reporte).toLocaleDateString()}<br>
                    <strong>Estado:</strong> <span style="color: ${statusColor}; font-weight: bold;">${reporte.estado || 'Desconocido'}</span>
                </div>
            </div>
        `;
    }

    getStatusColor(estado) {
        const colors = {
            'Pendiente': '#f39c12',
            'En Proceso': '#3498db', 
            'Resuelto': '#27ae60',
            'Verificado': '#9b59b6'
        };
        return colors[estado] || '#95a5a6';
    }

    handleMapError() {
        this.mapInitialized = false;
        this.map = null;
        this.markers = [];
        this.showMapMessage('Error al inicializar el mapa', 'error');
    }

    filterReportesByEstado(estado) {
        const filas = document.querySelectorAll('#reportes tbody tr');
        filas.forEach(fila => {
            const badge = fila.querySelector('.badge');
            if (badge) {
                const estadoFila = badge.textContent.trim();
                fila.style.display = (!estado || estadoFila === estado) ? '' : 'none';
            }
        });
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Métodos estáticos
AdminManager.cambiarEstadoReporte = function(idReporte, nuevoEstado) {
    if (confirm(`¿Cambiar estado del reporte #${idReporte} a "${nuevoEstado}"?`)) {
        this.enviarAccion('cambiar_estado_reporte', { id_reporte: idReporte, nuevo_estado: nuevoEstado });
    }
};

AdminManager.eliminarReporte = function(idReporte) {
    if (confirm(`¿Estás seguro de eliminar el reporte #${idReporte}?`)) {
        this.enviarAccion('eliminar_reporte', { id_reporte: idReporte });
    }
};

AdminManager.cambiarEstadoUsuario = function(idUsuario, nuevoEstado) {
    const accion = nuevoEstado == 1 ? 'activar' : 'desactivar';
    if (confirm(`¿${accion.toUpperCase()} al usuario #${idUsuario}?`)) {
        this.enviarAccion('cambiar_estado_usuario', { id_usuario: idUsuario, nuevo_estado: nuevoEstado });
    }
};

AdminManager.enviarAccion = function(accion, datos) {
    const formData = new FormData();
    formData.append('action', accion);
    for (const [key, value] of Object.entries(datos)) {
        formData.append(key, value);
    }

    fetch('admin.php', { method: 'POST', body: formData })
        .then(response => {
            if (response.ok) {
                location.reload();
            } else {
                alert('Error al procesar la solicitud');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error de conexión');
        });
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM cargado - Inicializando AdminManager...');
    
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    window.adminManager = new AdminManager();
    window.refreshAdminMap = function() {
        if (window.adminManager) {
            window.adminManager.refreshMap();
        }
    };
});