// Cargar datos de inflación general índice vigente
let datosInfMensual = [];
let mapa = null;
let mapa_nuevo = null; // Definimos el mapa con alcance amplio para poder actualizarlo

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
    
    // 2. Seleccionar el contenedor HTML e inicializar el Mapa
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
            filtrarYActualizarMapa(fechaFinal);
            filtrarYActualizarMapaNuevo(fechaFinal);
        }

    } catch (error) {
        console.error("Error en la inicialización:", error);
        mapa.hideLoading();
        mapaNuevo.hideLoading();
    }

    // Escuchar el cambio de fecha desde el HTML
    document.getElementById('filtro-fecha').addEventListener('change', (evento) => {
        filtrarYActualizarMapa(evento.target.value);
        filtrarYActualizarMapaNuevo(evento.target.value);
    });

    // Hacer que el gráfico sea responsivo
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
        // Tomamos una fecha limpia (sin ISO "T") y extraemos los primeros 7 caracteres
        const fechaLimpia = item.Fecha.includes('T') ? item.Fecha.split('T')[0] : item.Fecha;
        return fechaLimpia.substring(0, 7); // Resultado: "2016-12" en vez de "2016-12-01"
    });
    
    // 2. Eliminar duplicados y ordenar cronológicamente
    const fechasUnicas = [...new Set(todasLasFechasCortas)].sort();
    
    // 3. Limpiar e inyectar las opciones en el HTML
    selector.innerHTML = ''; 
    fechasUnicas.forEach(fechaAnioMes => {
        const opcion = document.createElement('option');
        opcion.value = fechaAnioMes;       // El valor técnico que usará el filtro (ej: "2016-12")
        opcion.textContent = fechaAnioMes; // Lo que ve el usuario en el desplegable (ej: "2016-12")
        selector.appendChild(opcion);
    });
}

// Filtra datosGlobales por la fecha seleccionada y actualiza el mapa de ECharts
function filtrarYActualizarMapa(fechaAFiltrar) {
    // Filtrar registros correspondientes a la fecha
    const registrosFiltrados = datosInfMensual.filter(item => item.Fecha.startsWith(fechaAFiltrar));

    // Mapear los datos al formato nativo de ECharts { name, value }
    const datosParaEcharts = registrosFiltrados.map(item => ({
        name: item.Provincia,
        value: item.v_m_IPC
    }));
    const todosLosValores = datosParaEcharts.map(item => item.value);
    const valorMinimo = todosLosValores.length > 0 ? Math.min(...todosLosValores) : 0;
    const valorMaximo = todosLosValores.length > 0 ? Math.max(...todosLosValores) : 100;
    const opcionesMapa = {
        title: {
            text: 'Mapa de Argentina',
            subtext: `Período: ${fechaAFiltrar}`
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}'
        },
        visualMap: {
            min: valorMinimo,
            max: valorMaximo,
            left: 'left',
            top: 'bottom',
            text: ['Alto', 'Bajo'],
            calculable: true,
            inRange: {
                // Escala de colores: de tonos claros/fríos a oscuros/cálidos
                color: ['#fee5d9','#fcae91','#fb6a4a','#cb181d','#99000d']
            }
        },
        series: [
            {
                name: 'Datos',
                type: 'map',
                map: 'mapaArgentina',
                roam: true,
                data: datosParaEcharts // Datos dinámicos según el filtro
            }
        ]
    };

    // Actualizar el gráfico aplicando animaciones de transición automáticas
    mapa.setOption(opcionesMapa);
}


function filtrarYActualizarMapaNuevo(fechaAFiltrar) {
    // Filtrar registros correspondientes a la fecha
    const registrosFiltrados = datosInfMensual.filter(item => item.Fecha.startsWith(fechaAFiltrar));

    // Mapear los datos al formato nativo de ECharts { name, value }
    const datosParaEchartsNuevo = registrosFiltrados.map(item => ({
        name: item.Provincia,
        value: item.var_mens_pond_gral
    }));
    const todosLosValoresNuevo = datosParaEchartsNuevo.map(item => item.value);
    const valorMinimoNuevo = todosLosValoresNuevo.length > 0 ? Math.min(...todosLosValoresNuevo) : 0;
    const valorMaximoNuevo = todosLosValoresNuevo.length > 0 ? Math.max(...todosLosValoresNuevo) : 100;
    const opcionesMapaNuevo = {
        title: {
            text: 'Mapa de Argentina Nuevo',
            subtext: `Período: ${fechaAFiltrar}`
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}'
        },
        visualMap: {
            min: valorMinimoNuevo,
            max: valorMaximoNuevo,
            left: 'right',
            top: 'bottom',
            text: ['Alto', 'Bajo'],
            calculable: true,
            inRange: {
                color: ['#fff7ec','#fee8c8','#fdbb84','#fc8d59','#ef3b2c']
            }
        },
        series: [
            {
                name: 'Datos',
                type: 'map',
                map: 'mapaArgentina',
                roam: true,
                data: datosParaEchartsNuevo // Datos dinámicos según el filtro
            }
        ]
    };

    // Actualizar el gráfico aplicando animaciones de transición automáticas
    mapaNuevo.setOption(opcionesMapaNuevo);
}