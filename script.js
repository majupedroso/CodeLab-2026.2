"use strict";

/* ---------- Utilidades ---------- */
const $conteudo = document.getElementById("conteudo");
const FAMILIAS = ["Floral", "Amadeirado", "Cítrico", "Oriental", "Fresco", "Gourmand"];

const escapar = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const gerarId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const normalizar = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const formatarData = (t) => new Date(t).toLocaleDateString("pt-BR");

let temporizadorAviso;
function aviso(msg, tipo = "ok") {
  const elemento = document.getElementById("aviso");
  elemento.textContent = msg;
  elemento.className = `visivel ${tipo}`;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => (elemento.className = ""), 3500);
}

async function gerarHash(senha, sal) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sal + senha));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- Armazenamento ---------- */
const Armazenamento = {
  ler(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; }
  },
  gravar(chave, valor) { localStorage.setItem(chave, JSON.stringify(valor)); },

  get usuarios() { return this.ler("usuarios", []); },
  set usuarios(v) { this.gravar("usuarios", v); },
  get perfumes() { return this.ler("perfumes", []); },
  set perfumes(v) { this.gravar("perfumes", v); },
  get idSessao() { return this.ler("sessao", null); },
  set idSessao(v) { this.gravar("sessao", v); },
};

function usuarioAtual() { return Armazenamento.usuarios.find((u) => u.id === Armazenamento.idSessao) || null; }
function usuarioPorId(id) { return Armazenamento.usuarios.find((u) => u.id === id); }
function buscarPerfume(id) { return Armazenamento.perfumes.find((p) => p.id === id); }

function salvarPerfume(p) {
  const lista = Armazenamento.perfumes;
  const i = lista.findIndex((x) => x.id === p.id);
  i >= 0 ? (lista[i] = p) : lista.unshift(p);
  Armazenamento.perfumes = lista;
}

