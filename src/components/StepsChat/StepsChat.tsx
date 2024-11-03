// src/components/StepsChat/StepsChat.tsx

import React, { useState, useEffect } from 'react';
import { EventSummary, StepsChatProps } from '../../types';
import EventItem from './EventItem';
import { processSteps } from './helpers';

const StepsChat: React.FC<StepsChatProps> = ({ steps }) => {
  const [eventSummaries, setEventSummaries] = useState<EventSummary[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (steps.length === 0) return;
    const processedSummaries = processSteps(steps);
    setEventSummaries(processedSummaries);
  }, [steps]);

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

  return (
    <div className="flex justify-center items-start mx-auto">
      <div className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-lg shadow-xl w-full max-w-3xl m-4">
        <h2 className="text-3xl font-bold mb-6 text-white">Event Summary</h2>
        <div className="max-h-96 overflow-y-auto">
          <ul className="space-y-4">
            {eventSummaries.map((event, index) => (
              <EventItem
                key={index}
                event={event}
                index={index}
                isExpanded={expandedGroups.has(index)}
                toggleGroupExpand={toggleGroupExpand}
                expandedDetails={expandedDetails}
                toggleDetailExpand={toggleDetailExpand}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StepsChat;
