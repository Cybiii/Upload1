import React, { useState, useRef, useEffect } from 'react';
import { EventType, incrementalData, IncrementalSource } from "../../index";
import { motion, AnimatePresence } from 'framer-motion';

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
  isTruncated?: boolean;
  fullDetails?: any;
  children?: EventSummary[];
}

interface StepsChatProps {
  steps: Snapshot[];
}

const StepsChat: React.FC<StepsChatProps> = ({ steps }) => {
  const [eventSummaries, setEventSummaries] = useState<EventSummary[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
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

    // After processing all steps, merge back-to-back groups as per the requirement
    const mergedSummaries = mergeGroups(summaries);
    setEventSummaries(mergedSummaries);
  }, [steps]);

  // Removed the useEffect that scrolls to the bottom
  // Now the summary will start at the top when a file is uploaded

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
  const limitDataSize = (
    data: any,
    maxLength = 200,
    maxProps = 3,
    noTruncateKeys: string[] = []
  ): { data: any; isTruncated: boolean; fullData?: any } => {
    let isTruncated = false;
    let fullData: any;

    if (typeof data === "string") {
      if (data.length > maxLength) {
        isTruncated = true;
        fullData = data;
        data = data.substring(0, maxLength);
      }
      return { data, isTruncated, fullData };
    } else if (Array.isArray(data)) {
      if (data.length > maxProps) {
        isTruncated = true;
        fullData = data;
        data = data.slice(0, maxProps);
      }
      const result = [];
      for (let i = 0; i < data.length; i++) {
        const limited = limitDataSize(data[i], maxLength, maxProps, noTruncateKeys);
        if (limited.isTruncated) isTruncated = true;
        result.push(limited.data);
      }
      return { data: result, isTruncated, fullData: isTruncated ? fullData : undefined };
    } else if (typeof data === "object" && data !== null) {
      const limitedData: any = {};
      let count = 0;
      fullData = data;
      for (const key in data) {
        if (noTruncateKeys.includes(key)) {
          limitedData[key] = data[key];
          continue;
        }
        if (count >= maxProps) {
          isTruncated = true;
          break;
        }
        const limited = limitDataSize(data[key], maxLength, maxProps, noTruncateKeys);
        if (limited.isTruncated) isTruncated = true;
        limitedData[key] = limited.data;
        count++;
      }
      return { data: limitedData, isTruncated, fullData: isTruncated ? fullData : undefined };
    } else {
      return { data, isTruncated };
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
        handleCustomEvent(snapshot, relativeTimestamp, summaries);
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

  // Handle custom events and add them directly to summaries
  const handleCustomEvent = (
    snapshot: Snapshot,
    relativeTimestamp: number,
    summaries: EventSummary[]
  ) => {
    const customDataLimited = limitDataSize(snapshot.data, 200, 3, ['parentId', 'plugin', 'tag']);
    const customEventSummary: EventSummary = {
      type: "Custom Event",
      timestampStart: relativeTimestamp,
      details: customDataLimited.data,
      isTruncated: customDataLimited.isTruncated,
      fullDetails: customDataLimited.fullData,
    };

    // Directly add to summaries; merging will handle grouping
    summaries.push(customEventSummary);
  };

  // Handle plugin events and add them directly to summaries
  const handlePluginEvent = (
    snapshot: Snapshot,
    relativeTimestamp: number,
    summaries: EventSummary[]
  ) => {
    const pluginDataLimited = limitDataSize(snapshot.data, 200, 3, ['plugin']);
    const pluginEventSummary: EventSummary = {
      type: "Plugin Event",
      timestampStart: relativeTimestamp,
      details: pluginDataLimited.data,
      isTruncated: false, // Do not truncate plugin data
      fullDetails: undefined,
    };

    // Directly add to summaries; merging will handle grouping
    summaries.push(pluginEventSummary);
  };

  // Handle incremental data and group events
  const handleIncrementalData = (
    data: incrementalData,
    relativeTimestamp: number,
    summaries: EventSummary[]
  ) => {
    switch (data.source) {
      case IncrementalSource.MouseInteraction:
        // Exclude certain interaction types
        const excludedInteractionTypes = [0, 1, 5, 6]; // Mouse Up, Mouse Down, Focus, Blur
        if (excludedInteractionTypes.includes(data.type)) {
          // Skip this event
          break;
        }
        const interactionType = getMouseInteractionType(data.type);
        const mouseInteractionData = limitDataSize(
          {
            element: `Element ID ${data.id}`,
            interactionType,
          },
          200,
          3,
          ['element']
        );
        summaries.push({
          type: "Mouse Interaction",
          timestampStart: relativeTimestamp,
          details: mouseInteractionData.data,
          isTruncated: mouseInteractionData.isTruncated,
          fullDetails: mouseInteractionData.fullData,
        });
        break;

      case IncrementalSource.Input:
        // Only process if there is a value
        if (data.text && data.text.trim() !== '') {
          const inputDataLimited = limitDataSize(
            {
              element: `Element ID ${data.id}`,
              value: data.text,
            },
            200,
            3,
            ['element', 'value']
          );
          summaries.push({
            type: "Text Input",
            timestampStart: relativeTimestamp,
            details: inputDataLimited.data,
            isTruncated: false, // Do not truncate input values
            fullDetails: undefined,
          });
        }
        break;

      case IncrementalSource.Mutation:
        handleMutationData(data, relativeTimestamp, summaries);
        break;

      case IncrementalSource.ViewportResize:
        const resizeDataLimited = limitDataSize(data, 200, 3, ['width', 'height']);
        summaries.push({
          type: "Viewport Resize",
          timestampStart: relativeTimestamp,
          details: resizeDataLimited.data,
          isTruncated: resizeDataLimited.isTruncated,
          fullDetails: resizeDataLimited.fullData,
        });
        break;

      // Other incremental sources are handled elsewhere
      default:
        break;
    }
  };

  // Handle mutations and add them directly to summaries
  const handleMutationData = (
    data: incrementalData,
    relativeTimestamp: number,
    summaries: EventSummary[]
  ) => {
    // Handle additions and removals
    if (data.adds && data.adds.length > 0) {
      const additionEvents = data.adds.map((add) => {
        const addDataLimited = limitDataSize(
          {
            parentId: add.parentId,
            node: add.node,
          },
          200,
          3,
          ['parentId'] // Do not truncate parentId
        );
        return {
          type: "Element Added",
          timestampStart: relativeTimestamp,
          details: addDataLimited.data,
          isTruncated: addDataLimited.isTruncated,
          fullDetails: addDataLimited.fullData,
        };
      });
      summaries.push(...additionEvents);
    }

    if (data.removes && data.removes.length > 0) {
      const removalEvents = data.removes.map((remove) => {
        const removeDataLimited = limitDataSize(
          {
            id: remove.id,
            parentId: remove.parentId,
          },
          200,
          3,
          ['id', 'parentId'] // Do not truncate id and parentId
        );
        return {
          type: "Element Removed",
          timestampStart: relativeTimestamp,
          details: removeDataLimited.data,
          isTruncated: removeDataLimited.isTruncated,
          fullDetails: removeDataLimited.fullData,
        };
      });
      summaries.push(...removalEvents);
    }
  };

  // Function to merge back-to-back groups
  const mergeGroups = (summaries: EventSummary[]): EventSummary[] => {
    const merged: EventSummary[] = [];
    let i = 0;

    while (i < summaries.length) {
      const currentEvent = summaries[i];

      if (
        currentEvent.type === "Element Added" ||
        currentEvent.type === "Element Removed" ||
        currentEvent.type === "Plugin Event" ||
        currentEvent.type === "Custom Event"
      ) {
        const groupedEvents: EventSummary[] = [];
        let timestampStart = currentEvent.timestampStart;
        let timestampEnd = currentEvent.timestampEnd || currentEvent.timestampStart;

        // Collect consecutive events of specified types
        while (
          i < summaries.length &&
          (
            summaries[i].type === "Element Added" ||
            summaries[i].type === "Element Removed" ||
            summaries[i].type === "Plugin Event" ||
            summaries[i].type === "Custom Event"
          )
        ) {
          const event = summaries[i];
          groupedEvents.push(event);
          timestampEnd = event.timestampEnd || event.timestampStart;
          i++;
        }

        // Create a new grouped event
        merged.push({
          type: "DOM Mutations and Events",
          timestampStart,
          timestampEnd,
          details: { count: groupedEvents.length },
          children: groupedEvents,
        });
      } else {
        // Non-grouped events, just add them to the merged list
        merged.push(currentEvent);
        i++;
      }
    }

    return merged;
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

  const toggleDetailExpand = (key: string) => {
    setExpandedDetails((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const getGroupEventDescription = (eventType: string): string => {
    switch(eventType) {
      case "DOM Mutations and Events":
        return "events";
      default:
        return "";
    }
  };

  return (
    <div className="flex justify-center items-start mx-auto">
      <div className="relative bg-gradient-to-r from-blue-500 via-blue-500 to-pink-500 p-6 rounded-lg shadow-xl w-full max-w-3xl m-4">
        <h2 className="text-3xl font-bold mb-6 text-white">Event Summary</h2>
        <div className="max-h-96 overflow-y-auto" ref={chatContainerRef}>
          <ul className="space-y-4">
            {eventSummaries.map((event, index) => {
              const startTime = formatTimestamp(event.timestampStart);
              const endTime = event.timestampEnd
                ? formatTimestamp(event.timestampEnd)
                : null;

              const isGroup = event.children && event.children.length > 0;
              const hasExpandableDetails = event.isTruncated;
              const isExpandable = isGroup || hasExpandableDetails;
              const isExpanded = expandedGroups.has(index);

              return (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className={`p-5 bg-white bg-opacity-90 rounded-lg shadow-md hover:shadow-lg transition ${isExpandable ? 'cursor-pointer' : ''}`}
                    style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                    onClick={() => isGroup && isExpandable && toggleGroupExpand(index)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-indigo-700">
                          Timestamp: {startTime}{endTime ? ` - ${endTime}` : ''}
                        </span>
                      </div>
                      {isGroup && (
                        <motion.span
                          initial={{ rotate: 0 }}
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-indigo-700"
                        >
                          ▶
                        </motion.span>
                      )}
                    </div>
                    <div className="mt-2">
                      <strong className="text-lg text-gray-800">{event.type}</strong>
                      {event.details && event.details.count && (
                        <span className="text-gray-700">
                          : {event.details.count} {getGroupEventDescription(event.type)}
                        </span>
                      )}
                    </div>
                    {event.details && !event.details.count && (
                      <div className="mt-2">
                        {Object.entries(event.details).map(([key, value], idx) => {
                          const detailKey = `${index}-${key}`;
                          const isDetailExpanded = expandedDetails.has(detailKey);
                          const fullValue = event.isTruncated && event.fullDetails ? event.fullDetails[key] : value;

                          // Do not show "Show More" for specified keys
                          const noShowMoreKeys = ['parentId', 'plugin', 'element', 'value', 'tag'];
                          const canExpand = event.isTruncated && !noShowMoreKeys.includes(key);

                          return (
                            <div
                              key={idx}
                              className="text-sm text-gray-600 mt-1"
                              style={{ maxWidth: '100%' }}
                            >
                              <strong>{`${key.charAt(0).toUpperCase() + key.slice(1)}:`}</strong>{" "}
                              {typeof value === "object"
                                ? JSON.stringify(isDetailExpanded ? fullValue : value, null, 2)
                                : isDetailExpanded ? fullValue : value}
                              {canExpand && (
                                <button
                                  className="text-blue-500 ml-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDetailExpand(detailKey);
                                  }}
                                >
                                  {isDetailExpanded ? "Show Less" : "Show More"}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {isGroup && (
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.ul
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 space-y-2 overflow-hidden"
                          >
                            {event.children?.map((childEvent, childIndex) => (
                              <li key={childIndex} className="pl-4 border-l-2 border-gray-300">
                                <div>
                                  <span className="font-semibold text-indigo-700">
                                    Timestamp: {formatTimestamp(childEvent.timestampStart)}
                                  </span>
                                </div>
                                <div>
                                  <strong className="text-gray-800">{childEvent.type}</strong>
                                </div>
                                {childEvent.details && (
                                  <div className="mt-2">
                                    {Object.entries(childEvent.details).map(([key, value], idx) => {
                                      const detailKey = `${index}-${childIndex}-${key}`;
                                      const isDetailExpanded = expandedDetails.has(detailKey);
                                      const fullValue = childEvent.isTruncated && childEvent.fullDetails ? childEvent.fullDetails[key] : value;

                                      // Do not show "Show More" for specified keys
                                      const noShowMoreKeys = ['parentId', 'plugin', 'element', 'value', 'tag'];
                                      const canExpand = childEvent.isTruncated && !noShowMoreKeys.includes(key);

                                      return (
                                        <div
                                          key={idx}
                                          className="text-sm text-gray-600 mt-1"
                                          style={{ maxWidth: '100%' }}
                                        >
                                          <strong>{`${key.charAt(0).toUpperCase() + key.slice(1)}:`}</strong>{" "}
                                          {typeof value === "object"
                                            ? JSON.stringify(isDetailExpanded ? fullValue : value, null, 2)
                                            : isDetailExpanded ? fullValue : value}
                                          {canExpand && (
                                            <button
                                              className="text-blue-500 ml-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleDetailExpand(detailKey);
                                              }}
                                            >
                                              {isDetailExpanded ? "Show Less" : "Show More"}
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StepsChat;
