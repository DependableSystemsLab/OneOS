if (process.argv.length < 3) {
	console.error('Need to provide the recipient email as an argument.\n  e.g., notifier.js owner@example.com');
	process.exit(1);
}

const recipient = process.argv[2];

const nodemailer = require('nodemailer');
const fs = require('fs');

const notificationCooldown = 20000;
let lastNotified = Date.now();

function start(config) {
	const transporter = nodemailer.createTransport({
		service: config.service,
		auth: {
			user: config.username,
			pass: config.password
		}
	});

	console.log('Starting Email Notifier');
	console.log('Using SMTP service at ' + config.service);

	process.stdin.json.on('data', (data) => {
		const now = Date.now();

		if (data.type === 'guest-detected' && (now - lastNotified > notificationCooldown)) {

			lastNotified = Date.now();

			var mailText = 'Guest Detected';
			var mailHtml = '<p>Guest Detected</p>';

			var mailOptions = {
				from: config.username,
				to: recipient,
				cc: config.admin_email,
				subject: 'OneOS Email Alert',
				text: mailText,
				html: mailHtml
			};

			//and then send mail
			console.log('Sending Notification to ' + config.admin_email);
			transporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					return console.log(error);
				}
				console.log('Message sent: ' + info.response);

				process.stdout.json.write({
					message: 'Notified ' + config.admin_email + ' about Guest'
				})
			});
		}
	});

	process.stdin.json.on('end', () => process.exit());
}

fs.readFile('/conf/smtp.json', function (err, data) {
	if (err) throw new Error('Could not read SMTP configuration file');
	var config = JSON.parse(String(data));
	start(config);
});