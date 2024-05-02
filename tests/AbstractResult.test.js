import { AbstractResult } from "../src/AbstractResult.js";
import * as utils from "./utils.js";
import * as path from "path";
import * as scran from "scran.js";
import * as bakana from "bakana";

beforeAll(async () => await bakana.initialize({ localFile: true }));
afterAll(async () => await bakana.terminate());

class LocalResult extends AbstractResult {
    constructor(path) {
        super(path, utils.getFile, utils.listFiles);
    }
};

const PATH = "objects";

test("AbstractResult summary works as expected", async () => {
    const thing = new LocalResult(path.join(PATH, "AbstractResult-basic"));

    const summ = await thing.summary();
    expect(summ.modality_assay_names[""]).toEqual([ "counts", "logged" ]);
    expect(summ.modality_assay_names["spikes"]).toEqual([ "stuff" ]);
    expect(summ.modality_assay_names["adt"]).toEqual([ "foobar" ]);

    expect(summ.modality_features[""].numberOfRows()).toEqual(20);
    expect(summ.modality_features["spikes"].numberOfRows()).toEqual(8);
    expect(summ.modality_features["adt"].numberOfRows()).toEqual(4);

    expect(summ.cells.numberOfRows()).toEqual(5);

    expect(Object.keys(summ.other_metadata)).toEqual(["whee", "stuff"]);

    expect(summ.reduced_dimension_names).toEqual(["tsne", "umap"]);
})

test("AbstractResult loading works as expected", async () => {
    const thing = new LocalResult(path.join(PATH, "AbstractResult-basic"));

    let init = await thing.load();
    expect(init.matrix.numberOfColumns()).toBe(5);
    expect(init.matrix.available()).toEqual([ "", "spikes", "adt" ]);
    expect(init.matrix.get("").numberOfRows()).toBe(20);
    expect(init.matrix.get("spikes").numberOfRows()).toBe(8);
    expect(init.matrix.get("adt").numberOfRows()).toBe(4);

    expect(init.features[""].numberOfRows()).toBe(20);
    expect(init.features["spikes"].numberOfRows()).toBe(8);
    expect(init.features["adt"].numberOfRows()).toBe(4);

    expect(init.cells.numberOfRows()).toEqual(5);

    expect(Object.keys(init.other_metadata)).toEqual(["whee", "stuff"]);

    expect(Object.keys(init.reduced_dimensions)).toEqual(["tsne", "umap"]);
    expect(init.reduced_dimensions["tsne"].length).toEqual(2);
    expect(init.reduced_dimensions["tsne"][0].length).toEqual(5);
    expect(init.reduced_dimensions["umap"].length).toEqual(4);
    expect(init.reduced_dimensions["umap"][0].length).toEqual(5);

    init.matrix.free();
})

test("AbstractResult works with a different main name", async () => {
    const thing = new LocalResult(path.join(PATH, "AbstractResult-named"));

    const summ = await thing.summary();
    expect(summ.modality_assay_names["gene"]).toEqual([ "counts" ]);
    expect(summ.modality_assay_names["spikes"]).toEqual([ "stuff" ]);
    expect(summ.modality_assay_names["adt"]).toEqual([ "foobar" ]);

    const init = await thing.load();
    expect(init.matrix.available()).toEqual([ "gene", "spikes", "adt" ]);
    expect(init.matrix.get("gene").numberOfRows()).toBe(20);
    init.matrix.free();
})

test("AbstractResult works with a pure SE", async () => {
    const thing = new LocalResult(path.join(PATH, "AbstractResult-se"));

    const summ = await thing.summary();
    expect(summ.modality_assay_names[""]).toEqual([ "counts" ]);
    expect(summ.modality_features[""].rowNames()[0]).toEqual("G");

    const init = await thing.load();
    expect(init.matrix.available()).toEqual([ "" ]);
    expect(init.matrix.get("").numberOfRows()).toBe(20);
    init.matrix.free();
})

