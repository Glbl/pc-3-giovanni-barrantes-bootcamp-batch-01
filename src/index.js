import { BigNumber, Contract, providers, ethers, utils } from "ethers";
import tokens from "./tokens.json";
import Swal from 'sweetalert2';

const nftTknAbi = require("../artifacts/contracts/NFT.sol/MiPrimerNft.json").abi;
const publicSaleAbi = require("../artifacts/contracts/PublicSale.sol/PublicSale.json").abi;
const usdcTknAbi = require("../artifacts/contracts/USDCoin.sol/USDCoin.json").abi;
const miPrimerTknAbi = require("../artifacts/contracts/MiPrimerToken.sol/MiPrimerToken.json").abi;

window.ethers = ethers;


let provider, signer, account;
let usdcTkContract, miPrTokenContract, nftTknContract, pubSContract;

// REQUIRED
// Conectar con metamask
function initSCsGoerli() {
  provider = new providers.Web3Provider(window.ethereum);

  const usdcAddress = tokens.usdc;
  const miPrTknAdd = tokens.miPrTkn;
  const pubSContractAdd = tokens.publicSale;

  // Usando Ethers
  // Contract = address + abi + provider

  usdcTkContract = new Contract(usdcAddress, usdcTknAbi, provider);
  miPrTokenContract = new Contract(miPrTknAdd, miPrimerTknAbi, provider);
  pubSContract = new Contract(pubSContractAdd, publicSaleAbi, provider);
}

// OPTIONAL
// No require conexion con Metamask
// Usar JSON-RPC
// Se pueden escuchar eventos de los contratos usando el provider con RPC
async function initSCsMumbai() {
  console.log("Mumbai init")
  const jsonRpcUrl = "https://polygon-mumbai.g.alchemy.com/v2/EtQxmgdb-6OUXhZwXo0VAF-qgMZEcoyh";
  const providerMumbai = new ethers.providers.JsonRpcProvider(jsonRpcUrl);
  //const balance = await providerMumbai.getBalance("0xb1f6d2b76af9a8392205f1d1ce1e418ac3843533");
  //console.log(ethers.utils.formatEther(balance));

  const nftAddress = tokens.nftToken;
  nftTknContract = new Contract(nftAddress, nftTknAbi, providerMumbai);
  await setUpEventsContracts();

}

function setUpListeners() {
  // Connect to Metamask
  const usdcUpdatebtn = document.getElementById("usdcUpdate");
  const usdcBalance = document.getElementById("usdcBalance")

  const miPrimerTknUpdatebtn = document.getElementById("miPrimerTknUpdate");
  const miPrimerTknBalance = document.getElementById("miPrimerTknBalance");

  const approveButton = document.getElementById("approveButton");
  const approveInput = document.getElementById("approveInput");
  const approveError = document.getElementById("approveError");

  const purchaseButton = document.getElementById("purchaseButton");
  const purchaseError = document.getElementById("purchaseError");
  const purchaseInput = document.getElementById("purchaseInput");

  const purchaseEthButton = document.getElementById("purchaseEthButton");
  const purchaseEthError = document.getElementById("purchaseEthError");

  const sendEtherButton = document.getElementById("sendEtherButton");
  const sendEtherInput = document.getElementById("sendEtherInput");
  const sendEtherError = document.getElementById("sendEtherError");

  usdcUpdatebtn.addEventListener("click", async () => {
    try {
      const response = await usdcTkContract
        .balanceOf(account)
      if (!isNaN(response)) {
        usdcBalance.innerHTML = utils.formatUnits(BigNumber.from(response),6 ) ?? "No tiene Balance"
      } else {
        usdcBalance.innerHTML = "No tiene Balance"
      }
      
    } catch (error) {
      console.log(error);
    }
  })

  miPrimerTknUpdatebtn.addEventListener("click", async () => {
    try {
      const res = await miPrTokenContract
        .balanceOf(account)
      if (!isNaN(res)) {
        miPrimerTknBalance.innerHTML = utils.formatEther(res) ?? "No tiene Balance"
      } else {
        miPrimerTknBalance.innerHTML = "No tiene Balance"
      }


    } catch (error) {
      console.log(error);
    }
  })

  approveButton.addEventListener("click", async () => {
    try {
      if (isNaN(approveInput.value)) {
        approveError.innerHTML = 'Invalid input: not a number';
        console.error('Invalid input: not a number');

      } else {
        const amount = parseInt(approveInput.value, 10);
        console.log(amount)
        const tx = await miPrTokenContract
          .connect(signer)
          .approve(tokens.publicSale, BigNumber.from(amount).mul(BigNumber.from(10).pow(18)));

        const response = await tx.wait()
        console.log(response.transactionHash)
        Swal.fire({
          title: 'Successully Approval!',
          text: `txHASH: ${response.transactionHash}`,
          icon: 'success',
          confirmButtonText: 'Cool'
        })
      }
    } catch (error) {
      approveError.innerHTML = error.reason;
      console.log(error);
    }
  })


  purchaseButton.addEventListener("click", async () => {
    try {
      const id = purchaseInput.value;
      if (isNaN(id)) {
        purchaseError.innerHTML = 'Invalid input: not a number';
        console.error('Invalid input: not a number');
      } else {

        console.log(id)
        const tx = await pubSContract
          .connect(signer)
          .purchaseNftById(id);

        const response = await tx.wait()
        console.log(response.transactionHash)
        Swal.fire({
          title: 'Successully Purchase NFT!',
          text: `Congrats!NFT id : ${id} txHASH: ${response.transactionHash}`,
          icon: 'success',
          confirmButtonText: 'Cool'
        })
      }

    } catch (error) {
      purchaseError.innerHTML = error.reason;
      console.log(error);
    }
  })

  purchaseEthButton.addEventListener("click", async () => {
    try {
      let op = {
        // Opciones de la transacción
        value: ethers.utils.parseEther('0.01'), // Enviar 1 ETH
      };
      const tx = await pubSContract
        .connect(signer)
        .depositEthForARandomNft(op);

      const response = await tx.wait()
      console.log(response.transactionHash)
      alert(`Successully Purchase Random NFT :  txHASH: ${response.transactionHash}`,)

    } catch (error) {
      purchaseEthError.innerHTML = error.reason;
      console.log(error);
    }
  })

  sendEtherButton.addEventListener("click", async () => {
    try {
      let op = {
        // Opciones de la transacción
        to: tokens.publicSale,
        value: ethers.utils.parseEther('0.01'), // Enviar 1 ETH
      };
      const tx = await signer.sendTransaction(op)

      const response = await tx.wait()
      console.log(response.transactionHash)
      alert(`Successully Purchase Random NFT :  txHASH: ${response.transactionHash}`,)

    } catch (error) {
      sendEtherError.innerHTML = error.reason;
      console.log(error);
    }

  })


}



