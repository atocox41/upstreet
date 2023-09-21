import React, {
  useState,
  // useEffect,
  // useRef,
  // createContext,
} from 'react';
import classnames from 'classnames';

import {
  Auth,
} from "@supabase/auth-ui-react";
import {
  ThemeSupa,
} from '@supabase/auth-ui-shared';

import {
  SupabaseClient,
} from '../../../packages/engine/clients/supabase-client.js';

import styles from '../../../styles/AuthUi.module.css';

//

export const AuthUi = () => {
  const [supabaseClient, setSupabaseClient] = useState(() => new SupabaseClient());

  //

  const {supabase} = supabaseClient;

  //

  return (
    <Auth
      supabaseClient={supabase}
      theme="dark"
      appearance={{
        theme: ThemeSupa,
        // If you want to extend the default styles instead of overriding it, set this to true
        extend: true,
        // Your custom classes
        className: {
          button: styles.authButton,
          container: styles.authContainer,
          anchor: styles.authAnchor,
          divider: styles.authDivider,
          label: styles.authLabel,
          input: styles.authInput,
          loader: styles.authLoader,
          message: styles.authMessage,
        },
        variables: {
          default: {
            colors: {
              brand: '#3f51b5',
              brandAccent: '#6573c3',
            },
            fonts: {
              bodyFontFamily: `M PLUS 1`,
              buttonFontFamily: `PlazaRegular`,
              inputFontFamily: `PlazaRegular`,
              labelFontFamily: `PlazaRegular`,
            },
          },
        },
      }}

      providers={[
        'discord',
        'google',
        // 'facebook',
        'github',
        'twitter',
      ]}
      // onlyThirdPartyProviders={true}

      localization={{
        variables: {
          sign_in: {
            // email_label: 'Email',
            email_label: '',
            email_input_placeholder: 'email',
            // password_label: 'Password',
            password_label: '',
            password_input_placeholder: 'password',

            social_provider_text: "{{provider}}",
            // button_label: 'Sign in w/ email',
          },
          sign_up: {
            // email_label: 'Email',
            email_label: '',
            email_input_placeholder: 'email address',
            // password_label: 'Password',
            password_label: '',
            password_input_placeholder: 'Choose a password',

            social_provider_text: "Sign in ({{provider}})",
          },
          forgotten_password: {
            // email_label: 'Email',
            email_label: '',
            email_input_placeholder: 'your@email.com',

            button_label: "Send instructions",
            loading_button_label: "Sending instructions...",
          },
        },
      }}
      view='sign_in'
      redirectTo={window.location.href.replace(/#.*$/, '')}
    />
  );
};