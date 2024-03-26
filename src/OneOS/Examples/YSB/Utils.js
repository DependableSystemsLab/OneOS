const fs = require('fs');

function joinHosts(hosts, port) {
    return hosts.map(host => `${host}:${port}`).join(',');
}

function findResources(name) {
    try {
        let resources = Thread.currentThread().getContextClassLoader().getResources(name);
        let ret = [];
        while (resources.hasMoreElements()) {
            ret.push(resources.nextElement());
        }
        return ret;
    } catch (e) {
        throw new RuntimeException(e);
    }
}

Utils.getConfigFileInputStream = function (configFilePath) {
    if (!configFilePath) {
        throw new IOException("Could not find config file, name not specified");
    }

    let resources = new Set(findResources(configFilePath));
    if (resources.size === 0) {
        File configFile = new File(configFilePath);
        if (configFile.exists()) {
            return new FileInputStream(configFile);
        }
    } else if (resources.size > 1) {
        throw new IOException(
            "Found multiple " + configFilePath
            + " resources. You're probably bundling the Storm jars with your topology jar. "
            + resources);
    } else {
        LOG.debug("Using " + configFilePath + " from resources");
        URL resource = resources.iterator().next();
        return resource.openStream();
    }
    return null;
}

Utils.findAndReadConfigFile = function(name, mustExist) {
    InputStream in = null;
    boolean confFileEmpty = false;
    try {
            in = getConfigFileInputStream(name);
        if (null != in) {
            Yaml yaml = new Yaml(new SafeConstructor());
            Map ret = (Map) yaml.load(new InputStreamReader(in));
            if (null != ret) {
                return new HashMap(ret);
            } else {
                confFileEmpty = true;
            }
        }

        if (mustExist) {
            if (confFileEmpty)
                throw new RuntimeException("Config file " + name + " doesn't have any valid storm configs");
            else
                throw new RuntimeException("Could not find config file on classpath " + name);
        } else {
            return new HashMap();
        }
    } catch (IOException e) {
        throw new RuntimeException(e);
    } finally {
        if (null != in) {
            try {
                    in.close();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
    }
}



    private static final Logger LOG = LoggerFactory.getLogger(Utils.class);

    public static String 


    

    

    public static List < URL > findResources(String name) {
    try {
        Enumeration < URL > resources = Thread.currentThread().getContextClassLoader().getResources(name);
        List < URL > ret = new ArrayList<URL>();
        while (resources.hasMoreElements()) {
            ret.add(resources.nextElement());
        }
        return ret;
    } catch (IOException e) {
        throw new RuntimeException(e);
    }
}
}

module.exports = {
    findResources(name) {
        try {
            Enumeration < URL > resources = Thread.currentThread().getContextClassLoader().getResources(name);
            List < URL > ret = new ArrayList<URL>();
            while (resources.hasMoreElements()) {
                ret.add(resources.nextElement());
            }
            return ret;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}