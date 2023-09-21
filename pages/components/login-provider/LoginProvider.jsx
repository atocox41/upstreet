import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from 'react';
import classnames from 'classnames';
import jwt from 'jsonwebtoken';

import {
  SupabaseClient,
} from '../../../packages/engine/clients/supabase-client.js';
import {
  getEthereumAccountDetails,
} from '../metamask-auth-ui/MetamaskAuthUi.jsx';

//

export const LoginContext = createContext();
export const LoginProvider = ({
  localStorageManager,
  children,
}) => {
  if (!localStorageManager) {
    debugger;
    throw new Error('missing local storage manager');
  }

  //

  const [supabaseClient, setSupabaseClient] = useState(() => {
    const jwt = localStorageManager.getJwt();
    return new SupabaseClient({
      jwt,
    });
  });

  //

  const makeDefaultValue = (loaded = false) => ({
    supabaseClient,

    loaded,
    sessionUserId: '',
    // tokenId: '',
    provider: '',
    ethereumAccountDetails: null,
    user: null,
  });
  const [value, setValue] = useState(() => makeDefaultValue());
  const [epoch, setEpoch] = useState(0);

  // const setValue = v => {
  //   console.log('set value', v);
  //   if (window.lol) {
  //     debugger;
  //   }
  //   _setValue(v);
  // };

  //

  // update supabase client when jwt changes
  useEffect(() => {
    const jwtupdate = (e) => {
      const {
        jwt: jwtResult,
      } = e.data;

      supabaseClient.destroy();

      const newSupabaseClient = new SupabaseClient({
        jwt: jwtResult,
      });
      setSupabaseClient(newSupabaseClient);

      setValue({
        ...value,
        loaded: false,
        supabaseClient: newSupabaseClient,
      });
    };
    localStorageManager.addEventListener('jwtupdate', jwtupdate);

    return () => {
      localStorageManager.removeEventListener('jwtupdate', jwtupdate);
    };
  }, [
    localStorageManager,
    supabaseClient,
    value,
  ]);

  //

  const setDefaultValue = (loaded) => {
    setValue(makeDefaultValue(loaded));
  };

  //

  const updateUser = async ({
    id,
    address,
    provider,
  }) => {
    try {
      const [
        user,
      ] = await Promise.all([
        // account table
        (async () => {
          const {
            data,
            error,
          } = await supabaseClient.supabase
            .from('accounts')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (!error) {
            if (!data) {
              const user = {
                id,
                address,
                name: 'Anon ' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
                provider,
              };

              const {
                error,
              } = await supabaseClient.supabase
                .from('accounts')
                .insert(user);
              if (!error) {
                return user;
              } else {
                localStorageManager.deleteJwt();

                return null; // signal defaulting
              }
            } else {
              return data;
            }
          } else {
            // console.warn('got error', error);
            throw error;
          }
        })(),
      ]);

      if (user !== null) {
        let ethereumAccountDetails;
        if (provider === 'metamask') {
          ethereumAccountDetails = await getEthereumAccountDetails(address);
        } else {
          ethereumAccountDetails = null;
        }

        const newValue = {
          ...value,
          loaded: true,
          sessionUserId: id,
          address,
          user,
          provider,
          ethereumAccountDetails,
        };
        setValue(newValue);
      } else {
        setDefaultValue(true);
      }
    } catch(err) {
      console.warn('update user error', err);
    }
  };

  // profile
  useEffect(() => {
    const {
      data: authListener,
    } = supabaseClient.supabase.auth.onAuthStateChange((event, session) => {
      // console.log('got event', event);
      if (event === 'INITIAL_SESSION') {
        if (session) {
          session.user.id !== value?.sessionUserId && updateUser({
            id: session.user.id,
            address: '',
            provider: session.user.app_metadata.provider,
          });
        } else {
          const jwtString = supabaseClient.supabase.auth.headers?.['Authorization']?.replace(/^Bearer\s+/i, '');
          const jwtResult = jwtString ? jwt.decode(jwtString) : null;
          const id = jwtResult?.id;
          const address = jwtResult?.address;

          if (id && address) {
            id !== value?.sessionUserId && updateUser({
              id,
              address,
              provider: 'metamask',
            });
          } else {
            !value?.loaded && setDefaultValue(true);
          }
        }
      } else if (event === 'SIGNED_IN') {
        session.user.id !== value?.sessionUserId && updateUser({
          id: session.user.id,
          address: '',
          provider: session.user.app_metadata.provider,
        });
      } else if (event === 'SIGNED_OUT') {
        value?.sessionUserId && setDefaultValue(true);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [
    supabaseClient,
    value,
  ]);

  LoginProvider.refresh = () => {
    setEpoch(epoch + 1);
  };
  // LoginProvider.setValue = setValue;

  //

  return (
    <LoginContext.Provider value={value}>
      {children}
    </LoginContext.Provider>
  );
};
LoginProvider.refresh = () => {};
// LoginProvider.setValue = () => {};
export const LoginConsumer = LoginContext.Consumer;

//

export const LoginProfileContext = createContext();
export const LoginProfileProvider = ({
  children,
}) => {
  // const [supabaseClient, setSupabaseClient] = useState(() => new SupabaseClient());
  // const {supabase} = supabaseClient;
  // const {
  // } = useContext(LoginContext);

  const makeDefaultProfile = () => ({
    name: '',
    profileImage: '',
    character: '',
  });
  const [value, setValue] = useState(() => makeDefaultProfile());
  const [epoch, setEpoch] = useState(0);

  const setDefaultValue = () => {
    setValue(makeDefaultProfile());
  };
  const updateProfile = async (session) => {
    try {
      const {
        data,
        error,
      } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!error) {
        if (data) {
          const {
            name,
            character,
          } = data;
          setValue({
            name,
            character,
          });
        } else {
          setDefaultValue();
        }
      } else {
        throw error;
      }
    } catch(err) {
      console.warn('update profile error', err);
      // supabase.auth.signOut();
    }
  };

  LoginProfileProvider.refresh = () => {
    setEpoch(epoch + 1);
  };
  LoginProfileProvider.setValue = setValue;

  // profile
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // console.log('got event', event, session);
      if (event === 'INITIAL_SESSION') {
        if (session) {
          updateProfile(session);
        } else {
          setDefaultValue();
        }
      } else if (event === 'SIGNED_IN') {
        updateProfile(session);
      } else if (event === 'SIGNED_OUT') {
        setDefaultValue();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [
    epoch,
  ]);

  //

  return (
    <LoginProfileContext.Provider value={value}>
      {children}
    </LoginProfileContext.Provider>
  );
};
LoginProfileProvider.refresh = () => {};
LoginProfileProvider.setValue = (v) => {};
export const LoginProfileConsumer = LoginProfileContext.Consumer;

//

/* export const LoginUsageContext = createContext();
export const LoginUsageProvider = ({
  children,
}) => {
  const makeDefaultValue = () => ({
    loaded: false,
    loading: false,
    usage: null,
  });
  const [loginStats, setLoginStats] = useState(() => makeDefaultValue());
  const [epoch, setEpoch] = useState(0);

  const loginValue = useContext(LoginContext);

  //

  useEffect(() => {
    const {
      sessionUserId,
      tokenId,
    } = loginValue;

    if (sessionUserId && tokenId) {
      (async () => {
        const u = new URL(`${paymentsEndpointUrl}/stats`);
        u.searchParams.set('token', tokenId);
        const res = await fetch(u);
        if (res.ok) {
          const j = await res.json();
          // console.log('set login stats', j);
          
          const {usage} = j;
          setLoginStats({
            ...loginStats,
            loaded: true,
            loading: false,
            usage,
          });
        } else {
          // console.warn('invalid status code', res.status);
          throw new Error('invalid status code');
        }
      })();
    }
  }, [
    loginValue,
    epoch,
  ]);

  LoginUsageProvider.refresh = () => {
    setEpoch(epoch + 1);
  };
  LoginUsageProvider.setValue = setLoginStats;

  //

  return (
    <LoginUsageContext.Provider value={loginStats}>
      {children}
    </LoginUsageContext.Provider>
  );
};
LoginUsageProvider.refresh = () => {};
LoginUsageProvider.setValue = (v) => {};
export const LoginStatsConsumer = LoginUsageContext.Consumer; */