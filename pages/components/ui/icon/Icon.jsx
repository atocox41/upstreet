import React, {
  useEffect,
  useRef,
} from 'react';
import {
  IconCollection,
} from './IconCollection.jsx';

async function getSVG(iconName) {
  const icon = IconCollection.find((item) => item.name === iconName);
  if (icon) {
    return await fetch(icon.file)
      .then((res) => res.text())
      .then((res) => {
        const parser = new DOMParser();
        const svgDom = parser.parseFromString(res, 'image/svg+xml');
        return {
          svgDom: svgDom.firstElementChild,
          svgFile: icon.file,
          svgName: icon.name,
        };
      });
  }
}

export default function Icon(props) {
  const { icon, className, iconClass, type, onClick } = props;
  const svgRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (icon) {
      getSVG(icon).then((res) => {
        if ((type && type === 'dom') || !type) {
          if (svgRef.current) {
            svgRef.current.innerHTML = '';
            if (res) {
              res.svgDom.classList.add(iconClass);
              svgRef.current.append(res.svgDom);
            }
          }
        } else if (type && type === 'img') {
          imgRef.current.src = res.svgFile;
          imgRef.current.alt = res.svgName;
        } else {
          return null;
        }
      });
      // console.log("Icon Changed")
    }
  }, [icon]);

  if ((type && type === 'dom') || !type) {
    return <span ref={svgRef} className={className} onClick={onClick}></span>;
  } else if (type && type === 'img') {
    return <img ref={imgRef} onClick={onClick} />;
  } else {
    return null;
  }
}