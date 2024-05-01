import * as scran from "scran.js";
import * as se from "./SummarizedExperiment.js";
import * as arr from "./array.js";
import * as utils from "./utils.js";

function getMainExperimentName(obj_info) {
    const sce_meta = obj_info.single_cell_experiment;
    if ("main_experiment_name" in sce_meta) {
        return sce_meta.main_experiment_name;
    }
    return null;
}

async function readAlternativeExperiments(path, obj_info, listing, navigator) {
    if (listing.indexOf("alternative_experiments") == -1) {
        return [];
    }

    const altnames = await navigator.fetchJson(path + "/alternative_experiments/names.json");
    const tasks = [];
    for (const [i, alt] of altnames.entries()) {
        let alt_path = path + "/alternative_experiments/" + String(i);
        tasks.push(se.readSummarizedExperiment(alt_path, navigator, { includeColumnData: false, includeMetadata: false }));
    }

    const alternatives = [];
    const collected = await Promise.allSettled(tasks);
    for (const [i, res] of collected.entries()) {
        if (res.status == "fulfilled") {
            alternatives.push({ name: altnames[i], experiment: res.value });
        } else {
            console.warn("failed to extract features for alternative experiment " + String(i) + "; " + res.reason);
        }
    }

    return alternatives;
}

async function getReducedDimensionNames(path, obj_info, listing, navigator) {
    if (listing.indexOf("reduced_dimensions") == -1) {
        return [];
    }

    const all_rd_names = await navigator.fetchJson(path + "/reduced_dimensions/names.json");
    const tasks = []; 

    // Only supporting dense_arrays in the reduced dimensions for now.
    for (var i = 0; i < all_rd_names.length; i++) {
        const red_path = path + "/reduced_dimensions/" + String(i);
        tasks.push(navigator.fetchObjectMetadata(red_path));
    }

    const output = [];
    const resolved = await Promise.all(tasks);
    for (const [i, meta] of resolved.entries()) {
        if (meta.type == "dense_array") { 
            output.push(all_rd_names[i]);
        }
    }

    return output;
}

export async function readSingleCellExperiment(path, navigator, { includeColumnData = true, includeMetadata = true, includeReducedDimensionNames = true } = {}) {
    const output = await se.readSummarizedExperiment(path, navigator, { includeColumnData, includeMetadata });

    const obj_info = await navigator.fetchObjectMetadata(path);
    if ("single_cell_experiment" in obj_info) {
        const listing = await navigator.listFiles(path);
        const tasks = [
            getMainExperimentName(obj_info),
            readAlternativeExperiments(path, obj_info, listing, navigator)
        ];
        if (includeReducedDimensionNames) {
            tasks.push(getReducedDimensionNames(path, obj_info, listing, navigator));
        }

        const resolved = await Promise.all(tasks);
        output.main_experiment_name = resolved[0];
        output.alternative_experiments = resolved[1];
        if (includeReducedDimensionNames) {
            output.reduced_dimension_names = resolved[2];
        }
    }

    return output;
}

export async function readReducedDimensions(path, navigator, { maxDimensions = 10 } = {}) {
    const red_meta = await navigator.fetchObjectMetadata(path);
    if (red_meta["type"] != "dense_array") {
        throw new Error("reduced dimensions of type '" + red_meta["type"] + "' are not yet supported");
    }
    return arr.readDenseMatrix(path, navigator, { maxColumns: maxDimensions });
}
