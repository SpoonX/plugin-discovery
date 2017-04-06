# plugin-discovery

Discover plugins for your (CLI) tool.

This module will scan locations on the file system in an optimal manner, in search of your plugins.

## Installation

`npm i --save plugin-discovery`

## Usage

This plugin can be used in instance form, or statically, both async (recommended) and sync.
There's an example in the `example` directory of this project.

```js
const {PluginDiscovery} = require('plugin-discovery');

// Sync
let plugins = PluginDiscovery.discoverSync(config);

// Async
PluginDiscovery.discover(discoveryConfig).then(plugins => {
  // Go nuts! :)
})
```

### Config

These options are available to configure.

```js
const configOptions = {

  // Prefix of your plugins, e.g. my-prefix-foo
  prefix: 'my-prefix',

  // Strategy to use for the plugin's key. Read on for the options.
  dictionaryKeyStrategy: PluginDiscovery.constants.STRATEGY_PROPERTY,

  // Name of the property for strategies PROPERTY and METHOD.
  dictionaryKeyProperty: 'name',

  // Additional paths to look for plugins
  searchPaths: [__dirname + '/custom_path'],

  // Discover plugins in the global node_modules directory? (useful for CLI tools!)
  discoverGlobal: true,

  // Discover plugins in the current working directory?
  discoverCwd: true,

  // Import plugin based on named export? (e.g. module.exports.MyPlugin)
  importNamed: 'MyPlugin',

  // Import plugin based on named fallback export when not found after regular checks?
  namedFallback: 'MyPluginFallback',

  // Custom configurers. The key is used to allow for multiple configurers. 
  configurers: {
    myPlugin: (key, plugin, rootImport) => {
      // Configure for your own project here...
    }
  },

  // Internal method used to configure. Only override when you really know what you're doing.
  configure: (dictionaryKey, imported, root) => this.configure(dictionaryKey, imported, root)
};
```

### Strategies

There are a couple of strategies available for determining what the key of your plugin will be in the produced plugin-dictionary.

All constants are available through: `PluginDiscovery.constants.${constant}`

#### STRATEGY_MODULE_NAME

Using this strategy, the key will simply be the entire module name, including the prefix.

#### STRATEGY_STRIP_PREFIX

Using this strategy, the key will simply be the entire module name, minus the prefix.

#### STRATEGY_PROPERTY

This strategy allows you to export the key of the plugin, in the plugin.

```js
module.exports = {
  name  : 'my_plugin',
  plugin: MyPlugin
};
```

_**Note:** this option requires you to also configure the `dictionaryKeyProperty`._

#### STRATEGY_METHOD

This strategy allows you to export the key of the plugin, using a method on the plugin export.

```js
module.exports = {
  name  : () => 'my_plugin',
  plugin: MyPlugin
};
```

_**Note:** this option requires you to also configure the `dictionaryKeyProperty`._

#### STRATEGY_CUSTOM

This strategy means that PluginDiscovery won't index your plugins at all. Instead, you are expected to do so yourself in the configure phase. 

## License

MIT
