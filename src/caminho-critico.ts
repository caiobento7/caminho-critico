/**
 * Método do caminho crítico (CPM).
 *
 * Recebe uma lista de tarefas com duração e dependências e calcula, para cada uma,
 * o início e o fim mais cedo, o início e o fim mais tarde e a folga. A duração mínima
 * do projeto é o maior "fim mais cedo"; as tarefas sem folga formam o caminho crítico.
 */

export type Tarefa = {
  id: string;
  nome?: string;
  duracao: number;
  dependeDe?: string[];
};

export type TarefaCalculada = {
  id: string;
  nome: string;
  duracao: number;
  dependeDe: string[];
  inicioCedo: number;
  fimCedo: number;
  inicioTarde: number;
  fimTarde: number;
  folga: number;
  critica: boolean;
};

export type Resultado = {
  duracaoTotal: number;
  /** Tarefas em ordem de execução (cada uma aparece depois das que ela depende). */
  tarefas: TarefaCalculada[];
  /** Uma sequência de tarefas críticas do começo ao fim do projeto. */
  caminhoCritico: string[];
};

export class ErroNasTarefas extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroNasTarefas";
  }
}

/** Margem para comparar durações com casas decimais (ex.: 0.1 + 0.2). */
const EPSILON = 1e-9;

export function calcularCaminhoCritico(entrada: Tarefa[]): Resultado {
  const tarefas = validar(entrada);
  const ordem = ordenarPorDependencias(tarefas);

  // Ida: o mais cedo que cada tarefa pode começar e terminar.
  const inicioCedo = new Map<string, number>();
  const fimCedo = new Map<string, number>();
  for (const t of ordem) {
    const inicio = Math.max(0, ...t.dependeDe.map((d) => fimCedo.get(d)!));
    inicioCedo.set(t.id, inicio);
    fimCedo.set(t.id, inicio + t.duracao);
  }
  const duracaoTotal = Math.max(0, ...fimCedo.values());

  // Volta: o mais tarde que cada tarefa pode terminar sem atrasar o projeto.
  const sucessores = new Map<string, string[]>(ordem.map((t) => [t.id, []]));
  for (const t of ordem) for (const d of t.dependeDe) sucessores.get(d)!.push(t.id);

  const inicioTarde = new Map<string, number>();
  const fimTarde = new Map<string, number>();
  for (const t of [...ordem].reverse()) {
    const fim = Math.min(duracaoTotal, ...sucessores.get(t.id)!.map((s) => inicioTarde.get(s)!));
    fimTarde.set(t.id, fim);
    inicioTarde.set(t.id, fim - t.duracao);
  }

  const calculadas: TarefaCalculada[] = ordem.map((t) => {
    const folga = arredondar(inicioTarde.get(t.id)! - inicioCedo.get(t.id)!);
    return {
      id: t.id,
      nome: t.nome,
      duracao: t.duracao,
      dependeDe: t.dependeDe,
      inicioCedo: arredondar(inicioCedo.get(t.id)!),
      fimCedo: arredondar(fimCedo.get(t.id)!),
      inicioTarde: arredondar(inicioTarde.get(t.id)!),
      fimTarde: arredondar(fimTarde.get(t.id)!),
      folga,
      critica: Math.abs(folga) < EPSILON,
    };
  });

  return {
    duracaoTotal: arredondar(duracaoTotal),
    tarefas: calculadas,
    caminhoCritico: montarCaminho(calculadas, sucessores),
  };
}

type TarefaNormalizada = { id: string; nome: string; duracao: number; dependeDe: string[] };

function validar(entrada: Tarefa[]): TarefaNormalizada[] {
  if (!Array.isArray(entrada)) throw new ErroNasTarefas("A entrada precisa ser uma lista de tarefas.");

  const ids = new Set<string>();
  const tarefas = entrada.map((t, i) => {
    const id = typeof t?.id === "string" ? t.id.trim() : "";
    if (!id) throw new ErroNasTarefas(`A tarefa na posição ${i + 1} está sem id.`);
    if (ids.has(id)) throw new ErroNasTarefas(`O id "${id}" aparece mais de uma vez.`);
    ids.add(id);

    if (typeof t.duracao !== "number" || !Number.isFinite(t.duracao) || t.duracao < 0) {
      throw new ErroNasTarefas(`A tarefa "${id}" tem duração inválida: ${String(t.duracao)}.`);
    }

    const dependeDe = [...new Set((t.dependeDe ?? []).map((d) => String(d).trim()).filter(Boolean))];
    if (dependeDe.includes(id)) throw new ErroNasTarefas(`A tarefa "${id}" depende dela mesma.`);

    return { id, nome: t.nome?.trim() || id, duracao: t.duracao, dependeDe };
  });

  for (const t of tarefas) {
    for (const d of t.dependeDe) {
      if (!ids.has(d)) throw new ErroNasTarefas(`A tarefa "${t.id}" depende de "${d}", que não existe.`);
    }
  }
  return tarefas;
}

/** Ordenação topológica (algoritmo de Kahn), mantendo a ordem original quando há empate. */
function ordenarPorDependencias(tarefas: TarefaNormalizada[]): TarefaNormalizada[] {
  const pendentes = new Map(tarefas.map((t) => [t.id, t.dependeDe.length]));
  const ordem: TarefaNormalizada[] = [];
  const feitas = new Set<string>();

  while (ordem.length < tarefas.length) {
    const prontas = tarefas.filter((t) => !feitas.has(t.id) && pendentes.get(t.id) === 0);
    if (prontas.length === 0) {
      const presas = tarefas.filter((t) => !feitas.has(t.id)).map((t) => t.id);
      throw new ErroNasTarefas(`As dependências formam um ciclo entre: ${presas.join(", ")}.`);
    }
    for (const t of prontas) {
      ordem.push(t);
      feitas.add(t.id);
    }
    for (const t of tarefas) {
      if (!feitas.has(t.id)) pendentes.set(t.id, t.dependeDe.filter((d) => !feitas.has(d)).length);
    }
  }
  return ordem;
}

/**
 * Segue as tarefas críticas a partir do início do projeto. Não para ao chegar no fim do prazo:
 * um marco de duração zero (ex.: "entrega") ainda pode vir depois da última tarefa.
 */
function montarCaminho(tarefas: TarefaCalculada[], sucessores: Map<string, string[]>): string[] {
  const porId = new Map(tarefas.map((t) => [t.id, t]));
  let atual = tarefas.find((t) => t.critica && Math.abs(t.inicioCedo) < EPSILON);
  const caminho: string[] = [];

  while (atual) {
    caminho.push(atual.id);
    const fim = atual.fimCedo;
    atual = sucessores
      .get(atual.id)!
      .map((s) => porId.get(s)!)
      .find((s) => s.critica && Math.abs(s.inicioCedo - fim) < EPSILON);
  }
  return caminho;
}

function arredondar(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
