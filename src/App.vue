<template>
  <div class="editor-wrapper">
    <!-- Barra de Ferramentas -->
    <div class="toolbar">
      <button
        @click="isEditMode = !isEditMode"
        :class="['btn', isEditMode ? 'btn-active' : 'btn-primary']"
      >
        {{ isEditMode ? 'Modo Operação (Enviar AGV)' : 'Modo Edição (Mexer no Mapa)' }}
      </button>

      <button v-if="isEditMode" @click="addBlueSquare" class="btn btn-success">
        + Adicionar Quadrado Azul
      </button>

      <button v-if="isEditMode" @click="removeLastSquare" class="btn btn-danger">
        - Remover Último
      </button>

      <button v-if="isEditMode" @click="saveMapToMongo" class="btn btn-purple">
        Salvar Mapa
      </button>

      <div class="status-badge">
        Posição Atual do AGV: <strong>Quadrado {{ agvStore.currentSquareIndex }}</strong>
      </div>
    </div>

    <div class="debug">
      <p>R: {{agvStore.colorR}}</p> <p>Square counter: {{agvStore.quareCounter}}</p>
      <p>G: {{agvStore.colorG}} </p>
      <p>B: {{agvStore.colorB}}</p>
    </div>

    <!-- Canvas SVG -->
    <svg
      v-if="agvStore.maps"
      ref="svgRef"
      class="map-canvas"
      @mousemove="onDrag"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
    >
      <!-- Linhas do Corredor Principal -->
      <line
        v-for="(sq, idx) in agvStore.maps.blueSquares"
        :key="'corridor-' + sq.index"
        :x1="idx === 0 ? agvStore.maps?.basePosition.x : agvStore.maps?.blueSquares[idx - 1].x"
        :y1="idx === 0 ? agvStore.maps?.basePosition.y : agvStore.maps?.blueSquares[idx - 1].y"
        :x2="sq.x"
        :y2="sq.y"
        stroke="#475569"
        stroke-width="8"
        stroke-linecap="round"
      />

      <!-- Linhas das Bifurcações (Quadrado Azul -> Salas) -->
      <template v-for="sq in agvStore.maps?.blueSquares" :key="'branch-' + sq.index">
        <line
          v-if="sq.rooms.left"
          :x1="sq.x"
          :y1="sq.y"
          :x2="sq.rooms.left.x"
          :y2="sq.rooms.left.y"
          stroke="#334155"
          stroke-width="4"
          stroke-dasharray="6"
        />
        <line
          v-if="sq.rooms.right"
          :x1="sq.x"
          :y1="sq.y"
          :x2="sq.rooms.right.x"
          :y2="sq.rooms.right.y"
          stroke="#334155"
          stroke-width="4"
          stroke-dasharray="6"
        />
      </template>

      <!-- Base Inicial (Índice 0) -->
    <g @mousedown="startDrag(agvStore.maps.basePosition)" :class="isEditMode ? 'draggable' : ''">
        <circle
          :cx="agvStore.maps.basePosition.x"
          :cy="agvStore.maps.basePosition.y"
          r="26"
          fill="#0f172a"
          stroke="#10b981"
          stroke-width="3"
        />
        <text
          :x="agvStore.maps.basePosition.x"
          :y="agvStore.maps.basePosition.y + 4"
          fill="#10b981"
          text-anchor="middle"
          font-size="12"
          font-weight="bold"
        >
          BASE
        </text>
      </g>

      <template v-for="sq in agvStore.maps.blueSquares" :key="'rooms-' + sq.index">
        <g
          v-if="sq.rooms.left"
          @mousedown="startDrag(sq.rooms.left)"
          @click="!isEditMode && dispatchAGV(sq.index, 'LEFT', sq.rooms.left)"
          @dblclick="isEditMode && renameRoom(sq.rooms.left)"
          class='clickable'
        >
          <rect
            :x="sq.rooms.left.x - 50"
            :y="sq.rooms.left.y - 25"
            width="100"
            height="50"
            rx="8"
            fill="#1e293b"
            stroke="#38bdf8"
            stroke-width="2"
          />
          <text
            :x="sq.rooms.left.x"
            :y="sq.rooms.left.y + 5"
            fill="#f8fafc"
            text-anchor="middle"
            font-size="13"
            font-weight="500"
          >
            {{ sq.rooms.left.name }}
          </text>
        </g>

        <g
          v-if="sq.rooms.right"
          @mousedown="startDrag(sq.rooms.right)"
          @click="!isEditMode && dispatchAGV(sq.index, 'RIGHT', sq.rooms.right)"
          @dblclick="isEditMode && renameRoom(sq.rooms.right)"
          class='clickable'
        >
          <rect
            :x="sq.rooms.right.x - 50"
            :y="sq.rooms.right.y - 25"
            width="100"
            height="50"
            rx="8"
            fill="#1e293b"
            stroke="#38bdf8"
            stroke-width="2"
          />
          <text
            :x="sq.rooms.right.x"
            :y="sq.rooms.right.y + 5"
            fill="#f8fafc"
            text-anchor="middle"
            font-size="13"
            font-weight="500"
          >
            {{ sq.rooms.right.name }}
          </text>
        </g>
      </template>

      <g
        v-for="sq in agvStore.maps.blueSquares"
        :key="'sq-' + sq.index"
        @mousedown="startDrag(sq)"
        :class="isEditMode ? 'draggable' : ''"
      >
        <rect
          :x="sq.x - 18"
          :y="sq.y - 18"
          width="36"
          height="36"
          rx="6"
          fill="#2563eb"
          stroke="#93c5fd"
          stroke-width="2"
        />
        <text
          :x="sq.x"
          :y="sq.y + 5"
          fill="white"
          text-anchor="middle"
          font-size="13"
          font-weight="bold"
        >
          {{ sq.index }}
        </text>
      </g>

      <circle
        :cx="agvCoordinates?.x"
        :cy="agvCoordinates?.y"
        r="12"
        fill="#f59e0b"
        stroke="#fef3c7"
        stroke-width="3"
        class="agv-marker"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useAgvStore } from './stores/useAgvStore';
