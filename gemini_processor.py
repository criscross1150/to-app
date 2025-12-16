import google.generativeai as genai
from PIL import Image
import json
import re
import os

# Configuración de diagnósticos - Lista oficial Clínica Alemana Temuco
DIAGNOSTICOS = {
    1: 'Neumonía',
    2: 'Cir abdominal laparoscópica',
    3: 'Cir abdominal laparotomía',
    4: 'Cir tórax',
    5: 'ITU',
    6: 'Trauma raquimedular',
    7: 'Trombosis',
    8: 'Sepsis',
    9: 'ACV',
    10: 'Neuroquirúrgico',
    12: 'Hipoxia perinatal',
    13: 'SBO ped',
    14: 'ATL',
    15: 'Cardiológico',
    16: 'Cáncer',
    17: 'Prótesis de cadera',
    18: 'Prótesis de rodilla',
    19: 'Otro',
    20: 'Plastia de cadera',
    21: 'Plastia de rodilla',
    22: 'TEC',
    23: 'PTM',
    24: 'Paratiroidectomía',
    25: 'Cir plástica',
    26: 'EPOC/Resp crónico',
    27: 'RNPT',
    28: 'CX Columna',
    29: 'Síndrome convulsivo',
    30: 'Falla renal',
    31: 'Traumatológico',
    32: 'Psiquiatría'
}

def clasificar_habitacion(habitacion):
    """Clasifica una habitación como UPC o MQ"""
    hab = str(habitacion).upper().strip()
    hab_limpio = re.sub(r'[^0-9A-Z]', '', hab)
    
    # Habitaciones 201-212 son UPC
    if hab_limpio.isdigit() and 201 <= int(hab_limpio) <= 212:
        return 'UPC'
    # Habitaciones UCI son UPC
    if 'UCI' in hab_limpio:
        return 'UPC'
    return 'MQ'

def obtener_diagnostico(codigo):
    """Obtiene el nombre del diagnóstico a partir del código numérico"""
    try:
        cod = int(codigo)
        return DIAGNOSTICOS.get(cod, 'OTRO')
    except:
        return 'OTRO'

def configurar_gemini(api_key):
    """Configura la API de Gemini"""
    genai.configure(api_key=api_key)

