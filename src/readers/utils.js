export function isPlaceholder(x, placeholder) {
    if (Number.isNaN(placeholder)) {
        return Number.isNaN(x);
    } else {
        return x == placeholder;
    }
}

export function substitutePlaceholder(vec, placeholder) {
    let i = 0;
    let needs_modification = false;
    for (; i < vec.length; i++) {
        if (isPlaceholder(vec[i], placeholder)) {
            needs_modification = true;
            break;
        }
    }

    if (!needs_modification) {
        return vec;
    }

    const output = Array.from(vec);
    for (; i < vec.length; i++) {
        if (isPlaceholder(vec[i], placeholder)) {
            output[i] = null;
        }
    }

    return output;
}