import type {
  HospitalMap,
  Position2D,
  RoomNode,
  MapSide,
  AgvCommandPayload,
  BlueSquareNode,
} from './types/types';

const agvStore = useAgvStore();

const isEditMode = ref<boolean>(false);
const svgRef = ref<SVGSVGElement | null>(null);

 /* reactive<HospitalMap>({
  name: 'Ala Principal',
  isActive: true,
  basePosition: { x: 100, y: 300 },
  blueSquares: [
    {
      index: 1,
      x: 300,
      y: 300,
      rooms: {
        left: { id: 'room_rx', name: 'Raio-X', x: 300, y: 130 },
        right: { id: 'room_tr', name: 'Triagem', x: 300, y: 470 },
      },
    },
    {
      index: 2,
      x: 520,
      y: 300,
      rooms: {
        left: { id: 'room_uti', name: 'UTI 01', x: 520, y: 130 },
        right: { id: 'room_far', name: 'Farmácia', x: 520, y: 470 },
      },
    },
  ],
}); */

const agvCoordinates = computed<Position2D>(() => {
  if (!agvStore.maps) return { x: 0, y: 0 };
  
  if (agvStore.currentSquareIndex === 0) {
    return agvStore.maps.basePosition;
  }
  
  const currentSquare = agvStore.maps.blueSquares.find(
    (sq: BlueSquareNode) => sq.index === agvStore.currentSquareIndex
  );
  
  return currentSquare
    ? { x: currentSquare.x, y: currentSquare.y }
    : agvStore.maps.basePosition;
});

type DraggableNode = Position2D | BlueSquareNode | RoomNode;

const draggedItem = ref<DraggableNode | null>(null);

function startDrag(item: DraggableNode): void {
  if (!isEditMode.value) return;
  draggedItem.value = item;
}

