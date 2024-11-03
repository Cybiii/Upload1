// src/components/StepsChat/EventItem.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventSummary } from '../../types';
import { formatTimestamp } from '../../utils';
import EventDetails from './EventDetails';

interface EventItemProps {
  event: EventSummary;
  index: number;
  isExpanded: boolean;
  toggleGroupExpand: (index: number) => void;
  expandedDetails: Set<string>;
  toggleDetailExpand: (key: string) => void;
}

const EventItem: React.FC<EventItemProps> = ({
  event,
  index,
  isExpanded,
  toggleGroupExpand,
  expandedDetails,
  toggleDetailExpand,
}) => {
  const startTime = formatTimestamp(event.timestampStart);
  const endTime = event.timestampEnd
    ? formatTimestamp(event.timestampEnd)
    : null;

  const isGroup = event.children && event.children.length > 0;
  const hasExpandableDetails = event.isTruncated;
  const isExpandable = isGroup || hasExpandableDetails;

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={`p-5 bg-white bg-opacity-90 rounded-lg shadow-md hover:shadow-lg transition ${isExpandable ? 'cursor-pointer' : ''
          }`}
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
              : {event.details.count} events
            </span>
          )}
        </div>
        {event.details && !event.details.count && (
          <EventDetails
            event={event}
            index={index}
            expandedDetails={expandedDetails}
            toggleDetailExpand={toggleDetailExpand}
          />
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
                    <EventItem
                      event={childEvent}
                      index={childIndex}
                      isExpanded={false}
                      toggleGroupExpand={() => { }}
                      expandedDetails={expandedDetails}
                      toggleDetailExpand={toggleDetailExpand}
                    />
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.li>
  );
};

export default EventItem;
