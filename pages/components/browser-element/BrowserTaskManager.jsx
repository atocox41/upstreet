import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';
import {createParser} from 'eventsource-parser';

import {
  aiProxyHost,
} from '../../../packages/engine/endpoints.js';

import styles from '../../../styles/Companion.module.css';

//

const BrowserTaskBlock = ({
  taskBlock,
  go,
  cancel,
}) => {
  const [text, setText] = useState(taskBlock?.text ?? '');

  useEffect(() => {
    const textchange = e => {
      setText(e.data.text);
    };
    taskBlock.addEventListener('textchange', textchange);

    return () => {
      taskBlock.removeEventListener('textchange', textchange);
    };
  }, [taskBlock]);
  // console.log('render text', text);

  return (
    <div className={classnames(
      styles.row,
      styles.taskBlock,
    )}>
      <textarea className={styles.output} value={text} onChange={e => {
        setText(e.target.value);
      }} />

      <button className={styles.button} onClick={e => {
        go();
      }}>
        <img className={styles.buttonImg} src="/images/ui/check.svg" />
      </button>

      <button className={styles.button} onClick={e => {
        cancel();
      }}>
        <img className={styles.buttonImg} src="/assets/cancel.svg" />
      </button>
    </div>
  );
};

//

class TaskBlock extends EventTarget {
  constructor({
    text = '',
  } = {}) {
    super();

    this.text = text;
  }
  appendText(text) {
    this.text += text;

    this.dispatchEvent(new MessageEvent('textchange', {
      data: {
        text: this.text,
      },
    }));
  }
}

//

