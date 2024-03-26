function doTask(json) {
    if (json.event_type === "view") {
        process.stdout.json.write({
            ad_id: json.ad_id,
            event_time: json.event_time
        });
    }
}

process.stdin.json.on('data', doTask);
process.stdin.json.on('end', () => process.exit());