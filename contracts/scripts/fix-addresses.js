const { getAddress } = require("ethers");

const addresses = {
  swapExecutor: "0xD1e60637cA70C786B857452E50DE8353a01DabBb",
  feeManager: "0xD84F50DcdeC8e3E84c970d708ccbE5a3c5D68a79",
  hookReceiver: "0xE99A9fF893b3Ae1A86BCa965ddCe5e982773FF14",
  routeProcessor: "0xD039cb6B9BBaB2DE0ae0D92F1DDCb8e6a4dc88de",
  stableRouter: "0x44a0DBCAE62A90DE8E967c87Af1D670C8e0b42d0"
};

console.log("Checksummed addresses:");
for (const [key, value] of Object.entries(addresses)) {
  try {
    const checksummed = getAddress(value.toLowerCase());
    console.log(`${key}: "${checksummed}",`);
  } catch (e) {
    console.log(`${key}: ERROR - ${e.message}`);
  }
}