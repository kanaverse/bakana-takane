import * as bioc from "bioconductor.js";
import * as df from "./DataFrame.js";
import * as arr from "./array.js";
import * as sl from "./list.js";

async function readRowData(path, obj_info, listing, navigator) {
    if (!("summarized_experiment" in obj_info)) {
        throw new Error("expected a 'summarized_experiment' object");
    }

    if (listing.indexOf("row_data") != -1) {
        return df.readDataFrame(path + "/row_data", navigator);
    } else {
        const nrows = obj_info.summarized_experiment.dimensions[0];
        return new bioc.DataFrame({}, { numberOfRows: nrows });
    }
}

async function readColumnData(path, obj_info, listing, navigator) {
    if (!("summarized_experiment" in obj_info)) {
        throw new Error("expected a 'summarized_experiment' object");
    }

    if (listing.indexOf("column_data") != -1) {
        return df.readDataFrame(path + "/column_data", navigator);
    } else {
        const ncols = obj_info.summarized_experiment.dimensions[1];
        return new bioc.DataFrame({}, { numberOfRows: ncols });
    }
}

async function readMetadata(path, listing, navigator) {
    if (listing.indexOf("other_data") != -1) {
        let other_path = path + "/other_data";
        return sl.readSimpleList(other_path, navigator);
    } else {
        return {};
    }
}

async function getAssayNames(path, listing, navigator) { 
    if (listing.indexOf("assays") == -1) {
        return [];
    }

    // Only reporting the names of assays with supported types.
    const assnames = await navigator.fetchJson(path + "/assays/names.json");
    const collected = [];
    for (const [i, a] of assnames) {
        const assmeta = await navigator.fetchObjectMetadata(path + "/assays/" + String(i));
        if (arr.isArraySupportedAsScranMatrix(assmeta.type);
            collected.push(a);
        }
    }

    return collected;
}

export async function readAssay(path, assay, navigator) {
    const assnames = await navigator.fetchJson(path + "/assays/names.json");

    if (typeof assay == "string") {
        const counter = assnames.indexOf(assay);
        if (counter == -1) {
            throw new Error("assay '" + assay + "' not found");
        }
        assay = counter;
    } else {
        if (assay >= assnames.length) {
            throw new Error("assay " + String(assay) + " out of range");
        }
    }

    return arr.readSparseMatrix(path + "/assays/" + String(assay), navigator, forceInteger);
}

export async function readSummarizedExperiment(path, navigator, { includeColumnData = true, includeMetadata = true } = {}) {
    const obj_info = await navigator.fetchObjectMetadata(path);
    const listing = await navigator.listFiles(path);
    const tasks = [
        readRowData(path, obj_info, listing, navigator),
        getAssayNames(path, listing, path)
    ];

    if (includeColumnData) {
        tasks.push(readColumnData(path, obj_info, listing, navigator));
    } else {
        tasks.push(null);
    }

    if (includeMetadata) {
        tasks.push(readMetadata(path, listing, navigator));
    } else {
        tasks.push(null);
    }

    // Hoping for some concurrency here with the various navigator-related awaits.
    const all_components = await Promise.all(tasks);

    const output = {
        "_path": path, // For easier retrieval of assays later.
        "row_data": all_components[0],
        "assay_names": all_components[1],
    };
    if (includeColumnData) {
        output.column_data = all_components[2];
    }
    if (includeMetadata) {
        output.metadata = all_components[3];
    }

    return output;
}
