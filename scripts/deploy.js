// Deploys the TipJar contract.
//
//   Local:        npx hardhat run scripts/deploy.js
//   Base Sepolia: npx hardhat run scripts/deploy.js --network baseSepolia

const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  console.log(`Deploying TipJar to network: ${network}`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${hre.ethers.formatEther(balance)} ETH`);

  const TipJar = await hre.ethers.getContractFactory("TipJar");
  const tipJar = await TipJar.deploy();
  await tipJar.waitForDeployment();

  const address = await tipJar.getAddress();
  console.log(`\n✅ TipJar deployed to: ${address}`);

  if (network === "baseSepolia") {
    console.log(`🔎 Explorer: https://sepolia.basescan.org/address/${address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
