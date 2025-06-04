document.addEventListener('DOMContentLoaded', carregarProdutos);

async function carregarProdutos() {
  const response = await fetch('/api/produtos');
  const produtos = await response.json();
  mostrarProdutos(produtos);
}

function mostrarProdutos(produtos) {
  const tbody = document.querySelector('#tabelaProdutos tbody');
  tbody.innerHTML = '';

  produtos.forEach(produto => {
    const status = calcularStatus(produto.qtd_atual, produto.qtd_minima, produto.qtd_maxima);
    const row = `
      <tr data-status="${status}">
        <td>${produto.nome}</td>
        <td><input type="number" value="${produto.qtd_atual}" onchange="atualizarQuantidade(${produto.id}, this.value)" /></td>
        <td>${produto.qtd_minima}</td>
        <td>${produto.qtd_maxima}</td>
        <td class="status-${status.toLowerCase()}">${status}</td>
        <td><span class="delete-icon" onclick="deletarProduto(${produto.id})">🗑️</span></td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

function calcularStatus(qtdAtual, qtdMin, qtdMax) {
  if (qtdAtual <= qtdMin) return 'URGENTE';
  if (qtdAtual >= qtdMax) return 'EXCESSO';
  return 'OK';
}

async function adicionarProduto() {
  const nome = document.getElementById('novoNome').value;
  const qtdAtual = parseInt(document.getElementById('novaQtd').value);
  const qtdMin = parseInt(document.getElementById('qtdMin').value);
  const qtdMax = parseInt(document.getElementById('qtdMax').value);

  if (!nome || isNaN(qtdAtual) || isNaN(qtdMin) || isNaN(qtdMax)) {
    alert("Preencha todos os campos!");
    return;
  }

  const novoProduto = { nome, qtdAtual, qtdMin, qtdMax };

  const response = await fetch('/api/produtos_estoque', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novoProduto)
  });

  if (response.ok) {
    carregarProdutos();
    document.querySelectorAll('.add-product input').forEach(input => input.value = '');
  } else {
    alert("Erro ao adicionar produto");
  }
}

async function atualizarQuantidade(id, novaQtd) {
  await fetch(`/api/produtos_estoque/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qtdAtual: parseInt(novaQtd) })
  });
  carregarProdutos();
}

async function deletarProduto(id) {
  if (confirm("Tem certeza que deseja excluir este produto?")) {
    await fetch(`/api/produtos_estoque/${id}`, { method: 'DELETE' });
    carregarProdutos();
  }
}

function buscarProduto() {
  const termo = document.getElementById('busca').value.toLowerCase();
  const linhas = document.querySelectorAll('#tabelaProdutos tbody tr');
  linhas.forEach(linha => {
    const nome = linha.children[0].textContent.toLowerCase();
    linha.style.display = nome.includes(termo) ? '' : 'none';
  });
}

function filtrarStatus(status) {
  const linhas = document.querySelectorAll('#tabelaProdutos tbody tr');
  linhas.forEach(linha => {
    linha.style.display = linha.dataset.status === status ? '' : 'none';
  });
}

function mostrarTodos() {
  document.querySelectorAll('#tabelaProdutos tbody tr').forEach(linha => {
    linha.style.display = '';
  });
}

function exportarCSV() {
  const linhas = [['Nome', 'Qtd Atual', 'Qtd Mínima', 'Qtd Máxima', 'Status']];
  document.querySelectorAll('#tabelaProdutos tbody tr').forEach(tr => {
    const cols = Array.from(tr.children).slice(0, 5).map(td => td.innerText);
    linhas.push(cols);
  });

  const csv = linhas.map(l => l.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'produtos.csv';
  link.click();
}
