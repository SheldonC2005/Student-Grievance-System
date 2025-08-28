# Ganache Integration Guide

This guide explains how to integrate Ganache with the Student Grievance System.

## 🚀 Quick Start

### **Step 1: Install Ganache**

**Option A: Ganache GUI (Recommended)**

1. Download from [https://trufflesuite.com/ganache/](https://trufflesuite.com/ganache/)
2. Install and run
3. Default settings work fine (Port: 7545)

**Option B: Ganache CLI**

```bash
npm install -g ganache-cli
ganache-cli
```

### **Step 2: Configure MetaMask for Ganache**

1. **Open MetaMask**
2. **Click Network Dropdown** → "Add Network"
3. **Enter Ganache Details**:

   - Network Name: `Ganache Local`
   - RPC URL: `http://127.0.0.1:7545` (GUI) or `http://127.0.0.1:8545` (CLI)
   - Chain ID: `1337`
   - Currency Symbol: `ETH`

4. **Import Test Account**:
   - Copy private key from Ganache
   - MetaMask → Import Account → Paste private key

## 🔧 Configuration Options

### **Option 1: MetaMask + Ganache (Current Setup)**

Your current Web3Context.js already supports this! Just:

1. Add Ganache network to MetaMask (steps above)
2. Switch to Ganache network in MetaMask
3. Import a test account from Ganache
4. Your app will automatically connect

### **Option 2: Direct Ganache Connection**

For testing without MetaMask, add this to your Web3Context:

```javascript
// Add to Web3Context.js
const connectToGanache = async () => {
  try {
    const Web3 = require("web3");
    const ganacheProvider = new Web3.providers.HttpProvider(
      "http://127.0.0.1:7545"
    );
    const web3 = new Web3(ganacheProvider);

    // Get accounts
    const accounts = await web3.eth.getAccounts();

    setProvider(ganacheProvider);
    setAccount(accounts[0]);
    setIsConnected(true);
    setChainId("0x539"); // 1337 in hex

    toast.success("Connected to Ganache");
  } catch (error) {
    console.error("Ganache connection failed:", error);
    toast.error("Failed to connect to Ganache");
  }
};
```

## 🧪 Testing Setup

### **Test Accounts (Ganache Default)**

Ganache provides 10 accounts with 100 ETH each:

- Account 1: `0x...` (Use for admin)
- Account 2: `0x...` (Use for student 1)
- Account 3: `0x...` (Use for student 2)
- etc.

### **Smart Contract Deployment**

1. **Start Ganache**
2. **Deploy your contracts**:
   ```bash
   truffle migrate --network ganache
   ```
3. **Update contract addresses** in your frontend

## 🛠️ Development Workflow

### **Daily Development**

1. Start Ganache (`ganache-cli` or GUI)
2. Switch MetaMask to Ganache network
3. Run your app (`npm run dev`)
4. Test transactions with free test ETH

### **Reset Blockchain State**

- Ganache GUI: Click "Restart"
- Ganache CLI: Stop (`Ctrl+C`) and restart
- Redeploy contracts after restart

## 🔍 Debugging

### **Common Issues**

**"MetaMask not connecting"**

- Check if Ganache is running
- Verify network settings in MetaMask
- Try switching networks and back

**"Transaction failed"**

- Check if you have enough test ETH
- Verify contract is deployed to current network
- Check Ganache logs for errors

**"Wrong network"**

- MetaMask might be on wrong network
- Switch to your Ganache network
- Refresh the app

### **Verification Commands**

```bash
# Check if Ganache is running
curl http://127.0.0.1:7545

# Check accounts
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' \
  http://127.0.0.1:7545
```

## 📊 Benefits of Ganache

✅ **Free Testing**: Unlimited transactions with test ETH  
✅ **Fast**: Instant mining, no waiting for confirmations  
✅ **Predictable**: Same accounts and state every restart  
✅ **Debugging**: Full transaction history and logs  
✅ **No Internet**: Works completely offline

## 🚀 Production Considerations

- **Development**: Use Ganache for local testing
- **Staging**: Use testnets (Goerli, Sepolia)
- **Production**: Use Ethereum mainnet

## 🔗 Resources

- [Ganache Documentation](https://trufflesuite.com/docs/ganache/)
- [MetaMask Custom Networks](https://metamask.zendesk.com/hc/en-us/articles/360043227612)
- [Web3.js Documentation](https://web3js.readthedocs.io/)
