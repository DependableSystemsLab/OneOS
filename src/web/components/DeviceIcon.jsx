import React from 'react';
import {Image} from 'semantic-ui-react';

import UnknownDevice from '../assets/icons/device-unknown-sm.png';
import RaspberryPiZero from '../assets/icons/device-raspberry-pi0-sm.png';
import RaspberryPi3 from '../assets/icons/device-raspberry-pi3-sm.png';
import XeonE3 from '../assets/icons/device-xeon-e3-sm.png';
import XeonE5 from '../assets/icons/device-xeon-e5-sm.png';
import WebChrome from '../assets/icons/device-web-chrome-sm.png';

const IconMap = {
	'undefined': UnknownDevice,
	'raspberry-pi0': RaspberryPiZero,
	'raspberry-pi3': RaspberryPi3,
	'xeon-e3': XeonE3,
	'xeon-e5': XeonE5,
	'web-chrome': WebChrome
}

export default function DeviceIcon(props){
	return <Image avatar src={IconMap[props.deviceLabel]}/>
}