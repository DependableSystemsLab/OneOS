import {Node, Edge, Graph} from './structures'; 

export const transform = async (name, nodes, edges) =>{
    var allNodes = [];
    var allEdges = [];

    await nodes.map((node) => {
        var newNode = new Node(node);
        allNodes.push(newNode);
    })

    await edges.map((edge)=>{
        var newEdge = new Edge(edge);
        allEdges.push(newEdge);
        allNodes.map((node) => {
            if (node.pid === newEdge.sender) {
               node.out_edges.push(newEdge);
            }
            if (node.pid === newEdge.receiver) {
               node.in_edges.push(newEdge);
            }
        })
    })

    if(allNodes.length > 0){
        var graph = new Graph(name, allNodes, allEdges);
    }

    return graph;
}