function Node(node) {
  this.name = node.data.label;
  this.agent = null;
  this.group = null;
  this.script = null;
  this.in_edges = [];
  this.out_edges = [];
  this.pid = node.id;
}
  
function Edge(edge) {
  this.sender = edge.source;
  this.receiver = edge.target;
  this.pipe = null;
  this.id = edge.id;
}
  
function Graph(name, nodes, edges) {
  this.name = name;
  this.edges = edges;
  this.nodes = nodes;
} 

module.exports.Node = Node;
module.exports.Edge = Edge;
module.exports.Graph = Graph;
