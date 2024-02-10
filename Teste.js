class Place {
    constructor(name, marking = 0) {
        this.name = name;
        this.marking = marking;
    }

    toString() {
        return `${this.name}: ${this.marking}`;
    }
}

class Transition {
    constructor(inputPlaces, outputPlaces) {
        this.inputPlaces = inputPlaces;
        this.outputPlaces = outputPlaces;
    }

    toString() {
        return `Input: ${JSON.stringify(this.inputPlaces)}, Output: ${JSON.stringify(this.outputPlaces)}`;
    }
}

class PetriNet {
    constructor(places, transitions) {
        this.places = {};
        places.forEach(place => {
            this.places[place.name] = new Place(place.name, place.marking);
        });
        this.transitions = transitions;
    }

    fireableTransitions() {
        return this.transitions.filter(transition =>
            Object.keys(transition.inputPlaces).every(place =>
                this.places[place].marking >= transition.inputPlaces[place]
            )
        );
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
     // ... (código existente)

     isSafe() {
        const allMarkings = [Object.fromEntries(Object.entries(this.places).map(([p, place]) => [p, place.marking]))];
        const visitedMarkings = new Set();

        while (allMarkings.length > 0) {
            const currentMarking = allMarkings.pop();

            if (visitedMarkings.has(JSON.stringify(currentMarking))) {
                continue;
            }

            visitedMarkings.add(JSON.stringify(currentMarking));

            const fireableTransitions = this.transitions.filter(transition =>
                Object.keys(transition.inputPlaces).every(place =>
                    currentMarking[place] >= transition.inputPlaces[place]
                )
            );

            if (fireableTransitions.length === 0) {
                console.log("A rede de Petri não é segura. Deadlock encontrado.");
                return false;
            }

            for (const transition of fireableTransitions) {
                const netCopy = new PetriNet(
                    Object.values(this.places).map(place => new Place(place.name, currentMarking[place])),
                    this.transitions
                );
                netCopy.fireTransition(transition);
                const newMarking = Object.fromEntries(Object.entries(netCopy.places).map(([p, place]) => [p, place.marking]));

                allMarkings.push(newMarking);
            }
        }

        console.log("A rede de Petri é segura.");
        return true;
    }

    isConservative() {
        const conservationEquations = [];

        for (const placeName in this.places) {
            const conservationCoefficients = this.transitions.map(transition => (
                (transition.outputPlaces[placeName] || 0) - (transition.inputPlaces[placeName] || 0)
            ));

            const equation = {
                coefficients: conservationCoefficients,
                constant: this.places[placeName].marking
            };

            conservationEquations.push(equation);
        }

        const result = this.solveLinearSystem(conservationEquations);

        if (result) {
            console.log("A rede de Petri é conservativa.");
        } else {
            console.log("A rede de Petri não é conservativa.");
        }

        return result;
    }

    solveLinearSystem(equations) {
        const augmentedMatrix = equations.map(eq => [...eq.coefficients, eq.constant]);

        for (let i = 0; i < augmentedMatrix.length; i++) {
            // Fazendo a matriz triangular superior
            for (let j = i + 1; j < augmentedMatrix.length; j++) {
                const factor = augmentedMatrix[j][i] / augmentedMatrix[i][i];
                for (let k = i; k < augmentedMatrix[i].length; k++) {
                    augmentedMatrix[j][k] -= factor * augmentedMatrix[i][k];
                }
            }
        }

        // Resolvendo o sistema linear
        const solution = [];
        for (let i = augmentedMatrix.length - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < augmentedMatrix[i].length - 1; j++) {
                sum += augmentedMatrix[i][j] * solution[j - i - 1];
            }
            solution.unshift((augmentedMatrix[i][augmentedMatrix[i].length - 1] - sum) / augmentedMatrix[i][i]);
        }

        // Verificando se o sistema tem solução única
        return solution.every(value => !isNaN(value) && isFinite(value));
    }

    isReversible() {
        const initialState = Object.fromEntries(Object.entries(this.places).map(([p, place]) => [p, place.marking]));
        const allMarkings = [initialState];
        const visitedMarkings = new Set();

        while (allMarkings.length > 0) {
            const currentMarking = allMarkings.pop();

            if (visitedMarkings.has(JSON.stringify(currentMarking))) {
                continue;
            }

            visitedMarkings.add(JSON.stringify(currentMarking));

            const fireableTransitions = this.transitions.filter(transition =>
                Object.keys(transition.inputPlaces).every(place =>
                    currentMarking[place] >= transition.inputPlaces[place]
                )
            );

            for (const transition of fireableTransitions) {
                const netCopy = new PetriNet(
                    Object.values(this.places).map(place => new Place(place.name, currentMarking[place])),
                    this.transitions
                );
                netCopy.fireTransition(transition);
                const newMarking = Object.fromEntries(Object.entries(netCopy.places).map(([p, place]) => [p, place.marking]));

                // Se o novo estado não foi visitado, ou é o estado inicial, adicione-o à lista
                if (!visitedMarkings.has(JSON.stringify(newMarking)) || JSON.stringify(newMarking) === JSON.stringify(initialState)) {
                    allMarkings.push(newMarking);
                }
            }
        }

        console.log("A rede de Petri é reversível.");
        return true;
    }

