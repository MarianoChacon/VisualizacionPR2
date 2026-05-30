import pandas as pd
from sklearn.preprocessing import StandardScaler
import numpy as np
import json

df_corr = pd.read_csv('inflacion_vs_resto_variables.csv', encoding='latin', sep=";")

df_corr = df_corr[~df_corr.isna().any(axis=1)]
df_corr['v_m_IPC'] = df_corr['v_m_IPC'].str.replace(",",".").astype(float)
df_corr = df_corr.loc[:,['v_m_IPC',
                         'IS_sector_privado_registrado',
                         'IS_sector_publico',
                         'IS_sector_no_registrado',
                         'Indice_inflacion_esperada',
                         'Tipo_cambio_minorista',
                         'Tipo_cambio_mayorista',
                         'Tipo_cambio_informal',
                         'Cant_dinero_liquido']]
df_corr.rename(columns={'IS_sector_privado_registrado':'Salario_privado_registrado',
                        'IS_sector_publico':'Salario_publico',
                        'IS_sector_no_registrado':'Salario_no_registrado',
                        'Indice_inflacion_esperada':'Inflacion_esperada'
                        }, inplace=True)
scaler = StandardScaler()
df_scaled = scaler.fit_transform(df_corr)
df_scaled = pd.DataFrame(df_scaled,columns=df_corr.columns)
correlaciones = df_scaled.corr()

nodes = [{"name": col, "value": col, "symbolSize": 30} for col in correlaciones.columns]
links = []
umbral_minimo = 0.2
columnas = correlaciones.columns
for i in range(len(columnas)):
    for j in range(i + 1, len(columnas)):
        var1 = columnas[i]
        var2 = columnas[j]
        valor_corr = float(correlaciones.iloc[i, j])
        

        if abs(valor_corr) >= umbral_minimo:
            links.append({
                "source": var1,
                "target": var2,
                "value": round(valor_corr, 3), 
                "lineStyle": {
                    "color": "#00ff62" if valor_corr > 0 else "#ff0400",
                    "width": abs(valor_corr) * 5,
                    "opacity": abs(valor_corr)
                }
            })

estructura_echarts = {
    "nodes": nodes,
    "links": links
}

with open('datos_correlacion_graph.json', 'w', encoding='utf-8') as f:
    json.dump(estructura_echarts, f, ensure_ascii=False, indent=4)