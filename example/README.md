# Example

This example demonstrates local plugin discovery.
That being said, any plugin in your project's node_modules, or machine's global node_modules will get discovered all the same.

## Running

Simple, run `node test`:

```bash
$ node test
{ 'bacon-maker': [Function: BaconMaker],
  'cake-maker': [Function: CakeMaker] }
{ 'bacon-maker': [Function: BaconMaker],
  'cake-maker': [Function: CakeMaker] }
```
