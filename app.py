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

# Usuarios simples (en producción esto iría en una base de datos)
USUARIOS = {
    'cristian': {'password': 'to2025', 'nombre': 'Cristián López'},
    'ingrid': {'password': 'to2025', 'nombre': 'Ingrid'},
    'carla': {'password': 'to2025', 'nombre': 'Carla'},
    'tatiana': {'password': 'to2025', 'nombre': 'Tatiana'},
    'jorge': {'password': 'to2025', 'nombre': 'Jorge'}
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

# Crear carpeta de uploads si no existe
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username', '').lower().strip()
        password = data.get('password', '')
        
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
    return render_template('index.html', usuario=current_user.nombre)

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
        
        # Procesar con Gemini
        pacientes = procesar_imagen_gemini(filepath, GEMINI_API_KEY)
        
        if not pacientes:
            return jsonify({
                'success': False, 
                'error': 'No se pudieron extraer datos de la imagen. Intenta con una foto más clara.'
            })
        
        return jsonify({
            'success': True,
            'pacientes': pacientes
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'success': False, 'error': f'Error procesando imagen: {str(e)}'})

if __name__ == '__main__':
    app.run(debug=True)