async function setUpEventsContracts() {
  let nftListdiv = document.getElementById("nftList");
  let nftEventdiv = document.getElementById("nftEvent")
  //nftTknContract.on
  const filter = nftTknContract.filters.Transfer(null, account, null);
  const startBlock = 37000000
  //Consulta los eventos pasados
  const logs = await nftTknContract.queryFilter(filter, startBlock);

  //Recorre los eventos e imprime los datos de cada evento
  let listaTOkens = [];
  logs.forEach((log) => {
    // Parse the log with the contract's interface
    const parsedLog = nftTknContract.interface.parseLog(log);
    const to = parsedLog.args[1];
    const nftID = parsedLog.args[2]
    listaTOkens.push({
      wallet: to,
      nft: BigNumber.from(nftID).toString(),
      tx: log.transactionHash
    })
    // Imprime los datos del evento
    //console.log(to,BigNumber.from(nftID).toString());
  })
  listaTOkens.forEach((item) => {
    nftListdiv.innerHTML += `<li> ID NFT: ${item.nft} ++ txHash : <a target=_blank href=https://mumbai.polygonscan.com/tx/${item.tx}>${item.tx}</a></li>`;
  })


  nftTknContract.on("Transfer", (from, to, nftID, event) => {
    console.log(`Transaction hash: ${event.transactionHash}`);
    nftEventdiv.innerHTML += '<h3>NUEVA COMPRA:</h3>'
    nftEventdiv.innerHTML += `<p> ID NFT: ${nftID}</p>  txHash : <a target=_blank href=https://mumbai.polygonscan.com/tx/${event.transactionHash}>${event.transactionHash}</a>`;
  });

}

async function setUp() {
  await setUpProvider();
  setUpMetamask();
  initSCsGoerli();
  initSCsMumbai();
  await setUpListeners();
  //setUpEventsContracts();

}

function setUpMetamask() {
  let bttn = document.getElementById("connect");
  bttn.addEventListener("click", async function () {
    try {

      if (window.ethereum) {

        [account] = await ethereum.request({
          method: "eth_requestAccounts",
        });
        if (!account.length == 0) {
          Swal.fire({
            title: 'Ya estas conectado!',
            text: 'Do you want to continue',
            icon: 'info',
            confirmButtonText: 'Cool'
          })
        }
        console.log("Billetera metamask", account);

        provider = new providers.Web3Provider(window.ethereum);
        signer = provider.getSigner(account);
        window.signer = signer;
      }

    } catch (error) {
      console.error(error.message)
    }

  });
}

async function setUpProvider() {
  try {
    if (window.ethereum) {
      [account] = await ethereum.request({
        method: "eth_requestAccounts",
      });
      console.log("Billetera metamask", account);

      provider = new providers.Web3Provider(window.ethereum);
      signer = provider.getSigner(account);
      window.signer = signer;
    }

  } catch (error) {
    console.error(error.message)
  }

}

setUp()
  .then()
  .catch((e) => console.log(e));