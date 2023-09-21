import React, {
  useState,
} from 'react';
import classnames from 'classnames';

import topBarStyles from '../../../styles/TopBar.module.css';

//

export const Select = ({
  Icon,
  options,
  selectedOption,
  setSelectedOption,
  disabled,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={classnames(
      topBarStyles.select,
      open ? topBarStyles.open : null,
    )} onClick={e => {
      setOpen(!disabled && !open);
    }}>
      {options.map((option, i) => {
        return (
          <div className={classnames(
            // topBarStyles.button,
            topBarStyles.option,
            option === selectedOption ? topBarStyles.selected : null,
          )} onClick={e => {
            open && setSelectedOption(option);
          }} key={i}>
            {/* <div className={topBarStyles.background} /> */}
            <Icon
              option={option}
            />
            <div className={topBarStyles.text}>{option.name}</div>
            <div className={topBarStyles.description}>{option.description}</div>
          </div>
        );
      })}
    </div>
  );
};