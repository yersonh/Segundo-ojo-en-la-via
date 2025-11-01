export const Config = {
    map: {
        defaultCenter: [4.142, -73.626],
        defaultZoom: 13,
        maxZoom: 19,
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    clusters: {
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true
    },
    geolocation: {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
    },
    cache: {
        reportesTTL: 5 * 60 * 1000 // 5 minutos
    },
    icons: {
        defaultColor: '#3498db',
        selectedColor: '#e74c3c',
        estado: {
            'Pendiente': '#e74c3c',
            'En Proceso': '#f39c12',
            'Resuelto': '#27ae60',
            'Verificado': '#9b59b6'
        }
    }
};

export const TipoIconos = {
    'Accidente de tránsito': '🚨',
    'Hueco en la vía': '🕳️',
    'Inundación': '🌊',
    'Semáforo dañado': '🚦',
    'default': '📍'
};