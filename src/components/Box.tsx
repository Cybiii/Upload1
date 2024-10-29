import React from 'react';

const Box: React.FC = () => {
  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-lg h-full overflow-auto">
      <h2 className="text-2xl font-semibold mb-4">Lorem Ipsum</h2>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin mollis
        turpis id mi commodo, a fermentum ante vulputate. Cras nec libero vitae
        ipsum dapibus efficitur vel a eros. Etiam lacinia euismod dui a
        tincidunt. Nunc dictum vitae mi eu bibendum. Curabitur nec urna a
        justo vulputate lacinia. Sed bibendum venenatis neque, sit amet
        malesuada odio facilisis ut.
      </p>
      {/* Add more Lorem Ipsum text as needed */}
    </div>
  );
};

export default Box;
