class PetriNet {
    places: number[];
    transitions: number[][];
  
    constructor(initialMarking: number[]) {
      this.places = initialMarking;
      this.transitions = [];
    }
  
    addTransition(input: number[], output: number[]) {
      this.transitions.push({ input, output });
    }
  
    isMarkingEqualTo(marking: number[]) {
      return this.places.every((p, i) => p === marking[i]);
    }
  }
  
  class ReachabilityTree {
    root: TreeNode;
    petriNet: PetriNet;
  
    constructor(petriNet: PetriNet) {
      this.petriNet = petriNet;
      this.root = new TreeNode(petriNet.places);
    }
  
    generateReachabilityTree() {
      const queue: TreeNode[] = [this.root];
      const visited: Set<string> = new Set();
  
      while (queue.length > 0) {
        const node = queue.shift()!;
        visited.add(node.hash());
  
        for (const transition of this.petriNet.transitions) {
          const newMarking = this.fireTransition(node.marking, transition);
  
          if (!visited.has(newMarking.join(','))) {
            const child = new TreeNode(newMarking);
            node.children.push(child);
            queue.push(child);
          }
        }
      }
    }
  
    fireTransition(currentMarking: number[], transition: number[]) {
      const newMarking = currentMarking.slice();
  
      for (let i = 0; i < currentMarking.length; i++) {
        newMarking[i] += transition.output[i] - transition.input[i];
      }
  
      return newMarking;
    }
  }
  
  class TreeNode {
    marking: number[];
    children: TreeNode[];
  
    constructor(marking: number[]) {
      this.marking = marking;
      this.children = [];
    }
  
    hash() {
      return this.marking.join(',');
    }
  }
  
  // Example usage:
  const initialMarking = [1, 0, 0];
  const petriNet = new PetriNet(initialMarking);
  petriNet.addTransition([1, 0, 0], [0, 1, 0]);
  petriNet.addTransition([0, 1, 0], [0, 0, 1]);
  
  const reachabilityTree = new ReachabilityTree(petriNet);
  reachabilityTree.generateReachabilityTree();