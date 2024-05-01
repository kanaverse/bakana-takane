library(alabaster.base)
PATH <- "objects"
dir.create(PATH, showWarnings=FALSE)
library(SummarizedExperiment)

{
    naked <- SummarizedExperiment(list(counts=matrix(runif(100), 20, 5)))
    path <- file.path(PATH, "SummarizedExperiment-naked")
    unlink(path, recursive=TRUE)
    saveObject(naked, path)
}

{
    full <- SummarizedExperiment(list(counts=matrix(runif(100), 20, 5), logged=matrix(rnorm(100), 20, 5)))
    rownames(full) <- LETTERS[1:20]
    rowData(full)$Symbol <- letters[1:20]
    colnames(full) <- paste0("SAMPLE", 1:5)
    full$treatment <- rep(c(TRUE, FALSE), length.out=ncol(full))
    metadata(full) <- list(whee=TRUE, foobar=FALSE)
    path <- file.path(PATH, "SummarizedExperiment-full")
    unlink(path, recursive=TRUE)
    saveObject(full, path)
}
