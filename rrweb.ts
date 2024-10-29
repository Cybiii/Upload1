import { EventType, incrementalData, IncrementalSource} from "./index";
import file from "./data.json";

interface Noded {
  id: number;
  childNodes?: Noded[];
}

interface SnapshotData {
  subnode?: Noded;
  href?: string;
  initialOffset?: {
    left: number;
    top: number;
  };
}

interface Snapshot {
  windowId: string;
  type?: EventType;
  data: SnapshotData;
  timestamp: number;
  seen?: number;
  delay?: number;
}

const snapshots: Snapshot[] = file.data.snapshots || [];
const timestart = snapshots[0].timestamp;
let window = snapshots[0].windowId;

function convertMsToTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  return `${formattedMinutes}:${formattedSeconds}`;
}

function handleEvent(snapshot: Snapshot | undefined) {
  if (!snapshot) {
    console.log("No snapshot detected");
    return;
  }

  switch (snapshot.type) {
    case EventType.DomContentLoaded:
      console.log("DOM content loaded");
      DOMLoadData(snapshot.data as unknown);
      break;

    case EventType.Load:
      console.log("Page load");
      PageloadData(snapshot.data as unknown);
      break;

    case EventType.FullSnapshot:
      console.log("Full snapshot");
      FullSnapshotData(snapshot.data as any);
      break;

    case EventType.IncrementalSnapshot:
      console.log("Incremental snapshot");
      IncrementalData(snapshot.data as incrementalData);
      break;

    case EventType.Meta:
      console.log("Meta event");
      MetaEventData(
        snapshot.data as { href: string; width: number; height: number }
      );
      break;

    case EventType.Custom:
      console.log("Custom event");
      CustomEventData(snapshot.data as { tag: string; payload: unknown });
      break;

    case EventType.Plugin:
      console.log("Plugin event");
      break;

    default:
      console.log("Unknown event");
  }
}

function DOMLoadData(data: unknown) {
  console.log("DOM Load Data:", data);
}

function PageloadData(data: unknown) {
  console.log("Page Load Data:", data);
}

function FullSnapshotData(data: {
  subnode: Noded;
  initialOffset: { top: number; left: number };
}) {
    return;
}

function IncrementalData(data: incrementalData) {
  switch (data.source) {
    case IncrementalSource.Mutation:
      console.log("Mutation");

      break;
    case IncrementalSource.MouseMove:
      console.log("Mouse Move Data source:", data.source);
      break;
    case IncrementalSource.MouseInteraction:
      console.log("Mouse Interaction Data id:", data.id);
      break;
    case IncrementalSource.Scroll:
      console.log("Scroll Data:", data);
      break;
    case IncrementalSource.ViewportResize:
      console.log("Viewport Resize Data:", data);
      break;
    case IncrementalSource.Input:
      console.log("Input Data:", data);
      break;
    case IncrementalSource.TouchMove:
      console.log("Touch Move Data:", data);
      break;
    case IncrementalSource.MediaInteraction:
      console.log("Media Interaction Data:", data);
      break;
    case IncrementalSource.StyleSheetRule:
      console.log("Style Sheet Rule", data.id);
      break;
    case IncrementalSource.CanvasMutation:
      console.log("Canvas Mutation Data:", data);
      break;
    case IncrementalSource.Font:
      console.log("Font Data:", data);
      break;
    case IncrementalSource.Drag:
      console.log("Drag Data:", data);
      break;
    case IncrementalSource.StyleDeclaration:
      console.log("Style Declaration Data:", data);
      break;
    case IncrementalSource.AdoptedStyleSheet:
      console.log("Adopted Style Sheet Data:", data);
      break;
    default:
      console.log("Unknown Incremental Data Source");
  }
}

function MetaEventData(data: { href: string }) {
  console.log("Redirected to Link");
}

function CustomEventData(data: { tag: string; payload: unknown }) {
  console.log("Tag:", data.tag);
}

function PluginEventData(data: { plugin: string; payload: unknown }) {
  console.log("Plugin Event Data:");
  console.log("Plugin:", data.plugin);
}

// Process snapshots
snapshots.forEach((snapshot) => {

  
    console.log(`Timestamp: ${convertMsToTime(snapshot.timestamp - timestart)}`);
  handleEvent(snapshot);

  if (snapshot.windowId !== window) {
    window = snapshot.windowId;
    console.log(`URL visited ${window}`);
  }
  console.log(``);
});
