

class Place {
    constructor(name, marking = 0, isInhibitor = false) {
        this.name = name;
        this.marking = marking;
        this.isInhibitor = isInhibitor;
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
            this.places[place.name] = new Place(place.name, place.marking);
        });
        this.transitions = transitions;
    }

    fireableTransitions() {
        try {
            return this.transitions.filter((transition) => {
                return Object.keys(transition.inputPlaces).every((place) => {
                    const placeMarking = this.places[place].marking;
                    const requiredMarking = transition.inputPlaces[place];

                    if (transition.isTest) {
                        return placeMarking >= requiredMarking;
                    } else {
                        return placeMarking >= requiredMarking && !this.places[place].isInhibitor;
                    }
                });
            });
        } catch (error) {
            console.error("Arvore Infinita", error.message);
            //console.log("Arvore Infinita");
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
            console.log("A rede de Petri é limitada em k =", maxRequiredTokens);
            return maxRequiredTokens;
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

        console.log("A rede é limitada a K = ", maxRequiredTokens);

        return maxRequiredTokens;
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
function reachabilityTree(net, currentState, visitedStates = new Set()) {
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
            ...reachabilityTree(netCopy, newState, visitedStates)
        );
    }

    return [[currentState, ...fireableTransitions], ...reachableStates];
}

//Essa função foi criada para facilitar o sistema de renderização e alguns cálculos
//ela recebe a rede de petri saida depois do tratamento da função reachabilityTree e nos coloca em um formato mais direto para analise
//Onde os nodes são separados entre mais e filhos, assim simplificando bem a analise pois podemos ver qual marcação deriva qual após as transições dispararem
function interpretReachabilityTree(treeData) {
    class Node {
        constructor(state, transition, isTested, isInhibited, id) {
            this.state = state;
            this.transition = transition;
            this.isTested = isTested;
            this.isInhibited = isInhibited;
            this.children = [];
            this.id = id;
        }
    }
    //Essa função cria um ID para cada a marcação estraindo os valores de cada marcação e montando o formato apresentado em tenha de Mx{y,y,y,y...}
    class IdGenerator {
        constructor() {
            this.counter = 0;
            this.stateToIdMap = new Map();
        }

        getIdForState(state) {
            const stateString = JSON.stringify(state);

            if (!this.stateToIdMap.has(stateString)) {
                const markings = state && typeof state === 'object' ? Object.values(state) : [];
                //console.log(markings)
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
        const isTested = transition ? transition.isTest : false;
        const isInhibited = transition ? transition.isInhibitor : false;
        const id = idGenerator.getIdForState(state);
        const parentNode = new Node(state, transition, isTested, isInhibited, id);
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
                const childIsTested = transitionData.isTest || false;
                const childIsInhibited = transitionData.isInhibitor || false;
                const childNode = new Node(childState, transitionData, childIsTested, childIsInhibited, idGenerator.getIdForState(childState));
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
        console.log("A rede de Petri não é binária ou segura.");
        return false;
    }

    console.log("A rede de Petri é binária e segura.");
    return true;
}

//Verifica se a rede de petri é conservativa através do somatório de marcações que devem permanecer constantes 
function isConservative(treeNodes) {
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

    if (result) {
        console.log("A rede de Petri é conservativa.");
    } else {
        console.log("A rede de Petri não é conservativa.");
    }

    return result;
}

//Verificar se a rede de petri é reversivel isso através de uma estrutura de repetição que verifica se a rede consegue sempre se reiniciar

function isReversible(net) {
    const initialState = Object.fromEntries(
        Object.entries(net.places).map(([p, place]) => [p, place.marking])
    );
    const allMarkings = [initialState];
    const visitedMarkings = new Set();

    while (allMarkings.length > 0) {
        const currentMarking = allMarkings.pop();

        if (visitedMarkings.has(JSON.stringify(currentMarking))) {
            continue;
        }

        visitedMarkings.add(JSON.stringify(currentMarking));

        const fireableTransitions = net.transitions.filter((transition) =>
            Object.keys(transition.inputPlaces).every(
                (place) =>
                    currentMarking[place] >= transition.inputPlaces[place]
            )
        );

        for (const transition of fireableTransitions) {
            const netCopy = new PetriClass(
                Object.values(net.places).map(
                    (place) => new Place(place.name, currentMarking[place])
                ),
                net.transitions
            );
            netCopy.fireTransition(transition);
            const newMarking = Object.fromEntries(
                Object.entries(netCopy.places).map(([p, place]) => [
                    p,
                    place.marking,
                ])
            );

            // Se o novo estado não foi visitado, ou é o estado inicial, adicione-o à lista
            if (
                !visitedMarkings.has(JSON.stringify(newMarking)) ||
                JSON.stringify(newMarking) === JSON.stringify(initialState)
            ) {
                allMarkings.push(newMarking);
            }
        }
    }

    console.log("A rede de Petri é reversível.");
    return true;
}

//Recebe a rede petri da classe PetriClass e retorna as matrizes E,S e C, não está sendo utilizada ainda
function getMatrices(net) {
    const numPlaces = Object.keys(net.places).length;
    const numTransitions = net.transitions.length;

    // Inicializa as matrizes C, E e S com zeros
    const C = Array.from({ length: numPlaces }, () => Array(numTransitions).fill(0));
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

    // Preenche a matriz C
    for (let placeIndex = 0; placeIndex < numPlaces; placeIndex++) {
        for (let i = 0; i < numTransitions; i++) {
            C[placeIndex][i] = E[i][placeIndex] - S[i][placeIndex];
        }
    }

    return { C, E, S };
}

//Recebe como parametro o retorno da função interpretedTree e a marcação que deseja verificar a Alcaçabilidade
function isMarkingReachable(nodes, targetMarking) {
    const visitedNodes = new Set();

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
            return true;
        }
    }

    return false;
}

