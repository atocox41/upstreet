import {
  SupabaseClient,
} from './clients/supabase-client.js';
import {
  imageCaptioning,
} from './vqa.js';
import {
  Alchemy,
  Network,
} from 'alchemy-sdk';
import uuidByString from 'uuid-by-string';

import {remark} from 'remark';
import strip from 'strip-markdown';

// import {PicketProvider} from '@picketapi/picket-react';

//
// keys
//

const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;
const VROID_HUB_CLIENT_ID = import.meta.env.VITE_VROID_HUB_CLIENT_ID;



//
// alchemy
//

globalThis.testAlchemyToken = async (
  contractAddresss = '0x3999877754904d8542ad1845d368fa01a5e6e9a5', // Vipe Heros
  tokenId = '1614',
) => {
  // Optional config object, but defaults to the API key 'demo' and Network 'eth-mainnet'.
  const settings = {
    apiKey: ALCHEMY_API_KEY, // Replace with your Alchemy API key.
    network: Network.ETH_MAINNET, // Replace with your network.
  };
  const alchemy = new Alchemy(settings);

  // use alchemy to get metadata for contract 0x3999877754904d8542ad1845d368fa01a5e6e9a5
  const nft = await alchemy.nft.getNftMetadata(
    contractAddresss,
    tokenId,
  );

  const {
    tokenUri,
  } = nft;
  const {
    gateway,
  } = tokenUri;

  const res = await fetch(gateway);
  const j = await res.json();

  const {
    asset,
  } = j;
  const match = asset.match(/^ipfs:\/\/(.+)$/);
  const ipfsPath = match[1];

  const u = `https://alchemy.mypinata.cloud/ipfs/${ipfsPath}`;
  const res2 = await fetch(u);
  const blob = await res2.blob();
  console.log('got blob', u, {
    blob,
  });
};
globalThis.testListVrmNfts = async (
  contractAddresss = '0x3999877754904d8542ad1845d368fa01a5e6e9a5', // Vipe Heros
  limit = 1000,
) => {
  // Optional config object, but defaults to the API key 'demo' and Network 'eth-mainnet'.
  const settings = {
    apiKey: ALCHEMY_API_KEY, // Replace with your Alchemy API key.
    network: Network.ETH_MAINNET, // Replace with your network.
  };
  const alchemy = new Alchemy(settings);

  // use alchemy to get metadata for contract 0x3999877754904d8542ad1845d368fa01a5e6e9a5
  let nfts = [];
  let pageKey;
  for (;;) {
    const o = await alchemy.nft.getNftsForContract(
      contractAddresss,
      {
        pageKey,
      },
    );
    const {
      nfts: _nfts,
      pageKey: _pageKey,
    } = o;
    if (
      _nfts.length > 0 && // returned result and
      (nfts.length === 0 || _nfts[0].tokenId !== '0') // first or the result did not start at zero
    ) {
      nfts.push(..._nfts);
      if (nfts.length >= limit) {
        nfts = nfts.splice(0, limit);
        break;
      } else {
        console.log('got more nfts', _nfts, _nfts.length, nfts.length);
        pageKey = _pageKey;
      }
    } else {
      break;
    }
  }

  // load the avatar

  const firstNft = nfts[0];
  const {tokenId} = firstNft;
  const nft = await alchemy.nft.getNftMetadata(
    contractAddresss,
    tokenId,
  );

  const {
    tokenUri,
  } = nft;
  const {
    gateway,
  } = tokenUri;

  const res = await fetch(gateway);
  const j = await res.json();

  const {
    asset,
  } = j;
  const match = asset.match(/^ipfs:\/\/(.+)$/);
  const ipfsPath = match[1];

  const u = `https://alchemy.mypinata.cloud/ipfs/${ipfsPath}`;
  const res2 = await fetch(u);
  const blob = await res2.blob();
  // console.log('got blob', u, {
  //   blob,
  // });
  return blob;
};
globalThis.testAlchemyContract = async (
  contractAddresss = '0x543d43f390b7d681513045e8a85707438c463d80', // Genesis Pass
) => {
  const settings = {
    apiKey: ALCHEMY_API_KEY, // Replace with your Alchemy API key.
    network: Network.ETH_MAINNET, // Replace with your network.
  };
  const alchemy = new Alchemy(settings);

  // use alchemy to get metadata for contract 0x3999877754904d8542ad1845d368fa01a5e6e9a5
  const nfts = [];
  globalThis.nfts = nfts;
  let pageKey;
  for (;;) {
    const o = await alchemy.nft.getNftsForContract(
      contractAddresss,
      {
        pageKey,
      },
    );
    const {
      nfts: _nfts,
      pageKey: _pageKey,
    } = o;
    if (_nfts.length > 0 && (nfts.length === 0 || _nfts[0].tokenId !== '0')) {
      nfts.push(..._nfts);
      console.log('got more nfts', _nfts, _nfts.length, nfts.length);
      pageKey = _pageKey;
    } else {
      break;
    }
    break;
  }
  console.log('got all nfts', nfts);

  const nftsByOwner = new Map();
  globalThis.nftsByOwner = nftsByOwner;
  for (const nft of nfts) {
    const {
      tokenId,
    } = nft;
    const ownerSpec = await alchemy.nft.getOwnersForNft(contractAddresss, tokenId);
    console.log('got owner spec', ownerSpec);
    const {
      owners,
    } = ownerSpec;
    if (owners.length > 1) {
      console.warn('got multiple owners for token', {
        nft,
        owners,
      });
    }
    const owner = owners[0];
    if (!nftsByOwner.has(owner)) {
      nftsByOwner.set(owner, new Set());
    }
    nftsByOwner.get(owner).add(nft);

    // const startBlock = '0xe94c3d';
    // const startBlockInt = BigInt(startBlock);

    // console.log('nfts by owner', owner, nftsByOwner.get(owner));
  }
  console.log('got all nfts by owner', nftsByOwner);
};
globalThis.testContractOwnerTiming = async ({
  contractAddresss = '0x543d43f390b7d681513045e8a85707438c463d80', // Genesis Pass
  contractData = null, // from the above call
} = {}) => {
  const settings = {
    apiKey: ALCHEMY_API_KEY, // Replace with your Alchemy API key.
    network: Network.ETH_MAINNET, // Replace with your network.
  };
  const alchemy = new Alchemy(settings);

  const contractMetadata = await alchemy.nft.getContractMetadata(contractAddresss);
  console.log('got contract metadata', contractMetadata);
  const {
    deployedBlockNumber,
  } = contractMetadata;

  const transfers = [];
  let pageKey = undefined;
  for (;;) {
    const res = await alchemy.core.getAssetTransfers({
      fromBlock: '0x' + deployedBlockNumber.toString(16),
      // toAddress: owner,
      excludeZeroValue: true,
      category: ["erc721", "erc1155"],
      contractAddresses: [contractAddresss],
      pageKey,
    });
    console.log('got res', res);
    await new Promise((accept, reject) => {
      setTimeout(accept, 200);
    });
    const {
      pageKey: _pageKey,
      transfers: _transfers,
    } = res;
    pageKey = _pageKey;
    // console.log('got page key', pageKey);
    transfers.push(..._transfers);
    if (!pageKey) {
      break;
    }
  }
  return transfers;
};



