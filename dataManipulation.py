import pandas as pd

df_inf_men = pd.read_excel('Dataset_PR1.xlsx', sheet_name='Dataset_PR1')
df_inf_men_copy = df_inf_men.copy()
df_inf_men_gral =  df_inf_men.loc[df_inf_men_copy.Descripcion_aperturas == 'Nivel general',:]
df_inf_men_gral['Fecha'] = pd.to_datetime(df_inf_men_gral['Periodo'], format= '%Y%m')
df_inf_men_gral['Fecha'] = df_inf_men_gral['Fecha'].dt.strftime('%Y-%m-%d')
df_inf_men_gral = df_inf_men_gral.loc[:,['v_m_IPC', 'Region', 'Fecha']]
df_inf_men_gral.reset_index(inplace = True, drop = True)
df_regiones = pd.read_csv('provincias_regiones.csv')
df_inf_men_gral_prov = pd.merge(df_inf_men_gral, df_regiones, on='Region', how='inner')
df_inf_men_gral_prov = df_inf_men_gral_prov.loc[:,['Provincia','Fecha','v_m_IPC']]
# Obtención de la nueva inflación
df = df_inf_men.copy()
codigos = list(range(1,13))
df = df.loc[df['Codigo'].isin(codigos) ,:]
df['Fecha'] = pd.to_datetime(df['Periodo'], format= '%Y%m')
df['Fecha'] = df['Fecha'].dt.strftime('%Y-%m-%d')
df['var_mens_pond_gral'] = df['v_m_IPC']*(df['ponderador_general']/100).round(1)
df['var_mens_pond_prop'] = df['v_m_IPC']*(df['ponderador_propietario']/100).round(1)
df['var_mens_pond_inqui'] = df['v_m_IPC']*(df['ponderador_inquilino']/100).round(1)
df['var_mens_pond_ocupante'] = df['v_m_IPC']*(df['ponderador_ocupante']/100).round(1)
df_result = df.groupby(['Region','Fecha'])[['var_mens_pond_gral','var_mens_pond_prop', 'var_mens_pond_inqui', 'var_mens_pond_ocupante']].sum().reset_index()
df_final = pd.merge(df_result, df_regiones, on='Region', how='inner')
df_final = df_final.loc[:,['Provincia','Fecha','var_mens_pond_gral','var_mens_pond_prop', 'var_mens_pond_inqui', 'var_mens_pond_ocupante']]
df_final['var_mens_pond_gral'] = df_final['var_mens_pond_gral'].round(1)
df_final['var_mens_pond_prop'] = df_final['var_mens_pond_prop'].round(1)
df_final['var_mens_pond_inqui'] = df_final['var_mens_pond_inqui'].round(1)
df_final['var_mens_pond_ocupante'] = df_final['var_mens_pond_ocupante'].round(1)
df_final['Key'] = df_final['Provincia'] + df_final['Fecha'].astype(str)
df_inf_men_gral_prov['Key'] = df_inf_men_gral_prov['Provincia'] + df_inf_men_gral_prov['Fecha'].astype(str)
df_completo = pd.merge(df_inf_men_gral_prov, df_final, on='Key', how='inner')
df_completo.rename(columns={'Provincia_x':'Provincia','Fecha_x':'Fecha'}, inplace = True)
df_completo.drop(columns=['Key', 'Fecha_y', 'Provincia_y'], inplace=True)
df_completo.to_clipboard()
df_completo.to_json('inf_mens.json', orient='records', force_ascii=False, date_format='iso')
# df_inf_men_gral_prov.to_json('inf_mens.json', orient='records', force_ascii=False, date_format='iso')
