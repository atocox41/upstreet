import React, {
  useContext,
  useState,
  // useEffect,
} from 'react';
import classnames from 'classnames';

import {
  LoginContext,
  // LoginProvider,
  LoginConsumer,
} from '../login-provider/LoginProvider.jsx';

import {
  AuthUi,
} from '../auth-ui/AuthUi.jsx';
import {
  MetamaskAuthUi,
} from '../metamask-auth-ui/MetamaskAuthUi.jsx';

import styles from '../../../styles/UserAccountButton.module.css';

//

const LoginModal = ({
  localStorageManager,
  // supabaseClient,

  onClose,
}) => {
  return (
    <div className={styles.loginModal} onMouseDown={e => {
      e.stopPropagation();
    }} onClick={e => {
      e.stopPropagation();
    }}>
      <div className={styles.wrap}>
        <div className={styles.navs}>
          <nav className={styles.nav} onClick={e => {
            onClose && onClose();
          }}>
            <img className={styles.image} src='/images/chevron.svg' />
          </nav>
        </div>

        <MetamaskAuthUi
          localStorageManager={localStorageManager}
          onClose={onClose}
        />

        <AuthUi />
      </div>
    </div>
  );
};

const shortAddress = (address) => address.slice(0, 7) + '...' + address.slice(-4)

export const UserAccountButton = ({
  className,

  localStorageManager,
  supabaseClient,

  onClick,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  //

  return (
    <LoginConsumer>
      {loginValue => {
        const {
          loaded,
          user,
          ethereumAccountDetails,
        } = loginValue;

        const name = (ethereumAccountDetails ? ethereumAccountDetails.name : '') ||
          (user ? user.name : '');
        const avatarUrl = (ethereumAccountDetails ? ethereumAccountDetails.avatar : '') ||
          (user ? user.avatar_url : '');

        return (
          <div
            className={classnames(
              styles.userAccount,
              className,
            )}
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();

              onClick && onClick();
            }}
          >
            {user ? <div className={styles.user}>
              <img className={styles.profileImage}
                src={avatarUrl || '/assets/backgrounds/profile-no-image.png'}
                crossOrigin='Anonymous'
              />
              <div className={styles.name}>{name ? name : shortAddress(ethereumAccountDetails.address)}</div>
            </div> : null}
            <div className={classnames(
              styles.button,
              !loaded ? styles.disabled : null,
            )} onMouseDown={e => {
              // e.preventDefault();
              e.stopPropagation();
            }} onClick={e => {
              e.preventDefault();
              e.stopPropagation();

              if (user) {
                supabaseClient.supabase.auth.signOut();
                localStorageManager.setJwt(null);
              } else {
                setModalOpen(!modalOpen);
              }
            }}>
              {(() => {
                if (!loaded) {
                  return (
                    <>
                      <div className={styles.background} />
                      <div className={styles.text}>Working...</div>
                    </>
                  );
                } else {
                  if (user) {
                    return (
                      <>
                        <div className={styles.background} />
                        <div className={styles.text}>
                          Sign out
                        </div>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <div className={styles.background} />
                        <div className={styles.text}>
                          Sign in
                        </div>
                      </>
                    );
                  }
                }
              })()}
            </div>
            {modalOpen ? <LoginModal
              localStorageManager={localStorageManager}
              supabaseClient={supabaseClient}

              onClose={e => {
                setModalOpen(false);
              }}
            /> : null}
          </div>
        );
      }}
    </LoginConsumer>
  );
};