let datosInfMensual = [];
let mapa = null;
let mapaNuevo = null; // Definimos el alcance correcto para ambos mapas

async function leerDatosInfMensual() {
    try {
        const respuesta = await fetch('inf_mens.json');
        if (!respuesta.ok) throw new Error("No se pudo cargar el JSON");
        return await respuesta.json();
    } catch (error) {
        console.error("Error cargando el JSON:", error);
    }
}

// 1. Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", async () => {
    
    // 2. Seleccionar los contenedores HTML e inicializar los Mapas
    const contenedorMapa = document.getElementById('mapa');
    mapa = echarts.init(contenedorMapa);
    mapa.showLoading();

    const contenedorMapaNuevo = document.getElementById('mapaNuevo');
    mapaNuevo = echarts.init(contenedorMapaNuevo);
    mapaNuevo.showLoading();

    const urlGeoJSON = 'ProvinciasArgentina.geojson';

    try {
        // Carga el JSON de datos y el GeoJSON del mapa en paralelo
        const [respuestaDatos, respuestaGeo] = await Promise.all([
            leerDatosInfMensual(),
            fetch(urlGeoJSON).then(res => {
                if (!res.ok) throw new Error(`Error GeoJSON: ${res.statusText}`);
                return res.json();
            })
        ]);

        datosInfMensual = respuestaDatos;
        const datosMapa = respuestaGeo;
        
        mapa.hideLoading();
        mapaNuevo.hideLoading();

        // Normalizar nombres del GeoJSON para compatibilidad con tildes
        datosMapa.features.forEach(feature => {
            if (feature.properties && feature.properties.nombre) {
                feature.properties.name = feature.properties.nombre;
            }
        });

        // Registrar el mapa en ECharts
        echarts.registerMap('mapaArgentina', datosMapa);

        if (datosInfMensual && datosInfMensual.length > 0) {
            // Llenar el selector del HTML con las fechas del JSON
            cargarFechasDisponibles();
            
            const selector = document.getElementById('filtro-fecha');
            selector.selectedIndex = selector.options.length - 1;
            
            const fechaFinal = selector.value;
            // Llamada única unificada para sincronizar escalas al inicio
            actualizarMapasSincronizados(fechaFinal);
        }

    } catch (error) {
        console.error("Error en la inicialización:", error);
        mapa.hideLoading();
        mapaNuevo.hideLoading();
    }

    // Escuchar el cambio de fecha desde el HTML usando la función unificada
    document.getElementById('filtro-fecha').addEventListener('change', (evento) => {
        actualizarMapasSincronizados(evento.target.value);
    });

    // Hacer que los gráficos sean responsivos
    window.addEventListener('resize', () => {
        mapa.resize();
        mapaNuevo.resize();
    });
});

// Extrae fechas únicas de tu JSON y llena el elemento HTML <select id="filtro-fecha">
function cargarFechasDisponibles() {
    const selector = document.getElementById('filtro-fecha');
    
    // 1. Extraer las fechas y recortarlas para quedarnos solo con "AAAA-MM"
    const todasLasFechasCortas = datosInfMensual.map(item => {
        const fechaLimpia = item.Fecha && item.Fecha.includes('T') ? item.Fecha.split('T')[0] : item.Fecha;
        return fechaLimpia ? fechaLimpia.substring(0, 7) : '';
    }).filter(Boolean);
    
    // 2. Eliminar duplicados y ordenar cronológicamente
    const fechasUnicas = [...new Set(todasLasFechasCortas)].sort();
    
    // 3. Limpiar e inyectar las opciones en el HTML
    selector.innerHTML = ''; 
    fechasUnicas.forEach(fechaAnioMes => {
        const opcion = document.createElement('option');
        opcion.value = fechaAnioMes;       
        opcion.textContent = fechaAnioMes; 
        selector.appendChild(opcion);
    });
}

