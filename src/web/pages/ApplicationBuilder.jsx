import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
} from 'react-flow-renderer';
import { Button } from 'semantic-ui-react';
import OneOSService from '../services/OneOSService.jsx';
import Swal from 'sweetalert2'

import Sidebar from '../components/Sidebar';

import '../styles/index.css';
import { transform } from '../utils/transform.jsx';
import {parse} from '../utils/interpreter.jsx';


const initialNodes = [
    {
        id: '1',
        type: 'input',
        data: { label: 'input node' },
        position: { x: 250, y: 5 },
        style: { backgroundColor: "#eee" },
    },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

const ApplicationBuilder = ({ sys }) => {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [graphName, setGraphName] = useState('');

    const [nodeName, setNodeName] = useState("");
    const [nodeBg, setNodeBg] = useState('#eee');
    const [nodePath, setNodePath] =useState("");

    const [selectedNode, setSelectNode] = useState(null);

    async function saveFile() {

        if (graphName === '') {

            Swal.fire(
                'Error',
                'Please enter a name for the graph',
                'error',
            )
            return;
        }
            Swal.fire(
                'Filed saved!',
                `Please go to the file system tab to view the file: ${graphName}`,
                'success'
            )

            const graph =  await transform(graphName, nodes, edges);
            const osh = await parse(graph);
            sys.writeFileSystem("/applications", {
                type: 'file',
                name: graphName+".osh",
                content: osh
            }).then((result) => {
                // console.log(result);
            })
        }

        function onNodesSelected(node) {
            if (node) {
                setNodeName(node.data.label);
                setNodeBg(node.style.backgroundColor);
                if(node.data.script != undefined){
                    setNodePath(node.data.script);
                }else{
                    setNodePath("");
                }
                setSelectNode(node);
            }
        }

        function changeNodeName(name) {
            if (selectedNode) {
                setNodeName(name);
            }
        }

        function changeBgColor(color) {
            if (selectedNode) {
                setNodeBg(color);
            }
        }
        
        function changeNodePath(path){
            if(selectedNode){
                setNodePath(path);
            }
        }

        useEffect(() => {
            setNodes((nds) =>
                nds.map((node) => {
                    if (selectedNode != null && node.id === selectedNode.id) {
                        node.data = {
                            ...node.data,
                            label: nodeName,
                        };
                    }

                    return node;
                })
            );
        }, [nodeName, setNodes]);

        useEffect(() => {
            setNodes((nds) =>
                nds.map((node) => {
                    if (selectedNode != null && node.id === selectedNode.id) {
                        node.data = {
                            ...node.data,
                            script: nodePath,
                        };
                    }

                    return node;
                })
            );
        }, [nodePath, setNodes]);

        useEffect(() => {
            setNodes((nds) =>
                nds.map((node) => {
                    if (selectedNode != null && node.id === selectedNode.id) {
                        node.style = { ...node.style, backgroundColor: nodeBg };
                    }

                    return node;
                })
            );
        }, [nodeBg, setNodes]);

        const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

        const onDragOver = useCallback((event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
        }, []);

        const onDrop = useCallback(
            (event) => {
                event.preventDefault();

                const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
                const type = event.dataTransfer.getData('application/reactflow');

                if (typeof type === 'undefined' || !type) {
                    return;
                }

                const position = reactFlowInstance.project({
                    x: event.clientX - reactFlowBounds.left,
                    y: event.clientY - reactFlowBounds.top,
                });
                const newNode = {
                    id: getId(),
                    type,
                    position,
                    data: { label: `${type} node` },
                    style: { backgroundColor: nodeBg },
                };

                setNodes((nds) => nds.concat(newNode));

            },
            [reactFlowInstance]
        );

        return (
            <div className="dndflow" style={{
                "display": "flex",
                "flexDirection": "row",
                paddingLeft: "2rem",
                paddingRight: "2rem"
            }}>
                <div style={{ "flex": 3 }}>
                    <ReactFlowProvider>
                        <div style={{ height: "80vh" }} ref={reactFlowWrapper}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onSelectionChange={({ nodes }) => onNodesSelected(nodes[0])}
                                onInit={setReactFlowInstance}
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                fitView
                            >
                                <Controls />
                            </ReactFlow>
                        </div>
                    </ReactFlowProvider>
                </div>
                <div style={{ flex: 1, borderLeft: "1px solid #ccc" }}>
                    <Sidebar nodes={nodes} edges={edges} graphName={graphName} />
                    <form class="ui form updatenode_controls" style={{ display: selectedNode ? "block" : "none" }}>
                        <h2>Customize the selected node</h2>

                        <div class="field">
                            <label>Label</label>
                            <input value={nodeName} onChange={(evt) => changeNodeName(evt.target.value)} />
                        </div>
                        <div class="field">
                            <label className="updatenode_bglabel">Background</label>
                            <input value={nodeBg} onChange={(evt) => changeBgColor(evt.target.value)} />
                        </div>
                        <div class="field">
                            <label className="updatenode_bglabel">File Path</label>
                            <input value={nodePath} onChange={(evt) => changeNodePath(evt.target.value)} />
                        </div>
                    </form>
                    <form class="ui form updatenode_controls" style={{ display: nodes ? "block" : "none" }}>
                        <h2>Save your graph to a file</h2>
                        <div class="field">
                            <label>Name</label>
                            <input placeholder='your_application' value={graphName} onChange={(evt) => setGraphName(evt.target.value)} />
                        </div>
                        <Button color='green' onClick={() => saveFile()}>Save</Button>
                    </form>
                </div>
            </div>
        );
    };


    export default (props) => (
        <OneOSService.Consumer>
            {
                (sys) => (<ApplicationBuilder {...props} sys={sys} />)
            }
        </OneOSService.Consumer>
    )