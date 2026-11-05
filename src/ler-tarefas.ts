import { ErroNasTarefas, type Tarefa } from "./caminho-critico.ts";

/**
 * Lê tarefas de um texto JSON ou CSV.
 *
 * JSON: uma lista de tarefas ou um objeto { "tarefas": [...] }.
 * CSV: cabeçalho com id, nome, duracao e depende_de. O separador pode ser vírgula
 * ou ponto e vírgula (padrão do Excel em português). Em depende_de, separe os ids
 * com espaço ou "|".
 */
export function lerTarefas(texto: string, formato?: "json" | "csv"): Tarefa[] {
  const conteudo = texto.replace(/^﻿/, "").trim();
  const tipo = formato ?? (conteudo.startsWith("[") || conteudo.startsWith("{") ? "json" : "csv");
  return tipo === "json" ? lerJson(conteudo) : lerCsv(conteudo);
}

function lerJson(texto: string): Tarefa[] {
  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new ErroNasTarefas("O JSON é inválido.");
  }
  const lista = Array.isArray(dados) ? dados : (dados as { tarefas?: unknown })?.tarefas;
  if (!Array.isArray(lista)) throw new ErroNasTarefas('Use uma lista de tarefas ou { "tarefas": [...] }.');

  return lista.map((t: Record<string, unknown>) => ({
    id: String(t.id ?? ""),
    nome: t.nome === undefined ? undefined : String(t.nome),
    duracao: typeof t.duracao === "string" ? lerNumero(t.duracao) : (t.duracao as number),
    dependeDe: listaDeIds(t.dependeDe ?? t.depende_de),
  }));
}

function lerCsv(texto: string): Tarefa[] {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (linhas.length === 0) return [];

  const separador = linhas[0].includes(";") ? ";" : ",";
  const cabecalho = dividirLinha(linhas[0], separador).map((c) => normalizar(c));
  const coluna = (...nomes: string[]) => cabecalho.findIndex((c) => nomes.includes(c));

  const iId = coluna("id");
  const iNome = coluna("nome", "tarefa");
  const iDuracao = coluna("duracao", "dias");
  const iDepende = coluna("depende_de", "dependede", "depende", "dependencias");
  if (iId < 0 || iDuracao < 0) throw new ErroNasTarefas("O CSV precisa das colunas id e duracao.");

  return linhas.slice(1).map((linha) => {
    const campos = dividirLinha(linha, separador);
    return {
      id: campos[iId] ?? "",
      nome: iNome >= 0 ? campos[iNome] : undefined,
      duracao: lerNumero(campos[iDuracao] ?? ""),
      dependeDe: iDepende >= 0 ? listaDeIds(campos[iDepende]) : [],
    };
  });
}

/** Divide uma linha de CSV respeitando campos entre aspas. */
function dividirLinha(linha: string, separador: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let entreAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (entreAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        entreAspas = !entreAspas;
      }
    } else if (c === separador && !entreAspas) {
      campos.push(atual.trim());
      atual = "";
    } else {
      atual += c;
    }
  }
  campos.push(atual.trim());
  return campos;
}

function listaDeIds(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.map(String);
  if (typeof valor !== "string") return [];
  return valor.split(/[\s|,]+/).filter(Boolean);
}

/** Aceita "1.5" e "1,5". Texto que não é número vira NaN e é recusado na validação. */
function lerNumero(texto: string): number {
  const limpo = texto.trim().replace(",", ".");
  return limpo === "" ? Number.NaN : Number(limpo);
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}
