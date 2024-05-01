import { Navigator } from "./Navigator.js";
import { readSingleCellExperiment } from "./readers/SingleCellExperiment.js";
import { readAssay } from "./readers/SummarizedExperiment.js";
import * as scran from "scran.js";

function extractPrimaryIdColumn(modality, modality_features, primary) {
    if (!(modality in primary)) {
        throw new Error("modality '" + modality + "' has no primary key identifier");  
    }

    const id = primary[modality];
    if ((typeof id == "string" && modality_features.hasColumn(id)) || (typeof id == "number" && id < modality_features.numberOfColumns())) {
        return modality_features.column(id);
    } 

    return modality_features.rowNames();
}

/**
 * Dataset stored as a SummarizedExperiment (or one of its subclasses) in the [**takane** format](https://github.com/ArtifactDB/takane).
 * This is intended as a virtual base class so that applications can define their own subclasses with the appropriate getter and listing methods. 
 * Subclasses should define `abbreviate()` and `serialize()` methods, as well as the static `format()` and `unserialize()` methods - 
 * see the [Dataset contract](https://github.com/kanaverse/bakana/blob/master/docs/related/custom_datasets.md) for more details.
 */
export class AbstractDataset {
    #path;
    #navigator;
    #raw_components;
    #options;

    /**
     * @param {string} path - Some kind of the path to the SummarizedExperiment.
     * The exact interpretation of this argument is left to subclasses.
     * @param {function} getter - A (possibly `async`) function that accepts a string containing the relative path to the file of interest, and returns a Uint8Array of that file's contents.
     * Each path is created by adding unix-style file separators to `path`.
     * @param {function} lister - A (possibly `async`) function that accepts a string containing the relative path to the directory of interest, and returns an array of the contents of that directory (non-recursive).
     * Each path is created by adding unix-style file separators to `path`.
     */
    constructor(path, getter, lister) {
        this.#path = path;
        this.#navigator = new Navigator(getter, lister);
        this.#raw_components = null;
        this.#options = AbstractDataset.defaults();
        return;
    }

    /**
     * @return {object} Default options, see {@linkcode AbstractDataset#setOptions setOptions} for more details.
     */
    static defaults() {
        return {
            rnaCountAssay: 0, 
            adtCountAssay: 0, 
            crisprCountAssay: 0,
            rnaExperiment: -1, 
            adtExperiment: "Antibody Capture", 
            crisprExperiment: "CRISPR Guide Capture",
            primaryRnaFeatureIdColumn: null, 
            primaryAdtFeatureIdColumn: null,
            primaryCrisprFeatureIdColumn: null 
        };
    }

