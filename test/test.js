const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const { getRole, deploySC, deploySCNoUp, ex, pEth } = require("../utils");
const { execSync } = require("child_process");

const MINTER_ROLE = getRole("MINTER_ROLE");
const BURNER_ROLE = getRole("BURNER_ROLE");

// 17 de Junio del 2023 GMT
const startDate = 1686960000;   
const zeroAddress = "0x0000000000000000000000000000000000000000";
const makeBN = (num) => ethers.BigNumber.from(String(num));
const pe = ethers.utils.parseEther;
const parseEth = (num) => {
  return pe(Number(num).toString())
}

describe("MI PRIMER TOKEN TESTING", function () {
  let nftContract, publicSale, miPrimerToken, usdc;
  let owner, gnosis, alice, bob, carl, deysi;
  const name = "Mi Primer NFT";
  const symbol = "MPRNFT";

  before(async () => {
    [owner, gnosis, alice, bob, carl, deysi] = await ethers.getSigners();
    await deployNftSC();

  });


  // Estos dos métodos a continuación publican los contratos en cada red
  // Se usan en distintos tests de manera independiente
  // Ver ejemplo de como instanciar los contratos en deploy.js
  async function deployNftSC() {
    nftContract = await deploySC("MiPrimerNft", [name, symbol]);
  }

  async function deployPublicSaleSC() {
    miPrimerToken = await deploySC("MiPrimerToken", []);
    publicSale = await deploySC("PublicSale", []);
    //Setup
    await ex(publicSale, "setTokenAddress", [miPrimerToken.address]);
    await ex(publicSale, "setGnosisSafeWallet", [gnosis.address]);

  }


  describe("Mi Primer Nft Smart Contract", () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployNftSC();
    });

    it("Verifica símbolo de colección", async () => {
      expect(await nftContract.name()).to.be.equal(name)
    });

    it("No permite acuñar sin privilegio", async () => {
      await expect(nftContract.connect(alice).safeMint(bob.address, 1)).to.be.reverted
    });

    it("No permite acuñar doble id de Nft", async () => {
      await nftContract.connect(owner).safeMint(bob.address, 1)
      await expect(nftContract.connect(owner).safeMint(alice.address, 1))
        .to.be.reverted
    });

    it("Verifica rango de Nft: [1, 30]", async () => {
      // Mensaje error: "NFT: Token id out of range"
      await expect(nftContract.connect(owner).safeMint(bob.address, 31))
        .to.be.revertedWith("NFT: Token id out of range")

      await expect(nftContract.connect(owner).safeMint(bob.address, 0))
        .to.be.revertedWith("NFT: Token id out of range")

    });

    it("Se pueden acuñar todos (30) los Nfts", async () => {

      for (let index = 1; index < 31; index++) {
        await expect(nftContract.connect(owner).safeMint(bob.address, index))
          .to.emit(nftContract, "Transfer")
          .withArgs(zeroAddress, bob.address, index);
      }
    });
  });

  describe("Public Sale Smart Contract", () => {
    // Se publica el contrato antes de cada test
    beforeEach(async () => {
      await deployPublicSaleSC();
      await miPrimerToken.connect(alice)
        .approve(publicSale.address, pe("1000000000000"))
      await miPrimerToken.connect(owner).mint(alice.address, pe("1000000000000"))

      // var tx = await miPrimerToken.connect(alice)
      //   .approve(publicSale.address,pe("100000"))
      //console.log(tx)
    });


    it("No se puede comprar otra vez el mismo ID", async () => {

      const nftId = 1

      await publicSale.connect(alice).purchaseNftById(nftId)

      await expect(publicSale.connect(alice).purchaseNftById(nftId)).to.be.reverted
    });

    it("IDs aceptables: [1, 30]", async () => {


      await expect(publicSale.connect(alice).purchaseNftById(0))
        .to.be.revertedWith("NFT: Token id out of range")

      await expect(publicSale.connect(alice).purchaseNftById(31))
        .to.be.revertedWith("NFT: Token id out of range")

    });

    it("Usuario no dio permiso de MiPrimerToken a Public Sale", async () => {

      await expect(publicSale.connect(bob).purchaseNftById(30))
        .to.be.revertedWith("Public Sale: Not enough allowance")

    });

    it("Usuario no tiene suficientes MiPrimerToken para comprar", async () => {
      await miPrimerToken.connect(bob)
        .approve(publicSale.address, pe("1000000000000"))

      await expect(publicSale.connect(bob).purchaseNftById(30))
        .to.be.revertedWith("Public Sale: Not enough token balance")
    });

    describe("Compra grupo 1 de NFT: 1 - 10", () => {

      it("Emite evento luego de comprar", async () => {
        for (let index = 1; index < 11; index++) {
          const tx = await publicSale.connect(alice).purchaseNftById(index);
          await expect(tx)
            .to.emit(publicSale, "DeliverNft")
            .withArgs(alice.address, index);
        }

      });

      it("Disminuye balance de MiPrimerToken luego de compra", async () => {
        // Usar changeTokenBalance
        // source: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#change-token-balance

        const tx = await publicSale.connect(alice).purchaseNftById(2);
        await expect(tx).to.changeTokenBalance(miPrimerToken, alice, pe("-500"))
      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(2);
        await expect(tx).to.changeTokenBalance(miPrimerToken, gnosis, pe("50"))
      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(2);
        await expect(tx).to.changeTokenBalance(miPrimerToken, publicSale, pe("450"))
      });

    });

    describe("Compra grupo 2 de NFT: 11 - 20", () => {
      const priceGroup2 = 1000;
      const fee = 0.1;
      const net = 0.9;

      it("Emite evento luego de comprar", async () => {
        for (let index = 11; index < 21; index++) {
          const tx = await publicSale.connect(alice).purchaseNftById(index);
          await expect(tx)
            .to.emit(publicSale, "DeliverNft")
            .withArgs(alice.address, index);
        }

      });

      it("Disminuye balance de MiPrimerToken luego de compra", async () => {

        for (let index = 11; index < 21; index++) {
          const tx = await publicSale.connect(alice).purchaseNftById(index);
          await expect(tx)
            .to.changeTokenBalance(miPrimerToken, alice, parseEth(-index * priceGroup2))
        }
      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {

        for (let i = 11; i < 21; i++) {
          const tx = await publicSale.connect(alice).purchaseNftById(i);
          await expect(tx)
            .to.changeTokenBalance(miPrimerToken, gnosis, parseEth(i * priceGroup2 * fee))
        }

      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        for (let i = 11; i < 21; i++) {
          const tx = await publicSale.connect(alice).purchaseNftById(i);
          await expect(tx)
            .to.changeTokenBalance(miPrimerToken, publicSale, parseEth(i * priceGroup2 * net))
        }
      });
    });

    describe("Compra grupo 3 de NFT: 21 - 30", async () => {
      const BASE = 10_000;
      const MAX = 50_000;
      const fee = 0.1;
      const net = 0.9;
      function getPrice(timestamp) {
        let hoursPassed = Math.floor(Number(timestamp - startDate) / 60 / 60);
        let priceGroupThree = hoursPassed * 1000;
        let price = priceGroupThree;
        if (priceGroupThree > MAX) {
          price = MAX;
        } else if (priceGroupThree < BASE) {
          price = BASE;
        }
        return price;
      }
      it("Disminuye balance de MiPrimerToken luego de compra", async () => {

        const tx = await publicSale.connect(alice).purchaseNftById(22);
        const blocktimestamp = await time.latest(); // Obtiene el timestamp del bloque.
        let priceExpected = getPrice(blocktimestamp);
        await expect(tx)
          .to.changeTokenBalance(miPrimerToken, alice, parseEth(-priceExpected))

      });

      it("Gnosis safe recibe comisión del 10% luego de compra", async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(22);
        const blocktimestamp = await time.latest(); // Obtiene el timestamp del bloque.
        let priceExpected = getPrice(blocktimestamp);
        await expect(tx)
          .to.changeTokenBalance(miPrimerToken, gnosis, parseEth(priceExpected * fee))

      });

      it("Smart contract recibe neto (90%) luego de compra", async () => {
        const tx = await publicSale.connect(alice).purchaseNftById(22);
        const blocktimestamp = await time.latest(); // Obtiene el timestamp del bloque.
        let priceExpected = getPrice(blocktimestamp);
        await expect(tx)
          .to.changeTokenBalance(miPrimerToken, publicSale, parseEth(priceExpected * net))
      });

    });



    describe("Depositando Ether para Random NFT", () => {

      it("Método emite evento (30 veces) ", async () => {
        let amount = parseEth(0.01)
        for (let i = 1; i < 31; i++) {
          const tx = await publicSale.connect(alice).depositEthForARandomNft({
            value: amount,
          })
          await expect(tx)
            .to.emit(publicSale, "DeliverNft")
        }


      });

      it("Método falla la vez 31", async () => {
        let amount = parseEth(0.01)
        for (let i = 1; i < 31; i++) {
          const tx = await publicSale.connect(deysi).depositEthForARandomNft({
            value: amount,
          })
          if (i == 31) {
            await expect(tx).to.be.revertedWith("NO hay tokens disponibles")
          }
        }

      });

      it("Envío de Ether y emite Evento (30 veces)", async () => {
        let amount = parseEth(0.01)
        for (let i = 1; i < 31; i++) {
          const tx = await bob.sendTransaction({
            to: publicSale.address,
            value: amount
          });
          await expect(tx)
            .to.emit(publicSale, "DeliverNft")
        }
      });

      it("Envío de Ether falla la vez 31", async () => {
        let amount = parseEth(0.01)
        for (let i = 1; i < 31; i++) {
          const tx = await bob.sendTransaction({
            to: publicSale.address,
            value: amount
          });
          if (i == 31) {
            await expect(tx)
              .to.be.reverted
          }

        }

      });

      it("Da vuelto cuando y gnosis recibe Ether", async () => {
        // Usar el método changeEtherBalances
        // Source: https://ethereum-waffle.readthedocs.io/en/latest/matchers.html#change-ether-balance-multiple-accounts
        // Ejemplo:
        await expect(
          await owner.sendTransaction({
            to: publicSale.address,
            value: pEth("0.05"),
          })
        ).to.changeEtherBalances(
          [owner.address, gnosis.address],
          [pEth("-0.01"), pEth("0.01")]
        );
      });
    });
  });
});