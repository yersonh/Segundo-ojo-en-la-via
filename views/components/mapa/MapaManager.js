import { Config } from './utils/Config.js';
import { ErrorHandler } from './utils/ErrorHandler.js';

export class MapaManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.markerNuevo = null;
        this.managers = {};
    }

    inicializar(containerId = 'map') {
        try {
            this.map = L.map(containerId, {
                zoomControl: true,
                attributionControl: true,
                preferCanvas: true,
                scrollWheelZoom: true,
                dragging: true,
                doubleClickZoom: true,
                boxZoom: true
            }).setView(Config.map.defaultCenter, Config.map.defaultZoom);

            this._cargarMapaBase();
            this._configurarEventos();

            console.log('✅ Mapa inicializado correctamente');
            return this.map;
        } catch (error) {
            ErrorHandler.mostrarError('Error al inicializar el mapa', error);
            throw error;
        }
    }

    _cargarMapaBase() {
        L.tileLayer(Config.map.tileLayer, {
            maxZoom: Config.map.maxZoom,
            attribution: Config.map.attribution,
            subdomains: 'abc'
        }).addTo(this.map);
    }

    _configurarEventos() {
        // Evento de clic en el mapa para seleccionar ubicación
        this.map.on('click', (e) => {
            console.log('🗺️ Clic en mapa detectado:', e.latlng);
            this.seleccionarUbicacion(e.latlng);
        });

        // Mejorar experiencia de hover en marcadores
        this.map.on('popupopen', (e) => {
            const marker = e.popup._source;
            if (marker) {
                marker.setZIndexOffset(1000);
            }
        });
    }

    seleccionarUbicacion(latlng) {
        const { lat, lng } = latlng;

        this.limpiarMarcadorTemporal();

        this.markerNuevo = L.marker([lat, lng], {
            icon: this._crearIconoSeleccionado(),
            zIndexOffset: 1000
        }).addTo(this.map);

        this._notificarFormularioCoordenadas(lat, lng);

        // Mostrar popup
        this.markerNuevo.bindPopup(this._crearPopupSeleccionado(lat, lng)).openPopup();
    }

    _notificarFormularioCoordenadas(lat, lng) {
        console.log('📍 Notificando coordenadas al formulario:', lat, lng);

        // Método 1: Usar el sistema global
        if (window.formularioSistema) {
            window.formularioSistema.updateCoordinates(lat, lng);
        }
        // Método 2: Usar FormularioManager global (backward compatibility)
        else if (window.FormularioManager && window.FormularioManager.updateCoordinates) {
            window.FormularioManager.updateCoordinates(lat, lng);
        }
        // Método 3: Llamar directamente a la función del formulario
        else if (window.FormularioManager && window.FormularioManager.actualizarCoordenadas) {
            window.FormularioManager.actualizarCoordenadas(lat, lng);
        }
        // Método 4: Disparar evento personalizado
        else {
            const event = new CustomEvent('ubicacionSeleccionada', {
                detail: { lat, lng }
            });
            document.dispatchEvent(event);
        }
    }

    _crearIconoSeleccionado() {
        return L.divIcon({
            className: 'custom-marker marker-selected',
            html: '<div style="background: ' + Config.icons.selectedColor + '; border: 3px solid white; border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 3px 15px rgba(231, 76, 60, 0.4); animation: pulse 1.5s infinite;">🎯</div>',
            iconSize: [45, 45],
            iconAnchor: [22, 45],
            popupAnchor: [0, -45]
        });
    }

    _crearPopupSeleccionado(lat, lng) {
        return '<div style="text-align: center; padding: 10px; min-width: 200px;">' +
               '<div style="font-size: 16px; font-weight: bold; color: #e74c3c; margin-bottom: 8px;">📍 Ubicación Seleccionada</div>' +
               '<div style="font-family: Courier New, monospace; font-size: 12px; background: #f8f9fa; padding: 8px; border-radius: 4px;">' +
               '<strong>Lat:</strong> ' + lat.toFixed(6) + '<br>' +
               '<strong>Lng:</strong> ' + lng.toFixed(6) +
               '</div>' +
               '<div style="margin-top: 8px; font-size: 11px; color: #666;">Haz clic en "Registrar Reporte" para guardar</div>' +
               '</div>';
    }

    limpiarMarcadorTemporal() {
        if (this.markerNuevo) {
            this.map.removeLayer(this.markerNuevo);
            this.markerNuevo = null;
        }
    }

    // Métodos públicos para interactuar con otros managers
    getMap() {
        return this.map;
    }

    setManager(nombre, manager) {
        this.managers[nombre] = manager;
    }

    getManager(nombre) {
        return this.managers[nombre];
    }

    mostrarAlerta(mensaje, tipo = 'success') {
        const alertSuccess = document.getElementById('alertSuccess');
        const alertError = document.getElementById('alertError');

        if (tipo === 'success') {
            alertSuccess.textContent = mensaje;
            alertSuccess.style.display = 'block';
            alertError.style.display = 'none';

            setTimeout(() => {
                alertSuccess.style.display = 'none';
            }, 5000);
        } else {
            alertError.textContent = mensaje;
            alertError.style.display = 'block';
            alertSuccess.style.display = 'none';
        }
    }

    destruir() {
        if (this.map) {
            this.map.off();
            this.map.remove();
            this.map = null;
        }

        this.markers = [];
        this.markerNuevo = null;
        this.managers = {};
    }
}
