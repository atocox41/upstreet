// import Alea from 'alea';
import {
  formatDatasetNamePrompt,
  formatDatasetDescriptionPrompt,
  formatDatasetAttributePrompts,
} from './dataset-parser.js';
import {
  shuffle,
} from '../utils.js';

const stops = [
  '\n\n',
  '@Type',
  '\n#'
];

export class DatasetEngine {
  constructor({
    dataset,
    samples,
    aiClient,
  }) {
    this.dataset = dataset;
    this.samples = samples;
    this.aiClient = aiClient;
  }
  async generateItem(name = '', description = '') {
    const {
      nameKey,
      descriptionKey,
      // attributeKeys,
    } = this.dataset;

    if (!name) {
      const namePrompt = formatDatasetNamePrompt(this.dataset);
      // console.log('got name prompt', {namePrompt});
      name = await this.aiClient.generate(namePrompt, stops);
      name = name.trim();
    }
    if (!description) {
      const descriptionPrompt = formatDatasetDescriptionPrompt(this.dataset, name);
      // console.log('got description prompt', {descriptionPrompt});
      description = await this.aiClient.generate(descriptionPrompt, stops);
      description = description.trim();
    }

    const attributes = {
      [nameKey]: name,
      [descriptionKey]: description,
    };
    const attributePrompts = formatDatasetAttributePrompts(this.dataset, name, description);
    await Promise.all(attributePrompts.map(async attributePromptSpec => {
      const {
        key: attributeName,
        prompt: attributePrompt,
      } = attributePromptSpec;
      let attributeValue = await this.aiClient.generate(attributePrompt, stops);
      attributeValue = attributeValue.trim();
      attributes[attributeName] = attributeValue;
    }));

    return attributes;

    /* if (this.dataset.items.length > 0) {
      const item0 = this.dataset.items[0];

      const prompt = this.dataset.generateItemPrompt(name);
      const result = await this.aiClient.generate(prompt, '\n\n');
      
      const response = `##${result}`;
      const fullResponse = `# ${name}\n${response}`;
      const parsedResponse = parseItems(fullResponse)[0] ?? null;
      
      return {
        prompt,
        response,
        parsedResponse,
      };
    } else {
      throw new Error(`dataset has no items: ${this.dataset}`);
    } */
  }
  async generateItemChat(name = '', description = '') {
    // const {
    //   nameKey,
    //   descriptionKey,
    //   // attributeKeys,
    // } = this.dataset;
    // console.log('got dataset', this.dataset);
    const {
      markdown,
    } = this.dataset;

    // console.log('got samples', this.samples);
    let samples = this.samples.markdown.split('\n\n');
    samples = shuffle(samples);
    const sample = samples[0];

    // console.log('pre-gen', this.aiClient.createChat);
    const chat = this.aiClient.createChat();
    // globalThis.chat = chat;
    const response = await chat.send(`\
${markdown}

Here is some sample output to show the formatting:
\`\`\`
${sample}
\`\`\`

${name ? `The name should be "${name}"` : ''}
${description ? `The description should be based on the following:
${description}` : ''}`);
    // console.log('generateItemChat response', response);
    // globalThis.itemString = response;
    return response;

    /* if (!name) {
      const namePrompt = formatDatasetNamePrompt(this.dataset);
      // console.log('got name prompt', {namePrompt});
      name = await this.aiClient.generate(namePrompt, stops);
      name = name.trim();
    }
    if (!description) {
      const descriptionPrompt = formatDatasetDescriptionPrompt(this.dataset, name);
      // console.log('got description prompt', {descriptionPrompt});
      description = await this.aiClient.generate(descriptionPrompt, stops);
      description = description.trim();
    }

    const attributes = {
      [nameKey]: name,
      [descriptionKey]: description,
    };
    const attributePrompts = formatDatasetAttributePrompts(this.dataset, name, description);
    await Promise.all(attributePrompts.map(async attributePromptSpec => {
      const {
        key: attributeName,
        prompt: attributePrompt,
      } = attributePromptSpec;
      let attributeValue = await this.aiClient.generate(attributePrompt, stops);
      attributeValue = attributeValue.trim();
      attributes[attributeName] = attributeValue;
    })); */

    // return attributes;
  }
}