    /**
     * @return {object} Object containing all options used for loading.
     */
    options() {
        return { ...(this.#options) };
    }

    /**
     * @param {object} options - Optional parameters that affect {@linkcode AbstractDataset#load load} (but not {@linkcode AbstractDataset#summary summary}).
     * @param {string|number} [options.rnaCountAssay] - Name or index of the assay containing the RNA count matrix.
     * @param {string|number} [options.adtCountAssay] - Name or index of the assay containing the ADT count matrix.
     * @param {string|number} [options.crisprCountAssay] - Name or index of the assay containing the CRISPR count matrix.
     * @param {?(string|number)} [options.rnaExperiment] - Name or index of the alternative experiment containing gene expression data.
     * If `i` is a negative integer, the main experiment is assumed to contain the gene expression data.
     * Otherwise, if `i` is `null` or invalid (e.g., out of range index, unavailable name), it is ignored and no RNA data is assumed to be present.
     * @param {?(string|number)} [options.adtExperiment] - Name or index of the alternative experiment containing ADT data.
     * If `i` is a negative integer, the main experiment is assumed to contain the ADT data.
     * Otherwise, if `i` is `null` or invalid (e.g., out of range index, unavailable name), it is ignored and no ADTs are assumed to be present.
     * @param {?(string|number)} [options.crisprExperiment] - Name or index of the alternative experiment containing CRISPR guide data.
     * If `i` is a negative integer, the main experiment is assumed to contain the guide data.
     * Otherwise, if `i` is `null` or invalid (e.g., out of range index, unavailable name), it is ignored and no CRISPR guides are assumed to be present.
     * @param {?(string|number)} [options.primaryRnaFeatureIdColumn] - Name or index of the column of the `features` {@linkplain external:DataFrame DataFrame} that contains the primary feature identifier for gene expression.
     * If `i` is `null` or invalid (e.g., out of range index, unavailable name), it is ignored and the primary identifier is defined as the existing row names.
     * However, if no row names are present in the SummarizedExperiment, no primary identifier is defined.
     * @param {?(string|number)} [options.primaryAdtFeatureIdColumn] - Name or index of the column of the `features` {@linkplain external:DataFrame DataFrame} that contains the primary feature identifier for the ADTs.
     * If `i` is `null` or invalid (e.g., out of range index, unavailable name), it is ignored and the primary identifier is defined as the existing row names.
     * However, if no row names are present in the SummarizedExperiment, no primary identifier is defined.
     * @param {?(string|number)} [options.primaryCrisprFeatureIdColumn] - Name or index of the column of the `features` {@linkplain external:DataFrame DataFrame} that contains the primary feature identifier for the CRISPR guides.
     * If `i` is `null` or invalid (e.g., out of range index, unavailable name), it is ignored and the existing row names (if they exist) are used as the primary identifier.
     * However, if no row names are present in the SummarizedExperiment, no primary identifier is defined.
     */
    setOptions(options) {
        for (const [k, v] of Object.entries(options)) {
            this.#options[k] = v;
        }
    }

    /**
     * Destroy caches if present, releasing the associated memory.
     * This may be called at any time but only has an effect if `cache = true` in {@linkcode AbstractDataset#load load} or {@linkcode AbstractDataset#summary summary}.
     */
    clear() {
        this.#navigator.clear();
        this.#raw_components = null;
    }

    async #load_components() {
        if (this.#raw_components == null) {
            this.#raw_components = await readSingleCellExperiment(this.#path, this.#navigator, { includeMetadata: false, includeReducedDimensionNames: false });
        }
        return this.#raw_components;
    }

    /**
     * @param {object} [options={}] - Optional parameters.
     * @param {boolean} [options.cache=false] - Whether to cache the intermediate results for re-use in subsequent calls to any methods with a `cache` option.
     * If `true`, users should consider calling {@linkcode AbstractDataset#clear clear} to release the memory once this dataset instance is no longer needed.
     * 
     * @return {object} Object containing the per-feature and per-cell annotations.
     * This has the following properties:
     *
     * - `modality_features`: an object where each key is a modality name and each value is a {@linkplain external:DataFrame DataFrame} of per-feature annotations for that modality.
     * - `cells`: a {@linkplain external:DataFrame DataFrame} of per-cell annotations.
     * - `modality_assay_names`: an object where each key is a modality name and each value is an Array containing the names of available assays for that modality.
     *    Unnamed assays are represented as `null` names.
     *
     * @async
     */
    async summary({ cache = false } = {}) {
        const comp = await this.#load_components();
        const main_name = this.#get_main_name(comp);

        const features = {};
        features[main_name] = comp.row_data;
        const assays = {};
        assays[main_name] = comp.assay_names;

        if ("alternative_experiments" in comp) {
            for (const { name, experiment } of comp.alternative_experiments) {
                features[name] = experiment.row_data;
                assays[name] = experiment.assay_names;
            }
        }

        const output = {
            modality_features: features,
            cells: comp.column_data,
            modality_assay_names: assays,
        };

        if (!cache) {
            this.clear();
        }
        return output;
    }

    #get_main_name(comp) {
        if (!("main_experiment_name" in comp) || comp.main_experiment_name == null) {
            return "";
        } else {
            return comp.main_experiment_name;
        }
    }

