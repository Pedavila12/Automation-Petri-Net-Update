class PetriNet {
  constructor(places, transitions, initialMarking) {
    this.places = places;
    this.transitions = transitions;
    this.marking = { ...initialMarking };
  }

  fireTransition(transition) {
    // Verifique se a transição pode ser disparada
    if (Object.keys(transition).every(place => this.marking[place] >= transition[place])) {
      // Atualize a marcação após disparar a transição
      for (const place in transition) {
        this.marking[place] -= transition[place];
      }
      return true;
    } else {
      return false;
    }
  }

  isReachable(targetMarking) {
    // Verifique se a marcação alvo é alcançável a partir da marcação atual
    return Object.keys(targetMarking).every(place => this.marking[place] >= targetMarking[place]);
  }
}

function generateReachabilityTree(petriNet, targetMarking) {
  const root = { marking: { ...petriNet.marking }, children: [] };
  const visited = new Set();
  const queue = [root];

  while (queue.length > 0) {
    const node = queue.shift();
    const markingKey = Object.entries(node.marking).toString();
    if (!visited.has(markingKey)) {
      visited.add(markingKey);

      for (const transition of petriNet.transitions) {
        const newMarking = { ...node.marking };
        if (petriNet.fireTransition(transition)) {
          const newNode = { marking: { ...newMarking }, children: [] };
          node.children.push(newNode);
          queue.push(newNode);
        }
      }
    }
  }

  return root;
}

// Exemplo de uso:
const places = ["P1", "P2"];
const transitions = [{ P1: 1 }, { P2: 1 }];
const initialMarking = { P1: 1, P2: 0 };
const petriNet = new PetriNet(places, transitions, initialMarking);
const targetMarking = { P1: 0, P2: 1 };

const reachabilityTree = generateReachabilityTree(petriNet, targetMarking);

console.log(JSON.stringify(reachabilityTree, null, 2)); // Exibe a árvore de alcançabilidade
