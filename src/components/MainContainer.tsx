// MainContainer.tsx
import React from "react";
import RecipeChat from "./ChatBox";
import FileUploader from "./FileUpload";

const MainContainer: React.FC = () => {
  return (
    <div className="flex justify-center items-center min-h-screen p-8 bg-gray-100">
      <div className="flex flex-col space-y-4">
        <FileUploader />
        <RecipeChat
          steps={{
            title: "Sample Recipe",
            ingredients: "Ingredient1|Ingredient2",
            instructions: "Step 1. Do this. |Step 2. Do that. Step 1. Do this. |Step 2. Do that. Step 1. Do this. |Step 2. Do that. ",
          }}
        />
      </div>
    </div>
  );
};

export default MainContainer;
