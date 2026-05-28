let datosInfMensual = [];
let datosInfNacional = [];
let mapa = null;
let mapaNuevo = null;
let graficoCarrera = null;
let indiceAnimacion = 0;
let temporizadorCarrera = null;
let datosFiltradosGlobal = null;
let yDataGralAcumulado = [];
let yDataIPCAcumulado = [];
let estaPausado = false;

// Variable de estado global para rastrear qué columna se visualiza en el mapa derecho
let ponderadorSeleccionado = 'var_mens_pond_gral'; 

async function leerDatosInfMensual() {
    try {
        const respuesta = await fetch('inf_mens.json');
        if (!respuesta.ok) throw new Error("No se pudo cargar el JSON");
        return await respuesta.json();
    } catch (error) {
        console.error("Error cargando el JSON:", error);
    }
}

async function leerDatosInfNacional() {
    try {
        const respuesta = await fetch('ipc_nacional.json');
        if (!respuesta.ok) throw new Error("No se pudo cargar el JSON");
        return await respuesta.json();
    } catch (error) {
        console.error("Error cargando el JSON:", error);
    }
}

// 1. Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", async () => {
    
    // 2. Seleccionar los contenedores HTML e inicializar los Mapas en modo oscuro
    const contenedorMapa = document.getElementById('mapa');
    mapa = echarts.init(contenedorMapa, 'dark');
    mapa.showLoading();

    const contenedorMapaNuevo = document.getElementById('mapaNuevo');
    mapaNuevo = echarts.init(contenedorMapaNuevo, 'dark');
    mapaNuevo.showLoading();

    const contenedorLineRace = document.getElementById('graficoCarrera');
    lineRace = echarts.init(contenedorLineRace, 'dark');

    const urlGeoJSON = 'ProvinciasArgentina.geojson';

    try {
        // Carga el JSON de datos y el GeoJSON del mapa en paralelo
        const [respuestaDatos, respuestaGeo, respuestaInfNac] = await Promise.all([
            leerDatosInfMensual(),
            fetch(urlGeoJSON).then(res => {
                if (!res.ok) throw new Error(`Error GeoJSON: ${res.statusText}`);
                return res.json();
            }),
            leerDatosInfNacional()
        ]);

        datosInfMensual = respuestaDatos;
        const datosMapa = respuestaGeo;
        datosInfNacional = respuestaInfNac
        
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
            // Inicializar ambos mapas
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


    cargarProvinciasDisponibles();
    const selectorProv = document.getElementById('filtro-provincia');
    if (selectorProv && selectorProv.value) {
        const datosIniciales = prepararDatosGraficoLinea(selectorProv.value);
        actualizarGraficoLineaCarrera(datosIniciales);
    }
    document.getElementById('filtro-provincia').addEventListener('change', (evento) => {
        const provinciaSeleccionada = evento.target.value;
        
        const nuevosDatos = prepararDatosGraficoLinea(provinciaSeleccionada);
        const nuevosDatosLinea = prepararDatosGraficoLinea(provinciaSeleccionada);
        // 2. Reiniciar y lanzar la simulación con estos datos
        actualizarGraficoLineaCarrera(nuevosDatosLinea);
    });
    const botonPlayPausa = document.getElementById('btn-play-pausa');
    if (botonPlayPausa) {
        botonPlayPausa.addEventListener('click', () => {
            if (estaPausado) {
                // Si estaba pausado, se reanuda la carrera
                estaPausado = false;
                botonPlayPausa.textContent = 'Pausa';
                botonPlayPausa.classList.remove('active'); 
                
                // Relanzar el intervalo desde la posición guardada
                if (datosFiltradosGlobal && indiceAnimacion < datosFiltradosGlobal.fechas.length) {
                    temporizadorCarrera = setInterval(tickCarrera, 300);
                }
            } else {
                // Si estaba corriendo, se pausa el intervalo
                estaPausado = true;
                botonPlayPausa.textContent = 'Play';
                botonPlayPausa.classList.add('active'); // Efecto neón encendido en pausa
                
                if (temporizadorCarrera) clearInterval(temporizadorCarrera);
            }
        });
    }


    // CONFIGURACIÓN DE LOS BOTONES DE FILTRO (Solo afectan al mapa derecho)
    document.querySelectorAll('.filtros-ponderador .btn-neon').forEach(boton => {
    boton.addEventListener('click', (evento) => {
        // Alternar clase activa visualmente SOLO en los botones del mapa
        document.querySelectorAll('.filtros-ponderador .btn-neon').forEach(b => b.classList.remove('active'));
        evento.target.classList.add('active');

        // Actualizar el estado global con la columna seleccionada
        ponderadorSeleccionado = evento.target.getAttribute('data-col');

        // Re-renderizar los mapas
        const fechaActual = document.getElementById('filtro-fecha').value;
        actualizarMapasSincronizados(fechaActual);
    });
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

// Filtra datosGlobales por la fecha seleccionada y actualiza ambos mapas de forma independiente
function actualizarMapasSincronizados(fechaAFiltrar) {
    // 1. Filtrar registros una sola vez por rendimiento
    const registrosFiltrados = datosInfMensual.filter(item => item.Fecha && item.Fecha.startsWith(fechaAFiltrar));
    const registrosFiltradosInfNac = datosInfNacional.filter(item => item.Fecha && item.Fecha.startsWith(fechaAFiltrar));
    const valoriflNacFiltrado = registrosFiltradosInfNac[0].v_m_IPC;
    const valoriflNacFiltrado17 = registrosFiltradosInfNac[0].v_i_a_IPC_pond17;

    const contenedorInfl04 = document.getElementById('inf_nacional_04');
    contenedorInfl04.textContent = `Inflación Nacional: ${valoriflNacFiltrado}`;
    
    const contenedorInfl17 = document.getElementById('inf_nacional_17');
    contenedorInfl17.textContent = `Inflación Nacional: ${valoriflNacFiltrado17}`;

    // 2. Mapear datos específicos para cada mapa
    const datosMapaIzquierdo = registrosFiltrados.map(item => ({
        name: item.Provincia,
        value: item.v_m_IPC
    }));

    const datosMapaDerecho = registrosFiltrados.map(item => ({
        name: item.Provincia,
        value: item[ponderadorSeleccionado] 
    }));

    // 3. Extraer arrays con todos los valores numéricos
    const valoresIzquierdo = datosMapaIzquierdo.map(item => item.value).filter(v => v !== undefined && v !== null);
    const valoresDerecho = datosMapaDerecho.map(item => item.value).filter(v => v !== undefined && v !== null);

    // 4. Calcular mínimos y máximos locales PROPIOS para cada mapa (Adiós minGlobal/maxGlobal)
    const minIzquierdo = valoresIzquierdo.length > 0 ? Math.min(...valoresIzquierdo) : 0;
    const maxIzquierdo = valoresIzquierdo.length > 0 ? Math.max(...valoresIzquierdo) : 100;

    const minDerecho = valoresDerecho.length > 0 ? Math.min(...valoresDerecho) : 0;
    const maxDerecho = valoresDerecho.length > 0 ? Math.max(...valoresDerecho) : 100;

    // Mapear los nombres amigables para el título dinámico del mapa derecho
    const titulosPonderadores = {
        'var_mens_pond_gral': 'Ponderación General',
        'var_mens_pond_prop': 'Ponderación Propietario',
        'var_mens_pond_inqui': 'Ponderación Inquilino',
        'var_mens_pond_ocupante': 'Ponderación Ocupante'
    };

    // 5. Configurar y actualizar Mapa Izquierdo (Paleta e Índices aislados)
    const opcionesMapa = {
        title: {
            text: 'IPC con ponderadores 2004',
            subtext: `Período: ${fechaAFiltrar}`,
            padding: [0, 0, 40, 0]
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}'
        },
        visualMap: {
            min: minIzquierdo, // <- Usa su propio mínimo
            max: maxIzquierdo, // <- Usa su propio máximo
            left: 'left',
            top: 'bottom',
            text: ['Alto', 'Bajo'],
            calculable: true,
            inRange: {
                color: ['#fee5d9', '#fcae91', '#fb6a4a', '#cb181d', '#99000d'] // Tus colores originales
            }
        },
        series: [{
            name: 'Datos',
            type: 'map',
            map: 'mapaArgentina',
            top: 60,
            roam: true,
            data: datosMapaIzquierdo,
            selectedMode: 'single',
            itemStyle: {
                borderColor: '#1f0e10b3'
            },
            emphasis: {
                label: {
                    show:true
                }
            },
            select: {
                label: {
                    show: true,
                    formatter: '{b}\n{c}'
                }
            }
        }]
    };
    mapa.setOption(opcionesMapa);

    // 6. Configurar y actualizar Mapa Derecho (Filtros y Escala independiente)
    const opcionesMapaNuevo = {
        backgroundColor:'#111422',
        title: {
            text: `IPC con ${titulosPonderadores[ponderadorSeleccionado]} 2017`,
            subtext: `Período: ${fechaAFiltrar}`,
            padding: [1, 0, 10, 0]
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}'
        },
        visualMap: {
            min: minDerecho, // <- Usa su propio mínimo según el botón activo
            max: maxDerecho, // <- Usa su propio máximo según el botón activo
            left: 'right',
            top: 'bottom',
            text: ['Alto', 'Bajo'],
            calculable: true,
            inRange: {
                color: ['#fee5d9', '#fcae91', '#fb6a4a', '#cb181d', '#99000d'] // Tus colores originales
            }
        },
        series: [{
            name: 'Datos',
            type: 'map',
            map: 'mapaArgentina',
            roam: true,
            top: 70,
            data: datosMapaDerecho,
            itemStyle: {
                areaColor: '#140507',       
                borderColor: '#140507',     
                borderWidth: 0.5,           
                shadowBlur: 1,             
                shadowColor: '#ff3300',     
                shadowOffsetX: 0,
                shadowOffsetY: 0
            },
                        emphasis: {
                itemStyle: {
                    areaColor: '#ff7a00',   // Cambia a un tono naranja iluminado al posicionarse encima
                    borderColor: '#ffffff', // Borde blanco para resaltar la provincia seleccionada
                    borderWidth: 1.5,
                    shadowBlur: 10,         // Incrementa el brillo en el hover
                    shadowColor: '#ff3300'
                },
                label: {
                    show: true,
                    color: '#ffffff'        // Forzar el texto de la provincia a blanco para que se lea en el fondo oscuro
                }
            }
        }]
    };
    mapaNuevo.setOption(opcionesMapaNuevo);
}   
//////////////////////////////////////////////////
//////////////////FUNCIONES PARA EL GRAFICO LINE RACE//////////////////////////////
/////////////////////////////////////////////////



function cargarProvinciasDisponibles() {
    const selectorProv = document.getElementById('filtro-provincia');
    
   
    const todasLasProvincias = datosInfMensual.map(item => {
        return item.Provincia;
    }).filter(Boolean);
    
 
    const provinciasUnicas = [...new Set(todasLasProvincias)].sort();
    
    selectorProv.innerHTML = ''; 
    provinciasUnicas.forEach(provUnic => {
        const opcionProv = document.createElement('option');
        opcionProv.value = provUnic;       
        opcionProv.textContent = provUnic; 
        selectorProv.appendChild(opcionProv);
    });
}

function prepararDatosGraficoLinea(provinciaAFiltrar) {
    // 1. Filtrar registros de la provincia una sola vez por rendimiento
    const registrosFiltrados = datosInfMensual.filter(item => {
        return item.Provincia && item.Provincia.trim().toLowerCase() === provinciaAFiltrar.trim().toLowerCase();
    });

    // 2. Mapear datos específicos para cada línea a lo largo del tiempo
    // Ordenamos cronológicamente para asegurar que la carrera avance de forma correcta
    registrosFiltrados.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));

    const datosLineaIzquierda = registrosFiltrados.map(item => ({
        name: item.Fecha.substring(0, 7), // Eje X: Solo "AAAA-MM"
        value: item.v_m_IPC
    }));

    const datosLineaDerecha = registrosFiltrados.map(item => ({
        name: item.Fecha.substring(0, 7), // Eje X: Solo "AAAA-MM"
        value: item[ponderadorSeleccionado] 
    }));

    // Devolvemos un objeto con las dos series listas para el gráfico
    return {
        fechas: datosLineaIzquierda.map(item => item.name),
        ipc2004: datosLineaIzquierda.map(item => item.value),
        pond2017: datosLineaDerecha.map(item => item.value)
    };
}

