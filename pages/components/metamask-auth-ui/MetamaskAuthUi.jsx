import React, {
  // useContext,
  // useState,
} from 'react';
import classnames from 'classnames';

import {
  resolveIpfsUrl,
} from '../../../packages/engine/util.js';

import styles from '../../../styles/MetamaskAuthUi.module.css';

import {ethers} from 'ethers';

const ACCOUNT_DATA = {
  EMAIL: 'email',
  AVATAR: 'avatar',
};

//

const metamaskJwtUrl = `https://metamask.isekai.chat/`;

//

export const getEthereumAccountDetails = async (address) => {
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const check = ethers.utils.getAddress(address);

  try {
    const name = await provider.lookupAddress(check);
    if (!name) return {address};
    const resolver = await provider.getResolver(name);

    const accountDetails = {};

    await Promise.all(
      Object.keys(ACCOUNT_DATA).map(async key => {
        const data = await resolver.getText(ACCOUNT_DATA[key]);
        accountDetails[ACCOUNT_DATA[key]] = data;
      }),
    );

    const result = {
      ...accountDetails,
      name,
      address,
    };
    result.avatar = result.avatar ? resolveIpfsUrl(result.avatar) : '';
    return result;
  } catch (err) {
    console.warn(err.stack)
    return {};
  }
};

//

export const ensureEthereum = () => {
  return globalThis.ethereum !== undefined;
  if (typeof globalThis.ethereum === 'undefined') {
    throw new Error('Please install a wallet extension like MetaMask');
  }
};
const ensureNetwork = async (chainId = '0x1') => { // 0x1 refers to the Ethereum mainnet
  await globalThis.ethereum
    .request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });
};
export const ensure = async () => {
  if (ensureEthereum()) {
    await ensureNetwork();
  }
};

//

const getEthereumAccount = async () => {
  const accounts = await globalThis.ethereum.request({
    method: 'eth_requestAccounts',
  });
  const account = accounts[0];
  return account;
};

//

export const MetamaskAuthUi = ({
  localStorageManager,
  onClose,
}) => {
  const connectMetamask = async () => {
    await ensure();
    const account = await getEthereumAccount();
  
    const message = `\
This lets you log in to Upstreet.

${JSON.stringify({
  sign_in: 'upstreet',
  address: account,
  timestamp: Date.now(),
}, null, 2)}
  `;
  
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, account],
    });
  
    // console.log('got signature 1', signature);
  
    const res = await fetch(metamaskJwtUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        signature,
      }),
    });
    const jwtResult = await res.json();
    
    localStorageManager.setJwt(jwtResult);
    onClose();
  };

  //

  return (
    <div className={styles.metamaskAuthUi}>
      <div className={styles.buttons}>
        <div className={styles.button} onClick={connectMetamask}>
          <img className={styles.image} src='/images/metamask.png' />
          <div className={styles.text}>Metamask</div>
        </div>
      </div>
    </div>
  );
};