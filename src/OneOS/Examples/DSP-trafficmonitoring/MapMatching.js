if (process.argv.length < 3) {
    console.log("Provide map data path. E.g., node MapMatching.js $filePath");
    process.exit();
}

const filePath = process.argv[2];

const fs = require('fs');
const gdal = require('gdal-async');

const LAT_MIN = 39.689602;
const LAT_MAX = 40.122410;
const LON_MIN = 116.105789;
const LON_MAX = 116.670021;
const FEATURE_ID_KEY = 'osm_id';

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }
}

class GPSRecord extends Point {
    constructor(lon, lat, speed, bearing) {
        super(lon, lat);
        this.vel = speed;
        this.bearing = bearing;
    }

    getVel() {
        return this.vel;
    }

    getBearing() {
        return this.bearing;
    }
}

function getCenterOfLinestring(lineString) {
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    lineString.points.forEach(point => {
        if (point.x < xMin) xMin = point.x;
        if (point.x > xMax) xMax = point.x;
        if (point.y < yMin) yMin = point.y;
        if (point.y > yMax) yMax = point.y;
    });

    return new Point(10 * (xMin + xMax) / 2, 10 * (yMax + yMin) / 2);

}

function distanceBetweenLineAndPoint(a, b, p) {
    // Vector from A to B
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    // Squared length of AB
    const lenSq = dx * dx + dy * dy;

    // If A and B are the same point, return the distance from A (or B) to P
    if (lenSq === 0) {
        return distanceBetweenTwoPoints(a, p);
    }

    // Projection of vector AP onto AB
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;

    // If the projection lies outside the line segment, take the minimum distance to either endpoint A or B
    if (t < 0) return distanceBetweenTwoPoints(a, p);
    if (t > 1) return distanceBetweenTwoPoints(b, p);

    // Projection is on the segment, calculate the distance to the projection point
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return distanceBetweenTwoPoints(new Point(projX, projY), p);
}

function distanceBetweenTwoPoints(p1, p2) {
    // Euclidean distance between two points
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

class RoadGridList {
    constructor(mapDataPath) {
        this.gridList = new Map();

        this.read(mapDataPath);
    }

    read(mapDataPath) {
        const mapData = gdal.open(mapDataPath);

        // we assume roads layer is layer 0
        const roadLayer = mapData.layers.get(0);

        let feature;
        while (feature = roadLayer.features.next()) {

            let mapId;
            if (feature.fields.getNames().includes('MapID')) {
                mapId = feature.fields.get('MapID');
            }
            else {
                // we assume all features are Linestrings
                let center = getCenterOfLinestring(feature.getGeometry());
                mapId = String(center.y).substring(0, 3) + '_' + String(center.x).substring(0, 4);
            }

            if (!this.gridList.has(mapId)) {
                let roadList = [];
                roadList.road = feature;
                this.gridList.set(mapId, roadList);
            }

            this.gridList.get(mapId).push(feature);
        }
    }

    fetchRoadId(point) {
        let mapId = String(point.y * 10).substring(0, 3) + '_' + String(point.x * 10).substring(0, 4);
        let closestRoadId = -1;
        let minDistance = Infinity;

        if (this.gridList.has(mapId)) {
            for (let road of this.gridList.get(mapId)) {
                let roadId = road.fields.get(FEATURE_ID_KEY);
                let points = road.getGeometry().points;

                for (let i = 0; i < points.count() - 1; i++) {
                    let distance = distanceBetweenLineAndPoint(points.get(i), points.get(i + 1), point);

                    if (distance < 5) {
                        return roadId;
                    }
                    else if (distance < minDistance) {
                        minDistance = distance;
                        closestRoadId = roadId;
                    }
                }
            }

            // not sure about the following logic, but the original implementation uses this
            if (minDistance < Math.sqrt(125)) {
                return closestRoadId;
            }
            else {
                return -1;
            }
        }
        else {
            return -1;
        }
    }
}

const sectors = new RoadGridList(filePath);

process.stdin.json.on('data', msg => {
    try {
        if (msg.speed <= 0) return;
        if (msg.longitude > LON_MAX || msg.longitude < LON_MIN || msg.latitude > LAT_MAX || msg.latitude < LAT_MIN) return;

        const record = new GPSRecord(msg.longitude, msg.latitude, msg.speed, msg.bearing);
        const roadId = sectors.fetchRoadId(record);

        if (roadId != -1) {
            msg.roadId = roadId;

            process.stdout.json.write(msg);
        }
    }
    catch (ex) {
        console.error("Unable to fetch road ID", ex);
    }
});
process.stdin.json.on('end', () => process.exit());