test("AbstractResult recognises the reduced dimension options", async () => {
    const thing = new LocalResult(path.join(PATH, "AbstractResult-basic"));

    thing.setOptions({ reducedDimensionNames: [ "umap" ] });
    let init = await thing.load();
    expect(Object.keys(init.reduced_dimensions)).toEqual(["umap"]);
    init.matrix.free();

    thing.setOptions({ reducedDimensionNames: [] });
    init = await thing.load();
    expect(Object.keys(init.reduced_dimensions)).toEqual([]);
    init.matrix.free();
})

test("AbstractResult recognises the assay options", async () => {
    const thing = new LocalResult(path.join(PATH, "AbstractResult-basic"));
    let init = await thing.load();
    expect(init.matrix.available()).toEqual(["", "spikes", "adt"]);
    expect(init.matrix.get("").column(0).every(x => x >= 100)).toBe(true);
    init.matrix.free();

    thing.setOptions({ primaryAssay: { "": 1 } });
    init = await thing.load();
    expect(init.matrix.available()).toEqual([""]);
    expect(init.matrix.get("").column(0).every(x => x <= 0)).toBe(true);
    init.matrix.free();

    thing.setOptions({ primaryAssay: { "": "logged", "spikes": "stuff", "adt": 0 } });
    init = await thing.load();
    expect(init.matrix.available()).toEqual(["", "spikes", "adt"]);
    expect(init.matrix.get("").column(0).every(x => x <= 0)).toBe(true);
    init.matrix.free();

    thing.setOptions({ primaryAssay: "counts" });
    await expect(thing.load()).rejects.toThrow("assay 'counts' not found");
})

test("AbstractResult recognises the normalization options", async () => {
    const thing = new LocalResult(path.join(PATH, "AbstractResult-basic"));
    let init = await thing.load();
    expect(init.matrix.available()).toEqual(["", "spikes", "adt"]);
    expect(init.matrix.get("").column(0).every(x => x >= 100)).toBe(true)
    init.matrix.free();

    // Everyone now gets log-transformed.
    thing.setOptions({ isPrimaryNormalized: false });
    init = await thing.load();
    expect(init.matrix.get("").column(0).every(x => x < 100)).toBe(true)
    expect(init.matrix.get("spikes").column(0).every(x => x < 100)).toBe(true)
    init.matrix.free();

    // Only some people are log-transformed.
    thing.setOptions({ isPrimaryNormalized: { "": true, "spikes": false } });
    init = await thing.load();
    expect(init.matrix.get("").column(0).every(x => x >= 100)).toBe(true)
    expect(init.matrix.get("spikes").column(0).every(x => x < 100)).toBe(true)
    init.matrix.free();
})

test("AbstractResult recognises the size factor options", async () => {
    const thing = new LocalResult(path.join(PATH, "AbstractResult-sf"));
    thing.setOptions({ isPrimaryNormalized: false });

    let init = await thing.load();
    const vals = init.matrix.get("").column(0);
    expect(init.matrix.get("ercc").column(0)).not.toEqual(vals);
    expect(init.matrix.get("sirv").column(0)).toEqual(vals); // ignoring non-numeric size factors.
    expect(init.matrix.get("adt").column(0)).not.toEqual(vals);
    init.matrix.free();

    thing.setOptions({ sizeFactors: false }); // ignore size factors.
    init = await thing.load();
    expect(init.matrix.get("ercc").column(0)).toEqual(vals);
    expect(init.matrix.get("adt").column(0)).toEqual(vals);
    init.matrix.free();

    thing.setOptions({ sizeFactors: "size_factor" }); // specific name.
    init = await thing.load();
    expect(init.matrix.get("ercc").column(0)).toEqual(vals);
    expect(init.matrix.get("adt").column(0)).not.toEqual(vals);
    init.matrix.free();

    thing.setOptions({ sizeFactors: { ercc: "sizeFactors", adt: "size_factor" } });
    init = await thing.load();
    expect(init.matrix.get("ercc").column(0)).not.toEqual(vals);
    expect(init.matrix.get("adt").column(0)).not.toEqual(vals);
    init.matrix.free();
})
