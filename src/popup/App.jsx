import React, { useState, useEffect, useCallback } from 'react';
import RequestForm from './components/RequestForm';
import ResultDisplay from './components/ResultDisplay';
import HistoryView from './components/HistoryView';
import StorageManager from '../utils/storage';

const App = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [currentSite, setCurrentSite] = useState('');
  const [selectedSite, setSelectedSite] = useState('fake-store');
  const [showHistory, setShowHistory] = useState(false);
  const [storage] = useState(() => new StorageManager());
  const [credentials, setCredentials] = useState({
    username: 'standard_user',
    password: 'secret_sauce',
  });

  useEffect(() => {
    // Get current tab URL and load cached target website
    const initializeApp = async () => {
      // Get current tab URL
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]) {
          const url = new URL(tabs[0].url);
          setCurrentSite(url.hostname);
        }
      });

      // Load cached target website
      const cachedSite = await storage.getTargetWebsite();
      setSelectedSite(cachedSite);

      // Load credentials for the cached site
      await loadCredentialsForSite(cachedSite);
    };

    initializeApp();
  }, [storage, loadCredentialsForSite]);

  const handleRequest = async request => {
    setIsLoading(true);
    setResult(null);

    try {
      // Get credentials from the form if Sauce Demo is selected
      let credentials = null;
      if (selectedSite === 'sauce-demo') {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        credentials = {
          username: usernameInput?.value || 'standard_user',
          password: passwordInput?.value || 'secret_sauce',
        };

        // Save credentials to storage for future use
        await storage.saveCredentialsForSite(
          'saucedemo.com',
          credentials.username,
          credentials.password
        );
      }

      // Get current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Check if we need to navigate to a specific demo site
      const selectedOption = siteOptions.find(
        option => option.value === selectedSite
      );
      if (selectedOption && selectedOption.url && selectedSite !== 'auto') {
        const currentUrl = new URL(tab.url);
        const targetUrl = new URL(selectedOption.url);

        // Only navigate if we're not already on the target site
        if (currentUrl.hostname !== targetUrl.hostname) {
          console.log(
            `Navigating to ${selectedOption.label}: ${selectedOption.url}`
          );
          await chrome.tabs.update(tab.id, { url: selectedOption.url });

          // Wait for navigation to complete
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Get the updated tab info
          const [updatedTab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          tab.url = updatedTab.url;
        }
      }

      // Send message to background script to handle the request
      const response = await chrome.runtime.sendMessage({
        type: 'PROCESS_REQUEST',
        request,
        credentials,
        tabId: tab.id,
        url: tab.url,
        originalRequest: request,
      });

      // If successful, save to storage
      if (response.success && response.product) {
        await storage.addSuccessfulItem({
          ...response.product,
          site: response.site || selectedSite,
          originalRequest: request,
        });
      }

      setResult(response);
    } catch (error) {
      console.error('Error processing request:', error);
      setResult({
        success: false,
        message:
          'An error occurred while processing your request. Please try again.',
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
  };

  // selectedSite is now declared above in the main state

  const siteOptions = [
    {
      value: 'fake-store',
      label: 'Fake Store Demo',
      url: 'https://fake-store-demo.vercel.app/store',
    },
    {
      value: 'sauce-demo',
      label: 'Sauce Demo',
      url: 'https://www.saucedemo.com/v1/',
    },
    { value: 'custom', label: 'Custom Site', url: '' },
  ];

  // Load credentials for a site
  const loadCredentialsForSite = useCallback(
    async site => {
      try {
        const hostname = site === 'sauce-demo' ? 'saucedemo.com' : site;
        const savedCredentials = await storage.getCredentialsForSite(hostname);

        if (savedCredentials) {
          setCredentials({
            username: savedCredentials.username,
            password: savedCredentials.password,
          });
          console.log(`Loaded saved credentials for ${hostname}`);
        } else {
          // Set defaults for sauce demo
          if (site === 'sauce-demo') {
            setCredentials({
              username: 'standard_user',
              password: 'secret_sauce',
            });
          }
        }
      } catch (error) {
        console.error('Failed to load credentials:', error);
      }
    },
    [storage]
  );

  const handleSiteChange = async event => {
    const newSite = event.target.value;
    setSelectedSite(newSite);

    // Save to Chrome storage
    await storage.setTargetWebsite(newSite);

    // Load credentials for the new site
    await loadCredentialsForSite(newSite);

    // Reset state when changing target website
    setResult(null);
    setIsLoading(false);

    // If Custom is selected, open side panel and close popup
    if (newSite === 'custom') {
      try {
        // Reset the dropdown value before opening side panel
        setSelectedSite('fake-store');
        await storage.setTargetWebsite('fake-store');

        // Open side panel
        await chrome.sidePanel.open({
          windowId: (await chrome.windows.getCurrent()).id,
        });
        // Close popup
        window.close();
      } catch (error) {
        console.error('Failed to open side panel:', error);
        // Reset to fake-store if side panel opening failed
        setSelectedSite('fake-store');
        await storage.setTargetWebsite('fake-store');
      }
    }

    // Don't navigate immediately - wait for user to click "Find & Add to Cart"
  };

  return (
    <div
      className="relative h-full flex flex-col"
      style={{
        backgroundImage: 'url(/background.avif)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative z-10 h-full flex flex-col">
        <div className="backdrop-blur-xl bg-white/10 border-b border-white/20 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10  rounded-2xl flex items-center justify-center shadow-lg p-1">
                <img
                  src="/favico.png"
                  alt="Hobbes Assistant"
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">
                  Hobbes Assistant
                </h1>
                <p className="text-sm text-white/70">
                  Your automation assistant
                </p>
              </div>
            </div>

            {/* History Button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm rounded-xl transition-all duration-200 border border-white/20 hover:border-white/30 shadow-lg"
              title="View Success History"
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>History</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {showHistory ? (
            <HistoryView onBack={() => setShowHistory(false)} />
          ) : (
            <>
              <div className="mb-3">
                <label
                  htmlFor="site-selector"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Target Website
                </label>
                <select
                  id="site-selector"
                  value={selectedSite}
                  onChange={handleSiteChange}
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-200 text-sm"
                  disabled={isLoading}
                >
                  {siteOptions.map(option => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-gray-900 text-white"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSite === 'sauce-demo' && !result && (
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-lg p-3 mb-3 shadow-lg">
                  <h3 className="text-sm font-medium text-white mb-2">
                    Login Credentials
                  </h3>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label
                        htmlFor="username"
                        className="block text-xs font-medium text-white/80 mb-1"
                      >
                        Username
                      </label>
                      <input
                        id="username"
                        type="text"
                        value={credentials.username}
                        onChange={e =>
                          setCredentials(prev => ({
                            ...prev,
                            username: e.target.value,
                          }))
                        }
                        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-2 py-1.5 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-200 text-xs"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-xs font-medium text-white/80 mb-1"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={credentials.password}
                        onChange={e =>
                          setCredentials(prev => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-2 py-1.5 text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-200 text-xs"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-white/70 bg-blue-500/20 backdrop-blur-sm p-2 rounded-lg border border-blue-400/30">
                    <strong className="text-white">Users:</strong>{' '}
                    standard_user, problem_user |{' '}
                    <strong className="text-white">Pass:</strong> secret_sauce
                  </div>
                </div>
              )}

              {result ? (
                <ResultDisplay result={result} onReset={handleReset} />
              ) : (
                <RequestForm
                  onSubmit={handleRequest}
                  isLoading={isLoading}
                  selectedSite={selectedSite}
                />
              )}
            </>
          )}
        </div>

        <div className="backdrop-blur-xl bg-white/10 border-t border-white/20 px-4 py-2 flex-shrink-0">
          <p className="text-xs text-white/60 text-center">
            <span className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400/50"></div>
              <span>Current: {currentSite || 'Unknown'}</span>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