//
// animatediff
//

globalThis.loadAnimatediffImage = async ({
  prompt = `girl running through green field with pokemon`,
  n_prompt = `bad quality, blurry, low resolution`,
} = {}) => {
  const fd = new FormData();
  fd.append('prompt', prompt);
  fd.append('n_prompt', n_prompt);
  fd.append('model', `flat2dAnimergeV3F16.vzgC.safetensors`);
  const res = await fetch('https://ai-proxy.isekai.chat/animatediff', {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) {
    throw new Error('failed to fetch animatediff');
  }
  const blob = await res.blob();
  const img = await new Promise((accept, reject) => {
    const img = new Image();
    const u = URL.createObjectURL(blob);
    const cleanup = () => {
      URL.revokeObjectURL(u);
    };
    img.src = u;
    img.onload = () => {
      accept();
      cleanup();
    };
    img.onerror = err => {
      reject(err);
      cleanup();
    };
  });
  img.style.cssText = `\
position: fixed;
top: 0;
left: 0;
width: 512px;
`;
  document.body.appendChild(img);
};



//
// vroid hub
//

globalThis.testVroidHub = () => {
  location.href = `https://hub.vroid.com/oauth/authorize?client_id=${VROID_HUB_CLIENT_ID}&redirect_uri=https%3A%2F%2Flocal.isekai.chat:4443%2Fh%2F&response_type=code&scope=default`;
};
// https://hub.vroid.com/oauth/authorize?client_id=PrsX2jabqmDLVG59boEFcgf_MFNA648n7JwInOpjohs&redirect_uri=https%3A%2F%2Fisekai.chat%2F&response_type=code&scope=default
  /*
  curl -X POST https://hub.vroid.com/oauth/token \
    -H 'X-Api-Version: 11' \
    -d client_id=PrsX2jabqmDLVG59boEFcgf_MFNA648n7JwInOpjohs \
    -d client_secret=NWG9qeFcnKfQ-Z8u3lL2_vVOjRXIn4nLoaNXG8g87Vg \
    -d 'redirect_uri=https://local.isekai.chat/' \
    -d grant_type=authorization_code \
    -d code=YMeql8X4D5XncP7vgxgLiILV6U1JMZMN7xa88kWmll8
  */
  /*
  {"access_token":"CKnc9R0hmvvMX1MtgZfcEJP6vzt8LdlknkM8tD9Lzxk","token_type":"Bearer","expires_in":3599,"refresh_token":"TQpW2E6PssCd-s5_yZHl7lqFWn3wCNw1yOYBW8aMeu8","scope":"default","created_at":1691501750}
  */
  /*
  curl https://hub.vroid.com/api/account/character_models \
    -H 'X-Api-Version: 11' \
    -H 'Authorization: Bearer CKnc9R0hmvvMX1MtgZfcEJP6vzt8LdlknkM8tD9Lzxk' | js-beautify
    
  curl https://hub.vroid.com/api/staff_picks \
    -H 'X-Api-Version: 11' \
    -H 'Authorization: Bearer CKnc9R0hmvvMX1MtgZfcEJP6vzt8LdlknkM8tD9Lzxk' | js-beautify

  curl https://hub.vroid.com/api/download_licenses \
    -X POST \
    -H 'X-Api-Version: 11' \
    -H 'Authorization: Bearer CKnc9R0hmvvMX1MtgZfcEJP6vzt8LdlknkM8tD9Lzxk' \
    -d 'character_model_id=6438856096433317765' | js-beautify
  
  curl -L https://hub.vroid.com/api/download_licenses/10534180-3467271859969287925/download \
    -H 'X-Api-Version: 11' \
    -H 'Authorization: Bearer CKnc9R0hmvvMX1MtgZfcEJP6vzt8LdlknkM8tD9Lzxk'
  */
(async () => {
  const u = new URL(location.href);
  const code = u.searchParams.get('code');
  if (code) {
    u.searchParams.delete('code');
    history.replaceState(null, null, u.href);

    const u2 = new URL('/vroidhub/oauth', location.href);
    u2.searchParams.set('code', code);
    u2.searchParams.set('redirect_uri', 'https://local.isekai.chat:4443/h/');
    const res = await fetch(u2);
    const j = await res.json();
    const {
      access_token,
    } = j;

    const characterModels = await (async () => {
      const res = await fetch('/vroidhub/api/staff_picks', {
        headers: {
          'X-Api-Version': 11,
          'Authorization': `Bearer ${access_token}`,
        },
      });
      const j = await res.json();
      return j;
    })();
    console.log('staff picks', characterModels);

    // get the license json
    const characterModel = characterModels.data[0];
    console.log('staff pick', characterModel.character_model.id);
    const licenseJson = await (async () => {
      const fd = new FormData();
      fd.append('character_model_id', characterModel.character_model.id);
      const res = await fetch('/vroidhub/api/download_licenses', {
        method: 'POST',
        headers: {
          'X-Api-Version': 11,
          'Authorization': `Bearer ${access_token}`,
        },
        body: fd,
      });
      const j = await res.json();
      return j;
    })();
    console.log('license json', licenseJson);

    // download the vrm
    const vrmBlob = await (async () => {
      const res = await fetch(`/vroidhub/api/download_licenses/${licenseJson.data.id}/download`, {
        headers: {
          'X-Api-Version': 11,
          'Authorization': `Bearer ${access_token}`,
        },
      });
      const b = await res.blob();
      return b;
    })();
    console.log('vrm blob', vrmBlob);

    return j;
  }
})();



//
// embedding
//

const extractMdText = async text => {
  return await remark()
    .use(strip)
    .process(text)
    .then((file) => String(file));
}
function extractImagesFromMarkdown(mdString) {
  // This regex pattern matches markdown image format ![alt text](url)
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  let matches;
  const images = [];
  while ((matches = imageRegex.exec(mdString)) !== null) {
    images.push(matches[1]);
  }
  return images;
}
globalThis.testEmbeddingFiles = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.click();
  const files = await new Promise((accept, reject) => {
    input.addEventListener('change', async (e) => {
      const {files} = e.target;
      accept(files);
    });
  });
  const file = files[0];
  const text = await file.text();
  // console.log('got files', files);

  const rawMarkdown = await extractMdText(text);
  const images = extractImagesFromMarkdown(text);

  const markdownSplits = await split(rawMarkdown);
  console.log('got markdown splits', markdownSplits);

  //

  const imageEmbeddings = [];
  for (const image of images) {
    // if (!/\.gif/.test(image)) {
      let blob = null;
      try {
        const res = await fetch(image);
        blob = await res.blob();
      } catch(err) {
        console.warn(err);
      }
      if (blob === null) {
        continue;
      }

      const caption = await imageCaptioning(blob);
      console.log('got image caption', JSON.stringify(caption));

      const dataUrl = await new Promise((accept, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          const {result} = reader;
          accept(result);
        });
        reader.readAsDataURL(blob);
      });

      const embedding = await embed(caption);

      const imageEmbedding = {
        dataUrl,
        caption,
        embedding,
      };
      imageEmbeddings.push(imageEmbedding);
    // }
  }
  console.log('got image embeddings', imageEmbeddings);

  //

  const supabaseClient = new SupabaseClient();
  const {supabase} = supabaseClient;
  const {data: {user}} = await supabase.auth.getUser();
  const user_id = user.id;

  //

  // upload markdown text
  for (const paragraphLines of markdownSplits) {
    const content = paragraphLines.join('\n');
    const id = uuidByString(content);

    const embedding = await embed(content);

    const loreItem = {
      id,
      user_id,
      type: 'text',
      content,
      embedding,
    };
    console.log('upload text lore', loreItem);
    await supabase.from('lore')
      .upsert(loreItem);
  }

  // upload image embeddings
  for (const imageEmbedding of imageEmbeddings) {
    const {dataUrl, caption, embedding} = imageEmbedding;
    const id = uuidByString(dataUrl);

    const loreItem = {
      id,
      user_id,
      type: 'image',
      content: {
        dataUrl,
        caption,
      },
      embedding,
    };
    console.log('upload image lore', loreItem);
    await supabase.from('lore')
      .upsert(loreItem);
  } 

  //

  return {
    rawMarkdown,
    markdownSplits,
    imageEmbeddings,
  };
};
globalThis.testEmbeddingString = async (content = 'hello world') => {
  const embedding = await embed(content);

  const supabaseClient = new SupabaseClient();
  const {supabase} = supabaseClient;

  const {data: {user}} = await supabase.auth.getUser();
  const user_id = user.id;

  const loreItem = {
    id: crypto.randomUUID(),
    user_id,
    content,
    embedding,
  };
  await supabase.from('lore')
    .upsert(loreItem);

  const {
    data: documents,
  } = await supabase.rpc('match_lore', {
    query_embedding: embedding, // Pass the embedding you want to compare
    match_threshold: 0.7, // Choose an appropriate threshold for your data
    match_count: 10, // Choose the number of matches
  });
  console.log('documents', documents);
};

/* export default function PicketApp({
  Component,
  pageProps,
}) {
  return (
    <PicketProvider apiKey={process.env.PICKET_PUBLISHABLE_KEY}>
      <Component {...pageProps} />
    </PicketProvider>
  )
} */