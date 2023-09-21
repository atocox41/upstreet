import React, {
  useState,
  useEffect,
  useRef,
  createContext,
} from 'react';
import classnames from 'classnames';

// import {
//   SupabaseClient,
// } from '../../../packages/engine/clients/supabase-client.js';

import {
  StripeUi,
} from '../stripe-ui/StripeUi.jsx';

import styles from '../../../styles/ProfileUi.module.css';

//

const MICRO_FACTOR = 1e6;
const DOLLAR_FACTOR = 100;

//


//

export const ProfileUi = ({
  supabaseClient,

  loginValue,

  loginStats,
  setLoginStats,
  refreshLoginStats,
}) => {
  if (!supabaseClient) {
    debugger;
  }

  const {
    // loaded,
    sessionUserId,
    user,
    tokenId,
  } = loginValue;
  const {supabase} = supabaseClient;

  //

  return (
    <div className={styles.profileUi}>
      <h1>Profile</h1>
      <div className={styles.subheader}>Signed in as {user.email}</div>
      <div className={styles.subheader}>User id {sessionUserId}</div>

      {loginStats.loaded ? <>
        <h2>Usage</h2>
        <div className={styles.value}>{`\$${(loginStats.usage.remaining / MICRO_FACTOR / DOLLAR_FACTOR).toFixed(2)} remaining (${loginStats.usage.amount} / ${loginStats.usage.total})`}</div>        
      </> : null}

      <StripeUi
        loginStats={loginStats}
        setLoginStats={setLoginStats}
        refreshLoginStats={refreshLoginStats}

        tokenId={tokenId}
      />

      <h1>Sign out</h1>
      <button className={styles.button} onClick={async () => {
        await supabase.auth.signOut();

        location.href = '/';
      }}>Sign out</button>
    </div>
  );
};