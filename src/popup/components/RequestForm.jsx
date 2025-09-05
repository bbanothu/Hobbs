import React, { useState } from 'react';

const RequestForm = ({ onSubmit, isLoading, selectedSite = 'auto' }) => {
  const [request, setRequest] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (request.trim()) {
      onSubmit(request.trim());
    }
  };

  const getSiteExamples = site => {
    switch (site) {
      case 'sauce-demo':
        return [
          'Add a Sauce Labs backpack under $30',
          'Find a Sauce Labs t-shirt under $20',
          'Get a fleece jacket under $50',
        ];
      case 'fake-store':
        return [
          "Add a men's t-shirt under $25",
          'Find a backpack that fits laptops',
          "Get a women's jacket under $40",
        ];
      default:
        return [
          "Add a men's t-shirt under $25",
          'Find a backpack under $50',
          'Get electronics under $100',
        ];
    }
  };

  const exampleRequests = getSiteExamples(selectedSite);

  return (
    <div className="space-y-3">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-3 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="request"
              className="block text-sm font-medium text-white mb-2"
            >
              What would you like to add to cart?
            </label>
            <textarea
              id="request"
              value={request}
              onChange={e => setRequest(e.target.value)}
              placeholder="e.g., Add a men's medium t-shirt under $25"
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-200 resize-none h-16 text-sm"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={!request.trim() || isLoading}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-1 focus:ring-purple-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-purple-500/30 font-medium text-sm"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              'Find & Add to Cart'
            )}
          </button>
        </form>
      </div>

      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-3 shadow-lg">
        <h3 className="text-sm font-medium text-white mb-2">Examples:</h3>
        <div className="space-y-1">
          {exampleRequests.map((example, index) => (
            <button
              key={index}
              onClick={() => setRequest(example)}
              className="text-xs text-white/80 hover:text-white block text-left w-full hover:bg-white/10 p-1.5 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/10 hover:border-white/20"
              disabled={isLoading}
            >
              "{example}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RequestForm;
