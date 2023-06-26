
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlCrossChainUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


contract MiPrimerNft is
    Initializable,
    ERC721Upgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    ERC721BurnableUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    using Strings for uint256;

contract Counters {
    uint256 private _counter;

    function current() internal view returns (uint256) {
        return _counter;
    }

    function increment() internal returns (uint256) {
        return _counter++;
    }
}
    function initialize(string memory _name,string memory _symbol) public initializer {
        __ERC721_init(_name, _symbol);
        __Pausable_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE,msg.sender);
        

    }


    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://QmWU4yb225aTpyWkBQKAffjLaPhFKyWYiiPKbUvJPx6eou/";
    }

    function tokenURI  (uint256 tokenId) public pure override returns(string memory) {
        string memory baseURI = _baseURI();
        return string(
            abi.encodePacked(baseURI, tokenId.toString(),".json")
        );
    }

    function pause() public {
        _pause();
    }

    function unpause() public {
        _unpause();
    }

    function safeMint(address to, uint256 id) public onlyRole(MINTER_ROLE){
        require(id < 31 && id > 0, "NFT: Token id out of range");
        require(!_exists(id), "Public Sale: Token has been already minted");
        // Se hacen dos validaciones
        // 1 - Dicho id no haya sido acuñado antes
        // 2 - Id se encuentre en el rando inclusivo de 1 a 30
        //      * Mensaje de error: "Public Sale: id must be between 1 and 30"
        _safeMint(to,id);
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(AccessControlUpgradeable, ERC721Upgradeable)
        returns (bool)
    {}

    function _authorizeUpgrade(
        address newImplementation
    ) internal virtual override onlyRole(UPGRADER_ROLE) {}
}