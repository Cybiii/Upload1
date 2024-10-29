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

// Utility function to limit data size
function limitDataSize(data: any, maxLength = 1000): any {
  if (typeof data === "string") {
    return data.length > maxLength ? data.substring(0, maxLength) + "..." : data;
  } else if (Array.isArray(data)) {
    return data.slice(0, 10).map((item) => limitDataSize(item, maxLength));
  } else if (typeof data === "object" && data !== null) {
    const limitedData: any = {};
    let count = 0;
    for (const key in data) {
      if (count >= 10) {
        limitedData["..."] = "Truncated additional properties";
        break;
      }
      limitedData[key] = limitDataSize(data[key], maxLength);
      count++;
    }
    return limitedData;
  } else {
    return data;
  }
}

// Process snapshots
for (let i = 0; i < snapshots.length; i++) {
  const snapshot = snapshots[i];
  const relativeTimestamp = snapshot.timestamp - timestart;

  // Handle URL changes
  if (snapshot.windowId !== windowId) {
    windowId = snapshot.windowId;
    eventSummaries.push({
      type: "URL Visited",
      timestampStart: relativeTimestamp,
      details: { url: snapshot.data.href || "Unknown URL" },
    });
  }

  handleEvent(snapshot, relativeTimestamp);
}

function handleEvent(snapshot: Snapshot, relativeTimestamp: number) {
  if (!snapshot) {
    console.log("No snapshot detected");
    return;
  }

  switch (snapshot.type) {
    case EventType.DomContentLoaded:
      eventSummaries.push({
        type: "DOM Content Loaded",
        timestampStart: relativeTimestamp,
      });
      break;

    case EventType.Load:
      eventSummaries.push({
        type: "Page Load",
        timestampStart: relativeTimestamp,
      });
      break;

    case EventType.FullSnapshot:
      eventSummaries.push({
        type: "Full Snapshot",
        timestampStart: relativeTimestamp,
      });
      break;

    case EventType.IncrementalSnapshot:
      handleIncrementalData(snapshot.data as incrementalData, relativeTimestamp);
      break;

    case EventType.Meta:
      eventSummaries.push({
        type: "Meta Event",
        timestampStart: relativeTimestamp,
        details: limitDataSize(snapshot.data),
      });
      break;

    case EventType.Custom:
      eventSummaries.push({
        type: "Custom Event",
        timestampStart: relativeTimestamp,
        details: limitDataSize(snapshot.data),
      });
      break;

    case EventType.Plugin:
      eventSummaries.push({
        type: "Plugin Event",
        timestampStart: relativeTimestamp,
        details: limitDataSize(snapshot.data),
      });
      break;

    default:
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
      eventSummaries.push({
        type: "DOM Mutation",
        timestampStart: relativeTimestamp,
        details: limitDataSize(data),
      });
      break;

    case IncrementalSource.MouseMove:
    case IncrementalSource.TouchMove:
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
      eventSummaries.push({
        type: "Mouse Interaction",
        timestampStart: relativeTimestamp,
        details: limitDataSize({ elementId: data.id, interactionType: data.type }),
      });
      break;

    case IncrementalSource.Scroll:
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
      eventSummaries.push({
        type: "Viewport Resize",
        timestampStart: relativeTimestamp,
        details: limitDataSize(data),
      });
      break;

    case IncrementalSource.Input:
      eventSummaries.push({
        type: "Text Input",
        timestampStart: relativeTimestamp,
        details: limitDataSize(data),
      });
      break;

    // Add more cases as needed for other event types

    default:
      eventSummaries.push({
        type: "Other Incremental Event",
        timestampStart: relativeTimestamp,
        details: limitDataSize({ source: data.source, ...data }),
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
