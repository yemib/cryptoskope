import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Swal from "sweetalert2";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface NetworkInfo {
  chainId: string;
  name: string;
}

export const useWallet = () => {
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // ✅ Create provider safely
  const getProvider = () => {
    if (!window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum);
  };

  const getNetworkInfo = async (chainId: string): Promise<NetworkInfo> => {
    const networks: { [key: string]: string } = {
      '1': 'Ethereum Mainnet',
      '5': 'Goerli Testnet',
      '11155111': 'Sepolia Testnet',
      '137': 'Polygon Mainnet',
      '80001': 'Mumbai Testnet',
    };
    return {
      chainId,
      name: networks[chainId] || `Chain ID: ${chainId}`,
    };
  };

  // ✅ Updated balance using ethers
  const updateBalance = async (address: string) => {
    try {
      const provider = getProvider();
      if (!provider) return;

      const balanceWei = await provider.getBalance(address);
      const ethBalance = ethers.formatEther(balanceWei);

      setBalance(parseFloat(ethBalance).toFixed(4));
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  // ✅ Updated network using ethers
  const updateNetwork = async () => {
    try {
      const provider = getProvider();
      if (!provider) return;

      const network = await provider.getNetwork();

      const networkInfo = await getNetworkInfo(network.chainId.toString());
      setNetwork(networkInfo);
    } catch (err) {
      console.error('Error fetching network:', err);
    }
  };

  useEffect(() => {
    setIsMetaMaskInstalled(!!window.ethereum?.isMetaMask);

    const checkConnection = async () => {
      try {
        const provider = getProvider();
        if (!provider) return;

        const accounts = await provider.send('eth_accounts', []);

        if (accounts.length > 0) {
          setAccount(accounts[0]);
          updateBalance(accounts[0]);
          updateNetwork();
        }
      } catch (err) {
        console.error('Error checking connection:', err);
      }
    };

    checkConnection();

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
        updateBalance(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      if (account) {
        updateBalance(account);
        updateNetwork();
      }
    };

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [account]);

  // ✅ Connect wallet using ethers
  const connectWallet = async () => {
    if (!window.ethereum) {


      Swal.fire({
        icon: "error",
        title: "MetaMask Not Found",
        text: "Please install MetaMask to connect your wallet.",
        confirmButtonColor: "#6366f1",
      });

      
      setError('MetaMask is not installed');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const provider = getProvider();
      if (!provider) return;

      const accounts = await provider.send('eth_requestAccounts', []);

      setAccount(accounts[0]);
      updateBalance(accounts[0]);
      updateNetwork();
      setIsOpen(true);
    } catch (err) {
      setError('Failed to connect wallet');
      console.error('Error connecting wallet:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance('0');
    setNetwork(null);
    setIsOpen(false);
  };

  const toggleWalletMenu = () => {
    setIsOpen(!isOpen);
  };

  return {
    isMetaMaskInstalled,
    account,
    isConnecting,
    error,
    balance,
    network,
    isOpen,
    connectWallet,
    disconnectWallet,
    toggleWalletMenu,
  };
};