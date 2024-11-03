// src/types/events.ts

import { EventType } from "../../index";

export interface Noded {
  id: number;
  tagName?: string;
  attributes?: { [key: string]: string };
  childNodes?: Noded[];
  textContent?: string;
}

export interface SnapshotData {
  node?: Noded;
  href?: string;
  initialOffset?: {
    left: number;
    top: number;
  };
  text?: string;
  source?: number;
  id?: number;
  type?: number;
  x?: number;
  y?: number;
  adds?: any[];
  removes?: any[];
  [key: string]: any;
}

export interface Snapshot {
  windowId: string;
  type: EventType;
  data: SnapshotData;
  timestamp: number;
  delay?: number;
}

export interface EventSummary {
  type: string;
  timestampStart: number;
  timestampEnd?: number;
  details?: any;
  isTruncated?: boolean;
  fullDetails?: any;
  children?: EventSummary[];
}

export interface StepsChatProps {
  steps: Snapshot[];
}

export interface AddedNodeMutation {
  parentId: number;
  node: Noded;
}

export interface RemovedNodeMutation {
  id: number;
  parentId: number;
}