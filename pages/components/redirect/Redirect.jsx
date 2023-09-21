import React, {
  useEffect,
} from 'react';

//

export const Redirect = ({
  url,
}) => {
  useEffect(() => {
    location.href = url;
  }, [
    url,
  ]);

  return null;
};