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