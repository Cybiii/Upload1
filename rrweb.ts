import { EventType, incrementalData, IncrementalSource } from "./index";
import file from "./data.json";

interface Noded {
  id: number;
  childNodes?: Noded[];
}

interface SnapshotData {
  node?: Noded;
  href?: string;
  initialOffset?: {
    left: number;
    top: number;
  };
  subnode?: Noded;
  [key: string]: any;
}

interface Snapshot {
  windowId: string;
  type?: EventType;
  data: SnapshotData;
  timestamp: number;
  seen?: number;
  delay?: number;
}

interface EventSummary {
  type: string;
  timestampStart: number;
  timestampEnd?: number;
  details?: any;
}

const snapshots: Snapshot[] = file.data.snapshots || [];
const timestart = snapshots[0].timestamp;
let windowId = snapshots[0].windowId;

const eventSummaries: EventSummary[] = [];

function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  return `${formattedMinutes}:${formattedSeconds}`;
}

// Process snapshots
for (let i = 0; i < snapshots.length; i++) {
  const snapshot = snapshots[i];
  const relativeTimestamp = snapshot.timestamp - timestart;

  console.log(`Timestamp: ${formatTimestamp(relativeTimestamp)}`);

  // Handle URL changes
  if (snapshot.windowId !== windowId) {
    windowId = snapshot.windowId;
    console.log(`URL visited ${windowId}`);
    eventSummaries.push({
      type: "URL Visited",
      timestampStart: relativeTimestamp,
      details: { url: snapshot.data.href || "Unknown URL" },
    });
  }

  handleEvent(snapshot, relativeTimestamp);
  console.log("");
}

function handleEvent(snapshot: Snapshot, relativeTimestamp: number) {
  if (!snapshot) {
    console.log("No snapshot detected");
    return;
  }

  switch (snapshot.type) {
    case EventType.DomContentLoaded:
      console.log("DOM content loaded");
      eventSummaries.push({
        type: "DOM Content Loaded",
        timestampStart: relativeTimestamp,
      });
      break;

    case EventType.Load:
      console.log("Page load");
      eventSummaries.push({
        type: "Page Load",
        timestampStart: relativeTimestamp,
      });
      break;

    case EventType.FullSnapshot:
      console.log("Full snapshot");
      eventSummaries.push({
        type: "Full Snapshot",
        timestampStart: relativeTimestamp,
      });
      break;

    case EventType.IncrementalSnapshot:
      console.log("Incremental snapshot");
      handleIncrementalData(snapshot.data as incrementalData, relativeTimestamp);
      break;

    case EventType.Meta:
      console.log("Meta event");
      eventSummaries.push({
        type: "Meta Event",
        timestampStart: relativeTimestamp,
        details: snapshot.data,
      });
      break;

    case EventType.Custom:
      console.log("Custom event");
      eventSummaries.push({
        type: "Custom Event",
        timestampStart: relativeTimestamp,
        details: snapshot.data,
      });
      break;

    case EventType.Plugin:
      console.log("Plugin event");
      eventSummaries.push({
        type: "Plugin Event",
        timestampStart: relativeTimestamp,
        details: snapshot.data,
      });
      break;

    default:
      console.log("Unknown event");
      eventSummaries.push({
        type: "Unknown Event",
        timestampStart: relativeTimestamp,
      });
  }
}

