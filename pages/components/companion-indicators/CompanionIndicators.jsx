import styles from './CompanionIndicators.module.css';
import React, {
    useState,
    useEffect,
    useRef
  } from 'react';
    import classnames from 'classnames';
import Icon from '../ui/icon/Icon.jsx';

let clickTimer = 0;
let clickDelay = 300;
let clickPrevent = false;

export const CompanionIndicators = ({
    stopInteraction,
    companionState,
    settingsMode,
    locked
  }) => {

    const [icon, setIcon] = useState('standBy');
    const [dropDown, setDropDown] = useState(false);
    const indicatorRef = useRef();
    
   
    useEffect(() => {
      if(settingsMode) {
        switch (settingsMode) {
          case 'settings': {
            return setIcon('generalSettings');
          }
          case 'render': {
            return setIcon('video');
          }
          case 'avatarGallery': {
            return setIcon('party');
          }
          case 'companionSettings': {
            return setIcon('userSettings');
          }
          case 'chat': {
            return setIcon('chat');
          }
          default: {
            return setIcon('standBy');
          }
        }
      } else {
        setIcon('standBy');
      }
    }, [settingsMode]);

    const onSingleClick = () => {
      console.log("single click");
      // setDropDown(!dropDown);
    }

    const onDoubleClick = () => {
      console.log("double click");
      stopInteraction();
    }

    const onHoldStart = () => {
      console.log("hold start");
    }

    const onHoldEnd = () => {
      console.log("hold end");
    }

    useEffect(() => {
      if(indicatorRef) {
        indicatorRef.current.addEventListener("mousedown", (e) => {
          console.log(e)
          if(e.detail === 1) {
            clickTimer = setTimeout(function() {
              if (!clickPrevent) {
                onSingleClick();
              }
              clickPrevent = false;
            }, clickDelay);
          }
          if(e.detail === 2) {
            clearTimeout(clickTimer);
            clickPrevent = true;
            onDoubleClick();
          }
        });
      }
    },[]);

    return (
      <div className={styles.indicatorsWrap}>
        <div className={classnames(
          styles.indicator,
          companionState === "standby" ? styles.standby : null,
          companionState === "listening" ? styles.listening : null,
          companionState === "processing" ? styles.processing : null,
        )}
        ref={indicatorRef}
        >  
          <div className={classnames(
            styles.stroke,
            locked || settingsMode ? styles.locked : null
          )} />

          {companionState === "standby" && (
            <Icon icon={icon} iconClass={styles.icon} />
          )}

          {companionState === "listening" && (
            <Icon icon={"mic"} iconClass={styles.icon} />
          )}

          {companionState === "processing" && (
            <Icon icon={"ai"} iconClass={styles.icon} />
          )}

          <Icon icon="close" iconClass={styles.close} />

        </div>
        
        <div className={
          classnames(
            styles.dropDown,
            dropDown && styles.open
          )
        }>

        </div>

      </div>
    )
  };