// Filtra datosGlobales por la fecha seleccionada y actualiza ambos mapas con escalas comparables
function actualizarMapasSincronizados(fechaAFiltrar) {
    // 1. Filtrar registros una sola vez para optimizar rendimiento
    const registrosFiltrados = datosInfMensual.filter(item => item.Fecha && item.Fecha.startsWith(fechaAFiltrar));

    // 2. Mapear datos específicos para cada mapa
    const datosMapaIzquierdo = registrosFiltrados.map(item => ({
        name: item.Provincia,
        value: item.v_m_IPC
    }));

    const datosMapaDerecho = registrosFiltrados.map(item => ({
        name: item.Provincia,
        value: item.var_mens_pond_gral
    }));

    // 3. Extraer arrays con todos los valores numéricos
    const valoresIzquierdo = datosMapaIzquierdo.map(item => item.value).filter(v => v !== undefined && v !== null);
    const valoresDerecho = datosMapaDerecho.map(item => item.value).filter(v => v !== undefined && v !== null);

    // 4. Calcular mínimos y máximos locales de cada conjunto
    const valorMinimo = valoresIzquierdo.length > 0 ? Math.min(...valoresIzquierdo) : 0;
    const valorMaximo = valoresIzquierdo.length > 0 ? Math.max(...valoresIzquierdo) : 100;

    const valorMinimoNuevo = valoresDerecho.length > 0 ? Math.min(...valoresDerecho) : 0;
    const valorMaximoNuevo = valoresDerecho.length > 0 ? Math.max(...valoresDerecho) : 100;

    // 5. RANGOS GLOBALES COMPARABLES (Mínimo de los mínimos y Máximo de los máximos)
    const minGlobal = Math.min(valorMinimo, valorMinimoNuevo);
    const maxGlobal = Math.max(valorMaximo, valorMaximoNuevo);

    // 6. Configurar y actualizar Mapa Izquierdo (Paleta Mate)
    const opcionesMapa = {
        title: {
            text: 'IPC con ponderadores 2004',
            subtext: `Período: ${fechaAFiltrar}`
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}'
        },
        visualMap: {
            min: minGlobal, 
            max: maxGlobal, 
            left: 'left',
            top: 'bottom',
            text: ['Alto', 'Bajo'],
            calculable: true,
            inRange: {
                color: ['#fee5d9', '#fcae91', '#fb6a4a', '#cb181d', '#99000d']
            }
        },
        series: [{
            name: 'Datos',
            type: 'map',
            map: 'mapaArgentina',
            roam: true,
            data: datosMapaIzquierdo,
            itemStyle: {
                borderColor: '#1f0e10b3'
            }
        }]
    };
    mapa.setOption(opcionesMapa);

    // 7. Configurar y actualizar Mapa Derecho (Paleta Brillante)
    const opcionesMapaNuevo = {
        title: {
            text: 'IPC con ponderadores 2017',
            subtext: `Período: ${fechaAFiltrar}`
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}'
        },
        visualMap: {
            min: minGlobal, 
            max: maxGlobal, 
            left: 'right',
            top: 'bottom',
            text: ['Alto', 'Bajo'],
            calculable: true,
            inRange: {
                color: ['#fee5d9', '#fcae91', '#fb6a4a', '#cb181d', '#99000d']
            }
        },
        series: [{
            name: 'Datos',
            type: 'map',
            map: 'mapaArgentina',
            roam: true,
            data: datosMapaDerecho,
            itemStyle: {
            areaColor: '#140507',       // Color base si una provincia no tiene datos
            borderColor: '#140507',     // Borde naranja brillante para simular el tubo de neón
            borderWidth: 0.5,           // Grosor del borde
            shadowBlur: 1,             // Grado de dispersión del brillo (¡Crucial!)
            shadowColor: '#ff3300',     // Color del reflejo del brillo neón
            shadowOffsetX: 0,
            shadowOffsetY: 0
        },
        
        // EFECTO AL PASAR EL CURSOR (HOVER)
        emphasis: {
            itemStyle: {
                areaColor: '#fff500',   // Se ilumina en amarillo flúor al seleccionarla
                borderColor: '#ffffff',
                borderWidth: 2,
                shadowBlur: 15,         // El brillo se intensifica al pasar el mouse
                shadowColor: '#fff500'
            },
            label: {
                show: true,
                color: '#140507'        // Texto de la provincia en blanco brillante
            }
        }
        }]
    };
    mapaNuevo.setOption(opcionesMapaNuevo);
}