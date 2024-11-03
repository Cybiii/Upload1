import React, { useState, useRef, useEffect } from 'react';
import { EventType, incrementalData, IncrementalSource } from "../../index";

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
  node?: Noded;
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

interface StepsChatProps {
  steps: Snapshot[];
}

const StepsChat: React.FC<StepsChatProps> = ({ steps }) => {
  const [eventSummaries, setEventSummaries] = useState<EventSummary[]>([]);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (steps.length === 0) return;

    const timestart = steps[0]?.timestamp || 0;
    let windowId = steps[0]?.windowId || '';
    const summaries: EventSummary[] = [];

    for (let i = 0; i < steps.length; i++) {
      const snapshot = steps[i];
      const relativeTimestamp = snapshot.timestamp - timestart;

      // Handle URL changes
      if (snapshot.windowId !== windowId) {
        windowId = snapshot.windowId;
        summaries.push({
          type: "URL Visited",
          timestampStart: relativeTimestamp,
          details: { url: snapshot.data.href || "Unknown URL" },
        });
      }

      handleEvent(snapshot, relativeTimestamp, summaries);
    }

    setEventSummaries(summaries);
  }, [steps]);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [eventSummaries]);

  const formatTimestamp = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const formattedSeconds = seconds.toString().padStart(2, "0");
    return `${formattedMinutes}:${formattedSeconds}`;
  };

  const limitDataSize = (data: any, maxLength = 200): any => {
    if (typeof data === "string") {
      return data.length > maxLength ? data.substring(0, maxLength) + "..." : data;
    } else if (Array.isArray(data)) {
      return data.slice(0, 3).map((item) => limitDataSize(item, maxLength));
    } else if (typeof data === "object" && data !== null) {
      const limitedData: any = {};
      let count = 0;
      for (const key in data) {
        if (count >= 3) {
          limitedData["..."] = "...";
          break;
        }
        limitedData[key] = limitDataSize(data[key], maxLength);
        count++;
      }
      return limitedData;
    } else {
      return data;
    }
  };

  const handleEvent = (
    snapshot: Snapshot,
    relativeTimestamp: number,
    summaries: EventSummary[]
  ) => {
    if (!snapshot) return;

    switch (snapshot.type) {
      case EventType.DomContentLoaded:
        summaries.push({
          type: "DOM Content Loaded",
          timestampStart: relativeTimestamp,
        });
        break;

      case EventType.Load:
        summaries.push({
          type: "Page Load",
          timestampStart: relativeTimestamp,
        });
        break;

      case EventType.FullSnapshot:
        summaries.push({
          type: "Full Snapshot",
          timestampStart: relativeTimestamp,
        });
        break;

      case EventType.IncrementalSnapshot:
        handleIncrementalData(snapshot.data as incrementalData, relativeTimestamp, summaries);
        break;

      case EventType.Meta:
        summaries.push({
          type: "Meta Event",
          timestampStart: relativeTimestamp,
          details: limitDataSize(snapshot.data),
        });
        break;

      case EventType.Custom:
        summaries.push({
          type: "Custom Event",
          timestampStart: relativeTimestamp,
          details: limitDataSize(snapshot.data),
        });
        break;

      case EventType.Plugin:
        summaries.push({
          type: "Plugin Event",
          timestampStart: relativeTimestamp,
          details: limitDataSize(snapshot.data),
        });
        break;

      default:
        summaries.push({
          type: "Unknown Event",
          timestampStart: relativeTimestamp,
        });
    }
  };

  const handleIncrementalData = (
    data: incrementalData,
    relativeTimestamp: number,
    summaries: EventSummary[]
  ) => {
    const lastEvent = summaries[summaries.length - 1];

    switch (data.source) {
      case IncrementalSource.Mutation:
        summaries.push({
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
          summaries.push({
            type: "Mouse Movement",
            timestampStart: relativeTimestamp,
          });
        }
        break;

      case IncrementalSource.MouseInteraction:
        summaries.push({
          type: "Mouse Interaction",
          timestampStart: relativeTimestamp,
          details: limitDataSize({ elementId: data.id, interactionType: data.type }),
        });
        break;

      case IncrementalSource.Scroll:
        if (lastEvent && lastEvent.type === "Scroll") {
          lastEvent.timestampEnd = relativeTimestamp;
        } else {
          summaries.push({
            type: "Scroll",
            timestampStart: relativeTimestamp,
          });
        }
        break;

      case IncrementalSource.ViewportResize:
        summaries.push({
          type: "Viewport Resize",
          timestampStart: relativeTimestamp,
          details: limitDataSize(data),
        });
        break;

      case IncrementalSource.Input:
        summaries.push({
          type: "Text Input",
          timestampStart: relativeTimestamp,
          details: limitDataSize(data),
        });
        break;

      default:
        summaries.push({
          type: "Other Incremental Event",
          timestampStart: relativeTimestamp,
          details: limitDataSize({ source: data.source, ...data }),
        });
    }
  };

  return (
    <div className="flex justify-center items-start space-x-4 mx-auto">
      <div className="relative bg-blue-300 p-4 rounded-lg shadow-lg w-full max-w-3xl m-4">
        <h2 className="text-2xl font-semibold mb-4">Steps Instructions</h2>
        <div className="max-h-96 overflow-y-auto" ref={chatContainerRef}>
          <ul className="space-y-4">
            {eventSummaries.map((event, index) => {
              const startTime = formatTimestamp(event.timestampStart);
              const endTime = event.timestampEnd
                ? formatTimestamp(event.timestampEnd)
                : null;

              return (
                <li
                  key={index}
                  className="p-4 bg-white rounded-lg shadow hover:bg-gray-100 transition"
                  style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                >
                  <div className="flex flex-wrap justify-between items-center">
                    <span className="font-bold">
                      Timestamp: {startTime}
                      {endTime ? ` - ${endTime}` : ''}
                    </span>
                    <div className="bg-gray-200 rounded p-2 mt-2 sm:mt-0 sm:ml-4 hover:bg-gray-300 transition">
                      <span className="text-gray-700">{event.type}</span>
                    </div>
                  </div>
                  {event.details && (
                    <div className="mt-2">
                      {Object.entries(event.details).map(([key, value], idx) => (
                        <div
                          key={idx}
                          className="text-sm text-gray-600 break-words overflow-hidden text-ellipsis"
                          style={{ maxWidth: '100%' }}
                        >
                          <strong>{`${key.charAt(0).toUpperCase() + key.slice(1)}:`}</strong>{" "}
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : value}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StepsChat;