function media(p) {
  const v = Object.values(p.avaliacoes || {});
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

function htmlEstrelas(avg, count) {
  if (!count) return '<span class="info">Sem avaliações</span>';
  return `<span class="estrelas">${"★".repeat(Math.round(avg))}${"☆".repeat(5 - Math.round(avg))}</span>
          <span class="info">${avg.toFixed(1)} (${count})</span>`;
}

/* ---------- Dados iniciais ---------- */
function popularDados() {
  if (Armazenamento.perfumes.length) return;
  Armazenamento.perfumes = [
    { id: gerarId(), donoId: null, nome: "Noite de Âmbar", marca: "Maison Solene", familia: "Oriental", notas: "Âmbar, baunilha, incenso", volume: 100, ano: 2019, descricao: "Quente e envolvente, ideal para noites frias.", imagem: "", avaliacoes: {}, comentarios: [], criadoEm: Date.now() },
    { id: gerarId(), donoId: null, nome: "Brisa Cítrica", marca: "Atelier Verde", familia: "Cítrico", notas: "Bergamota, limão siciliano, vetiver", volume: 50, ano: 2022, descricao: "Leve e energizante para o dia a dia.", imagem: "", avaliacoes: {}, comentarios: [], criadoEm: Date.now() },
    { id: gerarId(), donoId: null, nome: "Jardim Secreto", marca: "Flor de Lis", familia: "Floral", notas: "Jasmim, peônia, almíscar", volume: 75, ano: 2021, descricao: "Floral delicado com fundo suave.", imagem: "", avaliacoes: {}, comentarios: [], criadoEm: Date.now() },
  ];
}

/* ---------- Navegação ---------- */
function renderizarMenu() {
  const u = usuarioAtual();
  document.getElementById("menu").innerHTML = u
    ? `<a href="#/">Catálogo</a>
       <a href="#/novo">Cadastrar perfume</a>
       <a href="#/perfil/${u.id}">${escapar(u.nome)}</a>
       <button id="sair">Sair</button>`
    : `<a href="#/">Catálogo</a><a href="#/login">Entrar</a><a href="#/cadastro">Criar conta</a>`;
  const out = document.getElementById("sair");
  if (out) out.onclick = () => { Armazenamento.idSessao = null; aviso("Você saiu da conta."); location.hash = "#/"; };
}

function amostra(p) {
  const style = p.imagem ? `style="background-image:url('${escapar(p.imagem)}')"` : "";
  return `<div class="amostra fam-${escapar(p.familia)}" ${style}>${p.imagem ? "" : escapar(p.nome[0])}</div>`;
}

/* ---------- Telas ---------- */
function telaCatalogo(consulta = "") {
  const q = normalizar(consulta);
  const lista = Armazenamento.perfumes.filter((p) => normalizar(p.nome).includes(q));
  $conteudo.innerHTML = `
    <section class="destaque">
      <h1>Descubra, avalie e compartilhe fragrâncias</h1>
      <p>Um catálogo feito por quem ama perfumes. Busque pelo nome ou cadastre o seu favorito.</p>
      <form class="busca" id="busca" role="search">
        <input type="search" id="q" value="${escapar(consulta)}" placeholder="Buscar perfume pelo nome" aria-label="Buscar perfume pelo nome">
        <button class="botao">Buscar</button>
      </form>
    </section>
    ${lista.length ? `<div class="grade">${lista.map(htmlCartao).join("")}</div>`
      : `<p class="vazio">Nenhum perfume encontrado${consulta ? ` para “${escapar(consulta)}”` : ""}. Que tal cadastrar o primeiro?</p>`}`;
  document.getElementById("busca").onsubmit = (e) => {
    e.preventDefault();
    telaCatalogo(document.getElementById("q").value.trim());
  };
}

function htmlCartao(p) {
  const n = Object.keys(p.avaliacoes).length;
  return `<a class="cartao" href="#/perfume/${p.id}">
    ${amostra(p)}
    <div class="cartao-corpo">
      <h3>${escapar(p.nome)}</h3>
      <div class="info">${escapar(p.marca)} · ${escapar(p.familia)}</div>
      <div>${htmlEstrelas(media(p), n)}</div>
    </div></a>`;
}

function telaPerfume(id) {
  const p = buscarPerfume(id);
  if (!p) return telaNaoEncontrada();
  const u = usuarioAtual();
  const dono = u && p.donoId === u.id;
  const autor = usuarioPorId(p.donoId);
  const minha = u ? p.avaliacoes[u.id] : 0;
  const n = Object.keys(p.avaliacoes).length;

  $conteudo.innerHTML = `
    <article class="detalhe">
      ${amostra(p)}
      <div>
        <h1>${escapar(p.nome)}</h1>
        <p class="info">${escapar(p.marca)}</p>
        <div>${htmlEstrelas(media(p), n)}</div>
        <dl class="ficha">
          <dt>Família olfativa</dt><dd>${escapar(p.familia)}</dd>
          <dt>Notas</dt><dd>${escapar(p.notas)}</dd>
          <dt>Volume</dt><dd>${escapar(p.volume)} ml</dd>
          <dt>Lançamento</dt><dd>${escapar(p.ano)}</dd>
          <dt>Cadastrado por</dt><dd>${autor ? `<a href="#/perfil/${autor.id}">${escapar(autor.nome)}</a>` : "Equipe Essência"}</dd>
        </dl>
        <p>${escapar(p.descricao)}</p>
        ${dono ? `<div class="acoes">
          <a class="botao pequeno contorno" href="#/editar/${p.id}">Editar</a>
          <button class="botao pequeno perigo" id="excluir">Excluir</button></div>` : ""}
      </div>
    </article>

    <section>
      <h2>Sua avaliação</h2>
      ${u ? `<div class="avaliar" role="group" aria-label="Nota de 1 a 5">
        ${[1, 2, 3, 4, 5].map((i) => `<button data-nota="${i}" class="${minha === i ? "ativo" : ""}" aria-label="Nota ${i}">${i}</button>`).join("")}
      </div>` : `<p class="dica"><a href="#/login">Entre</a> para avaliar este perfume.</p>`}

      <h2>Comentários (${p.comentarios.length})</h2>
      ${u ? `<form id="form-comentario">
        <label>Seu comentário
          <textarea name="texto" maxlength="500" required></textarea></label>
        <div><button class="botao">Publicar comentário</button></div></form>` : ""}
      ${p.comentarios.length
        ? p.comentarios.map((c) => {
            const a = usuarioPorId(c.usuarioId);
            return `<div class="comentario"><strong>${a ? `<a href="#/perfil/${a.id}">${escapar(a.nome)}</a>` : "Usuário removido"}</strong>
              <span class="info"> · ${formatarData(c.data)}</span><p>${escapar(c.texto)}</p></div>`;
          }).join("")
        : '<p class="vazio">Ainda não há comentários. Seja o primeiro a opinar.</p>'}
    </section>`;

  document.querySelectorAll("[data-nota]").forEach((b) => {
    b.onclick = () => { p.avaliacoes[u.id] = Number(b.dataset.nota); salvarPerfume(p); aviso("Avaliação salva."); telaPerfume(id); };
  });
  const fc = document.getElementById("form-comentario");
  if (fc) fc.onsubmit = (e) => {
    e.preventDefault();
    const texto = new FormData(fc).get("texto").trim();
    if (texto.length < 2) return aviso("Escreva ao menos 2 caracteres.", "erro");
    p.comentarios.push({ id: gerarId(), usuarioId: u.id, texto, data: Date.now() });
    salvarPerfume(p); aviso("Comentário publicado."); telaPerfume(id);
  };
  const ex = document.getElementById("excluir");
  if (ex) ex.onclick = () => {
    if (!confirm("Excluir este perfume? Essa ação não pode ser desfeita.")) return;
    Armazenamento.perfumes = Armazenamento.perfumes.filter((x) => x.id !== id);
    aviso("Perfume excluído."); location.hash = "#/";
  };
}

function telaFormPerfume(id) {
  const u = usuarioAtual();
  if (!u) { aviso("Entre na sua conta para cadastrar perfumes.", "erro"); return (location.hash = "#/login"); }
  const p = id ? buscarPerfume(id) : null;
  if (id && (!p || p.donoId !== u.id)) { aviso("Você só pode editar perfumes cadastrados por você.", "erro"); return (location.hash = "#/"); }
  const v = p || { nome: "", marca: "", familia: FAMILIAS[0], notas: "", volume: "", ano: "", descricao: "", imagem: "" };

  $conteudo.innerHTML = `
    <h1>${p ? "Editar perfume" : "Cadastrar perfume"}</h1>
    <form class="cartao-form" id="form-perfume">
      <label>Nome <input name="nome" value="${escapar(v.nome)}" maxlength="80" required></label>
      <label>Marca <input name="marca" value="${escapar(v.marca)}" maxlength="80" required></label>
      <label>Família olfativa
        <select name="familia">${FAMILIAS.map((f) => `<option ${f === v.familia ? "selected" : ""}>${f}</option>`).join("")}</select></label>
      <label>Notas principais <input name="notas" value="${escapar(v.notas)}" maxlength="150" placeholder="Ex.: bergamota, jasmim, âmbar" required></label>
      <div class="linha">
        <label>Volume (ml) <input name="volume" type="number" min="1" max="1000" value="${escapar(v.volume)}" required></label>
        <label>Ano de lançamento <input name="ano" type="number" min="1900" max="${new Date().getFullYear()}" value="${escapar(v.ano)}" required></label>
      </div>
      <label>Descrição <textarea name="descricao" maxlength="600" required>${escapar(v.descricao)}</textarea></label>
      <label>Link da imagem (opcional) <input name="imagem" type="url" value="${escapar(v.imagem)}" placeholder="https://..."></label>
      <div class="acoes"><button class="botao">${p ? "Salvar alterações" : "Cadastrar perfume"}</button>
        <a href="#/" class="botao contorno">Cancelar</a></div>
    </form>`;

  document.getElementById("form-perfume").onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    Object.keys(d).forEach((k) => (d[k] = d[k].trim()));
    if (!d.nome || !d.marca || !d.notas || !d.descricao) return aviso("Preencha todos os campos obrigatórios.", "erro");
    const salvo = {
      ...(p || { id: gerarId(), donoId: u.id, avaliacoes: {}, comentarios: [], criadoEm: Date.now() }),
      ...d, volume: Number(d.volume), ano: Number(d.ano),
    };
    salvarPerfume(salvo);
    aviso(p ? "Alterações salvas." : "Perfume cadastrado.");
    location.hash = `#/perfume/${salvo.id}`;
  };
}

