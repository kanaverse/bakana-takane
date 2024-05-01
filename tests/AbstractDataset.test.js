import { AbstractDataset } from "../src/AbstractDataset.js";
import * as utils from "./utils.js";
import * as path from "path";
import * as scran from "scran.js";
import * as bakana from "bakana";

beforeAll(async () => await bakana.initialize({ localFile: true }));
afterAll(async () => await bakana.terminate());

class LocalDataset extends AbstractDataset {
    constructor(path) {
        super(path, utils.getFile, utils.listFiles);
    }

    static format() {
        return "WHEE";
    }

    abbreviate() {
        return { "path": path };
    }
};

const PATH = "objects";

test("AbstractDataset summary works as expected", async () => {
    const thing = new LocalDataset(path.join(PATH, "AbstractDataset-first"));

    const summ = await thing.summary();
    expect(summ.modality_assay_names[""]).toEqual([ "counts", "logged" ]);
    expect(summ.modality_assay_names["spikes"]).toEqual([ "stuff" ]);
    expect(summ.modality_assay_names["adt"]).toEqual([ "foobar" ]);

    expect(summ.modality_features[""].numberOfRows()).toEqual(20);
    expect(summ.modality_features["spikes"].numberOfRows()).toEqual(8);
    expect(summ.modality_features["adt"].numberOfRows()).toEqual(4);

    expect(summ.cells.numberOfRows()).toEqual(5);
})

test("AbstractDataset primary ID preview works as expected", async () => {
    const thing = new LocalDataset(path.join(PATH, "AbstractDataset-first"));

    let prev = await thing.previewPrimaryIds();
    expect(Object.keys(prev)).toEqual(["RNA"]);
    expect(prev["RNA"].length).toEqual(20);
    expect(prev["RNA"][0]).toEqual("A");

    thing.setOptions({ adtExperiment: "adt", crisprExperiment: "spikes" });
    prev = await thing.previewPrimaryIds();
    expect(Object.keys(prev)).toEqual(["RNA", "ADT", "CRISPR"]);
    expect(prev["RNA"].length).toEqual(20);
    expect(prev["RNA"][0]).toEqual("A");
    expect(prev["ADT"].length).toEqual(4);
    expect(prev["ADT"][0]).toEqual("ADT1");
    expect(prev["CRISPR"].length).toEqual(8);
    expect(prev["CRISPR"][0]).toEqual("SPIKE1");

    thing.setOptions({ primaryRnaFeatureIdColumn: "Symbol" });
    prev = await thing.previewPrimaryIds();
    expect(prev["RNA"].length).toEqual(20);
    expect(prev["RNA"][0]).toEqual("a");

    thing.setOptions({ primaryRnaFeatureIdColumn: 0 });
    prev = await thing.previewPrimaryIds();
    expect(prev["RNA"].length).toEqual(20);
    expect(prev["RNA"][0]).toEqual("a");

    thing.setOptions({ primaryRnaFeatureIdColumn: 1 }); // out of range, back to row names.
    prev = await thing.previewPrimaryIds();
    expect(prev["RNA"].length).toEqual(20);
    expect(prev["RNA"][0]).toEqual("A");
})

test("AbstractDataset loading works as expected", async () => {
    const thing = new LocalDataset(path.join(PATH, "AbstractDataset-first"));
    {
        let init = await thing.load();
        expect(init.matrix.numberOfColumns()).toBe(5);
        expect(init.matrix.available()).toEqual([ "RNA" ]);
        expect(init.matrix.get("RNA").numberOfRows()).toBe(20);

        expect(init.cells.numberOfRows()).toBe(5);
        expect(init.cells.column("treatment").length).toBe(5);

        expect(init.features["RNA"].numberOfRows()).toBe(20);
        expect(init.primary_ids["RNA"].length).toBe(20);
        expect(init.primary_ids["RNA"][0]).toBe("A");

        init.matrix.free();
    }

    thing.setOptions({ adtExperiment: "adt", crisprExperiment: "spikes", primaryRnaFeatureIdColumn: "Symbol" });
    {
        let init = await thing.load();
        expect(init.matrix.numberOfColumns()).toBe(5);
        expect(init.matrix.available()).toEqual([ "RNA", "ADT", "CRISPR" ]);
        expect(init.matrix.get("RNA").numberOfRows()).toBe(20);
        expect(init.matrix.get("CRISPR").numberOfRows()).toBe(8);
        expect(init.matrix.get("ADT").numberOfRows()).toBe(4);

        expect(init.features["RNA"].numberOfRows()).toBe(20);
        expect(init.features["CRISPR"].numberOfRows()).toBe(8);
        expect(init.features["ADT"].numberOfRows()).toBe(4);

        expect(init.primary_ids["RNA"].length).toBe(20);
        expect(init.primary_ids["RNA"][0]).toBe("a");
        expect(init.primary_ids["ADT"].length).toBe(4);
        expect(init.primary_ids["ADT"][0]).toBe("ADT1");
        expect(init.primary_ids["CRISPR"].length).toBe(8);
        expect(init.primary_ids["CRISPR"][0]).toBe("SPIKE1");

        init.matrix.free();
    }

    // Works with integer arguments.
    thing.setOptions({ adtExperiment: 0, crisprExperiment: -1, rnaExperiment: 1 });
    {
        let init = await thing.load();
        expect(init.matrix.numberOfColumns()).toBe(5);
        expect(init.matrix.available()).toEqual([ "RNA", "ADT", "CRISPR" ]);
        expect(init.matrix.get("RNA").numberOfRows()).toBe(4);
        expect(init.matrix.get("CRISPR").numberOfRows()).toBe(20);
        expect(init.matrix.get("ADT").numberOfRows()).toBe(8);
        init.matrix.free();
    }
})

test("AbstractDataset works with a different main name", async () => {
    const thing = new LocalDataset(path.join(PATH, "AbstractDataset-named"));

    const summ = await thing.summary();
    expect(summ.modality_assay_names["gene"]).toEqual([ "counts", "logged" ]);
    expect(summ.modality_assay_names["spikes"]).toEqual([ "stuff" ]);
    expect(summ.modality_assay_names["adt"]).toEqual([ "foobar" ]);

    thing.setOptions({ rnaExperiment: "gene" });
    const init = await thing.load();
    expect(init.matrix.available()).toEqual([ "RNA" ]);
    expect(init.matrix.get("RNA").numberOfRows()).toBe(20);
    init.matrix.free();
})

test("AbstractDataset works with a pure SE", async () => {
    const thing = new LocalDataset(path.join(PATH, "AbstractDataset-second"));

    const summ = await thing.summary();
    expect(summ.modality_assay_names[""]).toEqual([ "counts" ]);
    expect(summ.modality_features[""].rowNames()[0]).toEqual("G");

    const init = await thing.load();
    expect(init.matrix.available()).toEqual([ "RNA" ]);
    expect(init.matrix.get("RNA").numberOfRows()).toBe(20);
    init.matrix.free();
})

test("AbstractDataset works in a bigger analysis", async () => {
    const thing = new LocalDataset(path.join(PATH, "AbstractDataset-first"));
    let state = await bakana.createAnalysis();
    let params = bakana.analysisDefaults();

    await state.inputs.compute({ default: thing }, params.inputs);
    expect(state.inputs.fetchCountMatrix().available()).toEqual([ "RNA" ]);
    expect(state.inputs.fetchCountMatrix().numberOfColumns()).toBe(5);
    expect(state.inputs.fetchFeatureAnnotations()["RNA"].numberOfRows()).toBe(20);
    expect(state.inputs.fetchCellAnnotations().numberOfRows()).toBe(5);
})
