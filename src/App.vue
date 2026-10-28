<template>
  <v-app class="bg-slate-50">
    <v-main class="d-flex flex-column h-screen pa-4 bg-slate-50">
      <v-sheet
        elevation="0"
        rounded="lg"
        class="toolbar-card px-5 py-3 mb-4 d-flex align-center flex-wrap ga-3"
      >
        <div class="d-flex align-center mr-2">
          <v-avatar color="blue-lighten-5" size="40" rounded="md" class="mr-3 border-blue">
            <v-icon icon="mdi-hospital-building" color="blue-darken-2" size="22"></v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold text-slate-900 lh-tight">
              {{ agvStore.maps?.name || 'Navegação Hospitalar AGV' }}
            </div>
            <div class="text-caption text-slate-500">
              Controle de Logística Interna
            </div>
          </div>
        </div>

        <v-divider vertical class="mx-2 my-1 d-none d-sm-flex"></v-divider>

        <v-btn
          @click="isEditMode = !isEditMode"
          :color="isEditMode ? 'amber-darken-3' : 'blue-darken-2'"
          variant="flat"
          :prepend-icon="isEditMode ? 'mdi-send-outline' : 'mdi-vector-square-edit'"
          class="text-none font-weight-bold px-4"
          rounded="md"
          height="40"
        >
          {{ isEditMode ? 'Modo Operação (Enviar AGV)' : 'Modo Edição (Mexer no Mapa)' }}
        </v-btn>

        <template v-if="isEditMode">
          <v-btn
            @click="addBlueSquare"
            color="emerald-darken"
            variant="tonal"
            prepend-icon="mdi-plus-box-outline"
            class="text-none font-weight-bold px-4 btn-emerald"
            rounded="md"
            height="40"
          >
            Adicionar Quadrado Azul
          </v-btn>

          <v-btn
            @click="removeLastSquare"
            color="red-darken-1"
            variant="tonal"
            prepend-icon="mdi-minus-box-outline"
            class="text-none font-weight-bold px-4"
            rounded="md"
            height="40"
          >
            Remover Último
          </v-btn>

          <v-btn
            @click="saveMapToMongo"
            color="indigo-darken-1"
            variant="flat"
            prepend-icon="mdi-content-save-outline"
            class="text-none font-weight-bold px-4"
            rounded="md"
            height="40"
          >
            Salvar Mapa
          </v-btn>
        </template>

        <v-spacer></v-spacer>

        <div class="d-flex align-center ga-2">
          <v-chip
            variant="flat"
            size="large"
            label
            class="font-weight-medium px-4 status-pill"
          >
            <v-icon start icon="mdi-car-outline" color="blue-darken-2" size="18" class="mr-2"></v-icon>
            <span class="text-slate-600">Posição Atual:</span>
            <strong class="ml-1 text-blue-darken-3">
              {{ agvStore.currentSquareIndex === 0 ? 'Base (0)' : `Quadrado ${agvStore.currentSquareIndex}` }}
            </strong>
          </v-chip>

          <v-menu location="bottom end" :close-on-content-click="false">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                icon="mdi-console"
                variant="outlined"
                size="small"
                class="debug-trigger"
                title="Telemetria MQTT"
              ></v-btn>
            </template>

            <v-card min-width="260" elevation="4" rounded="lg" class="pa-2 bg-white debug-card mt-1">
              <div class="text-caption font-weight-bold text-uppercase text-slate-500 px-3 pt-2 pb-1 d-flex align-center">
                <v-icon icon="mdi-access-point-network" size="16" class="mr-1"></v-icon>
                Telemetria MQTT (Debug)
              </div>
              <v-divider class="my-1"></v-divider>
              <v-list density="compact" class="py-0 bg-transparent">
                <v-list-item>
                  <v-list-item-title class="text-caption text-slate-600">
                    Na Base (isAtBase)
                  </v-list-item-title>
                  <template v-slot:append>
                    <span class="text-caption font-weight-bold text-slate-900">
                      {{ agvStore.isAtBase ? 'Sim' : 'Não' }}
                    </span>
                  </template>
                </v-list-item>

                <v-list-item>
                  <v-list-item-title class="text-caption text-slate-600">
                    Sala Destino (currentRoomId)
                  </v-list-item-title>
                  <template v-slot:append>
                    <span class="text-caption font-weight-bold text-slate-900">
                      {{ agvStore.currentRoomId ?? 'Nenhuma' }}
                    </span>
                  </template>
                </v-list-item>

                <v-list-item>
                  <v-list-item-title class="text-caption text-slate-600">
                    Contador (squareCounter)
                  </v-list-item-title>
                  <template v-slot:append>
                    <span class="text-caption font-weight-bold text-slate-900">
                      {{ agvStore.squareCounter ?? '-' }}
                    </span>
                  </template>
                </v-list-item>

                <v-list-item>
                  <v-list-item-title class="text-caption text-slate-600">
                    Sensor RGB
                  </v-list-item-title>
                  <template v-slot:append>
                    <div class="d-flex ga-1">
                      <v-chip size="x-small" color="red-darken-2" variant="tonal" class="font-weight-bold">
                        R: {{ agvStore.colorR ?? '-' }}
                      </v-chip>
                      <v-chip size="x-small" color="green-darken-2" variant="tonal" class="font-weight-bold">
                        G: {{ agvStore.colorG ?? '-' }}
                      </v-chip>
                      <v-chip size="x-small" color="blue-darken-2" variant="tonal" class="font-weight-bold">
                        B: {{ agvStore.colorB ?? '-' }}
                      </v-chip>
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>
        </div>
      </v-sheet>

      <v-sheet
        elevation="0"
        rounded="lg"
        class="map-container flex-grow-1 overflow-hidden position-relative bg-white d-flex"
      >
        <svg
          v-if="agvStore.maps"
          ref="svgRef"
          class="map-canvas"
          @mousemove="onDrag"
          @mouseup="stopDrag"
          @mouseleave="stopDrag"
        >
          <line
            v-for="(sq, idx) in agvStore.maps.blueSquares"
            :key="'corridor-' + sq.index"
            :x1="idx === 0 ? agvStore.maps?.basePosition.x : agvStore.maps?.blueSquares[idx - 1].x"
            :y1="idx === 0 ? agvStore.maps?.basePosition.y : agvStore.maps?.blueSquares[idx - 1].y"
            :x2="sq.x"
            :y2="sq.y"
            stroke="#cbd5e1"
            stroke-width="10"
            stroke-linecap="round"
          />

          <template v-for="sq in agvStore.maps?.blueSquares" :key="'branch-' + sq.index">
            <line
              v-if="sq.rooms.left"
              :x1="sq.x"
              :y1="sq.y"
              :x2="sq.rooms.left.x"
              :y2="sq.rooms.left.y"
              stroke="#94a3b8"
              stroke-width="3"
              stroke-dasharray="6,6"
            />
            <line
              v-if="sq.rooms.right"
              :x1="sq.x"
              :y1="sq.y"
              :x2="sq.rooms.right.x"
              :y2="sq.rooms.right.y"
              stroke="#94a3b8"
              stroke-width="3"
              stroke-dasharray="6,6"
            />
          </template>

          <g
            @mousedown="startDrag(agvStore.maps.basePosition)"
            :class="isEditMode ? 'draggable' : ''"
          >
            <circle
              :cx="agvStore.maps.basePosition.x"
              :cy="agvStore.maps.basePosition.y"
              r="28"
              fill="#ecfdf5"
              stroke="#10b981"
              stroke-width="3"
              class="node-shadow"
            />
            <text
              :x="agvStore.maps.basePosition.x"
              :y="agvStore.maps.basePosition.y + 4"
              fill="#047857"
              text-anchor="middle"
              font-size="11"
              font-weight="700"
              letter-spacing="0.5"
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
              :class="['room-node', isEditMode ? 'draggable' : 'clickable']"
            >
              <rect
                :x="sq.rooms.left.x - 56"
                :y="sq.rooms.left.y - 24"
                width="112"
                height="48"
                rx="10"
                fill="#ffffff"
                stroke="#cbd5e1"
                stroke-width="2"
                class="node-shadow room-rect"
              />
              <text
                :x="sq.rooms.left.x"
                :y="sq.rooms.left.y + 5"
                fill="#1e293b"
                text-anchor="middle"
                font-size="13"
                font-weight="600"
              >
                {{ sq.rooms.left.name }}
              </text>
            </g>

            <g
              v-if="sq.rooms.right"
              @mousedown="startDrag(sq.rooms.right)"
              @click="!isEditMode && dispatchAGV(sq.index, 'RIGHT', sq.rooms.right)"
              @dblclick="isEditMode && renameRoom(sq.rooms.right)"
              :class="['room-node', isEditMode ? 'draggable' : 'clickable']"
            >
              <rect
                :x="sq.rooms.right.x - 56"
                :y="sq.rooms.right.y - 24"
                width="112"
                height="48"
                rx="10"
                fill="#ffffff"
                stroke="#cbd5e1"
                stroke-width="2"
                class="node-shadow room-rect"
              />
              <text
                :x="sq.rooms.right.x"
                :y="sq.rooms.right.y + 5"
                fill="#1e293b"
                text-anchor="middle"
                font-size="13"
                font-weight="600"
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
              rx="8"
              fill="#2563eb"
              stroke="#ffffff"
              stroke-width="3"
              class="node-shadow"
            />
            <text
              :x="sq.x"
              :y="sq.y + 5"
              fill="#ffffff"
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
            r="13"
            fill="#f59e0b"
            stroke="#ffffff"
            stroke-width="3"
            class="agv-marker node-shadow"
          />
        </svg>
      </v-sheet>

      <v-dialog v-model="isRenameModalOpen" max-width="420">
        <v-card rounded="lg" elevation="8" class="pa-5 bg-white modal-card">
          <div class="d-flex align-center mb-4">
            <v-avatar color="blue-lighten-5" size="42" rounded="md" class="mr-3 border-blue">
              <v-icon icon="mdi-door-sliding-lock" color="blue-darken-2" size="22"></v-icon>
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold text-slate-900 lh-tight">
                Renomear Sala
              </div>
              <div class="text-caption text-slate-500">
                Defina a identificação deste setor no mapa
              </div>
            </div>
          </div>

          <v-text-field
            v-model="renameInputText"
            label="Nome da sala"
            placeholder="Ex: UTI 01, Farmácia, Raio-X"
            variant="outlined"
            density="comfortable"
            color="blue-darken-2"
            bg-color="#f8fafc"
            hide-details
            autofocus
            class="mb-5"
            @keyup.enter="confirmRenameRoom"
          ></v-text-field>

          <div class="d-flex justify-end ga-2">
            <v-btn
              variant="tonal"
              color="blue-grey-darken-1"
              class="text-none font-weight-bold px-4"
              rounded="md"
              height="38"
              @click="isRenameModalOpen = false"
            >
              Cancelar
            </v-btn>
            <v-btn
              variant="flat"
              color="blue-darken-2"
              class="text-none font-weight-bold px-5"
              rounded="md"
              height="38"
              @click="confirmRenameRoom"
            >
              Salvar Nome
            </v-btn>
          </div>
        </v-card>
      </v-dialog>

      <v-dialog v-model="isAlertModalOpen" max-width="400">
        <v-card rounded="lg" elevation="8" class="pa-5 bg-white modal-card">
          <div class="d-flex align-start mb-4">
            <v-avatar
              :color="alertModalType === 'error' ? 'red-lighten-5' : 'teal-lighten-5'"
              size="42"
              rounded="md"
              :class="['mr-3', alertModalType === 'error' ? 'border-red' : 'border-emerald']"
            >
              <v-icon
                :icon="alertModalType === 'error' ? 'mdi-alert-circle-outline' : 'mdi-check-circle-outline'"
                :color="alertModalType === 'error' ? 'red-darken-2' : 'teal-darken-2'"
                size="24"
              ></v-icon>
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold text-slate-900 lh-tight mb-1">
                {{ alertModalTitle }}
              </div>
              <div class="text-body-2 text-slate-600">
                {{ alertModalMessage }}
              </div>
            </div>
          </div>

          <div class="d-flex justify-end">
            <v-btn
              variant="flat"
              :color="alertModalType === 'error' ? 'red-darken-1' : 'teal-darken-1'"
              class="text-none font-weight-bold px-6"
              rounded="md"
              height="38"
              @click="isAlertModalOpen = false"
            >
              Entendido
            </v-btn>
          </div>
        </v-card>
      </v-dialog>
    </v-main>
  </v-app>
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

