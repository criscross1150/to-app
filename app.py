from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
import os
import json
from gemini_processor import procesar_imagen_gemini

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'clave-secreta-to-app-2025')

# Configurar Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Usuarios simples - Equipo TO Clínica Alemana Temuco
USUARIOS = {
    'cristian': {'password': 'Luthien1', 'nombre': 'Cristián López'},
    'ingrid': {'password': 'to2025', 'nombre': 'Ingrid'},
    'carla': {'password': 'to2025', 'nombre': 'Carla'},
    'tatiana': {'password': 'to2025', 'nombre': 'Tatiana'},
    'jorge': {'password': 'to2025', 'nombre': 'Jorge'},
    'invitado': {'password': 'to2025', 'nombre': 'Invitado'}
}

class User(UserMixin):
    def __init__(self, username):
        self.id = username
        self.nombre = USUARIOS.get(username, {}).get('nombre', username)

@login_manager.user_loader
def load_user(username):
    if username in USUARIOS:
        return User(username)
    return None

# API Key de Gemini - SOLO desde variable de entorno (seguro)
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
print(f"[STARTUP] GEMINI_API_KEY configurada: {bool(GEMINI_API_KEY)} (longitud: {len(GEMINI_API_KEY) if GEMINI_API_KEY else 0})")

# Crear carpeta de uploads si no existe
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username', '').lower().strip()
        password = data.get('password', '').strip()
        
        if username in USUARIOS and USUARIOS[username]['password'] == password:
            user = User(username)
            login_user(user, remember=True)
            if request.is_json:
                return jsonify({'success': True, 'nombre': user.nombre})
            return redirect(url_for('index'))
        
        if request.is_json:
            return jsonify({'success': False, 'error': 'Usuario o contraseña incorrectos'})
        return render_template('login.html', error='Usuario o contraseña incorrectos')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    is_admin = current_user.id == 'cristian'
    return render_template('index.html', usuario=current_user.nombre, user_id=current_user.id, is_admin=is_admin)

@app.route('/configurar-api', methods=['POST'])
@login_required
def configurar_api():
    """Endpoint para configurar la API key de Gemini"""
    global GEMINI_API_KEY
    data = request.get_json()
    api_key = data.get('api_key', '')
    if api_key:
        GEMINI_API_KEY = api_key
        return jsonify({'success': True, 'message': 'API Key configurada correctamente'})
    return jsonify({'success': False, 'error': 'API Key vacía'})

@app.route('/procesar', methods=['POST'])
@login_required
def procesar():
    global GEMINI_API_KEY
    
    if not GEMINI_API_KEY:
        return jsonify({
            'success': False, 
            'error': 'Necesitas configurar tu API Key de Gemini. Ve a https://aistudio.google.com/app/apikey para obtener una gratis.',
            'need_api_key': True
        })
    
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No se envió imagen'})
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No se seleccionó archivo'})
    
    try:
        # Guardar imagen temporalmente
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'temp_image.jpg')
        file.save(filepath)
        print(f"[PROCESAR] Imagen guardada: {filepath}")
        print(f"[PROCESAR] API Key presente: {bool(GEMINI_API_KEY)}")
        print(f"[PROCESAR] Longitud API Key: {len(GEMINI_API_KEY) if GEMINI_API_KEY else 0}")
        
        # Procesar con Gemini
        pacientes = procesar_imagen_gemini(filepath, GEMINI_API_KEY)
        
        if not pacientes:
            print("[PROCESAR] No se encontraron pacientes")
            return jsonify({
                'success': False, 
                'error': 'No se pudieron extraer datos de la imagen. Intenta con una foto más clara.'
            })
        
        print(f"[PROCESAR] Éxito: {len(pacientes)} pacientes encontrados")
        return jsonify({
            'success': True,
            'pacientes': pacientes
        })
        
    except Exception as e:
        import traceback
        print(f"[PROCESAR ERROR] {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': f'Error procesando imagen: {str(e)}'})

@app.route('/generar-evolucion', methods=['POST'])
@login_required
def generar_evolucion():
    """Endpoint para generar texto de evolución con IA basado en los datos del formulario"""
    global GEMINI_API_KEY
    
    if not GEMINI_API_KEY:
        return jsonify({
            'success': False, 
            'error': 'API Key de Gemini no configurada'
        })
    
    try:
        import google.generativeai as genai
        
        data = request.get_json()
        paciente = data.get('paciente', {})
        formData = data.get('formData', {})
        
        # Construir el prompt para Gemini
        prompt = f"""Eres un Terapeuta Ocupacional experto redactando evoluciones clínicas para el registro clínico electrónico (RCE) hospitalario.

DATOS DEL PACIENTE:
- Habitación: {paciente.get('habitacion', 'N/A')}
- Nombre: {paciente.get('nombre', 'N/A')}

EVALUACIÓN REALIZADA:
- Estado de conciencia: {formData.get('conciencia', 'No evaluado')}
- Nivel de colaboración: {formData.get('colaboracion', 'No evaluado')}
- Orientación témporo-espacial: {formData.get('orientacion', 'No evaluado')}
- Estado anímico: {formData.get('animo', 'No evaluado')}
- Condición funcional: {formData.get('movilidad', 'No evaluado')}

INTERVENCIONES REALIZADAS:
{', '.join(formData.get('intervenciones', [])) if formData.get('intervenciones') else 'Ninguna registrada'}

SESIÓN CONJUNTA CON:
{', '.join(formData.get('sesionConjunta', [])) if formData.get('sesionConjunta') else 'Sesión individual'}

OBSERVACIONES ADICIONALES:
{formData.get('observaciones', 'Sin observaciones adicionales')}

INSTRUCCIONES:
1. Redacta una evolución clínica breve (máximo 5 líneas)
2. Usa lenguaje técnico de Terapia Ocupacional
3. Sé preciso y conciso
4. Incluye solo la información relevante proporcionada
5. NO incluyas el nombre del paciente ni habitación en el texto
6. Comienza directamente con el estado del paciente
7. Termina con el plan o indicaciones si corresponde

FORMATO ESPERADO (ejemplo):
"Paciente se presenta alerta, colaborador, orientado en T/E/P. Se realiza sesión de TOR y estimulación cognitiva con buena respuesta. Mantiene atención sostenida por 15 minutos. Se sugiere continuar intervención diaria."

Genera la evolución:"""

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        response = model.generate_content(prompt)
        texto_generado = response.text.strip()
        
        # Limpiar comillas si las hay
        if texto_generado.startswith('"') and texto_generado.endswith('"'):
            texto_generado = texto_generado[1:-1]
        
        return jsonify({
            'success': True,
            'texto': texto_generado
        })
        
    except Exception as e:
        print(f"Error generando evolución: {e}")
        return jsonify({'success': False, 'error': f'Error generando evolución: {str(e)}'})

if __name__ == '__main__':
    app.run(debug=True)