/*function findPlaceInvariants(matrixC) {
    try {
        const solutions = solveLinearSystem(matrixC);
        
        if (solutions === null) {
            console.error("Não foi possível encontrar as soluções do sistema linear.");
            return null;
        }

        // Filtra as soluções para incluir apenas as que são 0 ou 1
        const placeInvariants = solutions.filter(solution => solution.every(value => value === 0 || value === 1));

        return placeInvariants;
    } catch (error) {
        console.error("Erro ao encontrar os invariantes de lugar:", error.message);
        return null;
    }

}


function solveLinearSystem(matrix) {
    try {
        const augmentedMatrix = math.matrix(matrix);
        const [numRows, numCols] = augmentedMatrix.size();

        // Obtém as colunas da matriz de coeficientes e do vetor constante
        const coefficients = augmentedMatrix.subset(math.index(math.range(0, numRows), math.range(0, numCols - 1)));
        const constants = augmentedMatrix.subset(math.index(math.range(0, numRows), numCols - 1));

        // Decomposição LU
        const luDecomposition = math.lup(coefficients);
        const L = luDecomposition.L;
        const U = luDecomposition.U;
        const P = luDecomposition.p;

        // Vetor de variáveis livres
        const freeVars = math.range(numCols - 1, numCols).toArray();

        // Encontra uma solução particular
        const particularSolution = math.usolve(U, math.lusolve(L, math.subset(P, constants)));

        // Calcula as soluções homogêneas (variáveis livres)
        const homogeneousSolutions = math.transpose(math.nullspace(coefficients));

        // Combina a solução particular com as soluções homogêneas
        const solutions = math.add(particularSolution, math.multiply(homogeneousSolutions, freeVars));

        // Converte as soluções para um array simples
        const solutionsArray = math.flatten(solutions).toArray();

        return solutionsArray;
    } catch (error) {
        console.error("Erro ao resolver o sistema linear:", error.message);
        return null;
    }

}*/


//export { PetriAndProperties }
export { PetriClass }
export { reachabilityTree }
export { interpretReachabilityTree }
export { isBinaryAndSafe }
export { isConservative }
export { isReversible }
export { getMatrices }
export { isMarkingReachable }
//export { findPlaceInvariants }