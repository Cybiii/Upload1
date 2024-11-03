// src/components/StepsChat/EventDetails.tsx

import React from 'react';
import { EventSummary } from '../../types';

interface EventDetailsProps {
  event: EventSummary;
  index: number;
  expandedDetails: Set<string>;
  toggleDetailExpand: (key: string) => void;
}

const EventDetails: React.FC<EventDetailsProps> = ({
  event,
  index,
  expandedDetails,
  toggleDetailExpand,
}) => {
  return (
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
  );
};

export default EventDetails;
