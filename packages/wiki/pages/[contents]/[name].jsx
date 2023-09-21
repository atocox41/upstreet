import uuidByString from "uuid-by-string";

import styles from "../../styles/ContentObject.module.css";
import { Ctx, saveContent } from "../../clients/context.js";
import {
    cleanName,
    formatImages,
    formatUrls,
    getGalleryArray,
    getSections,
} from "../../utils.js";
import {
    // generateItem,
    generateItemChat,
} from "../../datasets/dataset-generator.js";
import { formatItemText } from "../../datasets/dataset-parser.js";
import { getDatasetSpecsMd } from "../../datasets/dataset-specs.js";
import React, { useState, useEffect, } from "react";
import { UserBox } from "../../src/components/user-box/UserBox";
import { EditSource } from "../../src/components/edit-source";
import {
    LeftSection,
    RightSection,
} from "../../src/components/content-sections";
import { MiniMap } from "../../src/components/mini-map/MiniMap";
// import { Header } from "../../src/components/header/Header";
import { ImageLoader } from "../../src/components/image-loader/ImageLoader"; // XXX pass prompts here
import { MetaTags } from "../../src/components/meta-tags/MetaTags";
import {
    // OPENAI_API_KEY,
    // OPENAI_ACCESS_TOKEN,
    AWS_ACCESS_KEY,
    AWS_SECRET_ACCESS_KEY,
} from '../../src/constants/auth.js';

//

// import {marked} from 'marked';
// import markdownJson from 'markdown-json';
import MarkdownIt from 'markdown-it';
const markdownIt = MarkdownIt();
// globalThis.marked = marked;
// globalThis.markdownJson = markdownJson;
// globalThis.markdownIt = markdownIt;

//

const rightColumn = [
    "Alignment",
    "Price",
    "Stats",
    "Properties",
    "Has",
    "Abilities",
    "Limit Break",
];

const hideSections = ["Name", "Class", "Image"];

//

