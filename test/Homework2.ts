import {loadFixture} from "@nomicfoundation/hardhat-network-helpers";
import {expect} from "chai";
import hre from "hardhat";
import {
    CCIPLocalSimulator, CrossChainNameServiceLookup, CrossChainNameServiceReceiver, CrossChainNameServiceRegister,
} from "../typechain-types";
import {BigNumber} from "ethers";
import {Spinner} from "../utils/spinner";

describe("Homework 2", function () {
    enum PayFeesIn {
        Native,
        LINK,
    }

    async function deployFixture() {

        const spinner: Spinner = new Spinner();
        const ccipLocalSimualtorFactory = await hre.ethers.getContractFactory(
            "CCIPLocalSimulator"
        );
        const ccipLocalSimulator: CCIPLocalSimulator =
            await ccipLocalSimualtorFactory.deploy();

        const [alice] = await hre.ethers.getSigners();

        console.log(`ℹ️  Attempting to deploy CrossChainNameServiceLookup on the ${hre.network.name} blockchain using ${alice.address} address`);
        spinner.start();

        const config: {
            chainSelector_: BigNumber;
            sourceRouter_: string;
            destinationRouter_: string;
            wrappedNative_: string;
            linkToken_: string;
            ccipBnM_: string;
            ccipLnM_: string;
        } = await ccipLocalSimulator.configuration();

        const crossChainNameServiceLookupSourceFactory = await hre.ethers.getContractFactory(
            "CrossChainNameServiceLookup"
        );
        const nameServiceLookupSource: CrossChainNameServiceLookup = await crossChainNameServiceLookupSourceFactory.deploy();

        await nameServiceLookupSource.deployed();

        const crossChainNameServiceLookupReceiverFactory = await hre.ethers.getContractFactory(
            "CrossChainNameServiceLookup"
        );
        const nameServiceLookupReceiver: CrossChainNameServiceLookup = await crossChainNameServiceLookupReceiverFactory.deploy();

        await nameServiceLookupReceiver.deployed();

        spinner.stop();
        console.log(`✅ nameServiceLookupSource deployed at address ${nameServiceLookupSource.address} on ${hre.network.name} blockchain`);
        console.log(`✅ nameServiceReceiverLookup deployed at address ${nameServiceLookupReceiver.address} on ${hre.network.name} blockchain`);


        console.log(`ℹ️  Attempting to deploy CrossChainNameServiceRegister on the ${hre.network.name} blockchain using ${alice.address} address`);
        spinner.start();

        const crossChainNameServiceRegisterFactory = await hre.ethers.getContractFactory(
            "CrossChainNameServiceRegister"
        );
        const nameServiceRegister: CrossChainNameServiceRegister = await crossChainNameServiceRegisterFactory.deploy(
            config.sourceRouter_,
            nameServiceLookupSource.address
        );
        await nameServiceRegister.deployed();

        spinner.stop();
        console.log(`✅ CrossChainNameServiceRegister deployed at address ${nameServiceRegister.address} on ${hre.network.name} blockchain`);


        console.log(`ℹ️  Attempting to deploy CrossChainNameServiceReceiver on the ${hre.network.name} blockchain using ${alice.address} address`);
        spinner.start();
        const crossChainNameServiceReceiverFactory = await hre.ethers.getContractFactory(
            "CrossChainNameServiceReceiver"
        );
        const nameServiceReceiver: CrossChainNameServiceReceiver =
            await crossChainNameServiceReceiverFactory.deploy(
                config.destinationRouter_,
                nameServiceLookupReceiver.address,
                config.chainSelector_
            );

        await nameServiceReceiver.deployed();

        spinner.stop();
        console.log(`✅ CrossChainNameServiceReceiver deployed at address ${nameServiceReceiver.address} on ${hre.network.name} blockchain`);

        return {
            alice,
            ccipLocalSimulator,
            config,
            nameServiceRegister,
            nameServiceReceiver,
            nameServiceLookupSource,
            nameServiceLookupReceiver
        };
    }

    it("Should lookup for Alice's EOA address", async function () {
        const {
            alice,
            ccipLocalSimulator,
            config,
            nameServiceRegister,
            nameServiceReceiver,
            nameServiceLookupSource,
            nameServiceLookupReceiver
        } = await loadFixture(
            deployFixture
        );
        const spinner: Spinner = new Spinner();


        console.log(`ℹ️  Attempting to call the enableChain function on the CrossChainNameServiceRegister smart contract on the ${hre.network.name} blockchain`);

        spinner.start();

        const registerEnableChainTx = await nameServiceRegister.enableChain(
            config.chainSelector_,
            nameServiceReceiver.address,
            200_000
        );
        await registerEnableChainTx.wait();
        spinner.stop();
        console.log(`✅ New Chain enabled, transaction hash: ${registerEnableChainTx.hash}`);

        console.log(`ℹ️  Attempting to call the setCrossChainNameServiceAddress function on the CrossChainNameServiceLookup smart contract`);
        spinner.start();
        const lookupTxSource = await nameServiceLookupSource.setCrossChainNameServiceAddress(nameServiceRegister.address);
        await lookupTxSource.wait();

        spinner.stop();
        console.log(`✅ CCNS Address set, transaction hash: ${lookupTxSource.hash}`);

        console.log(`ℹ️  Attempting to call the setCrossChainNameServiceAddress function on the CrossChainNameServiceLookup smart contract`);
        spinner.start();


        const lookupTxReceiver = await nameServiceLookupReceiver.setCrossChainNameServiceAddress(nameServiceReceiver.address);
        await lookupTxReceiver.wait();

        spinner.stop();
        console.log(`✅ CCNS Address set, transaction hash: ${lookupTxReceiver.hash}`);
        // console.log(`✅ CCNS  Lookup set, transaction hash: ${await nameServiceLookupSource.lookup(nameServiceRegister.address)}`);
        // console.log(`✅ CCNS  Lookup set, transaction hash: ${await nameServiceReceiverLookup.lookup(nameServiceReceiver.address)}`);


        const lookupName = "alice.ccns";

        console.log(`ℹ️  Attempting to call the register function on the CrossChainNameServiceRegister smart contract with the name ${lookupName} on the ${hre.network.name} blockchain`);
        spinner.start();
        const registerNameTx = await nameServiceRegister.register(lookupName);
        // const registerNameTx = await nameServiceRegister.register(lookupName);
        // const lookupRegisterNameTx = await nameServiceLookupSource.register(lookupName, nameServiceRegister.address);
        // const lookupRegisterNameTx = await nameServiceLookup.register(lookupName, nameServiceReceiver.address);
        await registerNameTx.wait();
        // await lookupRegisterNameTx.wait();
        spinner.stop();
        // console.log(`✅ Transaction hash: ${lookupRegisterNameTx.hash}`);
        console.log(`✅ Transaction hash registerNameTx: ${registerNameTx.hash}`);

        console.log(`ℹ️  Attempting to call the lookup function on the CrossChainNameServiceLookup smart contract with the name ${lookupName} on the ${hre.network.name} blockchain`);
        spinner.start();

        const lookupAddress = await nameServiceLookupSource.lookup(lookupName);
        spinner.stop();
        console.log(`ℹ️  ${lookupName}:: ${alice.address} resolved with ${lookupAddress}`);


        expect(lookupAddress).to.equal(alice.address);
        // expect(latestMessageSender).to.equal(senderAddress);
        // expect(latestMessage).to.deep.equal(messageToSend);
    });
});