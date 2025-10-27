import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import detectEthereumProvider from '@metamask/detect-provider';
import { toast } from 'react-toastify';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  const initializeProvider = useCallback(async () => {
    try {
      // Check if MetaMask is installed by checking window.ethereum
      if (typeof window.ethereum !== 'undefined') {
        const detectedProvider = await detectEthereumProvider({ timeout: 3000 });
        
        if (detectedProvider && detectedProvider === window.ethereum) {
          setProvider(detectedProvider);
          
          // Check if already connected
          const accounts = await detectedProvider.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            setIsConnected(true);
            
            // Get chain ID
            const chainId = await detectedProvider.request({ method: 'eth_chainId' });
            setChainId(chainId);
          }

          // Listen for account changes
          detectedProvider.on('accountsChanged', handleAccountsChanged);
          detectedProvider.on('chainChanged', handleChainChanged);
        } else {
          console.log('Multiple wallet providers detected. Please ensure MetaMask is your default wallet.');
        }
      } else {
        console.log('MetaMask not detected - window.ethereum is undefined');
      }
    } catch (error) {
      console.error('Error initializing provider:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeProvider();
  }, [initializeProvider]);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      setIsConnected(true);
    } else {
      setAccount(null);
      setIsConnected(false);
      toast.info('MetaMask disconnected');
    }
  };

  const handleChainChanged = (chainId) => {
    setChainId(chainId);
    // Reload the page when chain changes
    window.location.reload();
  };

  const connectWallet = async () => {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      // MetaMask not available - offer mock mode
      toast.warning('MetaMask not detected. Using mock wallet for development.', {
        autoClose: 3000
      });
      return connectMockWallet();
    }

    // Initialize provider if not already done
    if (!provider) {
      try {
        const detectedProvider = await detectEthereumProvider({ timeout: 3000 });
        if (detectedProvider) {
          setProvider(detectedProvider);
        } else {
          toast.warning('MetaMask not detected. Using mock wallet for development.');
          return connectMockWallet();
        }
      } catch (error) {
        toast.warning('Failed to detect MetaMask. Using mock wallet for development.');
        return connectMockWallet();
      }
    }

    const providerToUse = provider || window.ethereum;

    try {
      // Request account access
      const accounts = await providerToUse.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        setIsMockMode(false);
        
        // Get chain ID
        const chainId = await providerToUse.request({ method: 'eth_chainId' });
        setChainId(chainId);
        
        toast.success('Wallet connected successfully!');
        return { success: true, account: accounts[0] };
      } else {
        throw new Error('No accounts found');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      const message = error.message || 'Failed to connect wallet';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const connectMockWallet = () => {
    // Generate a mock Ethereum address for development
    const mockAccount = '0x' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    setAccount(mockAccount);
    setIsConnected(true);
    setIsMockMode(true);
    setChainId('0x539'); // Mock Ganache chain ID
    
    toast.success('Mock wallet connected for development! 🔧', {
      autoClose: 3000
    });
    
    return { success: true, account: mockAccount, isMock: true };
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
    setIsMockMode(false);
    toast.info('Wallet disconnected');
  };

  const signMessage = async (message) => {
    if (!provider || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, account],
      });
      
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  const switchToGanache = async () => {
    if (!provider) {
      throw new Error('MetaMask not installed');
    }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1539' }], // Ganache default chain ID (5777 in hex)
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x1539',
                chainName: 'Ganache Local',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['http://127.0.0.1:7545'],
                blockExplorerUrls: null,
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding Ganache network:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching to Ganache:', switchError);
        throw switchError;
      }
    }
  };

  const getNetworkName = (chainId) => {
    if (isMockMode) {
      return 'Mock Development Network';
    }
    
    switch (chainId) {
      case '0x1':
        return 'Ethereum Mainnet';
      case '0x3':
        return 'Ropsten Testnet';
      case '0x4':
        return 'Rinkeby Testnet';
      case '0x5':
        return 'Goerli Testnet';
      case '0x539':
      case '0x1539':
        return 'Ganache Local';
      default:
        return 'Unknown Network';
    }
  };

  const value = {
    provider,
    account,
    chainId,
    isConnected,
    isLoading,
    isMockMode,
    connectWallet,
    disconnectWallet,
    signMessage,
    switchToGanache,
    getNetworkName,
    isMetaMaskInstalled: !!provider
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};