const ContentObject = ({spec, router}) => {
    const {type, title, content} = spec;
    // if (typeof content !== 'string') {
    //     debugger;
    // }

    // console.log('got content', content);
    
    const [itemName, setItemName] = useState("");
    const [itemClass, setItemClass] = useState("");
    const [featuredImage, setFeaturedImage] = useState("");
    const [description, setDecription] = useState("");
    const [gallery, setGallery] = useState([]);
    const [ctx, setCtx] = useState(() => new Ctx({
        // OPENAI_API_KEY,
        AWS_ACCESS_KEY,
        AWS_SECRET_ACCESS_KEY,
        // OPENAI_ACCESS_TOKEN,
    }));

    /* globalThis.generateContentPage = async () => {
        // const datasetSpecs = await getDatasetSpecsMd();
        const generatedItem = await generateItemChat(ctx, type, title);

        // console.log('generate ctx', ctx, generatedItem);
    }; */

    // console.log('got content spec', spec, markdownIt.parse(spec.content));

    const [sections, setSections] = useState([]);
    const [editSource, setEditSource] = useState(false);
    const [formatedContent, setFormatedContent] = useState();

    React.useEffect(() => {
        if (content) {
            // console.log('format content', content);
            formatImages(content, type).then((fiContent) => {
                formatUrls(fiContent).then((fuContent) => {
                    setFormatedContent(fuContent);
                });
            });
        }
    }, [content]);

    React.useEffect(() => {
        if (formatedContent) {
            getSections(formatedContent).then((res) => {
                // console.log('set sections', res);
                setSections(res);
                setItemName(
                    res.filter((item) => item.title === "Name")[0]?.content
                );
                setItemClass(
                    res.filter((item) => item.title === "Class")[0]?.content
                );
            });
            getGalleryArray(formatedContent).then((res) => {
                if (res) {
                    // console.log('get gallery array', res);
                    setGallery(res);
                }
            });
        }
    }, [formatedContent]);

    React.useEffect(() => {
        const imageSections = sections.filter(
            (item) => item.title === "Image"
        );
        // globalThis.sections = sections;

        // imageSections.length > 0 && console.log('got image sections', imageSections);
        const imageContent = imageSections[0]?.content;
        if (imageContent) {
            // match the string imageContent to the following markdown image tag format:
            // - ![A muscular half-orc with green eyes and a messy topknot, carrying a large battleaxe. | A powerful half-orc warrior.] 
            // capture the text before and after the pipe
            const match = imageContent.match(
                /\-\s+\!\[(.+)\s*(?:\|\s*(.+))?\]/
            );
            if (match) {
                const altText = match[1];
                const prompt = match[2] ?? altText;
                // const i = match[0] + ".png";
                const i = `/api/images/${type}s/${prompt}.png`;
                setFeaturedImage(i);
                console.log('set featured image 1', {altText, prompt});
            } else {
                // console.log('got match', {match, imageContent});
                // const i = `/api/images/${type}s/${imageContent}`;
                // setFeaturedImage(i);
                console.log('set featured image 2', {match, imageContent});
            }
        } else {
            if (gallery?.length > 0) {
                let randIndex = Math.floor(Math.random() * gallery.length);
                const i = gallery[randIndex]?.url;
                console.log('set featured image 3', i);
                setFeaturedImage(i);
            }
        }
    }, [sections]);

    const editContentSource = () => {
        setEditSource(true);
    };

    const backToPage = () => {
        setEditSource(false);
    };

    const editSection = async (content) => {
        saveContent();
    };

    return (
        <>
            <MetaTags
                title={`${itemName} ${itemClass && `- ${itemClass}`}`}
                description={description}
                image={featuredImage}
            />
            <div className={styles.character}>
                {/* <Header router={router} /> */}
                
                <div className={styles.contentWrap}>
                    <div className={styles.name}>
                        <span>{`${type}s`}</span>
                        {itemName}
                        {!editSource ? (
                            <div className={styles.sourceActions}>
                                <div
                                    className={styles.edit}
                                    onClick={editContentSource}
                                >
                                    <img
                                        src={"/assets/edit-source-lock.svg"}
                                        className={styles.icon}
                                    />
                                    Edit Source
                                </div>
                            </div>
                        ) : (
                            <div className={styles.sourceActions}>
                                <div className={styles.back} onClick={backToPage}>
                                    <img
                                        src={"/assets/arrowBack.svg"}
                                        className={styles.iconBack}
                                    />
                                    Back to Page
                                </div>
                                <button className={styles.button}>Save</button>
                            </div>
                        )}
                    </div>
                    {!editSource ? (
                        <React.Fragment>
                            <div className={styles.rightContent}>
                                <div className={styles.title}>{itemName}</div>
                                {itemClass && (
                                    <div className={styles.subtitle}>
                                        {itemClass}
                                    </div>
                                )}
                                <div className={styles.previewImageWrap}>
                                    <img
                                        src={"/assets/image-frame.svg"}
                                        className={styles.frame}
                                    />
                                    <div className={styles.mask}>
                                        <ImageLoader
                                            url={featuredImage}
                                            // prompt={true}
                                            className={styles.image}
                                            rerollable={true}
                                        />
                                    </div>
                                </div>
                                <div>
                                    {sections &&
                                        sections.map((section, i) => {
                                            if (rightColumn.includes(section.title))
                                                return (
                                                    <RightSection
                                                        title={section.title}
                                                        content={section.content}
                                                        // index={i}
                                                        key={i}
                                                    />
                                                );
                                        })}
                                    <MiniMap coordinates={""} />
                                </div>
                            </div>
                            <div className={styles.leftContent}>
                                <div className={styles.markdown}>
                                    {sections &&
                                        sections.map((section, i) => {
                                            if (
                                                !rightColumn.includes(
                                                    section.title
                                                ) &&
                                                !hideSections.includes(
                                                    section.title
                                                )
                                            ) {
                                                return (
                                                    <LeftSection
                                                        title={section.title}
                                                        content={section.content}
                                                        editSection={editSection}
                                                        gallery={gallery}
                                                        index={i}
                                                        key={i}
                                                    />
                                                );
                                            }
                                        })}
                                </div>
                            </div>
                        </React.Fragment>
                    ) : (
                        <EditSource content={content} />
                    )}
                </div>
            </div>
        </>
    );
};
ContentObject.getInitialProps = async ({
    type,
    name,
    description,
    ctx,
}) => {
    // const { req } = ctx;
    // const match = req.url.match(/^\/([^\/]*)\/([^\/]*)/);
    // let type = match ? match[1].replace(/s$/, "") : "";
    // let name = match ? match[2] : "";
    // name = decodeURIComponent(name);
    // name = cleanName(name);

    const title = `${type}/${name}`;
    const id = uuidByString(title);
    const query = await ctx.databaseClient.getByName("Content", title);
    // console.log('got query', query);
    if (query) {
        // const {
        //     content,
        // } = query;
        const content = query.text;
        return {
            type,
            id,
            title,
            content,
        };
    } else {
        // console.log('waiting for generation', {
        //     type,
        //     name,
        // });

        const datasetSpecs = await getDatasetSpecsMd();
        const datasetSpec = datasetSpecs.find((ds) => ds.type === type);
        // console.log('got datset spec', {datasetSpec, type, name});

        const itemText = await generateItemChat(ctx, type, name);
        console.log('generated item result 1', itemText);
        // const itemText = formatItemText(generatedItem, datasetSpec);

        // console.log('generated item text 2', itemText);

        // const imgUrl = `/api/characters/${name}/images/main.png`;

        const content = `\
${itemText}
`;
        // ![](${encodeURI(imgUrl)})

        const value = {
            text: content,
        };
        await ctx.databaseClient.setByName("Content", title, value);

        return {
            type,
            id,
            title,
            content,
        };
    }
};

const ContentObjectWrap = ({
    // type,
    // name,
    router,
    ctx,
    slugs,
    query,
}) => {
    const [spec, setSpec] = useState(null);

    const mode = slugs?.[0] ?? '';
    const tab = slugs?.[1] ?? '';
    const name = slugs?.[2] ?? '';
    const description = query?.description

    useEffect(() => {
        let live = true;
        (async () => {
            await new Promise((accept) => setTimeout(accept, 100));
            if (!live) return;

            const type = tab;
            // console.log('get initial props', {
            //     mode,
            //     tab,
            //     name,
            //     type,
            //     ctx,
            // });
            const newSpec = await ContentObject.getInitialProps({
                type,
                name,
                description,
                ctx,
            });
            if (!live) return;

            // console.log('got new spec', newSpec);
            setSpec(newSpec);
        })();
        return () => {
            live = false;
        };
    }, []);

    return (spec !== null ? (
        <ContentObject spec={spec} router={router} />
    ) : null);
};
export default ContentObjectWrap;