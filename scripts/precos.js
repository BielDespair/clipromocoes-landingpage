/**
 * Carrega as faixas de preço de uma planilha do Google publicada como CSV.
 *
 * Os preços que estão no HTML continuam sendo a fonte de reserva: se a planilha
 * não carregar (rede, Google fora do ar, aba renomeada), a página mostra o que
 * já estava lá em vez de ficar vazia.
 *
 * Planilha esperada, aba "Precos", com cabeçalho na primeira linha:
 *
 *   produto          | faixa                    | preco
 *   tradicional-500  | 1 a 3 unidades           | R$ 35,00 cada
 *   tradicional-500  | Fardo com 10 unidades    | R$ 320,00
 *   gourmet-500      | 1 unidade                | R$ 45,00
 *
 * O valor de "produto" tem que bater com o data-produto do HTML.
 */

const ABA = 'Precos';
const URL_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQn7k5koD4jVzzFmk-AXJRFCd16cG99OtbpEcjIyHL1yY3qdWzVYxOpOWT2IXCqy85PilDK-BllF7n_/pub?gid=470453702&single=true&output=csv';

/** Parser de CSV que respeita aspas — necessário porque os preços têm vírgula. */
function parseCSV(texto) {
	const linhas = [];
	let campo = '';
	let linha = [];
	let dentroDeAspas = false;

	for (let i = 0; i < texto.length; i++) {
		const c = texto[i];

		if (dentroDeAspas) {
			if (c === '"') {
				if (texto[i + 1] === '"') { campo += '"'; i++; }
				else dentroDeAspas = false;
			} else {
				campo += c;
			}
			continue;
		}

		if (c === '"') dentroDeAspas = true;
		else if (c === ',') { linha.push(campo); campo = ''; }
		else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
		else if (c !== '\r') campo += c;
	}

	if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
	return linhas;
}

function montarTabela(faixas) {
	const fragmento = document.createDocumentFragment();

	for (const { faixa, preco } of faixas) {
		const linha = document.createElement('div');
		linha.className = 'price-row';

		const rotulo = document.createElement('span');
		rotulo.className = 'qty';
		rotulo.textContent = faixa;

		const valor = document.createElement('span');
		valor.className = 'price';
		valor.textContent = preco;

		linha.append(rotulo, valor);
		fragmento.append(linha);
	}

	return fragmento;
}

async function carregarPrecos() {
	const resposta = await fetch(URL_CSV, { cache: 'no-store' });
	if (!resposta.ok) return;

	const linhas = parseCSV(await resposta.text());
	if (linhas.length < 2) return;

	// Agrupa por produto, preservando a ordem em que aparecem na planilha.
	const porProduto = new Map();

	for (const colunas of linhas.slice(1)) {
		const produto = (colunas[0] || '').trim();
		const faixa = (colunas[1] || '').trim();
		const preco = (colunas[2] || '').trim();
		if (!produto || !faixa || !preco) continue;

		if (!porProduto.has(produto)) porProduto.set(produto, []);
		porProduto.get(produto).push({ faixa, preco });
	}

	for (const [produto, faixas] of porProduto) {
		const container = document.querySelector(`[data-produto="${produto}"]`);
		if (!container) continue;

		container.replaceChildren(montarTabela(faixas));
	}
}

// Falha em silêncio: os preços do HTML permanecem na tela.
carregarPrecos().catch(() => {});