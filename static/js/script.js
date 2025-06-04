document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos();

  // Configura o logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (!response.ok) throw new Error('Erro ao fazer logout');
        window.location.href = '/login';
      } catch (error) {
        alert(error.message);
      }
    });
  }
});

async function carregarProdutos() {
  try {
    const response = await fetch('/api/produtos');
    if (!response.ok) throw new Error('Erro ao carregar produtos');
    const produtos = await response.json();
    mostrarProdutos(produtos);
  } catch (error) {
    alert(error.message);
  }
}

function mostrarProdutos(produtos) {
  const tbody = document.querySelector('#tabelaProdutos tbody');
  tbody.innerHTML = '';

  produtos.forEach(produto => {
    const status = calcularStatus(produto.qtdAtual, produto.qtdMin, produto.qtdMax);
    const row = `
      <tr data-status="${status}">
        <td>${produto.nome}</td>
        <td>
          <button onclick="alterarQuantidade(${produto.id}, -1)">-</button>
          <input type="number" value="${produto.qtdAtual}" onchange="atualizarQuantidade(${produto.id}, this.value)" />
          <button onclick="alterarQuantidade(${produto.id}, 1)">+</button>
        </td>
        <td>${produto.qtdMin}</td>
        <td>${produto.qtdMax}</td>
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
  const nome = document.getElementById('novoNome').value.trim();
  const qtdAtual = parseInt(document.getElementById('novaQtd').value);
  const qtdMin = parseInt(document.getElementById('qtdMin').value);
  const qtdMax = parseInt(document.getElementById('qtdMax').value);

  if (!nome || isNaN(qtdAtual) || isNaN(qtdMin) || isNaN(qtdMax)) {
    alert("Preencha todos os campos corretamente!");
    return;
  }

  if (qtdMin > qtdMax) {
    alert("A quantidade mínima não pode ser maior que a máxima!");
    return;
  }

  if (qtdAtual < 0) {
    alert("A quantidade atual não pode ser negativa!");
    return;
  }

  const novoProduto = {
    nome,
    qtdAtual,
    qtdMin,
    qtdMax
  };

  try {
    const response = await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoProduto)
    });

    if (!response.ok) throw new Error('Erro ao adicionar produto');

    carregarProdutos();
    document.querySelectorAll('.add-product input').forEach(input => input.value = '');
  } catch (error) {
    alert(error.message);
  }
}

async function atualizarQuantidade(id, novaQtd) {
  try {
    const response = await fetch(`/api/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qtdAtual: parseInt(novaQtd) })
    });

    if (!response.ok) throw new Error('Erro ao atualizar quantidade');

    carregarProdutos();
  } catch (error) {
    alert(error.message);
  }
}

async function alterarQuantidade(id, delta) {
  try {
    // Seleciona o input da quantidade atual do produto com o id passado
    const linhas = document.querySelectorAll('#tabelaProdutos tbody tr');
    let inputElement = null;

    linhas.forEach(tr => {
      const deleteIcon = tr.querySelector('.delete-icon');
      if (deleteIcon && deleteIcon.getAttribute('onclick').includes(`deletarProduto(${id})`)) {
        inputElement = tr.querySelector('input[type="number"]');
      }
    });

    if (!inputElement) throw new Error('Produto não encontrado');

    let novaQtd = parseInt(inputElement.value) + delta;
    if (isNaN(novaQtd) || novaQtd < 0) novaQtd = 0;

    // Atualiza o backend
    const response = await fetch(`/api/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qtdAtual: novaQtd })
    });

    if (!response.ok) throw new Error('Erro ao atualizar quantidade');

    carregarProdutos();
  } catch (error) {
    alert(error.message);
  }
}

async function deletarProduto(id) {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return;

  try {
    const response = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Erro ao deletar produto');

    carregarProdutos();
  } catch (error) {
    alert(error.message);
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
    const cols = Array.from(tr.children).slice(0, 5).map(td => {
      let texto = td.innerText;
      if (texto.includes(',') || texto.includes('"')) {
        texto = '"' + texto.replace(/"/g, '""') + '"';
      }
      return texto;
    });
    linhas.push(cols);
  });

  const csv = linhas.map(l => l.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'produtos.csv';
  link.click();
}
