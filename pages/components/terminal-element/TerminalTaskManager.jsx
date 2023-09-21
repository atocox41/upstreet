import React, {
  useState,
  useEffect,
  useRef,
} from 'react';
import classnames from 'classnames';

import styles from '../../../styles/Companion.module.css';

//

const TerminalTaskBlock = ({
  taskBlock,
  go,
  cancel,
}) => {
  const {
    text,
  } = taskBlock;

  return (
    <div className={classnames(
      styles.row,
      styles.taskBlock,
    )}>
      <textarea className={styles.taskBlockText} value={text} />

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

export const TerminalTaskManager = ({
  browserId,
}) => {
  const [taskText, setTaskText] = useState('');
  const [taskBlocks, setTaskBlocks] = useState([
    // {
    //   text: 'task 1',
    // },
  ]);

  const go = () => {
    if (taskBlocks.length > 0) {
      // const newTaskBlocks = taskBlocks.slice(0, -1);
      // newTaskBlocks.push({
      //   text: taskText,
      // });
      // setTaskBlocks(newTaskBlocks);
      // console.log('load extra task list');
      debugger;
    } else {
      /* (async () => {
        const result1 = await globalThis.electronIpc.runBrowserFunction({
          browserId,
          functionString: (() => {
            function getIoElements(rootNode) {
              const min = 100;
              const max = window.innerWidth * 0.75;
            
              const ioTags = [
                'input', 'select', 'textarea', 'button',
              ];
              // const imageTags = [
              //   'img', 'svg',
              // ];

              function hasContent(node) {
                return node.offsetParent && (
                  /[A-zÀ-ÿ0-9\u0100-\u017F]/.test(node.innerText) // ||
                    // node.querySelector('img, svg') !== null
                );
              }
            
              function isImportantTextNode(node) {
                const rect = node.getBoundingClientRect();
                const hasSufficientSize = rect.width > min || rect.height > min;
                // const hasNonEmptyContent = /\w+/i.test(node.textContent);
                return hasSufficientSize // && hasNonEmptyContent;
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
            
              function isImportantInputElement(node) {
                const tagName = node.tagName.toLowerCase();
                return ioTags.includes(tagName);
              }
            
              // function isImportantImageElement(node) {
              //   return false;
              //   // const tagName = node.tagName.toLowerCase();
              //   // return imageTags.includes(tagName);
              // }
            
              function isImportantNode(node) {
                if (node.nodeType !== Node.ELEMENT_NODE) {
                  return false;
                }
            
                // const tagName = node.tagName.toLowerCase();
                // if (tagName === 'html' || tagName === 'body') {
                //   return false;
                // }
            
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
            // globalThis.testIoElementsRead = () => {
              const ioElements = getIoElements(document);
              console.log(o = ioElements.map(e => ([e, e.innerText ? e.innerText
                .replace(/[^A-zÀ-ÿ0-9\u0100-\u017F\s]+/g, '')
                .replace(/^\s+/, '')
                .replace(/\s+$/, '')
              : ''])));
              console.log(s = o.map(o => o[1]).join(' '));
            // };
            return s;
          }).toString(),
        });

        const result2 = await globalThis.electronIpc.runBrowserFunction({
          browserId,
          functionString: (() => {
            function getTextElements(rootNode) {
              const min = window.innerWidth * 0.2;
              const max = window.innerWidth * 0.75;
            
              function hasContent(node) {
                return node.offsetParent && (
                  /[A-zÀ-ÿ0-9\u0100-\u017F]/.test(node.innerText)
                );
              }
              function isImportantTextNode(node) {
                const rect = node.getBoundingClientRect();
                const hasSufficientSize = rect.width > min || rect.height > min;
                // const hasNonEmptyContent = /\w+/i.test(node.textContent);
                if (hasSufficientSize) {
                  if (!node.parentElement.closest('a')) {
                    return true;
                  } else {
                    return false;
                  }
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
                if (rect.width > max || rect.height > max) {
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
            // globalThis.testTextElementsRead = () => {
              const textElements = getTextElements(document);
              console.log(o = textElements.map(e => ([e, e.innerText ? e.innerText
                .replace(/[^A-zÀ-ÿ0-9\u0100-\u017F\s]+/g, '')
                .replace(/^\s+/, '')
                .replace(/\s+$/, '')
              : ''])));
              console.log(s = o.map(o => o[1]).join(' '));
            // };
            return s;
          }).toString(),
        });
        console.log('got browser run function result', {
          result1,
          result2,
        });
      })(); */
    }
  };
  const cancel = () => {
    const newTaskBlocks = taskBlocks.slice(0, -1);
    setTaskBlocks(newTaskBlocks);
  };

  return (
    <div className={styles.taskManager}>
      <div className={styles.row}>
        <input type="text" placeholder="task description" className={styles.input} value={taskText} onChange={e => {
          setTaskText(e.target.value);
        }} />
        <button className={styles.button} onClick={e => {
          go();
        }}>
          <img className={styles.buttonImg} src="/images/ui/check.svg" />
        </button>
      </div>
      {taskBlocks.map((taskBlock, index) => {
        return (
          <TerminalTaskBlock
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