function handleIncrementalData(data: incrementalData, relativeTimestamp: number) {
  const lastEvent = eventSummaries[eventSummaries.length - 1];

  switch (data.source) {
    case IncrementalSource.Mutation:
      console.log("Mutation");
      eventSummaries.push({
        type: "DOM Mutation",
        timestampStart: relativeTimestamp,
        details: { ...data },
      });
      break;

    case IncrementalSource.MouseMove:
    case IncrementalSource.TouchMove:
      console.log("Mouse Move Data source:", data.source);
      if (lastEvent && lastEvent.type === "Mouse Movement") {
        lastEvent.timestampEnd = relativeTimestamp;
      } else {
        eventSummaries.push({
          type: "Mouse Movement",
          timestampStart: relativeTimestamp,
        });
      }
      break;

    case IncrementalSource.MouseInteraction:
      console.log("Mouse Interaction Data id:", data.id);
      eventSummaries.push({
        type: "Mouse Interaction",
        timestampStart: relativeTimestamp,
        details: { elementId: data.id, interactionType: data.type },
      });
      break;

    case IncrementalSource.Scroll:
      console.log("Scroll Data:", data);
      if (lastEvent && lastEvent.type === "Scroll") {
        lastEvent.timestampEnd = relativeTimestamp;
      } else {
        eventSummaries.push({
          type: "Scroll",
          timestampStart: relativeTimestamp,
        });
      }
      break;

    case IncrementalSource.ViewportResize:
      console.log("Viewport Resize Data:", data);
      eventSummaries.push({
        type: "Viewport Resize",
        timestampStart: relativeTimestamp,
        details: { ...data },
      });
      break;

    case IncrementalSource.Input:
      console.log("Input Data:", data);
      eventSummaries.push({
        type: "Text Input",
        timestampStart: relativeTimestamp,
        details: { ...data },
      });
      break;

    case IncrementalSource.MediaInteraction:
      console.log("Media Interaction Data:", data);
      eventSummaries.push({
        type: "Media Interaction",
        timestampStart: relativeTimestamp,
        details: { ...data },
      });
      break;

    case IncrementalSource.StyleSheetRule:
      console.log("Style Sheet Rule", data.id);
      eventSummaries.push({
        type: "Style Sheet Rule",
        timestampStart: relativeTimestamp,
        details: { ...data },
      });
      break;

    case IncrementalSource.CanvasMutation:
      console.log("Canvas Mutation Data:", data);
      eventSummaries.push({
        type: "Canvas Mutation",
        timestampStart: relativeTimestamp,
        details: { ...data },
      });
      break;

    case IncrementalSource.Font:
      console.log("Font Data:", data);
      eventSummaries.push({
        type: "Font",
        timestampStart: relativeTimestamp,
        details: { ...data },
      });
      break;

    case IncrementalSource.Drag:
      console.log("Drag Data:", data);
      eventSummaries.push({
        type: "Drag",
        timestampStart: relativeTimestamp,
        details: { ...data },
      });
      break;

    case IncrementalSource.StyleDeclaration:
      console.log("Style Declaration Data:", data);
      eventSummaries.push({
        type: "Style Declaration",
        timestampStart: relativeTimestamp,
        details: { ...data },
      });
      break;

    case IncrementalSource.AdoptedStyleSheet:
      console.log("Adopted Style Sheet Data:", data);
      eventSummaries.push({
        type: "Adopted Style Sheet",
        timestampStart: relativeTimestamp,
        details: { ...data },
      });
      break;

    default:
      console.log("Unknown Incremental Data Source");
      eventSummaries.push({
        type: "Unknown Incremental Event",
        timestampStart: relativeTimestamp,
        details: { source: data.source, ...data },
      });
  }
}

function outputEventSummary() {
  eventSummaries.forEach((event) => {
    const startTime = formatTimestamp(event.timestampStart);
    const endTime = event.timestampEnd
      ? formatTimestamp(event.timestampEnd)
      : null;

    if (event.type === "URL Visited") {
      console.log(`Timestamp: ${startTime}`);
      console.log(`URL Visited: ${event.details.url}`);
    } else if (endTime) {
      console.log(`Timestamp: ${startTime} - ${endTime}`);
      console.log(`${event.type}`);
    } else {
      console.log(`Timestamp: ${startTime}`);
      console.log(`${event.type}`);
    }

    if (event.details) {
      for (const [key, value] of Object.entries(event.details)) {
        console.log(
          `${key.charAt(0).toUpperCase() + key.slice(1)}: ${
            typeof value === "object" ? JSON.stringify(value) : value
          }`
        );
      }
    }
    console.log(""); // Add an empty line between events
  });
}

// After processing all snapshots, output the summarized events
outputEventSummary();
