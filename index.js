const path        = require('path');
const which       = require('which');
const glob        = require('glob');
const {Homefront} = require('homefront');

const constants = Object.freeze({
  STRATEGY_MODULE_NAME : 'module_name',
  STRATEGY_STRIP_PREFIX: 'strip_prefix',
  STRATEGY_PROPERTY    : 'property',
  STRATEGY_METHOD      : 'method',
  STRATEGY_CUSTOM      : 'custom',
});

class PluginDiscovery {
  constructor(config) {
    this.paths      = [];
    this.dictionary = {};
    this.roots      = {};
    this.config     = new Homefront({
      prefix               : 'sx',
      dictionaryKeyStrategy: constants.STRATEGY_MODULE_NAME,
      dictionaryKeyProperty: null,
      searchPaths          : [],
      discoverGlobal       : true,
      discoverCwd          : true,
      importNamed          : false,
      namedFallback        : false,
      configurers          : null,
      configure            : (dictionaryKey, imported, root) => this.configure(dictionaryKey, imported, root)
    });

    this.config.merge(config);

    this.config.put('prefix', this.config.fetch('prefix').replace(/-$/, ''));
  }

  assemblePaths(additionalPaths = []) {
    let configuredPaths = this.config.fetch('searchPaths', []);
    let discoverCwd     = this.config.fetch('discoverCwd');

    if (!configuredPaths.length && !additionalPaths.length && !discoverCwd) {
      return this;
    }

    let paths = [];

    if (process.env.NODE_PATH) {
      paths = process.env.NODE_PATH.split(':');
    }

    if (discoverCwd) {
      paths.push(path.join(process.cwd(), 'node_modules'));
    }

    this.paths = paths
      .concat(configuredPaths, additionalPaths)
      .filter((value, index, self) => self.indexOf(value) === index);

    process.env.NODE_PATH = this.paths.join(':');

    require('module').Module._initPaths();

    return this;
  }

  static discoverSync(config) {
    let discovery   = new PluginDiscovery(config);
    let globalPaths = [];

    if (discovery.config.fetch('discoverGlobal')) {
      globalPaths = discovery.getGlobalPath(true);
    }

    discovery.assemblePaths([globalPaths]);

    let plugins = discovery.globPaths(true);

    discovery.buildPluginDictionary(plugins);

    return discovery.dictionary;
  }

  static discover(config) {
    let discovery   = new PluginDiscovery(config);
    let globalPaths = [];

    if (discovery.config.fetch('discoverGlobal')) {
      globalPaths = discovery.getGlobalPath();
    }

    return Promise.resolve(globalPaths)
      .then(globalPath => discovery.assemblePaths([globalPath]))
      .then(() => discovery.globPaths())
      .then(plugins => discovery.buildPluginDictionary(plugins))
      .then(() => discovery.dictionary);
  }

  buildPluginDictionary(plugins) {
    plugins.forEach(plugin => {
      let {root, imported} = this.importPlugin(plugin);
      let dictionaryKey    = this.getDictionaryKey(plugin, imported);
      let configure        = this.config.fetch('configure');

      if (typeof configure === 'function') {
        configure(dictionaryKey, imported, root);
      }

      if (this.config.fetch('dictionaryKeyStrategy') === constants.STRATEGY_CUSTOM) {
        return;
      }

      this.roots[dictionaryKey]      = root;
      this.dictionary[dictionaryKey] = imported;
    });
  }

  configure(dictionaryKey, imported, root) {
    let configurers = this.config.fetch('configurers');

    if (!configurers) {
      return;
    }

    let configurerNames = Object.keys(configurers);

    if (!configurerNames.length) {
      return;
    }

    configurerNames.forEach(name => {
      configurers[name](dictionaryKey, imported, root);
    });
  }

  getDictionaryKey(moduleName, imported) {
    let dictionaryKeyProperty = this.config.fetch('dictionaryKeyProperty');
    let dictionaryKeyStrategy = this.config.fetch('dictionaryKeyStrategy');

    if (dictionaryKeyStrategy === constants.STRATEGY_CUSTOM) {
      return null;
    }

    if (dictionaryKeyStrategy === constants.STRATEGY_MODULE_NAME) {
      return moduleName;
    }

    if (dictionaryKeyStrategy === constants.STRATEGY_PROPERTY) {
      return imported[dictionaryKeyProperty];
    }

    if (dictionaryKeyStrategy === constants.STRATEGY_METHOD) {
      return imported[dictionaryKeyProperty]();
    }

    if (dictionaryKeyStrategy === constants.STRATEGY_STRIP_PREFIX) {
      return moduleName.replace(new RegExp(`^${this.config.fetch('prefix')}-`), '');
    }

    throw new Error(`Invalid strategy '${dictionaryKeyStrategy}' used.`);
  }

  importPlugin(pluginName) {
    let imported      = require(pluginName);
    let importNamed   = this.config.fetch('importNamed');
    let namedFallback = this.config.fetch('namedFallback');

    if (importNamed) {
      if ((typeof imported !== 'object' || !imported[importNamed]) && !namedFallback) {
        throw new Error(`Plugin '${pluginName}' doesn't export a named property '${importNamed}'.`);
      } else {
        return {imported: imported[importNamed], root: imported};
      }
    }

    if (typeof imported === 'object' && namedFallback) {
      if (!imported[namedFallback]) {
        throw new Error(`Plugin '${pluginName}' doesn't export a named (fallback) property '${namedFallback}'.`);
      }

      return {imported: imported[namedFallback], root: imported};
    }

    return {imported, root: imported};
  }

  globPaths(sync) {
    let globbed = this.paths.map(target => {
      return this.globPath(target, sync);
    });

    let compose = matches => {
      let composed = [];

      matches.forEach(match => {
        if (match.length) {
          composed = composed.concat(match);
        }
      });

      return composed.filter((value, index, self) => {
        if (self.indexOf(value) === index) {
          return value;
        }
      });
    };

    if (sync) {
      return compose(globbed);
    }

    return Promise.all(globbed).then(compose);
  }

  globPattern() {
    return `${this.config.fetch('prefix')}-*`;
  }

  globPath(cwd, sync) {
    let pattern = this.globPattern();

    if (sync) {
      return glob.sync(pattern, {cwd});
    }

    return new Promise((resolve, reject) => {
      glob(pattern, {cwd}, (error, files) => {
        if (error) {
          return reject(error);
        }

        resolve(files);
      })
    });
  }

  getGlobalPath(sync) {
    if (sync) {
      return path.join(which.sync('npm'), '../../lib/node_modules');
    }

    return new Promise((resolve, reject) => {
      which('npm', (error, bin) => {
        if (error) {
          return reject(error)
        }

        resolve(path.join(bin, '../../lib/node_modules'))
      })
    });
  }
}

PluginDiscovery.constants = constants;

module.exports.PluginDiscovery = PluginDiscovery;
