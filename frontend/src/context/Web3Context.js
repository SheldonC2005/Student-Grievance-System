import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    initializeProvider();
  }, []);

  const initializeProvider = async () => {
    try {
      const detectedProvider = await detectEthereumProvider();
      
      if (detectedProvider) {
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
        console.log('MetaMask not detected');
      }
    } catch (error) {
      console.error('Error initializing provider:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    if (!provider) {
      toast.error('MetaMask not installed. Please install MetaMask to continue.');
      return { success: false, error: 'MetaMask not installed' };
    }

    try {
      // Request account access
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        
        // Get chain ID
        const chainId = await provider.request({ method: 'eth_chainId' });
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

  const disconnectWallet = () => {
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
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
