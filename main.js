// 1. Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    
    // 2. Seleccionar el contenedor HTML
    const contenedorMapa = document.getElementById('mapa');
    
    // 3. Inicializar el Mapa
    const mapa = echarts.init(contenedorMapa);

    // Registro del mapa
    mapa.showLoading();
    const urlGeoJSON = 'ProvinciasArgentina.geojson'
    // Obtengo el GeoJson
    fetch(urlGeoJSON)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error al cargar el archivo: ${response.statusText}`);
            }
            return response.json();
        })
        // Cuando ya está listo el GeoJson cargo los datos
        .then(datosMapa => {
            mapa.hideLoading();

            // 2. REGISTRAR EL MAPA
            echarts.registerMap('mapaArgentina', datosMapa);




    // 4. Definir la configuración y los datos del gráfico
        const opcionesMapa = {
            title: {
                text: 'Mapa de Argentina'
            },
            tooltip: {
                    trigger: 'item',
                    formatter: '{b}: {c}'
            },
            series: [
                {
                    name: 'Datos',
                    type: 'map',
                    map: 'mapaArgentina',
                    roam: true,
                    data: [
                        {name:'Tucumán', value: 150}
                    ]
                }
            ]
        };
    
        // 5. Mostrar el gráfico usando la configuración definida
        mapa.setOption(opcionesMapa);
    });
    // 6. Opcional: Hacer que el gráfico sea responsivo al cambiar el tamaño de la pantalla
    window.addEventListener('resize', () => {
        miGrafico.resize();
    });
});