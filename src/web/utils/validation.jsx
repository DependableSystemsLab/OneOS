export const validateFilePath = (path) => {
    return /^\/([A-z0-9-_+]+\/)*([A-z0-9]+\.(py|js))$/.test(path);
}