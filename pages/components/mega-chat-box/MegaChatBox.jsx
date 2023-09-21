import React, {useState, useEffect, useRef} from 'react';
import classnames from 'classnames';

import {RpgText} from '../rpg-text/RpgText.jsx';
import {LightArrow} from '../light-arrow/LightArrow.jsx';
import {chatTextSpeed} from '../../../packages/engine/constants.js';

import styles from '../../../styles/MegaChatBox.module.css';

export const MegaChatBox = ({
  message,

  inputOpen,

  options,
  option,
  hoverIndex,

  speakOpen,
  
  progressing,
  
  finished,
  
  onOptionSelect,
  onClick,
  onXClick,

  onOptionsClick,
  onSpeakClick,
  onInputClick,
  onInputCommit,

  engine,
}) => {
  const [inputText, setInputText] = useState('');
  const [currentMessage, setCurrentMessage] = useState(() => message);

  const inputRef = useRef();

  //

  const selectedOptionIndex = options ? options.indexOf(option) : -1;

  //

  useEffect(() => {
    if (message && currentMessage !== message) {
      setCurrentMessage(message);
    }
  }, [message, currentMessage]);

  useEffect(() => {
    if (inputOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputOpen]);

  // console.log('got current message text', currentMessage ? currentMessage.toText() : '');

  //

  return (
    <div className={classnames(
      styles.megaChatBox,
      styles.outer,
      message ? styles.open : null,
    )}>
      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.row}>
            <div className={styles.name}>{currentMessage ? currentMessage.getPlayerName() : ''}</div>
            <div className={styles.level}>Lv. 8</div>
          </div>

          <RpgText
            className={styles.text}
            styles={styles}
            textSpeed={chatTextSpeed}
            text={currentMessage ? currentMessage.toText() : ''}
          />
        </div>
        <div className={classnames(
          styles.toolbar,
          progressing ? null : styles.visible,
        )}>
          {!finished ? <div
            className={classnames(
              styles.icon,
            )}
            onClick={onXClick}
          >
            <img
              className={styles.img}
              src='/assets/x.svg'
            />
          </div> : null}

          <div
            className={classnames(
              styles.icon,
            )}
            onClick={onOptionsClick}
          >
            <img
              className={styles.img}
              src='/images/dots.svg'
            />
          </div>

          <div
            className={classnames(
              styles.icon,
            )}
            onClick={onInputClick}
          >
            <img
              className={styles.img}
              src='/images/text.svg'
            />
          </div>

          <div
            className={classnames(
              styles.icon,
            )}
            onClick={onSpeakClick}
          >
            <img
              className={styles.img}
              src='/images/microphone.svg'
            />
          </div>

          <div
            className={classnames(
              styles.spacer,
            )}
          />
          
          {finished ? (
            <LightArrow
              className={styles.lightArrow}
              up
              onClick={onClick}
            />
          ) : (
            <div
              className={classnames(
                styles.nextBlink,
                styles.visible,
              )}
              onMouseEnter={e => {
                engine.sounds.playSoundName('menuClick');
              }}
              onClick={onClick}
            >
              <img
                className={styles.arrow}
                src='/images/down.svg'
              />
            </div>
          )}
        </div>
      </div>

      <div className={classnames(
        styles.options,
        styles.outer,
        options ? styles.open : null,
        selectedOptionIndex !== -1 ? styles.selected : null,
      )}>
        <div className={styles.inner}>
          <div
            className={classnames(
              styles.icon,
            )}
            onClick={e => {
              onOptionsClick();
            }}
          >
            <img
              className={classnames(
                styles.img,
                styles.close,
              )}
              src='/assets/x.svg'
            />
          </div>
          {options ? options.map((option, i) => {
            const hovered = i === hoverIndex;
            const selected = i === selectedOptionIndex;
            return (
              <div
                className={classnames(
                  styles.option,
                  hovered ? styles.hovered : null,
                  selected ? styles.selected : null,
                )}
                onClick={e => {
                  onOptionSelect(option.message, i);
                }}
                onMouseEnter={e => {
                  engine.sounds.playSoundName('menuMove');
                }}
                key={i}
              >
                <div className={styles.border}/>
                <div className={styles.value}>{option.message}</div>
                <img className={styles.arrow} src="/images/ui/left-red.svg" />
              </div>
            );
          }) : null}
        </div>
      </div>

      <div className={classnames(
        styles.inputWrap,
        inputOpen ? styles.open : null,
      )}>
        <input
          className={classnames(
            styles.input,
          )}
          value={inputText}
          onChange={e => {
            setInputText(e.target.value);
          }}
          onKeyDown={e => {
            e.stopPropagation();

            if (e.key === 'Enter' && inputText) {
              onInputCommit(inputText);
              setInputText('');
            }
          }}
          ref={inputRef}
        />
      </div>

      <div className={classnames(
        styles.speakWrap,
        speakOpen ? styles.open : null,
      )}>
        <div className={classnames(
          styles.background,
        )} onClick={e => {
          onSpeakClick();
        }}></div>
        <div className={classnames(
          styles.speak,
        )}>
          <img className={styles.img} src='/images/speak.svg' />
          <div className={styles.text}>Speak now...</div>
        </div>
      </div>
    </div>
  );
};