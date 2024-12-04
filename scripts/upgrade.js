const {task} = require("hardhat/config");

task("upgrade", "upgrade contracts using proxy")
    .addParam("proxy", "The proxy contract address")
    .setAction(async (taskArgs, hre) => {
        const proxyAddress = taskArgs.proxy;
        const contractFactory = await ethers.getContractFactory("WUSDToken");

        const upgraded = await upgrades.upgradeProxy(proxyAddress, contractFactory, { kind: "uups" });
        console.log("Proxy is:", await upgraded.getAddress());
        await upgraded.deployTransaction.wait(1);

        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        console.log("New implementation deployed to:", newImplementationAddress);
    });