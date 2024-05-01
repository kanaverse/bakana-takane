import * as sex from "../../src/readers/SummarizedExperiment.js";
import { localNavigator } from "../utils.js";
import * as path from "path";
import * as scran from "scran.js";

beforeAll(async () => { await scran.initialize({ localFile: true }) });
afterAll(async () => { await scran.terminate() });

const PATH = "objects";

test("naked SE loading works as expected", async () => {
    const se = await sex.readSummarizedExperiment(path.join(PATH, "SummarizedExperiment-naked"), localNavigator)
    expect(se.assay_names).toEqual(["counts"]);
    expect(se.row_data.columnNames()).toEqual([]);
    expect(se.row_data.numberOfRows()).toEqual(20);
    expect(se.column_data.columnNames()).toEqual([]);
    expect(se.column_data.numberOfRows()).toEqual(5);
    expect(se.metadata).toEqual({});
})

test("full SE loading works as expected", async () => {
    const se = await sex.readSummarizedExperiment(path.join(PATH, "SummarizedExperiment-full"), localNavigator)

    expect(se.assay_names).toEqual(["counts", "logged"]);

    expect(se.row_data.columnNames()).toEqual(["Symbol"]);
    expect(se.row_data.rowNames()[0]).toEqual("A");
    expect(se.row_data.column("Symbol")[19]).toEqual("t");

    expect(se.column_data.columnNames()).toEqual(["treatment"]);
    expect(se.column_data.rowNames()[0]).toEqual("SAMPLE1");
    expect(se.column_data.column("treatment")[4]).toEqual(true);

    expect(se.metadata).toEqual({ whee: [true], foobar: [false] });
})

test("partial SE loading works as expected", async () => {
    const se = await sex.readSummarizedExperiment(path.join(PATH, "SummarizedExperiment-full"), localNavigator, { includeColumnData: false, includeMetadata: false })
    expect("column_data" in se).toBe(false);
    expect("metadata" in se).toBe(false);
})
