import { Navigator } from "../src/Navigator.js";
import * as fs from "fs";
import * as path from "path";

function get(path) {
    const contents = fs.readFileSync(path, null);
    return new Uint8Array(contents);
}

function list(path) {
    return fs.readdirSync(path);
}

export const localNavigator = new Navigator(get, list);
