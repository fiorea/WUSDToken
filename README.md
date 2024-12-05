# WUSD Token Contracts

## Install Dependencies
If npx is not installed yet:

`npm install -g npx`

Install packages:

`npm i`

## Compile Contracts
`npx hardhat compile`

## Run Tests
`npx hardhat test`

current test code coverage: (use `npx hardhat coverage`)

| File         | % Stmts     | % Branch    | % Funcs     | % Lines     | Uncovered Lines |
|:------------:|:-----------:|:-----------:|:-----------:|:-----------:|:---------------:|
| contracts/   | 100         | 98.33       | 100         | 100         |                 |
| WUSD.sol     | 100         | 98.33       | 100         | 100         |                 |
------------|----------|----------|----------|----------|----------------|
| All files    | 100         | 98.33       | 100         | 100         |                 |
------------|----------|----------|----------|----------|----------------|


## Depoly Contract
Create a file `env.json` in the format of `env.json.example` and select the deployment network.
For example，select sepolia:

`npx hardhat deploy --network sepolia`

then verify the implementation contract code:

`npx hardhat verify --network sepolia [ImplementationContractAddress]`

## Upgrade Contract
Required parameter `proxy` is the proxy contract address of WUSD

`npx hardhat upgrade --network sepolia --proxy [ProxyContractAddress]`

then verify new implementation contract code:

`npx hardhat verify --network sepolia [NewImplementationContractAddress]`
