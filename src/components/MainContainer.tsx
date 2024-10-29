import React, { useState } from "react";
import RecipeChat from "./ChatBox";
import FileUploader from "./FileUpload";

const MainContainer: React.FC = () => {
  const [snapshots, setSnapshots] = useState<any[]>([]);

  const handleFileUpload = (data: any) => {
    setSnapshots(data.data.snapshots || []);
  };

  return (
    <div className="flex justify-center items-start space-x-4 p-16">
      <div className="flex flex-col space-y-4">
        <FileUploader onFileUpload={handleFileUpload} />
        <RecipeChat steps={snapshots} />
      </div>
    </div>
  );
};

export default MainContainer;
