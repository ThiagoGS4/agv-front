export const RoomDirectionEnum = {
  RIGHT_ROOM: 0,
  LEFT_ROOM: 1,
} as const;

export const AgvDirectionEnum = {
  AGV_FORWARD: 0,
  AGV_BACKWARDS: 1,
} as const;

export type MapSide = 'LEFT' | 'RIGHT';

export interface Position2D {
  x: number;
  y: number;
}

export interface RoomNode extends Position2D {
  id: string;
  name: string;
}

export interface BlueSquareNode extends Position2D {
  index: number;
  rooms: {
    left: RoomNode | null;
    right: RoomNode | null;
  };
}

export interface HospitalMap {
  _id?: string;
  name: string;
  isActive: boolean;
  basePosition: Position2D;
  blueSquares: BlueSquareNode[];
}

export interface AgvCommandPayload {
  agvDirection: AgvDirectionEnum;
  roomSquareCounter: number;
  roomDirection: RoomDirectionEnum;
}

export type AgvDirectionEnum = typeof AgvDirectionEnum[keyof typeof AgvDirectionEnum];
export type RoomDirectionEnum = typeof RoomDirectionEnum[keyof typeof RoomDirectionEnum];
