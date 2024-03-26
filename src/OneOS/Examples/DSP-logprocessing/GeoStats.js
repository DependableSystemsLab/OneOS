const stats = new Map();

class CountryStats {
    constructor(countryName) {
        this.total = 0;
        this.countryName = countryName;
        this.cityStats = new Map();
    }

    cityFound(cityName) {
        this.total++;

        if (!this.cityStats.has(cityName)) {
            this.cityStats.set(cityName, [0, 0]);
        }

        const stat = this.cityStats.get(cityName);
        stat[0] = stat[0] + 1;
        stat[1] = stat[0] / this.total;
    }

    getCityTotal(cityName) {
        return this.cityStats.get(cityName)[0];
    }

    toString() {
        return "Total Count for " + this.countryName + " is " + this.total + "\n" + "Cities: " + this.cityStats.toString();
    }
}

process.stdin.json.on('data', msg => {
    if (!stats.has(msg.country)) {
        stats.set(msg.country, new CountryStats(msg.country));
    }

    const countryStats = stats.get(msg.country);
    countryStats.cityFound(msg.city);

    msg.countryTotal = countryStats.total;
    msg.cityTotal = countryStats.getCityTotal(msg.city);

    process.stdout.json.write(msg);
});
process.stdin.json.on('end', () => process.exit());