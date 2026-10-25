import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  AgvDirectionEnum,
  RoomDirectionEnum,
  type AgvCommandPayload,
  type HospitalMap,
  type MapSide,
} from '../types/types';
import { socketIO } from '../socketIO/socketIO';

export const useAgvStore = defineStore('agv', () => {
  const currentSquareIndex = ref<number>(0);
  const currentRoomId = ref<string | null>(null);
  const lastDirectionSent = ref<AgvDirectionEnum>(AgvDirectionEnum.AGV_FORWARD);
  const maps = ref<HospitalMap>()
  const squareCounter = ref<number>()
  const colorR = ref<number>()
  const colorG = ref<number>()
  const colorB = ref<number>()
  const goingBack = ref<boolean>(false)
  
  async function getMaps() {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/maps`, {
      method: 'GET',
      //headers: { 'Content-Type': 'application/json' },
    });
    maps.value = await response.json();
  }
  
  const isAtBase = computed<boolean>(() => currentSquareIndex.value === 0);
  
  function calculateCommandToRoom(
    targetSquareIndex: number,
    mapSide: MapSide
  ): AgvCommandPayload {

    console.log('targetSquareIndex -> ', targetSquareIndex);
    console.log('mapSide -> ', mapSide);
    console.log('currentSquareIndex.value -> ', currentSquareIndex.value);
    

    const delta = targetSquareIndex - currentSquareIndex.value;

    if (delta === 0) {
      throw new Error('O AGV já se encontra na bifurcação desta sala.');
    }

    const agvDirection: AgvDirectionEnum =
      delta > 0 ? AgvDirectionEnum.AGV_FORWARD : AgvDirectionEnum.AGV_BACKWARDS;

    const roomSquareCounter: number = Math.abs(delta);

    const roomDirection: RoomDirectionEnum =
      mapSide === 'RIGHT' ? RoomDirectionEnum.RIGHT_ROOM : RoomDirectionEnum.LEFT_ROOM;

    lastDirectionSent.value = agvDirection;

    return {
      agvDirection,
      roomSquareCounter,
      roomDirection,
    };
  }

  function onBlueSquarePassed(): void {
    if (lastDirectionSent.value === AgvDirectionEnum.AGV_FORWARD) {
      if(goingBack.value){
        currentSquareIndex.value--;
      } else{
        currentSquareIndex.value++;
      }
    } else if (
      lastDirectionSent.value === AgvDirectionEnum.AGV_BACKWARDS &&
      currentSquareIndex.value > 0
    ) {
      currentSquareIndex.value--;
    }
    console.log('currentSquareIndex.value --> ', currentSquareIndex.value);
    
  }

  function resetState(): void {
    goingBack.value = false;
    currentSquareIndex.value = 0;
    currentRoomId.value = null;
    squareCounter.value = undefined;
    lastDirectionSent.value = AgvDirectionEnum.AGV_FORWARD;
  }

  socketIO.on('atBase', resetState);
  socketIO.on('goingBack', () =>{
    goingBack.value = true
  });

  socketIO.on('squarePassed', (data) => {  
    squareCounter.value = data.index
    onBlueSquarePassed();
  });
  socketIO.on('R', (data) => {
    colorR.value = data.color;
  });
  socketIO.on('G', (data) => {
    colorG.value = data.color;
  });
  socketIO.on('B', (data) => {
    colorB.value = data.color;
  });

  return {
    maps,
    getMaps,
    currentSquareIndex,
    currentRoomId,
    isAtBase,
    calculateCommandToRoom,
    onBlueSquarePassed,
    resetState,
    squareCounter,
    colorR,
    colorG,
    colorB
  };
});