const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { utils } = ethers;

describe("WUSDToken", function () {
    let wusd;
    let owner;
    let user1;
    let user2;
    let user3;
    const minter1 = ethers.encodeBytes32String("minter1");
    const minter2 = ethers.encodeBytes32String("minter2");
    const minter3 = ethers.encodeBytes32String("minter3");

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();
        const WUSDToken = await ethers.getContractFactory("WUSDToken");
        wusd = await upgrades.deployProxy(WUSDToken, ["WUSD", "wusd"], {
            initializer: "initialize",
        });

        await wusd.waitForDeployment();
    });

    it("Should deploy with correct initial state", async function () {
        await expect(wusd.initialize("WUSD", "wusd"))
            .to.be.revertedWithCustomError(wusd, "InvalidInitialization");

        expect(await wusd.owner()).to.equal(owner.address);
        expect(await wusd.name()).to.equal("WUSD");
        expect(await wusd.symbol()).to.equal("wusd");
        expect(await wusd.decimals()).to.equal(6n);
        expect(await wusd.totalSupply()).to.equal(0n);
    });

    it("Should manage minters correctly", async function () {
        expect(await wusd.minters(minter1)).to.equal(false);
        await wusd.addMinter(minter1);
        expect(await wusd.minters(minter1)).to.equal(true);

        await expect(wusd.addMinter(minter2))
            .to.emit(wusd, "AddMinter")
            .withArgs(minter2);

        await expect(wusd.addMinter(ethers.ZeroHash))
            .to.be.revertedWith("zero address");

        await expect(wusd.connect(user1).addMinter(minter2))
            .to.be.revertedWithCustomError(wusd, "OwnableUnauthorizedAccount")

        await wusd.pause()
        await expect(wusd.addMinter(minter2))
            .to.be.revertedWithCustomError(wusd, "EnforcedPause");
    });

    it("Should mint tokens correctly", async function () {
        await wusd.addMinter(minter1);
        const amount1 = 1000000;

        await wusd.mint(minter1, amount1, ethers.ZeroAddress);
        expect(Number(await wusd.balanceOf(owner.address))).to.equal(amount1);
        expect(Number(await wusd.balanceOfMinter(owner.address, minter1))).to.equal(amount1);
        expect(Number(await wusd.totalBalancesOfMinter(minter1))).to.equal(amount1);
        expect(Number(await wusd.totalSupply())).to.equal(amount1);

        await wusd.addMinter(minter2);
        const amount2 = 200000;
        await wusd.mint(minter2, amount2, user1.address);
        expect(Number(await wusd.balanceOf(user1.address))).to.equal(amount2);
        expect(Number(await wusd.balanceOfMinter(user1.address, minter2))).to.equal(amount2);
        expect(Number(await wusd.totalBalancesOfMinter(minter2))).to.equal(amount2);
        expect(Number(await wusd.totalSupply())).to.equal(amount1 + amount2);

        await expect(wusd.mint(minter3, amount1, owner.address))
            .to.be.revertedWith("not minter address");

        await expect(wusd.mint(minter1, 0, owner.address))
            .to.be.revertedWith("zero amount");

        await expect(wusd.addMinter(minter1))
            .to.be.revertedWith("already minter");

        await expect(wusd.connect(user1).mint(minter1, amount1, user2.address))
            .to.be.revertedWithCustomError(wusd, "OwnableUnauthorizedAccount");

        await wusd.pause()
        await expect(wusd.mint(minter1, amount1, user1.address))
            .to.be.revertedWithCustomError(wusd, "EnforcedPause");
    });

    it("Should burn tokens correctly", async function () {
        await wusd.addMinter(minter1);
        const mintAmount = 1000000;
        await wusd.mint(minter1, mintAmount, owner.address);

        const burnAmount = 500000;
        await wusd.burn(minter1, burnAmount);

        expect(Number(await wusd.balanceOf(owner.address))).to.equal(mintAmount - burnAmount);
        expect(Number(await wusd.balanceOfMinter(owner.address, minter1))).to.equal(mintAmount - burnAmount);
        expect(Number(await wusd.totalBalancesOfMinter(minter1))).to.equal(mintAmount - burnAmount);
        expect(Number(await wusd.totalSupply())).to.equal(mintAmount - burnAmount);

        await expect(wusd.burn(minter1, mintAmount + 1))
            .to.be.revertedWith("burn amount exceeds balance");

        await expect(wusd.burn(minter1, 0))
            .to.be.revertedWith("zero amount");

        await expect(wusd.connect(user1).burn(minter1, mintAmount))
            .to.be.revertedWithCustomError(wusd, "OwnableUnauthorizedAccount");

        await wusd.pause()
        await expect(wusd.burn(minter1, mintAmount))
            .to.be.revertedWithCustomError(wusd, "EnforcedPause");
    });

    it("Should handle approvals correctly", async function () {
        const amount = 1000000;
        await wusd.approve(user1.address, amount);
        expect(Number(await wusd.allowance(owner.address, user1.address))).to.equal(amount);

        await wusd.increaseAllowance(user1.address, amount);
        expect(Number(await wusd.allowance(owner.address, user1.address))).to.equal(amount * 2);

        await wusd.decreaseAllowance(user1.address, amount);
        expect(Number(await wusd.allowance(owner.address, user1.address))).to.equal(amount);

        await expect(wusd.decreaseAllowance(user1.address, amount * 2))
            .to.be.revertedWith("decreased allowance below zero");

        await wusd.approve(user2.address, amount);
        await expect(wusd.connect(user2).transferFrom(owner.address, user3.address, amount + 1))
            .to.be.revertedWith("insufficient allowance");


        await expect(wusd.approve(ethers.ZeroAddress, amount))
            .to.be.revertedWith("approve to the zero address");

        await wusd.pause()
        await expect(wusd.approve(user1.address, amount))
            .to.be.revertedWithCustomError(wusd, "EnforcedPause");

        await expect(wusd.decreaseAllowance(user1.address, amount))
            .to.be.revertedWithCustomError(wusd, "EnforcedPause");

        await expect(wusd.increaseAllowance(user1.address, amount))
            .to.be.revertedWithCustomError(wusd, "EnforcedPause");
    });

    it("Should handle transfers correctly with single and multiple minters", async function () {
        await wusd.addMinter(minter1);
        await wusd.addMinter(minter2);

        // Mint with first minter
        await wusd.mint(minter1, 1000000, ethers.ZeroAddress);

        // Single minter transfer
        await wusd.transfer(user1.address, 500000);
        expect(Number(await wusd.balanceOf(user1.address))).to.equal(500000);
        expect(Number(await wusd.balanceOfMinter(user1.address, minter1))).to.equal(500000);

        // Mint with second minter
        await wusd.mint(minter2, 2000000, owner.address);

        // Multiple minter transfer
        await wusd.transfer(user2.address, 1500000);
        expect(Number(await wusd.balanceOf(user2.address))).to.equal(1500000);
        expect(Number(await wusd.balanceOfMinter(user2.address, minter1))).to.equal(500000);
        expect(Number(await wusd.balanceOfMinter(user2.address, minter2))).to.equal(1000000);

        // Test insufficient balance
        await expect(wusd.transfer(user1.address, 4000000))
            .to.be.revertedWith("transfer amount exceeds balance");
    });

    it("Should handle transferFrom functionality correctly", async function () {
        await wusd.addMinter(minter1);
        await wusd.mint(minter1, 1000000, owner.address);

        // transferFrom
        await wusd.approve(user1.address, 500000);
        await wusd.connect(user1).transferFrom(owner.address, user3.address, 500000);
        expect(Number(await wusd.balanceOf(owner.address))).to.equal(500000);

        const maxUint256 = ethers.MaxUint256;
        await wusd.approve(user1.address, maxUint256);
        expect(await wusd.allowance(owner.address, user1.address)).to.equal(maxUint256);
        await wusd.connect(user1).transferFrom(owner.address, user3.address, 500000);
        expect(await wusd.allowance(owner.address, user1.address)).to.equal(maxUint256);


    });

    it("Should handle pause functionality correctly", async function () {
        await wusd.addMinter(minter1);
        await wusd.mint(minter1, 1000000, owner.address);

        await wusd.pause();

        await expect(wusd.transfer(user1.address, 100))
            .to.be.revertedWithCustomError(wusd, "EnforcedPause");
        await expect(wusd.transferFrom(owner.address, user2.address, 500000))
            .to.be.revertedWithCustomError(wusd, "EnforcedPause");


        await wusd.unpause();
        await wusd.transfer(user1.address, 100);
        expect(await wusd.balanceOf(user1.address)).to.equal(100n);

        await expect(wusd.connect(user1).pause())
            .to.be.revertedWithCustomError(wusd, "OwnableUnauthorizedAccount")
            .withArgs(user1.address);

        await expect(wusd.connect(user1).unpause())
            .to.be.revertedWithCustomError(wusd, "OwnableUnauthorizedAccount");
    });

    it("Should handle upgrades correctly", async function () {
        const proxyAddress = await wusd.getAddress();
        const WUSDToken = await ethers.getContractFactory("WUSDToken");

        await expect(
            upgrades.upgradeProxy(proxyAddress, WUSDToken)
        ).to.not.be.reverted;

        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

        await expect(wusd.connect(user1).upgradeToAndCall(newImplementationAddress, "0x"))
            .to.be.revertedWithCustomError(wusd, "OwnableUnauthorizedAccount");

    });
});