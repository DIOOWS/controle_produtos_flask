from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from supabase import create_client
import hashlib
import os
from datetime import datetime
from dotenv import load_dotenv
import traceback
from functools import wraps

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'minhasecreta')

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.before_request
def log_request_info():
    user = session.get('user_id', 'Anônimo')
    print(f"[{datetime.now().isoformat()}] Usuário: {user} - Acessou: {request.method} {request.path}")

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Não autorizado'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_role' not in session or session['user_role'] != 'admin':
            return jsonify({'error': 'Permissão negada'}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/usuario-tipo')
@login_required
def usuario_tipo():
    return jsonify({'tipo': session.get('user_role', 'user')}), 200

@app.route('/api/usuario-info')
@login_required
def usuario_info():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Usuário não autenticado'}), 401
        response = supabase.table('usuarios').select('id, username, role, criado_em').eq('id', user_id).execute()
        if response.data:
            return jsonify(response.data[0]), 200
        return jsonify({'error': 'Usuário não encontrado'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/login')
def login_page():
    if 'user_id' in session:
        return redirect(url_for('home'))
    return render_template('login.html')

@app.route('/cadastro')
def tela_cadastro():
    if 'user_id' in session:
        return redirect(url_for('home'))
    return render_template('cadastro.html')

@app.route('/api/cadastro', methods=['POST'])
def cadastrar_usuario():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Usuário e senha são obrigatórios'}), 400

    existe = supabase.table('usuarios').select('*').eq('username', username).execute()
    if existe.data:
        return jsonify({'error': 'Usuário já existe'}), 400

    senha_hash = hashlib.sha256(password.encode()).hexdigest()
    try:
        novo_usuario = {
            'username': username,
            'senha': senha_hash,
            'criado_em': datetime.now().isoformat(),
            'role': 'user'
        }
        supabase.table('usuarios').insert(novo_usuario).execute()
        return jsonify({'message': 'Usuário criado com sucesso'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Requisição inválida'}), 400

    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Usuário e senha são obrigatórios'}), 400

    try:
        response = supabase.table('usuarios').select('*').eq('username', username).execute()
        if not response.data:
            return jsonify({'error': 'Usuário não encontrado'}), 401

        usuario = response.data[0]
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        if usuario['senha'] != hashed_password:
            return jsonify({'error': 'Senha incorreta'}), 401

        session['user_id'] = usuario['id']
        session['user_role'] = usuario.get('role', 'user')
        return jsonify({'message': 'Login realizado com sucesso'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
@login_required
def home():
    return render_template('index.html')

@app.route('/api/produtos', methods=['GET'])
@login_required
def get_produtos():
    try:
        response = supabase.table('produtos').select('*').order('id', desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/produtos', methods=['POST'])
@login_required
@admin_required
def adicionar_produto():
    data = request.get_json()
    campos_obrigatorios = ['nome', 'qtd_atual', 'qtd_minima', 'qtd_maxima']
    if not all(campo in data for campo in campos_obrigatorios):
        return jsonify({'erro': 'Campos obrigatórios faltando.'}), 400

    try:
        novo_produto = {
            'nome': data['nome'],
            'qtd_atual': int(data['qtd_atual']),
            'qtd_minima': int(data['qtd_minima']),
            'qtd_maxima': int(data['qtd_maxima'])
        }
        supabase.table('produtos').insert(novo_produto).execute()
        return jsonify({'mensagem': 'Produto adicionado com sucesso.'}), 201
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/api/produtos/<int:id>', methods=['PUT'])
@login_required
@admin_required
def update_produto(id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados inválidos ou vazios'}), 400

        updates = {}
        if 'qtd_atual' in data:
            updates['qtd_atual'] = int(data['qtd_atual'])
        if 'qtd_minima' in data:
            updates['qtd_minima'] = int(data['qtd_minima'])
        if 'qtd_maxima' in data:
            updates['qtd_maxima'] = int(data['qtd_maxima'])

        if not updates:
            return jsonify({'error': 'Nenhum campo para atualizar'}), 400

        updates['atualizado_em'] = datetime.now().isoformat()
        response = supabase.table('produtos').update(updates).eq('id', id).execute()

        if not response.data:
            return jsonify({'error': 'Produto não encontrado ou não atualizado'}), 404

        return jsonify(response.data[0])
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({'error': 'Erro interno no servidor', 'detalhes': str(e)}), 500

@app.route('/api/produtos/<int:id>', methods=['DELETE'])
@login_required
@admin_required
def delete_produto(id):
    try:
        supabase.table('produtos').delete().eq('id', id).execute()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return '', 200

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'}), 200

# ⛔ Removido app.run() para compatibilidade com Gunicorn
# if __name__ == '__main__':
#     app.run(host='0.0.0.0', port=5000, debug=True)
