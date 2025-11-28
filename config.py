# Configuración de diagnósticos
DIAGNOSTICOS = {
    'NEU': 'Neumonía',
    'CAL': 'Cir abdominal laparoscópica',
    'CAA': 'Cir abdominal laparotomía',
    'CTX': 'Cir tórax',
    'ITU': 'ITU',
    'TRM': 'Trauma raquimedular',
    'TVP': 'TROMBOSIS',
    'SEP': 'Sepsis',
    'ACV': 'ACV',
    'NQX': 'Neuroquirúrgico',
    'HIP': 'Hipoxia perinatal',
    'SBO': 'SBO ped',
    'ATL': 'ATL',
    'CAR': 'Cardiológico',
    'CAN': 'CANCER',
    'PCA': 'Prótesis de cadera',
    'PRO': 'Prótesis de rodilla',
    'OTR': 'OTRO',
    'PLC': 'Plastia de cadera',
    'PLR': 'Plastia de rodilla',
    'TEC': 'TEC',
    'PTM': 'PTM',
    'PAR': 'Paratiroidectomía',
    'CPL': 'Cir plástica',
    'EPO': 'EPOC/Resp crónico',
    'RNP': 'RNPT',
    'CXC': 'CX Columna',
    'CON': 'Síndrome convulsivo',
    'FRE': 'Falla renal',
    'TRA': 'Traumatológico',
    'PSI': 'Psiquiatría'
}

# Habitaciones UPC
HABITACIONES_UPC = ['201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212',
                    'UCIA', 'UCIB', 'UCIC', 'UCID', 'UCIE', 'UCIF']

def clasificar_habitacion(habitacion):
    """Clasifica una habitación como UPC o MQ"""
    hab_upper = str(habitacion).upper().strip()
    if hab_upper in HABITACIONES_UPC:
        return 'UPC'
    return 'MQ'

def obtener_diagnostico(codigo):
    """Obtiene el nombre del diagnóstico a partir del código"""
    return DIAGNOSTICOS.get(codigo.upper(), 'OTRO')
