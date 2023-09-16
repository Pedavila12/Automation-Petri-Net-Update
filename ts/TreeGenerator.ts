
 
function generateTree() {
  return 'Generating tree...'

}

export { generateTree }


  // Defina uma classe para representar um estado da rede de Petri
  class Estado {
    constructor(public marcacao: number[], public transicao_habilitada: number[]) {}
  }
  
  
  // Função para criar uma árvore de alcance a partir de um estado inicial
  function criarArvoreDeAlcance(redeDePetri: any, estadoInicial: Estado): Estado[] {
    // Inicialize a árvore com o estado inicial
    const arvore: Estado[] = [estadoInicial];
  
  
    // Lista para manter controle de estados visitados
    const visitados: Estado[] = [estadoInicial];
  
  
    // Enquanto houver estados na árvore
    while (arvore.length > 0) {
      // Pegue o primeiro estado da árvore
      const estadoAtual = arvore.shift();
  
  
      // Para cada transição habilitada no estado atual
      for (const transicao of estadoAtual.transicao_habilitada) {
        // Gere um novo estado aplicando a transição
        const novoEstado = aplicarTransicao(estadoAtual, transicao, redeDePetri);
  
  
        // Se o novo estado não foi visitado, adicione-o à árvore
        if (!visitados.some((estado) => areEstadosIguais(estado, novoEstado))) {
          arvore.push(novoEstado);
          visitados.push(novoEstado);
        }
      }
    }
  
  
    return visitados;
  }
  
  
  // Função para aplicar uma transição a um estado e obter um novo estado
  function aplicarTransicao(
    estadoAtual: Estado,
    transicao: number,
    redeDePetri: any
  ): Estado {
    const novaMarcacao = [...estadoAtual.marcacao];
  

    // Atualize a marcação de acordo com a transição
    for (const [lugar, peso] of Object.entries(
      
      redeDePetri.transicoes[transicao].pre_condicoes
    )) {
      
      novaMarcacao[Number(lugar)] -= Number(peso);
    }
    for (const [lugar, peso] of Object.entries(
      redeDePetri.transicoes[transicao].pos_condicoes
    )) {
      novaMarcacao[Number(lugar)] += Number(peso);
    }
  
  
    // Verifique quais transições estão habilitadas no novo estado
    const transicoesHabilitadas = redeDePetri.transicoes.filter((transicao: any) =>
      transicaoEhabilitada(transicao, novaMarcacao)
    );
  
  
    return new Estado(novaMarcacao, transicoesHabilitadas.map((t: any) => t.id));
  }
  
  
  // Função para verificar se duas marcações são iguais
  function areMarcacoesIguais(marcacao1: number[], marcacao2: number[]): boolean {
    if (marcacao1.length !== marcacao2.length) {
      return false;
    }
  
  
    for (let i = 0; i < marcacao1.length; i++) {
      if (marcacao1[i] !== marcacao2[i]) {
        return false;
      }
    }
  
  
    return true;
  }
  
  
  // Função para verificar se uma transição está habilitada em uma determinada marcação
  function transicaoEhabilitada(transicao: any, marcacao: number[]): boolean {
    for (const [lugar, peso] of Object.entries(transicao.pre_condicoes)) {
      if (marcacao[Number(lugar)] < Number(peso)) {
        return false;
      }
    }
  
  
    return true;
  }  
  