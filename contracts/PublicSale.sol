// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PublicSale is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Mi Primer Token
    // Crear su setter
    using Counters for Counters.Counter;
    Counters.Counter public _totalSupply;

    IERC20Upgradeable miPrimerToken;

    // 17 de Junio del 2023 GMT
    uint256 constant startDate = 1686960000;

    // Maximo price NFT
    uint256 constant MAX_PRICE_NFT = 50000 * 10 ** 18;

    // Gnosis Safe
    // Crear su setter
    address gnosisSafeWallet;

    uint256[] notMintedIDs;

    mapping(uint256 => bool) isMinted;

    event DeliverNft(address winnerAccount, uint256 nftId);

    // /// @custom:oz-upgrades-unsafe-allow constructor
    // constructor() {
    //     _disableInitializers();
    // }

    function initialize() public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        initializeNotMintedArray();
    }

    function purchaseNftById(uint256 _id) external {
        require(!isMinted[_id], "Public Sale: id not available");
        require(_id > 0 && _id < 31, "NFT: Token id out of range");

        // Obtener el precio segun el id
        uint256 priceNft = _getPriceById(_id);

        require(
            miPrimerToken.allowance(msg.sender, address(this)) >= priceNft,
            "Public Sale: Not enough allowance"
        );

        require(
            miPrimerToken.balanceOf(msg.sender) >= priceNft,
            "Public Sale: Not enough token balance"
        );
        // Realizar 3 validaciones:
        // 1 - el id no se haya vendido. Sugerencia: llevar la cuenta de ids vendidos
        //         * Mensaje de error: "Public Sale: id not available"
        // 2 - el msg.sender haya dado allowance a este contrato en suficiente de MPRTKN
        //         * Mensaje de error: "Public Sale: Not enough allowance"
        // 3 - el msg.sender tenga el balance suficiente de MPRTKN
        //         * Mensaje de error: "Public Sale: Not enough token balance"
        // 4 - el _id se encuentre entre 1 y 30
        //         * Mensaje de error: "NFT: Token id out of range"

        updateTokenMinted(_id);
        // Purchase fees
        // 10% para Gnosis Safe (fee)
        // 90% se quedan en este contrato (net)
        // from: msg.sender - to: gnosisSafeWallet - amount: fee
        // from: msg.sender - to: address(this) - amount: net
        uint256 fee = (priceNft * 10) / 100; // 10 %
        uint256 net = priceNft - fee;
        miPrimerToken.transferFrom(msg.sender, gnosisSafeWallet, fee);
        miPrimerToken.transferFrom(msg.sender, address(this), net);

        emit DeliverNft(msg.sender, _id);
        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
    }

    function depositEthForARandomNft() public payable {
        // Realizar 2 validaciones
        // 1 - que el msg.value sea mayor o igual a 0.01 ether
        // 2 - que haya NFTs disponibles para hacer el random
        require(
            msg.value >= 0.01 ether,
            "PublicSale: NO tiene suficiente ether 0.01"
        );
        require(notMintedIDs.length > 0, "NO hay tokens disponibles");
        // Escgoer una id random de la lista de ids disponibles
        uint256 nftId = _getRandomNftId();

        // Enviar ether a Gnosis Safe
        // SUGERENCIA: Usar gnosisSafeWallet.call para enviar el ether
        // Validar los valores de retorno de 'call' para saber si se envio el ether correctamente
        updateTokenMinted(nftId);
        // Dar el cambio al usuario
        // El vuelto seria equivalente a: msg.value - 0.01 ether
        if (msg.value > 0.01 ether) {
            uint256 vuelto = msg.value - 0.01 ether;
            payable(msg.sender).transfer(vuelto);
            // logica para dar cambio
            // usar '.transfer' para enviar ether de vuelta al usuario
        }
        call(gnosisSafeWallet,0.01 ether);
        

        // EMITIR EVENTO para que lo escuche OPEN ZEPPELIN DEFENDER
        emit DeliverNft(msg.sender, nftId);
    }

    function setGnosisSafeWallet(
        address _safeWallet
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        gnosisSafeWallet = _safeWallet;
    }

    function setTokenAddress(
        address _tknAdress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        miPrimerToken = IERC20Upgradeable(_tknAdress);
    }

    // Crear el metodo receive
    receive() external payable {
        depositEthForARandomNft();
    }

    ////////////////////////////////////////////////////////////////////////
    /////////                    Helper Methods                    /////////
    ////////////////////////////////////////////////////////////////////////

    function initializeNotMintedArray() internal {
        for (uint i = 1; i <= 30; i++) {
            notMintedIDs.push(i);
        }
    }

    function updateTokenMinted(uint256 _id) internal {
        _removeIDnotMinted(_id);
        isMinted[_id] = true;
        
        _totalSupply.increment();
    }

    function _removeIDnotMinted(uint256 _id) internal {
        for (uint i = 0; i < notMintedIDs.length; i++) {
            if (notMintedIDs[i] == _id) {
                notMintedIDs[i] = notMintedIDs[notMintedIDs.length - 1];
                notMintedIDs.pop();
                break;
            }
        }
    }

    // Devuelve un id random de NFT de una lista de ids disponibles
    function _getRandomNftId() internal view returns (uint256) {
        uint256 len = notMintedIDs.length;
        require(len > 0, "No hay token disponibles");
        uint256 ramdom = (uint(
            keccak256(abi.encodePacked(block.difficulty, block.timestamp))
        ) % len);

        return notMintedIDs[ramdom];
    }

    // Según el id del NFT, devuelve el precio. Existen 3 grupos de precios
    function _getPriceById(uint256 _id) internal view returns (uint256) {
        uint256 priceGroupOne = 500 * 10 ** decimals();
        uint256 priceGroupTwo = 1000 * 10 ** decimals();
        uint256 priceGroupThree;
        if (_id > 0 && _id < 11) {
            return priceGroupOne;
        } else if (_id > 10 && _id < 21) {
            return _id * priceGroupTwo;
        } else {
            uint256 BASE = 10_000;
            uint256 MAX = 50_000;

            uint256 hoursPassed =(block.timestamp - startDate)/ 60 / 60;

            priceGroupThree = hoursPassed * 1000;
            if (priceGroupThree > MAX) {
                return MAX * 10 ** decimals();
            }
            if (priceGroupThree < BASE) return BASE * 10 ** decimals();
            return priceGroupThree * 10 ** decimals();
        }
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function decimals() public pure returns (uint8) {
        return 18;
    }

    function call(address _scAddress, uint256 _amount) internal {
        (bool success,) = payable(_scAddress).call{
            value: _amount,
            gas: 5000000
        }("");
        // error indica el error por el cual fallo
        require(success, "No se completo pago a gnosis");
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}