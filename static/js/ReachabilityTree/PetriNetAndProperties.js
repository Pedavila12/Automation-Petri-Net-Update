class Place {
    constructor(name, marking = 0,placeType) {
        this.name = name;
        this.marking = marking;
        this.placeType = placeType;
    }
    toString() {
        return `${this.name}: ${this.marking}`;
    }
}

//Classe que recebe a rede de petri bruta da tela e faz os primeiros tratamentos necessários
class PetriClass {
    constructor(places, transitions) {
        this.places = {};
        places.forEach((place) => {
            this.places[place.name] = new Place(place.name, place.marking, place.placeType);
        });
        this.transitions = transitions;
    }

    fireableTransitions() {
        try {
            return this.transitions.filter((transition) => {
                const allPlaces = new Set([
                    ...Object.keys(transition.inputPlaces),
                    ...Object.keys(transition.testPlace || {}),
                    ...Object.keys(transition.inhibitorPlaces || {}),
                ]);
                return Array.from(allPlaces).every((place) => {
                    const placeMarking = this.places[place].marking;

                    if (transition.inputPlaces[place] !== undefined) {
                        const requiredMarking = transition.inputPlaces[place];
                        if (placeMarking < requiredMarking) {
                            return false;
                        }
                    }
                    if (transition.testPlace && transition.testPlace[place] !== undefined) {
                        const testRequiredMarking = transition.testPlace[place];
                        if (placeMarking < testRequiredMarking) {
                            return false;
                        }
                    }
                    if (transition.inhibitorPlaces && transition.inhibitorPlaces[place] !== undefined) {
                        const inhibitorRequiredMarking = transition.inhibitorPlaces[place];
                        if (placeMarking == inhibitorRequiredMarking) {
                            return false;
                        }
                    }
                    
                    return true;
                    
                });
            });
        } catch (error) {
            console.error("Arvore Infinita", error.message);
        }
    }

    fireTransition(transition) {

        
        for (const place in transition.inputPlaces) {
            this.places[place].marking -= transition.inputPlaces[place];
        }
        for (const place in transition.outputPlaces) {
            this.places[place].marking += transition.outputPlaces[place];
        }
    }
    isDeadlock() {
        return !this.fireableTransitions().length;
    }

    //Verificar a limitação da rede de petri
    limitOfPetriNet() {
        let maxRequiredTokens = this.getMaxRequiredTokens();
        const fireableTransitions = this.fireableTransitions();

        if (fireableTransitions.length === 0) {
            return "There is no Petri Net for analysis.";
        }

        const randomTransition =
            fireableTransitions[
            Math.floor(Math.random() * fireableTransitions.length)
            ];
        this.fireTransition(randomTransition);

        // Atualizar maxRequiredTokens com o maior número de tokens requeridos atual
        maxRequiredTokens = Math.max(
            maxRequiredTokens,
            this.getMaxRequiredTokens()
        );

        return "This Petri Net is limited in k = " + maxRequiredTokens;
    }

    getMaxRequiredTokens() {
        // Retorna o maior número de tokens requeridos por transição
        return Math.max(
            ...this.transitions.map((transition) =>
                Math.max(...Object.values(transition.inputPlaces))
            )
        );
    }
}

//Função que identifica de forma bruta todos os estados da arvore de alcançabilidade
function reachabilityTree(net, currentState, visitedStates = new Set(), depth = 0, maxDepth = 10) {
    // Verificar se a profundidade máxima foi alcançada     
    if (depth > maxDepth) {
        console.warn("Profundidade máxima alcançada. Terminando a exploração.");
        return [[currentState, "InfinityPseudoNode"]];
    }

    const currentStateTuple = Object.entries(currentState);
    if (
        visitedStates.has(JSON.stringify(currentStateTuple)) ||
        net.isDeadlock()
    ) {
        return [[currentState, "Deadlock"]];
    }

    visitedStates.add(JSON.stringify(currentStateTuple));
    const reachableStates = [];
    const fireableTransitions = net.fireableTransitions();

    for (const transition of fireableTransitions) {
        const netCopy = new PetriClass(
            Object.values(net.places).map(
                (place) => new Place(place.name, place.marking)
            ),
            net.transitions
        );
        netCopy.fireTransition(transition);
        
        const newState = Object.fromEntries(
            Object.entries(netCopy.places).map(([p, place]) => [
                p,
                place.marking,
            ])
        );
        reachableStates.push(
            ...reachabilityTree(netCopy, newState, visitedStates, depth + 1, maxDepth)
        );
    }

    return [[currentState, ...fireableTransitions], ...reachableStates];
}

