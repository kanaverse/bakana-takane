library(alabaster.base)
PATH <- "objects"
dir.create(PATH, showWarnings=FALSE)
library(SingleCellExperiment)

{
    naked <- SingleCellExperiment(list(counts=matrix(runif(100), 20, 5)))
    path <- file.path(PATH, "SingleCellExperiment-naked")
    unlink(path, recursive=TRUE)
    saveObject(naked, path)
}

{
    full <- SingleCellExperiment(list(counts=matrix(runif(100), 20, 5), logged=matrix(rnorm(100), 20, 5)))
    mainExpName(full) <- "gene"

    rownames(full) <- LETTERS[1:20]
    rowData(full)$Symbol <- letters[1:20]
    colnames(full) <- paste0("SAMPLE", 1:5)
    full$treatment <- rep(c(TRUE, FALSE), length.out=ncol(full))
    metadata(full) <- list(whee=TRUE, foobar=FALSE)

    reducedDim(full, "pca") <- matrix(rnorm(30), nrow=ncol(full))
    reducedDim(full, "tsne") <- matrix(rnorm(20), nrow=ncol(full))

    ercc <- SummarizedExperiment(list(stuff=matrix(rpois(40, lambda=1), ncol=ncol(full))))
    ercc$foo <- "bar"
    rownames(ercc) <- head(letters, nrow(ercc))
    altExp(full, "ERCC", withDimnames=FALSE) <- ercc

    sirv <- SummarizedExperiment(list(stuff=matrix(rpois(20, lambda=1), ncol=ncol(full))))
    metadata(sirv)$whee <- "blah"
    rownames(sirv) <- paste0("SIRV", seq_len(nrow(sirv)))
    altExp(full, "SIRV", withDimnames=FALSE) <- sirv 

    path <- file.path(PATH, "SingleCellExperiment-full")
    unlink(path, recursive=TRUE)
    saveObject(full, path)
}
