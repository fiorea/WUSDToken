require("@nomicfoundation/hardhat-verify")
require("@nomicfoundation/hardhat-chai-matchers");
require('@openzeppelin/hardhat-upgrades');
require("solidity-coverage");

const {
  MAINNET_URL,
  MAINNET_DEPLOY_KEY,
  MAINNET_API_KEY,
  SEPOLIA_URL,
  SEPOLIA_DEPLOY_KEY,
  SEPOLIA_API_KEY
} = require("./env.json")

require("./scripts/depoly.js");
require("./scripts/upgrade.js");


// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    mainnet: {
      url: MAINNET_URL,
      gasPrice: 50000000000,
      accounts: [MAINNET_DEPLOY_KEY]
    },
    sepolia: {
      url: SEPOLIA_URL,
      gasPrice: 10000000000,
      accounts: [SEPOLIA_DEPLOY_KEY]
    }
  },
  etherscan: {
    apiKey: {
      mainnet: MAINNET_API_KEY,
      sepolia: SEPOLIA_API_KEY
    },
    enabled: true
  },
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
  sourcify: {
    enabled: false
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v6",
  },
}