    runSingleIteration() {
        let maxRequiredTokens = this.getMaxRequiredTokens();
        const fireableTransitions = this.fireableTransitions();

        if (fireableTransitions.length === 0) {
            console.log("A rede de Petri é limitada em k =", maxRequiredTokens);
            return maxRequiredTokens;
        }

        const randomTransition = fireableTransitions[Math.floor(Math.random() * fireableTransitions.length)];
        this.fireTransition(randomTransition);

        // Atualizar maxRequiredTokens com o maior número de tokens requeridos atual
        maxRequiredTokens = Math.max(maxRequiredTokens, this.getMaxRequiredTokens());

        console.log("A rede é limitada a K = ", maxRequiredTokens);
        return maxRequiredTokens;
    }

    getMaxRequiredTokens() {
        // Retorna o maior número de tokens requeridos por transição
        return Math.max(...this.transitions.map(transition =>
            Math.max(...Object.values(transition.inputPlaces))
        ));
    }
    
}

function reachabilityTree(net, currentState, visitedStates = new Set()) {
    const currentStateTuple = Object.entries(currentState);
    if (visitedStates.has(JSON.stringify(currentStateTuple)) || net.isDeadlock()) {
        return [[currentState, "Deadlock"]];
    }

    visitedStates.add(JSON.stringify(currentStateTuple));
    const reachableStates = [];
    const fireableTransitions = net.fireableTransitions();

    for (const transition of fireableTransitions) {
        const netCopy = new PetriNet(
            Object.values(net.places).map(place => new Place(place.name, place.marking)),
            net.transitions
        );
        netCopy.fireTransition(transition);
        const newState = Object.fromEntries(Object.entries(netCopy.places).map(([p, place]) => [p, place.marking]));
        reachableStates.push(...reachabilityTree(netCopy, newState, visitedStates));
    }

    return [[currentState, ...fireableTransitions], ...reachableStates];
}


/*function interpretReachabilityTree(treeData) {
    class Node {
        constructor(state) {
          this.state = state;
          this.children = [];
        }
    }
      
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
  
    for (const nodeData of treeData) {
      if (nodeData.length === 1 && nodeData[0] === 'Deadlock') {
        continue; // Skip Deadlock nodes
      }
  
      const parentNode = new Node(nodeData[0]);
  
      if (nodeData.length > 1) {
        for (let i = 1; i < nodeData.length; i++) {
          const transitionData = nodeData[i];
          const childState = applyTransition(parentNode.state, transitionData);
          const childNode = new Node(childState);
          parentNode.children.push(childNode);
        }
      }
  
      nodes.push(parentNode);
    }
  
    return nodes;
  }
  
  function printTree(root) {
    console.log(`Node: ${JSON.stringify(root.state)}`);
  
    for (const child of root.children) {
      printTree(child);
    }
}*/


function interpretReachabilityTree(treeData) {
    class Node {
        constructor(state) {
            this.state = state;
            this.children = [];
        }
    }

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

    const createNode = (nodeData) => {
        const parentNode = new Node(nodeData[0]);

        if (nodeData.length > 1 && nodeData[1] !== 'Deadlock') {
            for (let i = 1; i < nodeData.length; i++) {
                const transitionData = nodeData[i];
                const childState = applyTransition(parentNode.state, transitionData);
                const childNode = new Node(childState);
                parentNode.children.push(childNode);
                createNode(transitionData); // Recursivamente cria os filhos do nó filho
            }
        }

        return parentNode;
    };

    for (const nodeData of treeData) {
        nodes.push(createNode(nodeData));
    }

    return nodes;
}




function printTree(root, isParent = true) {
    if (isParent) {
      console.log(`Node (Parent): ${JSON.stringify(root.state)}`);
    } else {
      console.log(`   Child: ${JSON.stringify(root.state)}`);
    }
  
    for (const child of root.children) {
      printTree(child, false);
    }
  }

// Defining the Petri net
/*const places = [new Place("P1", 1), new Place("P2"), new Place("P3"), new Place("P4"), new Place("P5")];
const transitions = [
    new Transition({ "P1": 1 }, { "P2": 1, "P3": 2 }),
    new Transition({ "P2": 1 }, { "P4": 1 }),
    new Transition({ "P3": 1 }, { "P4": 1 }),
    new Transition({ "P3": 2 }, { "P5": 1 }),
    new Transition({ "P5": 1 }, { "P3": 2 }),
    new Transition({ "P4": 3 }, { "P1": 1 }),
];*/


const places = [new Place("P1", 1), new Place("P2"), new Place("P3"), new Place("P4")];
const transitions = [
    new Transition({ "P1": 1 }, { "P2": 1, "P3": 1 }),
    new Transition({ "P2": 1 }, { "P4": 1 }),
    new Transition({ "P3": 1 }, { "P4": 1 }),
    new Transition({ "P4": 2 }, { "P1": 1 }),
];

const petriNet = new PetriNet(places, transitions);
const initialState = Object.fromEntries(places.map(place => [place.name, place.marking])); // Initial marking

const tree = reachabilityTree(petriNet, initialState);

// Displaying the reachability tree
for (const node of tree) {
    console.log(node);
}

// Exibindo se a rede é segura
petriNet.isSafe();
petriNet.isConservative();
petriNet.isReversible();
petriNet.runSingleIteration();

const interpretedTree = interpretReachabilityTree(tree);

console.log("Interpreted Reachability Tree:");
for (const root of interpretedTree) {
  printTree(root);
}