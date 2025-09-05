import React, { useState, useEffect } from 'react';
import StorageManager from '../../utils/storage';

const HistoryView = ({ onBack }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storage] = useState(() => new StorageManager());

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const savedItems = await storage.getAddedItems();
        setItems(savedItems);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [storage]);

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear all history?')) {
      await storage.clearAddedItems();
      setItems([]);
    }
  };

  const formatDate = timestamp => {
    return new Date(timestamp).toLocaleString();
  };

  const getSiteIcon = site => {
    switch (site) {
      case 'fake-store-demo':
        return '🛍️';
      case 'sauce-demo':
        return '🧪';
      default:
        return '🌐';
    }
  };

  const getSiteLabel = site => {
    switch (site) {
      case 'fake-store-demo':
        return 'Fake Store';
      case 'sauce-demo':
        return 'Sauce Demo';
      default:
        return 'Unknown Site';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Back</span>
            </button>
            <h2 className="font-bold text-white">History</h2>
            <div className="w-12"></div>
          </div>
        </div>

        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-3 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back</span>
          </button>
          <h2 className="font-bold text-white">History</h2>
          {items.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs text-red-300 hover:text-red-200 px-2 py-1 bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-400/30 hover:border-red-400/50 transition-all duration-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="backdrop-blur-xl bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 shadow-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-200 font-medium">Total Items:</span>
          <span className="text-white font-bold">{items.length}</span>
        </div>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-6 shadow-lg text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <h3 className="text-base font-medium text-white mb-1">
            No Items Yet
          </h3>
          <p className="text-white/60 text-xs">
            Successfully added items will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {items.map(item => (
            <div
              key={item.id}
              className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-3 shadow-lg hover:bg-white/15 transition-all duration-200"
            >
              <div className="flex space-x-2">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover border border-white/20"
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg ${item.image ? 'hidden' : 'flex'}`}
                  >
                    📦
                  </div>
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xs font-medium text-white line-clamp-2 leading-tight">
                        {item.name}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm font-semibold text-green-300">
                          {item.price}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-white/10 backdrop-blur-sm rounded text-white/80 border border-white/20">
                          {item.category || 'Product'}
                        </span>
                      </div>
                    </div>

                    {/* Site Badge */}
                    <div className="flex-shrink-0 ml-1">
                      <div className="flex items-center space-x-1 text-xs bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded backdrop-blur-sm border border-blue-400/30">
                        <span>{getSiteIcon(item.site)}</span>
                        <span className="text-xs">
                          {getSiteLabel(item.site)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Request & Timestamp */}
                  <div className="mt-2 space-y-1">
                    {item.originalRequest && (
                      <p className="text-xs text-white/70 italic line-clamp-1">
                        "{item.originalRequest}"
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white/50">
                        {formatDate(item.timestamp)}
                      </p>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-300 hover:text-purple-200 underline transition-colors"
                        >
                          View →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
