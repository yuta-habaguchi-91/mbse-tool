import './App.css';
import { useGraph } from './hooks/useGraph';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';

export default function App() {
  const {
    nodes, visibleNodes, visibleEdges,
    onNodesChange, onEdgesChange, onConnect,
    selectedNode, selectedEdge,
    addBlock, deleteSelected,
    updateNodeLabel, updateEdgeArrow, toggleNodeVisibility,
    filterMode, setFilterMode,
    handleSave, loadGraph,
  } = useGraph();

  return (
    <div className="app">
      <Toolbar
        onAddBlock={addBlock}
        onDelete={deleteSelected}
        onSave={handleSave}
        onLoad={loadGraph}
      />
      <div className="app-main">
        <div className="canvas-wrapper">
          <Canvas
            nodes={visibleNodes}
            edges={visibleEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
          />
        </div>
        <Sidebar
          nodes={nodes}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          onLabelChange={updateNodeLabel}
          onArrowChange={updateEdgeArrow}
          onToggleVisibility={toggleNodeVisibility}
        />
      </div>
    </div>
  );
}
