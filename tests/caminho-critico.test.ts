import { describe, expect, it } from "vitest";
import { calcularCaminhoCritico, ErroNasTarefas, type Tarefa } from "../src/caminho-critico.ts";

const manutencao: Tarefa[] = [
  { id: "A", nome: "Desligar a máquina", duracao: 2 },
  { id: "B", nome: "Trocar a peça", duracao: 3, dependeDe: ["A"] },
  { id: "C", nome: "Pintar a estrutura", duracao: 4, dependeDe: ["A"] },
  { id: "D", nome: "Testar e religar", duracao: 1, dependeDe: ["B", "C"] },
];

describe("calcularCaminhoCritico", () => {
  it("resolve a manutenção do desafio da Plaorc em 7 dias", () => {
    const r = calcularCaminhoCritico(manutencao);
    expect(r.duracaoTotal).toBe(7);
    expect(r.caminhoCritico).toEqual(["A", "C", "D"]);
  });

  it("calcula início, fim e folga de cada tarefa", () => {
    const r = calcularCaminhoCritico(manutencao);
    const b = r.tarefas.find((t) => t.id === "B")!;
    expect(b).toMatchObject({ inicioCedo: 2, fimCedo: 5, inicioTarde: 3, fimTarde: 6, folga: 1, critica: false });
    const d = r.tarefas.find((t) => t.id === "D")!;
    expect(d).toMatchObject({ inicioCedo: 6, fimCedo: 7, folga: 0, critica: true });
  });

  it("não depende da ordem em que as tarefas aparecem", () => {
    const r = calcularCaminhoCritico([...manutencao].reverse());
    expect(r.duracaoTotal).toBe(7);
    expect(r.caminhoCritico).toEqual(["A", "C", "D"]);
    expect(r.tarefas.map((t) => t.id).indexOf("A")).toBe(0);
  });

  it("devolve zero para uma lista vazia", () => {
    expect(calcularCaminhoCritico([])).toEqual({ duracaoTotal: 0, tarefas: [], caminhoCritico: [] });
  });

  it("trata tarefas independentes como paralelas", () => {
    const r = calcularCaminhoCritico([
      { id: "X", duracao: 3 },
      { id: "Y", duracao: 5 },
    ]);
    expect(r.duracaoTotal).toBe(5);
    expect(r.caminhoCritico).toEqual(["Y"]);
    expect(r.tarefas.find((t) => t.id === "X")!.folga).toBe(2);
  });

  it("aceita durações com casas decimais sem erro de arredondamento", () => {
    const r = calcularCaminhoCritico([
      { id: "A", duracao: 0.1 },
      { id: "B", duracao: 0.2, dependeDe: ["A"] },
    ]);
    expect(r.duracaoTotal).toBe(0.3);
    expect(r.caminhoCritico).toEqual(["A", "B"]);
  });

  it("aceita marcos com duração zero", () => {
    const r = calcularCaminhoCritico([
      { id: "inicio", duracao: 0 },
      { id: "obra", duracao: 10, dependeDe: ["inicio"] },
      { id: "entrega", duracao: 0, dependeDe: ["obra"] },
    ]);
    expect(r.duracaoTotal).toBe(10);
    expect(r.caminhoCritico).toEqual(["inicio", "obra", "entrega"]);
  });

  it("usa o id como nome quando o nome não vem", () => {
    const r = calcularCaminhoCritico([{ id: "A", duracao: 1 }]);
    expect(r.tarefas[0].nome).toBe("A");
  });

  describe("recusa entradas inválidas", () => {
    const casos: [string, Tarefa[], RegExp][] = [
      ["ciclo", [{ id: "A", duracao: 1, dependeDe: ["B"] }, { id: "B", duracao: 1, dependeDe: ["A"] }], /ciclo/],
      ["dependência inexistente", [{ id: "A", duracao: 1, dependeDe: ["Z"] }], /"Z", que não existe/],
      ["id repetido", [{ id: "A", duracao: 1 }, { id: "A", duracao: 2 }], /mais de uma vez/],
      ["duração negativa", [{ id: "A", duracao: -1 }], /duração inválida/],
      ["duração que não é número", [{ id: "A", duracao: Number.NaN }], /duração inválida/],
      ["tarefa que depende dela mesma", [{ id: "A", duracao: 1, dependeDe: ["A"] }], /dela mesma/],
      ["tarefa sem id", [{ id: " ", duracao: 1 }], /sem id/],
    ];

    it.each(casos)("%s", (_, tarefas, mensagem) => {
      expect(() => calcularCaminhoCritico(tarefas)).toThrow(ErroNasTarefas);
      expect(() => calcularCaminhoCritico(tarefas)).toThrow(mensagem);
    });
  });
});
