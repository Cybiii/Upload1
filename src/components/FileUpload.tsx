// FileUploader.tsx
import React from 'react';

const FileUploader: React.FC = () => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle file upload logic here
      console.log("Uploaded file:", file);
    }
  };

  return (
    <div className="bg-white mx-auto p-4 rounded-lg shadow-lg mb-4">
      <h2 className="text-3xl font-semibold mb-4">Upload JSON</h2> {/* Change text-2xl to text-xl */}
      <input
        type="file"
        accept=".json"
        onChange={handleFileUpload}
        className="border border-gray-300 p-2 rounded-lg"
      />
    </div>
  );
};

export default FileUploader;
