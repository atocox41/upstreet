import {
  useState,
  useEffect,
  // useRef,
} from 'react';
import React from 'react';
import classnames from 'classnames';

import ContentObjectWrap from './[contents]/[name].jsx';
import { Header } from "../src/components/header/Header";
import {
  useRouter,
} from '../src/utils/router.js';

import {
  getDatasetSpecsMd,
} from '../datasets/dataset-specs.js';
import {Ctx} from "../clients/context.js";
import {
  OPENAI_API_KEY,
  // OPENAI_ACCESS_TOKEN,
  AWS_ACCESS_KEY,
  AWS_SECRET_ACCESS_KEY,
} from '../src/constants/auth.js';

import styles from '../styles/Index.module.css';

//

const ContentsPage = ({
  router,
  ctx,
  slugs,
}) => {
  const mode = slugs?.[0] ?? '';
  const tab = slugs?.[1] ?? '';
  const name = slugs?.[2] ?? '';

  return (
    <div className={styles.contents}>
      {mode} {tab} {name}
    </div>
  );
};
const ContentPage = ({
  router,
  ctx,
  slugs,
  query,
}) => {
  const mode = slugs?.[0] ?? '';
  const tab = slugs?.[1] ?? '';
  const name = slugs?.[2] ?? '';

  // console.log('render', {ContentObject});

  return (
    <ContentObjectWrap
      router={router}
      ctx={ctx}
      slugs={slugs}
      query={query}
    />
  );
};

//

const SearchPage = ({
  router,
  ctx,
  slugs,
}) => {
  const [results, setResults] = useState([]);
  const [type, setType] = useState('');
  const [types, setTypes] = useState([]);
  const [nameValue, setNameValue] = useState('');
  const [text, setText] = useState('');

  // load types array
  useEffect(() => {
    let live = true;

    (async () => {
      const datasetSpecs = await getDatasetSpecsMd();
      if (!live) return;

      // console.log('got dataset specs, need to set types', datasetSpecs);
      const types = datasetSpecs.map(spec => spec.type);
      setTypes(types);
      setType(types[0]);
    })();

    return () => {
      live = false;
    };
  }, []);

  // search logic
  useEffect(() => {
    if (text) {
      let live = true;

      (async () => {
        const results = await ctx.databaseClient.search(type, text);
        if (!live) return;

        const payloads = results.map(p => p.payload);
        // console.log('got payloads', payloads);
        setResults(payloads);
        // console.log('got results', results);
      })();

      return () => {
        live = false;
      };
    } else {
      setResults([]);
    }
  }, [text]);

  const submit = () => {
    if (nameValue) {
      router.pushUrl(location.protocol + '//' + location.host + `/content/${type}/${nameValue}`);
    }
  };

  const mode = slugs?.[0] ?? '';
  const tab = slugs?.[1] ?? '';
  const name = slugs?.[2] ?? '';

  return (
    <div className={styles.container}>
      <div className={styles.search}>
        <div className={styles.row}>
          <select className={styles.select} value={type} onChange={e => {
            setType(e.target.value);
          }}>
            {types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input type="text" value={nameValue} placeholder="name" onChange={e => {
            setNameValue(e.target.value);
          }} onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              submit();
            }
          }} />
          <input type="button" value="Go" onClick={e => {
            console.log('click go', e);
            submit();
          }} />
          <input type="button" value="List" onClick={e => {
            console.log('click list', e);
            router.pushUrl(location.protocol + '//' + location.host + `/content/${type}`);
          }} />
          <input type="button" value="Spec" onClick={e => {
            console.log('click spec', e);
            router.pushUrl(location.protocol + '//' + location.host + `/specs/${type}/${name}`);
          }} />
        </div>
        <div className={styles.search}>
          <input type="text" className={styles.input} value={text} onChange={e => {
            setText(e.target.value);
          }} />
          <div className={styles.results}>
            {
              results.map((result, index) => {
                const text = result.Description ?? result.Biography ?? '';
                return (
                  <div className={styles.result} key={index} onClick={e => {
                    console.log('click result', result, e);
                    const {Name} = result;
                    router.pushUrl(location.protocol + '//' + location.host + `/content/${type}/${Name}`);
                  }}>{text}</div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

//

export const Index = () => {
  // const [initialProps, setInitialProps] = useState(null);
  const [router, setRouter] = useState(() => useRouter());
  // const [tab, setTab] = useState(router.currentTab);
  const [slugs, setSlugs] = useState(router.currentSlugs);
  const [query, setQuery] = useState(router.currentQuery);
  if (!AWS_ACCESS_KEY || !AWS_SECRET_ACCESS_KEY) {
    throw new Error('missing AWS_ACCESS_KEY or AWS_SECRET_ACCESS_KEY');
  }
  const [ctx, setCtx] = useState(() => new Ctx({
    OPENAI_API_KEY,
    AWS_ACCESS_KEY,
    AWS_SECRET_ACCESS_KEY,
    // OPENAI_ACCESS_TOKEN,
  }));

  //

  const isIframe = window !== window.parent;

  //

  // router
  useEffect(() => {
    const slugschange = e => {
      const {
        slugs,
        query,
      } = e.data;
      // console.log('slugs change', {slugs});
      setSlugs(slugs);
      setQuery(query);
    };
    router.addEventListener('slugschange', slugschange);
    
    return () => {
      router.removeEventListener('slugschange', slugschange);
    };
  }, [router]);

  const mode = slugs?.[0] ?? '';
  const tab = slugs?.[1] ?? '';
  const name = slugs?.[2] ?? '';

  return (
    <div className={classnames(
      styles.page,
      isIframe ? styles.iframe : null,
    )}>
      <Header router={router} />
      {(() => {
        switch (mode) {
          case '': {
            return (
              <SearchPage
                router={router}
                ctx={ctx}
                slugs={slugs}
              />
            );
          }
          case 'content': {
            switch (tab) {
              case 'character':
              case 'setting':
              {
                if (!name) {
                  return (
                    <ContentsPage
                      router={router}
                      ctx={ctx}
                      slugs={slugs}
                      query={query}
                    />
                  );
                } else {
                  return (
                    <ContentPage
                      router={router}
                      ctx={ctx}
                      slugs={slugs}
                      query={query}
                    />
                  );
                }
              }
              /* case 'setting': {
                if (!name) {
                  return (
                    <div className={styles.settings}>
                      Settings
                    </div>
                  );
                } else {
                  return (
                    <div className={styles.settings}>
                      Setting {name}
                    </div>
                  );
                }
              } */
              default: {
                console.warn('unknown tab', tab);
                return null;
              }
            }
          }
          case 'specs': {
            return (
              <div className={styles.specs}>
                Specs for {tab}
              </div>
            );
          }
          default: {
            console.warn('unknown mode', mode);
            return null;
          }
        }
      })()}
    </div>
  );
};