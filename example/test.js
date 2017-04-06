let {PluginDiscovery} = require('../index');

let discoveryConfig = {
  prefix               : 'test-prefix',
  namedFallback        : 'Foo',
  importNamed          : null,
  dictionaryKeyStrategy: PluginDiscovery.constants.STRATEGY_STRIP_PREFIX,
  dictionaryKeyProperty: 'name',
  searchPaths          : __dirname + '/some-directory'
};

// Async
PluginDiscovery.discover(discoveryConfig).then(console.log).catch(error => console.error(error));

// Sync
let gotSync = PluginDiscovery.discoverSync(discoveryConfig);

console.log(gotSync);

// $ node test
//
// { 'bacon-maker': [Function: BaconMaker],
//   'cake-maker': [Function: CakeMaker] }
// { 'bacon-maker': [Function: BaconMaker],
//   'cake-maker': [Function: CakeMaker] }
