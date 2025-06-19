let produtos = [];
let filtroCategoria = 'todos';

// Ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
  await carregarProdutos();

  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/logout', { method: 'POST' });
        if (res.ok) {
          window.location.href = '/login';
        } else {
          alert('Erro ao fazer logout.');
        }
      } catch (error) {
        alert('Erro na conexão: ' + error.message);
      }
    });
  }
});

// Buscar produtos do backend
async function carregarProdutos() {
  try {
    const resposta = await fetch('/api/produtos');
    const dados = await resposta.json();
    produtos = dados;
    mostrarProdutos(produtos);
  } catch (error) {
    alert('Erro ao carregar produtos: ' + error.message);
  }
}

// Exibir produtos na tabela
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
          <button onclick="alterarQuantidade(${produto.id}, -1)">-</button>
          <input type="number" value="${produto.qtd_atual}" onchange="atualizarQuantidade(${produto.id}, this.value)" />
          <button onclick="alterarQuantidade(${produto.id}, 1)">+</button>
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

  const novoProduto = {
  nome,
  qtd_atual: qtdAtual,
  qtd_minima: qtdMin,
  qtd_maxima: qtdMax
};

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
async function atualizarQuantidade(id) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const input = row.querySelector('input');
  const novaQtd = parseInt(input.value);

  const produto = produtos.find(p => p.id === id);
  if (!produto) return;

  const dados = {
    qtd_atual: novaQtd,
    qtd_minima: produto.qtd_minima,
    qtd_maxima: produto.qtd_maxima
  };

  try {
    const res = await fetch(`/api/produtos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });

    if (res.ok) {
      await carregarProdutos();
    } else {
      alert("Erro ao atualizar o produto.");
    }
  } catch (error) {
    alert("Erro de rede ao atualizar o produto.");
  }
}

// Botões + e -
function alterarQuantidade(id, delta) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const input = row.querySelector('input');
  let novaQtd = parseInt(input.value) + delta;
  if (novaQtd < 0) novaQtd = 0;
  input.value = novaQtd;
  atualizarQuantidade(id);
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

// Exportar xls
function exportarXLSX() {
  const dados = [];
  const rows = document.querySelectorAll('#tabelaProdutos tbody tr');

  // Cabeçalho
  dados.push(["Nome", "Qtd Atual", "Qtd Mínima", "Qtd Máxima", "Status"]);

  rows.forEach(row => {
    const cols = row.querySelectorAll('td');
    const nome = cols[0].textContent;
    const qtdAtual = cols[1].querySelector('input')?.value || '';
    const qtdMin = cols[2].textContent;
    const qtdMax = cols[3].textContent;
    const status = cols[4].textContent;

    dados.push([nome, qtdAtual, qtdMin, qtdMax, status]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(dados);
  XLSX.utils.book_append_sheet(wb, ws, "Produtos");
  XLSX.writeFile(wb, "produtos.xlsx");
}


