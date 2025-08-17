const { ethers } = require("ethers");

const addresses = [
  "0x0c92FD9e86154cDcAE09f6F155fAdDcb27Bf7dD9", // PYUSD Arbitrum
  "0xCfA3Ef56d303AE4fAabA0592388F19d7C3399FB4", // PYUSD Base
  "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34"  // USDe
];

console.log("Fixed checksums:");
addresses.forEach(addr => {
  console.log(`${addr} -> ${ethers.getAddress(addr.toLowerCase())}`);
});