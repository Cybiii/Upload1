// StepsChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import nlp from 'compromise';

interface Box {
  title: string;
  ingredients: string;
  instructions: string;
}

interface StepsChatProps {
  steps: Box | null; // Steps can be null if not found
}

const StepsChat: React.FC<StepsChatProps> = ({ steps }) => {
  if (!steps) return <p>Steps not found</p>;

  const ingredients = steps.ingredients.split("|").map(ing => ing.trim());
  const doc = nlp(steps.instructions);
  const sentences = doc.sentences().out('array');
  const stepsArray = sentences.map(sentence => sentence.trim());

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [completedSteps]);

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
    const newCompletedSteps = [...Array(index).keys()];
    setCompletedSteps(newCompletedSteps);
  };

  return (
    <div className="flex justify-center items-start space-x-4 mx-32">
      <div className="relative bg-blue-300 p-4 rounded-lg shadow-lg w-2/3 m-4">
        <h2 className="text-2xl font-semibold mb-4">Steps Instructions</h2>
        <div className="max-h-64 overflow-y-auto"> {/* Added max-h and overflow-y classes */}
          <ul className="space-y-4">
            {stepsArray.map((step, index) => (
              <li
                key={index}
                className={`p-4 rounded-lg cursor-pointer ${
                  index === currentStep ? "bg-blue-400" : completedSteps.includes(index) ? "bg-green-200" : "bg-white"
                }`}
                onClick={() => handleStepClick(index)}
              >
                {step}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="relative bg-blue-200 p-4 rounded-lg shadow-lg w-1/3 m-4">
        <h2 className="text-2xl font-semibold mb-4">Lorem Ipsum</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin mollis
          turpis id mi commodo, a fermentum ante vulputate. Cras nec libero vitae
          ipsum dapibus efficitur vel a eros. Etiam lacinia euismod dui a
          tincidunt. Nunc dictum vitae mi eu bibendum. Curabitur nec urna a
          justo vulputate lacinia. Sed bibendum venenatis neque, sit amet
          malesuada odio facilisis ut.
        </p>
      </div>
    </div>
  );
};

export default StepsChat;
