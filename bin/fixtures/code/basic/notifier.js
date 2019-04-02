var nodemailer = require('nodemailer');
var fs = require('oneos').fs();

var predicates = [
{
	text: 'Event triggered during unexpected hours',
	check: (msg)=>{
		if (msg.status){
			var date = new Date(msg.timestamp);
			var hour = date.getHours();
			if (hour < 6 || 21 < hour){
				return true;
			}
		}
		return false;
	}
},
]

function start(config){
	var url = config.protocol+'://'+encodeURIComponent(config.username)+':'+encodeURIComponent(config.password)+'@'+config.host;
	var transporter = nodemailer.createTransport(url);

	var inStream = process.input('alarm', 'json');

	console.log('Starting Email Notifier');
	console.log('Using SMTP service at '+config.host);

	inStream.on('data', (data)=>{
		console.log(String(data));
		var violations = [];
		predicates.forEach((predicate)=>{
			if (predicate.check(data)) violations.push({
				date: new Date(data.timestamp),
				text: predicate.text
			})
		});

		if (violations.length > 0){
			var mailText = '';
			var mailHtml = violations.map((item)=>{
				return '<li>'+ item.date.toUTCString() +' : '+ item.text+'</li>';
			}).join('\n');
			mailHtml = '<ol>'+mailHtml+'</ol>';

			var mailOptions = {
				    from: config.username,
				    to: config.admin_email,
				    subject: 'OneOS Email Alert',
				    text: mailText,
				    html: mailHtml
				};
			
			//and then send mail
			console.log('Sending Notification to '+config.admin_email);
			transporter.sendMail(mailOptions, function(error, info){
			    if(error){
			        return console.log(error);
			    }
			    console.log('Message sent: ' + info.response);
			});
		}
	});
}

fs.readFile('/conf/smtp.json', function(err, data){
	if (err) throw new Error('Could not read SMTP configuration file');
	var config = JSON.parse(String(data));
	start(config);
});

process.stdin.on('data', (data)=>console.log(String(data)));