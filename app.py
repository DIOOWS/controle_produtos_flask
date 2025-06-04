from flask import Flask, request, jsonify, render_template
from supabase import create_client, Client
import os
from datetime import datetime
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

app = Flask(__name__)

# Configuração Supabase
SUPABASE_URL: str = os.environ.get('SUPABASE_URL')
SUPABASE_KEY: str = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# Rota principal (front-end)
@app.route('/')
def home():
    return render_template('index.html')


# API - Listar todos os produtos
@app.route('/api/produtos_estoque', methods=['GET'])
def get_produtos():
    try:
        response = supabase.table('produtos').select('*').order('id', desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# API - Adicionar novo produto
@app.route('/api/produtos_estoque', methods=['POST'])
def add_produto():
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
    data = request.get_json()

    try:
        updates = {
            'qtd_atual': data.get('qtdAtual'),
            'qtd_minima': data.get('qtdMin'),
            'qtd_maxima': data.get('qtdMax'),
            'atualizado_em': datetime.now().isoformat()
        }

        # Remove valores None
        updates = {k: v for k, v in updates.items() if v is not None}

        response = supabase.table('produtos').update(updates).eq('id', id).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# API - Deletar produto
@app.route('/api/produtos/<int:id>', methods=['DELETE'])
def delete_produto(id):
    try:
        supabase.table('produtos').delete().eq('id', id).execute()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Health Check
@app.route('/health')
def health():
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)