const isRenameModalOpen = ref<boolean>(false);
const selectedRoomForRename = ref<RoomNode | null>(null);
const renameInputText = ref<string>('');

const isAlertModalOpen = ref<boolean>(false);
const alertModalTitle = ref<string>('');
const alertModalMessage = ref<string>('');
const alertModalType = ref<'error' | 'success'>('error');

function openAlertModal(title: string, message: string, type: 'error' | 'success' = 'error'): void {
  alertModalTitle.value = title;
  alertModalMessage.value = message;
  alertModalType.value = type;
  isAlertModalOpen.value = true;
}

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
  selectedRoomForRename.value = room;
  renameInputText.value = room.name;
  isRenameModalOpen.value = true;
}

function confirmRenameRoom(): void {
  if (selectedRoomForRename.value && renameInputText.value.trim() !== '') {
    selectedRoomForRename.value.name = renameInputText.value.trim();
  }
  isRenameModalOpen.value = false;
  selectedRoomForRename.value = null;
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
      openAlertModal('Operação Inválida', error.message, 'error');
    }
  }
}

async function saveMapToMongo(): Promise<void> {
  console.log('JSON.stringify(mapData) -> ', JSON.stringify(agvStore.maps));
  
  try {
    await fetch(`${import.meta.env.VITE_API_URL}/api/maps`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agvStore.maps),
    });
    openAlertModal('Mapa Atualizado', 'As alterações de layout foram salvas com sucesso.', 'success');
  } catch (error) {
    openAlertModal('Erro ao Salvar', 'Não foi possível comunicar com o servidor para salvar o mapa.', 'error');
  }
}

