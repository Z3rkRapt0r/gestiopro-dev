import React from 'react';

const AppFooter = () => {
  return (
    <footer className="mt-auto py-4 px-4 border-t border-gray-200 bg-white">
      <div className="container mx-auto text-center">
        <p className="text-sm text-gray-600">
          Powered by{' '}
          <a 
            href="https://licenseglobal.it/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            License Global
          </a>
        </p>
      </div>
    </footer>
  );
};

export default AppFooter;
