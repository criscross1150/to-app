import pytesseract
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import re
import os

# Configurar ruta de Tesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Configuración de diagnósticos
DIAGNOSTICOS = {
    1: 'Neumonía', 2: 'Cir abdominal laparoscópica', 3: 'Cir abdominal laparotomía',
    4: 'Cir tórax', 5: 'ITU', 6: 'Trauma raquimedular', 7: 'TROMBOSIS',
    8: 'Sepsis', 9: 'ACV', 10: 'Neuroquirúrgico', 11: 'Hipoxia perinatal',
    12: 'SBO ped', 13: 'ATL', 14: 'Cardiológico', 15: 'CANCER',
    16: 'Prótesis de cadera', 17: 'Prótesis de rodilla', 18: 'OTRO',
    19: 'Plastia de cadera', 20: 'Plastia de rodilla', 21: 'TEC', 22: 'PTM',
    23: 'Paratiroidectomía', 24: 'Cir plástica', 25: 'EPOC/Resp crónico',
    26: 'RNPT', 27: 'CX Columna', 28: 'Síndrome convulsivo', 29: 'Falla renal',
    30: 'Traumatológico', 31: 'Psiquiatría', 32: 'Cardiológico'
}

# Habitaciones UPC
HABITACIONES_UPC = ['201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212',
                    'UCIA', 'UCIB', 'UCIC', 'UCID', 'UCIE', 'UCIF', '148A', '144', '146A', '151A', '150']

def clasificar_habitacion(habitacion):
    """Clasifica una habitación como UPC o MQ"""
    hab = str(habitacion).upper().strip()
    # Limpiar caracteres no alfanuméricos
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

