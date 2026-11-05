import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { calcularCaminhoCritico } from "../src/caminho-critico.ts";
import { lerTarefas } from "../src/ler-tarefas.ts";

describe("lerTarefas", () => {
  it("lê uma lista JSON", () => {
    const tarefas = lerTarefas('[{"id":"A","duracao":2},{"id":"B","duracao":1,"dependeDe":["A"]}]');
    expect(tarefas).toEqual([
      { id: "A", nome: undefined, duracao: 2, dependeDe: [] },
      { id: "B", nome: undefined, duracao: 1, dependeDe: ["A"] },
    ]);
  });

  it('lê um objeto JSON com "tarefas" e a chave depende_de', () => {
    const tarefas = lerTarefas('{"tarefas":[{"id":"A","duracao":"1,5","depende_de":"X Y"}]}');
    expect(tarefas[0]).toMatchObject({ duracao: 1.5, dependeDe: ["X", "Y"] });
  });

  it("lê CSV separado por vírgula, com aspas no nome", () => {
    const csv = 'id,nome,duracao,depende_de\nA,"Comprar, montar",2,\nB,Testar,1,A';
    expect(lerTarefas(csv)).toEqual([
      { id: "A", nome: "Comprar, montar", duracao: 2, dependeDe: [] },
      { id: "B", nome: "Testar", duracao: 1, dependeDe: ["A"] },
    ]);
  });

  it("lê CSV do Excel em português (ponto e vírgula, vírgula decimal e acento no cabeçalho)", () => {
    const csv = "﻿Id;Nome;Duração;Depende de\r\nA;Planejar;1,5;\r\nB;Fazer;2;A\r\nC;Revisar;0,5;A|B\r\n";
    const tarefas = lerTarefas(csv);
    expect(tarefas.map((t) => t.duracao)).toEqual([1.5, 2, 0.5]);
    expect(tarefas[2].dependeDe).toEqual(["A", "B"]);
    expect(calcularCaminhoCritico(tarefas).duracaoTotal).toBe(4);
  });

  it("recusa CSV sem a coluna de duração", () => {
    expect(() => lerTarefas("id;nome\nA;Teste")).toThrow(/id e duracao/);
  });

  it("recusa JSON inválido", () => {
    expect(() => lerTarefas("{ isso não é json", "json")).toThrow(/JSON é inválido/);
  });
});

describe("linha de comando", () => {
  const rodar = (...args: string[]) => execFileSync(process.execPath, ["src/cli.ts", ...args], { encoding: "utf8" });

  it("mostra a duração e o caminho crítico do exemplo da manutenção", () => {
    const saida = rodar("exemplos/manutencao.json");
    expect(saida).toContain("Duração mínima: 7 dias");
    expect(saida).toContain("Caminho crítico: Desligar a máquina → Pintar a estrutura → Testar e religar");
  });

  it("lê o exemplo em CSV e devolve JSON com --json", () => {
    const r = JSON.parse(rodar("exemplos/lancamento-site.csv", "--json"));
    expect(r.duracaoTotal).toBe(13);
    expect(r.caminhoCritico).toEqual(["REQ", "API", "FRONT", "TEST", "DEPLOY"]);
  });
});