function telaCadastro() {
  $conteudo.innerHTML = `
    <h1>Criar conta</h1>
    <form class="cartao-form" id="form-cadastro">
      <label>Nome <input name="nome" maxlength="60" required></label>
      <label>E-mail <input name="email" type="email" required></label>
      <label>Senha <input name="senha" type="password" minlength="6" required>
        <span class="dica">Mínimo de 6 caracteres.</span></label>
      <p class="dica">Ao criar a conta, você concorda com o uso do seu nome e e-mail apenas para o funcionamento do site (LGPD).</p>
      <div><button class="botao">Criar conta</button></div>
    </form>`;
  document.getElementById("form-cadastro").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const email = d.email.trim().toLowerCase();
    if (Armazenamento.usuarios.some((u) => u.email === email)) return aviso("Este e-mail já está cadastrado. Tente entrar.", "erro");
    const sal = gerarId();
    const user = { id: gerarId(), nome: d.nome.trim(), email, sal, senha: await gerarHash(d.senha, sal), bio: "", criadoEm: Date.now() };
    Armazenamento.usuarios = [...Armazenamento.usuarios, user];
    Armazenamento.idSessao = user.id;
    aviso("Conta criada. Bem-vindo(a)!"); location.hash = "#/";
  };
}

function telaEntrar() {
  $conteudo.innerHTML = `
    <h1>Entrar</h1>
    <form class="cartao-form" id="form-login">
      <label>E-mail <input name="email" type="email" required></label>
      <label>Senha <input name="senha" type="password" required></label>
      <div class="acoes"><button class="botao">Entrar</button><a href="#/cadastro">Criar conta</a></div>
    </form>`;
  document.getElementById("form-login").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const user = Armazenamento.usuarios.find((u) => u.email === d.email.trim().toLowerCase());
    if (!user || user.senha !== (await gerarHash(d.senha, user.sal))) return aviso("E-mail ou senha incorretos.", "erro");
    Armazenamento.idSessao = user.id;
    aviso(`Olá, ${user.nome}!`); location.hash = "#/";
  };
}