function actualizarGraficoLineaCarrera(datosFiltrados) {
    if (temporizadorCarrera) clearInterval(temporizadorCarrera);

    const contenedor = document.getElementById('graficoCarrera');
    if (!contenedor) return;

    if (!graficoCarrera) {
        graficoCarrera = echarts.init(contenedor, 'dark');
    }

    // Guardar los datos en la variable global y restablecer el botón a "Pausa"
    datosFiltradosGlobal = datosFiltrados;
    estaPausado = false;
    const botonPlayPausa = document.getElementById('btn-play-pausa');
    if (botonPlayPausa) {
        botonPlayPausa.textContent = 'Pausa';
        botonPlayPausa.classList.remove('active');
    }

    const { fechas } = datosFiltradosGlobal;
    const todasLasFechasEje = fechas.map(f => f.substring(0, 7));

    const opcionesBase = {
        backgroundColor: '#070910',
        title: {
            text: 'Evolución Comparativa de Inflación',
            left: 20,
            padding: [0, 0, 40, 0]
        },
        tooltip: {
            trigger: 'axis'
        },
        dataZoom: [
                {
                id: 'dataZoomX',
                type: 'slider',
                xAxisIndex: [0],
                filterMode: 'filter',
                minSpan: 0,
                rangeMode: ['value', 'value'] 
            }
        ],
        legend: {
            data: ['Ponderación General 2017', 'IPC 2004'],
            top: 20,
            right: 20
        },
        grid: {
            left: '5%',
            right: '5%',
            bottom: '10%',
            top: '20%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: todasLasFechasEje, 
            boundaryGap: false
        },
        yAxis: {
            type: 'value',
            name: 'Variación %'
        },
        series: [
            {
                name: 'Ponderación General 2017',
                type: 'line',
                data: [],
                smooth: true,
                symbol: 'none',
                lineStyle: { color: '#ff00a6', width: 3 },
                itemStyle: { color: '#ff00a6'}
            },
            {
                name: 'IPC 2004',
                type: 'line',
                data: [],
                smooth: true,
                symbol: 'none',
                lineStyle: { color: '#bfa17a', width: 2 },
                itemStyle: {color: '#bfa17a'}
            }
        ]
    };

    graficoCarrera.setOption(opcionesBase, true);

    // Reiniciar los contadores e índices globales para la nueva provincia
    yDataGralAcumulado = new Array(fechas.length).fill(null);
    yDataIPCAcumulado = new Array(fechas.length).fill(null);
    indiceAnimacion = 0;

    if (fechas.length > 0) {
        temporizadorCarrera = setInterval(tickCarrera, 100); 
    }
}

// Extraemos tickCarrera como una función independiente en el archivo principal
function tickCarrera() {
    if (!datosFiltradosGlobal) return;
    const { fechas, ipc2004, pond2017 } = datosFiltradosGlobal;

    if (indiceAnimacion >= fechas.length) {
        clearInterval(temporizadorCarrera); 
        return;
    }

    yDataGralAcumulado[indiceAnimacion] = pond2017[indiceAnimacion];
    yDataIPCAcumulado[indiceAnimacion] = ipc2004[indiceAnimacion];

    graficoCarrera.setOption({
        series: [
            { name: 'Ponderación General 2017', data: yDataGralAcumulado },
            { name: 'IPC 2004', data: yDataIPCAcumulado }
        ]
    });

    indiceAnimacion++;
}