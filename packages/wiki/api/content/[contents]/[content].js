// import stream from 'stream';
// import url from 'url';
// import {Readable} from 'node:stream';
// const fetch = require("node-fetch");

import uuidByString from "uuid-by-string";
// import Head from "next/head";

// import styles from "../../styles/ContentObject.module.css";
import { Ctx, saveContent } from "../../clients/context.js";
import {
    cleanName,
    formatImages,
    formatUrls,
    getGalleryArray,
    getSections,
} from "../../utils.js";
import { generateItem } from "../../datasets/dataset-generator.js";
import { formatItemText } from "../../datasets/dataset-parser.js";
import { getDatasetSpecs } from "../../datasets/dataset-specs.js";
// import React, { useState } from "react";
// import { UserBox } from "../../src/components/user-box/UserBox";
// import { EditSource } from "../../src/components/edit-source";
// import {
//     LeftSection,
//     RightSection,
// } from "../../src/components/content-sections";
// import { MiniMap } from "../../src/components/mini-map/MiniMap";
// import { ImageLoader } from "../../src/components/image-loader/ImageLoader";
// import { MetaTags } from "../../src/components/meta-tags/MetaTags";

const proxy = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  const match = req.url.match(/^\/api\/content\/([^\/]*)\/([^\/]*)/);
  let type = match ? match[1].replace(/s$/, "") : "";
  let name = match ? match[2] : "";
  name = decodeURIComponent(name);
  name = cleanName(name);

  const c = new Ctx();
  const title = `${type}/${name}`;
  const id = uuidByString(title);
  const query = await c.databaseClient.getByName("Content", title);
  if (query) {
      const { content } = query;
      return {
          type,
          id,
          title,
          content,
      };
  } else {
      const c = new Ctx();
      const [datasetSpecs, generatedItem] = await Promise.all([
          getDatasetSpecs(),
          generateItem(type, name),
      ]);
      const datasetSpec = datasetSpecs.find((ds) => ds.type === type);
      // console.log('got datset spec', {datasetSpec});
      const itemText = formatItemText(generatedItem, datasetSpec);

      // const imgUrl = `/api/characters/${name}/images/main.png`;

      const content = `\
${itemText}
`;
      // ![](${encodeURI(imgUrl)})

      await c.databaseClient.setByName("Content", title, content);

      return {
          type,
          id,
          title,
          content,
      };
  }
};
export default proxy;