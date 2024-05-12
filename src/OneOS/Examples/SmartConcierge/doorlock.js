const doorOpenInterval = 5000;
let doorOpen = false;

process.stdin.json.on('data', message => {
    if (message.type === 'employee-detected') {
        doorOpen = true;
        lastActivated = Date.now();

        process.stdout.json.write({
            event: 'door-open'
        });

        setTimeout(() => {
            doorOpen = false;
            process.stdout.json.write({
                event: 'door-close'
            });
        }, doorOpenInterval);
    }
});