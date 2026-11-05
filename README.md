# Caminho crítico

[![CI](https://github.com/caiobento7/caminho-critico/actions/workflows/ci.yml/badge.svg)](https://github.com/caiobento7/caminho-critico/actions/workflows/ci.yml)

Calcula a **duração mínima** de qualquer lista de tarefas com dependências e mostra o **caminho crítico**: a sequência de tarefas que, se atrasar, atrasa o projeto inteiro. Usa o método do caminho crítico (CPM).

Funciona com JSON ou com uma planilha exportada em CSV, inclusive o CSV do Excel em português (ponto e vírgula e vírgula decimal).

## Exemplo

```text
$ node src/cli.ts exemplos/manutencao.json
Duração mínima: 7 dias
Caminho crítico: Desligar a máquina → Pintar a estrutura → Testar e religar

Tarefa                 Duração  Início  Fim  Folga
A. Desligar a máquina        2       0    2      0  crítica
B. Trocar a peça             3       2    5      1
C. Pintar a estrutura        4       2    6      0  crítica
D. Testar e religar          1       6    7      0  crítica
```

"Trocar a peça" tem 1 dia de folga: pode atrasar 1 dia sem mudar a data de entrega.

## Como usar

Precisa do Node.js 24 ou mais novo, que roda TypeScript direto, sem etapa de build.

```bash
npm install
node src/cli.ts exemplos/manutencao.json
node src/cli.ts exemplos/lancamento-site.csv --unidade semanas
node src/cli.ts minhas-tarefas.csv --json
```

### Formato das tarefas

JSON:

```json
{
  "tarefas": [
    { "id": "A", "nome": "Desligar a máquina", "duracao": 2 },
    { "id": "B", "nome": "Trocar a peça", "duracao": 3, "dependeDe": ["A"] }
  ]
}
```

CSV (separe as dependências com espaço ou `|`):

```csv
id;nome;duracao;depende_de
REQ;Levantar requisitos;2;
API;Criar a API;5;REQ
FRONT;Desenvolver o frontend;4;REQ API
```

Também dá para usar no código:

```ts
import { calcularCaminhoCritico } from "./src/caminho-critico.ts";

const r = calcularCaminhoCritico(tarefas);
r.duracaoTotal;   // 7
r.caminhoCritico; // ["A", "C", "D"]
r.tarefas;        // início, fim e folga de cada tarefa
```

## Como funciona

1. **Validação:** recusa id repetido, duração negativa, dependência que não existe e ciclos (A depende de B, que depende de A), com uma mensagem que diz qual tarefa corrigir.
2. **Ordenação topológica** (algoritmo de Kahn): cada tarefa entra depois das que ela depende.
3. **Ida:** o início mais cedo de uma tarefa é o maior fim entre as dependências dela. O maior fim de todos é a duração mínima.
4. **Volta:** partindo do prazo final, calcula o mais tarde que cada tarefa pode terminar sem atrasar o projeto.
5. **Folga** = início mais tarde − início mais cedo. Tarefas com folga zero são críticas.

## Testes

```bash
npm test          # Vitest: cálculo, leitura de JSON/CSV e linha de comando
npm run typecheck # TypeScript em modo strict
```

O GitHub Actions roda os dois a cada push.

---

Feito por [Caio Bento](https://caiobento.vercel.app).