def procesar_imagen_gemini(imagen_path, api_key):
    """Procesa una imagen de planilla usando Gemini Vision"""
    try:
        # Configurar Gemini
        genai.configure(api_key=api_key)
        
        print(f"[GEMINI] Intentando procesar imagen: {imagen_path}")
        
        # Intentar con diferentes modelos (por orden de preferencia)
        modelos = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
        model = None
        
        for modelo_nombre in modelos:
            try:
                model = genai.GenerativeModel(modelo_nombre)
                print(f"[GEMINI] Usando modelo: {modelo_nombre}")
                break
            except Exception as e:
                print(f"[GEMINI] Modelo {modelo_nombre} no disponible: {e}")
                continue
        
        if not model:
            raise Exception("No se pudo inicializar ningún modelo de Gemini")
        
        # Cargar imagen
        imagen = Image.open(imagen_path)
        print(f"[GEMINI] Imagen cargada: {imagen.size}")
        
        # Prompt específico para extraer datos de la planilla
        prompt = """Analiza esta imagen de una planilla de Excel con datos de pacientes hospitalizados.

IMPORTANTE: La planilla tiene una columna FECHA. Debes:
1. Identificar TODAS las fechas que aparecen en la tabla
2. Determinar cuál es la FECHA MÁS RECIENTE (la más actual)
3. Extraer SOLO los pacientes de esa fecha más reciente

Para cada paciente de la fecha más reciente necesito:
- HABIT (habitación): número de 3 dígitos, puede tener letra (ej: 208, 148A, 305)
- NOMBRE: primer nombre del paciente
- APELLIDO: apellido paterno
- APELLIDO2: apellido materno (si está visible)
- Edad: número
- DG: código de diagnóstico (número del 1 al 32)
- INDICACION: número de indicaciones (usualmente 1)
- REPOSO: tipo de reposo si está indicado ("absoluto", "relativo", o "no" si no tiene indicación de reposo)

Las columnas de la tabla son: FECHA | MODO | HABIT | INDICACION | NOMBRE | APELLIDO | APELLIDO | Edad | DG | REVISION | COD
Si hay una columna de REPOSO o alguna indicación de reposo absoluto o relativo, extráela.

Responde SOLO con un JSON válido en este formato exacto, sin texto adicional:
{
    "fecha_seleccionada": "30-11-2025",
    "pacientes": [
        {
            "habitacion": "208",
            "nombre": "MISAEL",
            "apellido1": "SANCHEZ",
            "apellido2": "ANDRADES",
            "edad": 62,
            "dg": 9,
            "indicacion": 1,
            "reposo": "no"
        }
    ]
}

Si no puedes leer algún dato, usa valores por defecto: edad=50, dg=18, indicacion=1, reposo="no".
Recuerda: SOLO pacientes de la fecha MÁS RECIENTE visible en la tabla."""

        # Enviar a Gemini
        print("[GEMINI] Enviando imagen a Gemini...")
        response = model.generate_content([prompt, imagen])
        
        # Verificar si hay respuesta
        if not response or not response.text:
            print("[GEMINI] Respuesta vacía de Gemini")
            # Intentar obtener más info del error
            if hasattr(response, 'prompt_feedback'):
                print(f"[GEMINI] Feedback: {response.prompt_feedback}")
            return []
        
        # Obtener texto de respuesta
        texto_respuesta = response.text
        print("=== RESPUESTA GEMINI ===")
        print(texto_respuesta[:500] if len(texto_respuesta) > 500 else texto_respuesta)
        print("=== FIN RESPUESTA ===")
        
        # Limpiar respuesta (quitar markdown si existe)
        texto_limpio = texto_respuesta.strip()
        if texto_limpio.startswith('```json'):
            texto_limpio = texto_limpio[7:]
        if texto_limpio.startswith('```'):
            texto_limpio = texto_limpio[3:]
        if texto_limpio.endswith('```'):
            texto_limpio = texto_limpio[:-3]
        texto_limpio = texto_limpio.strip()
        
        # Parsear JSON
        datos = json.loads(texto_limpio)
        
        # Convertir a formato de la app
        pacientes = []
        for p in datos.get('pacientes', []):
            habitacion = str(p.get('habitacion', '')).upper()
            if not habitacion:
                continue
                
            nombre = p.get('nombre', '')
            apellido1 = p.get('apellido1', '')
            apellido2 = p.get('apellido2', '')
            nombre_completo = f"{nombre} {apellido1} {apellido2}".strip().upper()
            
            edad = p.get('edad', 50)
            try:
                edad = int(edad)
            except:
                edad = 50
                
            dg = p.get('dg', 18)
            try:
                dg = int(dg)
            except:
                dg = 18
                
            indicacion = p.get('indicacion', 1)
            try:
                indicacion = min(int(indicacion), 2)
            except:
                indicacion = 1
            
            # Obtener reposo
            reposo = p.get('reposo', 'no')
            if reposo and reposo.lower() in ['absoluto', 'relativo']:
                reposo = reposo.lower()
            else:
                reposo = 'no'
            
            paciente = {
                'habitacion': habitacion,
                'nombre': nombre_completo if nombre_completo else 'PACIENTE',
                'edad': edad,
                'diagnostico': obtener_diagnostico(dg),
                'indicaciones': indicacion,
                'clasificacion': clasificar_habitacion(habitacion),
                'reposo': reposo
            }
            
            # Evitar duplicados
            if not any(existing['habitacion'] == habitacion for existing in pacientes):
                pacientes.append(paciente)
        
        print(f"\n=== PACIENTES ENCONTRADOS: {len(pacientes)} ===")
        for p in pacientes:
            print(f"  - Hab {p['habitacion']}: {p['nombre']} ({p['edad']} años) - {p['diagnostico']} - {p['clasificacion']}")
        
        return pacientes
        
    except json.JSONDecodeError as e:
        print(f"Error parseando JSON: {e}")
        print(f"Texto recibido: {texto_respuesta}")
        return []
    except Exception as e:
        print(f"Error procesando imagen con Gemini: {e}")
        import traceback
        traceback.print_exc()
        return []

# Función de prueba
if __name__ == "__main__":
    api_key = os.environ.get('GEMINI_API_KEY', '')
    if api_key:
        test_path = "uploads/temp_image.jpg"
        if os.path.exists(test_path):
            pacientes = procesar_imagen_gemini(test_path, api_key)
            print(f"\nTotal: {len(pacientes)} pacientes")
    else:
        print("Configura GEMINI_API_KEY para probar")
