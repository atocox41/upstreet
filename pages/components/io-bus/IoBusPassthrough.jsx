import React from 'react';
import {
  IoBus,
  eventNames,
  onEventNames,
  keyNames,
} from './IoBus.js';

//

export const IoBusPassthrough = ({
  children,
  ...props
}) => {
  const handler = async e => {
    if (e.type === 'dragover' || e.type === 'drop') {
      e.preventDefault();
    }
    if (e.type === 'drop') {
      e.files = Array.from(e.dataTransfer.files);
    }
    
    const o = {};
    for (const keyName of keyNames) {
      o[keyName] = e[keyName];
    }

    IoBus.request({
      contentWindow: globalThis.parent,
      method: 'ioBus',
      args: o,
    });
  };

  for (const eventName of onEventNames) {
    props[eventName] = handler;
  }
  const element = React.createElement('div', props, children);
  return element;
}