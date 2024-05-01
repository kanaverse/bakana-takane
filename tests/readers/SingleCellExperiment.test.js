import * as scex from "../../src/readers/SingleCellExperiment.js";
import { localNavigator } from "../utils.js";
import * as path from "path";
import * as scran from "scran.js";

beforeAll(async () => { await scran.initialize({ localFile: true }) });
afterAll(async () => { await scran.terminate() });

const PATH = "objects";

test("naked SCE loading works as expected", async () => {
    const sce = await scex.readSingleCellExperiment(path.join(PATH, "SingleCellExperiment-naked"), localNavigator)

    expect(sce.assay_names).toEqual(["counts"]);
    expect(sce.alternative_experiments).toEqual([]);
    expect(sce.reduced_dimension_names).toEqual([]);
    expect(sce.main_experiment_name).toBeNull();
})

test("SCE loading works with base SEs", async () => {
    const sce = await scex.readSingleCellExperiment(path.join(PATH, "SummarizedExperiment-naked"), localNavigator)
    expect(sce.assay_names).toEqual(["counts"]);
    expect("alternative_experiments" in sce).toBe(false);
    expect("reduced_dimension_names" in sce).toBe(false);
})

test("full SCE loading works as expected", async () => {
    const sce = await scex.readSingleCellExperiment(path.join(PATH, "SingleCellExperiment-full"), localNavigator)

    expect(sce.assay_names).toEqual(["counts", "logged"]);
    expect(sce.reduced_dimension_names).toEqual(["pca", "tsne"]);
    expect(sce.main_experiment_name).toEqual("gene");

    expect(sce.alternative_experiments[0].name).toEqual("ERCC");
    expect(sce.alternative_experiments[0].experiment.assay_names).toEqual(["stuff"]);
    expect(sce.alternative_experiments[0].experiment.row_data.numberOfRows()).toEqual(8);
    expect(sce.alternative_experiments[0].experiment.row_data.rowNames()[0]).toEqual("a");

    expect(sce.alternative_experiments[1].name).toEqual("SIRV");
    expect(sce.alternative_experiments[1].experiment.assay_names).toEqual(["stuff"]);
    expect(sce.alternative_experiments[1].experiment.row_data.numberOfRows()).toEqual(4);
    expect(sce.alternative_experiments[1].experiment.row_data.rowNames()[0]).toEqual("SIRV1");
})

test("partial SCE loading works as expected", async () => {
    const sce = await scex.readSingleCellExperiment(path.join(PATH, "SingleCellExperiment-full"), localNavigator, { includeReducedDimensionNames: false, includeColumnData: false, includeMetadata: false })
    expect("reduced_dimension_names" in sce).toBe(false);
    expect("column_data" in sce).toBe(false);
    expect("metadata" in sce).toBe(false);
    expect(sce.assay_names).toEqual(["counts", "logged"]);
})

test("reduced dimension loading works as expected", async () => {
    const red = await scex.readReducedDimensions(path.join(PATH, "SingleCellExperiment-full"), "pca", localNavigator)
    expect(red.rows).toEqual(5);
    expect(red.columns).toEqual(6);
    expect(red.values.length).toEqual(red.columns);
    expect(red.values[0].length).toEqual(red.rows);
    expect(red.values[0] instanceof Float64Array).toBe(true);
    expect(red.values[0]).not.toEqual(red.values[1]);

    const red2 = await scex.readReducedDimensions(path.join(PATH, "SingleCellExperiment-full"), "tsne", localNavigator, { maxDimensions: 2 })
    expect(red2.rows).toEqual(5);
    expect(red2.columns).toEqual(2);
    expect(red2.values.length).toEqual(2);
})
