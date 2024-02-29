import React from 'react';
import { Path } from 'react-native-svg';
import Svg from '../Svg';

const TabPointsInner = ({ colors = undefined, color = colors.white, size = 28 }) => {
  return (
    <Svg height={size} viewBox="0 0 28 28" width={size}>
      <Path
        clipRule="evenodd"
        d="M14.5888 6.29531C15.2565 5.44128 15.6535 5.40555 15.8185 5.44063C15.9835 5.4757 16.3317 5.66983 16.5942 6.72156C16.8401 7.70641 16.8935 9.03945 16.8291 10.4531C16.7656 11.8461 16.5927 13.2275 16.4336 14.2679C16.3913 14.5447 16.3502 14.7961 16.3127 15.0157C15.498 15.0451 14.6657 14.976 13.8299 14.7983C12.9938 14.6206 12.2051 14.3451 11.4726 13.9867C11.5276 13.7708 11.5923 13.5245 11.6662 13.2546C11.9441 12.2394 12.348 10.9071 12.8565 9.60872C13.3727 8.29108 13.9637 7.09502 14.5888 6.29531ZM21.166 16.3577C20.3121 16.1762 19.5077 15.8927 18.7621 15.523C18.8058 15.2702 18.8546 14.9747 18.9049 14.6457C19.0716 13.5552 19.2576 12.0794 19.3265 10.5669C19.3831 9.32375 19.3644 7.99114 19.1632 6.8068C22.251 8.77626 24.1021 12.3276 23.8248 16.0892C23.804 16.3712 23.5765 16.5812 23.2977 16.5816C22.596 16.5824 21.8825 16.51 21.166 16.3577ZM9.25489 12.5945C9.16699 12.9156 9.09134 13.2055 9.02844 13.4543C8.19724 13.4887 7.34737 13.4204 6.49381 13.239C5.77736 13.0867 5.09609 12.8627 4.45538 12.5765C4.20076 12.4628 4.07835 12.1784 4.17408 11.9123C5.45064 8.36345 8.58567 5.87224 12.2071 5.32861C11.5416 6.32866 10.9826 7.5383 10.5288 8.69692C9.97657 10.1066 9.54615 11.5305 9.25489 12.5945Z"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
};

export default TabPointsInner;