export const BrowserTaskManager = ({
  url,
  previousCommands,
  browserId,
}) => {
  const [taskText, setTaskText] = useState('');
  const [taskBlocks, setTaskBlocks] = useState([
    // {
    //   text: 'task 1',
    // },
  ]);

  const go = () => {
    if (taskText) {
      if (taskBlocks.length > 0) {
        // const newTaskBlocks = taskBlocks.slice(0, -1);
        // newTaskBlocks.push({
        //   text: taskText,
        // });
        // setTaskBlocks(newTaskBlocks);
        // console.log('load extra task list');
        debugger;
      } else {
        (async () => {
          let result1 = await globalThis.electronIpc.runBrowserFunction({
            browserId,
            functionString: (() => {
              const ioTags = [
                'input', 'select', 'textarea', 'button',
              ];
              const importantAttributeNames = [
                'href',
                'title',
                'value',
              ];
              function getInnerText(node) {
                const innerText = node.innerText;
                if (innerText) {
                  return innerText;
                } else {
                  const results = [];
                  // collect image/svg captions
                  const imgs = node.querySelectorAll('img');
                  for (const img of imgs) {
                    let alt = img.getAttribute('alt');
                    if (alt) {
                      alt = alt.trim();
                      if (alt) {
                        results.push(alt);
                      }
                    }
                  }
                  const svgs = node.querySelectorAll('svg');
                  for (const svg of svgs) {
                    let title = svg.querySelector('title');
                    if (title) {
                      title = title.innerText.trim();
                      if (title) {
                        results.push(title);
                      }
                    }
                  }
                  return results.join(' ');
                }
              }
              function getIoElements(rootNode) {
                const min = 100;
                const max = window.innerWidth * 0.75;

                function hasContent(node) {
                  return node.offsetParent && (
                    /[A-zÀ-ÿ0-9\u0100-\u017F]/.test(getInnerText(node))
                  );
                }
              
                function isImportantTextNode(node) {
                  const rect = node.getBoundingClientRect();
                  const hasSufficientSize = rect.width > min || rect.height > min;
                  return hasSufficientSize;
                }
              
                function isImportantLink(node) {
                  if (node.tagName.toLowerCase() !== 'a') {
                    return false;
                  }
              
                  const href = node.getAttribute('href');
                  const hasHref = !!href && !/^#/.test(href);
                  const hasImportantText = isImportantTextNode(node);
                  const hasImage = node.querySelector('img') !== null;
              
                  return hasHref && (hasImportantText || hasImage);
                }
              
                /* function hasImportantAttribute(node) {
                  for (const attrName of importantAttributeNames) {
                    const attr = node.getAttribute(attrName);
                    if (attr !== void 0 && attr !== null && attr !== '') {
                      return true;
                    }
                  }
                  return false;
                } */
                function isImportantInputElement(node) {
                  const tagName = node.tagName.toLowerCase();
                  return ioTags.includes(tagName);
                }

                // function isImportantImageElement(node) {
                //   return ['img', 'svg'].includes(node.tagName.toLowerCase());
                // }
              
                function isImportantNode(node) {
                  if (node.nodeType !== Node.ELEMENT_NODE) {
                    return false;
                  }
              
                  return hasContent(node) &&
                    (
                      // isImportantTextNode(node) ||
                      isImportantLink(node) ||
                      isImportantInputElement(node) // ||
                      // isImportantImageElement(node)
                    );
                }
              
                const allNodes = rootNode.querySelectorAll('*');
                const importantNodes = [];
              
                for (const node of allNodes) {
                  if (isImportantNode(node)) {
                    importantNodes.push(node);
                  }
                }
              
                const smallImportantNodes = importantNodes.filter(node => {
                  const rect = node.getBoundingClientRect();
                  if (rect.width > max || rect.height > max) {
                    return false;
                  } else if (node.querySelectorAll(ioTags.join(', ')).length > 1) {
                    return false;
                  } else {
                    return true;
                  }
                });
              
                const outerImportantNodes = [];
                for (const node of smallImportantNodes) {
                  let current = node.parentElement;
                  let isNested = false;
              
                  while (current) {
                    if (smallImportantNodes.includes(current)) {
                      isNested = true;
                      break;
                    }
                    current = current.parentElement;
                  }
              
                  if (!isNested) {
                    outerImportantNodes.push(node);
                  }
                }
                return outerImportantNodes;
              }
              const ioElements = getIoElements(document);
              // const clean = text => {
              //   return text
              //     .replace(/[^A-zÀ-ÿ0-9\u0100-\u017F\.,\?\!\-\s]+/g, '')
              //     .replace(/^\s+/, '')
              //     .replace(/\s+$/, '');
              // };
              const minimize = (s, n = 20) => {
                // replace any tail greater than n characters with ellipsis unicode (…)
                return s.length > n ? s.slice(0, n) + '…' : s;
              };
              const getTag = el => {
                // output in the style of 
                // button#button.style-scope.yt-icon-button
                let tagName = el.tagName.toLowerCase();
                let id = el.id ? `#${el.id}` : '';
                let classes = el.className ? `.${el.className.split(' ').join('.')}` : '';

                tagName = minimize(tagName, 20);
                id = minimize(id, 20);
                classes = minimize(classes, 40);

                return `${tagName}${id}${classes}`;
              };
              const getImportantAttributes = el => {
                const importantAttributes = importantAttributeNames
                  .map(name => {
                    const value = el.getAttribute(name);
                    // return value ? `${name}="${value}"` : '';
                    return value ? [
                      minimize(name, 20),
                      minimize(value, 40),
                    ] : '';
                  })
                  .filter(Boolean);
                // return importantAttributes.join(' ');
                return importantAttributes;
              };
              /* const getInnerText = el => {
                let s = '';
                // iterate all image and text nodes
                for (const child of el.childNodes) {
                  if (child.nodeType === Node.TEXT_NODE) {
                    s += child.textContent.trim();
                  } else if (child.tagName.toLowerCase() === 'img') {
                    s += (child.getAttribute('alt') || '').trim();
                  }
                }
                return s;
              }; */
              const o = ioElements.map(e => ({
                // e,
                tagName: getTag(e),
                // e.getAttribute('href') ? clean(e.getAttribute('href')) : '',
                // printImportantAttributes(e),
                attributes: getImportantAttributes(e),
                innerText: getInnerText(e),
              }));
              // console.log(o);
              // console.log(s = o.map(o => o[1]).join(' '));
              return JSON.stringify(o);
            }).toString(),
          });
          result1 = JSON.parse(result1);

          let result2 = await globalThis.electronIpc.runBrowserFunction({
            browserId,
            functionString: (() => {
              function getTextElements(rootNode) {
                const min = window.innerWidth * 0.2;
                const max = window.innerWidth * 0.6;
              
                function hasContent(node) {
                  return node.offsetParent && (
                    /[A-zÀ-ÿ0-9\u0100-\u017F]/.test(node.innerText)
                  );
                }
              
                function isImportantTextNode(node) {
                  const rect = node.getBoundingClientRect();
                  const hasSufficientSize = rect.width > min || rect.height > min;
                  if (hasSufficientSize) {
                    return !node.parentElement.closest('a, button, input, textarea, select, img, svg');
                  } else {
                    return false;
                  }
                }
              
                function isImportantNode(node) {
                  if (node.nodeType !== Node.ELEMENT_NODE) {
                    return false;
                  }
              
                  return hasContent(node) &&
                    (
                      isImportantTextNode(node) // ||
                      // isImportantLink(node) ||
                      // isImportantInputElement(node) ||
                      // isImportantImageElement(node)
                    );
                }
              
                const allNodes = rootNode.querySelectorAll('*');
                const importantNodes = [];
              
                for (const node of allNodes) {
                  if (isImportantNode(node)) {
                    importantNodes.push(node);
                  }
                }
              
                const smallImportantNodes = importantNodes.filter(node => {
                  const rect = node.getBoundingClientRect();
                  // if (rect.width > max || rect.height > max) {
                  if (rect.width > max) {
                    // console.log('too large', node, [rect.width, rect.height, max]);
                    return false;
                  // } else if (node.querySelectorAll(ioTags.join(', ')).length > 1) {
                  //   return false;
                  } else {
                    return true;
                  }
                });
              
                const outerImportantNodes = [];
                for (const node of smallImportantNodes) {
                  let current = node.parentElement;
                  let isNested = false;
              
                  while (current) {
                    if (smallImportantNodes.includes(current)) {
                      isNested = true;
                      break;
                    }
                    current = current.parentElement;
                  }
              
                  if (!isNested) {
                    outerImportantNodes.push(node);
                  }
                }
                return outerImportantNodes;
              }
              const clean = text => {
                return text
                  .replace(/[^A-zÀ-ÿ0-9\u0100-\u017F\.,\?\!\-\s]+/g, '')
                  .replace(/^\s+/, '')
                  .replace(/\s+$/, '');
              };
              const textElements = getTextElements(document);
              const o = textElements.map(e => clean(e.innerText));
              const o2 = textElements.map(e => ({
                e,
                text: clean(e.innerText),
              }));
              // console.log(o = textElements.map(e => ([e, e.innerText ? e.innerText
              //   .replace(/[^A-zÀ-ÿ0-9\u0100-\u017F\s]+/g, '')
              //   .replace(/^\s+/, '')
              //   .replace(/\s+$/, '')
              // : ''])));
              // console.log(s = o.map(o => o[1]).join(' '));
              return JSON.stringify(o);
              // return s;
            }).toString(),
          });
          result2 = JSON.parse(result2);

          console.log('got browser run function result', {
            result1,
            result2,
          });

          const formatBrowserElement = (e) => {
            const tagName = e.tagName;
            const attributes = e.attributes.map(a => `[${a[0]}=${JSON.stringify(a[1])}]`).join('');
            const innerText = e.innerText;
            return `${tagName}${attributes ? (' ' + attributes) : ''}${innerText ? (' ' + innerText) : ''}`;
          };

          const messages = [
            {
              role: 'system',
              content: `\
You are an agent controlling a browser. You are given:
  (1) an objective that you are trying to achieve
  (2) the URL of your current web page
  (3) a simplified text description of what's visible in the browser window (more on that below)
You can issue these commands:
  goto(url) - navigate to the given URL
  scroll(y) - scroll the page by y pages. positive Y scrolls down, negative Y scrolls up
  click(elementIndex) - click on the element from the list with the given index
  type(text) - type the given text into the input with the given index
  submit(elementIndex) - submit the input element with the given index
  readContext(queryText) - extract the information described by queryText so it can be provided as context for the next query
These commands end the query, so only include them as the last command in your response:
  wait() - wait for the browser to update (e.g. after a click)
  complete(queryText) - extract the information described by queryText so it can be presented to the user and. consider the task complete

Example:

\`\`\`
# Command history
goto("https://www.google.com/")
wait()

# Current URL
https://www.google.com/

# Current browser elements
0: a#logo.logo[href="/"] Google
1: a[href="https://www.google.com/imghp?hl=en&tab=wi"] Images
2: input[name="q"][type="text"][value=""]
3: input.submit[name="btnK"][type="submit"][value="Google Search"]

# Current browser text
Google
Images
Our mission: to organize the world's information and make it universally accessible and useful.
Google Search

# Objective
Find out what the current top trending anime is.
\`\`\`

Response:

\`\`\`
click(2) # click on the search input
type("top trending anime") # type the search query
submit(2) # submit the search query
wait()
read()
\`\`\`

Example:

\`\`\`
# Command history
goto("https://pokemon.fandom.com/")
wait()

# Current URL
https://pokemon.fandom.com/wiki/Pok%C3%A9mon_Wiki

# Current browser elements
0: a#logo.logo[href="/"] Pokemon Fandom
1: input.search[name="search"][type="text"][value=""]
2: input.search-submit[name="fulltext"][type="submit"][value="Search"]

# Current browser text
FanWiki
Home
Popular Pages
Random Page
Community
Explore
WELCOME TO THE WIKI, CHIEF!
We’re glad you’re here! We’re striving to be the best resource about the Pokémon World on the net, so we cover all aspects of Nintendo’s smash hit. Whatever knowledge you have—whether it’s about the anime, card game, video game or movies—everything is welcome here. Just sign up for a totally free account and start contributing today! If you run into problems, be sure to give one of our admins a shout! Oh, and don’t forget to visit our guidelines and Manual of Style to get some tips on the best ways you can help us grow this database!
Pokémon Wiki is a FANDOM Anime Community.

# Objective
Find out who is Ash's daughter from Pokémon.
\`\`\`

Response:

\`\`\`
click(1) # click on the search input
type("Ash Ketchum daughter") # type the search query
submit(1) # submit the search query
wait()
\`\`\`
`,
            },
            {
              role: 'user',
              content: `\
\`\`\`
# Command history
${previousCommands.length > 0 ? previousCommands.join('\n') : 'None'}

# Current URL
${url}

# Current browser elements
${result1.map((e, i) => `${i}: ${formatBrowserElement(e)}`).join('\n')}

# Current browser text
${result2.join('\n')}

# Objective
${taskText}
\`\`\`

Response:
`,
            },
          ];

          console.log('openai req 1', messages);
          // debugger;

          const response = await fetch(`https://${aiProxyHost}/api/ai/chat/completions`, {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json',
            },

            body: JSON.stringify({
              messages,
              model: 'gpt-4',
              stream: true,
            }),
          });
          // const j = await response.json();
          // console.log('openai req 2', j);
          // console.log('openai req 3', j?.choices[0].message.content);

          console.log('openai req 2', response.status);

          const taskBlock = new TaskBlock();
          const newTaskBlocks = [
            ...taskBlocks,
            taskBlock,
          ];
          setTaskBlocks(newTaskBlocks);

          const parser = createParser(event => {
            if (event.type === 'event') {
              if (event.data !== '[DONE]') {
                const data = JSON.parse(event.data);
                const content = data.choices[0].delta.content;
                if (content) {
                  taskBlock.appendText(content);
                }
              }
            }
          });
          const reader = response.body.getReader();
          const textDecoder = new TextDecoder();
          while (true) {
            const {done, value} = await reader.read();
            if (done) {
              break;
            }
            const s = textDecoder.decode(value);
            parser.feed(s);
          }
        })();
      }
    }
  };
  const cancel = () => {
    const newTaskBlocks = taskBlocks.slice(0, -1);
    setTaskBlocks(newTaskBlocks);
  };
  const keydown = e => {
    if (e.keyCode === 13) {
      e.preventDefault();
      e.stopPropagation();

      go();
    }
  };

  return (
    <div className={styles.taskManager}>
      <div className={styles.row}>
        <input type="text" placeholder="task description" className={styles.input} value={taskText} onChange={e => {
          setTaskText(e.target.value);
        }} onKeyDown={keydown}/>
        <button className={styles.button} onClick={e => {
          go();
        }}>
          <img className={styles.buttonImg} src="/images/ui/check.svg" />
        </button>
      </div>
      {taskBlocks.map((taskBlock, index) => {
        return (
          <BrowserTaskBlock
            taskBlock={taskBlock}
            go={go}
            cancel={cancel}
            key={index}
          />
        );
      })}
    </div>
  );
}