// src/components/StepsChat/helpers.ts

import { EventType, incrementalData, IncrementalSource } from "../../../index";
import { Snapshot, EventSummary } from '../../types/events';
import { limitDataSize } from '../../utils';

// Process steps and generate event summaries
export const processSteps = (steps: Snapshot[]): EventSummary[] => {
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
  return mergedSummaries;
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
      } as EventSummary;
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
      } as EventSummary;
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
