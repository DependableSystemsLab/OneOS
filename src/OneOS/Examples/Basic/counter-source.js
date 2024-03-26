const INTERVAL = 100;
let count = 0;

let timer = setInterval(() => {
    process.stdout.json.write({
        count: count++
    });

    if (count === 1000) {
        clearInterval(timer);

        process.exit();
    }
}, INTERVAL);