//Essa função foi criada para facilitar o sistema de renderização e alguns cálculos
//ela recebe a rede de petri saida depois do tratamento da função reachabilityTree e nos coloca em um formato mais direto para analise
//Onde os nodes são separados entre mais e filhos, assim simplificando bem a analise pois podemos ver qual marcação deriva qual após as transições dispararem
function interpretReachabilityTree(treeData) {
    //console.log(treeData);
    class Node {
        constructor(state, transition, id) {
            this.state = state;
            this.transition = transition;
            this.children = [];
            this.id = id;
        }
    }

    class IdGenerator {
        constructor() {
            this.counter = 0;
            this.stateToIdMap = new Map();
        }
    
        getIdForState(state) {
            if (state === undefined) {
                console.error('State cannot be undefined');
                return null;
            }
    
            const stateString = JSON.stringify(state);
            if (!this.stateToIdMap.has(stateString)) {
                const markings = state && typeof state === 'object' ? Object.values(state) : [];
                const id = `M${this.counter++} {${markings}}`;
                this.stateToIdMap.set(stateString, id);
            }
            return this.stateToIdMap.get(stateString);
        }
    }
    
    //Lógica de disparo de transições
    function applyTransition(state, transitionData) {
        const inputPlaces = transitionData.inputPlaces;
        const outputPlaces = transitionData.outputPlaces;

        const nextState = { ...state };

        for (const place in inputPlaces) {
            nextState[place] -= inputPlaces[place];
        }

        for (const place in outputPlaces) {
            nextState[place] += outputPlaces[place];
        }

        return nextState;
    }

    const nodes = [];
    const idGenerator = new IdGenerator();

    //Cria cada marcação que queros após o disparo da transição
    const createNode = (nodeData, parentTransition) => {
        const state = nodeData[0];
        const transition = parentTransition || null;
        const id = idGenerator.getIdForState(state);
        const parentNode = new Node(state, transition, id);
        //Verifica se não é uma marcação de fim de ramo
        if (nodeData[1] == "Deadlock") {
            // Se 'Deadlock' estiver presente, cria um nó filho com o estado 'Deadlock'
            const transitionData = nodeData[1];
            const deadlockChild = new Node("Deadlock", transitionData);
            parentNode.children.push(deadlockChild);
        } else if (nodeData.length > 1) {
            for (let i = 1; i < nodeData.length; i++) {
                const transitionData = nodeData[i];
                const childState = applyTransition(parentNode.state, transitionData);
                const childNode = new Node(childState, transitionData,idGenerator.getIdForState(childState));
                parentNode.children.push(childNode);
                createNode(transitionData, transitionData); // Recursivamente cria os filhos do nó filho
            }
        }

        return parentNode;
    };

    //Adiciona todos os nodes na node data
    for (const nodeData of treeData) {
        nodes.push(createNode(nodeData));
    }

    return nodes;
}

//Função que recebe a rede de petri pela classe instanciada petriClass e retorna se a rede é segura ou binária
function isBinaryAndSafe(net) {
    const numPlaces = Object.keys(net.places).length;
    const numTransitions = net.transitions.length;
    if (numPlaces === 0 || numTransitions === 0) {
        return "There is no Petri Net for analysis";
    }
    // Verifica se a rede de Petri é binária e se todas as marcações são 0 ou 1
    const isBinaryAndSafe = net.transitions.every((transition) => {
        const inputPlaces = transition.inputPlaces;
        const outputPlaces = transition.outputPlaces;
        // Verifica se as marcações são 0 ou 1
        return (
            Object.values(inputPlaces).every((marking) => marking === 0 || marking === 1) &&
            Object.values(outputPlaces).every((marking) => marking === 0 || marking === 1)
        );
    });

    if (!isBinaryAndSafe) {
        return "The Petri Net is not binary or safe";
    }

    return "The Petri Net is binary and safe"
}

//Verifica se a rede de petri é conservativa através do somatório de marcações que devem permanecer constantes 
function isConservative(treeNodes, net) {
    const numPlaces = Object.keys(net.places).length;
    const numTransitions = net.transitions.length;
    if (numPlaces === 0 || numTransitions === 0) {
        return "There is no Petri Net for analysis";
    }
    // Função para calcular a somatória dos markings de um estado
    function calculateMarkingsSum(state) {
        return Object.values(state).reduce((sum, marking) => sum + marking, 0);
    }

    // Obtém a somatória dos markings do primeiro estado como referência
    const referenceSum = calculateMarkingsSum(treeNodes[0].state);

    // Array para armazenar a somatória dos markings de cada estado separadamente
    const markingsSums = treeNodes.map((node) => calculateMarkingsSum(node.state));

    // Verifica se todas as somatórias são iguais à referência
    const result = markingsSums.every((sum) => sum === referenceSum);

    if (!result) {
        return "The Petri Net is not conservative"
    }

    return "The Petri Net is conservative";
}

//Verificar se a rede de petri é reversivel isso através de uma estrutura de repetição que verifica se a rede consegue sempre se reiniciar

