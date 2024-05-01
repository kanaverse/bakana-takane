import { Navigator } from "./Navigator.js";
import { readReducedDimensions, readSingleCellExperiment } from "./readers/SingleCellExperiment.js";
import { readAssay } from "./readers/SummarizedExperiment.js";
import * as scran from "scran.js";
import * as bioc from "bioconductor";

/**
 * Pre-computed analysis results stored as a SummarizedExperiment object (or one of its subclasses) in the * [**takane** format](https://github.com/ArtifactDB/takane).
 * This is intended as a virtual base class; applications should define their own subclasses with appropriate getter and listing methods. 
 */
export class AbstractResult {
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
        this.#options = AbstractResult.defaults();
    }

    /**
     * @return {object} Default options, see {@linkcode AbstractResult#setOptions setOptions} for more details.
     */
    static defaults() {
        return { 
            primaryAssay: 0,
            isPrimaryNormalized: true,
            reducedDimensionNames: null
        };
    }

    /**
     * @return {object} Object containing all options used for loading.
     */
    options() {
        return { ...(this.#options) };
    }

    /**
     * @param {object} options - Optional parameters that affect {@linkcode AbstractResult#load load} (but not {@linkcode AbstractResult#summary summary}.
     * @param {object|string|number} [options.primaryAssay] - Assay containing the relevant data for each modality.
     *
     * - If a string, this is used as the name of the assay across all modalities.
     * - If a number, this is used as the index of the assay across all modalities.
     * - If any object, the key should be the name of a modality and the value may be either a string or number specifying the assay to use for that modality.
     *   Modalities absent from this object will not be loaded.
     * @param {object|boolean} [options.isPrimaryNormalized] - Whether or not the assay for a particular modality has already been normalized.
     *
     * - If a boolean, this is used to indicate normalization status of assays across all modalities.
     *   If `false`, that modality's assay is assumed to contain count data and is subjected to library size normalization. 
     * - If any object, the key should be the name of a modality and the value should be a boolean indicating whether that modality's assay has been normalized.
     *   Modalities absent from this object are assumed to have been normalized.
     * @param {?Array} [options.reducedDimensionNames] - Array of names of the reduced dimensions to load.
     * If `null`, all reduced dimensions found in the file are loaded.
     */
    setOptions(options) {
        // Cloning to avoid pass-by-reference links.
        for (const [k, v] of Object.entries(options)) {
            this.#options[k] = bioc.CLONE(v);
        }
    }

    /**
     * Destroy caches if present, releasing the associated memory.
     * This may be called at any time but only has an effect if `cache = true` in {@linkcode AbstractResult#load load} or {@linkcode AbstractResult#summary summary}.
     */
    clear() {
        this.#raw_components = null;
        this.#navigator.clear();
    }

    async #load_components() {
        if (this.#raw_components === null) {
            this.#raw_components = readSingleCellExperiment(this.#path, this.#navigator);
        }
        return this.#raw_components;
    }

    #get_main_name(comp) {
        if (!("main_experiment_name" in comp) || comp.main_experiment_name == null) {
            return "";
        } else {
            return comp.main_experiment_name;
        }
    }

    /**
     * @param {object} [options={}] - Optional parameters.
     * @param {boolean} [options.cache=false] - Whether to cache the results for re-use in subsequent calls to this method or {@linkcode AbstractResult#load load}.
     * If `true`, users should consider calling {@linkcode AbstractResult#clear clear} to release the memory once this dataset instance is no longer needed.
     * 
     * @return {object} Object containing the per-feature and per-cell annotations.
     * This has the following properties:
     *
     * - `modality_features`: an object where each key is a modality name and each value is a {@linkplain external:DataFrame DataFrame} of per-feature annotations for that modality.
     * - `cells`: a {@linkplain external:DataFrame DataFrame} of per-cell annotations.
     * - `modality_assay_names`: an object where each key is a modality name and each value is an Array containing the names of available assays for that modality.
     *    Unnamed assays are represented as `null` names.
     * - `reduced_dimension_names`: an Array of strings containing names of dimensionality reduction results.
     * - `other_metadata`: an object containing other metadata.
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

        let output = {
            modality_features: features,
            cells: comp.column_data,
            modality_assay_names: assays,
            reduced_dimension_names: comp.reduced_dimension_names,
            other_metadata: comp.metadata,
        };

        if (!cache) {
            this.clear();
        }
        return output;
    }

    /**
     * @param {object} [options={}] - Optional parameters.
     * @param {boolean} [options.cache=false] - Whether to cache the results for re-use in subsequent calls to this method or {@linkcode AbstractResult#summary summary}.
     * If `true`, users should consider calling {@linkcode AbstractResult#clear clear} to release the memory once this dataset instance is no longer needed.
     *
     * @return {object} Object containing the per-feature and per-cell annotations.
     * This has the following properties:
     *
     * - `features`: an object where each key is a modality name and each value is a {@linkplain external:DataFrame DataFrame} of per-feature annotations for that modality.
     * - `cells`: a {@linkplain external:DataFrame DataFrame} containing per-cell annotations.
     * - `matrix`: a {@linkplain external:MultiMatrix MultiMatrix} containing one {@linkplain external:ScranMatrix ScranMatrix} per modality.
     * - `reduced_dimensions`: an object containing the dimensionality reduction results.
     *   Each value is an array of arrays, where each inner array contains the coordinates for one dimension.
     * - `other_metadata`: an object containing other metadata.
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
            reduced_dimensions: {},
            other_metadata: comp.metadata,
        };

        if ("reduced_dimension_names" in comp) {
            let reddims = this.#options.reducedDimensionNames;
            if (reddims == null) {
                reddims = comp.reduced_dimension_names;
            }
            if (reddims.length > 0) {
                for (const k of reddims) {
                    output.reduced_dimensions[k] = (await readReducedDimensions(this.#path, k, this.#navigator)).values;
                }
            }
        }

        // Now fetching the assay matrix.
        {
            const my_assay = this.#options.primaryAssay;
            const my_normalized = this.#options.isPrimaryNormalized;
            const my_navigator = this.#navigator;

            async function add_experiment(name, info) {
                let curassay = my_assay;
                if (typeof curassay == "object") {
                    if (name in curassay) {
                        curassay = curassay[name];
                    } else {
                        return;
                    }
                }

                let curnormalized = my_normalized;
                if (typeof curnormalized == "object") {
                    if (name in curnormalized) {
                        curnormalized = curnormalized[name];
                    } else {
                        curnormalized = true;
                    }
                }

                let loaded = await readAssay(info["_path"], curassay, my_navigator);
                output.matrix.add(name, loaded);
                if (!curnormalized) {
                    let normed = scran.logNormCounts(loaded, { allowZeros: true });
                    output.matrix.add(name, normed);
                }

                output.features[name] = info.row_data;
            }

            try {
                await add_experiment(main_name, comp);
                if ("alternative_experiments" in comp) {
                    for (const { name, experiment } of comp.alternative_experiments) {
                        await add_experiment(name, experiment);
                    }
                }
            } catch (e) {
                scran.free(output.matrix);
                throw e;
            }
        }

        if (!cache) {
            this.clear();
        }
        return output;
    }
}