    #get_primary_mapping() {
        return {
            RNA: this.#options.primaryRnaFeatureIdColumn, 
            ADT: this.#options.primaryAdtFeatureIdColumn,
            CRISPR: this.#options.primaryCrisprFeatureIdColumn
        };
    }

    /**
     * @param {object} [options={}] - Optional parameters.
     * @param {boolean} [options.cache=false] - Whether to cache the intermediate results for re-use in subsequent calls to any methods with a `cache` option.
     * If `true`, users should consider calling {@linkcode AbstractDataset#clear clear} to release the memory once this dataset instance is no longer needed.
     *
     * @return {object} An object where each key is a modality name and each value is an array (usually of strings) containing the primary feature identifiers for each row in that modality.
     * The contents are the same as the `primary_ids` returned by {@linkcode AbstractDataset#load load} but the order of values may be different.
     *
     * @async
     */
    async previewPrimaryIds({ cache = false } = {}) {
        const comp = await this.#load_components();
        const main_name = this.#get_main_name(comp);

        const features = {};
        features[main_name] = comp.row_data;
        if ("alternative_experiments" in comp) {
            for (const { name, experiment } of comp.alternative_experiments) {
                features[name] = experiment.row_data;
            }
        }

        const fmapping = {
            RNA: this.#options.rnaExperiment, 
            ADT: this.#options.adtExperiment, 
            CRISPR: this.#options.crisprExperiment 
        };
        const primary_mapping = this.#get_primary_mapping();

        const preview = {};
        for (let [f, m] of Object.entries(fmapping)) {
            if (m === null) {
                continue;
            }
            if (m < 0) {
                m = main_name;
            }
            if (m in features) {
                preview[f] = extractPrimaryIdColumn(f, features[m], primary_mapping);
            }
        }

        if (!cache) {
            this.clear();
        }
        return preview;
    }

    /**
     * @param {object} [options={}] - Optional parameters.
     * @param {boolean} [options.cache=false] - Whether to cache the intermediate results for re-use in subsequent calls to any methods with a `cache` option.
     * If `true`, users should consider calling {@linkcode AbstractDataset#clear clear} to release the memory once this dataset instance is no longer needed.
     *
     * @return {object} Object containing the per-feature and per-cell annotations.
     * This has the following properties:
     *
     * - `features`: an object where each key is a modality name and each value is a {@linkplain external:DataFrame DataFrame} of per-feature annotations for that modality.
     * - `cells`: a {@linkplain external:DataFrame DataFrame} containing per-cell annotations.
     * - `matrix`: a {@linkplain external:MultiMatrix MultiMatrix} containing one {@linkplain external:ScranMatrix ScranMatrix} per modality.
     * - `primary_ids`: an object where each key is a modality name and each value is an array (usually of strings) containing the primary feature identifiers for each row in that modality.
     *
     * Modality names are guaranteed to be one of `"RNA"`, `"ADT"` or `"CRISPR"`.
     * We assume that the instance already contains an appropriate mapping from the observed feature types to each expected modality,
     * either from the {@linkcode AbstractDataset#defaults defaults} or with {@linkcode AbstractDataset#setOptions setOptions}.
     *
     * @async
     */
    async load({ cache = false } = {}) {
        const comp = await this.#load_components();
        const main_name = this.#get_main_name(comp);

        let output = { 
            matrix: new scran.MultiMatrix,
            features: {},
            cells: comp.column_data,
            primary_ids: {},
        };

        const exp_mapping = { 
            RNA: { exp: this.#options.rnaExperiment, assay: this.#options.rnaCountAssay },
            ADT: { exp: this.#options.adtExperiment, assay: this.#options.adtCountAssay },
            CRISPR: { exp: this.#options.crisprExperiment, assay: this.#options.crisprCountAssay }
        };
        const primary_mapping = this.#get_primary_mapping();

        const altmap = {};
        if ("alternative_experiments" in comp) {
            for (const { name, experiment } of comp.alternative_experiments) {
                altmap[name] = experiment;
            }
        }

        try {
            for (const [k, v] of Object.entries(exp_mapping)) {
                if (v.exp === null) {
                    continue;
                }

                let info;
                if (typeof v.exp == "string") {
                    if (v.exp === main_name) {
                        info = comp;
                    } else if (v.exp in altmap) {
                        info = altmap[v.exp];
                    } else {
                        continue;
                    }
                } else {
                    if (v.exp < 0) {
                        info = comp;
                    } else if ("alternative_experiments" in comp && v.exp < comp.alternative_experiments.length) {
                        info = comp.alternative_experiments[v.exp].experiment;
                    } else {
                        continue;
                    }
                }

                let loaded = await readAssay(info["_path"], v.assay, this.#navigator);
                output.matrix.add(k, loaded);
                output.features[k] = info.row_data;
                output.primary_ids[k] = extractPrimaryIdColumn(k, info.row_data, primary_mapping);
            }

        } catch (e) {
            scran.free(output.matrix);
            throw e;
        }

        if (!cache) {
            this.clear();
        }
        return output;
    }
}
