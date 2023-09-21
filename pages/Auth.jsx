import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import {
  AuthClient,
} from '../packages/engine/clients/auth-client.js';

import styles from '../styles/Auth.module.css';

//

const authServerUrl = `https://local.webaverse.com:4443/auth/`;

//

let loaded = false;
export const AuthApp = () => {
  const [authClient, setAuthClient] = useState(() => new AuthClient());

  const [steamKey, setSteamKey] = useState('');

  const [registerResponseString, setRegisterResponseString] = useState('');
  const [loginResponseString, setLoginResponseString] = useState('');

  const [done, setDone] = useState(false);

  const [checkToken, setCheckToken] = useState('');
  const [useToken, setUseToken] = useState('');
  const [checkResponseString, setCheckResponseString] = useState('');
  const [useResponseString, setUseResponseString] = useState('');

  useEffect(() => {
    if (!loaded) {
      loaded = true;

      const q = new URLSearchParams(location.search);
      const code = q.get('code');
      const state = q.get('state') ?? '';
      if (code) {
        (async () => {
          const j1 = await authClient.checkDiscord({
            code,
            state,
            authServerUrl,
          });
          const {
            error,
            access_token,
          } = j1;

          if (error) {
            setRegisterResponseString(error);
          } else {
            const j3 = await authClient.registerDiscord({
              access_token,
              authServerUrl,
            });
            const newRegisterResponseString = JSON.stringify(j3, null, 2);
            setRegisterResponseString(newRegisterResponseString);
          }

          // clear query string with replaceState
          history.replaceState(null, '', location.pathname);
        })();
      }
    }
  }, []);

  return (
    <div className={styles.authApp}>
      {!done ? (
        <>
          <h1>Register with Discord</h1>
          <div className={styles.row}>
            <button onClick={async e => {
              location.href = '/auth/discordOAuth';
            }}>Register</button>
          </div>

          <h1>Register with Steam</h1>
          <div className={styles.row}>
            <input type="text" value={steamKey} placeholder='STEAM_KEY' onChange={e => {
              setSteamKey(e.target.value);
            }} />
            <input type="button" value="Register" onClick={async e => {
              setRegisterResponseString('');

              const ok = await authClient.checkSteamKey({
                steamKey,
                authServerUrl,
              });
              if (ok) {
                const j = await authClient.registerSteam({
                  steamKey,
                  authServerUrl,
                });
                const newRegisterResponseString = JSON.stringify(j, null, 2);
                setRegisterResponseString(newRegisterResponseString);
              } else {
                setRegisterResponseString('steam key invalid or already used');
              }
            }} />
          </div>

          <div className={styles.row}>
            <textarea value={registerResponseString} readOnly={true} className={styles.textarea} />
          </div>

          <h1>Log in</h1>
          <div className={styles.row}>
            <input type="button" value="Sign in" onClick={async e => {
              setLoginResponseString('');

              const j = await authClient.login({
                authServerUrl,
              });
              const newLoginResponseString = JSON.stringify(j, null, 2);
              setLoginResponseString(newLoginResponseString);
            }} />
          </div>
          <div className={styles.row}>
            <textarea value={loginResponseString} readOnly={true} className={styles.textarea} />
          </div>

          <h1>Check token</h1>
          <div className={styles.row}>
            <input type='text' placeholder='TOKEN' value={checkToken} onChange={e => {
              setCheckToken(e.target.value);
            }} />
            <button onClick={async e => {
              const j = await authClient.checkToken({
                token: checkToken,
                authServerUrl,
              });
              const newCheckResponseString = JSON.stringify(j, null, 2);
              setCheckResponseString(newCheckResponseString);
            }}>Check</button>
            <textarea value={checkResponseString} readOnly={true} className={styles.textarea} />
          </div>

          <h1>Use token</h1>
          <div className={styles.row}>
            <input type='text' placeholder='TOKEN' value={useToken} onChange={e => {
              setUseToken(e.target.value);
            }} />
            <button onClick={async e => {
              const j = await authClient.useToken({
                token: useToken,
                authServerUrl,
              });
              const newUseResponseString = JSON.stringify(j, null, 2);
              setUseResponseString(newUseResponseString);
            }}>Check</button>
            <textarea value={useResponseString} readOnly={true} className={styles.textarea} />
          </div>
        </>
      ) : (
        <div className={styles.row}>
          Done! You can close this window.
        </div>
      )}
    </div>
  );
};