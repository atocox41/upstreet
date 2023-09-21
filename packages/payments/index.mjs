import Stripe from 'stripe';
import {
  createClient,
} from '@supabase/supabase-js';

//

const MICRO_FACTOR = 1e6;

//

const headersArray = [
  {
    "key": "Access-Control-Allow-Origin",
    "value": "*"
  },
  {
    "key": "Access-Control-Allow-Methods",
    "value": "*"
  },
  {
    "key": "Access-Control-Allow-Headers",
    "value": "*"
  },
  {
    "key": "Access-Control-Expose-Headers",
    "value": "*"
  },
  {
    "key": "Access-Control-Allow-Private-Network",
    "value": "true"
  },
  // {
  //   "key": "Cross-Origin-Opener-Policy",
  //   "value": "same-origin"
  // },
  // {
  //   "key": "Cross-Origin-Embedder-Policy",
  //   "value": "require-corp"
  // },
  // {
  //   "key": "Cross-Origin-Resource-Policy",
  //   "value": "cross-origin"
  // }
];
const headers = {};
for (const header of headersArray) {
  const {
    key,
    value,
  } = header;
  headers[key] = value;
}

//

function makeFakeStorage() {
  const o = {};
  return {
    getItem: key => {
      return o[key];
    },
    setItem: (key, value) => {
      o[key] = value;
    },
    removeItem: key => {
      delete o[key];
    },
  };
}

//

class TokenCache {
  constructor({
    supabase,
  }) {
    this.supabase = supabase;
    this.map = new Map(); // token : string -> userId : string
  }
  async getUserId(tokenId) {
    let userId = this.map.get(tokenId);
    if (!userId) {
      userId = await this.#getUserIdInternal(tokenId);
      this.map.set(tokenId, userId);
      return userId;
    } else {
      // refresh for next time
      (async () => {
        const userId2 = await this.#getUserIdInternal(tokenId);
        if (userId2 !== userId) {
          if (userId2) {
            this.map.set(tokenId, userId2);
          } else {
            this.map.delete(tokenId);
          }
        }
      })();
      return userId;
    }
  }
  async #getUserIdInternal(tokenId) {
    const {
      error,
      data: token,
    } = await supabase
      .from('tokens')
      .select('*')
      .eq('token', tokenId)
      .maybeSingle();
    if (!error) {
      return token.user_id;
    } else {
      throw new Error(error.message);
    }
  }
}

//

class UsageCache {
  constructor({
    supabase,
    stripe,
    map,
  }) {
    this.supabase = supabase;
    this.stripe = stripe;
    this.map = map; // userId : string -> { amount: number, total : number }
  }
  async get(userId) {
    let usage = this.map.get(userId);
    // console.log('got old usage', [userId, usage]);
    if (!usage) {
      const {
        supabase,
        stripe,
      } = this;

      const [
        {
          subscriptions,
          payments,
        },
        oldUsage,
      ] = await Promise.all([
        (async () => {
          // get all subscriptions for this userId from supabase, as an array
          const result = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId);
          // console.log('got subscriptions result', {userId, result});
          const subscriptions = result.data || [];

          // get all payments for this userId from stripe
          const payments = [];
          const seenCustomerIds = new Set();
          for (const subscription of subscriptions) {
            if (!seenCustomerIds.has(subscription.stripe_customer_id)) {
              seenCustomerIds.add(subscription.stripe_customer_id);
              // get all matching paid invoices from stripe
              let starting_after;
              for (;;) {
                const result = await stripe.paymentIntents.list({
                  customer: subscription.stripe_customer_id,
                  // status: 'succeeded',
                  limit: 100,
                  starting_after,
                });
                // console.log('got payments result', {subscription, result});
                const payments2 = result.data || [];
                payments.push(...payments2);

                // if there are more pages, get them
                if (result.has_more) {
                  starting_after = payments2[payments2.length - 1].id;
                  continue;
                } else {
                  break;
                }
              }
            }
          }
          return {
            subscriptions,
            payments,
          };
        })(),
        (async () => {
          // get the usage from supabase
          const {
            data: oldUsage,
          } = await supabase
            .from('usage')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();
          return oldUsage;
        })(),
      ]);

      let usageAmount = oldUsage !== null ? oldUsage.amount : 0;
      let usageTotal = payments.reduce((acc, payment) => {
        const amount = payment.amount * MICRO_FACTOR;
        return acc + amount;
      }, 0);

      usage = {
        amount: usageAmount,
        total: usageTotal,
        subscribed: subscriptions.some(subscription => subscription.active),
      };
      this.map.set(userId, usage);
    }
    return usage;
  }
  async delete(userId) {
    this.map.delete(userId);
  }
  refresh(userId) {
    (async () => {
      await this.delete(userId);
      await this.get(userId);
    })();
  }
}

//

