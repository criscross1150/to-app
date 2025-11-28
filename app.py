from flask import Flask, render_template, request, jsonify
import os
from gemini_processor import procesar_imagen_gemini

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# API Key de Gemini - desde variable de entorno o hardcodeada
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyAN1dOKZsyenLxTfuQU9uGYNxsTGCTAuvU')

# Crear carpeta de uploads si no existe
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/configurar-api', methods=['POST'])
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
