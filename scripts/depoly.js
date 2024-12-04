const {task} = require("hardhat/config");

task("deploy", "Deploys contracts using proxy")
    .setAction(async (taskArgs, hre) => {
        console.log("network is: ", hre.network.name)
        const contractFactory = await ethers.getContractFactory("WUSDToken");
        const wusd = await upgrades.deployProxy(contractFactory, ["WUSD", "wusd"], { initializer: 'initialize' });
        await wusd.waitForDeployment();
        console.log("Proxy deployed to:", await wusd.getAddress());

        const implementationAddress = await upgrades.erc1967.getImplementationAddress(await wusd.getAddress());
        console.log("Implementation deployed to:", implementationAddress);
    });