def preprocesar_imagen(imagen_path):
    """Preprocesa la imagen para mejorar el OCR - optimizado para fotos de pantalla"""
    # Leer imagen con PIL primero para mejor manejo
    img_pil = Image.open(imagen_path)
    
    # Convertir a RGB si es necesario
    if img_pil.mode != 'RGB':
        img_pil = img_pil.convert('RGB')
    
    # Aumentar nitidez
    enhancer = ImageEnhance.Sharpness(img_pil)
    img_pil = enhancer.enhance(2.0)
    
    # Aumentar contraste
    enhancer = ImageEnhance.Contrast(img_pil)
    img_pil = enhancer.enhance(1.5)
    
    # Convertir a numpy array para OpenCV
    img = np.array(img_pil)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    
    # Redimensionar si es muy grande (mejora velocidad y puede mejorar OCR)
    altura, ancho = img.shape[:2]
    if ancho > 2000:
        escala = 2000 / ancho
        img = cv2.resize(img, None, fx=escala, fy=escala, interpolation=cv2.INTER_CUBIC)
    
    # Convertir a escala de grises
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Aplicar CLAHE para mejorar contraste local
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    gray = clahe.apply(gray)
    
    # Binarización con Otsu
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Eliminar ruido
    kernel = np.ones((1, 1), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    
    return binary

def extraer_texto_ocr(imagen_path):
    """Extrae texto de la imagen usando OCR con múltiples configuraciones"""
    # Preprocesar imagen
    img_procesada = preprocesar_imagen(imagen_path)
    
    # Intentar múltiples configuraciones de Tesseract
    configs = [
        r'--oem 3 --psm 6 -l spa',  # Bloque de texto uniforme
        r'--oem 3 --psm 4 -l spa',  # Columna de texto de tamaño variable
        r'--oem 3 --psm 11 -l spa', # Texto disperso
    ]
    
    mejor_texto = ""
    max_lineas = 0
    
    for config in configs:
        texto = pytesseract.image_to_string(img_procesada, config=config)
        lineas_con_datos = len([l for l in texto.split('\n') if re.search(r'\d{3}', l)])
        if lineas_con_datos > max_lineas:
            max_lineas = lineas_con_datos
            mejor_texto = texto
    
    # Si no funcionó, intentar con imagen original
    if max_lineas < 3:
        img_original = cv2.imread(imagen_path)
        gray = cv2.cvtColor(img_original, cv2.COLOR_BGR2GRAY)
        texto_orig = pytesseract.image_to_string(gray, config=r'--oem 3 --psm 6 -l spa')
        lineas_orig = len([l for l in texto_orig.split('\n') if re.search(r'\d{3}', l)])
        if lineas_orig > max_lineas:
            mejor_texto = texto_orig
    
    return mejor_texto

def parsear_linea_paciente(linea):
    """Intenta parsear una línea de texto como datos de paciente"""
    linea = linea.strip()
    if not linea or len(linea) < 10:
        return None
    
    # El OCR puede generar pipes | como separadores
    # Limpiar la línea: reemplazar pipes y múltiples espacios
    linea_limpia = linea.replace('|', ' ')
    linea_limpia = re.sub(r'\s+', ' ', linea_limpia).strip()
    
    # Buscar patrón de fecha o al menos un número de habitación de 3 dígitos
    if not re.search(r'\d{2,3}[A-Za-z]?\s', linea_limpia):
        return None
    
    partes = linea_limpia.split(' ')
    partes = [p.strip() for p in partes if p.strip()]
    
    if len(partes) < 5:
        return None
    
    try:
        habitacion = None
        indicacion = 1
        nombres_encontrados = []
        edad = 0
        dg = 18
        
        i = 0
        while i < len(partes):
            parte = partes[i]
            
            # Buscar habitación (2-3 dígitos con posible letra)
            if habitacion is None and re.match(r'^\d{2,3}[A-Za-z]?$', parte):
                num = re.sub(r'[A-Za-z]', '', parte)
                if 100 <= int(num) <= 999:
                    habitacion = parte.upper()
                    i += 1
                    
                    # Siguiente podría ser indicación (1, 2 o 3)
                    if i < len(partes) and partes[i].isdigit() and int(partes[i]) <= 3:
                        indicacion = int(partes[i])
                        i += 1
                    continue
            
            # Si ya tenemos habitación, buscar nombres (palabras alfabéticas)
            if habitacion:
                # Es un nombre/apellido si es alfabético y tiene más de 1 letra
                if re.match(r'^[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}$', parte):
                    nombres_encontrados.append(parte.upper())
                # Es edad si es número entre 1 y 120 y ya tenemos al menos 2 nombres
                elif parte.isdigit() and len(nombres_encontrados) >= 2:
                    num = int(parte)
                    if 1 <= num <= 120 and edad == 0:
                        edad = num
                    elif 1 <= num <= 35 and edad > 0:  # DG es 1-32
                        dg = num
                        break  # Tenemos todo lo que necesitamos
            
            i += 1
        
        # Construir resultado si tenemos datos suficientes
        if habitacion and len(nombres_encontrados) >= 2:
            nombre = nombres_encontrados[0]
            apellido1 = nombres_encontrados[1]
            apellido2 = nombres_encontrados[2] if len(nombres_encontrados) >= 3 else ""
            
            return {
                'habitacion': habitacion,
                'nombre': f"{nombre} {apellido1} {apellido2}".strip(),
                'edad': edad if edad > 0 else 50,
                'diagnostico': obtener_diagnostico(dg),
                'indicaciones': min(indicacion, 2),
                'clasificacion': clasificar_habitacion(habitacion)
            }
    except Exception as e:
        print(f"Error parseando línea: {e}")
    
    return None

def procesar_imagen(imagen_path):
    """Procesa una imagen de planilla y extrae los datos de pacientes"""
    try:
        # Extraer texto con OCR
        texto = extraer_texto_ocr(imagen_path)
        print("=== TEXTO OCR EXTRAÍDO ===")
        print(texto)
        print("=== FIN TEXTO OCR ===")
        
        # Parsear líneas
        lineas = texto.split('\n')
        pacientes = []
        
        for linea in lineas:
            paciente = parsear_linea_paciente(linea)
            if paciente:
                # Evitar duplicados por habitación
                if not any(p['habitacion'] == paciente['habitacion'] for p in pacientes):
                    pacientes.append(paciente)
        
        # Si no se encontraron pacientes con el parser, intentar método alternativo
        if len(pacientes) < 3:
            pacientes_alt = extraer_pacientes_alternativo(texto)
            for p in pacientes_alt:
                if not any(existing['habitacion'] == p['habitacion'] for existing in pacientes):
                    pacientes.append(p)
        
        print(f"\n=== PACIENTES ENCONTRADOS: {len(pacientes)} ===")
        for p in pacientes:
            print(f"  - Hab {p['habitacion']}: {p['nombre']} ({p['edad']} años) - {p['diagnostico']} - {p['clasificacion']}")
        
        return pacientes
        
    except Exception as e:
        print(f"Error procesando imagen: {e}")
        import traceback
        traceback.print_exc()
        return []

def extraer_pacientes_alternativo(texto):
    """Método alternativo para extraer pacientes del texto OCR con pipes"""
    pacientes = []
    
    # Limpiar texto: reemplazar pipes con espacios
    texto_limpio = texto.replace('|', ' ')
    texto_limpio = re.sub(r'\s+', ' ', texto_limpio)
    texto_upper = texto_limpio.upper()
    
    # Patrones más flexibles para capturar datos
    patrones = [
        # HAB INDIC NOMBRE APELLIDO APELLIDO EDAD DG
        r'(\d{2,3}[A-Z]?)\s+(\d)\s+([A-ZÁÉÍÓÚÑ]{2,})\s+([A-ZÁÉÍÓÚÑ]{2,})\s+([A-ZÁÉÍÓÚÑ]{2,})\s+(\d{1,3})\s+(\d{1,2})',
        # HAB INDIC NOMBRE APELLIDO EDAD DG (sin segundo apellido)
        r'(\d{2,3}[A-Z]?)\s+(\d)\s+([A-ZÁÉÍÓÚÑ]{2,})\s+([A-ZÁÉÍÓÚÑ]{2,})\s+(\d{1,3})\s+(\d{1,2})',
        # Solo HAB NOMBRE APELLIDO APELLIDO EDAD
        r'(\d{2,3}[A-Z]?)\s+([A-ZÁÉÍÓÚÑ]{2,})\s+([A-ZÁÉÍÓÚÑ]{2,})\s+([A-ZÁÉÍÓÚÑ]{2,})\s+(\d{1,3})',
    ]
    
    for pattern in patrones:
        matches = re.findall(pattern, texto_upper)
        for match in matches:
            try:
                if len(match) == 7:
                    habitacion, indicacion, nombre, apellido1, apellido2, edad, dg = match
                    nombre_completo = f"{nombre} {apellido1} {apellido2}"
                    indicacion = int(indicacion)
                    dg = int(dg)
                elif len(match) == 6:
                    habitacion, indicacion, nombre, apellido1, edad, dg = match
                    nombre_completo = f"{nombre} {apellido1}"
                    indicacion = int(indicacion)
                    dg = int(dg)
                else:
                    habitacion, nombre, apellido1, apellido2, edad = match
                    nombre_completo = f"{nombre} {apellido1} {apellido2}"
                    indicacion = 1
                    dg = 18
                
                # Validar habitación
                num_hab = re.sub(r'[A-Z]', '', habitacion)
                if not num_hab.isdigit() or not (100 <= int(num_hab) <= 999):
                    continue
                
                # Validar edad
                edad_int = int(edad)
                if not (1 <= edad_int <= 120):
                    continue
                
                paciente = {
                    'habitacion': habitacion,
                    'nombre': nombre_completo,
                    'edad': edad_int,
                    'diagnostico': obtener_diagnostico(dg),
                    'indicaciones': min(indicacion, 2),
                    'clasificacion': clasificar_habitacion(habitacion)
                }
                
                # Evitar duplicados
                if not any(p['habitacion'] == habitacion for p in pacientes):
                    pacientes.append(paciente)
                    
            except Exception as e:
                continue
    
    return pacientes

# Función de prueba
if __name__ == "__main__":
    # Probar con una imagen
    test_path = "test_image.jpg"
    if os.path.exists(test_path):
        pacientes = procesar_imagen(test_path)
        print(f"\nPacientes encontrados: {len(pacientes)}")
        for p in pacientes:
            print(p)
