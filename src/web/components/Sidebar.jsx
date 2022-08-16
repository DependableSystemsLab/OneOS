import React from 'react';
import { Button } from 'semantic-ui-react';
import OneOSService from '../services/OneOSService.jsx';
import Swal from 'sweetalert2'

const Sidebar = ({ nodes, edges, graphName }) => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };



  return (
    <div className="sidebar">
      <h2 className="description">You can drag these nodes to the pane on the left.</h2>
      <div className="dndnode input" onDragStart={(event) => onDragStart(event, 'input')} draggable>
        Input Node
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'default')} draggable>
        Default Node
      </div>
      <div className="dndnode output" onDragStart={(event) => onDragStart(event, 'output')} draggable>
        Output Node
      </div>
    </div>
  );
};
export default Sidebar;