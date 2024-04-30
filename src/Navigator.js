export class Navigator {
    #content;
    #listing;
    #getter;
    #lister;

    constructor(getter, lister) {
        this.clear();
        this.#getter = getter;
        this.#lister = lister;
    }

    async fetchJson(path) {
        if (this.#content.has(path)) {
            return this.#content.get(path);
        } else {
            const contents = await this.#getter(path);
            const dec = new TextDecoder;
            const payload = dec.decode(contents);
            const output = JSON.parse(payload);
            this.#content.set(path, output);
            return output;
        }
    }

    async fetchObjectMetadata(path) {
        return await this.fetchJson(path + "/OBJECT");
    }

    async listFiles(path) {
        if (this.#listing.has(path)) {
            return this.#listing.get(path);
        } else {
            const listed = await this.#lister(path);
            this.#listing.set(path, listed);
            return listed;
        }
    }

    get(path) {
        return this.#getter(path);
    }

    list(path) {
        return this.#lister(path);
    }

    clear() {
        this.#content = new Map;
        this.#listing = new Map;
    }
};

