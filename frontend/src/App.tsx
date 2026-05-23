import './App.css';
import { useGraph } from './hooks/useGraph';
import Canvas   from './components/Canvas';
import Toolbar  from './components/Toolbar';
import Sidebar  from './components/Sidebar';
import ViewTabs from './components/ViewTabs';

export default function App() {
  const {
    nodes, visibleNodes, visibleEdges,
    onNodesChange, onEdgesChange, onConnect,
    selectedNode, selectedEdge,
    addBlock, deleteSelected,
    updateNodeLabel, updateEdgeArrow, toggleNodeVisibility,
    diagramLineType, setDiagramLineType,
    filterMode, setFilterMode,
    views, activeViewId,
    switchView, addView, renameView, deleteView,
    reconnectAllEdges,
    handleSave, loadGraph,
  } = useGraph();

  return (
    <div className="app">
      <Toolbar
        onAddBlock={addBlock}
        onDelete={deleteSelected}
        onSave={handleSave}
        onLoad={loadGraph}
        onReconnectEdges={reconnectAllEdges}
      />
      <ViewTabs
        views={views}
        activeViewId={activeViewId}
        onSwitch={switchView}
        onAdd={addView}
        onRename={renameView}
        onDelete={deleteView}
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
          diagramLineType={diagramLineType}
          onFilterModeChange={setFilterMode}
          onLabelChange={updateNodeLabel}
          onArrowChange={updateEdgeArrow}
          onDiagramLineTypeChange={setDiagramLineType}
          onToggleVisibility={toggleNodeVisibility}
        />
      </div>
    </div>
  );
}
