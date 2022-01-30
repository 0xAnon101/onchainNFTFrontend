import { ethers } from "ethers";
import React, { useEffect, useState, useRef } from "react";
import Loader from "react-loader-spinner";
import dotenv from "dotenv";
import Planets from "./Planets";
import StyledStars from "./StyledStars";
import NftImage from "./NftImage";
import RariNFT from "./utils/RariNFT.json";
import "./styles/App.css";
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import twitterLogo from "./assets/twitter-logo.svg";
import placeholder from "./assets/placeholder.jpeg";
import opensea from "./assets/opensea.svg";
dotenv.config();

// Constants
const TWITTER_HANDLE = "anon101";

const App = () => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalNFT, setTotalNFT] = useState(0);
  const [userMintedNFT, setUserMintedNFT] = useState(0);
  const [tokenId, setTokenId] = useState(null);
  const [cWidth, setcWidth] = useState(0);
  const [cHeight, setcHeight] = useState(0);
  const [minted, setMinted] = useState(false);
  const [base64Image, setBase64Image] = useState(null);
  const [wrongChain, setWrongChain] = useState({});
  const sectionRef = useRef();

  const RINKEBY_CONTRACT_ADDRESS =
    process.env.REACT_APP_RINKEBY_CONTRACT_ADDRESS;

  useEffect(() => {
    if (currentAccount && !wrongChain.value) {
      setUpListeners();
    }
  }, [currentAccount]);

  useEffect(() => {
    checkIfWalletIsConnected();
    const sectionEl = sectionRef.current;
    console.log(sectionEl);
    setcWidth(sectionEl.offsetWidth);
    setcHeight(sectionEl.offsetHeight);
  }, []);

  // Render Methods
  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  // checks wallet on first load
  const checkIfWalletIsConnected = async () => {
    if (!window.ethereum) {
      console.log("Make sure your Metamask is installed!");
    } else {
      checkChain();
      if (!wrongChain.value) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (accounts.length !== 0) {
          setCurrentAccount(accounts[0]);
        } else {
          console.log("No authorized account found");
        }
      }
    }
  };

  // connects wallet on btn click
  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert("Get Metamask!");
        return;
      }
      checkChain();
      if (!wrongChain.value) {
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });

        console.log("Connected with account: ", accounts[0]);
        setCurrentAccount(accounts[0]);
      }
    } catch (error) {
      console.log(error);
    }
  };

  // fetch and populate NFT data
  const fetchNFTNumbers = async (contractInstance) => {
    const getTotalNFTMinted = await contractInstance.getTotalNFTMintedSoFar();
    const getUserNFTCount = await contractInstance.getUserNFTMintedSoFar();
    setUserMintedNFT(getUserNFTCount.toNumber());
    setTotalNFT(getTotalNFTMinted.toNumber());
  };

  // check for the chainID
  const checkChain = async () => {
    const { ethereum } = window;
    let chainId = await ethereum.request({ method: "eth_chainId" });
    const rinkebyChainId = "0x4"; // for rinkeby
    if (chainId !== rinkebyChainId) {
      setWrongChain({ value: true, msg: "Wrong Network!" });
    } else {
      setWrongChain({ value: false, msg: "" });
    }
  };

  // gets you the contract instance to work with
  const getContractInstance = async (ethereum) => {
    const provider = await new ethers.providers.Web3Provider(ethereum);
    const signer = await provider.getSigner();
    const contractInstance = new ethers.Contract(
      RINKEBY_CONTRACT_ADDRESS,
      RariNFT.abi,
      signer
    );

    return { provider, signer, contractInstance };
  };

  const setUpListeners = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        /** Get Contract instance */
        const { contractInstance } = getContractInstance(ethereum);

        /** Fetch the NFT minted by user and total NFT minted so fat */
        fetchNFTNumbers(contractInstance);

        /** Set up listener */
        contractInstance.on("NewRareNFTMinted", async (from, tokenId) => {
          console.log(tokenId);
          setTokenId(tokenId);
          const getBase64MintedSvg = await contractInstance._tokenURI(tokenId);
          const base64String = getBase64MintedSvg.split(
            "data:application/json;base64,"
          )[1];
          const { image } = JSON.parse(window.atob(base64String));
          console.log(image);
          setBase64Image(image);
        });
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const mintNFT = async () => {
    const { ethereum } = window;
    if (!ethereum) {
      console.log("Ethereum object doesn't exist!");
    } else {
      /** Get Contract instance */
      const { contractInstance } = getContractInstance(ethereum);

      /** Mint */
      const nftTxn = await contractInstance.makeRariNFT();
      setLoading(true);
      setBase64Image(null);
      await nftTxn.wait();
      setLoading(false);
      setMinted(true);

      /** Fetch the NFT minted by user and total NFT minted so fat */
      fetchNFTNumbers(contractInstance);
    }
  };

  const openOpenOceanlink = () => {
    const url = ` https://testnets.opensea.io/assets/${RINKEBY_CONTRACT_ADDRESS}/${tokenId.toNumber()}`;
    if (!loading) window.open(url, "_blank");
  };

  return (
    <div className="App">
      <div className="container" ref={sectionRef}>
        <StyledStars width={cWidth} height={cHeight} />
        <div className="header-container">
          <p className="header gradient-text">Rari Name Generator</p>
          <p className="sub-text">
            Each NFT has a unique name. Discover your NFT today.
          </p>
          {currentAccount && (
            <div className="accounts">
              {wrongChain.value ? wrongChain.msg : currentAccount}
            </div>
          )}
        </div>
        <div className="content-container">
          {loading ? (
            <Loader className="loader" type="TailSpin" />
          ) : (
            <NftImage
              placeholder={placeholder}
              totalNFT={totalNFT}
              userMinted={userMintedNFT}
              base64Image={base64Image}
            />
          )}
          {!currentAccount ? (
            renderNotConnectedContainer()
          ) : (
            <button
              onClick={mintNFT}
              className="cta-button connect-wallet-button"
              disabled={loading || wrongChain.value}
            >
              {loading ? "Minting ... " : "Mint NFT"}
            </button>
          )}
          {minted && (
            <button className="opensea-btn" onClick={openOpenOceanlink}>
              <img src={opensea} alt="opensea" />
              <span>View on Opensea</span>
            </button>
          )}
          <Planets />
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            // href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
