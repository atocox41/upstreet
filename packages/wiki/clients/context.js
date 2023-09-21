import {DatabaseClient} from './database/database-client.js';
import {StorageClient} from './storage/storage-client.js';
// import {AiClient} from './ai/ai-client.js';
import {AiClient} from '../../engine/clients/ai-client.js';

//

export class Ctx {
  constructor(env) {
    // console.log('init env', env);

    // const apiKey = env.OPENAI_API_KEY;
    // // const accessToken = env.OPENAI_ACCESS_TOKEN;
    // if (!apiKey) {
    //   throw new Error('missing OPENAI_API_KEY');
    //   debugger;
    // }
    // this.aiClient = new AiClient({
    //   apiKey,
    //   // accessToken,
    // });
    this.aiClient = new AiClient();

    this.databaseClient = new DatabaseClient({
      aiClient: this.aiClient, // for embeddings
    });
    this.storageClient = new StorageClient({
      accessKeyId: env.AWS_ACCESS_KEY,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    });
  }
}

export const saveContent = async (content) => {
  const c = new DatabaseClient();
  const query = await c.getByName("Content", "character/Killer");
  return query;
}
// const ctx = new Ctx();
// export default ctx;