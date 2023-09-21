import {
  getDatasetSpecsMd,
  getDatasetSamplesMd,
} from './dataset-specs.js';
import {DatasetEngine} from './dataset-engine.js';
// import {Ctx} from '../clients/context.js';
// import {
//   OPENAI_API_KEY,
//   AWS_ACCESS_KEY,
//   AWS_SECRET_ACCESS_KEY,
// } from '../src/constants/auth.js';

/* export const generateItem = async (type, name = '', description = '') => {
  const datasetSpecs = await getDatasetSpecsMd();
  const datasetSpec = datasetSpecs.find(ds => ds.type === type);
  if (datasetSpec) {
    const ctx = new Ctx({
      OPENAI_API_KEY,
      AWS_ACCESS_KEY,
      AWS_SECRET_ACCESS_KEY,
    });
    const datasetEngine = new DatasetEngine({
      dataset: datasetSpec,
      aiClient: ctx.aiClient,
    });
    // const generatedItem = await datasetEngine.generateItem(name, description);
    const generatedItem = await datasetEngine.generateItemChat(name, description);
    return generatedItem;
  } else {
    throw new Error('unknown dataset: ' + type);
  }
}; */

export const generateItemChat = async (ctx, type, name = '', description = '') => {
  // console.log('generate item chat', {
  //   type,
  //   name,
  //   description,
  // });

  const datasetSpecs = await getDatasetSpecsMd();
  const datasetSamples = await getDatasetSamplesMd();
  const datasetSpec = datasetSpecs.find(ds => ds.type === type);
  const datasetSample = datasetSamples.find(s => s.type === type);
  if (datasetSpec && datasetSample) {
    // const ctx = new Ctx({
    //   OPENAI_API_KEY,
    // });
    const datasetEngine = new DatasetEngine({
      dataset: datasetSpec,
      samples: datasetSample,
      aiClient: ctx.aiClient,
    });
    // globalThis.datasetEngine = datasetEngine;
    // const generatedItem = await datasetEngine.generateItem(name, description);
    const generatedItem = await datasetEngine.generateItemChat(name, description);

    // return generatedItem;
    // console.log('generated item', generatedItem);
    return generatedItem;
  } else {
    throw new Error('unknown dataset: ' + type);
  }
};