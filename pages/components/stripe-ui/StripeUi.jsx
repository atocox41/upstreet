import React, {
  useState,
  useEffect,
  useRef,
  useContext,
} from 'react';
import classnames from 'classnames';
import {
  STRIPE_PUBLISHABLE_KEY,
} from '../../../packages/engine/constants/auth.js';
// import {
//   LoginStatsProvider,
// } from '../login-provider/LoginProvider.jsx';
import {
  paymentsEndpointUrl,
} from '../../../packages/engine/endpoints.js';

// import {
//   // PaymentElement,
//   Elements,
//   CardElement,
//   useStripe,
//   useElements,
// } from '@stripe/react-stripe-js';

import styles from '../../../styles/StripeUi.module.css';

import {loadStripe} from '@stripe/stripe-js';
// loadStripe.setLoadParameters({advancedFraudSignals: false});

//

const MICRO_FACTOR = 1e6;
const DOLLAR_FACTOR = 100;

//

let stripePromise = null;
const getStripePromise = () => {
  if (stripePromise === null) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

//

/* const CheckoutForm = ({
  // setLoginStatsLoading,
  // loginStatsEpoch,
  // setLoginStatsEpoch,

  loginStats,
  refreshLoginStats,
  onPaymentMethod,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    LoginStatsProvider.setValue(oldValue => ({
      ...oldValue,
      loading: true,
    }));

    try {
      if (!stripe || !elements) {
        // Stripe.js has not yet loaded. 
        // Make sure to disable form submission until Stripe.js has loaded.
        return;
      }

      const card = elements.getElement(CardElement);

      const {error, paymentMethod} = await stripe.createPaymentMethod({
        type: 'card',
        card: card,
      });

      if (error) {
        throw error;
      } else {
        await onPaymentMethod(paymentMethod);
      }
    } finally {
      // setLoginStatsEpoch(loginStatsEpoch + 1);
      // LoginStatsProvider.refresh();
      refreshLoginStats();
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <CardElement
        options={{
          style: {
            base: {
              padding: '10px',
            },
          },
        }}
      />
      <button type="submit" className={styles.submit} disabled={!stripe}>Subscribe</button>
    </form>
  );
}; */
export const StripeUi = ({
  loginStats,
  setLoginStats,
  refreshLoginStats,

  tokenId,

  // loginStatsLoading,
  // setLoginStatsLoading,

  // loginStatsEpoch,
  // setLoginStatsEpoch,
}) => {
  const [amount, setAmount] = useState(0.05);

  //

  const stripePromise = getStripePromise();

  //

  return (
    <div className={classnames(
      styles.stripeUi,
      loginStats.loading ? styles.subscribing : '',
    )}>
      <h1>Stripe</h1>

      {loginStats ? (<>
        <div className={styles.wrap}>
          <input type='number' className={styles.input} value={amount} min={0} max={1} step={0.01} onChange={e => {
            setAmount(e.target.value);
          }} />
          <button className={styles.button} onClick={async () => {
            // POST
            const u = new URL(`${paymentsEndpointUrl}/usage`);
            u.searchParams.set('token', tokenId);
            u.searchParams.set('amount', Math.floor(amount * MICRO_FACTOR * DOLLAR_FACTOR));
            const res = await fetch(u, {
              method: 'POST',
            });
            const j = await res.json();
            console.log('updated usage', j);

            refreshLoginStats();
          }}>Use</button>
        </div>
        
        <div className={styles.subscription}>
          {!loginStats?.usage?.subscribed ? (
            <></>
            // <Elements stripe={stripePromise}>
            //   <CheckoutForm
            //     // setLoginStatsLoading={setLoginStatsLoading}
            //     // loginStatsEpoch={loginStatsEpoch}
            //     // setLoginStatsEpoch={setLoginStatsEpoch}

            //     loginStats={loginStats}

            //     onPaymentMethod={async paymentMethod => {
            //       console.log('got new payment method', paymentMethod);

            //       const u = new URL(`${paymentsEndpointUrl}/subscriptions`);
            //       u.searchParams.set('paymentMethod', paymentMethod.id);
            //       u.searchParams.set('token', tokenId);
            //       const res = await fetch(u, {
            //         method: 'POST',
            //       });
            //       console.log('got payment method res', res);
            //       if (res.ok) {
            //         const j = await res.json();
            //         console.log('got subscription', j);

            //         refreshLoginStats();
            //       } else {
            //         console.warn('invalid status code', res.status);
            //         throw new Error('invalid status code');
            //       }
            //     }}
            //   />
            // </Elements>
          ) : (
            <div className={styles.wrap}>
              <button className={styles.button} onClick={async () => {
                setLoginStats({
                  ...loginStats,
                  loading: true,
                })

                try {
                  const u = new URL(`${paymentsEndpointUrl}/refill`);
                  u.searchParams.set('token', tokenId);
                  const res = await fetch(u, {
                    method: 'POST',
                  });
                  const j = await res.json();
                  console.log('refilled', j);
                } finally {
                  // setLoginStatsEpoch(loginStatsEpoch + 1);
                  refreshLoginStats();
                }
              }}>Refill</button>

              <button className={styles.button} onClick={async () => {
                setLoginStats({
                  ...loginStats,
                  loading: true,
                });

                try {
                  const u = new URL(`${paymentsEndpointUrl}/subscriptions`);
                  u.searchParams.set('token', tokenId);
                  const res = await fetch(u, {
                    method: 'DELETE',
                  });
                  if (res.ok) {
                    const j = await res.json();
                    console.log('deleted subscription', j);
                  } else {
                    console.warn('invalid status code', res.status);
                  }
                } finally {
                  // setLoginStatsLoading(false);
                  // setLoginStatsEpoch(loginStatsEpoch + 1);
                  refreshLoginStats();
                }
              }}>Cancel subscripion</button>
            </div>
          )}
        </div>
      </>) : (
        <div className={styles.wrap}>
          Loading...
        </div>
      )}

      <div className={styles.placeholder}>Working...</div>
    </div>
  );
};