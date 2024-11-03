import React, { useState } from "react";
import StepsChat from "../StepsChat";
import FileUploader from "../FileUploader";
import { Snapshot } from '../../types';

const MainContainer: React.FC = () => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const handleFileUpload = (data: Snapshot[]) => {
    setSnapshots(data || []);
  };

  return (
    <div className="flex flex-col items-center p-8">
      <FileUploader onFileUpload={handleFileUpload} />
      {snapshots.length > 0 ? (
        <StepsChat steps={snapshots} />
      ) : (
        <p>Please upload an rrweb JSON file to see the event summary.</p>
      )}
      <p>Made by Sebastian Silva</p>
    </div>
  );
};

export default MainContainer;
