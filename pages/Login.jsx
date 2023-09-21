import React, {
  useState,
  useEffect,
  useRef,
  createContext,
} from 'react';
import classnames from 'classnames';

// import {
//   SupabaseClient,
// } from '../packages/engine/clients/supabase-client.js';

import {
  LoginProvider,
  LoginConsumer,
  // LoginStatsProvider,
  // LoginStatsConsumer,
} from './components/login-provider/LoginProvider.jsx';
import {
  AuthUi,
} from './components/auth-ui/AuthUi.jsx';
import {
  Redirect,
} from './components/redirect/Redirect.jsx';

import styles from '../styles/Login.module.css';

//

export const LoginApp = () => {
  return (
    <LoginProvider>
      <LoginConsumer>
        {loginValue => {
          const {
            loaded,
            // sessionUserId,
            user,
            // tokenId,
          } = loginValue;

          return (
            <div className={styles.loginApp}>
              <div className={styles.wrap}>
                {loaded ? <>
                  {!user ?
                    <AuthUi />
                  :
                    <Redirect
                      url='/h/'
                    />
                  }
                </> : null}
              </div>
            </div>
          )
        }}
      </LoginConsumer>
    </LoginProvider>
  );
};