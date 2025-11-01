export class ErrorHandler {
    static mostrarError(mensaje, error = null) {
        console.error(`❌ ${mensaje}:`, error);
        
        // Mostrar alerta visual si está disponible
        if (typeof window !== 'undefined' && window.MapaManager) {
            window.MapaManager.mostrarAlerta?.(mensaje, 'error');
        }
        
        // Opcional: enviar a servicio de monitoreo
        this.reportarError(mensaje, error);
    }
    
    static reportarError(mensaje, error) {
        // Integración con servicios como Sentry, LogRocket, etc.
        if (window.analytics) {
            window.analytics.track('Error', { 
                mensaje, 
                error: error?.message,
                stack: error?.stack 
            });
        }
    }
    
    static mostrarAlertaUsuario(mensaje, tipo = 'error') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `
            <div style="padding: 10px; margin: 10px; border-radius: 5px; background: ${tipo === 'error' ? '#f8d7da' : '#d1ecf1'}; color: ${tipo === 'error' ? '#721c24' : '#0c5460'};">
                ${mensaje}
            </div>
        `;
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}