if (process.argv.length < 3) {
	console.error('Need to provide the recipient email as an argument.\n  e.g., notifier.js owner@example.com');
	process.exit(1);
}

const recipient = process.argv[2];

const nodemailer = require('nodemailer');
const fs = require('fs');

const predicates = [
	{
		text: 'Event triggered during unexpected hours',
		check: (msg) => {
			if (msg.status) {
				var date = new Date(msg.timestamp);
				var hour = date.getHours();
				if (hour < 6 || 21 < hour) {
					return true;
				}
			}
			return false;
		}
	},
	{
		text: 'Event needs immediate attention',
		check: msg => (msg.severity == 'emergency')
	},
]

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
		console.log(String(data));
		var violations = [];
		predicates.forEach((predicate) => {
			if (predicate.check(data)) violations.push({
				date: new Date(data.timestamp),
				text: predicate.text
			})
		});

		if (violations.length > 0) {
			var mailText = '';
			var mailHtml = violations.map((item) => {
				return '<li>' + item.date.toUTCString() + ' : ' + item.text + '</li>';
			}).join('\n');
			mailHtml = '<ol>' + mailHtml + '</ol>';

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