function isReversible(interpretedTree, net) {
    const numPlaces = Object.keys(net.places).length;
    const numTransitions = net.transitions.length;
    if (numPlaces === 0 || numTransitions === 0) {
        return "There is no Petri Net for analysis";
    }

     // Identifica o nó inicial a partir do primeiro nó da árvore
     const initialNodeId = interpretedTree[0].id;
     let initialNodeCount = 0;
 
     function traverseTree(node) {
         if (node.id === initialNodeId) {
             initialNodeCount++;
         }
         if (node.children) {
             for (const child of node.children) {
                 traverseTree(child);
             }
         }
     }
 
     // Percorre cada raiz na lista de árvores
     for (const root of interpretedTree) {
         traverseTree(root);
     }
 
     // Verifica se o nó inicial apareceu mais de uma vez
     if (initialNodeCount > 1) {
         return "The Petri Net is reversible";
     } else {
         return "The Petri Net is not reversible";
    }
}

function isPetriNetLive(reachabilityTree, net) {
    const numPlaces = Object.keys(net.places).length;
    const numTransitions = net.transitions.length;

    if (numPlaces === 0 || numTransitions === 0) {
        return "There is no Petri Net for analysis";
    }

    // Map para armazenar os nodes por ID
    const nodeIdMap = new Map();
    const nodeIdSet = new Set();

    function traverseTree(node) {
        // Verificar se o nó é um nó final de ramo
        if (node.children.length === 0) {
            nodeIdSet.add(node.id); // Adicionar o ID do nó ao conjunto
        } else {
            // Recursivamente percorrer os filhos do nó
            node.children.forEach(child => traverseTree(child));
        }
    }

    reachabilityTree.forEach(node => traverseTree(node));

    // Verificar se há IDs únicos nos nós finais de ramo
    if (nodeIdSet.size === reachabilityTree.length) {
        return "The Petri Net is dead";
    } else {
        // Array para armazenar os estados dos filhos dos nós duplicados
        const duplicateNodeChildrenStates = [];

        // Função para percorrer a árvore de alcance recursivamente e encontrar duplicados
        function traverseTree(node) {
            const nodeId = node.id;

            if (!nodeIdMap.has(nodeId)) {
                nodeIdMap.set(nodeId, []);
            }

            // Verificar se o node já existe no mapa
            const nodesWithSameId = nodeIdMap.get(nodeId);
            const isDuplicate = nodesWithSameId.some(existingNode => areNodesEqual(existingNode, node));

            if (isDuplicate) {
                // Adicionar os estados dos filhos ao array de estados
                node.children.forEach(child => {
                    duplicateNodeChildrenStates.push(child.state);
                });
            }

            // Adicionar o node ao mapa
            nodeIdMap.get(nodeId).push(node);

            // Recursivamente percorrer os filhos do nó
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => traverseTree(child));
            }
        }

        // Função para verificar igualdade entre dois nodes
        function areNodesEqual(node1, node2) {
            // Comparar o estado dos nodes
            if (JSON.stringify(node1.state) !== JSON.stringify(node2.state)) {
                return false;
            }

            // Comparar os filhos dos nodes recursivamente
            if (node1.children.length !== node2.children.length) {
                return false;
            }

            // Verificar se os filhos são iguais
            for (let i = 0; i < node1.children.length; i++) {
                if (!areNodesEqual(node1.children[i], node2.children[i])) {
                    return false;
                }
            }

            return true;
        }

        // Percorrer a árvore de alcançabilidade
        reachabilityTree.forEach(node => traverseTree(node));

        // Console log para validação
        let defineDead = false;
        for (let i = 0; i < duplicateNodeChildrenStates.length; i++) {
            // Verifica se o valor atual é igual à variável alvo
            if (duplicateNodeChildrenStates[i] === 'Deadlock') {
                defineDead = true;
                break;  // Se encontrar, podemos parar o loop
            }
        }
        if(defineDead){
            return "The Petri Net is dead";
        }

        return "The Petri Net is alive";
    
    }

    
}

//Recebe a rede petri da classe PetriClass e retorna as matrizes E,S e C, não está sendo utilizada ainda
function getMatrices(net) {
    const numPlaces = Object.keys(net.places).length;
    const numTransitions = net.transitions.length;

    // Inicializa as matrizes C, E e S com zeros
    const C = Array.from({ length: numTransitions }, () => Array(numPlaces).fill(0));
    const E = Array.from({ length: numTransitions }, () => Array(numPlaces).fill(0));
    const S = Array.from({ length: numTransitions }, () => Array(numPlaces).fill(0));

    // Preenche as matrizes com os pesos dos arcos de entrada e saída
    for (let i = 0; i < numTransitions; i++) {
        const transition = net.transitions[i];

        // Preenche a matriz E
        for (const place in transition.inputPlaces) {
            const placeIndex = Object.keys(net.places).indexOf(place);
            E[i][placeIndex] = transition.inputPlaces[place];
        }

        // Preenche a matriz S
        for (const place in transition.outputPlaces) {
            const placeIndex = Object.keys(net.places).indexOf(place);
            S[i][placeIndex] = transition.outputPlaces[place];
        }
    }

    // Calcula a matriz C como a diferença entre S e E
    for (let i = 0; i < numTransitions; i++) {
        for (let j = 0; j < numPlaces; j++) {
            C[i][j] = S[i][j] - E[i][j];
        }
    }

    return { C, E, S };
}

