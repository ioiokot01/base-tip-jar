const hre = require("hardhat");

// Deployed TipJar on Base Sepolia.
const ADDRESS = "0x8f593359eF9F6152d993f0A2C23546872096E407";

async function main() {
  const jar = await hre.ethers.getContractAt("TipJar", ADDRESS);

  console.log("TipJar:", ADDRESS);
  console.log("Owner:", await jar.owner());
  console.log("Total tipped:", hre.ethers.formatEther(await jar.totalTips()), "ETH");
  console.log("Balance:", hre.ethers.formatEther(await jar.contractBalance()), "ETH");
  console.log("Tips count:", (await jar.tipsCount()).toString());

  const board = await jar.getLeaderboard();
  console.log("\nLeaderboard:");
  board.addrs.forEach((addr, i) => {
    console.log(`  ${addr} — ${hre.ethers.formatEther(board.amounts[i])} ETH`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
