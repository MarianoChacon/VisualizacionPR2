import pandas as pd

df_inf_men = pd.read_excel('Dataset_PR1.xlsx', sheet_name='Dataset_PR1')
df_inf_men_gral =  df_inf_men.loc[df_inf_men.Descripcion_aperturas == 'Nivel general',:]
df_inf_men_gral['Fecha'] = pd.to_datetime(df_inf_men_gral['Periodo'], format= '%Y%m')
df_inf_men_gral['Fecha'] = df_inf_men_gral['Fecha'].dt.strftime('%Y-%m-%d')
df_inf_men_gral = df_inf_men_gral.loc[:,['v_m_IPC', 'Region', 'Fecha']]
df_inf_men_gral.reset_index(inplace = True, drop = True)
df_regiones = pd.read_csv('provincias_regiones.csv')
df_inf_men_gral_prov = pd.merge(df_inf_men_gral, df_regiones, on='Region', how='inner')
df_inf_men_gral_prov = df_inf_men_gral_prov.loc[:,['Provincia','Fecha','v_m_IPC']]
df_inf_men_gral_prov.to_json('inf_mens.json', orient='records', force_ascii=False, date_format='iso')

