const activationCooldown = 8000;
const notificationCooldown = 20000;

let prevLabels = [];
let lastActivation = Date.now();
let lastNotification = Date.now();

function compareLabels(labels) {
    return {
        added: labels.filter(label => !prevLabels.includes(label)),
        removed: prevLabels.filter(label => !labels.includes(label))
    }
}

process.stdin.json.on('data', message => {
    const diff = compareLabels(message.labels || []);

    if (diff.added.length > 0) {
        process.stdout.json.write({ message: 'New labels: ' + diff.added.join(', ') });
        const now = Date.now();

        if (diff.added.includes('employee') && (now - lastActivation > activationCooldown)) {
            console.log('  activating doorlock!');
            process.stdout.json.write({
                type: 'employee-detected'
            });

            lastActivation = now;
        }

        if (diff.added.includes('guest') && (now - lastNotification > notificationCooldown)) {
            console.log('  notifying manager!');
            process.stdout.json.write({
                type: 'guest-detected'
            });

            lastNotification = now;
        }
    }

    if (diff.removed.length > 0) {
        process.stdout.json.write({ message: 'Removed labels: ' + diff.removed.join(', ') });
    }

    prevLabels = message.labels;
});