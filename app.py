from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from supabase import create_client
import hashlib
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'minhasecreta')

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

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
            'criado_em': datetime.now().isoformat()
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
        return jsonify({'message': 'Login realizado com sucesso'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/')
def home():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('index.html')

@app.route('/api/produtos', methods=['GET'])
def get_produtos():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401
    try:
        response = supabase.table('produtos').select('*').order('id', desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/produtos', methods=['POST'])
def add_produto():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401

    data = request.get_json()
    required_fields = ['nome', 'qtdAtual', 'qtdMin', 'qtdMax']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Campos faltando'}), 400

    try:
        new_product = {
            'nome': data['nome'],
            'qtd_atual': int(data['qtdAtual']),
            'qtd_minima': int(data['qtdMin']),
            'qtd_maxima': int(data['qtdMax']),
            'criado_em': datetime.now().isoformat()
        }
        response = supabase.table('produtos').insert(new_product).execute()
        return jsonify(response.data[0]), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/produtos/<int:id>', methods=['PUT'])
def update_produto(id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401

    data = request.get_json()
    try:
        qtd_atual = data.get('qtdAtual')
        qtd_minima = data.get('qtdMin')
        qtd_maxima = data.get('qtdMax')

        if any(v is None for v in [qtd_atual, qtd_minima, qtd_maxima]):
            return jsonify({'error': 'Valores ausentes'}), 400

        updates = {
            'qtd_atual': int(qtd_atual),
            'qtd_minima': int(qtd_minima),
            'qtd_maxima': int(qtd_maxima),
            'atualizado_em': datetime.now().isoformat()
        }
        response = supabase.table('produtos').update(updates).eq('id', id).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/produtos/<int:id>', methods=['DELETE'])
def delete_produto(id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
