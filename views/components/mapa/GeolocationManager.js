import { Config } from './utils/Config.js';
import { ErrorHandler } from './utils/ErrorHandler.js';

export class GeolocationManager {
    constructor(mapaManager) {
        this.mapa = mapaManager;
        this.locationMarker = null;
        this.accuracyCircle = null;
        this.controlAdded = false;
    }

    inicializar() {
        try {
            this._agregarControlGeolocalizacion();
            console.log('✅ GeolocationManager inicializado');
        } catch (error) {
            ErrorHandler.mostrarError('Error al inicializar GeolocationManager', error);
        }
    }

    _agregarControlGeolocalizacion() {
        const self = this; // Guardar referencia para usar en los callbacks
        
        const LocateControl = L.Control.extend({
            options: {
                position: 'bottomright'
            },
            
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.classList.add('geolocation-btn');

                container.innerHTML = '<a href="#" title="Mostrar mi ubicación actual" ' +
                    'style="display: block; width: 45px; height: 45px; ' +
                    'background: white; border: none; ' +
                    'border-radius: 50%; text-align: center; line-height: 45px; ' +
                    'font-size: 20px; text-decoration: none; color: #555; ' +
                    'box-shadow: 0 2px 6px rgba(0,0,0,0.3); ' +
                    'transition: all 0.3s ease;">' +
                    '<span style="display: inline-block; transition: transform 0.3s ease;">📍</span>' +
                    '</a>';
                
                const link = container.querySelector('a');
                
                // Prevenir eventos del mapa
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.on(container, 'click', L.DomEvent.stop);
                
                // Efecto hover
                link.addEventListener('mouseenter', function() {
                    this.style.background = '#f8f9fa';
                    this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
                    this.querySelector('span').style.transform = 'scale(1.1)';
                });
                
                link.addEventListener('mouseleave', function() {
                    this.style.background = 'white';
                    this.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
                    this.querySelector('span').style.transform = 'scale(1)';
                });
                
                // Evento click
                L.DomEvent.on(container, 'click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self._obtenerUbicacionUsuario(link);
                });
                
                return container;
            }
        });
        
        new LocateControl().addTo(this.mapa.getMap());
        this.controlAdded = true;
        console.log('✅ Control de geolocalización agregado');
    }

    async _obtenerUbicacionUsuario(link) {
        console.log('📍 Buscando ubicación...');
        
        if (!navigator.geolocation) {
            this._mostrarErrorGeolocalizacion('Tu navegador no soporta geolocalización');
            return;
        }
        
        // Mostrar loading
        const originalHTML = link.innerHTML;
        link.innerHTML = '<div style="width: 20px; height: 20px; margin: 0 auto; border: 2px solid #f3f3f3; border-top: 2px solid #4285f4; border-radius: 50%; animation: spin 1s linear infinite;"></div>';
        link.style.background = '#f8f9fa';
        link.style.pointerEvents = 'none';
        
        try {
            const position = await this._getCurrentPosition();
            this._manejarUbicacionExitosa(position, link, originalHTML);
        } catch (error) {
            this._manejarErrorGeolocalizacion(error, link, originalHTML);
        }
    }

    _getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, Config.geolocation);
        });
    }

    _manejarUbicacionExitosa(position, link, originalHTML) {
        console.log('✅ Ubicación encontrada:', position.coords);
        
        const latlng = [
            position.coords.latitude, 
            position.coords.longitude
        ];
        
        // Centrar mapa en la ubicación
        this.mapa.getMap().flyTo(latlng, 16, {
            duration: 1.5,
            easeLinearity: 0.25
        });
        
        this._agregarMarcadorUbicacion(latlng, position.coords.accuracy);
        this._restaurarBoton(link, originalHTML, true);
    }

    _agregarMarcadorUbicacion(latlng, accuracy) {
        // Remover marcadores anteriores
        this._limpiarMarcadores();
        
        // Crear marcador estilo Google Maps
        this.locationMarker = L.marker(latlng, {
            icon: this._crearIconoUbicacion(),
            zIndexOffset: 1000
        }).addTo(this.mapa.getMap());
        
        // Círculo de precisión
        if (accuracy) {
            this.accuracyCircle = L.circle(latlng, {
                radius: accuracy,
                color: '#4285f4',
                fillColor: '#4285f4',
                fillOpacity: 0.15,
                weight: 1,
                opacity: 0.6
            }).addTo(this.mapa.getMap());
        }
        
        // Popup informativo
        this.locationMarker.bindPopup(this._crearPopupUbicacion(latlng, accuracy)).openPopup();
    }

    _crearIconoUbicacion() {
        return L.divIcon({
            className: 'google-maps-marker',
            html: '<div style="position: relative; width: 22px; height: 22px;">' +
                  '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 14px; height: 14px; background: #4285f4; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); z-index: 2;"></div>' +
                  '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 22px; height: 22px; border: 2px solid #4285f4; border-radius: 50%; background: rgba(66, 133, 244, 0.2); animation: pulse-ring 2s infinite;"></div>' +
                  '</div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });
    }

    _crearPopupUbicacion(latlng, accuracy) {
        let accuracyHTML = '';
        if (accuracy) {
            accuracyHTML = '<div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: #f8f9fa; border-radius: 6px;">' +
                           '<span style="color: #34a853; font-size: 14px;">🎯</span>' +
                           '<div style="font-size: 12px;">' +
                           '<strong>Precisión:</strong><br>' +
                           '<span>± ' + Math.round(accuracy) + ' metros</span>' +
                           '</div>' +
                           '</div>';
        }

        return '<div style="min-width: 200px; font-family: Roboto, Arial, sans-serif;">' +
               '<div style="background: #4285f4; color: white; padding: 12px 16px; margin: -16px -16px 12px -16px; border-radius: 8px 8px 0 0; font-weight: 500; font-size: 14px;">' +
               '<div style="display: flex; align-items: center; gap: 8px;">' +
               '<span style="font-size: 16px;">📍</span>' +
               'Tu ubicación actual' +
               '</div>' +
               '</div>' +
               '<div style="padding: 0 8px 12px 8px;">' +
               '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding: 8px; background: #f8f9fa; border-radius: 6px;">' +
               '<span style="color: #4285f4; font-size: 14px;">📌</span>' +
               '<div style="font-size: 12px;">' +
               '<strong>Coordenadas:</strong><br>' +
               '<span style="font-family: Courier New, monospace;">' +
               latlng[0].toFixed(6) + ', ' + latlng[1].toFixed(6) +
               '</span>' +
               '</div>' +
               '</div>' +
               accuracyHTML +
               '<div style="margin-top: 12px; text-align: center;">' +
               '<button onclick="this.closest(\'.leaflet-popup\')._source.closePopup()" ' +
               'style="background: #f1f3f4; color: #3c4043; border: none; padding: 8px 16px; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500; transition: background 0.2s;" ' +
               'onmouseover="this.style.background=\'#e8eaed\'" ' +
               'onmouseout="this.style.background=\'#f1f3f4\'">' +
               'Cerrar' +
               '</button>' +
               '</div>' +
               '</div>' +
               '</div>';
    }

    _manejarErrorGeolocalizacion(error, link, originalHTML) {
        console.error('❌ Error de geolocalización:', error);
        
        let mensaje = 'No se pudo obtener la ubicación';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                mensaje = 'Permiso de ubicación denegado. Por favor, permite el acceso a la ubicación en la configuración de tu navegador.';
                break;
            case error.POSITION_UNAVAILABLE:
                mensaje = 'Información de ubicación no disponible. Verifica tu conexión GPS.';
                break;
            case error.TIMEOUT:
                mensaje = 'Tiempo de espera agotado. Intenta nuevamente.';
                break;
        }
        
        this._mostrarErrorGeolocalizacion(mensaje);
        this._restaurarBoton(link, originalHTML, false);
    }

    _mostrarErrorGeolocalizacion(mensaje) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'geolocation-alert';
        alertDiv.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; max-width: 300px; text-align: center; font-family: Arial, sans-serif;">' +
                            '<div style="font-size: 48px; margin-bottom: 10px;">📍</div>' +
                            '<h3 style="margin: 0 0 10px 0; color: #ea4335; font-size: 16px;">Ubicación no disponible</h3>' +
                            '<p style="margin: 0 0 15px 0; color: #5f6368; font-size: 14px; line-height: 1.4;">' +
                            mensaje +
                            '</p>' +
                            '<button onclick="this.parentElement.remove()" style="background: #1a73e8; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">' +
                            'Entendido' +
                            '</button>' +
                            '</div>';
        document.body.appendChild(alertDiv);
    }

    _restaurarBoton(link, originalHTML, exito) {
        setTimeout(() => {
            link.innerHTML = originalHTML;
            link.style.background = 'white';
            link.style.pointerEvents = 'auto';
            
            // Efecto de éxito o error
            link.style.background = exito ? '#34a853' : '#ea4335';
            link.style.color = 'white';
            setTimeout(() => {
                link.style.background = 'white';
                link.style.color = '#555';
            }, 1000);
        }, 500);
    }

    _limpiarMarcadores() {
        if (this.locationMarker) {
            this.mapa.getMap().removeLayer(this.locationMarker);
            this.locationMarker = null;
        }
        
        if (this.accuracyCircle) {
            this.mapa.getMap().removeLayer(this.accuracyCircle);
            this.accuracyCircle = null;
        }
    }

    // Método público para obtener ubicación programáticamente
    async obtenerUbicacionActual() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no soportada'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    reject(error);
                },
                Config.geolocation
            );
        });
    }

    limpiar() {
        this._limpiarMarcadores();
    }
}