function onDrag(event: MouseEvent): void {
  const item = draggedItem.value;
  if (!item || !isEditMode.value || !svgRef.value) return;

  const svgRect = svgRef.value.getBoundingClientRect();
  const mouseX = Math.round(event.clientX - svgRect.left);
  const mouseY = Math.round(event.clientY - svgRect.top);

  if ('rooms' in item) {
    const deltaX = mouseX - item.x;
    item.x = mouseX;

    if (item.rooms.left) item.rooms.left.x += deltaX;
    if (item.rooms.right) item.rooms.right.x += deltaX;
  } 
  else if ('id' in item) {
    item.y = mouseY;
  } 
  else {
    item.x = mouseX;
  }
}

function stopDrag(): void {
  draggedItem.value = null;
}

function renameRoom(room: RoomNode): void {
  const newName = prompt('Novo nome da sala:', room.name);
  if (newName && newName.trim() !== '') {
    room.name = newName.trim();
  }
}

function addBlueSquare(): void {
  if (!agvStore.maps) return;

  const squares = agvStore.maps.blueSquares;
  const nextIndex = squares.length > 0 ? squares[squares.length - 1].index + 1 : 1;
  
  const lastSquare = squares.length > 0 ? squares[squares.length - 1] : null;
  
  const baseX = lastSquare ? lastSquare.x : agvStore.maps.basePosition.x;
  const baseY = lastSquare ? lastSquare.y : agvStore.maps.basePosition.y;

  squares.push({
    index: nextIndex,
    x: baseX + 200,
    y: baseY,
    rooms: {
      left: {
        id: `room_L_${nextIndex}`,
        name: `Sala E${nextIndex}`,
        x: baseX + 200,
        y: baseY - 170,
      },
      right: {
        id: `room_R_${nextIndex}`,
        name: `Sala D${nextIndex}`,
        x: baseX + 200,
        y: baseY + 170,
      },
    },
  });
}

function removeLastSquare(): void {
  if (agvStore.maps?.blueSquares.length ?? 0 > 0) {
    agvStore.maps?.blueSquares.pop();
  }
}

async function dispatchAGV(
  targetSquareIndex: number,
  side: MapSide,
  room: RoomNode
): Promise<void> {
  try {
    const payload: AgvCommandPayload = agvStore.calculateCommandToRoom(
      targetSquareIndex,
      side
    );
    agvStore.currentRoomId = room.id;

    console.log(`Enviando AGV para ${room.name} -> Payload MQTT:`, payload);

    await fetch(`${import.meta.env.VITE_API_URL}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof Error) {
      alert(error.message);
    }
  }
}

async function saveMapToMongo(): Promise<void> {
  console.log('JSON.stringify(mapData) -> ',JSON.stringify(agvStore.maps));
  
  await fetch(`${import.meta.env.VITE_API_URL}/api/maps`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agvStore.maps),
  });
}

onMounted(async() => {
  await agvStore.getMaps()

   if(agvStore.maps){
    console.log('agvStore.maps -> ', agvStore.maps);
    
   }
  
})
</script>

<style scoped>
.editor-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  width: 100vw;
  height: 100vh;
  box-sizing: border-box;
  background-color: #0b0f19;
  color: #f8fafc;
  font-family: system-ui, -apple-system, sans-serif;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  color: white;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.9;
}

.btn-primary { background-color: #2563eb; }
.btn-active  { background-color: #d97706; }
.btn-success { background-color: #059669; }
.btn-danger  { background-color: #dc2626; }
.btn-purple  { background-color: #7c3aed; }

.status-badge {
  margin-left: auto;
  font-size: 14px;
  background-color: #1e293b;
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid #334155;
}

.map-canvas {
  width: 100%;
  flex: 1;
  min-height: 550px;
  background-color: #0f172a;
  border: 1px solid #334155;
  border-radius: 10px;
  user-select: none;
}

.draggable {
  cursor: grab;
}

.draggable:active {
  cursor: grabbing;
}

.clickable {
  cursor: pointer;
}

.clickable:hover rect {
  stroke: #7dd3fc;
  fill: #334155;
}

.agv-marker {
  transition: all 0.4s ease;
  pointer-events: none;
}

.debug{
  display: flex;
  flex-direction: column;
}
</style>