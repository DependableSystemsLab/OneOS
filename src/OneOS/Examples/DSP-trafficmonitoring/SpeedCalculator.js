const roads = new Map();

process.stdin.json.on('data', msg => {
    if (!roads.has(msg.roadId)) {
        roads.set(msg.roadId, []);
    }

    const roadSpeeds = roads.get(msg.roadId);

    roadSpeeds.push(msg.speed);
    if (roadSpeeds.length > 30) roadSpeeds.shift();

    const avgSpeed = roadSpeeds.reduce((acc, val) => acc + val, 0) / 30;

    process.stdout.json.write({
        nowDate: new Date(),
        roadId: msg.roadId,
        avgSpeed: avgSpeed,
        count: roadSpeeds.length
    });

});
process.stdin.json.on('end', () => process.exit());