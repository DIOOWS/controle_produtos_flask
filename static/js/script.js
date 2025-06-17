let produtos = [];
let filtroCategoria = 'todos';
let filtroBusca = '';

// Ao carregar a página, pega os produtos do backend
document.addEventListener('DOMContentLoaded', async () => {
  await carregarProdutos();
});

// Busca os produtos no backend
async function carregarProdutos() {
  try {
    const resposta = await fetch('/api/produtos');
    produtos = await resposta.json();
    mostrarProdutos(produtos);
  } catch (error) {
    alert('Erro ao carregar produtos: ' + error.message);
  }
}

// Mostrar produtos na tabela
function mostrarProdutos(lista) {
  const tbody = document.querySelector('#tabelaProdutos tbody');
  tbody.innerHTML = '';

  lista.forEach(produto => {
    const status = calcularStatus(produto.qtd_atual, produto.qtd_minima, produto.qtd_maxima);

    const row = document.createElement('tr');
    row.dataset.status = status;
    row.dataset.id = produto.id;

    row.innerHTML = `
      <td>${produto.nome}</td>
      <td>
        <div class="qty-controls">
          <button onclick="alterarQuantidade(this, ${produto.id}, -1)">-</button>
          <input type="number" value="${produto.qtd_atual}" onchange="atualizarQuantidade(${produto.id}, this.value)" />
          <button onclick="alterarQuantidade(this, ${produto.id}, 1)">+</button>
        </div>
      </td>
      <td>${produto.qtd_minima}</td>
      <td>${produto.qtd_maxima}</td>
      <td class="status-${status.toLowerCase()}">${status}</td>
      <td><span class="delete-icon" onclick="deletarProduto(${produto.id})">🗑️</span></td>
    `;

    tbody.appendChild(row);
  });
}

// Cálculo do status
function calcularStatus(qtdAtual, qtdMin, qtdMax) {
  if (qtdAtual < qtdMin) return 'URGENTE';
  if (qtdAtual > qtdMax) return 'EXCESSO';
  return 'OK';
}

// Adicionar novo produto
async function adicionarProduto() {
  const nome = document.getElementById('novoNome').value.trim();
  const qtdAtual = parseInt(document.getElementById('novaQtd').value);
  const qtdMin = parseInt(document.getElementById('qtdMin').value);
  const qtdMax = parseInt(document.getElementById('qtdMax').value);

  if (!nome || isNaN(qtdAtual) || isNaN(qtdMin) || isNaN(qtdMax)) {
    alert('Preencha todos os campos corretamente.');
    return;
  }

  const novoProduto = { nome, qtd_atual: qtdAtual, qtd_minima: qtdMin, qtd_maxima: qtdMax };

  try {
    const res = await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoProduto)
    });

    if (res.ok) {
      await carregarProdutos();
      document.getElementById('novoNome').value = '';
      document.getElementById('novaQtd').value = '';
      document.getElementById('qtdMin').value = '';
      document.getElementById('qtdMax').value = '';
    } else {
      alert('Erro ao adicionar produto.');
    }
  } catch (error) {
    alert('Erro na conexão: ' + error.message);
  }
}

// Atualizar quantidade
async function atualizarQuantidade(id, novaQtd) {
  try {
    const res = await fetch(`/api/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qtd_atual: parseInt(novaQtd) })
    });

    if (res.ok) {
      await carregarProdutos();
    } else {
      alert('Erro ao atualizar quantidade.');
    }
  } catch (error) {
    alert('Erro na conexão: ' + error.message);
  }
}

// Botões + e -
function alterarQuantidade(btn, id, delta) {
  const row = btn.closest('tr');
  const input = row.querySelector('input');
  let novaQtd = parseInt(input.value) + delta;
  if (novaQtd < 0) novaQtd = 0;
  input.value = novaQtd;
  atualizarQuantidade(id, novaQtd);
}

// Deletar produto
async function deletarProduto(id) {
  if (!confirm('Tem certeza que deseja excluir este produto?')) return;

  try {
    const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });

    if (res.ok) {
      await carregarProdutos();
    } else {
      alert('Erro ao deletar produto.');
    }
  } catch (error) {
    alert('Erro na conexão: ' + error.message);
  }
}

// Filtro por status
function filtrarStatus(status) {
  const filtrados = produtos.filter(p => calcularStatus(p.qtd_atual, p.qtd_minima, p.qtd_maxima) === status);
  mostrarProdutos(filtrados);
}

function mostrarTodos() {
  mostrarProdutos(produtos);
}

// Busca por nome
function buscarProduto() {
  const termo = document.getElementById('busca').value.toLowerCase();
  const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(termo));
  mostrarProdutos(filtrados);
}

// Exportar CSV
function exportarCSV() {
  let csv = 'Nome,Qtd Atual,Qtd Mínima,Qtd Máxima,Status\n';
  const rows = document.querySelectorAll('#tabelaProdutos tbody tr');

  rows.forEach(row => {
    const cols = row.querySelectorAll('td');
    const nome = cols[0].textContent;
    const qtdAtual = cols[1].querySelector('input')?.value || '';
    const qtdMin = cols[2].textContent;
    const qtdMax = cols[3].textContent;
    const status = cols[4].textContent;

    csv += `${nome},${qtdAtual},${qtdMin},${qtdMax},${status}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', 'produtos.csv');
  link.click();
}