function telaPerfil(id) {
  const user = usuarioPorId(id);
  if (!user) return telaNaoEncontrada();
  const eu = usuarioAtual();
  const proprio = eu && eu.id === user.id;
  const meus = Armazenamento.perfumes.filter((p) => p.donoId === user.id);

  $conteudo.innerHTML = `
    <h1>${escapar(user.nome)}</h1>
    <p class="info">Membro desde ${formatarData(user.criadoEm)}</p>
    <p>${user.bio ? escapar(user.bio) : '<span class="dica">Este usuário ainda não escreveu uma bio.</span>'}</p>
    ${proprio ? `<form class="cartao-form" id="form-perfil">
      <h2>Editar meu perfil</h2>
      <label>Nome <input name="nome" value="${escapar(user.nome)}" maxlength="60" required></label>
      <label>Bio <textarea name="bio" maxlength="300">${escapar(user.bio)}</textarea></label>
      <div><button class="botao">Salvar perfil</button></div></form>` : ""}
    <h2 style="margin-top:32px">Perfumes cadastrados (${meus.length})</h2>
    ${meus.length ? `<div class="grade">${meus.map(htmlCartao).join("")}</div>` : '<p class="vazio">Nenhum perfume cadastrado ainda.</p>'}`;

  const f = document.getElementById("form-perfil");
  if (f) f.onsubmit = (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    if (!d.nome.trim()) return aviso("O nome não pode ficar vazio.", "erro");
    Armazenamento.usuarios = Armazenamento.usuarios.map((x) => (x.id === user.id ? { ...x, nome: d.nome.trim(), bio: d.bio.trim() } : x));
    aviso("Perfil atualizado."); renderizarMenu(); telaPerfil(id);
  };
}

function telaNaoEncontrada() {
  $conteudo.innerHTML = `<h1>Página não encontrada</h1><p><a href="#/">Voltar ao catálogo</a></p>`;
}

/* ---------- Rotas ---------- */
function roteador() {
  const [, rota, param] = location.hash.split("/");
  renderizarMenu();
  switch (rota) {
    case "": case undefined: telaCatalogo(); break;
    case "perfume": telaPerfume(param); break;
    case "novo": telaFormPerfume(); break;
    case "editar": telaFormPerfume(param); break;
    case "cadastro": telaCadastro(); break;
    case "login": telaEntrar(); break;
    case "perfil": telaPerfil(param); break;
    default: telaNaoEncontrada();
  }
  window.scrollTo(0, 0);
}

popularDados();
window.addEventListener("hashchange", roteador);
roteador();