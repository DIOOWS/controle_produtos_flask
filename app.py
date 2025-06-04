from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from supabase import create_client
import hashlib
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'minhasecreta')  # Troque pra algo seguro

# Configura Supabase
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Rotas ---

# Tela de login
@app.route('/login')
def login():
    if 'user_id' in session:
        return redirect(url_for('home'))
    return render_template('login.html')


# API de login
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Usuário e senha são obrigatórios'}), 400

    # Cria hash da senha
    password_hash = hashlib.sha256(password.encode()).hexdigest()

    # Busca usuário na tabela 'usuarios' do Supabase
    response = supabase.table('usuarios').select('*').eq('username', username).eq('password_hash', password_hash).execute()
    users = response.data

    if not users:
        return jsonify({'error': 'Usuário ou senha inválidos'}), 401

    user = users[0]
    session['user_id'] = user['id']
    session['username'] = user['username']

    return jsonify({'message': 'Login realizado com sucesso'})


# API de logout
@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'message': 'Logout realizado com sucesso'})


# Home protegida (só pra quem está logado)
@app.route('/')
def home():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')


# API - Listar todos os produtos
@app.route('/api/produtos', methods=['GET'])
def get_produtos():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401

    try:
        response = supabase.table('produtos').select('*').order('id', desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# API - Adicionar novo produto
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
            'qtd_atual': data['qtdAtual'],
            'qtd_minima': data['qtdMin'],
            'qtd_maxima': data['qtdMax'],
            'criado_em': datetime.now().isoformat()
        }

        response = supabase.table('produtos').insert(new_product).execute()
        return jsonify(response.data[0]), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# API - Atualizar produto
@app.route('/api/produtos/<int:id>', methods=['PUT'])
def update_produto(id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401

    data = request.get_json()

    try:
        updates = {
            'qtd_atual': data.get('qtdAtual'),
            'qtd_minima': data.get('qtdMin'),
            'qtd_maxima': data.get('qtdMax'),
            'atualizado_em': datetime.now().isoformat()
        }

        updates = {k: v for k, v in updates.items() if v is not None}

        response = supabase.table('produtos').update(updates).eq('id', id).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# API - Deletar produto
@app.route('/api/produtos/<int:id>', methods=['DELETE'])
def delete_produto(id):
    if 'user_id' not in session:
        return jsonify({'error': 'Não autorizado'}), 401

    try:
        supabase.table('produtos').delete().eq('id', id).execute()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Health check simples
@app.route('/health')
def health():
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