onMounted(async() => {
  await agvStore.getMaps()

  if(agvStore.maps){
    console.log('agvStore.maps -> ', agvStore.maps);
  }
})
</script>

<style scoped>
.bg-slate-50 {
  background-color: #f8fafc !important;
}

.toolbar-card {
  background-color: #ffffff !important;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
}

.map-container {
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
}

.modal-card {
  border: 1px solid #e2e8f0;
}

.border-blue {
  border: 1px solid #dbeafe;
}

.border-red {
  border: 1px solid #fee2e2;
}

.border-emerald {
  border: 1px solid #d1fae5;
}

.btn-emerald {
  color: #059669 !important;
}

.text-slate-900 {
  color: #0f172a;
}

.text-slate-600 {
  color: #475569;
}

.text-slate-500 {
  color: #64748b;
}

.lh-tight {
  line-height: 1.2;
}

.status-pill {
  background-color: #f1f5f9 !important;
  border: 1px solid #e2e8f0;
}

.debug-trigger {
  border-color: #e2e8f0 !important;
  color: #64748b !important;
  background-color: #f8fafc;
}

.debug-card {
  border: 1px solid #e2e8f0;
}

.map-canvas {
  width: 100%;
  height: 100%;
  min-height: 550px;
  background-color: #ffffff;
  background-image: radial-gradient(#cbd5e1 1.5px, transparent 1.5px);
  background-size: 24px 24px;
  user-select: none;
}

.node-shadow {
  filter: drop-shadow(0 2px 5px rgba(15, 23, 42, 0.08));
}

.room-rect {
  transition: stroke 0.2s ease, fill 0.2s ease, filter 0.2s ease;
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

.clickable:hover .room-rect {
  stroke: #2563eb;
  fill: #f8fafc;
  filter: drop-shadow(0 4px 8px rgba(37, 99, 235, 0.15));
}

.agv-marker {
  transition: all 0.4s ease;
  pointer-events: none;
}
</style>