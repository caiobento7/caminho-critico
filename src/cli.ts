import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { calcularCaminhoCritico, ErroNasTarefas, type Resultado } from "./caminho-critico.ts";
import { lerTarefas } from "./ler-tarefas.ts";

const AJUDA = `Uso: node src/cli.ts <arquivo.json|arquivo.csv> [--json] [--unidade dias]

Calcula a duração mínima de um conjunto de tarefas e o caminho crítico.
  --json            mostra o resultado em JSON
  --unidade <nome>  unidade de tempo exibida (padrão: dias)`;

function main(args: string[]): number {
  const arquivo = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--unidade");
  if (!arquivo || args.includes("--help") || args.includes("-h")) {
    console.log(AJUDA);
    return arquivo ? 0 : 2;
  }
  const iUnidade = args.indexOf("--unidade");
  const unidade = iUnidade >= 0 ? (args[iUnidade + 1] ?? "dias") : "dias";

  let texto: string;
  try {
    texto = readFileSync(arquivo, "utf8");
  } catch {
    console.error(`Não consegui ler o arquivo: ${arquivo}`);
    return 2;
  }

  try {
    const formato = extname(arquivo).toLowerCase() === ".csv" ? "csv" : undefined;
    const resultado = calcularCaminhoCritico(lerTarefas(texto, formato));
    console.log(args.includes("--json") ? JSON.stringify(resultado, null, 2) : formatar(resultado, unidade));
    return 0;
  } catch (erro) {
    if (erro instanceof ErroNasTarefas) {
      console.error(`Erro: ${erro.message}`);
      return 1;
    }
    throw erro;
  }
}

export function formatar(r: Resultado, unidade = "dias"): string {
  if (r.tarefas.length === 0) return "Nenhuma tarefa informada.";

  const nomes = new Map(r.tarefas.map((t) => [t.id, t.nome]));
  const linhas = [
    `Duração mínima: ${r.duracaoTotal} ${unidade}`,
    `Caminho crítico: ${r.caminhoCritico.map((id) => nomes.get(id)).join(" → ")}`,
    "",
  ];

  const tabela = [
    ["Tarefa", "Duração", "Início", "Fim", "Folga", ""],
    ...r.tarefas.map((t) => [
      t.nome === t.id ? t.id : `${t.id}. ${t.nome}`,
      String(t.duracao),
      String(t.inicioCedo),
      String(t.fimCedo),
      String(t.folga),
      t.critica ? "crítica" : "",
    ]),
  ];
  const larguras = tabela[0].map((_, c) => Math.max(...tabela.map((l) => l[c].length)));
  for (const l of tabela) {
    linhas.push(l.map((v, c) => (c === 0 ? v.padEnd(larguras[c]) : v.padStart(larguras[c]))).join("  ").trimEnd());
  }
  return linhas.join("\n");
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
