# bakana extension for takane formats

![Unit tests](https://github.com/kanaverse/bakana-takane/actions/workflows/run-tests.yaml/badge.svg)
![Documentation](https://github.com/kanaverse/bakana-takane/actions/workflows/build-docs.yaml/badge.svg)
![NPM](https://img.shields.io/npm/v/bakana-takane)

Implements [**bakana**-compatible](https://github.com/kanaverse/bakana) readers for [**takane**](https://github.com/ArtifactDB/takane)-formatted datasets and results.
Developers can define subclasses to load data from their own local/remote sources, e.g., [**gypsum**](https://github.com/ArtifactDB/gypsum-worker).

To demonstrate, we'll show how to read a dataset from the local filesystem with Node.js.
First, install the package from **npm**:

```shell
npm install bakana-takane
```

Given a string containing some kind of "path" with Unix file separators, developers should define a method to get/list the contents of the file or directory.

```js
import * as fs from "fs";

export function getFile(path) {
    const contents = fs.readFileSync(path, null);
    return new Uint8Array(contents);
}

export function listFiles(path) {
    return fs.readdirSync(path);
}
```

We define a subclass of the `AbstractDataset`:

```js
import * as bt from "bakana-takane"

class LocalDataset extends bt.AbstractDataset {
    constructor(path) {
        super(path, getFile, listFiles);
    }

    // Extra methods required by bakana; omitting the
    // serialize/unserialize methods for simplicity.
    static format() {
        return "local-takane";
    }

    abbreviate() {
        return { "path": path };
    }
};
```

Instances of our `LocalDataset` can now be used in **bakana**:

```js
import * as bakana from "bakana";
const ds = new LocalDataset("/path/to/dataset");
let state = await bakana.createAnalysis();
let params = bakana.analysisDefaults();
await bakana.runAnalysis(state, { dataset: ds }, params);
```

Subclasses of the `AbstractResult` are even easier to define:

```js
class LocalResult extends bt.AbstractResult {
    constructor(path) {
        super(path, getFile, listFiles);
    }
};
```

Check out the [reference documentation](https://kanaverse.org/bakana-takane) for more information.
