import { Navigator } from "../src/Navigator.js";
import * as fs from "fs";
import * as path from "path";

export function getFile(path) {
    const contents = fs.readFileSync(path, null);
    return new Uint8Array(contents);
}

export function listFiles(path) {
    return fs.readdirSync(path);
}

export const localNavigator = new Navigator(getFile, listFiles);
