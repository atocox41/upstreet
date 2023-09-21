import React from 'react';
import classnames from 'classnames';
import Icon from '../ui/icon/Icon.jsx';

import styles from './Toolbar.module.css';

//

export const Toolbar = ({
  iconSpecs,
  className,
}) => {
  return (
    <div className={classnames(
      styles.toolbar,
      className,
    )}>
      {iconSpecs.map((iconSpec, i) => {
        if (iconSpec) {
          const {
            icon,
            text,
            active,
            onClick,
            className,
            style,
          } = iconSpec;
          return (
            <LabeledButton
              icon={icon}
              text={text}
              active={active}
              onClick={onClick}
              className={className}
              style={style}
              key={i}
            />
          );
        } else {
          return null;
        }
      })}
    </div>
  );
};

export const LabeledButton = ({
  icon,
  text,
  active,
  onClick,
  className,
  style,
}) => {
  return (
    <div className={classnames(
      styles.labeledButton,
    )} onClick={onClick}>
      <Button
        icon={icon}
        active={active}
        className={className}
        style={style}
      />
      <div className={styles.label}>
        {text}
      </div>
    </div>
  );
};

export const Button = ({
  onClick,
  active,
  big,
  red,
  topLeft,
  topRight,
  bottomRight,
  bottomLeft,
  disabled,
  icon,
  className,
  style,
}) => {
  return (
    <div className={classnames(
      styles.row,
      big ? styles.big : null,
      red ? styles.red : null,
      topLeft ? styles.topLeft : null,
      topRight ? styles.topRight : null,
      bottomRight ? styles.bottomRight : null,
      bottomLeft ? styles.bottomLeft : null,
      disabled ? styles.disabled : null,
      active ? styles.active : null,
      className,
    )} style={style}>
      <div
        className={styles.singleOption}
        onClick={e => {
          if (onClick) {
            e.preventDefault();
            e.stopPropagation();

            onClick(e);
          }
        }}
        onMouseUp={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div
          className={classnames(
            styles.section,
          )}
        >
          <Icon icon={icon} className={styles.img} />
        </div>
      </div>
    </div>
  );
};