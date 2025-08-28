const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting ComplaintRegistry deployment...");
  
  // Get the contract factory
  const ComplaintRegistry = await ethers.getContractFactory("ComplaintRegistry");
  
  // Deploy the contract
  console.log("📄 Deploying ComplaintRegistry contract...");
  const complaintRegistry = await ComplaintRegistry.deploy();
  
  // Wait for deployment to complete
  await complaintRegistry.waitForDeployment();
  
  const contractAddress = await complaintRegistry.getAddress();
  
  console.log("✅ ComplaintRegistry deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  
  // Get deployer info
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployed by:", deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const totalComplaints = await complaintRegistry.getTotalComplaints();
  const admin = await complaintRegistry.admin();
  
  console.log("📊 Initial total complaints:", totalComplaints.toString());
  console.log("👑 Contract admin:", admin);
  
  // Save deployment info for frontend
  const deploymentInfo = {
    contractAddress: contractAddress,
    deployedAt: new Date().toISOString(),
    network: "ganache",
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber()
  };
  
  // Write deployment info to file
  const fs = require('fs');
  const path = require('path');
  
  const deploymentPath = path.join(__dirname, '../blockchain/deployment.json');
  
  // Create blockchain directory if it doesn't exist
  const blockchainDir = path.dirname(deploymentPath);
  if (!fs.existsSync(blockchainDir)) {
    fs.mkdirSync(blockchainDir, { recursive: true });
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentPath);
  
  // Copy ABI for frontend
  const artifactPath = path.join(__dirname, '../artifacts/contracts/ComplaintRegistry.sol/ComplaintRegistry.json');
  const frontendAbiPath = path.join(__dirname, '../frontend/src/contracts/ComplaintRegistry.json');
  
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // Create contracts directory in frontend
    const frontendContractsDir = path.dirname(frontendAbiPath);
    if (!fs.existsSync(frontendContractsDir)) {
      fs.mkdirSync(frontendContractsDir, { recursive: true });
    }
    
    // Save ABI and contract info for frontend
    const frontendContractInfo = {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      contractAddress: contractAddress,
      deploymentInfo: deploymentInfo
    };
    
    fs.writeFileSync(frontendAbiPath, JSON.stringify(frontendContractInfo, null, 2));
    console.log("📄 Contract ABI copied to frontend:", frontendAbiPath);
  }
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("🔗 You can now use the contract at:", contractAddress);
  console.log("📚 Check the frontend/src/contracts/ directory for ABI and contract info");
  
  return contractAddress;
}

// Handle deployment errors
main()
  .then((contractAddress) => {
    console.log("\n✅ All done! Contract deployed at:", contractAddress);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
