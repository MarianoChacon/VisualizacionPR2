import pandas as pd

df_ipc_nac = pd.read_csv('Inflacion_nacional.csv', delimiter=";", encoding='latin')
df_dif_pond = pd.read_csv('Diferencia_ponderadores.csv',delimiter=";", encoding='latin')
df_ipc_nac['v_m_IPC'] = df_ipc_nac['v_m_IPC'].fillna(0)
df_ipc_nac['v_m_IPC'] = df_ipc_nac['v_m_IPC'].str.replace(",",".").astype(float)
df_dif_pond['pond_04'] = df_dif_pond['pond_04'].str.replace(",",".").astype(float)
df_dif_pond['pond_17'] = df_dif_pond['pond_17'].str.replace(",",".").astype(float)
df_ipc_nac['Fecha'] = pd.to_datetime(df_ipc_nac['Periodo'], format= '%Y%m')
df_ipc_nac['Fecha'] = df_ipc_nac['Fecha'].dt.strftime('%Y-%m-%d')
df_ipc_nac.to_json('ipc_nacional.json', orient='records', force_ascii=False, date_format='iso')
#df_dif_pond.to_json('diferencia_pond.json', orient='records', force_ascii=False, date_format='iso')
