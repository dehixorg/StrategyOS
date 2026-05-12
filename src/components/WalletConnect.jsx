import { useState, useEffect } from 'react'
import { toast } from '../lib/toast.jsx'

export default function WalletConnect({ onConnect }) {
  const [address, setAddress] = useState(() => localStorage.getItem('walletAddress') || '')
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    // Auto-detect if MetaMask already connected
    if (window.ethereum && !address) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
        if (accounts[0]) {
          setAddress(accounts[0])
          localStorage.setItem('walletAddress', accounts[0])
          onConnect?.(accounts[0])
        }
      }).catch(() => {})
    }
  }, [])

  const connect = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask not detected. Install MetaMask to connect your wallet.')
      return
    }
    setConnecting(true)
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const account = accounts[0]
      setAddress(account)
      localStorage.setItem('walletAddress', account)
      onConnect?.(account)
      toast.success(`Wallet connected: ${account.slice(0, 6)}...${account.slice(-4)}`)

      // Ask to switch to ValueChain testnet (chainId 138565 = 0x21DA5)
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x21DA5' }],
        })
      } catch (switchErr) {
        // Chain not added yet — add it
        if (switchErr.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x21DA5',
                chainName: 'ValueChain Testnet',
                nativeCurrency: { name: 'SOSO', symbol: 'SOSO', decimals: 18 },
                rpcUrls: ['https://testnet-gw.sodex.dev'],
                blockExplorerUrls: ['https://testnet.sodex.com'],
              }],
            })
            toast.info('ValueChain testnet added to MetaMask.')
          } catch {
            toast.info('Connected. Add ValueChain manually to MetaMask for on-chain features.')
          }
        }
      }
    } catch (err) {
      if (err.code !== 4001) toast.error('Wallet connection failed.')
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = () => {
    setAddress('')
    localStorage.removeItem('walletAddress')
    onConnect?.(null)
    toast.info('Wallet disconnected.')
  }

  if (address) {
    return (
      <button
        onClick={disconnect}
        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-xs font-mono px-3 py-1.5 rounded-lg transition-colors"
        title="Click to disconnect"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    )
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
    >
      {connecting ? (
        <>
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Connecting...
        </>
      ) : (
        <>🦊 Connect Wallet</>
      )}
    </button>
  )
}
