if (window.connectionManager && typeof window.connectionManager === 'object') {
    console.log('✅ ConnectionManager ya está inicializado');
} else {
    class ConnectionManager {
        constructor() {
            this.isOnline = navigator.onLine;
            this.listeners = [];
            this.consecutiveFailures = 0;
            this.maxFailures = 1; // Solo 1 falla para cambiar a offline
            this.isChecking = false;

            console.log('🌐 ConnectionManager iniciado - Estado:', this.isOnline ? 'ONLINE' : 'OFFLINE');

            this.init();
        }

        init() {
            // EVENTOS PRINCIPALES - Confiar más en el navegador
            window.addEventListener('online', () => {
                console.log('📡 EVENTO ONLINE del navegador');
                this.handleBrowserOnline();
            });

            window.addEventListener('offline', () => {
                console.log('📡 EVENTO OFFLINE del navegador');
                this.setOnlineState(false);
            });

            // Verificar cada 5 segundos (menos frecuente para mejor performance)
            setInterval(() => this.checkConnection(), 5000);

            // Verificación inicial
            setTimeout(() => this.checkConnection(), 1000);
        }

        handleBrowserOnline() {
            // Cuando el navegador dice online, verificar realmente
            setTimeout(() => {
                this.checkConnection();
            }, 1000);
        }

        async checkConnection() {
            if (this.isChecking) return;
            this.isChecking = true;

            try {
                console.log('🔍 Verificando conexión a internet...');

                // ESTRATEGIA MEJORADA: Usar nuestro propio health-check
                const hasRealInternet = await this.checkRealInternet();

                if (hasRealInternet) {
                    this.consecutiveFailures = 0;
                    if (!this.isOnline) {
                        console.log('🟢 INTERNET DETECTADO - Cambiando a ONLINE');
                        this.setOnlineState(true);
                    }
                } else {
                    // Si no hay internet real, cambiar a offline inmediatamente
                    if (this.isOnline) {
                        console.log('🔴 SIN INTERNET - Cambiando a OFFLINE');
                        this.setOnlineState(false);
                    }
                }

            } catch (error) {
                console.log('🔍 Error en verificación:', error);
                // Si hay error, asumir que no hay internet
                if (this.isOnline) {
                    console.log('🔴 ERROR - Cambiando a OFFLINE');
                    this.setOnlineState(false);
                }
            } finally {
                this.isChecking = false;
            }
        }

        async checkRealInternet() {
            // VERIFICAR INTERNET USANDO NUESTRO PROPIO HEALTH-CHECK

            // 1. Primero verificar si el navegador dice que está offline
            if (!navigator.onLine) {
                console.log('❌ Navegador reporta OFFLINE');
                return false;
            }

            // 2. Intentar conectar a nuestro propio health-check endpoint
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                // 🆕 USAR NUESTRO PROPIO ENDPOINT - Sin problemas de CORS
                const response = await fetch('/api/health-check.php', {
                    method: 'HEAD',
                    cache: 'no-cache',
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    console.log('✅ Health-check local exitoso');
                    return true;
                } else {
                    console.log('❌ Health-check local falló');
                    return false;
                }

            } catch (error) {
                console.log('❌ No se pudo conectar al health-check:', error.message);

                // FALLBACK: Intentar con Google (solo como último recurso)
                try {
                    const fallbackResponse = await fetch('https://www.google.com/favicon.ico?t=' + Date.now(), {
                        method: 'HEAD',
                        cache: 'no-cache',
                        mode: 'no-cors'
                    });
                    console.log('✅ Fallback a Google exitoso');
                    return true;
                } catch (fallbackError) {
                    console.log('❌ Fallback también falló - Sin conexión real');
                    return false;
                }
            }
        }

        setOnlineState(online) {
            if (this.isOnline === online) {
                return;
            }

            this.isOnline = online;
            console.log('🌐🔥 CAMBIO DE ESTADO:', online ? 'ONLINE' : 'OFFLINE');

            this.notifyListeners();
            // 🆕 ELIMINADO: this.updateUI(); - Ya no actualiza la UI visualmente

            if (online) {
                this.onConnectionRestored();
            }
        }

        // 🆕 ELIMINADO: Métodos showOfflineUI() y hideOfflineUI()
        // Ya no se mostrará el banner rojo de offline

        disableOnlineFeatures() {
            const searchBtn = document.getElementById('btnBuscar');
            if (searchBtn) {
                searchBtn.disabled = true;
                searchBtn.style.opacity = '0.5';
                searchBtn.innerHTML = '🔍 Offline';
            }
        }

        enableOnlineFeatures() {
            const searchBtn = document.getElementById('btnBuscar');
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.style.opacity = '1';
                searchBtn.innerHTML = 'Buscar';
            }
        }

        onConnectionRestored() {
            console.log('🟢 CONEXIÓN RESTAURADA - Sincronizando...');

            if (window.OfflineManager && window.OfflineManager.intentarSincronizacionInmediata) {
                setTimeout(() => {
                    window.OfflineManager.intentarSincronizacionInmediata();
                }, 1000);
            }
        }

        addListener(callback) {
            this.listeners.push(callback);
        }

        notifyListeners() {
            this.listeners.forEach(listener => {
                try {
                    listener(this.isOnline);
                } catch (error) {
                    console.error('Error en listener:', error);
                }
            });
        }

        getStatus() {
            return this.isOnline;
        }
    }

    window.connectionManager = new ConnectionManager();
}
