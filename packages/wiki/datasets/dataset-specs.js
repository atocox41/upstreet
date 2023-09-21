import {
  parseDatasetSpec,
  parseDatasetItems,
  formatTrainingItemCandidates,
  // getItemNameKey,
  // getItemDescriptionKey,
  // getItemAttributeKeys,
} from './dataset-parser.js';

//

const fetchText = async u => {
  const res = await fetch(u);
  if (res.ok) {
    const text = await res.text();
    return text;
  } else {
    throw new Error(`fetch error ${res.status} ${res.statusText} ${u}`);
  }
};

//

const datasetSpecsBasePath = `/lore/datasets/specs/`;
const datasetDataBasePath = `/lore/datasets/data/`;
const mdSpecs = [
  {
    // type: 'character',
    url: 'characters.md',
  },
  {
    // type: 'setting',
    url: 'settings.md',
  },
  {
    // type: 'item',
    url: 'items.md',
  },
  {
    // type: 'cutscene',
    url: 'cutscenes.md',
  },
  {
    // type: 'chat',
    url: 'chats.md',
  },
  {
    // type: 'lore',
    url: 'lore.md',
  },
  {
    // type: 'battle-banter',
    url: 'battle-banters.md',
    // groupKey: 'Banters',
  },
  // {
  //   // type: 'match',
  //   url: 'matches.md',
  //   // nameKey: 'Match string',
  //   // descriptionKey: 'Candidate assets',
  // },
];
const datasetSpecUrls = mdSpecs.map(mdSpec => `${datasetSpecsBasePath}${mdSpec.url}`);
const datasetDataUrls = mdSpecs.map(mdSpec => `${datasetDataBasePath}${mdSpec.url}`);

//

/* let datasetSpecPromise = null;
export const getDatasetSpecs = () => {
  if (!datasetSpecPromise) {
    datasetSpecPromise = (async () => {
      const datasetSpecs = await Promise.all(datasetSpecUrls.map(async datasetSpecUrl => {
        const mdText = await fetchText(datasetSpecUrl);
        const datasetSpec = parseDatasetSpec(mdText);
        return datasetSpec;
      }));
      return datasetSpecs;
    })();
  }
  return datasetSpecPromise;
}; */
let datasetSpecMdPromise = null;
export const getDatasetSpecsMd = () => {
  if (!datasetSpecMdPromise) {
    datasetSpecMdPromise = (async () => {
      const datasetSpecs = await Promise.all(datasetSpecUrls.map(async datasetSpecUrl => {
        const type = datasetSpecUrl.match(/\/([^/]+?)s?\.md$/)[1];
        const mdText = await fetchText(datasetSpecUrl);
        return {
          type,
          markdown: mdText,
        };
        // const datasetSpec = parseDatasetSpec(mdText);
        // return datasetSpec;
      }));
      return datasetSpecs;
    })();
  }
  return datasetSpecMdPromise;
};

let datasetSamplesPromise = null;
export const getDatasetSamplesMd = () => {
  if (!datasetSamplesPromise) {
    datasetSamplesPromise = (async () => {
      // const datasetSpecs = await getDatasetSpecsMd();
      const datasetSamples = await Promise.all(datasetDataUrls.map(async (datasetDataUrl, index) => {
        const type = datasetDataUrl.match(/\/([^/]+?)s?\.md$/)[1];
        const mdText = await fetchText(datasetDataUrl);
        return {
          type,
          markdown: mdText,
        };
        // const datasetSpec = datasetSpecs[index];
        // let items = parseDatasetItems(mdText, datasetSpec);
        // items = items.map(item => formatTrainingItemCandidates(item, datasetSpec)).flat();
        // return items;
      }));
      return datasetSamples;
    })();
  }
  return datasetSamplesPromise;
};