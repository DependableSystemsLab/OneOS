const Gpio = require('onoff').Gpio;

const Chars = {
	'0': 0x3f,
	'1': 0x06,
	'2': 0x5b,
	'3': 0x4f,
	'4': 0x66,
	'5': 0x6d,
	'6': 0x7d,
	'7': 0x07,
	'8': 0x7f,
	'9': 0x6f,
	'A': 0x77,
	'B': 0x7c,
	'C': 0x39,
	'D': 0x5e,
	'E': 0x79,
	'F': 0x71,
	'G': 0x3d,
	'H': 0x76,
	'I': 0x30,
	'J': 0x1e,
	'K': 0x80,
	'L': 0x38,
	'M': 0x80,
	'N': 0x37,
	'O': 0x3f,
	'P': 0x73,
	'Q': 0x67,
	'R': 0x50,
	'S': 0x6d,
	'T': 0x78,
	'U': 0x3e,
	'V': 0x3e,
	'W': 0x80,
	'X': 0x80,
	'Y': 0x6e,
	'Z': 0x5b,
	'a': 0x5f,
	'b': 0x7c,
	'c': 0x58,
	'd': 0x5e,
	'e': 0x79,
	'f': 0x71,
	'g': 0x3d,
	'h': 0x74,
	'i': 0x11,
	'j': 0x0d,
	'k': 0x80,
	'l': 0x38,
	'm': 0x80,
	'n': 0x54,
	'o': 0x5c,
	'p': 0x73,
	'q': 0x67,
	'r': 0x50,
	's': 0x6d,
	't': 0x78,
	'u': 0x1c,
	'v': 0x1c,
	'w': 0x80,
	'x': 0x80,
	'y': 0x6e,
	'z': 0x5b
};

const Pins = {
	SDI: new Gpio(24, 'low'),
	RCLK: new Gpio(23, 'low'),
	SRCLK: new Gpio(18, 'low'),
	P1: new Gpio(10, 'low'),
	P2: new Gpio(22, 'low'),
	P3: new Gpio(27, 'low'),
	P4: new Gpio(17, 'low')
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const clearDisplay = () => {
	for (let i = 0; i < 8; i++){
		Pins.SDI.writeSync(0);
		Pins.SRCLK.writeSync(Gpio.HIGH);
		Pins.SRCLK.writeSync(Gpio.LOW);
	}
	Pins.RCLK.writeSync(Gpio.HIGH);
	Pins.RCLK.writeSync(Gpio.LOW);
};

const pickDigit = digit => {
	Pins.P1.writeSync(Gpio.HIGH);
	Pins.P2.writeSync(Gpio.HIGH);
	Pins.P3.writeSync(Gpio.HIGH);
	Pins.P4.writeSync(Gpio.HIGH);
	Pins['P' + digit].writeSync(Gpio.LOW);
};

const writeDigit = character => {
	const hex = Chars[character];
	//console.log('\n' + hex + ' ');
	for (let i = 7; i >= 0; i--){
		//process.stdout.write(String((hex >> i) & 0x01));
		Pins.SDI.writeSync(((hex >> i) & 0x01));
		Pins.SRCLK.writeSync(Gpio.HIGH);
		Pins.SRCLK.writeSync(Gpio.LOW);
	}
	Pins.RCLK.writeSync(Gpio.HIGH);
	Pins.RCLK.writeSync(Gpio.LOW);
};

const displayText = (text) => {
	const t4 = text.slice(0, 4);
	for (let i = 0; i < t4.length; i++){
		clearDisplay();
		pickDigit(t4.length - i);
		writeDigit(t4[i]);
	}
};

const blinkText = (text, duration = 2000) => {
	const t4 = text.slice(0, 4);
	const started = Date.now();
	let elapsed = 0;
	while (elapsed < duration){
		for (let i = 0; i < t4.length; i ++){
			clearDisplay();
			pickDigit(t4.length - i);
			if (Math.floor(elapsed / 200) % 2 > 0){
				writeDigit(t4[i]);
			}
		}

		elapsed = Date.now() - started;
	}

	for (let i = 0; i < 4; i++){
		clearDisplay();
		pickDigit(1 + i);
	}
}

process.stdin.json.on('data', message => {
	if (message.event === 'door-open') {
		blinkText('OPEN', 2500);
	}
	else if (message.event === 'door-close') {
		blinkText('shut', 2500);
	}
});
