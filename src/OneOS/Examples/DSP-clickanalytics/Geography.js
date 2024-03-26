if (process.argv.length < 3) {
    console.log("Provide file path. E.g., node Geography.js $filePath");
    process.exit();
}

var filePath = process.argv[2];

const fs = require('fs');
const mmdb = require('mmdb-lib');

const GEOIP_INSTANCE = 'geoip2';

//const resolver = IPLocationFactory.create(GEOIP_INSTANCE);
class Location {
    constructor(country, iso_code, city, ip) {
        this.country = country;
        this.countryCode = iso_code;
        this.city = city;
        this.ip = ip;
    }

    getCity() {
        return this.city;
    }

    getCountry() {
        return this.country;
    }
}

class IPLocation {
    constructor(dbPath) {
        const dbData = fs.readFileSync(dbPath);
        this.geodb = new mmdb.Reader(dbData);
    }

    resolve(ip) {
        try {
            const result = this.geodb.get(ip);
            if (result === null) return null;
            if (!result.country) return null;

            return new Location(result.country.names.en, result.country.iso_code, result.city ? result.city.names.en : "_unknown", ip);
        }
        catch (ex) {
            console.error('Error resolving IP ' + ip);
            return null;
        }
    }
}

const resolver = new IPLocation(filePath);

process.stdin.json.on('data', msg => {
    const location = resolver.resolve(msg.ip);

    if (location) {
        const city = location.getCity();
        const country = location.getCountry();

        process.stdout.json.write({
            country: country,
            city: city
        });
    }
});
process.stdin.json.on('end', () => process.exit());