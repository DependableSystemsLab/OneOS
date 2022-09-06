import path from 'path';

class Node {
  constructor(node) {
    this.id = node.pid;
    this.script = node.script;
    if (node.in_edges.length == 0) {
      this.type = 'input';
    } else if (node.out_edges.length == 0) {
      this.type = 'output';
    } else {
      this.type = 'default';
    }
    this.agent = this.script ? this.getAgent() : null;
    this.name = this.generateName();
  }

  getAgent() {
    const ext = path.extname(this.script);
    if (ext == '.js') {
      return 'es6';
    } else if (ext == '.py') {
      return 'py3';
    } else {
      return 'unknown';
    }
  }

  generateName() {
    if (Node.inputCount === undefined) {
      Node.inputCount = -1;
    }

    if (Node.outputCount === undefined) {
      Node.outputCount = -1;
    }

    if (this.type == 'input') {
      Node.inputCount += 1;
      return `input${Node.inputCount}`;
    } else if (this.type == 'output') {
      Node.outputCount += 1;
      return `output${Node.outputCount}`;
    } else {
      return this.id;
    }
  }

  generateDeclaration() {
    return `node ${this.name} = agent('${this.getAgent()}', '${this.script}')`;
  }
}

class Edge {
  constructor(startNode, endNode) {
    if (Edge.count === undefined) {
      Edge.count = 0;
    }

    Edge.count += 1;
    this.id = `e${Edge.count}`;
    this.startNode = startNode;
    this.endNode = endNode;
  }

  generateDeclaration() {
    return `edge ${this.id} = ${this.startNode.name} -> ${this.endNode.name}`;
  }
}


function generateNodes(nodes) {
  return nodes.map((node) => new Node(node));
}

function generateEdges(nodes, edges) {
  const nodeMap = {};

  nodes.forEach((node) => {
    nodeMap[node.id] = node;
  });

  return edges.map((edge) => new Edge(nodeMap[edge.sender], nodeMap[edge.receiver]));
}

export const parse = (data) => {
  const nodes = generateNodes(data.nodes);
  const edges = generateEdges(nodes, data.edges);
  let outScript = '';
  let inputCount = -1;
  let outputCount = -1;

  outScript += `graph ${data['name']} {
    ${nodes.map((node) => node.generateDeclaration()).join('\n\t')}
    
    ${nodes.filter((node)=> node.type === 'input').map((node)=>{
        inputCount++;
        return `in:${inputCount} -> ${node.name}`
    }).join('\n\t')}
    ${edges.map((edge) => edge.generateDeclaration()).join('\n\t')}
    ${nodes.filter((node)=> node.type === 'output').map((node)=>{
      outputCount++;
      return `${node.name} -> out:${outputCount}`
  }).join('\n\t')}
}`
  return outScript;
}