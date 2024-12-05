// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

contract WUSDToken is IERC20Metadata, PausableUpgradeable, Ownable2StepUpgradeable, UUPSUpgradeable {
    mapping(address => mapping(bytes32 => uint256)) private _balancesOfMinter;
    mapping(bytes32 => uint256) public totalBalancesOfMinter;
    bytes32[] public minterAddresses;
    mapping(bytes32 => bool) public minters;

    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    /**
     * @dev Emitted when `value` tokens are minted belong to `minter`.
     */
    event Mint(bytes32 indexed minter, uint256 value);

    /**
     * @dev Emitted when destroy `value` amount of tokens belong to `minter`.
     */
    event Burn(bytes32 indexed minter, uint256 value);

    /**
     * @dev Emitted when set new `minter`.
     */
    event AddMinter(bytes32 indexed minter);

    function initialize(string memory name_, string memory symbol_) public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
        _name = name_;
        _symbol = symbol_;
        _decimals = 6;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view override returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the name.
     */
    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) public view returns (uint256) {
        uint256 balance;
        uint256 mintersCount = minterAddresses.length;
        for (uint256 i = 0; i < mintersCount; ) {
            balance += _balancesOfMinter[account][minterAddresses[i]];
            unchecked {
                ++i;
            }
        }
        return balance;
    }

    /**
     * @dev Returns the value of tokens belong to 'minter' owned by `account`.
     */
    function balanceOfMinter(address account, bytes32 minter) public view returns (uint256) {
        return _balancesOfMinter[account][minter];
    }

    /**
     * @dev Set new 'minter'
     *
     * Requirements:
     *
     * - `minter` cannot be the zero bytes.
     */
    function addMinter(bytes32 minter) external whenNotPaused onlyOwner {
        require(minter != bytes32(0), "zero address");
        require(!minters[minter], "already minter");
        minterAddresses.push(minter);
        minters[minter] = true;
        emit AddMinter(minter);
    }

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) public view returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) public whenNotPaused returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public whenNotPaused returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, allowance(owner, spender) + addedValue);
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public whenNotPaused returns (bool) {
        address owner = _msgSender();
        uint256 currentAllowance = allowance(owner, spender);
        require(currentAllowance >= subtractedValue, "decreased allowance below zero");
        unchecked {
            _approve(owner, spender, currentAllowance - subtractedValue);
        }
        return true;
    }

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) public whenNotPaused returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) public whenNotPaused returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address _from, address _to, uint256 _value) internal {
        uint256 remainingAmount = _value;
        uint256 mintersCount = minterAddresses.length;
        for (uint256 i = 0; i < mintersCount; ) {
            bytes32 minterAddress = minterAddresses[i];
            uint256 balancesOfMinter = _balancesOfMinter[_from][minterAddress];
            if (balancesOfMinter > 0) {
                if (balancesOfMinter >= remainingAmount) {
                    unchecked {
                        _balancesOfMinter[_from][minterAddress] -= remainingAmount;
                        // Overflow not possible: balance is at most totalSupply, which we know fits into a uint256.
                        _balancesOfMinter[_to][minterAddress] += remainingAmount;
                        remainingAmount = 0;
                    }
                    break;
                } else {
                    unchecked {
                        _balancesOfMinter[_from][minterAddress] = 0;
                        _balancesOfMinter[_to][minterAddress] += balancesOfMinter;
                        remainingAmount -= balancesOfMinter;
                    }
                }
            }
            unchecked {
                ++i;
            }
        }
        require(remainingAmount == 0, "transfer amount exceeds balance");
        emit Transfer(_from, _to, _value);
    }

    /**
     * @dev Variant of {_approve} with an optional flag to enable or disable the {Approval} event.
     *
     * By default (when calling {_approve}) the flag is set to true. On the other hand, approval changes made by
     * `_spendAllowance` during the `transferFrom` operation set the flag to false. This saves gas by not emitting any
     * `Approval` event during `transferFrom` operations.
     *
     * Requirements are the same as {_approve}.
     */
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "approve from the zero address");
        require(spender != address(0), "approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Updates `owner` s allowance for `spender` based on spent `amount`.
     *
     * Does not update the allowance value in case of infinite allowance.
     * Revert if not enough allowance is available.
     *
     * Does not emit an {Approval} event.
     */
    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    /**
     * @dev Creates a `value` amount of tokens and set minter to `minter`, transfer it to owner if `to` is zero address
     * or transfer to `to`.
     *
     * Emits a {Mint} event.
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     */
    function mint(bytes32 minter, uint256 value, address to) public whenNotPaused onlyOwner {
        require(value > 0, "zero amount");
        require(minters[minter], "not minter address");
        address user;
        if (to == address(0)) {
            user = owner();
        } else {
            user = to;
        }
        unchecked {
            // note: don't need an overflow check here because balance <= totalSupply and there is an overflow check below
            _balancesOfMinter[user][minter] += value;
            totalBalancesOfMinter[minter] += value;
        }
        _totalSupply += value;

        emit Mint(minter, value);
        emit Transfer(owner(), user, value);
    }

    /**
     * @dev Destroys a `value` amount of tokens from `account`, lowering the total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     * Emits a {Burn} event
     *
     */
    function burn(bytes32 minter, uint256 value) public whenNotPaused onlyOwner {
        require(value > 0, "zero amount");
        require(_balancesOfMinter[owner()][minter] >= value, "burn amount exceeds balance");

        unchecked {
            // note: don't need overflow checks because require(balance >= value) and balance <= _totalSupply
            _balancesOfMinter[owner()][minter] -= value;
            totalBalancesOfMinter[minter] -= value;
            _totalSupply -= value;
        }

        emit Transfer(owner(), address(0), value);
        emit Burn(minter, value);
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
