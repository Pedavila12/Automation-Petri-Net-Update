class PetriNet {
    constructor(initialMarking) {
      this.places = initialMarking;
      this.transitions = [];
    }
  
    addTransition(input, output) {
      this.transitions.push({ input, output });
    }
  
    isMarkingEqualTo(marking) {
      return this.places.every((p, i) => p === marking[i]);
    }
  }
  
  class ReachabilityTree {
    constructor(petriNet) {
      this.petriNet = petriNet;
      this.root = new TreeNode(petriNet.places);
    }
  
    generateReachabilityTree() {
      const queue = [this.root];
      const visited = new Set();
  
      while (queue.length > 0) {
        const node = queue.shift();
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
  
    fireTransition(currentMarking, transition) {
      const newMarking = [...currentMarking];
  
      for (let i = 0; i < currentMarking.length; i++) {
        newMarking[i] += transition.output[i] - transition.input[i];
      }
  
      return newMarking;
    }
  }
  
  class TreeNode {
    constructor(marking) {
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

  console.log(reachabilityTree.generateReachabilityTree());
  
  // You can now explore the reachability tree to analyze the Petri net.