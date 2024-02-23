import { generateTree } from '/static/js/TreeGenerator.js';
//import { generateTree } from '/static/js/TreeGenerator.js';

//console.log(places);
//const { places, transitions } = generateTree();

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

/*class Transition {
  constructor(inputPlaces, outputPlaces, isTest = false, id) {
    this.inputPlaces = inputPlaces;
    this.outputPlaces = outputPlaces;
    this.isTest = isTest;
    this.id = id;
  }
  toString() {
    return `T${JSON.stringify(this.id)}`;
  }
}*/

function teste(testnet) {

    class PetriNet {
        constructor(places, transitions) {
            this.places = {};
            places.forEach((place) => {
                this.places[place.name] = new Place(place.name, place.marking);
            });
            this.transitions = transitions;
        }

        fireableTransitions() {
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

        isSafe() {
            const allMarkings = [
                Object.fromEntries(
                    Object.entries(this.places).map(([p, place]) => [
                        p,
                        place.marking,
                    ])
                ),
            ];
            const visitedMarkings = new Set();

            while (allMarkings.length > 0) {
                const currentMarking = allMarkings.pop();

                if (visitedMarkings.has(JSON.stringify(currentMarking))) {
                    continue;
                }

                visitedMarkings.add(JSON.stringify(currentMarking));

                const fireableTransitions = this.transitions.filter((transition) =>
                    Object.keys(transition.inputPlaces).every(
                        (place) =>
                            currentMarking[place] >= transition.inputPlaces[place]
                    )
                );

                if (fireableTransitions.length === 0) {
                    console.log("A rede de Petri não é segura. Deadlock encontrado.");
                    return false;
                }

                for (const transition of fireableTransitions) {
                    const netCopy = new PetriNet(
                        Object.values(this.places).map(
                            (place) => new Place(place.name, currentMarking[place])
                        ),
                        this.transitions
                    );
                    netCopy.fireTransition(transition);
                    const newMarking = Object.fromEntries(
                        Object.entries(netCopy.places).map(([p, place]) => [
                            p,
                            place.marking,
                        ])
                    );

                    allMarkings.push(newMarking);
                }
            }

            console.log("A rede de Petri é segura.");
            return true;
        }


        //Verificar se a rede de petri é conservativa 

        isConservative() {
            const conservationEquations = [];

            for (const placeName in this.places) {
                const conservationCoefficients = this.transitions.map(
                    (transition) =>
                        (transition.outputPlaces[placeName] || 0) -
                        (transition.inputPlaces[placeName] || 0)
                );

                const equation = {
                    coefficients: conservationCoefficients,
                    constant: this.places[placeName].marking,
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
            const augmentedMatrix = equations.map((eq) => [
                ...eq.coefficients,
                eq.constant,
            ]);

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
                solution.unshift(
                    (augmentedMatrix[i][augmentedMatrix[i].length - 1] - sum) /
                    augmentedMatrix[i][i]
                );
            }

            // Verificando se o sistema tem solução única
            return solution.every((value) => !isNaN(value) && isFinite(value));
        }

        //Verificar se a rede de petri é reversivel

        isReversible() {
            const initialState = Object.fromEntries(
                Object.entries(this.places).map(([p, place]) => [p, place.marking])
            );
            const allMarkings = [initialState];
            const visitedMarkings = new Set();

            while (allMarkings.length > 0) {
                const currentMarking = allMarkings.pop();

                if (visitedMarkings.has(JSON.stringify(currentMarking))) {
                    continue;
                }

                visitedMarkings.add(JSON.stringify(currentMarking));

                const fireableTransitions = this.transitions.filter((transition) =>
                    Object.keys(transition.inputPlaces).every(
                        (place) =>
                            currentMarking[place] >= transition.inputPlaces[place]
                    )
                );

                for (const transition of fireableTransitions) {
                    const netCopy = new PetriNet(
                        Object.values(this.places).map(
                            (place) => new Place(place.name, currentMarking[place])
                        ),
                        this.transitions
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

        //Verificar a limitação da rede de petri

        runSingleIteration() {
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
            const netCopy = new PetriNet(
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
        class IdGenerator {
            constructor() {
                this.counter = 0;
                this.stateToIdMap = new Map();
            }

            getIdForState(state) {
                const stateString = JSON.stringify(state);

                if (!this.stateToIdMap.has(stateString)) {
                    const markings = state && typeof state === 'object' ? Object.values(state) : [];
                    console.log(markings)
                    const id = `M${this.counter++} {${markings}}`;
                    this.stateToIdMap.set(stateString, id);
                }
                return this.stateToIdMap.get(stateString);
            }
            /*
           getIdForState(state) {
             const markingArray = Object.values(state.marking).map(place => place.marking);
             const stateString = JSON.stringify(markingArray);
     
             if (!this.stateToIdMap.has(stateString)) {
               const id = `M${this.counter++}`;
               this.stateToIdMap.set(stateString, id);
             }
             return this.stateToIdMap.get(stateString);
           }*/

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
        const idGenerator = new IdGenerator();

        const createNode = (nodeData, parentTransition) => {
            const state = nodeData[0];
            const transition = parentTransition || null;
            const isTested = transition ? transition.isTest : false;
            const isInhibited = transition ? transition.isInhibitor : false;
            const id = idGenerator.getIdForState(state);
            const parentNode = new Node(state, transition, isTested, isInhibited, id);

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

        for (const nodeData of treeData) {
            nodes.push(createNode(nodeData));
        }

        return nodes;
    }

    function printTree(root, isParent = true) {
        if (isParent) {
            console.log(`Node (Parent): ${JSON.stringify(root.state)}`);
        } else {
            console.log(
                `   Child: ${JSON.stringify(
                    root.state
                )} - Transition: ${JSON.stringify(root.transition)}`
            );
        }

        for (const child of root.children) {
            printTree(child, false);
        }
    }

    // Defining the Petri net
    /*const places = [
        new Place("P1", 1),
        new Place("P2"),
        new Place("P3"),
        new Place("P4"),
        new Place("P5"),
    ];
    const transitions = [
        new Transition({ P1: 1 }, { P2: 1, P3: 2 }, false, 1),
        new Transition({ P2: 1 }, { P4: 1 }, false, 2),
        new Transition({ P3: 1 }, { P4: 1 }, false, 3),
        new Transition({ P3: 2 }, { P5: 1 }, false, 4),
        new Transition({ P5: 1 }, { P3: 2 }, false, 5),
        new Transition({ P4: 3 }, { P1: 1 }, false, 6),
    ];*/
    /*
    const places = [
        new Place("P1", 1),
        new Place("P2"),
        new Place("P3"),
        new Place("P4"),
      ];
      const transitions = [
        new Transition({ P1: 1 }, { P2: 1, P3: 1 }, false, 1),
        new Transition({ P2: 1 }, { P4: 1 }, false, 2),
        new Transition({ P3: 1 }, { P4: 1 }, false, 3),
        new Transition({ P4: 2 }, { P1: 1 }, false, 4),
      ];*/
    /*const places = [
        new Place("P1", 1),
        new Place("P2"),
        new Place("P3"),
        new Place("P4"),
      ];
      const transitions = [
        new Transition({ P1: 1 }, { P2: 1, P3: 1 }),
        new Transition({ P2: 1 }, { P4: 1 }),
        new Transition({ P3: 1 }, { P4: 1 }),
        new Transition({ P4: 2 }, { P1: 1 }),
      ];*/

    /*const places = [
      new Place("P1", 1),
      new Place("P2"),
      new Place("P3"),
      new Place("P4"),
      new Place("P5", 0, true), // Exemplo de lugar com arco inibidor
    ];
    const transitions = [
      new Transition({ P1: 1 }, { P2: 1, P3: 2 }),
      new Transition({ P2: 1 }, { P4: 1 }),
      new Transition({ P3: 1 }, { P4: 1 }),
      new Transition({ P3: 2 }, { P5: 1 }, true), // Exemplo de transição com arco de teste
      new Transition({ P5: 1 }, { P3: 2 }),
      new Transition({ P4: 3 }, { P1: 1 }),
    ];*/

    const places = testnet.places;
    const transitions = testnet.transitions;

    console.log(places)
    console.log(transitions)

    const petriNet = new PetriNet(places, transitions);
    const initialState = Object.fromEntries(
        places.map((place) => [place.name, place.marking])
    ); // Initial marking

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

    renderReachabilityTree(interpretedTree);

    function renderReachabilityTree(interpretedTree) {
        const width = 2000;
        const height = 2000;
        const margin = { top: 40, right: 20, bottom: 20, left: 20 };
        let angle = 0;

        // Criação do contêiner SVG para o gráfico
        const svg = d3
            .select("#tree-container")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const nodeMap = new Map(); // Mapeia os nós já plotados pelo estado (state)

        function renderTree(root, index) {
            // Configuração do layout da árvore
            const treeLayout = d3.tree().size([2000, 200]);

            // Criando a hierarquia da árvore
            const hierarchy = d3.hierarchy(root);

            // Aplicando o layout da árvore à hierarquia
            const treeData = treeLayout(hierarchy);

            // Adicionando os nós (círculos) da árvore
            const nodes = svg
                .selectAll(`.node-${index}`)
                .data(treeData.descendants())
                .enter()
                .filter((d) => d.data.state !== "Deadlock")
                .append("g")
                .attr("class", `node node-${index}`)
                .attr("transform", (d) => {
                    // Verifica se o nó já foi renderizado anteriormente e obtém a posição
                    const key = JSON.stringify(d.data.state);
                    const existingNode = nodeMap.get(key);
                    const hasChildren = d.children && d.children.length > 0;

                    if (existingNode && hasChildren) {
                        // Atualiza as coordenadas do nó existente
                        d.x = existingNode.x;
                        d.y = existingNode.y;
                    } else {
                        // Adiciona o deslocamento horizontal
                        //d.y += index * 200;

                        let distance = 200; // Distância fixa

                        // Ajusta as coordenadas em relação ao pai
                        if (d.parent && d.parent.children) {
                            const numberOfChildren = d.parent.children.length;
                            const angleOffset = 180 / (numberOfChildren + 1);
                            if (numberOfChildren >= 3) {
                                distance = distance * 3;
                            }
                            angle += (angleOffset * Math.PI) / 180;
                            d.x = d.parent.x + distance * Math.cos(angle);
                            d.y = d.parent.y + distance * Math.sin(angle);
                        }
                    }
                    nodeMap.set(key, d); // Mapeia o nó pelo estado (state)
                    return `translate(${d.x},${d.y})`;
                });
            // Mapear os nós pelo estado (state)
            treeData.descendants().forEach((d) => {
                const key = JSON.stringify(d.data.state);
                nodeMap.set(key, d);
            });
            // Adicionando círculos aos nós

            nodes

                .append("circle")
                .attr("r", 28)
                .style("stroke", "steelblue")
                .attr("cx", 0) // Define o centro do círculo
                .attr("cy", 0) // Define o centro do círculo
                .style("fill", "#fff")
                .style("stroke-width", "2px");
            /*.append("rect")
            .attr("width", 150) // Largura do retângulo
            .attr("height", 50) // Altura do retângulo
            .style("fill", "#858484")
            .style("stroke-width", "0px")
            .attr("x", -75)
            .attr("y", -25);*/

            // Adicionando etiquetas aos nós
            const textNodes = nodes
                .append("text")
                .attr("dy", 7.5)
                .attr("x", 0)
                .attr("y", 0)
                //.attr("x", (d) => (d.children ? -1 : 1) * 18)
                //.style("text-anchor", (d) => (d.children ? "end" : "start"))
                .style("text-anchor", "middle")
                .style("font-size", "25px")
                .style("fill", "#000")
                //.style("font-weight", "bold")
                .text((d) => {
                    // Verifica se o nó já foi renderizado anteriormente
                    const key = JSON.stringify(d.data.state);
                    const existingNode = nodeMap.get(key);
                    const hasChildren = d.children && d.children.length > 0;

                    // Adiciona o texto apenas se o nó não foi renderizado anteriormente
                    if (existingNode && hasChildren) {
                        return `${JSON.stringify(d.data.id)}`; // retorna o próprio nó
                        //return `M${index}`;

                    }

                    return "";

                });

            // Adicionando as arestas (linhas) entre os nós
            svg
                .append("defs")
                .append("marker")
                .attr("id", "arrowhead")
                .attr("viewBox", "-0 -5 10 10")
                .attr("refX", 18)
                .attr("refY", 0)
                .attr("orient", "auto")
                .attr("markerWidth", 10)
                .attr("markerHeight", 10)
                .attr("xoverflow", "visible")
                .append("svg:path")
                .attr("d", "M 0,-5 L 10 ,0 L 0,5")
                .attr("fill", "#000")
                .style("stroke", "none");

            const linkGroups = svg
                .selectAll(`.link-${index}`)
                .data(treeData.links())
                .enter()
                .filter(
                    (d) =>
                        d.source.data.state !== "Deadlock" &&
                        d.target.data.state !== "Deadlock" // Filtra links com nós "Deadlock"
                )
                .append("g")
                .attr("class", `link link-${index}`);

            // Adiciona a linha ao grupo
            linkGroups
                .append("line")
                .attr("x1", (d) => {
                    const sourceKey = JSON.stringify(d.source.data.state);
                    const sourceNode = nodeMap.get(sourceKey);
                    return sourceNode ? sourceNode.x : d.x;
                })
                .attr("y1", (d) => d.source.y + 30)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y)
                .style("stroke-width", 3) // Defina a largura da linha como 3 (ou o valor desejado)
                .attr("marker-end", "url(#arrowhead)"); // Adiciona a seta ao final do link

            // Adiciona o texto ao grupo
            linkGroups
                .append("text")
                .attr("x", (d) => (d.source.x + d.target.x) / 2)
                .attr("y", (d) => (d.source.y + d.target.y) / 2)
                .attr("dy", -10)
                .attr("dx", (d) => {
                    if ((angle * (180 / Math.PI)) == 90) {
                        console.log((angle * (180 / Math.PI)))
                        return d.x = 20
                    }
                })
                .style("text-anchor", "middle")
                .style("font-size", "25px")
                .style("fill", "#000")
                .text(
                    (d) =>
                        d.target.data.transition ? d.target.data.transition : ""

                );

           /* function isDeadlock(state) {
                // Verifica se o estado está em Deadlock com base na informação reachableStates
                return reachableStates.some((reachableState) => {
                    return (
                        reachableState.includes(state) &&
                        reachableState.includes("Deadlock")
                    );
                });
            }*/
        }

        // Exemplo de uso
        interpretedTree.forEach((root, index) => {
            renderTree(root, index);
            angle = 0;
        });

        console.log("Node Map:", nodeMap); // Exibir o mapa de nós para verificação
    }
}
export {teste}