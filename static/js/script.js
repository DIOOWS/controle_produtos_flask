const API_URL = 'https://seu-app.onrender.com/api/produtos_estoque';
let produtos = [];
let filtroAtual = "";

async function carregarProdutos() {
    try {
        const response = await fetch(API_URL);
        produtos = await response.json();
        atualizarTabela(filtroAtual);
    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);
    }
}

// Adicione aqui as outras funções (atualizarTabela, adicionarProduto, etc.)
// Use o mesmo código do seu JS original, mas substitua localStorage por chamadas à API
// Exemplo de função adicionarProduto():
async function adicionarProduto() {
    const novoProduto = {
        nome: document.getElementById("novoNome").value,
        qtdAtual: Number(document.getElementById("novaQtd").value),
        qtdMin: Number(document.getElementById("qtdMin").value),
        qtdMax: Number(document.getElementById("qtdMax").value)
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoProduto)
        });
        await carregarProdutos(); // Recarrega a tabela
    } catch (erro) {
        alert("Erro ao adicionar produto");
    }
}

// Inicia o app
document.addEventListener('DOMContentLoaded', carregarProdutos);