import React from 'react';

const ResultDisplay = ({ result, onReset }) => {
  if (!result) return null;

  const {
    success,
    product,
    message,
    alternativeProducts = [],
    requiresLogin = false,
  } = result;

  // Determine the result type based on content
  const isError =
    !success &&
    (message?.includes('Could not add') ||
      message?.includes('Failed to') ||
      message?.includes('Error') ||
      message?.includes('Login required') ||
      requiresLogin);

  const isAlternative =
    !success && !isError && (alternativeProducts?.length > 0 || product);

  const getResultDisplay = () => {
    if (success) {
      return {
        title: 'Successfully Added to Cart!',
        bgColor: 'bg-green-500/20 border-green-400/30',
        iconColor: 'bg-green-500',
        textColor: 'text-white',
        messageColor: 'text-green-200',
        icon: (
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ),
      };
    } else if (isError) {
      return {
        title: 'Unable to Complete Request',
        bgColor: 'bg-red-500/20 border-red-400/30',
        iconColor: 'bg-red-500',
        textColor: 'text-white',
        messageColor: 'text-red-200',
        icon: (
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ),
      };
    } else {
      return {
        title: 'Alternative Found',
        bgColor: 'bg-yellow-500/20 border-yellow-400/30',
        iconColor: 'bg-yellow-500',
        textColor: 'text-white',
        messageColor: 'text-yellow-200',
        icon: (
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        ),
      };
    }
  };

  const display = getResultDisplay();

  return (
    <div className="space-y-3">
      <div
        className={`backdrop-blur-xl ${display.bgColor} border rounded-lg p-3 shadow-lg`}
      >
        <div className="flex items-start space-x-3">
          <div
            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${display.iconColor}`}
          >
            {display.icon}
          </div>

          <div className="flex-1">
            <h3 className={`font-medium ${display.textColor}`}>
              {display.title}
            </h3>
            <p className={`text-sm mt-1 ${display.messageColor}`}>{message}</p>
          </div>
        </div>
      </div>

      {product && (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-3 shadow-lg">
          <h4 className="font-medium text-white mb-2">Product Details</h4>
          <div className="flex space-x-3">
            {/* Product Info */}
            <div className="flex-1 space-y-1.5">
              <div>
                <span className="text-xs font-medium text-white/80">Name:</span>
                <p className="text-sm text-white">{product.name}</p>
              </div>
              {product.price && (
                <div>
                  <span className="text-xs font-medium text-white/80">
                    Price:
                  </span>
                  <p className="text-sm text-white font-semibold text-green-300">
                    {product.price}
                  </p>
                </div>
              )}
              {product.category && (
                <div>
                  <span className="text-xs font-medium text-white/80">
                    Category:
                  </span>
                  <p className="text-sm text-white">{product.category}</p>
                </div>
              )}
              {product.url && (
                <div>
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-300 hover:text-purple-200 underline transition-colors"
                  >
                    View Product →
                  </a>
                </div>
              )}
            </div>

            {/* Product Image */}
            {product.image && (
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/20">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-xl hidden">
                    📦
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {alternativeProducts.length > 0 && (
        <div className="card">
          <h4 className="font-medium text-gray-900 mb-2">
            Alternative Options
          </h4>
          <div className="space-y-2">
            {alternativeProducts.slice(0, 3).map((alt, index) => (
              <div key={index} className="border-l-2 border-gray-200 pl-3">
                <p className="text-sm font-medium text-gray-900">{alt.name}</p>
                {alt.price && (
                  <p className="text-sm text-gray-600">{alt.price}</p>
                )}
                {alt.url && (
                  <a
                    href={alt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:text-primary-700 underline"
                  >
                    View →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onReset} className="btn-secondary w-full">
        Make Another Request
      </button>
    </div>
  );
};

export default ResultDisplay;
