let produtos = [];
let usuarioTipo = 'operador'; // padrão pra segurar o tipo

document.addEventListener('DOMContentLoaded', async () => {
  await carregarTipoUsuario();
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

async function carregarTipoUsuario() {
  try {
    const res = await fetch('/api/usuario-tipo');
    if (res.ok) {
      const data = await res.json();
      usuarioTipo = data.tipo || 'operador';
      aplicarPermissoes();
    } else {
      alert('Erro ao obter tipo do usuário.');
    }
  } catch (error) {
    alert('Erro de rede ao obter tipo do usuário.');
  }
}

function aplicarPermissoes() {
  // Esconder botão adicionar se não for admin
  const btnAdicionar = document.querySelector('.add-product button');
  if (usuarioTipo !== 'admin' && btnAdicionar) {
    btnAdicionar.style.display = 'none';
  }

  // Quando mostrar produtos, esconder ícone delete se não for admin
  // Vamos garantir que a função mostrarProdutos considere isso
}

// A função mostrarProdutos já chama aplicarPermissoes para esconder delete se preciso
function mostrarProdutos(lista) {
  const tbody = document.querySelector('#tabelaProdutos tbody');
  tbody.innerHTML = '';

  lista.forEach(produto => {
    const status = calcularStatus(produto.qtd_atual, produto.qtd_minima, produto.qtd_maxima);
    const row = document.createElement('tr');
    row.dataset.status = status;
    row.dataset.id = produto.id;

    let nomeTd, qtdAtualTd, qtdMinTd, qtdMaxTd;

    if (usuarioTipo === 'admin') {
      nomeTd = `<td><input type="text" value="${produto.nome}" onchange="atualizarCampo(${produto.id}, 'nome', this.value)" /></td>`;
      qtdAtualTd = `
        <td>
          <div class="qty-controls">
            <button onclick="alterarQuantidade(${produto.id}, -1)">-</button>
            <input type="number" value="${produto.qtd_atual}" onchange="atualizarCampo(${produto.id}, 'qtd_atual', this.value)" />
            <button onclick="alterarQuantidade(${produto.id}, 1)">+</button>
          </div>
        </td>`;
      qtdMinTd = `<td><input type="number" value="${produto.qtd_minima}" onchange="atualizarCampo(${produto.id}, 'qtd_minima', this.value)" /></td>`;
      qtdMaxTd = `<td><input type="number" value="${produto.qtd_maxima}" onchange="atualizarCampo(${produto.id}, 'qtd_maxima', this.value)" /></td>`;
    } else {
      nomeTd = `<td>${produto.nome}</td>`;
      qtdAtualTd = `<td>
        <div class="qty-controls">
          <button onclick="alterarQuantidade(${produto.id}, -1)">-</button>
          <input type="number" value="${produto.qtd_atual}" onchange="atualizarQuantidade(${produto.id}, this.value)" disabled />
          <button onclick="alterarQuantidade(${produto.id}, 1)">+</button>
        </div>
      </td>`;
      qtdMinTd = `<td>${produto.qtd_minima}</td>`;
      qtdMaxTd = `<td>${produto.qtd_maxima}</td>`;
    }

    const deleteHtml = usuarioTipo === 'admin'
      ? `<td><span class="delete-icon" onclick="deletarProduto(${produto.id})">🗑️</span></td>`
      : `<td></td>`;

    row.innerHTML = `
      ${nomeTd}
      ${qtdAtualTd}
      ${qtdMinTd}
      ${qtdMaxTd}
      <td class="status-${status.toLowerCase()}">${status}</td>
      ${deleteHtml}
    `;

    tbody.appendChild(row);
  });
}

async function atualizarCampo(id, campo, valor) {
  const produto = produtos.find(p => p.id === id);
  if (!produto) return;

  const dados = {
    nome: produto.nome,
    qtd_atual: produto.qtd_atual,
    qtd_minima: produto.qtd_minima,
    qtd_maxima: produto.qtd_maxima
  };

  if (campo === 'qtd_atual' || campo === 'qtd_minima' || campo === 'qtd_maxima') {
    dados[campo] = parseInt(valor);
  } else {
    dados[campo] = valor;
  }

  try {
    const res = await fetch(`/api/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (res.ok) {
      await carregarProdutos();
    } else {
      alert('Erro ao atualizar o produto.');
    }
  } catch (error) {
    alert('Erro na conexão ao atualizar o produto.');
  }
}


function alterarQuantidade(id, delta) {
  const row = document.querySelector(`tr[data-id="${id}"]`);
  const input = row.querySelector('input');
  let novaQtd = parseInt(input.value) + delta;
  if (novaQtd < 0) novaQtd = 0;
  input.value = novaQtd;
  atualizarQuantidade(id);
}

async function deletarProduto(id) {
  if (usuarioTipo !== 'admin') {
    alert('Você não tem permissão para deletar produtos.');
    return;
  }

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

function filtrarStatus(status) {
  const filtrados = produtos.filter(p => calcularStatus(p.qtd_atual, p.qtd_minima, p.qtd_maxima) === status);
  mostrarProdutos(filtrados);
}

function mostrarTodos() {
  mostrarProdutos(produtos);
}

function buscarProduto() {
  const termo = document.getElementById('busca').value.toLowerCase();
  const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(termo));
  mostrarProdutos(filtrados);
}

function exportarXLSX() {
  const dados = [];
  const rows = document.querySelectorAll('#tabelaProdutos tbody tr');

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