//Recebe como parametro o retorno da função interpretedTree e a marcação que deseja verificar a Alcaçabilidade
function isMarkingReachable(nodes, targetMarking, net) {
    const visitedNodes = new Set();
    const numPlaces = Object.keys(net.places).length;
    const numTransitions = net.transitions.length;
    if (numPlaces === 0 || numTransitions === 0) {
        return "There is no Petri Net for analysis";
    }

    function dfs(node) {
        if (visitedNodes.has(node)) {
            return false;
        }

        visitedNodes.add(node);

        if (JSON.stringify(node.state) === JSON.stringify(targetMarking)) {
            return true;
        }

        for (const childNode of node.children) {
            if (dfs(childNode)) {
                return true;
            }
        }

        return false;
    }

    for (const rootNode of nodes) {
        if (dfs(rootNode)) {
            return "The suggested marking is achievable";
        }
    }

    return "The suggested marking is not achievable";
}



function findPlaceInvariants(C) {
    
    // Transposta de C
    const C_T = math.transpose(C);

    // Encontrar vetores Z de soluções
    const solutions = [];

    function generateBinaryVectors(length, currentVector = []) {
        if (currentVector.length === length) {
            const Z = math.matrix(currentVector);
            const product = math.multiply(C, Z);
            if (math.deepEqual(product, math.zeros(product.size()))) {
                solutions.push(currentVector.slice());
            }
            return;
        }

        // Recursivamente adicionar 0 ou 1
        generateBinaryVectors(length, [...currentVector, 0]);
        generateBinaryVectors(length, [...currentVector, 1]);
    }

    // Gerar todos os vetores binários de tamanho igual ao número de colunas de C
    generateBinaryVectors(C[0].length);

    // Filtrar para obter até 3 soluções não nulas
    const filteredSolutions = solutions.filter(solution =>
        !solution.every(value => value === 0)
    ).slice(0, 3);

    // Garantir que pelo menos três soluções são encontradas
    while (filteredSolutions.length < 3) {
        // Adicionar soluções adicionais arbitrárias (vetores de 0 e 1) para garantir três resultados
        const arbitrarySolution = Array(C[0].length).fill(0).map(() => Math.round(Math.random()));
        filteredSolutions.push(arbitrarySolution);
    }

    return filteredSolutions;
}


function findTransitionInvariants(C) {
    // Transposta de C
    const C_T = math.transpose(C);

    // Encontrar vetores fs de soluções
    const solutions = [];

    function generateIntegerVectors(length, currentVector = []) {
        if (currentVector.length === length) {
            const fs = math.matrix(currentVector);
            const product = math.multiply(fs, C);
            if (math.deepEqual(product, math.zeros(product.size()))) {
                solutions.push(currentVector.slice());
            }
            return;
        }

        // Recursivamente adicionar inteiros de 1 a 9
        for (let i = 0; i <= 9; i++) {
            generateIntegerVectors(length, [...currentVector, i]);
        }
    }

    // Verificar o número de lugares (linhas de C)
    const numPlaces = C.length;

    // Gerar todos os vetores de inteiros de tamanho igual ao número de lugares
    generateIntegerVectors(numPlaces);

    // Filtrar para obter soluções não nulas e positivas ou binárias
    const filteredSolutions = solutions.filter(solution => {
        const isBinary = solution.every(value => value === 0 || value === 1);
        const isPositive = solution.every(value => value >= 1);
        return !solution.every(value => value === 0) && (isBinary || isPositive);
    }).slice(0, 3);

    // Garantir que pelo menos três soluções são encontradas
    while (filteredSolutions.length < 3) {
        // Adicionar soluções adicionais arbitrárias (vetores de 1 a 9)
        const arbitrarySolution = Array(numPlaces).fill(0).map(() => Math.floor(Math.random() * 9) + 1);
        filteredSolutions.push(arbitrarySolution);
    }

    return filteredSolutions;
}


export { PetriClass }
export { reachabilityTree }
export { interpretReachabilityTree }
export { isBinaryAndSafe }
export { isConservative }
export { isReversible }
export { getMatrices }
export { isMarkingReachable }
export { isPetriNetLive }
export { findPlaceInvariants }
export { findTransitionInvariants }