// Cloudflare worker handler
const fakeStorage = makeFakeStorage();
const usageCacheMap = new Map();
let stripe = null;
let supabase = null;
let tokenCache = null;
let usageCache = null;
export default {
  async fetch(request, env, ctx) {
    const {
      SUPABASE_URL,
      SUPABASE_SERVICE_API_KEY,
      STRIPE_SECRET_KEY: stripeSecretKey,
      STRIPE_SUBSCRIPTION_PRICE_ID: stripeSubscriptionPriceId,
    } = env;

    if (!stripe) {
      stripe = new Stripe(stripeSecretKey);
    }
    if (!supabase) {
      supabase = createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_API_KEY,
        {
          auth: {
            storage: fakeStorage,
          },
        },
      );
    }
    if (!tokenCache) {
      tokenCache = new TokenCache({
        supabase,
      });
    }
    if (!usageCache) {
      usageCache = new UsageCache({
        supabase,
        stripe,
        map: usageCacheMap,
      });
    }

    // return await handleErrors(request, async () => {
      try {
        const url = new URL(request.url);
        const params = new URLSearchParams(url.search);
        console.log('got request', request.method, url.pathname);
        if (request.method === 'OPTIONS') {
          return new Response(JSON.stringify({}), {status: 200, headers});
        } else if (request.method === 'GET') {
          if (url.pathname === '/stats') {
            // handle the route /stats?token=bar
            const token = params.get('token');

            if (!token) {
              return new Response(JSON.stringify({ error: { message: 'token is required' } }), {status: 400, headers});
            }

            const userId = await tokenCache.getUserId(token);
            if (!userId) {
              return new Response(JSON.stringify({ error: { message: 'invalid token' } }), {status: 400, headers});
            }

            const usageSpec = await usageCache.get(userId);
            const usageRemaining = Math.max(usageSpec.total - usageSpec.amount, 0);
            const usage = {
              user_id: userId,
              amount: usageSpec.amount,
              total: usageSpec.total,
              remaining: usageRemaining,
              subscribed: usageSpec.subscribed,
            };
            
            return new Response(JSON.stringify({ usage }), {status: 200, headers});
          } else {
            return new Response(JSON.stringify({ error: { message: 'not found' } }), {status: 404, headers});
          }
        } else if (request.method === 'POST') {
          if (url.pathname === '/subscriptions') {
            // handle the route /subscriptions?paymentMethod=foo&token=bar
            const paymentMethodId = params.get('paymentMethod'); // stripe customer id
            const token = params.get('token');

            if (!paymentMethodId) {
              return new Response(JSON.stringify({ error: { message: 'paymentMethod is required' } }), {status: 400, headers});
            }
            if (!token) {
              return new Response(JSON.stringify({ error: { message: 'token is required' } }), {status: 400, headers});
            }

            const userId = await tokenCache.getUserId(token);
            if (!userId) {
              return new Response(JSON.stringify({ error: { message: 'invalid token' } }), {status: 400, headers});
            }

            // ensure there is no existing active subscription for this userId
            const {
              data: existingSubscription,
            } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', userId)
              .eq('active', true)
              .maybeSingle();
            if (existingSubscription) {
              return new Response(JSON.stringify({ error: { message: 'subscription already exists' } }), {status: 400, headers});
            }

            // Get the payment method from stripe
            console.log('got payment method 1', [paymentMethodId]);
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
            if (!paymentMethod) {
              return new Response(JSON.stringify({ error: { message: 'paymentMethod not found' } }), {status: 400, headers});
            }
            console.log('got payment method 2', [paymentMethod]);

            // Create the customer from the payment method
            const customer = await stripe.customers.create({
              payment_method: paymentMethod.id,
              email: paymentMethod.billing_details.email,
              invoice_settings: {
                default_payment_method: paymentMethod.id,
              },
            });
            console.log('got customer 1', [customer]);

            // Create the subscription from the customer
            const subscription = await stripe.subscriptions.create({
              customer: customer.id,
              items: [{ price: stripeSubscriptionPriceId }],
              expand: ['latest_invoice.payment_intent'],
            });
            console.log('got subscription 1', [subscription]);

            // add subscription to supabase
            const {error} = await supabase
              .from('subscriptions')
              .insert([
                {
                  user_id: userId,
                  stripe_subscription_id: subscription.id,
                  stripe_customer_id: customer.id,
                },
              ])
              .maybeSingle();
            console.log('inserted subscription 1', {
              userId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customer.id,
              error,
            });

            if (!error) {
              // refresh the usage cache
              usageCache.refresh(userId);

              return new Response(JSON.stringify({ subscription }), {status: 200, headers});
            } else {
              return new Response(JSON.stringify({ error }), {status: 500, headers});
            }
          } else if (url.pathname === '/refill') {
            // handle the route /subscriptions?token=foo&subscriptionId=bar&paymentMethod=bar
            const token = params.get('token');

            if (!token) {
              return new Response(JSON.stringify({ error: { message: 'token is required' } }), {status: 400, headers});
            }

            const userId = await tokenCache.getUserId(token);
            if (!userId) {
              return new Response(JSON.stringify({ error: { message: 'invalid token' } }), {status: 400, headers});
            }

            // get the active subscription from supabase
            const {
              data: subscription,
            } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', userId)
              .eq('active', true)
              .maybeSingle();
            
            if (subscription !== null) {
              // get the subscription from stripe
              const subscriptionId = subscription.stripe_subscription_id;
              const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
              console.log('got stripe subscription', stripeSubscription);

              // get the customer from stripe
              const customerId = stripeSubscription.customer;
              const stripeCustomer = await stripe.customers.retrieve(customerId);
              console.log('got stripe customer', stripeCustomer);

              const paymentMethodId = stripeCustomer.invoice_settings.default_payment_method;

              // create the payment for stripeRefillPriceId
              const paymentIntent = await stripe.paymentIntents.create({
                amount: 500,
                currency: 'usd',
                customer: customerId,
                payment_method_types: ['card'],
                payment_method: paymentMethodId,
                confirm: true,
                off_session: true,
              });

              // refresh the usage cache
              usageCache.refresh(userId);

              return new Response(JSON.stringify({ paymentIntent }), {status: 200, headers});
            } else {
              return new Response(JSON.stringify({ error: { message: 'subscription not found' } }), {status: 400, headers});
            }
          } else if (url.pathname === '/usage') {
            // handle the route /usage?token=foo&amount=baz
            const token = params.get('token');
            const amountString = params.get('amount'); // amount to use

            if (!token) {
              return new Response(JSON.stringify({ error: { message: 'token is required' } }), {status: 400, headers});
            }
            if (!amountString) {
              return new Response(JSON.stringify({ error: { message: 'amount is required' } }), {status: 400, headers});
            }
            const amount = parseInt(amountString, 10);
            if (isNaN(amount)) {
              return new Response(JSON.stringify({ error: { message: 'amount must be an integer' } }), {status: 400, headers});
            }

            const userId = await tokenCache.getUserId(token);
            if (!userId) {
              return new Response(JSON.stringify({ error: { message: 'invalid token' } }), {status: 400, headers});
            }

            const usageSpec = await usageCache.get(userId);
            const usageRemaining = usageSpec.total - usageSpec.amount - amount;

            if (usageRemaining >= 0) {
              usageSpec.amount += amount;

              // upsert new usage
              ctx.waitUntil((async () => {
                const newUsage = {
                  user_id: userId,
                  amount: usageSpec.amount,
                };
                console.log('upsert new usage', newUsage);
                const {error} = await supabase
                  .from('usage')
                  .upsert([
                    newUsage,
                  ])
                  .eq('user_id', userId)
                  .maybeSingle();
                if (error) {
                  console.warn('error upserting new usage', error);
                }
              })());

              const usage = {
                user_id: userId,
                amount: usageSpec.amount,
                total: usageSpec.total,
                remaining: usageRemaining,
                subscribed: usageSpec.subscribed,
              };
              
              return new Response(JSON.stringify({ usage }), {status: 200, headers});
            } else {
              return new Response(JSON.stringify({ error: { message: 'usage exceeds total' } }), {status: 402, headers});
            }
          } else {
            return new Response(JSON.stringify({ error: { message: 'not found' } }), {status: 404, headers});
          }
        } else if (request.method === 'DELETE') {
          if (url.pathname === '/subscriptions') {
            // handle the route /subscriptions?userId=bar
            const token = params.get('token');

            if (!token) {
              return new Response(JSON.stringify({ error: { message: 'token is required' } }), {status: 400, headers});
            }

            const userId = await tokenCache.getUserId(token);
            if (!userId) {
              return new Response(JSON.stringify({ error: { message: 'invalid token' } }), {status: 400, headers});
            }

            // get all active subscriptions from supabase
            const {
              data: subscriptions,
            } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', userId)
              .eq('active', true);

            // cancel all active subscriptions in stripe
            for (const subscription of subscriptions) {
              const subscriptionId = subscription.stripe_subscription_id;
              const result = await stripe.subscriptions.del(subscriptionId);
              console.log('got stripe cancel result', {subscriptionId, result});
            }

            // update all subscriptions for this userId to inactive
            const {
              error,
            } = await supabase
              .from('subscriptions')
              .update({
                active: false,
              })
              .eq('user_id', userId)
              .eq('active', true);
            
            // refresh the usage cache
            usageCache.refresh(userId);

            if (!error) {
              return new Response(JSON.stringify({ ok: true }), {status: 200, headers});
            } else {
              return new Response(JSON.stringify({ error }), {status: 500, headers});
            }
          } else {
            return new Response(JSON.stringify({ error: { message: 'not found' } }), {status: 404, headers});
          }
        } else {
          return new Response(JSON.stringify({ error: { message: 'Not found' } }), {status: 404, headers});
        }
      } catch (error) {
        console.warn(error.stack);
        return new Response(JSON.stringify({ error: { message: error.message } }), {status: 400, headers});
      }
    // });
  }
}