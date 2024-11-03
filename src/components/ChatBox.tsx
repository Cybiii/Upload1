import React, { useState, useRef, useEffect } from 'react';
import { EventType, incrementalData, IncrementalSource } from "../../index";

interface Noded {
  id: number;
  tagName?: string;
  attributes?: { [key: string]: string };
  childNodes?: Noded[];
  textContent?: string;
}

interface SnapshotData {
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

interface Snapshot {
  windowId: string;
  type: EventType;
  data: SnapshotData;
  timestamp: number;
  delay?: number;
}

interface EventSummary {
  type: string;
  timestampStart: number;
  timestampEnd?: number;
  details?: any;
  children?: EventSummary[];
}

interface StepsChatProps {
  steps: Snapshot[];
}

const StepsChat: React.FC<StepsChatProps> = ({ steps }) => {
  const [eventSummaries, setEventSummaries] = useState<EventSummary[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (steps.length === 0) return;

    const timestart = steps[0]?.timestamp || 0;
    let mouseMovementStarted = false;
    const summaries: EventSummary[] = [];

    for (let i = 0; i < steps.length; i++) {
      const snapshot = steps[i];
      const relativeTimestamp = snapshot.timestamp - timestart;

      // Handle page navigations
      if (snapshot.type === EventType.Meta && snapshot.data.href) {
        summaries.push({
          type: "Page Navigation",
          timestampStart: relativeTimestamp,
          details: { url: snapshot.data.href },
        });
      }

      // Handle other events
      handleEvent(snapshot, relativeTimestamp, summaries);

      // Track mouse movements as a single event
      if (
        snapshot.type === EventType.IncrementalSnapshot &&
        (snapshot.data.source === IncrementalSource.MouseMove ||
          snapshot.data.source === IncrementalSource.TouchMove)
      ) {
        if (!mouseMovementStarted) {
          mouseMovementStarted = true;
          summaries.push({
            type: "Mouse Movement",
            timestampStart: relativeTimestamp,
            timestampEnd: relativeTimestamp, // Will update later
          });
        } else {
          // Update the last mouse movement event's end time
          const lastMouseEvent = summaries[summaries.length - 1];
          lastMouseEvent.timestampEnd = relativeTimestamp;
        }
      }
    }

    setEventSummaries(summaries);
  }, [steps]);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [eventSummaries]);

  // Format timestamp to MM:SS
  const formatTimestamp = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const formattedSeconds = seconds.toString().padStart(2, "0");
    return `${formattedMinutes}:${formattedSeconds}`;
  };

  // Limit data size to prevent UI issues
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

  // Handle each event type
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

      case EventType.Meta:
        // Handled in the main loop for page navigations
        break;

      case EventType.Custom:
        summaries.push({
          type: "Custom Event",
          timestampStart: relativeTimestamp,
          details: limitDataSize(snapshot.data),
        });
        break;

      case EventType.Plugin:
        handlePluginEvent(snapshot, relativeTimestamp, summaries);
        break;

      case EventType.IncrementalSnapshot:
        handleIncrementalData(snapshot.data as incrementalData, relativeTimestamp, summaries);
        break;

      default:
        summaries.push({
          type: "Unknown Event",
          timestampStart: relativeTimestamp,
        });
    }
  };

  // Handle plugin events and group them
  const handlePluginEvent = (
    snapshot: Snapshot,
    relativeTimestamp: number,
    summaries: EventSummary[]
  ) => {
    const lastEvent = summaries[summaries.length - 1];
    const pluginEventSummary: EventSummary = {
      type: "Plugin Event",
      timestampStart: relativeTimestamp,
      details: limitDataSize(snapshot.data),
    };

    if (lastEvent && lastEvent.type === "Plugin Events") {
      // Update the end timestamp and increment the count
      lastEvent.timestampEnd = relativeTimestamp;
      lastEvent.details.count += 1;
      lastEvent.children?.push(pluginEventSummary);
    } else {
      // Start a new "Plugin Events" group
      summaries.push({
        type: "Plugin Events",
        timestampStart: relativeTimestamp,
        timestampEnd: relativeTimestamp, // Will update if more plugins occur
        details: { count: 1 },
        children: [pluginEventSummary],
      });
    }
  };

  // Handle incremental data and group events
  const handleIncrementalData = (
    data: incrementalData,
    relativeTimestamp: number,
    summaries: EventSummary[]
  ) => {
    switch (data.source) {
      case IncrementalSource.MouseInteraction:
        const interactionType = getMouseInteractionType(data.type);
        summaries.push({
          type: "Mouse Interaction",
          timestampStart: relativeTimestamp,
          details: limitDataSize({
            element: `Element ID ${data.id}`,
            interactionType,
          }),
        });
        break;

      case IncrementalSource.Input:
        summaries.push({
          type: "Text Input",
          timestampStart: relativeTimestamp,
          details: limitDataSize({
            element: `Element ID ${data.id}`,
            value: data.text,
          }),
        });
        break;

      case IncrementalSource.Mutation:
        handleMutationData(data, relativeTimestamp, summaries);
        break;

      case IncrementalSource.ViewportResize:
        summaries.push({
          type: "Viewport Resize",
          timestampStart: relativeTimestamp,
          details: limitDataSize(data),
        });
        break;

      // Other incremental sources are handled elsewhere
      default:
        break;
    }
  };

  // Handle mutations and group additions and removals
  const handleMutationData = (
    data: incrementalData,
    relativeTimestamp: number,
    summaries: EventSummary[]
  ) => {
    const lastEvent = summaries[summaries.length - 1];

    // Handle additions
    if (data.adds && data.adds.length > 0) {
      const additionEvents = data.adds.map((add) => ({
        type: "Element Added",
        timestampStart: relativeTimestamp,
        details: limitDataSize({
          parentId: add.parentId,
          node: add.node,
        }),
      }));

      if (lastEvent && lastEvent.type === "Elements Added") {
        // Update the end timestamp and increment the count
        lastEvent.timestampEnd = relativeTimestamp;
        lastEvent.details.count += data.adds.length;
        lastEvent.children?.push(...additionEvents);
      } else {
        // Start a new "Elements Added" event
        summaries.push({
          type: "Elements Added",
          timestampStart: relativeTimestamp,
          timestampEnd: relativeTimestamp, // Will update if more additions occur
          details: { count: data.adds.length },
          children: additionEvents,
        });
      }
    }

    // Handle deletions
    if (data.removes && data.removes.length > 0) {
      const removalEvents = data.removes.map((remove) => ({
        type: "Element Removed",
        timestampStart: relativeTimestamp,
        details: limitDataSize({
          id: remove.id,
          parentId: remove.parentId,
        }),
      }));

      if (lastEvent && lastEvent.type === "Elements Removed") {
        // Update the end timestamp and increment the count
        lastEvent.timestampEnd = relativeTimestamp;
        lastEvent.details.count += data.removes.length;
        lastEvent.children?.push(...removalEvents);
      } else {
        // Start a new "Elements Removed" event
        summaries.push({
          type: "Elements Removed",
          timestampStart: relativeTimestamp,
          timestampEnd: relativeTimestamp, // Will update if more removals occur
          details: { count: data.removes.length },
          children: removalEvents,
        });
      }
    }
  };

  // Map mouse interaction types to human-readable strings
  const getMouseInteractionType = (type: number): string => {
    const interactionTypes: { [key: number]: string } = {
      0: 'Mouse Up',
      1: 'Mouse Down',
      2: 'Click',
      3: 'Context Menu',
      4: 'DblClick',
      5: 'Focus',
      6: 'Blur',
      7: 'Touch Start',
      9: 'Touch End',
    };
    return interactionTypes[type] || 'Unknown';
  };

  const toggleGroupExpand = (index: number) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="flex justify-center items-start mx-auto">
      <div className="relative bg-blue-300 p-4 rounded-lg shadow-lg w-full max-w-3xl m-4">
        <h2 className="text-2xl font-semibold mb-4">Event Summary</h2>
        <div className="max-h-96 overflow-y-auto" ref={chatContainerRef}>
          <ul className="space-y-4">
            {eventSummaries.map((event, index) => {
              const startTime = formatTimestamp(event.timestampStart);
              const endTime = event.timestampEnd
                ? formatTimestamp(event.timestampEnd)
                : null;

              const isGroup = event.children && event.children.length > 0;
              const isExpanded = expandedGroups.has(index);

              return (
                <li
                  key={index}
                  className="p-4 bg-white rounded-lg shadow hover:bg-gray-100 transition cursor-pointer"
                  style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                  onClick={() => isGroup && toggleGroupExpand(index)}
                >
                  <div>
                    <span className="font-bold">
                      Timestamp: {startTime}{endTime ? ` - ${endTime}` : ''}
                    </span>
                  </div>
                  <div>
                    <strong>{event.type}</strong>
                    {event.details && event.details.count && (
                      <span>
                        : {event.details.count} {event.type === "Elements Added" ? "elements added" : event.type === "Elements Removed" ? "elements removed" : "plugin events"}
                      </span>
                    )}
                  </div>
                  {event.details && !event.details.count && Object.entries(event.details).map(([key, value], idx) => (
                    <div
                      key={idx}
                      className="text-sm text-gray-600"
                      style={{ maxWidth: '100%' }}
                    >
                      <strong>{`${key.charAt(0).toUpperCase() + key.slice(1)}:`}</strong>{" "}
                      {typeof value === "object"
                        ? JSON.stringify(value, null, 2)
                        : value}
                    </div>
                  ))}
                  {isGroup && isExpanded && (
                    <ul className="mt-2 space-y-2">
                      {event.children?.map((childEvent, childIndex) => (
                        <li key={childIndex} className="pl-4 border-l-2 border-gray-300">
                          <div>
                            <span className="font-bold">
                              Timestamp: {formatTimestamp(childEvent.timestampStart)}
                            </span>
                          </div>
                          <div>
                            <strong>{childEvent.type}</strong>
                          </div>
                          {childEvent.details && Object.entries(childEvent.details).map(([key, value], idx) => (
                            <div
                              key={idx}
                              className="text-sm text-gray-600"
                              style={{ maxWidth: '100%' }}
                            >
                              <strong>{`${key.charAt(0).toUpperCase() + key.slice(1)}:`}</strong>{" "}
                              {typeof value === "object"
                                ? JSON.stringify(value, null, 2)
                                : value}
                            </div>
                          ))}
                        </li>
                      ))}
                    </ul>
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
